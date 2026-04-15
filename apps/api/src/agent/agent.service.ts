import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LedgerEntryType,
  Prisma,
  UserRole,
  WalletRequestStatus,
  WalletRequestType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { UpdateRollingDto } from './dto/update-rolling.dto';
import { RateRevisionService } from '../rate-revision/rate-revision.service';

function dec(v: Prisma.Decimal | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function sumDec(v: Prisma.Decimal | null | undefined): string {
  return (v != null ? Number(v) : 0).toFixed(2);
}

/** 플랫폼 도메인 호스트 → 브라우저에서 열 수 있는 절대 URL */
function publicSiteUrlFromHost(host: string): string {
  const h = host.trim();
  if (!h) return '';
  if (/^https?:\/\//i.test(h)) return h;
  const lower = h.toLowerCase();
  if (
    lower.startsWith('localhost') ||
    lower.startsWith('127.') ||
    lower.startsWith('0.0.0.0')
  ) {
    return `http://${h}`;
  }
  return `https://${h}`;
}

type GameAgg = { betSum: number; betStakeAbs: number; winSum: number };

function emptyAgg(): GameAgg {
  return { betSum: 0, betStakeAbs: 0, winSum: 0 };
}

function fmtAgg(a: GameAgg): {
  betSum: string;
  betStakeAbs: string;
  winSum: string;
} {
  return {
    betSum: a.betSum.toFixed(2),
    betStakeAbs: a.betStakeAbs.toFixed(2),
    winSum: a.winSum.toFixed(2),
  };
}

type SqlGameRow = {
  vertical: string;
  sub_vertical: string;
  bet_sum: Prisma.Decimal;
  bet_stake_abs: Prisma.Decimal;
  win_sum: Prisma.Decimal;
};

type SqlMemberLedgerRow = {
  userId: string;
  bet_sum: Prisma.Decimal;
  bet_stake_abs: Prisma.Decimal;
  win_sum: Prisma.Decimal;
};

const KNOWN_VERTICALS = [
  'LIVE_CASINO',
  'SPORTS',
  'MINIGAME',
  'SLOT',
  'UNKNOWN',
] as const;

function buildGameSalesFromRows(rows: SqlGameRow[]): {
  LIVE_CASINO: {
    betSum: string;
    betStakeAbs: string;
    winSum: string;
    byKind: Record<string, { betSum: string; betStakeAbs: string; winSum: string }>;
  };
  SPORTS: { betSum: string; betStakeAbs: string; winSum: string };
  MINIGAME: { betSum: string; betStakeAbs: string; winSum: string };
  SLOT: { betSum: string; betStakeAbs: string; winSum: string };
  UNKNOWN: { betSum: string; betStakeAbs: string; winSum: string };
} {
  const nested = new Map<string, Map<string, GameAgg>>();
  for (const v of KNOWN_VERTICALS) {
    nested.set(v, new Map());
  }
  for (const r of rows) {
    const vRaw = (r.vertical || 'UNKNOWN').toUpperCase().trim();
    const v = KNOWN_VERTICALS.includes(vRaw as (typeof KNOWN_VERTICALS)[number])
      ? vRaw
      : 'UNKNOWN';
    const sub = (r.sub_vertical || '').toUpperCase().trim();
    const inner = nested.get(v)!;
    if (!inner.has(sub)) inner.set(sub, emptyAgg());
    const a = inner.get(sub)!;
    a.betSum += Number(r.bet_sum);
    a.betStakeAbs += Number(r.bet_stake_abs);
    a.winSum += Number(r.win_sum);
  }
  const roll = (v: string) => {
    const inner = nested.get(v)!;
    const total = emptyAgg();
    const byKind: Record<
      string,
      { betSum: string; betStakeAbs: string; winSum: string }
    > = {};
    for (const [sub, agg] of inner) {
      total.betSum += agg.betSum;
      total.betStakeAbs += agg.betStakeAbs;
      total.winSum += agg.winSum;
      if (sub !== '') {
        byKind[sub] = fmtAgg(agg);
      }
    }
    return { total, byKind };
  };
  const live = roll('LIVE_CASINO');
  const sports = roll('SPORTS');
  const mini = roll('MINIGAME');
  const slot = roll('SLOT');
  const unk = roll('UNKNOWN');
  return {
    LIVE_CASINO: {
      ...fmtAgg(live.total),
      byKind: live.byKind,
    },
    SPORTS: fmtAgg(sports.total),
    MINIGAME: fmtAgg(mini.total),
    SLOT: fmtAgg(slot.total),
    UNKNOWN: fmtAgg(unk.total),
  };
}

function emptyGameSales() {
  const z = { betSum: '0.00', betStakeAbs: '0.00', winSum: '0.00' };
  return {
    LIVE_CASINO: { ...z, byKind: {} as Record<string, typeof z> },
    SPORTS: { ...z },
    MINIGAME: { ...z },
    SLOT: { ...z },
    UNKNOWN: { ...z },
  };
}

@Injectable()
export class AgentService {
  constructor(
    private prisma: PrismaService,
    private rateRevision: RateRevisionService,
  ) {}

  private assertMaster(actor: JwtPayload) {
    if (actor.role !== UserRole.MASTER_AGENT) {
      throw new ForbiddenException('총판 계정만 이용할 수 있습니다');
    }
    if (!actor.platformId) {
      throw new ForbiddenException('플랫폼이 연결되지 않은 계정입니다');
    }
  }

  private async downlineUserIds(actor: JwtPayload): Promise<string[]> {
    this.assertMaster(actor);
    return this.collectDownlineUserIds(actor.platformId!, actor.sub);
  }

  /** 전체 트리를 BFS로 탐색해 모든 하위 USER id를 반환 */
  private async collectDownlineUserIds(
    platformId: string,
    agentId: string,
  ): Promise<string[]> {
    const userIds: string[] = [];
    const queue: string[] = [agentId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.prisma.user.findMany({
        where: { platformId, parentUserId: currentId },
        select: { id: true, role: true },
      });
      for (const child of children) {
        if (child.role === UserRole.USER) {
          userIds.push(child.id);
        } else if (child.role === UserRole.MASTER_AGENT) {
          queue.push(child.id);
        }
      }
    }
    return userIds;
  }

  private parseRange(fromStr?: string, toStr?: string): { start: Date; end: Date } {
    const end = toStr ? new Date(toStr) : new Date();
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('유효하지 않은 종료일입니다');
    }
    end.setHours(23, 59, 59, 999);
    let start: Date;
    if (fromStr) {
      start = new Date(fromStr);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('유효하지 않은 시작일입니다');
      }
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(end);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    }
    if (start > end) {
      throw new BadRequestException('시작일이 종료일보다 늦습니다');
    }
    return { start, end };
  }

  private optionalCreatedRange(
    fromStr?: string,
    toStr?: string,
  ): { gte: Date; lte: Date } | undefined {
    if (!fromStr && !toStr) return undefined;
    const { start, end } = this.parseRange(fromStr, toStr);
    return { gte: start, lte: end };
  }

  private async assertDownline(
    actor: JwtPayload,
    targetUserId: string,
  ): Promise<void> {
    this.assertMaster(actor);
    const child = await this.prisma.user.findFirst({
      where: {
        id: targetUserId,
        platformId: actor.platformId!,
        parentUserId: actor.sub,
        role: UserRole.USER,
      },
      select: { id: true },
    });
    if (!child) throw new NotFoundException('회원을 찾을 수 없습니다');
  }

  async stats(actor: JwtPayload) {
    this.assertMaster(actor);
    const platformId = actor.platformId!;
    const [platform, agentSelf, users, subAgentCount] = await Promise.all([
      this.prisma.platform.findUnique({
        where: { id: platformId },
        select: {
          name: true,
          slug: true,
          domains: {
            select: { host: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.user.findFirst({
        where: { id: actor.sub, platformId },
        select: {
          parentUserId: true,
          agentPlatformSharePct: true,
          agentSplitFromParentPct: true,
          parent: { select: { role: true } },
        },
      }),
      this.prisma.user.findMany({
        where: {
          platformId,
          parentUserId: actor.sub,
          role: UserRole.USER,
        },
        select: {
          id: true,
          wallet: { select: { balance: true } },
        },
      }),
      this.prisma.user.count({
        where: {
          platformId,
          parentUserId: actor.sub,
          role: UserRole.MASTER_AGENT,
        },
      }),
    ]);
    const ids = users.map((u) => u.id);
    let totalBalance = 0;
    for (const u of users) {
      totalBalance += Number(u.wallet?.balance ?? 0);
    }
    let pendingDepositCount = 0;
    let pendingWithdrawCount = 0;
    if (ids.length > 0) {
      [pendingDepositCount, pendingWithdrawCount] = await Promise.all([
        this.prisma.walletRequest.count({
          where: {
            platformId,
            userId: { in: ids },
            status: WalletRequestStatus.PENDING,
            type: WalletRequestType.DEPOSIT,
          },
        }),
        this.prisma.walletRequest.count({
          where: {
            platformId,
            userId: { in: ids },
            status: WalletRequestStatus.PENDING,
            type: WalletRequestType.WITHDRAWAL,
          },
        }),
      ]);
    }
    const primaryHost = platform?.domains?.[0]?.host;
    const siteUrl = primaryHost
      ? publicSiteUrlFromHost(primaryHost)
      : null;
    const effRaw = await this.effectiveShareForAgentUser(
      platformId,
      actor.sub,
    );
    const effectiveAgentSharePct = Math.round(effRaw * 1e4) / 1e4;
    const nestedUnderMasterAgent =
      agentSelf?.parentUserId != null &&
      agentSelf.parent?.role === UserRole.MASTER_AGENT;
    const agentPlatformSharePct =
      agentSelf?.agentPlatformSharePct != null
        ? Number(agentSelf.agentPlatformSharePct)
        : null;
    const agentSplitFromParentPct =
      agentSelf?.agentSplitFromParentPct != null
        ? Number(agentSelf.agentSplitFromParentPct)
        : null;
    return {
      platformName: platform?.name ?? '',
      platformSlug: platform?.slug ?? '',
      siteUrl,
      effectiveAgentSharePct,
      nestedUnderMasterAgent,
      agentPlatformSharePct,
      agentSplitFromParentPct,
      memberCount: users.length,
      totalBalance: totalBalance.toFixed(2),
      pendingDepositCount,
      pendingWithdrawCount,
      subAgentCount,
    };
  }

  async salesSummary(actor: JwtPayload, fromStr?: string, toStr?: string) {
    this.assertMaster(actor);
    const { start, end } = this.parseRange(fromStr, toStr);
    const ids = await this.downlineUserIds(actor);
    const platformId = actor.platformId!;
    const effPct = await this.effectiveShareForAgentUser(platformId, actor.sub);
    if (ids.length === 0) {
      return {
        from: start.toISOString(),
        to: end.toISOString(),
        approvedDepositSum: '0.00',
        approvedWithdrawSum: '0.00',
        netInflow: '0.00',
        ledgerBetSum: '0.00',
        ledgerBetStakeAbs: '0.00',
        ledgerWinSum: '0.00',
        estGgr: '0.00',
        effectiveAgentSharePct: Math.round(effPct * 1e4) / 1e4,
        myEstimatedSettlement: '0.00',
        gameSales: emptyGameSales(),
        gameSalesMeta:
          '원장 BET/WIN의 metaJson.vertical (LIVE_CASINO|SPORTS|MINIGAME|SLOT) · metaJson.subVertical(라이브 종류 등)',
        members: [] as {
          userId: string;
          loginId: string;
          uplinePrivateMemo: string | null;
          displayName: string | null;
          approvedDepositSum: string;
          approvedWithdrawSum: string;
          netInflow: string;
          ledgerBetSum: string;
          ledgerBetStakeAbs: string;
          ledgerWinSum: string;
          estGgr: string;
        }[],
      };
    }
    const approvedInPeriod: Prisma.WalletRequestWhereInput = {
      platformId,
      userId: { in: ids },
      status: WalletRequestStatus.APPROVED,
      OR: [
        { resolvedAt: { gte: start, lte: end } },
        {
          AND: [
            { resolvedAt: null },
            { createdAt: { gte: start, lte: end } },
          ],
        },
      ],
    };
    const [
      depAgg,
      witAgg,
      betAgg,
      winAgg,
      betRows,
      breakdownRows,
      depByUser,
      witByUser,
      ledgerByMember,
    ] = await Promise.all([
      this.prisma.walletRequest.aggregate({
        where: { ...approvedInPeriod, type: WalletRequestType.DEPOSIT },
        _sum: { amount: true },
      }),
      this.prisma.walletRequest.aggregate({
        where: { ...approvedInPeriod, type: WalletRequestType.WITHDRAWAL },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          platformId,
          userId: { in: ids },
          type: LedgerEntryType.BET,
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          platformId,
          userId: { in: ids },
          type: LedgerEntryType.WIN,
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          platformId,
          userId: { in: ids },
          type: LedgerEntryType.BET,
          createdAt: { gte: start, lte: end },
        },
        select: { amount: true },
      }),
      this.prisma.$queryRaw<SqlGameRow[]>`
        SELECT
          UPPER(TRIM(COALESCE("metaJson"->>'vertical', 'UNKNOWN'))) AS vertical,
          UPPER(TRIM(COALESCE("metaJson"->>'subVertical', ''))) AS sub_vertical,
          SUM(CASE WHEN "type"::text = 'BET' THEN "amount" ELSE 0 END) AS bet_sum,
          SUM(CASE WHEN "type"::text = 'BET' THEN ABS("amount") ELSE 0 END) AS bet_stake_abs,
          SUM(CASE WHEN "type"::text = 'WIN' THEN "amount" ELSE 0 END) AS win_sum
        FROM "LedgerEntry"
        WHERE "platformId" = ${platformId}
          AND "userId" IN (${Prisma.join(ids)})
          AND "type"::text IN ('BET', 'WIN')
          AND "createdAt" >= ${start}
          AND "createdAt" <= ${end}
        GROUP BY 1, 2
      `,
      this.prisma.walletRequest.groupBy({
        by: ['userId'],
        where: { ...approvedInPeriod, type: WalletRequestType.DEPOSIT },
        _sum: { amount: true },
      }),
      this.prisma.walletRequest.groupBy({
        by: ['userId'],
        where: { ...approvedInPeriod, type: WalletRequestType.WITHDRAWAL },
        _sum: { amount: true },
      }),
      this.prisma.$queryRaw<SqlMemberLedgerRow[]>`
        SELECT "userId",
          SUM(CASE WHEN "type"::text = 'BET' THEN "amount" ELSE 0 END) AS bet_sum,
          SUM(CASE WHEN "type"::text = 'BET' THEN ABS("amount") ELSE 0 END) AS bet_stake_abs,
          SUM(CASE WHEN "type"::text = 'WIN' THEN "amount" ELSE 0 END) AS win_sum
        FROM "LedgerEntry"
        WHERE "platformId" = ${platformId}
          AND "userId" IN (${Prisma.join(ids)})
          AND "type"::text IN ('BET', 'WIN')
          AND "createdAt" >= ${start}
          AND "createdAt" <= ${end}
        GROUP BY "userId"
      `,
    ]);
    const dep = Number(depAgg._sum.amount ?? 0);
    const wit = Number(witAgg._sum.amount ?? 0);
    let stakeAbs = 0;
    for (const r of betRows) {
      stakeAbs += Math.abs(Number(r.amount));
    }
    const gameSales = buildGameSalesFromRows(breakdownRows);

    const depMap = new Map<string, number>();
    for (const r of depByUser) {
      depMap.set(r.userId, Number(r._sum.amount ?? 0));
    }
    const witMap = new Map<string, number>();
    for (const r of witByUser) {
      witMap.set(r.userId, Number(r._sum.amount ?? 0));
    }
    const ledMap = new Map<
      string,
      { betSum: number; stake: number; win: number }
    >();
    for (const r of ledgerByMember) {
      ledMap.set(r.userId, {
        betSum: Number(r.bet_sum),
        stake: Number(r.bet_stake_abs),
        win: Number(r.win_sum),
      });
    }
    const memberIds = new Set<string>();
    for (const r of depByUser) memberIds.add(r.userId);
    for (const r of witByUser) memberIds.add(r.userId);
    for (const r of ledgerByMember) memberIds.add(r.userId);

    let members: {
      userId: string;
      loginId: string;
      uplinePrivateMemo: string | null;
      displayName: string | null;
      approvedDepositSum: string;
      approvedWithdrawSum: string;
      netInflow: string;
      ledgerBetSum: string;
      ledgerBetStakeAbs: string;
      ledgerWinSum: string;
      estGgr: string;
    }[] = [];
    if (memberIds.size > 0) {
      const usersInfo = await this.prisma.user.findMany({
        where: { id: { in: [...memberIds] }, platformId },
        select: {
          id: true,
          loginId: true,
          email: true,
          displayName: true,
          parentUserId: true,
          uplinePrivateMemo: true,
        },
      });
      const infoMap = new Map(usersInfo.map((u) => [u.id, u]));
      type RowAcc = {
        userId: string;
        loginId: string;
        uplinePrivateMemo: string | null;
        displayName: string | null;
        approvedDepositSum: string;
        approvedWithdrawSum: string;
        netInflow: string;
        ledgerBetSum: string;
        ledgerBetStakeAbs: string;
        ledgerWinSum: string;
        estGgr: string;
        _sortStake: number;
      };
      const rows: RowAcc[] = [...memberIds].map((userId) => {
        const depN = depMap.get(userId) ?? 0;
        const witN = witMap.get(userId) ?? 0;
        const led = ledMap.get(userId) ?? {
          betSum: 0,
          stake: 0,
          win: 0,
        };
        const info = infoMap.get(userId);
        const netN = depN - witN;
        const ggrN = led.stake - led.win;
        const uplinePrivateMemo =
          info && info.parentUserId === actor.sub
            ? info.uplinePrivateMemo ?? null
            : null;
        return {
          userId,
          loginId: info?.loginId ?? info?.email ?? userId,
          uplinePrivateMemo,
          displayName: info?.displayName ?? null,
          approvedDepositSum: depN.toFixed(2),
          approvedWithdrawSum: witN.toFixed(2),
          netInflow: netN.toFixed(2),
          ledgerBetSum: led.betSum.toFixed(2),
          ledgerBetStakeAbs: led.stake.toFixed(2),
          ledgerWinSum: led.win.toFixed(2),
          estGgr: ggrN.toFixed(2),
          _sortStake: led.stake,
        };
      });
      rows.sort((a, b) => b._sortStake - a._sortStake);
      members = rows.slice(0, 400).map(({ _sortStake: _s, ...rest }) => rest);
    }

    const totalWin = Number(sumDec(winAgg._sum.amount));
    const ggr = stakeAbs - totalWin;
    const mySettlement = (ggr * effPct) / 100;

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      approvedDepositSum: sumDec(depAgg._sum.amount),
      approvedWithdrawSum: sumDec(witAgg._sum.amount),
      netInflow: (dep - wit).toFixed(2),
      ledgerBetSum: sumDec(betAgg._sum.amount),
      ledgerBetStakeAbs: stakeAbs.toFixed(2),
      ledgerWinSum: sumDec(winAgg._sum.amount),
      estGgr: ggr.toFixed(2),
      effectiveAgentSharePct: Math.round(effPct * 1e4) / 1e4,
      myEstimatedSettlement: mySettlement.toFixed(2),
      gameSales,
      gameSalesMeta:
        '원장 BET/WIN의 metaJson.vertical (LIVE_CASINO|SPORTS|MINIGAME|SLOT) · metaJson.subVertical(라이브 종류 등)',
      members,
    };
  }

  async walletRequestsList(
    actor: JwtPayload,
    status?: string,
    fromStr?: string,
    toStr?: string,
    limitRaw?: string,
  ) {
    this.assertMaster(actor);
    const ids = await this.downlineUserIds(actor);
    const platformId = actor.platformId!;
    const limit = Math.min(
      500,
      Math.max(1, Number.parseInt(limitRaw ?? '150', 10) || 150),
    );
    if (ids.length === 0) {
      return { items: [] as unknown[] };
    }
    const createdFilter = this.optionalCreatedRange(fromStr, toStr);
    const where: Prisma.WalletRequestWhereInput = {
      platformId,
      userId: { in: ids },
    };
    if (createdFilter) {
      where.createdAt = createdFilter;
    }
    if (
      status &&
      (Object.values(WalletRequestStatus) as string[]).includes(status)
    ) {
      where.status = status as WalletRequestStatus;
    }
    const rows = await this.prisma.walletRequest.findMany({
      where,
      include: {
        user: { select: { loginId: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toFixed(2),
        status: r.status,
        note: r.note,
        depositorName: r.depositorName,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
        userId: r.userId,
        userLoginId: r.user.loginId,
        userEmail: r.user.email,
        userDisplayName: r.user.displayName,
      })),
    };
  }

  async bettingLedger(
    actor: JwtPayload,
    fromStr?: string,
    toStr?: string,
    limitRaw?: string,
  ) {
    this.assertMaster(actor);
    const ids = await this.downlineUserIds(actor);
    const platformId = actor.platformId!;
    const limit = Math.min(
      500,
      Math.max(1, Number.parseInt(limitRaw ?? '150', 10) || 150),
    );
    if (ids.length === 0) {
      return { items: [] as unknown[] };
    }
    const createdFilter = this.optionalCreatedRange(fromStr, toStr);
    const where: Prisma.LedgerEntryWhereInput = {
      platformId,
      userId: { in: ids },
      type: { in: [LedgerEntryType.BET, LedgerEntryType.WIN] },
    };
    if (createdFilter) {
      where.createdAt = createdFilter;
    }
    const rows = await this.prisma.ledgerEntry.findMany({
      where,
      include: {
        user: { select: { loginId: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toFixed(2),
        balanceAfter: r.balanceAfter.toFixed(2),
        reference: r.reference,
        createdAt: r.createdAt,
        userId: r.userId,
        userLoginId: r.user.loginId,
        userEmail: r.user.email,
        userDisplayName: r.user.displayName,
      })),
    };
  }

  private async effectiveShareForAgentUser(
    platformId: string,
    agentUserId: string,
  ): Promise<number> {
    const u = await this.prisma.user.findFirst({
      where: { id: agentUserId, platformId, role: UserRole.MASTER_AGENT },
      select: {
        parentUserId: true,
        agentPlatformSharePct: true,
        agentSplitFromParentPct: true,
      },
    });
    if (!u) return 0;
    if (!u.parentUserId) {
      return Number(u.agentPlatformSharePct ?? 0);
    }
    const parent = await this.prisma.user.findFirst({
      where: { id: u.parentUserId, platformId },
      select: { role: true },
    });
    if (parent?.role !== UserRole.MASTER_AGENT) {
      return Number(u.agentPlatformSharePct ?? 0);
    }
    const pe = await this.effectiveShareForAgentUser(
      platformId,
      u.parentUserId,
    );
    return (pe * Number(u.agentSplitFromParentPct ?? 0)) / 100;
  }

  async subAgents(actor: JwtPayload) {
    this.assertMaster(actor);
    const platformId = actor.platformId!;
    const myEff = await this.effectiveShareForAgentUser(platformId, actor.sub);
    const rows = await this.prisma.user.findMany({
      where: {
        platformId,
        parentUserId: actor.sub,
        role: UserRole.MASTER_AGENT,
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        displayName: true,
        createdAt: true,
        agentSplitFromParentPct: true,
        uplinePrivateMemo: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      parentEffectiveSharePct: Math.round(myEff * 1e4) / 1e4,
      items: rows.map((r) => {
        const split = Number(r.agentSplitFromParentPct ?? 0);
        const eff = (myEff * split) / 100;
        return {
          id: r.id,
          loginId: r.loginId,
          email: r.email,
          displayName: r.displayName,
          createdAt: r.createdAt,
          uplinePrivateMemo: r.uplinePrivateMemo ?? null,
          splitFromParentPct: split,
          effectiveAgentSharePct: Math.round(eff * 1e4) / 1e4,
        };
      }),
    };
  }

  async updateSubAgentSplit(
    actor: JwtPayload,
    subAgentUserId: string,
    splitFromParentPct: number,
  ) {
    this.assertMaster(actor);
    const sub = await this.prisma.user.findFirst({
      where: {
        id: subAgentUserId,
        platformId: actor.platformId!,
        parentUserId: actor.sub,
        role: UserRole.MASTER_AGENT,
      },
      select: { id: true },
    });
    if (!sub) {
      throw new NotFoundException('직속 하위 총판만 수정할 수 있습니다');
    }
    const effectiveFrom = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: subAgentUserId },
        data: {
          agentSplitFromParentPct: new Prisma.Decimal(splitFromParentPct),
        },
      });
      const u = await tx.user.findUnique({
        where: { id: subAgentUserId },
        select: {
          agentPlatformSharePct: true,
          agentSplitFromParentPct: true,
        },
      });
      await this.rateRevision.appendAgentCommissionRevision(
        tx,
        subAgentUserId,
        effectiveFrom,
        {
          agentPlatformSharePct: u?.agentPlatformSharePct ?? null,
          agentSplitFromParentPct: u?.agentSplitFromParentPct ?? null,
        },
      );
    });
    return { ok: true };
  }

  async downlineWalletRequestsForUser(actor: JwtPayload, userId: string) {
    await this.assertDownline(actor, userId);
    const rows = await this.prisma.walletRequest.findMany({
      where: { userId, platformId: actor.platformId! },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toFixed(2),
        status: r.status,
        note: r.note,
        depositorName: r.depositorName,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
      })),
    };
  }

  async downlineLedgerForUser(
    actor: JwtPayload,
    userId: string,
    limitRaw?: string,
  ) {
    await this.assertDownline(actor, userId);
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(limitRaw ?? '80', 10) || 80),
    );
    const rows = await this.prisma.ledgerEntry.findMany({
      where: {
        userId,
        platformId: actor.platformId!,
        type: { in: [LedgerEntryType.BET, LedgerEntryType.WIN] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount.toFixed(2),
        balanceAfter: r.balanceAfter.toFixed(2),
        reference: r.reference,
        createdAt: r.createdAt,
      })),
    };
  }

  /** 매출 조회 구간과 동일한 기준으로 승인 입출금 + BET/WIN 원장을 시간순(최신 먼저) 페이지네이션 */
  async downlineSalesActivity(
    actor: JwtPayload,
    targetUserId: string,
    fromStr?: string,
    toStr?: string,
    pageRaw?: string,
    pageSizeRaw?: string,
  ) {
    await this.assertDownline(actor, targetUserId);
    const { start, end } = this.parseRange(fromStr, toStr);
    const platformId = actor.platformId!;
    const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, Number.parseInt(pageSizeRaw ?? '10', 10) || 10),
    );
    const skip = (page - 1) * pageSize;

    type CountRow = { c: bigint };
    const [countRow] = await this.prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS c FROM (
        SELECT wr.id
        FROM "WalletRequest" wr
        WHERE wr."userId" = ${targetUserId}
          AND wr."platformId" = ${platformId}
          AND wr.status::text = 'APPROVED'
          AND (
            (wr."resolvedAt" >= ${start} AND wr."resolvedAt" <= ${end})
            OR (
              wr."resolvedAt" IS NULL
              AND wr."createdAt" >= ${start}
              AND wr."createdAt" <= ${end}
            )
          )
        UNION ALL
        SELECT le.id
        FROM "LedgerEntry" le
        WHERE le."userId" = ${targetUserId}
          AND le."platformId" = ${platformId}
          AND le."type"::text IN ('BET', 'WIN')
          AND le."createdAt" >= ${start}
          AND le."createdAt" <= ${end}
      ) u
    `;
    const total = Number(countRow?.c ?? 0);

    type ActRow = {
      src: string;
      id: string;
      sort_at: Date;
      entry_type: string;
      amount: Prisma.Decimal;
      note: string | null;
      reference: string | null;
      vertical: string | null;
      sub_vertical: string | null;
    };

    const rows = await this.prisma.$queryRaw<ActRow[]>`
      SELECT * FROM (
        SELECT
          'WALLET'::text AS src,
          wr.id,
          COALESCE(wr."resolvedAt", wr."createdAt") AS sort_at,
          wr."type"::text AS entry_type,
          wr.amount,
          wr.note,
          NULL::text AS reference,
          NULL::text AS vertical,
          NULL::text AS sub_vertical
        FROM "WalletRequest" wr
        WHERE wr."userId" = ${targetUserId}
          AND wr."platformId" = ${platformId}
          AND wr.status::text = 'APPROVED'
          AND (
            (wr."resolvedAt" >= ${start} AND wr."resolvedAt" <= ${end})
            OR (
              wr."resolvedAt" IS NULL
              AND wr."createdAt" >= ${start}
              AND wr."createdAt" <= ${end}
            )
          )
        UNION ALL
        SELECT
          'LEDGER'::text,
          le.id,
          le."createdAt",
          le."type"::text,
          le.amount,
          NULL::text,
          le.reference,
          le."metaJson"->>'vertical',
          le."metaJson"->>'subVertical'
        FROM "LedgerEntry" le
        WHERE le."userId" = ${targetUserId}
          AND le."platformId" = ${platformId}
          AND le."type"::text IN ('BET', 'WIN')
          AND le."createdAt" >= ${start}
          AND le."createdAt" <= ${end}
      ) x
      ORDER BY sort_at DESC
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    return {
      from: start.toISOString(),
      to: end.toISOString(),
      page,
      pageSize,
      total,
      items: rows.map((r) => ({
        source: r.src,
        id: r.id,
        occurredAt: r.sort_at.toISOString(),
        entryType: r.entry_type,
        amount: Number(r.amount).toFixed(2),
        note: r.note,
        reference: r.reference,
        vertical: r.vertical?.length ? r.vertical : null,
        subVertical: r.sub_vertical?.length ? r.sub_vertical : null,
      })),
    };
  }

  async downline(actor: JwtPayload) {
    this.assertMaster(actor);
    const rows = await this.prisma.user.findMany({
      where: {
        platformId: actor.platformId!,
        parentUserId: actor.sub,
        role: UserRole.USER,
      },
      select: {
        id: true,
        loginId: true,
        email: true,
        displayName: true,
        createdAt: true,
        registrationStatus: true,
        rollingEnabled: true,
        rollingSportsDomesticPct: true,
        rollingSportsOverseasPct: true,
        rollingCasinoPct: true,
        rollingSlotPct: true,
        rollingMinigamePct: true,
        uplinePrivateMemo: true,
        wallet: { select: { balance: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      loginId: r.loginId,
      email: r.email,
      displayName: r.displayName,
      createdAt: r.createdAt,
      registrationStatus: r.registrationStatus,
      rollingEnabled: r.rollingEnabled,
      rollingSportsDomesticPct: dec(r.rollingSportsDomesticPct),
      rollingSportsOverseasPct: dec(r.rollingSportsOverseasPct),
      rollingCasinoPct: dec(r.rollingCasinoPct),
      rollingSlotPct: dec(r.rollingSlotPct),
      rollingMinigamePct: dec(r.rollingMinigamePct),
      uplinePrivateMemo: r.uplinePrivateMemo ?? null,
      balance: r.wallet?.balance?.toFixed(2) ?? '0.00',
    }));
  }

  async downlineOne(actor: JwtPayload, userId: string) {
    await this.assertDownline(actor, userId);
    const r = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        loginId: true,
        email: true,
        displayName: true,
        createdAt: true,
        registrationStatus: true,
        rollingEnabled: true,
        rollingSportsDomesticPct: true,
        rollingSportsOverseasPct: true,
        rollingCasinoPct: true,
        rollingSlotPct: true,
        rollingMinigamePct: true,
        agentMemo: true,
        userMemo: true,
        uplinePrivateMemo: true,
        wallet: { select: { balance: true } },
      },
    });
    if (!r) throw new NotFoundException();
    return {
      id: r.id,
      loginId: r.loginId,
      email: r.email,
      displayName: r.displayName,
      createdAt: r.createdAt,
      registrationStatus: r.registrationStatus,
      rollingEnabled: r.rollingEnabled,
      rollingSportsDomesticPct: dec(r.rollingSportsDomesticPct),
      rollingSportsOverseasPct: dec(r.rollingSportsOverseasPct),
      rollingCasinoPct: dec(r.rollingCasinoPct),
      rollingSlotPct: dec(r.rollingSlotPct),
      rollingMinigamePct: dec(r.rollingMinigamePct),
      agentMemo: r.agentMemo,
      userMemo: r.userMemo,
      uplinePrivateMemo: r.uplinePrivateMemo ?? null,
      balance: r.wallet?.balance?.toFixed(2) ?? '0.00',
    };
  }

  async updateRolling(
    actor: JwtPayload,
    userId: string,
    dto: UpdateRollingDto,
  ) {
    await this.assertDownline(actor, userId);
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { platformId: true },
    });
    if (!target?.platformId) {
      throw new BadRequestException('플랫폼 소속 회원만 롤링을 설정할 수 있습니다');
    }
    const plat = await this.prisma.platform.findUnique({
      where: { id: target.platformId },
      select: { agentCanEditMemberRolling: true },
    });
    if (!plat?.agentCanEditMemberRolling) {
      throw new ForbiddenException(
        '플랫폼 설정상 총판은 회원 롤링 비율을 수정할 수 없습니다',
      );
    }
    const effectiveFrom = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          rollingEnabled: dto.rollingEnabled,
          rollingSportsDomesticPct: new Prisma.Decimal(
            dto.rollingSportsDomesticPct,
          ),
          rollingSportsOverseasPct: new Prisma.Decimal(
            dto.rollingSportsOverseasPct,
          ),
          rollingCasinoPct: new Prisma.Decimal(dto.rollingCasinoPct),
          rollingSlotPct: new Prisma.Decimal(dto.rollingSlotPct),
          rollingMinigamePct: new Prisma.Decimal(dto.rollingMinigamePct),
        },
      });
      await this.rateRevision.appendRollingRevision(tx, userId, effectiveFrom, {
        rollingEnabled: dto.rollingEnabled,
        rollingSportsDomesticPct: new Prisma.Decimal(
          dto.rollingSportsDomesticPct,
        ),
        rollingSportsOverseasPct: new Prisma.Decimal(
          dto.rollingSportsOverseasPct,
        ),
        rollingCasinoPct: new Prisma.Decimal(dto.rollingCasinoPct),
        rollingSlotPct: new Prisma.Decimal(dto.rollingSlotPct),
        rollingMinigamePct: new Prisma.Decimal(dto.rollingMinigamePct),
      });
    });
    return { ok: true, effectiveFrom };
  }

  async listDownlineRollingRevisions(actor: JwtPayload, userId: string) {
    await this.assertDownline(actor, userId);
    const items = await this.rateRevision.listRollingRevisions(userId);
    return {
      hint: '정산 시각 T에는 effectiveFrom ≤ T 인 가장 최근 행의 %가 적용됩니다.',
      items,
    };
  }
}

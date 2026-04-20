import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  LedgerEntryType,
  Prisma,
  RegistrationStatus,
  UserRole,
  WalletRequestStatus,
  WalletRequestType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/auth.service';
import { RollingObligationService } from '../rolling/rolling-obligation.service';
import { DepositEventsService } from '../deposit-events/deposit-events.service';
import { PointsService } from '../points/points.service';
import { UpbitRateService } from '../usdt-deposit/upbit-rate.service';
import { computeEffectiveAgentShares } from '../common/agent-commission.util';
import {
  pickBucketState,
  WalletBucketsService,
} from '../wallet-buckets/wallet-buckets.service';

@Injectable()
export class WalletRequestsService {
  constructor(
    private prisma: PrismaService,
    private rolling: RollingObligationService,
    private depositEvents: DepositEventsService,
    private points: PointsService,
    private upbit: UpbitRateService,
    private buckets: WalletBucketsService,
  ) {}

  private async getUsdtKrwRate(): Promise<Prisma.Decimal> {
    return this.upbit.getKrwPerUsdt();
  }

  private async toWalletKrwAmount(
    amount: Prisma.Decimal,
    currency: 'KRW' | 'USDT',
  ): Promise<Prisma.Decimal> {
    if (currency === 'USDT') {
      return amount.times(await this.getUsdtKrwRate());
    }
    return amount;
  }

  private assertPlatformAdmin(actor: JwtPayload, platformId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    if (
      actor.role === UserRole.PLATFORM_ADMIN &&
      actor.platformId === platformId
    )
      return;
    throw new ForbiddenException();
  }

  async createForUser(
    userId: string,
    platformId: string | null,
    type: WalletRequestType,
    amount: number,
    note?: string,
    depositorName?: string,
    currency: 'KRW' | 'USDT' = 'KRW',
  ) {
    if (!platformId) throw new BadRequestException('Invalid user');
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        platformId,
        role: UserRole.USER,
        registrationStatus: RegistrationStatus.APPROVED,
      },
      select: {
        id: true,
        signupMode: true,
        bankCode: true,
        bankAccountNumber: true,
        bankAccountHolder: true,
        usdtWalletAddress: true,
      },
    });
    if (!user) throw new ForbiddenException();
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet)
      throw new BadRequestException('지갑이 없습니다. 승인을 기다려 주세요.');
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        minDepositKrw: true,
        minDepositUsdt: true,
        minWithdrawKrw: true,
        minWithdrawUsdt: true,
        semiVirtualEnabled: true,
      },
    });
    const amt = new Prisma.Decimal(amount);
    const walletKrwAmount = await this.toWalletKrwAmount(amt, currency);
    const isAnonymous = user.signupMode === 'anonymous';

    if (isAnonymous && currency !== 'USDT') {
      throw new BadRequestException(
        '무기명 회원은 테더 입출금만 사용할 수 있습니다',
      );
    }
    if (!isAnonymous && currency === 'USDT') {
      throw new BadRequestException(
        '일반 회원은 원화 입출금만 사용할 수 있습니다',
      );
    }

    if (type === WalletRequestType.WITHDRAWAL) {
      await this.rolling.assertWithdrawalAllowed(userId);
      if (wallet.balance.lt(walletKrwAmount)) {
        throw new BadRequestException('출금액이 잔액을 초과합니다');
      }
      if (currency === 'USDT' && !user.usdtWalletAddress?.trim()) {
        throw new BadRequestException('테더 지갑 주소를 먼저 등록해주세요');
      }
      if (
        currency !== 'USDT' &&
        (!user.bankCode || !user.bankAccountNumber || !user.bankAccountHolder)
      ) {
        throw new BadRequestException('출금 계좌를 먼저 등록해주세요');
      }
      if (currency === 'USDT' && platform?.minWithdrawUsdt != null) {
        if (amt.lt(platform.minWithdrawUsdt)) {
          throw new BadRequestException(
            `USDT 출금 최소액은 ${platform.minWithdrawUsdt.toString()} 입니다`,
          );
        }
      }
      if (currency !== 'USDT' && platform?.minWithdrawKrw != null) {
        if (amt.lt(platform.minWithdrawKrw)) {
          throw new BadRequestException(
            `원화 출금 최소액은 ${platform.minWithdrawKrw.toString()} 원입니다`,
          );
        }
      }
    }
    if (type === WalletRequestType.DEPOSIT) {
      if (currency === 'USDT' && platform?.minDepositUsdt != null) {
        if (amt.lt(platform.minDepositUsdt)) {
          throw new BadRequestException(
            `USDT 입금 최소액은 ${platform.minDepositUsdt.toString()} 입니다`,
          );
        }
      }
      if (currency !== 'USDT' && platform?.minDepositKrw != null) {
        if (amt.lt(platform.minDepositKrw)) {
          throw new BadRequestException(
            `원화 입금 최소액은 ${platform.minDepositKrw.toString()} 원입니다`,
          );
        }
      }
    }
    const dep = depositorName?.trim() || null;
    if (type === WalletRequestType.WITHDRAWAL && dep) {
      throw new BadRequestException(
        '출금 신청에는 입금자명을 넣을 수 없습니다',
      );
    }
    const registeredDepositorName = user.bankAccountHolder?.trim() || null;
    if (type === WalletRequestType.DEPOSIT && currency === 'KRW') {
      if (!user.bankCode || !user.bankAccountNumber || !registeredDepositorName) {
        throw new BadRequestException(
          '입금 신청 전 등록 계좌를 먼저 저장해주세요',
        );
      }
      if (dep && dep !== registeredDepositorName) {
        throw new BadRequestException(
          '원화 입금은 등록 계좌 예금주명으로만 신청할 수 있습니다',
        );
      }
      // 1시간 이내 중복 PENDING 입금 신청 차단
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existing = await this.prisma.walletRequest.findFirst({
        where: {
          userId,
          platformId,
          type: WalletRequestType.DEPOSIT,
          status: WalletRequestStatus.PENDING,
          currency: 'KRW',
          createdAt: { gte: oneHourAgo },
        },
      });
      if (existing) {
        throw new ConflictException(
          '진행 중인 입금 신청이 있습니다. 취소 후 다시 신청하세요.',
        );
      }
    }

    const created = await this.prisma.walletRequest.create({
      data: {
        platformId,
        userId,
        type,
        amount,
        currency,
        note: note?.trim() || null,
        depositorName:
          type === WalletRequestType.DEPOSIT && currency === 'KRW'
            ? registeredDepositorName
            : null,
        status: WalletRequestStatus.PENDING,
      },
    });

    // KRW 입금 신청 시 플랫폼 입금 계좌 정보 함께 반환
    if (type === WalletRequestType.DEPOSIT && currency === 'KRW') {
      const plat = await this.prisma.platform.findUnique({
        where: { id: platformId },
        select: {
          semiVirtualBankName: true,
          semiVirtualAccountNumber: true,
          semiVirtualAccountHolder: true,
        },
      });
      return {
        ...created,
        depositAccount: {
          bankName: plat?.semiVirtualBankName ?? null,
          accountNumber: plat?.semiVirtualAccountNumber ?? null,
          accountHolder: plat?.semiVirtualAccountHolder ?? null,
        },
        expiresAt: new Date(created.createdAt.getTime() + 60 * 60 * 1000).toISOString(),
      };
    }

    return created;
  }

  /** 유저가 자신의 PENDING 입금 신청 취소 */
  async cancelMine(userId: string, requestId: string) {
    const req = await this.prisma.walletRequest.findFirst({
      where: {
        id: requestId,
        userId,
        status: WalletRequestStatus.PENDING,
        type: WalletRequestType.DEPOSIT,
      },
    });
    if (!req) throw new NotFoundException('취소할 수 있는 신청 내역이 없습니다');
    await this.prisma.walletRequest.update({
      where: { id: requestId },
      data: { status: WalletRequestStatus.REJECTED, note: '회원 취소' },
    });
    return { ok: true };
  }

  /** 1시간 이내 PENDING KRW 입금 신청 + 플랫폼 계좌 반환 */
  async getActivePendingDeposit(userId: string, platformId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const req = await this.prisma.walletRequest.findFirst({
      where: {
        userId,
        platformId,
        type: WalletRequestType.DEPOSIT,
        status: WalletRequestStatus.PENDING,
        currency: 'KRW',
        createdAt: { gte: oneHourAgo },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!req) return null;
    const plat = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        semiVirtualBankName: true,
        semiVirtualAccountNumber: true,
        semiVirtualAccountHolder: true,
      },
    });
    return {
      request: req,
      depositAccount: {
        bankName: plat?.semiVirtualBankName ?? null,
        accountNumber: plat?.semiVirtualAccountNumber ?? null,
        accountHolder: plat?.semiVirtualAccountHolder ?? null,
      },
      expiresAt: new Date(req.createdAt.getTime() + 60 * 60 * 1000).toISOString(),
    };
  }

  listMine(userId: string) {
    return this.prisma.walletRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listForPlatform(
    platformId: string,
    actor: JwtPayload,
    status?: WalletRequestStatus,
    currency?: string,
  ) {
    this.assertPlatformAdmin(actor, platformId);
    const rows = await this.prisma.walletRequest.findMany({
      where: {
        platformId,
        ...(status ? { status } : {}),
        ...(currency ? { currency } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            loginId: true,
            email: true,
            displayName: true,
            signupMode: true,
            bankCode: true,
            bankAccountNumber: true,
            bankAccountHolder: true,
            usdtWalletAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const hasUsdtRow = rows.some((r) => r.currency === 'USDT');
    const usdtKrwRate = hasUsdtRow ? await this.getUsdtKrwRate() : null;

    return rows.map((r) => {
      if (r.currency === 'USDT' && usdtKrwRate) {
        return {
          ...r,
          krwRate: usdtKrwRate.toFixed(2),
          krwAmount: new Prisma.Decimal(r.amount).times(usdtKrwRate).toFixed(2),
        };
      }
      return r;
    });
  }

  async approve(
    platformId: string,
    requestId: string,
    actor: JwtPayload,
    resolverNote?: string,
  ) {
    this.assertPlatformAdmin(actor, platformId);
    return this.prisma.$transaction(async (tx) => {
      const req = await tx.walletRequest.findFirst({
        where: {
          id: requestId,
          platformId,
          status: WalletRequestStatus.PENDING,
        },
      });
      if (!req) throw new NotFoundException();
      const wallet = await tx.wallet.findUnique({
        where: { userId: req.userId },
      });
      if (!wallet) throw new BadRequestException('User wallet missing');
      const amount = req.amount;
      const requestCurrency =
        req.currency === 'USDT' ? ('USDT' as const) : ('KRW' as const);
      const walletDeltaBase = await this.toWalletKrwAmount(amount, requestCurrency);
      let delta: Prisma.Decimal;
      if (req.type === WalletRequestType.DEPOSIT) {
        delta = walletDeltaBase;
      } else {
        delta = walletDeltaBase.negated();
      }
      const wb = pickBucketState(wallet);
      let nextBuckets;
      if (req.type === WalletRequestType.DEPOSIT) {
        nextBuckets = this.buckets.creditLockedDeposit(wb, walletDeltaBase);
      } else {
        this.buckets.assertSufficientTotal(wb, walletDeltaBase);
        nextBuckets = this.buckets.applyWithdraw(wb, walletDeltaBase);
      }
      const { balance: newBal } = await this.buckets.persist(tx, wallet.id, nextBuckets);
      if (newBal.lt(0)) throw new BadRequestException('Insufficient balance');
      await tx.ledgerEntry.create({
        data: {
          userId: req.userId,
          platformId,
          type: LedgerEntryType.ADJUSTMENT,
          amount: delta,
          balanceAfter: newBal,
          reference: `wr:${req.id}`,
          metaJson: {
            demoWalletRequest: true,
            requestType: req.type,
            requestCurrency,
            requestAmount: amount.toFixed(2),
            walletKrwAmount: walletDeltaBase.toFixed(2),
          },
        },
      });
      if (req.type === WalletRequestType.DEPOSIT) {
        await this.rolling.createObligationIfNeeded(tx, {
          userId: req.userId,
          platformId,
          depositAmount: walletDeltaBase,
          sourceRef: `wr:${req.id}:principal`,
        });
        await this.depositEvents.applyEligibleBonus(tx, {
          userId: req.userId,
          platformId,
          depositAmount: walletDeltaBase,
          ledgerRefPrefix: `wr:${req.id}`,
        });
        await this.points.maybeCreditDepositPoints(tx, {
          userId: req.userId,
          platformId,
          depositAmount: walletDeltaBase,
          ledgerRefPrefix: `wr:${req.id}`,
        });
      }

      // 에이전트 커미션 즉시 적립/차감
      // 충전 승인 → 상위 에이전트에 충전금 × 실효요율% 적립
      // 환전 승인 → 상위 에이전트에서 환전금 × 실효요율% 차감
      await this.creditAgentOnWalletApproval(tx, platformId, req.userId, walletDeltaBase, req.type, req.id);

      await tx.walletRequest.update({
        where: { id: req.id },
        data: {
          status: WalletRequestStatus.APPROVED,
          resolvedAt: new Date(),
          resolverNote: resolverNote?.trim() || null,
        },
      });
      return { ok: true, balance: newBal.toFixed(2) };
    });
  }

  async reject(
    platformId: string,
    requestId: string,
    actor: JwtPayload,
    resolverNote?: string,
  ) {
    this.assertPlatformAdmin(actor, platformId);
    const req = await this.prisma.walletRequest.findFirst({
      where: {
        id: requestId,
        platformId,
        status: WalletRequestStatus.PENDING,
      },
    });
    if (!req) throw new NotFoundException();
    await this.prisma.walletRequest.update({
      where: { id: req.id },
      data: {
        status: WalletRequestStatus.REJECTED,
        resolvedAt: new Date(),
        resolverNote: resolverNote?.trim() || null,
      },
    });
    return { ok: true };
  }

  /**
   * 에이전트 커미션 즉시 적립/차감 — 전체 체인 지급 모델
   *
   * 유저 → 하위총판(effA) → 상위총판(effB) → ...
   * 각 에이전트는 자신의 순 요율(net = 자신_eff - 바로아래_eff)만큼 수령.
   * 체인 합산 = 최상위 요율(플랫폼이 실제 지출하는 금액) 이 된다.
   *
   * 예) 유저 입금 100,000, 하위총판 eff=2.5%, 상위총판 eff=5%
   *   하위총판: 100,000 × 2.5% = 2,500 (net = 2.5-0)
   *   상위총판: 100,000 × 2.5% = 2,500 (net = 5-2.5)
   *   합계:     5,000 = 100,000 × 5%  ← 플랫폼 부담은 최상위 요율만큼만
   */
  private async creditAgentOnWalletApproval(
    tx: Prisma.TransactionClient,
    platformId: string,
    memberId: string,
    amount: Prisma.Decimal,
    requestType: WalletRequestType,
    walletRequestId: string,
  ): Promise<void> {
    try {
      // 1. 유저부터 위로 올라가며 MASTER_AGENT 체인 수집
      const chain = await this.buildAgentChain(tx, platformId, memberId);
      if (chain.length === 0) return;

      // 2. 플랫폼 전체 MASTER_AGENT 실효 요율 맵
      const effMap = await this.buildEffectiveRateMap(tx, platformId);

      const refType = requestType === WalletRequestType.DEPOSIT ? 'deposit' : 'withdrawal';

      // 3. 체인 순서대로 각 에이전트에 순 요율만큼 지급
      //    chain[0] = 직속 부모(하위), chain[n-1] = 최상위
      for (let i = 0; i < chain.length; i++) {
        const agentId = chain[i];
        const myEff = effMap.get(agentId) ?? 0;
        const childEff = i > 0 ? (effMap.get(chain[i - 1]) ?? 0) : 0;
        const netPct = myEff - childEff;
        if (netPct <= 0) continue;

        const commission = amount.times(new Prisma.Decimal(netPct).div(100));
        if (commission.lte(0)) continue;

        const agentWallet = await tx.wallet.findUnique({ where: { userId: agentId } });
        if (!agentWallet) continue;

        let agentDelta: Prisma.Decimal;
        if (requestType === WalletRequestType.DEPOSIT) {
          agentDelta = commission;
        } else {
          const debit = commission.negated();
          agentDelta = agentWallet.balance.plus(debit).gte(0)
            ? debit
            : agentWallet.balance.negated();
        }

        const awb = pickBucketState(agentWallet);
        let nextAgent;
        if (agentDelta.gt(0)) {
          nextAgent = this.buckets.creditLockedDeposit(awb, agentDelta);
        } else {
          const take = agentDelta.abs();
          this.buckets.assertSufficientTotal(awb, take);
          nextAgent = this.buckets.applyWithdraw(awb, take);
        }
        const { balance: newAgentBal } = await this.buckets.persist(
          tx,
          agentWallet.id,
          nextAgent,
        );
        await tx.ledgerEntry.create({
          data: {
            userId: agentId,
            platformId,
            type: LedgerEntryType.ADJUSTMENT,
            amount: agentDelta,
            balanceAfter: newAgentBal,
            reference: `agent_commission:${refType}:wr:${walletRequestId}:lv${i}`,
            metaJson: {
              agentCommission: true,
              source: refType,
              memberId,
              memberAmount: amount.toFixed(2),
              effectiveRate: myEff,
              netRate: netPct,
              chainLevel: i,
              commission: agentDelta.toFixed(2),
            },
          },
        });
      }
    } catch {
      // 커미션 실패는 본 거래를 롤백하지 않음 (silent)
    }
  }

  /**
   * 유저부터 위로 올라가며 MASTER_AGENT id 목록 반환
   * [직속부모, 그 위, 최상위] 순서
   */
  private async buildAgentChain(
    tx: Prisma.TransactionClient,
    platformId: string,
    memberId: string,
  ): Promise<string[]> {
    const chain: string[] = [];
    const member = await tx.user.findUnique({ where: { id: memberId }, select: { parentUserId: true } });
    if (!member?.parentUserId) return chain;
    let cur: string | null = member.parentUserId;
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const row: { role: UserRole; parentUserId: string | null } | null =
        await tx.user.findFirst({ where: { id: cur, platformId }, select: { role: true, parentUserId: true } });
      if (!row) break;
      if (row.role === UserRole.MASTER_AGENT) chain.push(cur);
      cur = row.parentUserId;
    }
    return chain;
  }

  /**
   * 플랫폼 내 모든 MASTER_AGENT 실효 요율 맵 반환
   */
  private async buildEffectiveRateMap(
    tx: Prisma.TransactionClient,
    platformId: string,
  ): Promise<Map<string, number>> {
    const agents = await tx.user.findMany({
      where: { platformId, role: UserRole.MASTER_AGENT },
      select: { id: true, parentUserId: true, role: true, agentPlatformSharePct: true, agentSplitFromParentPct: true },
    });
    const roleById = new Map<string, UserRole>(agents.map((a) => [a.id, a.role]));
    const parentById = new Map<string, string | null>(agents.map((a) => [a.id, a.parentUserId]));
    const nodes = agents.map((a) => ({
      id: a.id,
      parentUserId: a.parentUserId,
      agentPlatformSharePct: a.agentPlatformSharePct != null ? Number(a.agentPlatformSharePct) : null,
      agentSplitFromParentPct: a.agentSplitFromParentPct != null ? Number(a.agentSplitFromParentPct) : null,
    }));
    return computeEffectiveAgentShares(nodes, roleById, (uid) => parentById.get(uid) ?? null);
  }
}

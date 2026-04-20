import { randomUUID } from 'crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LedgerEntryType,
  PointLedgerEntryType,
  Prisma,
  RegistrationStatus,
  UserRole,
  WalletBucket,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  pickBucketState,
  totalFromBuckets,
  WalletBucketsService,
} from '../wallet-buckets/wallet-buckets.service';

function kstYmd(d: Date): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return f.format(d);
}

function readRules(json: unknown): Record<string, unknown> {
  return json && typeof json === 'object' && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : {};
}

function decimalFromUnknown(value: unknown): Prisma.Decimal | null {
  if (value === undefined || value === null || value === '') return null;
  try {
    return new Prisma.Decimal(String(value));
  } catch {
    return null;
  }
}

function numberFromUnknown(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function readDepositPointTiers(
  json: unknown,
): Array<{ minAmount: Prisma.Decimal; points: Prisma.Decimal }> {
  if (!Array.isArray(json)) return [];
  return json
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const item = row as Record<string, unknown>;
      const minAmount = decimalFromUnknown(item.minAmount);
      const points = decimalFromUnknown(item.points);
      if (!minAmount || !points) return null;
      if (minAmount.lt(0) || points.lte(0)) return null;
      return { minAmount, points };
    })
    .filter((row): row is { minAmount: Prisma.Decimal; points: Prisma.Decimal } =>
      Boolean(row),
    );
}

@Injectable()
export class PointsService {
  constructor(
    private prisma: PrismaService,
    private buckets: WalletBucketsService,
  ) {}

  async attend(userId: string, platformId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet || wallet.platformId !== platformId) {
      throw new BadRequestException('지갑을 찾을 수 없습니다');
    }

    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: { pointRulesJson: true },
    });
    const rules = readRules(platform?.pointRulesJson);
    const attendMode = rules.attendMode === 'batch' ? 'batch' : 'instant';
    const daily = numberFromUnknown(rules.attendDailyPoints);
    const batchCount =
      numberFromUnknown(rules.attendBatchCount) ||
      numberFromUnknown(rules.attendStreakDays);
    const batchPoints =
      numberFromUnknown(rules.attendBatchPoints) ||
      numberFromUnknown(rules.attendStreakBonusPoints);

    if (attendMode === 'batch') {
      if (batchCount <= 0 || batchPoints <= 0) {
        throw new BadRequestException('출석 일괄 수령 규칙이 설정되어 있지 않습니다');
      }
    } else if (daily <= 0) {
      throw new BadRequestException('출석 포인트가 설정되어 있지 않습니다');
    }

    const today = kstYmd(new Date());
    const dup = await this.prisma.pointLedgerEntry.findFirst({
      where: {
        userId,
        type: PointLedgerEntryType.ATTENDANCE,
        createdAt: {
          gte: new Date(`${today}T00:00:00+09:00`),
          lt: new Date(`${today}T23:59:59.999+09:00`),
        },
      },
    });
    if (dup) {
      throw new BadRequestException('오늘은 이미 출석했습니다');
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ymdY = kstYmd(yesterday);
    const hadYesterday = await this.prisma.pointLedgerEntry.findFirst({
      where: {
        userId,
        type: {
          in: [
            PointLedgerEntryType.ATTENDANCE,
            PointLedgerEntryType.ATTENDANCE_STREAK,
          ],
        },
        createdAt: {
          gte: new Date(`${ymdY}T00:00:00+09:00`),
          lt: new Date(`${ymdY}T23:59:59.999+09:00`),
        },
      },
    });

    let streakCount = 0;
    if (hadYesterday) {
      const recent = await this.prisma.pointLedgerEntry.findMany({
        where: {
          userId,
          type: PointLedgerEntryType.ATTENDANCE,
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: { createdAt: true },
      });
      let expect = today;
      for (const row of recent) {
        const y = kstYmd(row.createdAt);
        if (y === expect) {
          streakCount += 1;
          const d = new Date(row.createdAt);
          d.setDate(d.getDate() - 1);
          expect = kstYmd(d);
        } else break;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.findUnique({ where: { userId } });
      if (!w) throw new BadRequestException('지갑을 찾을 수 없습니다');
      let bal = w.pointBalance;
      const addDaily =
        attendMode === 'batch'
          ? new Prisma.Decimal(0)
          : new Prisma.Decimal(daily);
      if (addDaily.gt(0)) {
        bal = bal.plus(addDaily);
      }
      await tx.pointLedgerEntry.create({
        data: {
          userId,
          platformId,
          type: PointLedgerEntryType.ATTENDANCE,
          amount: addDaily,
          balanceAfter: bal,
          reference: `attend:${today}`,
          metaJson: {},
        },
      });

      let extra = new Prisma.Decimal(0);
      if (batchCount > 0 && batchPoints > 0 && (streakCount + 1) % batchCount === 0) {
        extra = new Prisma.Decimal(batchPoints);
        bal = bal.plus(extra);
        await tx.pointLedgerEntry.create({
          data: {
            userId,
            platformId,
            type: PointLedgerEntryType.ATTENDANCE_STREAK,
            amount: extra,
            balanceAfter: bal,
            reference:
              attendMode === 'batch'
                ? `attend-batch:${batchCount}d`
                : `streak:${batchCount}d`,
            metaJson: { streakDays: batchCount, attendMode },
          },
        });
      }

      await tx.wallet.update({
        where: { userId },
        data: { pointBalance: bal },
      });

      return {
        ok: true,
        pointBalance: bal.toFixed(2),
        grantedDaily: addDaily.toFixed(2),
        grantedStreak: extra.gt(0) ? extra.toFixed(2) : null,
      };
    });
  }

  async redeem(
    userId: string,
    platformId: string,
    points: number,
    currency: 'KRW' | 'USDT',
    requestId?: string | null,
  ) {
    if (!Number.isFinite(points) || points <= 0) {
      throw new BadRequestException('포인트를 입력하세요');
    }
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        id: true,
        minPointRedeemPoints: true,
        minPointRedeemKrw: true,
        minPointRedeemUsdt: true,
        pointRulesJson: true,
        flagsJson: true,
      },
    });
    if (!platform) throw new BadRequestException('플랫폼 오류');

    const flags = readRules(platform.flagsJson);
    void flags.pointRedeemRollingEnabled;
    void flags.compSettlementRollingEnabled;

    const minPts = platform.minPointRedeemPoints;
    if (minPts != null && points < minPts) {
      throw new BadRequestException(
        `최소 ${minPts} 포인트부터 교환할 수 있습니다`,
      );
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet || wallet.platformId !== platformId) {
      throw new BadRequestException('지갑을 찾을 수 없습니다');
    }

    const decPts = new Prisma.Decimal(points);
    if (wallet.pointBalance.lt(decPts)) {
      throw new BadRequestException('포인트가 부족합니다');
    }

    const rules = readRules(platform.pointRulesJson);
    const rateKey =
      currency === 'KRW' ? 'redeemKrwPerPoint' : 'redeemUsdtPerPoint';
    const rateRaw = rules[rateKey];
    if (rateRaw === undefined || rateRaw === null) {
      throw new BadRequestException(
        '포인트→머니 교환 비율이 설정되지 않았습니다',
      );
    }
    const rate = new Prisma.Decimal(String(rateRaw));
    if (!rate.gt(0)) {
      throw new BadRequestException('유효하지 않은 교환 비율입니다');
    }
    const credit = decPts.times(rate);
    const minMoney =
      currency === 'KRW'
        ? platform.minPointRedeemKrw
        : platform.minPointRedeemUsdt;
    if (minMoney != null && credit.lt(minMoney)) {
      throw new BadRequestException('최소 교환 금액 미달입니다');
    }

    const trimmedReq = requestId?.trim();
    const eventKey = trimmedReq
      ? `point-redeem:${platformId}:${userId}:${trimmedReq}`.slice(0, 160)
      : `point-redeem:${platformId}:${userId}:${randomUUID()}`.slice(0, 160);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.pointRedeemLog.findUnique({
        where: { eventKey },
      });
      if (existing) {
        const w = await tx.wallet.findUnique({ where: { userId } });
        if (!w) throw new BadRequestException('지갑을 찾을 수 없습니다');
        const rollingN = await tx.rollingObligation.count({
          where: { userId, satisfiedAt: null },
        });
        const rollingBlocked = rollingN > 0;
        return {
          success: true,
          ok: true,
          idempotent: true,
          pointBalance: w.pointBalance.toFixed(2),
          wallet: this.buckets.walletApiShape(w, rollingBlocked),
          credited: existing.redeemAmount.toFixed(2),
        };
      }

      const w = await tx.wallet.findUnique({ where: { userId } });
      if (!w) throw new BadRequestException('지갑을 찾을 수 없습니다');
      if (w.pointBalance.lt(decPts)) {
        throw new BadRequestException('포인트가 부족합니다');
      }

      const newPoints = w.pointBalance.minus(decPts);
      const wb = pickBucketState(w);
      const balanceBefore = totalFromBuckets(wb);
      const pointFreeBefore = w.pointFree;
      const pointFreeAfter = w.pointFree.plus(credit);
      const nextBuckets = { ...wb, pointFree: pointFreeAfter };
      const balanceAfter = totalFromBuckets(nextBuckets);

      await tx.wallet.update({
        where: { userId },
        data: {
          pointBalance: newPoints,
          pointFree: pointFreeAfter,
          lockedDeposit: nextBuckets.lockedDeposit,
          lockedWin: nextBuckets.lockedWin,
          compFree: nextBuckets.compFree,
          balance: balanceAfter,
        },
      });

      await tx.pointRedeemLog.create({
        data: {
          platformId,
          userId,
          redeemAmount: credit,
          pointsRedeemed: decPts,
          pointBefore: w.pointBalance,
          pointAfter: newPoints,
          pointFreeBefore,
          pointFreeAfter,
          currency,
          eventKey,
        },
      });

      await tx.pointLedgerEntry.create({
        data: {
          userId,
          platformId,
          type: PointLedgerEntryType.REDEEM,
          amount: decPts.negated(),
          balanceAfter: newPoints,
          reference: `redeem:${currency}`,
          metaJson: {
            currency,
            credit: credit.toFixed(8),
            pointFreeCredit: true,
            eventKey,
          },
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          platformId,
          type: LedgerEntryType.ADJUSTMENT,
          amount: credit,
          balanceAfter,
          reference: `point-redeem:${currency}`,
          metaJson: {
            pointRedeemPointFree: true,
            points,
            eventKey,
          },
        },
      });
      await this.buckets.recordWalletTx(tx, {
        platformId,
        userId,
        transactionType: WalletTransactionType.POINT_REDEEM,
        targetBucket: WalletBucket.POINT_FREE,
        amount: credit,
        balanceBefore,
        balanceAfter,
        eventKey,
        metadata: { points: String(points), currency },
      });

      const rollingN = await tx.rollingObligation.count({
        where: { userId, satisfiedAt: null },
      });
      const rollingBlocked = rollingN > 0;
      const w2 = await tx.wallet.findUnique({ where: { userId } });
      if (!w2) throw new BadRequestException('지갑을 찾을 수 없습니다');

      return {
        success: true,
        ok: true,
        idempotent: false,
        pointBalance: newPoints.toFixed(2),
        wallet: this.buckets.walletApiShape(w2, rollingBlocked),
        credited: credit.toFixed(2),
        balance: balanceAfter.toFixed(2),
      };
    });
  }

  async maybeCreditLoseBet(
    tx: Prisma.TransactionClient,
    userId: string,
    platformId: string,
    stake: Prisma.Decimal,
    didWin: boolean,
  ) {
    if (didWin || stake.lte(0)) return;
    const platform = await tx.platform.findUnique({
      where: { id: platformId },
      select: { pointRulesJson: true },
    });
    const rules = readRules(platform?.pointRulesJson);
    const per = rules.loseBetPointsPerStake;
    if (per === undefined || per === null) return;
    const rate = new Prisma.Decimal(String(per));
    if (!rate.gt(0)) return;
    const pts = stake.times(rate);
    if (pts.lte(0)) return;
    const w = await tx.wallet.findUnique({ where: { userId } });
    if (!w) return;
    const bal = w.pointBalance.plus(pts);
    await tx.pointLedgerEntry.create({
      data: {
        userId,
        platformId,
        type: PointLedgerEntryType.LOSE_BET,
        amount: pts,
        balanceAfter: bal,
        reference: 'lose-bet',
        metaJson: { stake: stake.toFixed(2) },
      },
    });
    await tx.wallet.update({
      where: { userId },
      data: { pointBalance: bal },
    });
  }

  async maybeCreditReferrerFirstBet(
    tx: Prisma.TransactionClient,
    userId: string,
    platformId: string,
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        referredByUserId: true,
        parentUserId: true,
        role: true,
        referredBy: { select: { role: true, id: true } },
        parent: { select: { role: true, id: true } },
      },
    });
    if (!user || user.role !== UserRole.USER) return;
    const referrerId = user.referredByUserId ?? user.parentUserId;
    const referrerRole = user.referredBy?.role ?? user.parent?.role;
    if (
      !referrerId ||
      (referrerRole !== UserRole.MASTER_AGENT && referrerRole !== UserRole.USER)
    ) {
      return;
    }

    const priorParent = await tx.pointLedgerEntry.findMany({
      where: {
        userId: referrerId,
        type: PointLedgerEntryType.REFERRAL_FIRST_BET,
      },
      select: { metaJson: true },
    });
    const already = priorParent.some(
      (p) =>
        (p.metaJson as { referredUserId?: string })?.referredUserId === userId,
    );
    if (already) return;

    const betCount = await tx.ledgerEntry.count({
      where: { userId, type: LedgerEntryType.BET },
    });
    if (betCount !== 1) return;

    const platform = await tx.platform.findUnique({
      where: { id: platformId },
      select: { pointRulesJson: true },
    });
    const rules = readRules(platform?.pointRulesJson);
    const flat = rules.referrerFirstBetFlat;
    const pct = rules.referrerFirstBetPct;
    let pts = new Prisma.Decimal(0);
    if (flat !== undefined && flat !== null) {
      pts = pts.plus(new Prisma.Decimal(String(flat)));
    }
    if (pct !== undefined && pct !== null) {
      const lastBet = await tx.ledgerEntry.findFirst({
        where: { userId, type: LedgerEntryType.BET },
        orderBy: { createdAt: 'desc' },
        select: { amount: true },
      });
      if (lastBet) {
        const stake = lastBet.amount.abs();
        pts = pts.plus(stake.times(new Prisma.Decimal(String(pct))).div(100));
      }
    }
    if (pts.lte(0)) return;

    const w = await tx.wallet.findUnique({ where: { userId: referrerId } });
    if (!w) return;
    const bal = w.pointBalance.plus(pts);
    await tx.pointLedgerEntry.create({
      data: {
        userId: referrerId,
        platformId,
        type: PointLedgerEntryType.REFERRAL_FIRST_BET,
        amount: pts,
        balanceAfter: bal,
        reference: `from:${userId}`,
        metaJson: { referredUserId: userId },
      },
    });
    await tx.wallet.update({
      where: { userId: referrerId },
      data: { pointBalance: bal },
    });
  }

  async maybeCreditDepositPoints(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      platformId: string;
      depositAmount: Prisma.Decimal;
      ledgerRefPrefix: string;
    },
  ) {
    const { userId, platformId, depositAmount, ledgerRefPrefix } = params;
    if (depositAmount.lte(0)) return;

    const platform = await tx.platform.findUnique({
      where: { id: platformId },
      select: { pointRulesJson: true },
    });
    const rules = readRules(platform?.pointRulesJson);

    const firstChargePoints = decimalFromUnknown(rules.firstChargePoints);
    if (firstChargePoints && firstChargePoints.gt(0)) {
      const existingFirstCharge = await tx.pointLedgerEntry.findFirst({
        where: {
          userId,
          type: PointLedgerEntryType.ADJUSTMENT,
          reference: 'deposit-point:first-charge',
        },
        select: { id: true },
      });
      if (!existingFirstCharge) {
        await this.creditPoints(tx, {
          userId,
          platformId,
          amount: firstChargePoints,
          type: PointLedgerEntryType.ADJUSTMENT,
          reference: 'deposit-point:first-charge',
          metaJson: {
            depositPoint: true,
            trigger: 'FIRST_CHARGE',
            depositAmount: depositAmount.toFixed(2),
            ledgerRefPrefix,
          },
        });
      }
    }

    const tiers = readDepositPointTiers(rules.depositPointTiers).sort((a, b) =>
      a.minAmount.comparedTo(b.minAmount),
    );
    let matchedTier: { minAmount: Prisma.Decimal; points: Prisma.Decimal } | null =
      null;
    for (const tier of tiers) {
      if (depositAmount.gte(tier.minAmount)) {
        matchedTier = tier;
      }
    }
    if (!matchedTier) return;

    await this.creditPoints(tx, {
      userId,
      platformId,
      amount: matchedTier.points,
      type: PointLedgerEntryType.ADJUSTMENT,
      reference: `deposit-point:tier:${matchedTier.minAmount.toFixed(2)}`,
      metaJson: {
        depositPoint: true,
        trigger: 'DEPOSIT_TIER',
        minAmount: matchedTier.minAmount.toFixed(2),
        depositAmount: depositAmount.toFixed(2),
        ledgerRefPrefix,
      },
    });
  }

  async grantAllForPlatform(
    platformId: string,
    amount: number,
    note?: string,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('지급할 포인트를 확인해주세요');
    }

    const pts = new Prisma.Decimal(amount);
    const targets = await this.prisma.wallet.findMany({
      where: {
        platformId,
        user: {
          role: UserRole.USER,
          registrationStatus: RegistrationStatus.APPROVED,
        },
      },
      select: {
        id: true,
        userId: true,
        pointBalance: true,
      },
    });

    if (targets.length === 0) {
      return { ok: true, count: 0, amount: pts.toFixed(2) };
    }

    const issuedAt = new Date().toISOString();

    await this.prisma.$transaction(async (tx) => {
      for (const wallet of targets) {
        const newBalance = wallet.pointBalance.plus(pts);
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { pointBalance: newBalance },
        });
        await tx.pointLedgerEntry.create({
          data: {
            userId: wallet.userId,
            platformId,
            type: PointLedgerEntryType.ADJUSTMENT,
            amount: pts,
            balanceAfter: newBalance,
            reference: `platform-point-grant:${issuedAt}`,
            metaJson: {
              bulkGrant: true,
              note: note?.trim() || null,
            },
          },
        });
      }
    });

    return {
      ok: true,
      count: targets.length,
      amount: pts.toFixed(2),
    };
  }

  private async creditPoints(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      platformId: string;
      amount: Prisma.Decimal;
      type: PointLedgerEntryType;
      reference: string;
      metaJson?: Record<string, unknown>;
    },
  ) {
    const wallet = await tx.wallet.findUnique({ where: { userId: params.userId } });
    if (!wallet) return;
    const nextBalance = wallet.pointBalance.plus(params.amount);
    await tx.pointLedgerEntry.create({
      data: {
        userId: params.userId,
        platformId: params.platformId,
        type: params.type,
        amount: params.amount,
        balanceAfter: nextBalance,
        reference: params.reference,
        metaJson: (params.metaJson ?? {}) as Prisma.InputJsonValue,
      },
    });
    await tx.wallet.update({
      where: { userId: params.userId },
      data: { pointBalance: nextBalance },
    });
  }

  listLedger(userId: string, take = 50) {
    return this.prisma.pointLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}

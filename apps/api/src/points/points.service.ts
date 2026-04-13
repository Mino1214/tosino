import { BadRequestException, Injectable } from '@nestjs/common';
import {
  LedgerEntryType,
  PointLedgerEntryType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

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
    const daily = Number(rules.attendDailyPoints ?? 0);
    const streakDays = Number(rules.attendStreakDays ?? 0);
    const streakBonus = Number(rules.attendStreakBonusPoints ?? 0);

    if (!Number.isFinite(daily) || daily <= 0) {
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
      const addDaily = new Prisma.Decimal(daily);
      bal = bal.plus(addDaily);
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
      if (
        streakDays > 0 &&
        streakBonus > 0 &&
        (streakCount + 1) % streakDays === 0
      ) {
        extra = new Prisma.Decimal(streakBonus);
        bal = bal.plus(extra);
        await tx.pointLedgerEntry.create({
          data: {
            userId,
            platformId,
            type: PointLedgerEntryType.ATTENDANCE_STREAK,
            amount: extra,
            balanceAfter: bal,
            reference: `streak:${streakDays}d`,
            metaJson: { streakDays },
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
  ) {
    if (!Number.isFinite(points) || points <= 0) {
      throw new BadRequestException('포인트를 입력하세요');
    }
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
    });
    if (!platform) throw new BadRequestException('플랫폼 오류');

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

    return this.prisma.$transaction(async (tx) => {
      const w = await tx.wallet.findUnique({ where: { userId } });
      if (!w) throw new BadRequestException('지갑을 찾을 수 없습니다');
      const newPoints = w.pointBalance.minus(decPts);
      const newBal = w.balance.plus(credit);

      await tx.wallet.update({
        where: { userId },
        data: { pointBalance: newPoints, balance: newBal },
      });
      await tx.pointLedgerEntry.create({
        data: {
          userId,
          platformId,
          type: PointLedgerEntryType.REDEEM,
          amount: decPts.negated(),
          balanceAfter: newPoints,
          reference: `redeem:${currency}`,
          metaJson: { currency, credit: credit.toFixed(8) },
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          platformId,
          type: LedgerEntryType.ADJUSTMENT,
          amount: credit,
          balanceAfter: newBal,
          reference: `point-redeem:${currency}`,
          metaJson: { pointRedeem: true, points },
        },
      });
      return {
        ok: true,
        pointBalance: newPoints.toFixed(2),
        balance: newBal.toFixed(2),
        credited: credit.toFixed(2),
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

  listLedger(userId: string, take = 50) {
    return this.prisma.pointLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}

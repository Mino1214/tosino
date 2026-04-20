import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, WalletBucket, WalletTransactionType } from '@prisma/client';
import type { Prisma as PrismaNs } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type WalletBucketState = {
  lockedDeposit: Prisma.Decimal;
  lockedWin: Prisma.Decimal;
  compFree: Prisma.Decimal;
  pointFree: Prisma.Decimal;
};

export function pickBucketState(w: {
  lockedDeposit: Prisma.Decimal;
  lockedWin: Prisma.Decimal;
  compFree: Prisma.Decimal;
  pointFree: Prisma.Decimal;
}): WalletBucketState {
  return {
    lockedDeposit: w.lockedDeposit,
    lockedWin: w.lockedWin,
    compFree: w.compFree,
    pointFree: w.pointFree,
  };
}

export function totalFromBuckets(b: WalletBucketState): Prisma.Decimal {
  return b.lockedDeposit
    .plus(b.lockedWin)
    .plus(b.compFree)
    .plus(b.pointFree);
}

@Injectable()
export class WalletBucketsService {
  constructor(private readonly prisma: PrismaService) {}

  total(w: WalletBucketState): Prisma.Decimal {
    return totalFromBuckets(w);
  }

  /**
   * 출금 가능액(표시용). 롤링 미충족 시 locked 계열 제외 — comp/point 무료 풀만.
   * 롤링 충족 시 전 버킷 합계가 출금 신청 가능(기존 assertWithdrawalAllowed 와 함께).
   */
  withdrawableDisplay(
    w: WalletBucketState,
    rollingBlocked: boolean,
  ): Prisma.Decimal {
    const free = w.compFree.plus(w.pointFree);
    if (rollingBlocked) return free;
    return totalFromBuckets(w);
  }

  async hasOpenRollingTx(
    tx: PrismaNs.TransactionClient,
    userId: string,
  ): Promise<boolean> {
    const n = await tx.rollingObligation.count({
      where: { userId, satisfiedAt: null },
    });
    return n > 0;
  }

  assertSufficientTotal(w: WalletBucketState, need: Prisma.Decimal): void {
    if (need.lte(0)) return;
    if (totalFromBuckets(w).lt(need)) {
      throw new BadRequestException('Insufficient balance');
    }
  }

  /**
   * 베팅 스테이크 차감: pointFree → compFree → lockedDeposit → lockedWin
   */
  deductStake(w: WalletBucketState, stake: Prisma.Decimal): WalletBucketState {
    if (stake.lte(0)) return { ...w };
    let { lockedDeposit, lockedWin, compFree, pointFree } = w;
    let rem = stake;
    const take = (avail: Prisma.Decimal): Prisma.Decimal => {
      const use = Prisma.Decimal.min(avail, rem);
      rem = rem.minus(use);
      return avail.minus(use);
    };
    pointFree = take(pointFree);
    if (rem.lte(0)) return { lockedDeposit, lockedWin, compFree, pointFree };
    compFree = take(compFree);
    if (rem.lte(0)) return { lockedDeposit, lockedWin, compFree, pointFree };
    lockedDeposit = take(lockedDeposit);
    if (rem.lte(0)) return { lockedDeposit, lockedWin, compFree, pointFree };
    lockedWin = take(lockedWin);
    if (rem.gt(0)) {
      throw new BadRequestException('Insufficient balance');
    }
    return { lockedDeposit, lockedWin, compFree, pointFree };
  }

  /**
   * 당첨 가산: 미충족 롤링 있으면 lockedWin, 없으면 lockedDeposit
   */
  creditWin(
    b: WalletBucketState,
    win: Prisma.Decimal,
    openRolling: boolean,
  ): WalletBucketState {
    if (win.lte(0)) return { ...b };
    if (openRolling) {
      return { ...b, lockedWin: b.lockedWin.plus(win) };
    }
    return { ...b, lockedDeposit: b.lockedDeposit.plus(win) };
  }

  /** bet + win 한 번에 (카지노 bet-win 콜백) */
  applyBetAndWin(
    w: WalletBucketState,
    bet: Prisma.Decimal,
    win: Prisma.Decimal,
    openRolling: boolean,
  ): WalletBucketState {
    const afterBet = this.deductStake(w, bet);
    return this.creditWin(afterBet, win, openRolling);
  }

  /** 입금/보너스 — 롤링 대상 기본 풀 */
  creditLockedDeposit(
    w: WalletBucketState,
    amt: Prisma.Decimal,
  ): WalletBucketState {
    if (amt.lte(0)) return { ...w };
    return { ...w, lockedDeposit: w.lockedDeposit.plus(amt) };
  }

  /**
   * 환불·베팅 취소 등: 복구분을 lockedDeposit 으로 귀속 (단순·안전)
   */
  refundToLockedDeposit(
    w: WalletBucketState,
    amt: Prisma.Decimal,
  ): WalletBucketState {
    if (amt.lte(0)) return { ...w };
    return { ...w, lockedDeposit: w.lockedDeposit.plus(amt) };
  }

  /** 취소/롤백: 양수면 예치금 복구, 음수면 잔액 차감(베팅 소비 순서) */
  applyCancelOrRefundDelta(
    w: WalletBucketState,
    delta: Prisma.Decimal,
  ): WalletBucketState {
    if (delta.gt(0)) return this.refundToLockedDeposit(w, delta);
    if (delta.lt(0)) return this.deductStake(w, delta.abs());
    return { ...w };
  }

  applySportsBetChangeDelta(
    w: WalletBucketState,
    delta: Prisma.Decimal,
  ): WalletBucketState {
    if (delta.gt(0)) return this.deductStake(w, delta);
    if (delta.lt(0)) return this.refundToLockedDeposit(w, delta.abs());
    return { ...w };
  }

  /**
   * 잔액 증감(스포츠 적중 정산 등): 양수면 당첨 처리, 음수면 스테이크 차감과 동일 효과
   */
  applySignedPayout(
    w: WalletBucketState,
    payout: Prisma.Decimal,
    openRolling: boolean,
  ): WalletBucketState {
    if (payout.gt(0)) return this.creditWin(w, payout, openRolling);
    if (payout.lt(0)) return this.deductStake(w, payout.abs());
    return { ...w };
  }

  /**
   * 출금 승인 시 차감: pointFree → compFree → lockedDeposit → lockedWin
   */
  applyWithdraw(
    w: WalletBucketState,
    amt: Prisma.Decimal,
  ): WalletBucketState {
    return this.deductStake(w, amt);
  }

  async persist(
    tx: PrismaNs.TransactionClient,
    walletId: string,
    next: WalletBucketState,
  ): Promise<{ balance: Prisma.Decimal }> {
    const balance = totalFromBuckets(next);
    await tx.wallet.update({
      where: { id: walletId },
      data: {
        lockedDeposit: next.lockedDeposit,
        lockedWin: next.lockedWin,
        compFree: next.compFree,
        pointFree: next.pointFree,
        balance,
      },
    });
    return { balance };
  }

  walletApiShape(
    w: WalletBucketState & { pointBalance: Prisma.Decimal },
    rollingBlocked: boolean,
  ) {
    const b = pickBucketState(w);
    const totalBalance = totalFromBuckets(b);
    return {
      lockedDeposit: b.lockedDeposit.toFixed(2),
      lockedWin: b.lockedWin.toFixed(2),
      compFree: b.compFree.toFixed(2),
      pointFree: b.pointFree.toFixed(2),
      totalBalance: totalBalance.toFixed(2),
      withdrawableBalance: this.withdrawableDisplay(b, rollingBlocked).toFixed(2),
      pointBalance: w.pointBalance.toFixed(2),
    };
  }

  async recordWalletTx(
    tx: PrismaNs.TransactionClient,
    params: {
      platformId: string;
      userId: string;
      transactionType: WalletTransactionType;
      sourceBucket?: WalletBucket | null;
      targetBucket?: WalletBucket | null;
      amount: Prisma.Decimal;
      balanceBefore: Prisma.Decimal;
      balanceAfter: Prisma.Decimal;
      metadata?: Record<string, unknown>;
      eventKey?: string | null;
    },
  ): Promise<void> {
    await tx.walletTransaction.create({
      data: {
        platformId: params.platformId,
        userId: params.userId,
        transactionType: params.transactionType,
        sourceBucket: params.sourceBucket ?? undefined,
        targetBucket: params.targetBucket ?? undefined,
        amount: params.amount,
        balanceBefore: params.balanceBefore,
        balanceAfter: params.balanceAfter,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        eventKey: params.eventKey?.slice(0, 160) ?? undefined,
      },
    });
  }
}

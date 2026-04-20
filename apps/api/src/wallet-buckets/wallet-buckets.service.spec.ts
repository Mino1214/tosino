import { Prisma } from '@prisma/client';
import {
  totalFromBuckets,
  WalletBucketsService,
} from './wallet-buckets.service';

function D(s: string) {
  return new Prisma.Decimal(s);
}

describe('WalletBucketsService bucket math', () => {
  const svc = new WalletBucketsService({} as never);

  it('totalFromBuckets sums four buckets', () => {
    expect(
      totalFromBuckets({
        lockedDeposit: D('1000'),
        lockedWin: D('200'),
        compFree: D('50'),
        pointFree: D('25'),
      }).toFixed(2),
    ).toBe('1275.00');
  });

  it('deductStake consumes pointFree then compFree then lockedDeposit then lockedWin', () => {
    const w = {
      lockedDeposit: D('100'),
      lockedWin: D('100'),
      compFree: D('30'),
      pointFree: D('20'),
    };
    const a = svc.deductStake(w, D('40'));
    expect(a.pointFree.toFixed(2)).toBe('0.00');
    expect(a.compFree.toFixed(2)).toBe('10.00');
    expect(a.lockedDeposit.toFixed(2)).toBe('100.00');
    const b = svc.deductStake(
      {
        lockedDeposit: D('100'),
        lockedWin: D('100'),
        compFree: D('10'),
        pointFree: D('0'),
      },
      D('150'),
    );
    expect(b.compFree.toFixed(2)).toBe('0.00');
    expect(b.lockedDeposit.toFixed(2)).toBe('0.00');
    expect(b.lockedWin.toFixed(2)).toBe('60.00');
  });

  it('creditWin adds to lockedWin when rolling open, else lockedDeposit', () => {
    const w = {
      lockedDeposit: D('100'),
      lockedWin: D('10'),
      compFree: D('0'),
      pointFree: D('0'),
    };
    const x = svc.creditWin(w, D('50'), true);
    expect(x.lockedWin.toFixed(2)).toBe('60.00');
    const y = svc.creditWin(w, D('50'), false);
    expect(y.lockedDeposit.toFixed(2)).toBe('150.00');
  });

  it('withdrawableDisplay excludes locked buckets while rolling blocked', () => {
    const w = {
      lockedDeposit: D('1000'),
      lockedWin: D('100'),
      compFree: D('40'),
      pointFree: D('30'),
    };
    expect(svc.withdrawableDisplay(w, true).toFixed(2)).toBe('70.00');
    expect(svc.withdrawableDisplay(w, false).toFixed(2)).toBe('1170.00');
  });
});

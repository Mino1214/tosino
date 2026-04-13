import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RollingObligationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 입금(본금·보너스 각각) 승인 직후: 플랫폼 롤링 잠금 + 회원 rollingEnabled 일 때만 의무 행 생성.
   */
  async createObligationIfNeeded(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      platformId: string;
      depositAmount: Prisma.Decimal;
      sourceRef: string;
    },
  ): Promise<void> {
    const { userId, platformId, depositAmount, sourceRef } = params;
    if (depositAmount.lte(0)) return;

    const [platform, user] = await Promise.all([
      tx.platform.findUnique({
        where: { id: platformId },
        select: {
          rollingLockWithdrawals: true,
          rollingTurnoverMultiplier: true,
        },
      }),
      tx.user.findUnique({
        where: { id: userId },
        select: { rollingEnabled: true, role: true },
      }),
    ]);

    if (
      !platform?.rollingLockWithdrawals ||
      user?.role !== UserRole.USER ||
      !user?.rollingEnabled
    ) {
      return;
    }

    const mult =
      platform.rollingTurnoverMultiplier ?? new Prisma.Decimal(1);
    const required = depositAmount.times(mult);
    if (required.lte(0)) return;

    await tx.rollingObligation.create({
      data: {
        platformId,
        userId,
        sourceRef: sourceRef.slice(0, 160),
        principalAmount: depositAmount,
        requiredTurnover: required,
        appliedTurnover: new Prisma.Decimal(0),
      },
    });
  }

  /** 베팅 스테이크를 미충족 롤링 의무에 FIFO로 반영 */
  async applyBetStake(
    tx: Prisma.TransactionClient,
    userId: string,
    stake: Prisma.Decimal,
  ): Promise<void> {
    let remaining = stake;
    if (remaining.lte(0)) return;

    const open = await tx.rollingObligation.findMany({
      where: { userId, satisfiedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    for (const ob of open) {
      if (remaining.lte(0)) break;
      const need = ob.requiredTurnover.minus(ob.appliedTurnover);
      if (need.lte(0)) {
        await tx.rollingObligation.update({
          where: { id: ob.id },
          data: { satisfiedAt: new Date() },
        });
        continue;
      }
      const apply = remaining.lt(need) ? remaining : need;
      const newApplied = ob.appliedTurnover.plus(apply);
      const done = newApplied.gte(ob.requiredTurnover);
      await tx.rollingObligation.update({
        where: { id: ob.id },
        data: {
          appliedTurnover: done ? ob.requiredTurnover : newApplied,
          satisfiedAt: done ? new Date() : null,
        },
      });
      remaining = remaining.minus(apply);
    }
  }

  async assertWithdrawalAllowed(userId: string): Promise<void> {
    const open = await this.prisma.rollingObligation.findMany({
      where: { userId, satisfiedAt: null },
    });
    const blocked = open.some((r) => r.appliedTurnover.lt(r.requiredTurnover));
    if (blocked) {
      throw new BadRequestException(
        '롤링 조건을 충족하기 전에는 출금할 수 없습니다',
      );
    }
  }

  /** 마이페이지용 요약 */
  async getSummaryForUser(userId: string) {
    const open = await this.prisma.rollingObligation.findMany({
      where: { userId, satisfiedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    let required = new Prisma.Decimal(0);
    let applied = new Prisma.Decimal(0);
    for (const r of open) {
      required = required.plus(r.requiredTurnover);
      applied = applied.plus(r.appliedTurnover);
    }
    const remaining = required.minus(applied);
    const pct =
      required.gt(0) ? applied.div(required).times(100).toNumber() : 100;
    const clampedPct = Math.min(100, Math.max(0, Math.round(pct * 100) / 100));

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { rollingEnabled: true },
    });

    return {
      rollingEnabled: user?.rollingEnabled ?? false,
      requiredTurnover: required.toFixed(2),
      appliedTurnover: applied.toFixed(2),
      remainingTurnover: remaining.gt(0) ? remaining.toFixed(2) : '0.00',
      achievementPct: clampedPct,
      openCount: open.length,
    };
  }
}

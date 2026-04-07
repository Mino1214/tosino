import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type DbClient = Prisma.TransactionClient | PrismaService;

function dec(n: Prisma.Decimal | null | undefined): number | null {
  if (n == null) return null;
  return Number(n);
}

@Injectable()
export class RateRevisionService {
  constructor(private prisma: PrismaService) {}

  async appendRollingRevision(
    db: DbClient,
    userId: string,
    effectiveFrom: Date,
    data: {
      rollingEnabled: boolean;
      rollingSportsDomesticPct: Prisma.Decimal | null;
      rollingSportsOverseasPct: Prisma.Decimal | null;
      rollingCasinoPct: Prisma.Decimal | null;
      rollingSlotPct: Prisma.Decimal | null;
      rollingMinigamePct: Prisma.Decimal | null;
    },
  ) {
    await db.rollingRateRevision.create({
      data: {
        userId,
        effectiveFrom,
        rollingEnabled: data.rollingEnabled,
        rollingSportsDomesticPct: data.rollingSportsDomesticPct,
        rollingSportsOverseasPct: data.rollingSportsOverseasPct,
        rollingCasinoPct: data.rollingCasinoPct,
        rollingSlotPct: data.rollingSlotPct,
        rollingMinigamePct: data.rollingMinigamePct,
      },
    });
  }

  async appendAgentCommissionRevision(
    db: DbClient,
    userId: string,
    effectiveFrom: Date,
    data: {
      agentPlatformSharePct: Prisma.Decimal | null;
      agentSplitFromParentPct: Prisma.Decimal | null;
    },
  ) {
    await db.agentCommissionRevision.create({
      data: {
        userId,
        effectiveFrom,
        agentPlatformSharePct: data.agentPlatformSharePct,
        agentSplitFromParentPct: data.agentSplitFromParentPct,
      },
    });
  }

  async listRollingRevisions(userId: string, take = 50) {
    const rows = await this.prisma.rollingRateRevision.findMany({
      where: { userId },
      orderBy: { effectiveFrom: 'desc' },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      effectiveFrom: r.effectiveFrom,
      rollingEnabled: r.rollingEnabled,
      rollingSportsDomesticPct: dec(r.rollingSportsDomesticPct),
      rollingSportsOverseasPct: dec(r.rollingSportsOverseasPct),
      rollingCasinoPct: dec(r.rollingCasinoPct),
      rollingSlotPct: dec(r.rollingSlotPct),
      rollingMinigamePct: dec(r.rollingMinigamePct),
    }));
  }

  async listAgentCommissionRevisions(userId: string, take = 50) {
    const rows = await this.prisma.agentCommissionRevision.findMany({
      where: { userId },
      orderBy: { effectiveFrom: 'desc' },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      effectiveFrom: r.effectiveFrom,
      agentPlatformSharePct: dec(r.agentPlatformSharePct),
      agentSplitFromParentPct: dec(r.agentSplitFromParentPct),
    }));
  }

  /** 정산 시각 T에 적용되는 롤링 스냅샷 (이력 없으면 User 현재값) */
  async resolveRollingAt(userId: string, at: Date) {
    const rev = await this.prisma.rollingRateRevision.findFirst({
      where: { userId, effectiveFrom: { lte: at } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (rev) {
      return {
        source: 'revision' as const,
        effectiveFrom: rev.effectiveFrom,
        rollingEnabled: rev.rollingEnabled,
        rollingSportsDomesticPct: dec(rev.rollingSportsDomesticPct),
        rollingSportsOverseasPct: dec(rev.rollingSportsOverseasPct),
        rollingCasinoPct: dec(rev.rollingCasinoPct),
        rollingSlotPct: dec(rev.rollingSlotPct),
        rollingMinigamePct: dec(rev.rollingMinigamePct),
      };
    }
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        rollingEnabled: true,
        rollingSportsDomesticPct: true,
        rollingSportsOverseasPct: true,
        rollingCasinoPct: true,
        rollingSlotPct: true,
        rollingMinigamePct: true,
      },
    });
    if (!u) return null;
    return {
      source: 'user_fallback' as const,
      effectiveFrom: null,
      rollingEnabled: u.rollingEnabled,
      rollingSportsDomesticPct: dec(u.rollingSportsDomesticPct),
      rollingSportsOverseasPct: dec(u.rollingSportsOverseasPct),
      rollingCasinoPct: dec(u.rollingCasinoPct),
      rollingSlotPct: dec(u.rollingSlotPct),
      rollingMinigamePct: dec(u.rollingMinigamePct),
    };
  }

  /** 정산 시각 T에 적용되는 총판 요율 스냅샷 */
  async resolveAgentCommissionAt(userId: string, at: Date) {
    const rev = await this.prisma.agentCommissionRevision.findFirst({
      where: { userId, effectiveFrom: { lte: at } },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (rev) {
      return {
        source: 'revision' as const,
        effectiveFrom: rev.effectiveFrom,
        agentPlatformSharePct: dec(rev.agentPlatformSharePct),
        agentSplitFromParentPct: dec(rev.agentSplitFromParentPct),
      };
    }
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        agentPlatformSharePct: true,
        agentSplitFromParentPct: true,
      },
    });
    if (!u) return null;
    return {
      source: 'user_fallback' as const,
      effectiveFrom: null,
      agentPlatformSharePct: dec(u.agentPlatformSharePct),
      agentSplitFromParentPct: dec(u.agentSplitFromParentPct),
    };
  }
}

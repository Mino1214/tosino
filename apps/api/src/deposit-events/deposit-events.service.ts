import { Injectable } from '@nestjs/common';
import {
  DepositEventKind,
  LedgerEntryType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RollingObligationService } from '../rolling/rolling-obligation.service';

function toDec(v: unknown): Prisma.Decimal | null {
  if (v === undefined || v === null) return null;
  try {
    return new Prisma.Decimal(String(v));
  } catch {
    return null;
  }
}

/** tiersJson: [{ minAmount, bonusAmount }] — 입금액이 만족하는 구간 중 최고 min에 해당하는 보너스 */
function pickBonusFromTiers(
  tiersJson: unknown,
  deposit: Prisma.Decimal,
): Prisma.Decimal {
  const arr = Array.isArray(tiersJson) ? tiersJson : [];
  let bestMin = new Prisma.Decimal(-1);
  let bestBonus = new Prisma.Decimal(0);
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const min = toDec(o.minAmount);
    const bonus = toDec(o.bonusAmount);
    if (min === null || bonus === null) continue;
    if (deposit.gte(min) && min.gt(bestMin)) {
      bestMin = min;
      bestBonus = bonus;
    }
  }
  return bestBonus;
}

@Injectable()
export class DepositEventsService {
  constructor(
    private prisma: PrismaService,
    private rolling: RollingObligationService,
  ) {}

  /**
   * 입금 1건당 보너스는 하나만: 먼저 첫충(미사용 이벤트), 없으면 기간 한정.
   */
  async applyEligibleBonus(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      platformId: string;
      depositAmount: Prisma.Decimal;
      ledgerRefPrefix: string;
    },
  ): Promise<void> {
    const { userId, platformId, depositAmount, ledgerRefPrefix } = params;
    if (depositAmount.lte(0)) return;

    const now = new Date();

    const firstEvents = await tx.depositEvent.findMany({
      where: {
        platformId,
        active: true,
        kind: DepositEventKind.FIRST_CHARGE,
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const ev of firstEvents) {
      const existing = await tx.userDepositEventClaim.findUnique({
        where: {
          userId_eventId: { userId, eventId: ev.id },
        },
      });
      if (existing) continue;
      const bonus = pickBonusFromTiers(ev.tiersJson, depositAmount);
      if (bonus.lte(0)) continue;
      await this.creditBonus(tx, {
        userId,
        platformId,
        bonus,
        ref: `${ledgerRefPrefix}:ev:${ev.id}`,
        eventId: ev.id,
      });
      return;
    }

    const limitedEvents = await tx.depositEvent.findMany({
      where: {
        platformId,
        active: true,
        kind: DepositEventKind.LIMITED_TIME,
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    for (const ev of limitedEvents) {
      const existing = await tx.userDepositEventClaim.findUnique({
        where: {
          userId_eventId: { userId, eventId: ev.id },
        },
      });
      if (existing) continue;
      const bonus = pickBonusFromTiers(ev.tiersJson, depositAmount);
      if (bonus.lte(0)) continue;
      await this.creditBonus(tx, {
        userId,
        platformId,
        bonus,
        ref: `${ledgerRefPrefix}:ev:${ev.id}`,
        eventId: ev.id,
      });
      return;
    }
  }

  private async creditBonus(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      platformId: string;
      bonus: Prisma.Decimal;
      ref: string;
      eventId: string;
    },
  ): Promise<void> {
    const { userId, platformId, bonus, ref, eventId } = params;
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) return;
    const newBal = wallet.balance.plus(bonus);
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBal },
    });
    await tx.ledgerEntry.create({
      data: {
        userId,
        platformId,
        type: LedgerEntryType.ADJUSTMENT,
        amount: bonus,
        balanceAfter: newBal,
        reference: ref.slice(0, 200),
        metaJson: {
          depositEventBonus: true,
          eventId,
        },
      },
    });
    await this.rolling.createObligationIfNeeded(tx, {
      userId,
      platformId,
      depositAmount: bonus,
      sourceRef: `${ref}:rolling`,
    });
    await tx.userDepositEventClaim.create({
      data: { userId, eventId },
    });
  }

  listForPlatform(platformId: string) {
    return this.prisma.depositEvent.findMany({
      where: { platformId },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async replaceAll(
    platformId: string,
    items: Array<{
      id?: string;
      kind: DepositEventKind;
      title: string;
      active: boolean;
      startsAt: string | null;
      endsAt: string | null;
      tiersJson: unknown;
      sortOrder: number;
    }>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userDepositEventClaim.deleteMany({
        where: { event: { platformId } },
      });
      await tx.depositEvent.deleteMany({ where: { platformId } });
      for (const it of items) {
        await tx.depositEvent.create({
          data: {
            platformId,
            kind: it.kind,
            title: it.title.trim() || '이벤트',
            active: it.active,
            startsAt: it.startsAt ? new Date(it.startsAt) : null,
            endsAt: it.endsAt ? new Date(it.endsAt) : null,
            tiersJson: it.tiersJson as object,
            sortOrder: it.sortOrder,
          },
        });
      }
    });
    return this.listForPlatform(platformId);
  }
}

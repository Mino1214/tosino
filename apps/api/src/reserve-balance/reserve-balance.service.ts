import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 알(크레딧) 가상 잔액 서비스.
 *
 * 핵심 불변식:
 *   0  ≤  current_amount  ≤  initial_amount
 *
 * - "알" 은 관리자 화면에만 보이는 가상 잔액이다. 실제 지갑/정산 금액을 건드리지 않는다.
 * - DEDUCT: 유저 낙첨 시 차감 (기존 소진 구조를 공통 함수로 흡수)
 * - RESTORE: 유저 승리 시 가상 복구 (restoreEnabled = true 일 때만 잔액 변동)
 * - 같은 bet result event 는 eventKey 로 멱등 처리 (중복 반영 방지)
 * - 롤백/취소는 `rollback(eventKey)` 로 원장 반대 부호 로그를 남겨 재계산 가능.
 */

export type ReserveTxType = 'DEDUCT' | 'RESTORE' | 'ADJUST' | 'ROLLBACK';

export interface ReserveMutationInput {
  baseAmount: number | string | Prisma.Decimal;
  rate?: number | string | Prisma.Decimal | null;
  relatedUserId?: string | null;
  relatedGameId?: string | null;
  relatedBetId?: string | null;
  eventKey?: string | null;
  note?: string | null;
  createdByUserId?: string | null;
}

export interface ReserveMutationResult {
  platformId: string;
  type: ReserveTxType;
  idempotent: boolean;
  restoreEnabled: boolean;
  baseAmount: string;
  rate: string;
  computedAmount: string;
  changedAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  initialAmount: string;
  logId: string | null;
}

type TxClient = Prisma.TransactionClient | PrismaService;

const DECIMAL_ZERO = new Prisma.Decimal(0);

@Injectable()
export class ReserveBalanceService {
  private readonly log = new Logger(ReserveBalanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────── Public API ─────────────────────

  /**
   * 유저 낙첨 → 알 차감 (기존 소진 로직).
   * - current_amount = max(0, current_amount - baseAmount * rate)
   */
  async deduct(
    platformId: string,
    input: ReserveMutationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ReserveMutationResult> {
    return this.runMutation(platformId, 'DEDUCT', input, tx);
  }

  /**
   * 유저 승리 → 가상 복구.
   * - restoreEnabled = false 면 로그만 기록하고 잔액은 변동 없음.
   * - current_amount = min(initial_amount, current_amount + baseAmount * rate)
   */
  async restore(
    platformId: string,
    input: ReserveMutationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ReserveMutationResult> {
    return this.runMutation(platformId, 'RESTORE', input, tx);
  }

  /**
   * 수동 보정 (ADJUST). baseAmount 가 양수면 증가, 음수면 감소.
   * 상/하한 클램프는 동일하게 적용됨. rate 는 기록용으로만 저장되고 계산엔 미사용.
   */
  async adjust(
    platformId: string,
    input: ReserveMutationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ReserveMutationResult> {
    return this.runMutation(platformId, 'ADJUST', input, tx);
  }

  /**
   * 실시간 ledger BET/WIN 이벤트를 알 차감/복구로 매핑하는 편의 헬퍼.
   * - BET(유저 스테이크) → DEDUCT (유저 낙첨 가정: stake × rate 만큼 선차감)
   * - WIN(유저 승리 payout) → RESTORE (배당 × rate 만큼 가상 복구)
   *
   * 조합해서 실제 순변동 = (stake − win) × rate 가 자동 성립.
   * rate 는 platform.reserveRatePct 우선, 없으면 vertical 별 solutionRatePolicy 의 판매율 사용.
   *
   * reference 는 벤더 콜백 트랜잭션 ID · bet ID 등 유일 키이며,
   * 같은 이벤트 재수신 시 eventKey(ledger:{reference}:{deduct|restore}) 기반으로 멱등 처리됨.
   */
  async applyLedgerEvent(
    platformId: string,
    event: {
      kind: 'BET' | 'WIN';
      amount: number | string | Prisma.Decimal;
      reference: string;
      userId?: string | null;
      gameId?: string | null;
      betId?: string | null;
      vertical?: string | null;
      note?: string | null;
      rate?: number | string | Prisma.Decimal | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<ReserveMutationResult | null> {
    const raw = this.toDecimal(event.amount);
    // ledger BET 은 음수로 저장되므로 절대값으로 변환; WIN 은 양수 그대로.
    const base = raw.isNegative() ? raw.negated() : raw;
    if (base.isZero() || base.lt(0)) return null;

    // 마스터 스위치 체크 — 플랫폼 단위로 reserveEnabled=false 면 실시간 반영 전면 스킵.
    // 이 플래그만 바꾸면 "테스트 전용 모드(off) ⇄ 운영 실시간(on)" 전환이 즉시 이루어진다.
    const enabled = await this.isReserveEnabled(platformId, tx);
    if (!enabled) return null;

    const effectiveRate =
      event.rate != null
        ? this.toDecimal(event.rate)
        : await this.resolveRateForVertical(platformId, event.vertical ?? null, tx);

    const keySuffix = event.kind === 'BET' ? 'deduct' : 'restore';
    const input: ReserveMutationInput = {
      baseAmount: base,
      rate: effectiveRate,
      relatedUserId: event.userId ?? null,
      relatedGameId: event.gameId ?? null,
      relatedBetId: event.betId ?? event.reference ?? null,
      eventKey: `ledger:${event.reference}:${keySuffix}`,
      note: event.note ?? null,
    };

    if (event.kind === 'BET') {
      return this.deduct(platformId, input, tx);
    }
    return this.restore(platformId, input, tx);
  }

  /**
   * ledger 이벤트가 취소/환불된 경우 같은 reference 로 찍혔던 deduct/restore 를 역방향으로 되돌린다.
   * 둘 다 존재할 수 있으므로 양쪽 모두 시도한다.
   */
  async rollbackLedgerEvent(
    reference: string,
    note?: string | null,
  ): Promise<Array<ReserveMutationResult | null>> {
    const results: Array<ReserveMutationResult | null> = [];
    results.push(
      await this.rollbackByEventKey(`ledger:${reference}:deduct`, note ?? null),
    );
    results.push(
      await this.rollbackByEventKey(`ledger:${reference}:restore`, note ?? null),
    );
    return results;
  }

  /**
   * 같은 eventKey 로 기록된 직전 DEDUCT/RESTORE 를 원장 반대부호로 복구.
   * 예: 베팅 취소·정산 롤백 시 사용.
   */
  async rollbackByEventKey(
    eventKey: string,
    note?: string | null,
  ): Promise<ReserveMutationResult | null> {
    const original = await this.prisma.platformReserveLog.findUnique({
      where: { eventKey },
    });
    if (!original) return null;
    if (original.type === 'ROLLBACK') return null;

    const rollbackKey = `${eventKey}:rollback`;
    const existing = await this.prisma.platformReserveLog.findUnique({
      where: { eventKey: rollbackKey },
    });
    if (existing) {
      return this.toResult(existing, {
        idempotent: true,
        restoreEnabled: await this.isRestoreEnabled(original.platformId),
      });
    }

    // 반대 부호 이벤트로 재입력. 실제 적용 금액은 클램프에 맡긴다.
    const reverseType: ReserveTxType =
      original.type === 'DEDUCT' ? 'RESTORE' : 'DEDUCT';
    return this.runMutation(original.platformId, reverseType, {
      baseAmount: original.baseAmount.toString(),
      rate: original.rate.toString(),
      relatedUserId: original.relatedUserId ?? undefined,
      relatedGameId: original.relatedGameId ?? undefined,
      relatedBetId: original.relatedBetId ?? undefined,
      eventKey: rollbackKey,
      note: note ?? `rollback of ${original.type} ${eventKey}`,
    });
  }

  // ───────────────────── Read API ─────────────────────

  async getSummary(platformId: string, todayKstMs?: number) {
    const platform = await this.prisma.platform.findUnique({
      where: { id: platformId },
      select: {
        id: true,
        name: true,
        slug: true,
        creditBalance: true,
        reserveInitialAmount: true,
        reserveEnabled: true,
        reserveRestoreEnabled: true,
        reserveRatePct: true,
      },
    });
    if (!platform) throw new NotFoundException('Platform not found');

    const { from: todayFrom, to: todayTo } = this.kstTodayRange(
      todayKstMs ?? Date.now(),
    );

    const [todayDeductAgg, todayRestoreAgg, totalDeductAgg, totalRestoreAgg] =
      await Promise.all([
        this.prisma.platformReserveLog.aggregate({
          where: {
            platformId,
            type: 'DEDUCT',
            createdAt: { gte: todayFrom, lt: todayTo },
          },
          _sum: { changedAmount: true },
          _count: true,
        }),
        this.prisma.platformReserveLog.aggregate({
          where: {
            platformId,
            type: 'RESTORE',
            createdAt: { gte: todayFrom, lt: todayTo },
          },
          _sum: { changedAmount: true },
          _count: true,
        }),
        this.prisma.platformReserveLog.aggregate({
          where: { platformId, type: 'DEDUCT' },
          _sum: { changedAmount: true },
        }),
        this.prisma.platformReserveLog.aggregate({
          where: { platformId, type: 'RESTORE' },
          _sum: { changedAmount: true },
        }),
      ]);

    const current = platform.creditBalance;
    const initial = platform.reserveInitialAmount;
    const todayDeduct = todayDeductAgg._sum.changedAmount ?? DECIMAL_ZERO;
    const todayRestore = todayRestoreAgg._sum.changedAmount ?? DECIMAL_ZERO;
    // 오늘 잔액 변동 = 오늘 복구 합 - 오늘 차감 합 (잔액 기준, 음수면 감소)
    const todayNet = todayRestore.minus(todayDeduct);

    return {
      platformId: platform.id,
      platformName: platform.name,
      platformSlug: platform.slug,
      enabled: platform.reserveEnabled,
      restoreEnabled: platform.reserveRestoreEnabled,
      rate: platform.reserveRatePct ? platform.reserveRatePct.toString() : null,
      currentAmount: current.toFixed(2),
      initialAmount: initial.toFixed(2),
      remainingHeadroom: initial.minus(current).toFixed(2),
      todayDeductAmount: todayDeduct.toFixed(2),
      todayRestoreAmount: todayRestore.toFixed(2),
      todayNetChange: todayNet.toFixed(2),
      todayDeductCount: todayDeductAgg._count,
      todayRestoreCount: todayRestoreAgg._count,
      totalDeductAmount: (totalDeductAgg._sum.changedAmount ?? DECIMAL_ZERO).toFixed(
        2,
      ),
      totalRestoreAmount: (totalRestoreAgg._sum.changedAmount ?? DECIMAL_ZERO).toFixed(
        2,
      ),
    };
  }

  async listLogs(
    platformId: string,
    opts: {
      type?: ReserveTxType;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const where: Prisma.PlatformReserveLogWhereInput = { platformId };
    if (opts.type) where.type = opts.type;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = opts.from;
      if (opts.to) where.createdAt.lt = opts.to;
    }
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
    const offset = Math.max(opts.offset ?? 0, 0);
    const [items, total] = await Promise.all([
      this.prisma.platformReserveLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.platformReserveLog.count({ where }),
    ]);
    return {
      total,
      items: items.map((row) => ({
        id: row.id,
        type: row.type,
        baseAmount: row.baseAmount.toFixed(2),
        rate: row.rate.toFixed(4),
        computedAmount: row.computedAmount.toFixed(2),
        changedAmount: row.changedAmount.toFixed(2),
        balanceBefore: row.balanceBefore.toFixed(2),
        balanceAfter: row.balanceAfter.toFixed(2),
        initialAmount: row.initialAmount.toFixed(2),
        relatedUserId: row.relatedUserId,
        relatedGameId: row.relatedGameId,
        relatedBetId: row.relatedBetId,
        eventKey: row.eventKey,
        note: row.note,
        createdByUserId: row.createdByUserId,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  // ───────────────────── Settings ─────────────────────

  /**
   * 마스터 스위치 on/off.
   * - true  : Vinus 카지노 콜백·배치 정산에서 실시간 DEDUCT/RESTORE 반영 (운영)
   * - false : 실시간 훅 전면 스킵. 테스트시나리오 · 수동 POST /events 는 계속 동작
   */
  async setEnabled(platformId: string, enabled: boolean) {
    return this.prisma.platform.update({
      where: { id: platformId },
      data: { reserveEnabled: enabled },
      select: { id: true, reserveEnabled: true },
    });
  }

  async setRestoreEnabled(platformId: string, enabled: boolean) {
    const platform = await this.prisma.platform.update({
      where: { id: platformId },
      data: { reserveRestoreEnabled: enabled },
      select: { id: true, reserveRestoreEnabled: true },
    });
    return platform;
  }

  async setReserveRate(platformId: string, ratePct: number | null) {
    if (ratePct != null && (ratePct < 0 || ratePct > 1)) {
      // rate 는 0.07 (=7%) 같은 비율 값. 100% 초과 입력은 거부.
      throw new BadRequestException('rate must be between 0 and 1');
    }
    return this.prisma.platform.update({
      where: { id: platformId },
      data: {
        reserveRatePct: ratePct == null ? null : new Prisma.Decimal(ratePct),
      },
      select: { id: true, reserveRatePct: true },
    });
  }

  /**
   * 초기 한도(initial_amount)를 증가시킨다. 크레딧 요청 승인 시 호출.
   * 감소는 허용하지 않는다 (잔액 invariant 깨짐 방지). 관리자 수동 보정은 별도 API 사용.
   */
  async bumpInitialAmount(
    platformId: string,
    deltaAmount: number | string | Prisma.Decimal,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.Decimal> {
    const delta = this.toDecimal(deltaAmount);
    if (delta.lte(0)) return DECIMAL_ZERO;
    const client = this.resolveTx(tx);
    const updated = await client.platform.update({
      where: { id: platformId },
      data: { reserveInitialAmount: { increment: delta } },
      select: { reserveInitialAmount: true },
    });
    return updated.reserveInitialAmount;
  }

  // ───────────────────── Internals ─────────────────────

  private async runMutation(
    platformId: string,
    type: ReserveTxType,
    input: ReserveMutationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<ReserveMutationResult> {
    const baseAmount = this.toDecimal(input.baseAmount);
    if (type !== 'ADJUST' && baseAmount.lt(0)) {
      // DEDUCT/RESTORE 는 항상 양수 금액 기준. ADJUST 는 음수 허용.
      throw new BadRequestException('baseAmount must be >= 0');
    }

    const execute = async (
      client: Prisma.TransactionClient,
    ): Promise<ReserveMutationResult> => {
      // 1) 멱등 체크
      if (input.eventKey) {
        const existing = await client.platformReserveLog.findUnique({
          where: { eventKey: input.eventKey },
        });
        if (existing) {
          return this.toResult(existing, {
            idempotent: true,
            restoreEnabled: await this.isRestoreEnabled(platformId, client),
          });
        }
      }

      // 2) 플랫폼 스냅샷 로딩
      const platform = await client.platform.findUnique({
        where: { id: platformId },
        select: {
          creditBalance: true,
          reserveInitialAmount: true,
          reserveRestoreEnabled: true,
          reserveRatePct: true,
        },
      });
      if (!platform) throw new NotFoundException('Platform not found');

      const rate = this.toDecimal(
        input.rate ?? platform.reserveRatePct ?? 0,
      );

      const computed = baseAmount.mul(rate);
      const before = platform.creditBalance;
      const initial = platform.reserveInitialAmount;

      // 3) 타입별 잔액 계산 (클램프 포함)
      let after = before;
      let changed = DECIMAL_ZERO;

      if (type === 'DEDUCT') {
        // 하한 0 고정. current < computed 이면 현재 잔액만큼만 차감.
        const target = before.minus(computed);
        after = target.lt(0) ? DECIMAL_ZERO : target;
        changed = before.minus(after); // 양수
      } else if (type === 'RESTORE') {
        if (!platform.reserveRestoreEnabled) {
          // restoreEnabled OFF: 잔액 변동 없이 로그만 남긴다 (changed=0).
          after = before;
          changed = DECIMAL_ZERO;
        } else {
          // 상한 initial 고정. current + computed > initial 이면 initial 까지만.
          const target = before.plus(computed);
          after = target.gt(initial) ? initial : target;
          changed = after.minus(before); // 양수
        }
      } else if (type === 'ADJUST') {
        // 수동 보정: baseAmount 를 "변동 금액" 자체로 사용, rate 는 기록만 하고 계산 미사용.
        const target = before.plus(baseAmount);
        if (target.lt(0)) after = DECIMAL_ZERO;
        else if (target.gt(initial)) after = initial;
        else after = target;
        changed = after.minus(before); // 부호 유지 (음수 가능)
      } else {
        throw new BadRequestException(`unsupported type: ${type}`);
      }

      // 4) 잔액 반영 (실제 적용된 delta 만큼만)
      if (!changed.isZero()) {
        await client.platform.update({
          where: { id: platformId },
          data: { creditBalance: after },
        });
      }

      // 5) 로그 기록
      const created = await client.platformReserveLog.create({
        data: {
          platformId,
          type,
          baseAmount,
          rate,
          computedAmount: computed,
          changedAmount: changed,
          balanceBefore: before,
          balanceAfter: after,
          initialAmount: initial,
          relatedUserId: input.relatedUserId ?? null,
          relatedGameId: input.relatedGameId ?? null,
          relatedBetId: input.relatedBetId ?? null,
          eventKey: input.eventKey ?? null,
          note: input.note ?? null,
          createdByUserId: input.createdByUserId ?? null,
        },
      });

      return this.toResult(created, {
        idempotent: false,
        restoreEnabled: platform.reserveRestoreEnabled,
      });
    };

    if (tx) {
      return execute(tx);
    }
    return this.prisma.$transaction(execute);
  }

  private async isRestoreEnabled(
    platformId: string,
    tx?: TxClient,
  ): Promise<boolean> {
    const client = this.resolveTx(tx);
    const row = await client.platform.findUnique({
      where: { id: platformId },
      select: { reserveRestoreEnabled: true },
    });
    return row?.reserveRestoreEnabled ?? false;
  }

  /**
   * 마스터 스위치 조회. 실시간 훅(applyLedgerEvent)은 이 플래그가 true 일 때만 동작한다.
   * default=true 로 저장되므로 기본적으로는 켜져 있고, 특정 플랫폼만 끌 수 있다.
   */
  async isReserveEnabled(platformId: string, tx?: TxClient): Promise<boolean> {
    const client = this.resolveTx(tx);
    const row = await client.platform.findUnique({
      where: { id: platformId },
      select: { reserveEnabled: true },
    });
    return row?.reserveEnabled ?? false;
  }

  /**
   * rate 우선순위:
   *   1) platform.reserveRatePct (0~1 사이 소수, 예: 0.07)
   *   2) platform.flagsJson.solutionRatePolicy 의 vertical 별 platform 판매율 (% 단위 문자열)
   *   3) 둘 다 없으면 0 → 로그는 남지만 잔액 변동 없음 (admin 이 설정해야 동작)
   */
  private async resolveRateForVertical(
    platformId: string,
    vertical: string | null,
    tx?: TxClient,
  ): Promise<Prisma.Decimal> {
    const client = this.resolveTx(tx);
    const row = await client.platform.findUnique({
      where: { id: platformId },
      select: { reserveRatePct: true, flagsJson: true },
    });
    if (!row) return DECIMAL_ZERO;
    if (row.reserveRatePct != null) return row.reserveRatePct;

    const flags = (row.flagsJson ?? {}) as Record<string, unknown>;
    const policy = (flags.solutionRatePolicy ?? {}) as Record<string, unknown>;
    // sports / casino / slot / minigame / arcade 중 sports 는 별도, 나머지는 casino 율.
    const isSports = vertical === 'sports';
    const raw = isSports ? policy.platformSportsPct : policy.platformCasinoPct;
    const pctNum = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
    if (!Number.isFinite(pctNum) || pctNum <= 0) return DECIMAL_ZERO;
    return new Prisma.Decimal(pctNum).div(100);
  }

  private resolveTx(tx?: TxClient): Prisma.TransactionClient | PrismaService {
    return tx ?? this.prisma;
  }

  private toDecimal(v: number | string | Prisma.Decimal | null | undefined) {
    if (v == null) return DECIMAL_ZERO;
    if (v instanceof Prisma.Decimal) return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return DECIMAL_ZERO;
      return new Prisma.Decimal(v);
    }
    const trimmed = v.trim();
    if (!trimmed) return DECIMAL_ZERO;
    return new Prisma.Decimal(trimmed);
  }

  private toResult(
    row: {
      id: string;
      platformId: string;
      type: string;
      baseAmount: Prisma.Decimal;
      rate: Prisma.Decimal;
      computedAmount: Prisma.Decimal;
      changedAmount: Prisma.Decimal;
      balanceBefore: Prisma.Decimal;
      balanceAfter: Prisma.Decimal;
      initialAmount: Prisma.Decimal;
    },
    meta: { idempotent: boolean; restoreEnabled: boolean },
  ): ReserveMutationResult {
    return {
      platformId: row.platformId,
      type: row.type as ReserveTxType,
      idempotent: meta.idempotent,
      restoreEnabled: meta.restoreEnabled,
      baseAmount: row.baseAmount.toFixed(2),
      rate: row.rate.toFixed(4),
      computedAmount: row.computedAmount.toFixed(2),
      changedAmount: row.changedAmount.toFixed(2),
      balanceBefore: row.balanceBefore.toFixed(2),
      balanceAfter: row.balanceAfter.toFixed(2),
      initialAmount: row.initialAmount.toFixed(2),
      logId: row.id,
    };
  }

  /** KST 기준 오늘 00:00 ~ 내일 00:00 UTC 범위. */
  private kstTodayRange(nowMs: number) {
    const kstOffsetMs = 9 * 60 * 60 * 1000;
    const kstNow = new Date(nowMs + kstOffsetMs);
    const y = kstNow.getUTCFullYear();
    const m = kstNow.getUTCMonth();
    const d = kstNow.getUTCDate();
    const startUtc = Date.UTC(y, m, d) - kstOffsetMs;
    const endUtc = startUtc + 24 * 60 * 60 * 1000;
    return { from: new Date(startUtc), to: new Date(endUtc) };
  }
}

/**
 * ReserveBalanceService — 유저 낙첨/승리에 따른 알(크레딧) 가상 잔액 로직 테스트.
 *
 * 반드시 검증하는 규칙:
 *  - 기존 낙첨 차감 로직은 그대로 동작 (DEDUCT)
 *  - 승리 시 가상 복구는 restoreEnabled = true 일 때만 잔액에 반영 (RESTORE)
 *  - 잔액은 0 미만으로 내려가면 안 됨
 *  - 잔액은 initial_amount 를 초과하면 안 됨
 *  - 모든 변화는 로그로 남음 (DEDUCT/RESTORE/ROLLBACK)
 *  - 같은 eventKey 로 중복 수신된 이벤트는 멱등 처리
 *  - 취소/롤백 이벤트는 rollbackByEventKey 로 재계산
 */

import { Prisma } from '@prisma/client';
import { ReserveBalanceService } from './reserve-balance.service';

// ─────────────────────────────────────────────────────────────
// In-memory Prisma mock — 본 테스트는 DB 없이도 순수 로직을 검증한다.
// ─────────────────────────────────────────────────────────────

type MockPlatform = {
  id: string;
  name: string;
  slug: string;
  creditBalance: Prisma.Decimal;
  reserveInitialAmount: Prisma.Decimal;
  /** 마스터 스위치 — 실시간 훅 on/off */
  reserveEnabled: boolean;
  reserveRestoreEnabled: boolean;
  reserveRatePct: Prisma.Decimal | null;
  flagsJson?: unknown;
};

type MockLog = {
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
  relatedUserId: string | null;
  relatedGameId: string | null;
  relatedBetId: string | null;
  eventKey: string | null;
  note: string | null;
  createdByUserId: string | null;
  createdAt: Date;
};

function toDec(v: unknown): Prisma.Decimal {
  if (v instanceof Prisma.Decimal) return v;
  if (v == null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(v as Prisma.Decimal.Value);
}

class PrismaMock {
  platforms: Record<string, MockPlatform> = {};
  logs: MockLog[] = [];
  private logSeq = 0;

  reset() {
    this.platforms = {};
    this.logs = [];
    this.logSeq = 0;
  }

  seedPlatform(p: {
    id?: string;
    initialAmount: number;
    currentAmount?: number;
    enabled?: boolean;
    restoreEnabled?: boolean;
    rate?: number | null;
    /** applyLedgerEvent 요율은 solutionRatePolicy 파생값이 우선이므로, rate 와 동일 청구율을 주려면 플래그를 맞춘다. */
    flagsJson?: unknown | null;
  }): MockPlatform {
    const id = p.id ?? `plt_${Object.keys(this.platforms).length + 1}`;
    const inferredFlags =
      p.flagsJson !== undefined
        ? p.flagsJson
        : p.rate != null
          ? {
              solutionRatePolicy: {
                upstreamCasinoPct: (Number(p.rate) * 100).toFixed(2),
                upstreamSportsPct: '0.00',
                autoMarginPct: '0.00',
              },
            }
          : null;
    const row: MockPlatform = {
      id,
      name: `Platform ${id}`,
      slug: id,
      reserveInitialAmount: toDec(p.initialAmount),
      creditBalance: toDec(p.currentAmount ?? p.initialAmount),
      reserveEnabled: p.enabled ?? true,
      reserveRestoreEnabled: p.restoreEnabled ?? false,
      reserveRatePct: p.rate == null ? null : toDec(p.rate),
      flagsJson: inferredFlags,
    };
    this.platforms[id] = row;
    return row;
  }

  // ─── prisma client-like API ───
  platform = {
    findUnique: async ({ where, select }: { where: { id: string }; select?: Record<string, boolean> }) => {
      const row = this.platforms[where.id];
      if (!row) return null;
      if (!select) return { ...row };
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(select)) {
        if (select[k]) out[k] = (row as unknown as Record<string, unknown>)[k];
      }
      return out;
    },
    update: async ({
      where,
      data,
      select,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
      select?: Record<string, boolean>;
    }) => {
      const row = this.platforms[where.id];
      if (!row) throw new Error('platform missing');
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === 'object' && 'increment' in (v as Record<string, unknown>)) {
          const cur = (row as unknown as Record<string, Prisma.Decimal>)[k] ?? new Prisma.Decimal(0);
          (row as unknown as Record<string, Prisma.Decimal>)[k] = cur.plus(
            toDec((v as { increment: unknown }).increment),
          );
        } else if (v && typeof v === 'object' && 'decrement' in (v as Record<string, unknown>)) {
          const cur = (row as unknown as Record<string, Prisma.Decimal>)[k] ?? new Prisma.Decimal(0);
          (row as unknown as Record<string, Prisma.Decimal>)[k] = cur.minus(
            toDec((v as { decrement: unknown }).decrement),
          );
        } else if (v instanceof Prisma.Decimal) {
          (row as unknown as Record<string, Prisma.Decimal>)[k] = v;
        } else if (typeof v === 'boolean' || typeof v === 'string' || v === null) {
          (row as unknown as Record<string, unknown>)[k] = v;
        } else if (typeof v === 'number') {
          (row as unknown as Record<string, Prisma.Decimal>)[k] = toDec(v);
        }
      }
      if (!select) return { ...row };
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(select)) {
        if (select[k]) out[k] = (row as unknown as Record<string, unknown>)[k];
      }
      return out;
    },
  };

  platformReserveLog = {
    findUnique: async ({ where }: { where: { eventKey: string } }) => {
      return this.logs.find((l) => l.eventKey === where.eventKey) ?? null;
    },
    create: async ({ data }: { data: Omit<MockLog, 'id' | 'createdAt'> }) => {
      const row: MockLog = {
        id: `log_${++this.logSeq}`,
        createdAt: new Date(),
        ...data,
        baseAmount: toDec(data.baseAmount),
        rate: toDec(data.rate),
        computedAmount: toDec(data.computedAmount),
        changedAmount: toDec(data.changedAmount),
        balanceBefore: toDec(data.balanceBefore),
        balanceAfter: toDec(data.balanceAfter),
        initialAmount: toDec(data.initialAmount),
      };
      this.logs.push(row);
      return row;
    },
    aggregate: async ({
      where,
      _sum,
    }: {
      where: Partial<Pick<MockLog, 'platformId' | 'type'>> & {
        createdAt?: { gte?: Date; lt?: Date };
      };
      _sum?: { changedAmount?: boolean };
      _count?: boolean;
    }) => {
      const rows = this.logs.filter((l) => {
        if (where.platformId && l.platformId !== where.platformId) return false;
        if (where.type && l.type !== where.type) return false;
        if (where.createdAt?.gte && l.createdAt < where.createdAt.gte) return false;
        if (where.createdAt?.lt && l.createdAt >= where.createdAt.lt) return false;
        return true;
      });
      const sum = rows.reduce(
        (acc, l) => acc.plus(l.changedAmount),
        new Prisma.Decimal(0),
      );
      return {
        _sum: _sum?.changedAmount ? { changedAmount: sum } : ({} as Record<string, unknown>),
        _count: rows.length,
      };
    },
    findMany: async ({
      where,
      orderBy,
      take,
      skip,
    }: {
      where?: { platformId?: string; type?: string };
      orderBy?: { createdAt?: 'asc' | 'desc' };
      take?: number;
      skip?: number;
    }) => {
      let rows = [...this.logs];
      if (where?.platformId) rows = rows.filter((l) => l.platformId === where.platformId);
      if (where?.type) rows = rows.filter((l) => l.type === where.type);
      rows.sort((a, b) =>
        orderBy?.createdAt === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      );
      if (skip) rows = rows.slice(skip);
      if (take) rows = rows.slice(0, take);
      return rows;
    },
    count: async ({ where }: { where?: { platformId?: string } }) => {
      return this.logs.filter((l) => !where?.platformId || l.platformId === where.platformId).length;
    },
  };

  async $transaction<T>(cb: (tx: PrismaMock) => Promise<T>): Promise<T> {
    // 단일 프로세스 인메모리라서 별도 격리 없이 동일 인스턴스 전달.
    return cb(this);
  }
}

function makeSvc() {
  const prismaMock = new PrismaMock();
  const svc = new ReserveBalanceService(prismaMock as unknown as never);
  return { svc, prismaMock };
}

// ─────────────────────────────────────────────────────────────
// 테스트 케이스 — 요구 사양의 8개 + 예시 3개
// ─────────────────────────────────────────────────────────────

describe('ReserveBalanceService — 가상 알 복구 로직', () => {
  // 예시 1: 일반 낙첨 → 차감, 승리 → 복구
  it('예시1: 낙첨 100,000 → 993,000, 이후 승리 50,000 → 996,500', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    const deduct = await svc.deduct(plt.id, { baseAmount: 100_000 });
    expect(deduct.balanceAfter).toBe('993000.00');
    expect(deduct.changedAmount).toBe('7000.00');

    const restore = await svc.restore(plt.id, { baseAmount: 50_000 });
    expect(restore.balanceAfter).toBe('996500.00');
    expect(restore.changedAmount).toBe('3500.00');
  });

  // 예시 2: 복구 상한 (initial_amount) 클램프
  it('예시2: current=998,000 · 승리 100,000 복구 시 initial(1,000,000) 고정', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 998_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    const res = await svc.restore(plt.id, { baseAmount: 100_000 });
    // computed = 7,000 이지만 상한에 막혀 실제 +2,000 만 반영
    expect(res.computedAmount).toBe('7000.00');
    expect(res.changedAmount).toBe('2000.00');
    expect(res.balanceAfter).toBe('1000000.00');
  });

  // 예시 3: 차감 하한 (0) 클램프
  it('예시3: current=3,000 · 낙첨 100,000 차감 시 0 고정', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 3_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    const res = await svc.deduct(plt.id, { baseAmount: 100_000 });
    expect(res.computedAmount).toBe('7000.00');
    expect(res.changedAmount).toBe('3000.00');
    expect(res.balanceAfter).toBe('0.00');
  });

  // 1) 낙첨만
  it('낙첨만 있는 경우: 반복 차감 후 로그 쌓임', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({ initialAmount: 500_000, restoreEnabled: true, rate: 0.07 });

    await svc.deduct(plt.id, { baseAmount: 10_000 });
    await svc.deduct(plt.id, { baseAmount: 20_000 });
    await svc.deduct(plt.id, { baseAmount: 30_000 });

    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('495800.00'); // 500000 - 4200
    const deductLogs = prismaMock.logs.filter((l) => l.type === 'DEDUCT');
    expect(deductLogs).toHaveLength(3);
  });

  // 2) 승리만
  it('승리만 있는 경우: initial 이 이미 상한이면 변동 없음', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
    });
    const r = await svc.restore(plt.id, { baseAmount: 50_000 });
    expect(r.changedAmount).toBe('0.00');
    expect(r.balanceAfter).toBe('1000000.00');
  });

  // 3) 낙첨 후 승리
  it('낙첨 후 승리: 순서대로 차감·복구 반영', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    await svc.deduct(plt.id, { baseAmount: 200_000 }); // -14,000 → 986,000
    await svc.restore(plt.id, { baseAmount: 100_000 }); // +7,000 → 993,000

    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('993000.00');
  });

  // 4) 승리 후 낙첨
  it('승리 후 낙첨: 순서대로 복구·차감 반영', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 900_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    await svc.restore(plt.id, { baseAmount: 100_000 }); // +7000 → 907,000
    await svc.deduct(plt.id, { baseAmount: 50_000 }); // -3500 → 903,500

    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('903500.00');
  });

  // 5) 하한 테스트
  it('하한선: 여러 번의 낙첨이 누적돼도 0 미만으로 안 내려간다', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 100,
      restoreEnabled: true,
      rate: 0.07,
    });

    await svc.deduct(plt.id, { baseAmount: 1_000_000 });
    await svc.deduct(plt.id, { baseAmount: 1_000_000 });

    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('0.00');
    // 두 번째 차감 시 actual changed == 0 이어야 한다 (잔액 없음)
    const second = prismaMock.logs.filter((l) => l.type === 'DEDUCT')[1];
    expect(second.changedAmount.toFixed(2)).toBe('0.00');
  });

  // 6) 상한 테스트
  it('상한선: 승리 복구 누적은 initial_amount 초과 못 함', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 995_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    await svc.restore(plt.id, { baseAmount: 1_000_000 });
    await svc.restore(plt.id, { baseAmount: 1_000_000 });

    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('1000000.00');
  });

  // 7) 같은 이벤트 중복 수신
  it('같은 eventKey 로 중복 수신되면 두 번째는 idempotent=true 로 무시', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    const first = await svc.deduct(plt.id, { baseAmount: 100_000, eventKey: 'bet:abc' });
    const second = await svc.deduct(plt.id, { baseAmount: 100_000, eventKey: 'bet:abc' });

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('993000.00');
    expect(prismaMock.logs.filter((l) => l.eventKey === 'bet:abc')).toHaveLength(1);
  });

  // 8) 취소/롤백
  it('rollbackByEventKey: 원 이벤트의 반대 부호로 재계산', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    await svc.deduct(plt.id, { baseAmount: 100_000, eventKey: 'bet:xyz' });
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('993000.00');

    const rollback = await svc.rollbackByEventKey('bet:xyz');
    expect(rollback).not.toBeNull();
    // RESTORE(7000) 로 되돌려짐 → 1,000,000 복원
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('1000000.00');
    expect(prismaMock.logs.find((l) => l.eventKey === 'bet:xyz:rollback')).toBeDefined();

    // 같은 rollback 재호출은 idempotent
    const again = await svc.rollbackByEventKey('bet:xyz');
    expect(again?.idempotent).toBe(true);
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('1000000.00');
  });

  // 9) 복구 비활성화 시 잔액 변동 없음
  it('restoreEnabled=false 이면 RESTORE 이벤트가 로그만 남고 잔액은 그대로', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 990_000,
      restoreEnabled: false,
      rate: 0.07,
    });

    const r = await svc.restore(plt.id, { baseAmount: 100_000 });
    expect(r.changedAmount).toBe('0.00');
    expect(r.restoreEnabled).toBe(false);
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('990000.00');
    // 로그는 반드시 남아 있어야 한다 (감사 목적)
    expect(prismaMock.logs.filter((l) => l.type === 'RESTORE')).toHaveLength(1);
  });

  // 10) 불변식: 0 ≤ current ≤ initial 이 모든 연산 후 유지
  it('무작위 연속 이벤트 후에도 0 ≤ current ≤ initial 불변식 유지', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    const events: Array<['d' | 'r', number]> = [
      ['d', 500_000],
      ['r', 2_000_000],
      ['d', 100_000],
      ['r', 10_000_000],
      ['d', 50_000],
    ];
    for (const [t, amt] of events) {
      if (t === 'd') await svc.deduct(plt.id, { baseAmount: amt });
      else await svc.restore(plt.id, { baseAmount: amt });
    }
    const bal = prismaMock.platforms[plt.id].creditBalance;
    expect(bal.gte(0)).toBe(true);
    expect(bal.lte(prismaMock.platforms[plt.id].reserveInitialAmount)).toBe(true);
  });

  // 11) 요약 지표
  it('getSummary 는 오늘 차감/복구/순변동/현재/최대 잔액을 반환', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
    });

    await svc.deduct(plt.id, { baseAmount: 100_000 });
    await svc.restore(plt.id, { baseAmount: 50_000 });

    const s = await svc.getSummary(plt.id);
    expect(s.currentAmount).toBe('996500.00');
    expect(s.initialAmount).toBe('1000000.00');
    expect(s.todayDeductAmount).toBe('7000.00');
    expect(s.todayRestoreAmount).toBe('3500.00');
    expect(s.todayNetChange).toBe('-3500.00'); // 복구 - 차감 (잔액 기준: -3500)
    expect(s.restoreEnabled).toBe(true);
    expect(s.enabled).toBe(true);
  });

  // ─────────────────── 마스터 스위치(reserveEnabled) ───────────────────
  //
  // 기획 의도:
  //   reserveEnabled=false → 실시간 훅(applyLedgerEvent)은 전면 스킵되지만
  //                          테스트·수동 API(deduct/restore 직접 호출)는 그대로 동작.
  //   → 관리자가 flag 를 true 로 바꾸는 순간 "테스트 전용 → 운영 실시간" 이 즉시 전환.

  it('마스터 스위치 OFF: applyLedgerEvent(BET) 는 아무 기록/변동 없이 null', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
      enabled: false,
    });

    const res = await svc.applyLedgerEvent(plt.id, {
      kind: 'BET',
      amount: new Prisma.Decimal(-100_000), // ledger BET 은 음수 저장
      reference: 'vendor-tx-1',
    });

    expect(res).toBeNull();
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('1000000.00');
    expect(prismaMock.logs).toHaveLength(0);
  });

  it('마스터 스위치 OFF: applyLedgerEvent(WIN) 도 스킵', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      currentAmount: 900_000,
      restoreEnabled: true,
      rate: 0.07,
      enabled: false,
    });

    const res = await svc.applyLedgerEvent(plt.id, {
      kind: 'WIN',
      amount: 50_000,
      reference: 'vendor-tx-2',
    });

    expect(res).toBeNull();
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('900000.00');
    expect(prismaMock.logs).toHaveLength(0);
  });

  it('마스터 스위치 OFF 에서도 수동 deduct/restore 는 그대로 동작 (관리자 보정/테스트시나리오)', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
      enabled: false,
    });

    const r = await svc.deduct(plt.id, { baseAmount: 100_000 });
    expect(r.changedAmount).toBe('7000.00');
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('993000.00');
    expect(prismaMock.logs.filter((l) => l.type === 'DEDUCT')).toHaveLength(1);
  });

  it('setEnabled(true) 로 전환 직후 applyLedgerEvent 가 곧바로 반영된다', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
      enabled: false,
    });

    // 1) 테스트 전용 상태에선 실시간 이벤트가 무시된다.
    const beforeToggle = await svc.applyLedgerEvent(plt.id, {
      kind: 'BET',
      amount: 100_000,
      reference: 'ref-toggle-1',
    });
    expect(beforeToggle).toBeNull();
    expect(prismaMock.logs).toHaveLength(0);

    // 2) 마스터 스위치 ON → 이후 실시간 이벤트가 즉시 반영.
    await svc.setEnabled(plt.id, true);
    const afterToggle = await svc.applyLedgerEvent(plt.id, {
      kind: 'BET',
      amount: 100_000,
      reference: 'ref-toggle-2',
    });
    expect(afterToggle).not.toBeNull();
    expect(afterToggle?.type).toBe('DEDUCT');
    expect(afterToggle?.changedAmount).toBe('7000.00');
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('993000.00');
    expect(prismaMock.logs.filter((l) => l.type === 'DEDUCT')).toHaveLength(1);

    // 3) 다시 OFF 로 내리면 바로 스킵 모드 복귀.
    await svc.setEnabled(plt.id, false);
    const afterOff = await svc.applyLedgerEvent(plt.id, {
      kind: 'BET',
      amount: 100_000,
      reference: 'ref-toggle-3',
    });
    expect(afterOff).toBeNull();
    expect(prismaMock.logs.filter((l) => l.type === 'DEDUCT')).toHaveLength(1);
  });

  it('LIVE 모드: BET + WIN 실시간 이벤트가 순차 반영되고 멱등 키가 유지된다', async () => {
    const { svc, prismaMock } = makeSvc();
    const plt = prismaMock.seedPlatform({
      initialAmount: 1_000_000,
      restoreEnabled: true,
      rate: 0.07,
      enabled: true,
    });

    await svc.applyLedgerEvent(plt.id, {
      kind: 'BET',
      amount: 100_000,
      reference: 'tx-live-1',
      vertical: 'casino',
    });
    await svc.applyLedgerEvent(plt.id, {
      kind: 'WIN',
      amount: 50_000,
      reference: 'tx-live-1',
      vertical: 'casino',
    });

    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('996500.00');

    // 동일 reference 재수신 → 멱등 (추가 기록 없음)
    await svc.applyLedgerEvent(plt.id, {
      kind: 'BET',
      amount: 100_000,
      reference: 'tx-live-1',
      vertical: 'casino',
    });
    expect(prismaMock.logs.filter((l) => l.eventKey === 'ledger:tx-live-1:deduct')).toHaveLength(1);
    expect(prismaMock.platforms[plt.id].creditBalance.toFixed(2)).toBe('996500.00');
  });
});

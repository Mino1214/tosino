"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type EventKind = "FIRST_CHARGE" | "LIMITED_TIME";

type EvRow = {
  id: string;
  kind: EventKind;
  title: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  tiersJson: unknown;
  sortOrder: number;
};

type TierEditor = {
  id: string;
  minAmount: string;
  bonusAmount: string;
};

type EventEditor = {
  id?: string;
  clientId: string;
  kind: EventKind;
  title: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  tiers: TierEditor[];
};

const KIND_ORDER: EventKind[] = ["FIRST_CHARGE", "LIMITED_TIME"];

function makeId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emptyTier(): TierEditor {
  return {
    id: makeId("tier"),
    minAmount: "",
    bonusAmount: "",
  };
}

function emptyEvent(kind: EventKind): EventEditor {
  return {
    clientId: makeId("event"),
    kind,
    title: kind === "FIRST_CHARGE" ? "첫충전 보너스" : "기간 한정 충전 이벤트",
    active: true,
    startsAt: "",
    endsAt: "",
    tiers: [emptyTier()],
  };
}

function kindLabel(kind: EventKind) {
  return kind === "FIRST_CHARGE" ? "첫충 이벤트" : "기간 한정";
}

function kindDescription(kind: EventKind) {
  return kind === "FIRST_CHARGE"
    ? "회원 첫 입금 1회에만 적용됩니다."
    : "주말, 특정 날짜, 단발 보너스처럼 기간을 정해서 운영합니다.";
}

function normalizeDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 16);
  const shifted = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function cleanAmount(value: string) {
  return value.replaceAll(",", "").trim();
}

function isNumericAmount(value: string) {
  return /^\d+(\.\d+)?$/.test(cleanAmount(value));
}

function formatAmountLabel(value: string) {
  const cleaned = cleanAmount(value);
  if (!cleaned || !isNumericAmount(cleaned)) return value.trim() || "0";
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return cleaned;
  return new Intl.NumberFormat("ko-KR").format(num);
}

function tiersFromJson(tiersJson: unknown): TierEditor[] {
  if (!Array.isArray(tiersJson)) return [emptyTier()];
  const rows = tiersJson
    .map((tier) => {
      if (!tier || typeof tier !== "object") return null;
      const row = tier as Record<string, unknown>;
      return {
        id: makeId("tier"),
        minAmount: row.minAmount?.toString() ?? "",
        bonusAmount: row.bonusAmount?.toString() ?? "",
      };
    })
    .filter((row): row is TierEditor => !!row);
  return rows.length > 0 ? rows : [emptyTier()];
}

function rowsToEditors(rows: EvRow[]) {
  return KIND_ORDER.flatMap((kind) =>
    rows
      .filter((row) => row.kind === kind)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => ({
        id: row.id,
        clientId: makeId("event"),
        kind: row.kind,
        title: row.title,
        active: row.active,
        startsAt: normalizeDateTimeLocal(row.startsAt),
        endsAt: normalizeDateTimeLocal(row.endsAt),
        tiers: tiersFromJson(row.tiersJson),
      })),
  );
}

function sampleEvents() {
  const first = emptyEvent("FIRST_CHARGE");
  first.title = "첫충전 보너스";
  first.tiers = [
    { id: makeId("tier"), minAmount: "10000", bonusAmount: "1000" },
    { id: makeId("tier"), minAmount: "50000", bonusAmount: "7000" },
  ];

  const limited = emptyEvent("LIMITED_TIME");
  limited.title = "주말 단발 충전";
  limited.active = false;
  limited.tiers = [{ id: makeId("tier"), minAmount: "20000", bonusAmount: "2000" }];

  return [first, limited];
}

function buildPayload(events: EventEditor[]) {
  return KIND_ORDER.flatMap((kind) => {
    let sortOrder = 0;
    return events
      .filter((event) => event.kind === kind)
      .map((event) => {
        const title = event.title.trim();
        if (!title) {
          throw new Error(`${kindLabel(kind)} 제목을 입력해주세요.`);
        }

        const tiers = event.tiers
          .map((tier) => ({
            minAmount: cleanAmount(tier.minAmount),
            bonusAmount: cleanAmount(tier.bonusAmount),
          }))
          .filter((tier) => tier.minAmount || tier.bonusAmount);

        if (tiers.length === 0) {
          throw new Error(`${title}에 최소 입금 구간을 1개 이상 넣어주세요.`);
        }

        for (const [index, tier] of tiers.entries()) {
          if (!tier.minAmount || !tier.bonusAmount) {
            throw new Error(`${title} ${index + 1}구간의 최소입금과 보너스를 모두 입력해주세요.`);
          }
          if (!isNumericAmount(tier.minAmount) || !isNumericAmount(tier.bonusAmount)) {
            throw new Error(`${title} ${index + 1}구간은 숫자만 입력해주세요.`);
          }
        }

        const startsAt = toIsoOrNull(event.startsAt);
        const endsAt = toIsoOrNull(event.endsAt);

        if (event.startsAt.trim() && !startsAt) {
          throw new Error(`${title} 시작일 형식이 올바르지 않습니다.`);
        }
        if (event.endsAt.trim() && !endsAt) {
          throw new Error(`${title} 종료일 형식이 올바르지 않습니다.`);
        }
        if (startsAt && endsAt && startsAt > endsAt) {
          throw new Error(`${title} 종료일은 시작일보다 늦어야 합니다.`);
        }

        return {
          id: event.id,
          kind,
          title,
          active: event.active,
          startsAt,
          endsAt,
          tiersJson: tiers,
          sortOrder: sortOrder++,
        };
      });
  });
}

export default function ConsoleDepositEventsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [events, setEvents] = useState<EventEditor[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const firstChargeCount = events.filter((event) => event.kind === "FIRST_CHARGE").length;
    const limitedTimeCount = events.filter((event) => event.kind === "LIMITED_TIME").length;
    const activeCount = events.filter((event) => event.active).length;
    return { firstChargeCount, limitedTimeCount, activeCount };
  }, [events]);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    setErr(null);
    setMsg(null);
    return apiFetch<EvRow[]>(`/platforms/${selectedPlatformId}/deposit-events`)
      .then((list) => {
        setEvents(rowsToEditors(list));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "불러오기 실패"));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) return;
    void load();
  }, [load, platformLoading, router, selectedPlatformId]);

  function updateEvent(clientId: string, patch: Partial<EventEditor>) {
    setEvents((current) =>
      current.map((event) =>
        event.clientId === clientId
          ? {
              ...event,
              ...patch,
            }
          : event,
      ),
    );
  }

  function addEvent(kind: EventKind) {
    setMsg(null);
    setErr(null);
    setEvents((current) => {
      const next = [...current];
      const insertAt =
        kind === "FIRST_CHARGE"
          ? current.findIndex((event) => event.kind === "LIMITED_TIME")
          : current.length;
      const target = emptyEvent(kind);
      if (insertAt === -1) {
        next.push(target);
      } else {
        next.splice(insertAt, 0, target);
      }
      return next;
    });
  }

  function removeEvent(clientId: string) {
    setMsg(null);
    setErr(null);
    setEvents((current) => current.filter((event) => event.clientId !== clientId));
  }

  function moveEvent(clientId: string, direction: -1 | 1) {
    setEvents((current) => {
      const currentIndex = current.findIndex((event) => event.clientId === clientId);
      if (currentIndex < 0) return current;
      const kind = current[currentIndex]?.kind;
      const sameKindIndices = current.reduce<number[]>((acc, event, index) => {
        if (event.kind === kind) acc.push(index);
        return acc;
      }, []);
      const kindPosition = sameKindIndices.indexOf(currentIndex);
      const swapIndex = sameKindIndices[kindPosition + direction];
      if (swapIndex === undefined) return current;
      const next = [...current];
      [next[currentIndex], next[swapIndex]] = [next[swapIndex], next[currentIndex]];
      return next;
    });
  }

  function addTier(clientId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.clientId === clientId
          ? { ...event, tiers: [...event.tiers, emptyTier()] }
          : event,
      ),
    );
  }

  function updateTier(
    clientId: string,
    tierId: string,
    patch: Partial<TierEditor>,
  ) {
    setEvents((current) =>
      current.map((event) =>
        event.clientId === clientId
          ? {
              ...event,
              tiers: event.tiers.map((tier) =>
                tier.id === tierId
                  ? {
                      ...tier,
                      ...patch,
                    }
                  : tier,
              ),
            }
          : event,
      ),
    );
  }

  function removeTier(clientId: string, tierId: string) {
    setEvents((current) =>
      current.map((event) => {
        if (event.clientId !== clientId) return event;
        const nextTiers = event.tiers.filter((tier) => tier.id !== tierId);
        return {
          ...event,
          tiers: nextTiers.length > 0 ? nextTiers : [emptyTier()],
        };
      }),
    );
  }

  async function save() {
    if (!selectedPlatformId) return;
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const items = buildPayload(events);
      await apiFetch(`/platforms/${selectedPlatformId}/deposit-events`, {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
      setMsg("저장했습니다. 이벤트를 교체하면 기존 참여 이력은 초기화됩니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">입금 이벤트 설정</h1>
        <p className="mt-2 text-sm text-zinc-500">
          일반 운영자가 바로 다룰 수 있게 카드형 폼으로 구성했습니다. 이벤트 종류를 추가하고,
          구간별 최소 입금액과 보너스만 입력하면 저장됩니다.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">
            첫충 이벤트
          </p>
          <p className="mt-3 text-3xl font-semibold text-zinc-100">
            {summary.firstChargeCount}
          </p>
          <p className="mt-2 text-sm text-zinc-500">회원 첫 입금 1회만 적용</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            기간 한정
          </p>
          <p className="mt-3 text-3xl font-semibold text-zinc-100">
            {summary.limitedTimeCount}
          </p>
          <p className="mt-2 text-sm text-zinc-500">주말/특정 기간 단발 이벤트</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            사용 중
          </p>
          <p className="mt-3 text-3xl font-semibold text-zinc-100">{summary.activeCount}</p>
          <p className="mt-2 text-sm text-zinc-500">현재 활성화된 이벤트 수</p>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">이벤트 편집</h2>
            <p className="mt-1 text-sm text-zinc-500">
              한 입금에는 이벤트 1개만 적용됩니다. 같은 종류 안에서는 위에 있는 카드가 먼저 적용됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addEvent("FIRST_CHARGE")}
              className="rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500"
            >
              첫충 이벤트 추가
            </button>
            <button
              type="button"
              onClick={() => addEvent("LIMITED_TIME")}
              className="rounded-lg border border-cyan-700/70 bg-cyan-950/30 px-3.5 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-900/40"
            >
              기간 한정 추가
            </button>
            <button
              type="button"
              onClick={() => setEvents(sampleEvents())}
              className="rounded-lg border border-zinc-700 px-3.5 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              샘플로 시작
            </button>
          </div>
        </div>

        {err && (
          <p className="mt-4 rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}
        {msg && (
          <p className="mt-4 rounded border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {msg}
          </p>
        )}

        <div className="mt-5 space-y-6">
          {KIND_ORDER.map((kind) => {
            const kindEvents = events.filter((event) => event.kind === kind);
            return (
              <section key={kind} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{kindLabel(kind)}</h3>
                    <p className="mt-1 text-sm text-zinc-500">{kindDescription(kind)}</p>
                  </div>
                  <div className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
                    {kindEvents.length}개
                  </div>
                </div>

                {kindEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-500">
                    아직 등록된 {kindLabel(kind)}가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kindEvents.map((event, index) => (
                      <article
                        key={event.clientId}
                        className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                              {kindLabel(event.kind)}
                            </span>
                            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400">
                              적용 순서 {index + 1}
                            </span>
                            <label className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                              <input
                                type="checkbox"
                                checked={event.active}
                                onChange={(e) =>
                                  updateEvent(event.clientId, { active: e.target.checked })
                                }
                                className="h-3.5 w-3.5 accent-amber-500"
                              />
                              사용 중
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => moveEvent(event.clientId, -1)}
                              disabled={index === 0}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                            >
                              위로
                            </button>
                            <button
                              type="button"
                              onClick={() => moveEvent(event.clientId, 1)}
                              disabled={index === kindEvents.length - 1}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
                            >
                              아래로
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEvent(event.clientId)}
                              className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/40"
                            >
                              삭제
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
                          <label className="space-y-2">
                            <span className="text-xs font-medium text-zinc-300">이벤트 이름</span>
                            <input
                              value={event.title}
                              onChange={(e) =>
                                updateEvent(event.clientId, { title: e.target.value })
                              }
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-500"
                              placeholder="예: 첫충전 보너스"
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-medium text-zinc-300">
                              시작일시
                            </span>
                            <input
                              type="datetime-local"
                              value={event.startsAt}
                              onChange={(e) =>
                                updateEvent(event.clientId, { startsAt: e.target.value })
                              }
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-500"
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-xs font-medium text-zinc-300">종료일시</span>
                            <input
                              type="datetime-local"
                              value={event.endsAt}
                              onChange={(e) =>
                                updateEvent(event.clientId, { endsAt: e.target.value })
                              }
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-500"
                            />
                          </label>
                        </div>

                        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-zinc-100">
                                보너스 구간
                              </h4>
                              <p className="mt-1 text-xs text-zinc-500">
                                입금액이 조건을 만족하면 가장 높은 최소 입금 구간의 보너스가 적용됩니다.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addTier(event.clientId)}
                              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                            >
                              구간 추가
                            </button>
                          </div>

                          <div className="mt-4 space-y-2">
                            {event.tiers.map((tier, tierIndex) => (
                              <div
                                key={tier.id}
                                className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)_5.5rem]"
                              >
                                <div className="flex items-center text-xs font-medium text-zinc-400">
                                  {tierIndex + 1}구간
                                </div>
                                <label className="space-y-1">
                                  <span className="text-[11px] text-zinc-500">최소 입금액</span>
                                  <input
                                    value={tier.minAmount}
                                    inputMode="decimal"
                                    onChange={(e) =>
                                      updateTier(event.clientId, tier.id, {
                                        minAmount: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-500"
                                    placeholder="10000"
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-[11px] text-zinc-500">보너스 금액</span>
                                  <input
                                    value={tier.bonusAmount}
                                    inputMode="decimal"
                                    onChange={(e) =>
                                      updateTier(event.clientId, tier.id, {
                                        bonusAmount: e.target.value,
                                      })
                                    }
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-500"
                                    placeholder="1000"
                                  />
                                </label>
                                <div className="flex items-end">
                                  <button
                                    type="button"
                                    onClick={() => removeTier(event.clientId, tier.id)}
                                    className="w-full rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                  >
                                    삭제
                                  </button>
                                </div>
                                <div className="md:col-span-4 text-[11px] text-zinc-500">
                                  입금 {formatAmountLabel(tier.minAmount)}원 이상 시 보너스{" "}
                                  {formatAmountLabel(tier.bonusAmount)}원
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-100">
        이벤트 목록을 통째로 바꾸면 기존 참여 이력은 초기화됩니다. 운영 중인 이벤트를 수정할 때는
        적용 기간과 사용 여부를 한 번 더 확인해주세요.
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
        >
          다시 불러오기
        </button>
      </div>
    </div>
  );
}

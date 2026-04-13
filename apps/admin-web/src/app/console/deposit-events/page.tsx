"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type EvRow = {
  id: string;
  kind: "FIRST_CHARGE" | "LIMITED_TIME";
  title: string;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  tiersJson: unknown;
  sortOrder: number;
};

const SAMPLE = `[
  {
    "kind": "FIRST_CHARGE",
    "title": "첫충전 보너스",
    "active": true,
    "startsAt": null,
    "endsAt": null,
    "sortOrder": 0,
    "tiersJson": [
      { "minAmount": "10000", "bonusAmount": "1000" },
      { "minAmount": "50000", "bonusAmount": "7000" }
    ]
  },
  {
    "kind": "LIMITED_TIME",
    "title": "주말 단발 충전",
    "active": false,
    "startsAt": null,
    "endsAt": null,
    "sortOrder": 1,
    "tiersJson": [{ "minAmount": "20000", "bonusAmount": "2000" }]
  }
]`;

type DraftEvent = {
  id?: string;
  kind?: "FIRST_CHARGE" | "LIMITED_TIME";
  title?: string;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  tiersJson?: unknown;
  sortOrder?: number;
};

function kindLabel(kind: DraftEvent["kind"]) {
  return kind === "FIRST_CHARGE" ? "첫충 이벤트" : "기간 한정";
}

function tierPreview(tiersJson: unknown) {
  if (!Array.isArray(tiersJson)) return [];
  return tiersJson
    .map((tier) => {
      if (!tier || typeof tier !== "object") return null;
      const row = tier as Record<string, unknown>;
      const minAmount = row.minAmount?.toString();
      const bonusAmount = row.bonusAmount?.toString();
      if (!minAmount && !bonusAmount) return null;
      return `${minAmount ?? "?"} → ${bonusAmount ?? "?"}`;
    })
    .filter((item): item is string => !!item)
    .slice(0, 3);
}

export default function ConsoleDepositEventsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [text, setText] = useState(SAMPLE);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed)) {
        return {
          items: [] as DraftEvent[],
          error: "배열(JSON Array) 형태여야 미리보기가 가능합니다.",
        };
      }
      return { items: parsed as DraftEvent[], error: null as string | null };
    } catch {
      return {
        items: [] as DraftEvent[],
        error: "JSON 형식이 올바르지 않아 미리보기를 표시할 수 없습니다.",
      };
    }
  }, [text]);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    setErr(null);
    return apiFetch<EvRow[]>(`/platforms/${selectedPlatformId}/deposit-events`)
      .then((list) => {
        setText(JSON.stringify(list, null, 2));
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
  }, [load, router, selectedPlatformId, platformLoading]);

  async function save() {
    if (!selectedPlatformId) return;
    let items: unknown[];
    try {
      const parsed = JSON.parse(text) as unknown;
      if (!Array.isArray(parsed)) throw new Error("배열이어야 합니다");
      items = parsed;
    } catch {
      setErr("JSON 형식 오류");
      return;
    }
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/deposit-events`, {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
      setMsg("저장했습니다. (이벤트 교체 시 기존 참여 이력도 초기화됩니다)");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  function formatCurrentJson() {
    try {
      const parsed = JSON.parse(text) as unknown;
      setText(JSON.stringify(parsed, null, 2));
      setErr(null);
    } catch {
      setErr("JSON 형식 오류");
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">입금 이벤트 설정</h1>
        <p className="mt-2 text-sm text-zinc-500">
          첫충전 혜택과 기간 한정 충전 이벤트를 분리해서 관리합니다. 아래 미리보기로 내용을 먼저 확인하고,
          필요할 때만 JSON을 직접 수정하면 됩니다.
        </p>
      </div>
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400/80">
            첫충 이벤트
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            회원 첫 입금 1회에만 적용됩니다.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            보통 가장 높은 우선순위로 둡니다.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            기간 한정
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            특정 기간에만 적용되는 단발/주말 이벤트입니다.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            시작/종료일을 함께 넣어 관리합니다.
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            적용 규칙
          </p>
          <p className="mt-3 text-sm text-zinc-300">
            입금 1건당 이벤트 1개만 적용됩니다.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            이벤트 목록을 통째로 바꾸면 기존 참여 이력도 초기화됩니다.
          </p>
        </div>
      </section>
      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {msg}
        </p>
      )}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">현재 이벤트 미리보기</h2>
            <p className="mt-1 text-sm text-zinc-500">
              현재 편집 중인 JSON을 사람이 보기 쉬운 카드로 표시합니다.
            </p>
          </div>
          <div className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
            이벤트 {preview.items.length}개
          </div>
        </div>
        {preview.error ? (
          <p className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
            {preview.error}
          </p>
        ) : preview.items.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">등록된 이벤트가 없습니다.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {preview.items.map((item, index) => {
              const tiers = tierPreview(item.tiersJson);
              return (
                <div
                  key={item.id ?? `${item.kind ?? "event"}-${index}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                      {kindLabel(item.kind)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        item.active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.active ? "사용 중" : "비활성"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      정렬 {item.sortOrder ?? index}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-zinc-100">
                    {item.title?.trim() || "제목 없음"}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    기간: {item.startsAt || "상시"} ~ {item.endsAt || "제한 없음"}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    구간 수: {Array.isArray(item.tiersJson) ? item.tiersJson.length : 0}
                  </p>
                  {tiers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {tiers.map((tier) => (
                        <span
                          key={tier}
                          className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300"
                        >
                          {tier}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">고급 JSON 편집</h2>
            <p className="mt-1 text-sm text-zinc-500">
              구조를 직접 바꿔야 할 때만 사용하세요. 보통은 샘플 불러오기 후 숫자만 수정하면 됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setText(SAMPLE)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              샘플 불러오기
            </button>
            <button
              type="button"
              onClick={formatCurrentJson}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              JSON 정리
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={22}
          className="mt-4 w-full rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
        />
      </section>
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

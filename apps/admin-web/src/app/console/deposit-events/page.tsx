"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function ConsoleDepositEventsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [text, setText] = useState(SAMPLE);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold text-zinc-100">충전 이벤트</h1>
      <p className="text-sm text-zinc-500">
        첫충전(FIRST_CHARGE)과 기간 한정(LIMITED_TIME)을 JSON 배열로 편집합니다.
        입금 1건당 하나의 이벤트만 적용됩니다(첫충 우선).
      </p>
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
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={22}
        className="w-full rounded border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
      />
      <div className="flex gap-2">
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

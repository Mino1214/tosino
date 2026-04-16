"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

type Row = {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  createdAt: string;
  userLoginId: string;
  userEmail?: string | null;
  userDisplayName: string | null;
};

function typeKr(t: string) {
  switch (t) {
    case "BET":
      return "배팅";
    case "WIN":
      return "당첨";
    default:
      return t;
  }
}

export default function AgentBettingPage() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      q.set("limit", "200");
      const path = `/me/agent/betting?${q}`;
      const res = await apiFetch<{ items: Row[] }>(path);
      setItems(res.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "MASTER_AGENT") {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  if (!getAccessToken()) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">배팅 현황</h1>
        <p className="mt-1 text-sm text-zinc-500">
          하위 회원의 BET / WIN 원장입니다. 기간을 비우면 최근 건부터 표시합니다.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <label className="text-sm text-zinc-400">
          시작
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-zinc-100"
          />
        </label>
        <label className="text-sm text-zinc-400">
          종료
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-zinc-100"
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-amber-700/80 px-4 py-2 text-sm text-white hover:bg-amber-600"
        >
          조회
        </button>
      </div>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}

      {loading ? (
        <p className="text-zinc-500">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-500">내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2">회원</th>
                <th className="px-3 py-2">유형</th>
                <th className="px-3 py-2">금액</th>
                <th className="px-3 py-2">잔액 후</th>
                <th className="px-3 py-2">일시</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                >
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs text-zinc-200">
                      {r.userLoginId || r.userEmail || "—"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {r.userDisplayName ?? "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{typeKr(r.type)}</td>
                  <td
                    className={`px-3 py-2 font-mono ${
                      r.type === "WIN"
                        ? "text-emerald-400/90"
                        : "text-zinc-200"
                    }`}
                  >
                    {r.amount}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-500">
                    {r.balanceAfter}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

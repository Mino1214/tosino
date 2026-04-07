"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

type Row = {
  id: string;
  type: string;
  amount: string;
  status: string;
  note: string | null;
  depositorName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  userLoginId: string;
  userEmail?: string | null;
  userDisplayName: string | null;
};

function statusKr(s: string) {
  switch (s) {
    case "PENDING":
      return "대기";
    case "APPROVED":
      return "승인";
    case "REJECTED":
      return "거절";
    default:
      return s;
  }
}

function typeKr(t: string) {
  return t === "DEPOSIT" ? "충전" : t === "WITHDRAWAL" ? "환전" : t;
}

export default function AgentWalletRequestsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>("");
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
      if (status) q.set("status", status);
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      q.set("limit", "200");
      const path =
        q.toString().length > 0
          ? `/me/agent/wallet-requests?${q}`
          : "/me/agent/wallet-requests?limit=200";
      const res = await apiFetch<{ items: Row[] }>(path);
      setItems(res.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, from, to]);

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
        <h1 className="text-xl font-semibold text-zinc-100">입출금 조회</h1>
        <p className="mt-1 text-sm text-zinc-500">
          하위 회원의 충전·환전 신청 내역입니다.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <label className="text-sm text-zinc-400">
          상태
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-zinc-100"
          >
            <option value="">전체</option>
            <option value="PENDING">대기</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">거절</option>
          </select>
        </label>
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
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2">회원</th>
                <th className="px-3 py-2">구분</th>
                <th className="px-3 py-2">금액</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">신청일</th>
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
                  <td className="px-3 py-2 text-zinc-300">
                    {typeKr(r.type)}
                    {r.depositorName ? (
                      <span className="ml-1 text-zinc-500">
                        ({r.depositorName})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-200">
                    {r.amount}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {statusKr(r.status)}
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

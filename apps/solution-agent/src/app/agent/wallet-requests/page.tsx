"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";

type Row = {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  note: string | null;
  depositorName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  userLoginId: string;
  userEmail?: string | null;
  userDisplayName: string | null;
};

function fmtAmt(amount: string, currency: string) {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return "0";
  if (currency === "USDT") {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT";
  }
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">승인</span>;
  if (status === "REJECTED")
    return <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-500">거절</span>;
  return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">대기</span>;
}

function TypeBadge({ type, depositorName }: { type: string; depositorName: string | null }) {
  if (type === "DEPOSIT")
    return (
      <span className="flex items-center gap-1">
        <span className="rounded bg-[#3182f6]/10 px-2 py-0.5 text-[11px] font-bold text-[#3182f6]">충전</span>
        {depositorName && <span className="text-[11px] text-gray-400">{depositorName}</span>}
      </span>
    );
  return <span className="rounded bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">환전</span>;
}

export default function AgentWalletRequestsPage() {
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
      const res = await apiFetch<{ items: Row[] }>(`/me/agent/wallet-requests?${q}`);
      setItems(res.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAccessToken()) return null;

  const depositTotal = items.filter((r) => r.type === "DEPOSIT" && r.status === "APPROVED")
    .reduce((s, r) => s + Number(r.amount), 0);
  const withdrawTotal = items.filter((r) => r.type === "WITHDRAWAL" && r.status === "APPROVED")
    .reduce((s, r) => s + Number(r.amount), 0);
  const pendingCount = items.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">Wallet Requests</p>
        <h1 className="mt-0.5 text-[22px] font-bold text-black">입출금 조회</h1>
        <p className="mt-1 text-[14px] text-gray-500">하위 회원의 충전·환전 신청 내역입니다.</p>
      </div>

      {/* 요약 카드 */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border-2 border-[#3182f6]/20 bg-[#3182f6]/5 px-4 py-3">
            <p className="text-[11px] font-bold text-[#3182f6]">승인 충전 합계</p>
            <p className="mt-1 text-[20px] font-bold text-[#3182f6]">
              ₩{Math.round(depositTotal).toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-red-100 bg-red-50/60 px-4 py-3">
            <p className="text-[11px] font-bold text-red-500">승인 환전 합계</p>
            <p className="mt-1 text-[20px] font-bold text-red-500">
              ₩{Math.round(withdrawTotal).toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-[11px] font-bold text-amber-600">대기 중</p>
            <p className="mt-1 text-[20px] font-bold text-amber-600">{pendingCount}건</p>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-[13px] font-medium text-gray-700">
          상태
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900">
            <option value="">전체</option>
            <option value="PENDING">대기</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">거절</option>
          </select>
        </label>
        <label className="block text-[13px] font-medium text-gray-700">
          시작
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        <label className="block text-[13px] font-medium text-gray-700">
          종료
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="rounded-lg bg-[#3182f6] px-5 py-1.5 text-[14px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition">
          {loading ? "조회 중…" : "조회"}
        </button>
      </div>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>
      )}

      {loading ? (
        <p className="py-8 text-center text-[14px] text-gray-500">불러오는 중…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
          <p className="text-[14px] font-semibold text-gray-600">내역이 없습니다</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[14px]">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">회원</th>
                  <th className="px-4 py-3">구분</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">신청일</th>
                  <th className="px-4 py-3">처리일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50 transition ${r.status === "PENDING" ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[13px] font-semibold text-black">{r.userLoginId || r.userEmail || "—"}</p>
                      {r.userDisplayName && <p className="text-[12px] text-gray-400">{r.userDisplayName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={r.type} depositorName={r.depositorName} />
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold text-[13px] ${
                      r.type === "DEPOSIT" ? "text-[#3182f6]" : "text-red-500"
                    }`}>
                      {r.type === "WITHDRAWAL" && "−"}
                      {fmtAmt(r.amount, r.currency ?? "KRW")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-gray-500">
                      {new Date(r.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12px] text-gray-400">
                      {r.resolvedAt ? new Date(r.resolvedAt).toLocaleString("ko-KR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

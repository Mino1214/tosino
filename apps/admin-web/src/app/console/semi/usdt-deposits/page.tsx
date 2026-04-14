"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type TxStatus = "PENDING" | "AUTO_CREDITED" | "REJECTED" | "UNMATCHED";

interface UsdtTx {
  id: string;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  usdtAmount: string;
  krwRate: string;
  krwAmount: string;
  status: TxStatus;
  blockTimestamp: string | null;
  createdAt: string;
  user?: { id: string; loginId: string; displayName: string | null } | null;
  walletRequest?: { id: string; status: string } | null;
}

const STATUS_LABEL: Record<TxStatus, string> = {
  PENDING: "대기",
  AUTO_CREDITED: "자동 승인",
  REJECTED: "거절",
  UNMATCHED: "미매칭",
};

const STATUS_COLOR: Record<TxStatus, string> = {
  PENDING: "text-amber-300 bg-amber-950/40 border-amber-800/50",
  AUTO_CREDITED: "text-emerald-300 bg-emerald-950/40 border-emerald-800/50",
  REJECTED: "text-red-400 bg-red-950/40 border-red-800/50",
  UNMATCHED: "text-zinc-400 bg-zinc-800/40 border-zinc-700/50",
};

export default function UsdtDepositsPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [txs, setTxs] = useState<UsdtTx[]>([]);
  const [filter, setFilter] = useState<TxStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setErr(null);
    const qs = filter !== "ALL" ? `?status=${filter}` : "";
    apiFetch<UsdtTx[]>(`/platforms/${selectedPlatformId}/usdt-deposits${qs}`)
      .then(setTxs)
      .catch((e) => setErr(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!platformLoading && selectedPlatformId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatformId, platformLoading, filter]);

  async function handleApprove(tx: UsdtTx) {
    if (!tx.walletRequest || !selectedPlatformId) return;
    if (!confirm(`${tx.usdtAmount} USDT (${Number(tx.krwAmount).toLocaleString()}원) 수동 승인?`))
      return;
    setActionLoading(tx.id);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/wallet-requests/${tx.walletRequest.id}/approve`,
        { method: "POST", body: JSON.stringify({ resolverNote: "관리자 수동 승인 (최소 미달)" }) },
      );
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "승인 실패");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(tx: UsdtTx) {
    if (!tx.walletRequest || !selectedPlatformId) return;
    if (!confirm(`${tx.usdtAmount} USDT 입금 거절?`)) return;
    setActionLoading(tx.id);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/wallet-requests/${tx.walletRequest.id}/reject`,
        { method: "POST", body: JSON.stringify({ resolverNote: "관리자 거절" }) },
      );
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "거절 실패");
    } finally {
      setActionLoading(null);
    }
  }

  if (platformLoading || !selectedPlatformId) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">
          USDT 온체인 입금 내역
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          TronGrid(TRC20)가 감지한 입금 목록. 최소 미달 건은{" "}
          <span className="text-amber-300">대기</span> 상태로 수동 판단.
        </p>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "AUTO_CREDITED", "REJECTED", "UNMATCHED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? "border-violet-600 bg-violet-700 text-white"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {s === "ALL" ? "전체" : STATUS_LABEL[s]}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto rounded border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
        >
          새로고침
        </button>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      {loading ? (
        <p className="text-sm text-zinc-500">불러오는 중…</p>
      ) : txs.length === 0 ? (
        <p className="text-sm text-zinc-600">내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="px-4 py-3">시각</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">회원</th>
                <th className="px-4 py-3">USDT</th>
                <th className="px-4 py-3">환율</th>
                <th className="px-4 py-3">원화</th>
                <th className="px-4 py-3">보낸주소</th>
                <th className="px-4 py-3">TX Hash</th>
                <th className="px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {txs.map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-800/30">
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                    {new Date(tx.createdAt).toLocaleString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[tx.status]}`}
                    >
                      {STATUS_LABEL[tx.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.user ? (
                      <span className="text-zinc-200">
                        {tx.user.loginId}
                      </span>
                    ) : (
                      <span className="text-zinc-600">미매칭</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-amber-300">
                    {Number(tx.usdtAmount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {Number(tx.krwRate).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    {Number(tx.krwAmount).toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {tx.fromAddress.slice(0, 8)}…{tx.fromAddress.slice(-6)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                    <a
                      href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-violet-400"
                    >
                      {tx.txHash.slice(0, 8)}…
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {tx.status === "PENDING" && tx.walletRequest && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(tx)}
                          disabled={actionLoading === tx.id}
                          className="rounded bg-emerald-700 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject(tx)}
                          disabled={actionLoading === tx.id}
                          className="rounded bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-red-800 disabled:opacity-50"
                        >
                          거절
                        </button>
                      </div>
                    )}
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

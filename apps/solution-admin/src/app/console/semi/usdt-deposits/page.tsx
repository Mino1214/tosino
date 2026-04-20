"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { SemiVirtualForm } from "@/components/SemiVirtualForm";

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

type PolicyRow = {
  id: string;
  note: string | null;
  changedByLoginId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
};

const STATUS_LABEL: Record<TxStatus, string> = {
  PENDING: "대기",
  AUTO_CREDITED: "자동 승인",
  REJECTED: "거절",
  UNMATCHED: "미매칭",
};

const STATUS_COLOR: Record<TxStatus, string> = {
  PENDING: "text-amber-800 bg-amber-50 border-amber-200",
  AUTO_CREDITED: "text-emerald-800 bg-emerald-50 border-emerald-200",
  REJECTED: "text-red-700 bg-red-50 border-red-200",
  UNMATCHED: "text-gray-600 bg-gray-100 border-gray-200",
};

function snapshotLine(j: unknown): string {
  if (!j || typeof j !== "object") return "—";
  const o = j as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof o.semiVirtualEnabled === "boolean") {
    parts.push(o.semiVirtualEnabled ? "SMS·자동 Live" : "SMS·자동 꺼짐");
  }
  if (o.semiVirtualBankName) parts.push(`은행:${String(o.semiVirtualBankName)}`);
  if (o.semiVirtualAccountNumber) parts.push(`계좌:${String(o.semiVirtualAccountNumber)}`);
  if (o.semiVirtualAccountHolder) parts.push(`예금주:${String(o.semiVirtualAccountHolder)}`);
  if (o.settlementUsdtWallet) {
    const w = String(o.settlementUsdtWallet);
    parts.push(`USDT:${w.length > 12 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w}`);
  }
  if (o.semiVirtualRecipientPhone) parts.push(`수신:${String(o.semiVirtualRecipientPhone)}`);
  if (o.semiVirtualAccountHint) parts.push(`힌트:${String(o.semiVirtualAccountHint)}`);
  return parts.length ? parts.join(" · ") : "—";
}

export default function SemiVirtualHubPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [txs, setTxs] = useState<UsdtTx[]>([]);
  const [filter, setFilter] = useState<TxStatus | "ALL">("ALL");
  const [txLoading, setTxLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null);

  const [history, setHistory] = useState<PolicyRow[] | null>(null);
  const [histErr, setHistErr] = useState<string | null>(null);

  const loadTxs = useCallback(() => {
    if (!selectedPlatformId) return;
    setTxLoading(true);
    setTxErr(null);
    const qs = filter !== "ALL" ? `?status=${filter}` : "";
    apiFetch<UsdtTx[]>(`/platforms/${selectedPlatformId}/usdt-deposits${qs}`)
      .then(setTxs)
      .catch((e) => setTxErr(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setTxLoading(false));
  }, [selectedPlatformId, filter]);

  const loadHistory = useCallback(() => {
    if (!selectedPlatformId) return;
    setHistErr(null);
    apiFetch<PolicyRow[]>(
      `/platforms/${selectedPlatformId}/policy-history?policyType=semi_virtual&take=80`,
    )
      .then(setHistory)
      .catch((e) => setHistErr(e instanceof Error ? e.message : "이력 조회 실패"));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) {
      setTxs([]);
      setHistory(null);
      return;
    }
    loadTxs();
    loadHistory();
  }, [selectedPlatformId, platformLoading, loadTxs, loadHistory]);

  async function handleApprove(tx: UsdtTx) {
    if (!tx.walletRequest || !selectedPlatformId) return;
    if (!confirm(`${tx.usdtAmount} USDT (${Number(tx.krwAmount).toLocaleString()}원) 수동 승인?`)) return;
    setActionLoading(tx.id);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/wallet-requests/${tx.walletRequest.id}/approve`,
        { method: "POST", body: JSON.stringify({ resolverNote: "관리자 수동 승인 (최소 미달)" }) },
      );
      loadTxs();
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
      loadTxs();
    } catch (e) {
      alert(e instanceof Error ? e.message : "거절 실패");
    } finally {
      setActionLoading(null);
    }
  }

  if (platformLoading) {
    return <p className="text-gray-500">불러오는 중…</p>;
  }
  if (!selectedPlatformId) {
    return (
      <p className="rounded-lg border border-[#3182f6]/20 bg-[#3182f6]/5 px-4 py-3 text-sm text-gray-700">
        플랫폼 컨텍스트가 없습니다. 다시 로그인해 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-100">반가상 내역</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-zinc-400">
          원화 입금 계좌·USDT 수취 주소·SMS 자동 입금 설정을 바꾸면 <strong>교체·등록 이력</strong>이 아래에 쌓입니다.{" "}
          <strong>Live 전환</strong>은 은행 문자 자동 매칭을 켜는 단계입니다. USDT 온체인 입금은 별도 목록에서 확인합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/console/semi/sms-log" className="font-medium text-[#3182f6] hover:underline">
            SMS 입금 로그 →
          </Link>
          <Link href="/console/wallet-requests" className="text-gray-500 hover:text-gray-800 hover:underline">
            입출금 요청 처리 →
          </Link>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">테더 / 계좌 / SMS 설정</h2>
        <SemiVirtualForm platformId={selectedPlatformId} onSaved={() => void loadHistory()} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">설정·Live 전환 이력</h2>
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          저장·Live 전환·중지할 때마다 이전 값과 이후 값이 기록됩니다.
        </p>
        {histErr ? <p className="text-sm text-red-600">{histErr}</p> : null}
        {!history ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">아직 기록이 없습니다. 설정을 저장하면 이력이 쌓입니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">일시</th>
                  <th className="px-3 py-2">처리</th>
                  <th className="px-3 py-2">관리자</th>
                  <th className="px-3 py-2">변경 후 요약</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {history.map((h) => (
                  <tr key={h.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                      {new Date(h.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-800 dark:text-zinc-200">{h.note ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">{h.changedByLoginId ?? "—"}</td>
                    <td className="max-w-xl px-3 py-2 text-xs text-gray-700 dark:text-zinc-300">
                      <div className="font-medium text-emerald-800 dark:text-emerald-300">{snapshotLine(h.afterJson)}</div>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600">이전 값</summary>
                        <p className="mt-1 break-all font-mono text-[10px] text-gray-500">{snapshotLine(h.beforeJson)}</p>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button
          type="button"
          onClick={() => void loadHistory()}
          className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-zinc-200"
        >
          이력 새로고침
        </button>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">USDT 온체인 입금</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400">
            TronGrid(TRC20) 감지 내역. 최소 미달은 대기로 두고 수동 승인·거절할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "PENDING", "AUTO_CREDITED", "REJECTED", "UNMATCHED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === s
                  ? "border-[#3182f6] bg-[#3182f6] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {s === "ALL" ? "전체" : STATUS_LABEL[s]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void loadTxs()}
            className="ml-auto rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            새로고침
          </button>
        </div>
        {txErr ? <p className="text-sm text-red-600">{txErr}</p> : null}
        {txLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : txs.length === 0 ? (
          <p className="text-sm text-gray-500">내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  <th className="px-3 py-2">시각</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">회원</th>
                  <th className="px-3 py-2">USDT</th>
                  <th className="px-3 py-2">원화</th>
                  <th className="px-3 py-2">TX</th>
                  <th className="px-3 py-2">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {txs.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[tx.status]}`}
                      >
                        {STATUS_LABEL[tx.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-800 dark:text-zinc-200">
                      {tx.user ? tx.user.loginId : <span className="text-gray-400">미매칭</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-amber-800 dark:text-amber-200">
                      {Number(tx.usdtAmount).toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-gray-800 dark:text-zinc-200">
                      {Number(tx.krwAmount).toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <a
                        href={`https://tronscan.org/#/transaction/${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3182f6] hover:underline"
                      >
                        {tx.txHash.slice(0, 8)}…
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      {tx.status === "PENDING" && tx.walletRequest ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => void handleApprove(tx)}
                            disabled={actionLoading === tx.id}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(tx)}
                            disabled={actionLoading === tx.id}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            거절
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

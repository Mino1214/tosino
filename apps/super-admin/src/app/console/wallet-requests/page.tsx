"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type ReqRow = {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  note: string | null;
  depositorName: string | null;
  createdAt: string;
  /** USDT 행에 한해 서버에서 내려주는 현재 환율 (KRW per 1 USDT) */
  krwRate?: string | null;
  /** USDT 행에 한해 서버에서 내려주는 환산 KRW */
  krwAmount?: string | null;
  user: {
    id: string;
    loginId?: string | null;
    email: string | null;
    displayName: string | null;
    signupMode?: string | null;
    bankCode?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
    usdtWalletAddress?: string | null;
  };
};

function loginLabel(user: ReqRow["user"]) {
  return user.loginId || user.email || "—";
}

function signupModeLabel(mode: string | null | undefined) {
  return mode === "anonymous" ? "무기명" : "일반";
}

function amountLabel(row: ReqRow) {
  if (row.currency === "USDT") return `${Number(row.amount).toLocaleString("en-US")} USDT`;
  return `${Number(row.amount).toLocaleString("ko-KR")}원`;
}

/** USDT 행에 한해 환산 원화/환율을 부가 표기 */
function krwSubLabel(row: ReqRow) {
  if (row.currency !== "USDT" || !row.krwAmount) return null;
  const krw = Math.round(Number(row.krwAmount));
  if (!Number.isFinite(krw) || krw <= 0) return null;
  const rate = row.krwRate ? Math.round(Number(row.krwRate)) : null;
  return rate
    ? `≈ ${krw.toLocaleString("ko-KR")}원 (1 USDT = ${rate.toLocaleString("ko-KR")}원)`
    : `≈ ${krw.toLocaleString("ko-KR")}원`;
}

export default function ConsoleWalletRequestsPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<ReqRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return apiFetch<ReqRow[]>(
      `/platforms/${selectedPlatformId}/wallet-requests?status=PENDING`,
    )
      .then(setRows)
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) {
      setRows(null);
      return;
    }
    setErr(null);
    load();
  }, [load, selectedPlatformId, platformLoading]);

  async function approve(id: string) {
    if (!selectedPlatformId) return;
    setBusy(id);
    setErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/wallet-requests/${id}/approve`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    if (!selectedPlatformId) return;
    setBusy(id);
    setErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/wallet-requests/${id}/reject`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(null);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }
  if (err && !rows) {
    return <p className="text-red-400">{err}</p>;
  }
  if (!rows) {
    return <p className="text-zinc-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">
          충전·출금 요청 (대기)
        </h1>
        <button
          type="button"
          onClick={() => load()}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          새로고침
        </button>
      </div>
      <p className="text-sm text-zinc-500">
        데모: 회원 신청 → 승인 시 잔액 반영
      </p>
      {err && <p className="text-sm text-red-400">{err}</p>}
      {rows.length === 0 ? (
        <p className="text-zinc-500">대기 중인 요청이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">회원</th>
                  <th className="px-4 py-2">가입유형</th>
                  <th className="px-4 py-2">유형</th>
                  <th className="px-4 py-2">금액</th>
                  <th className="px-4 py-2">출금/입금 기준</th>
                  <th className="px-4 py-2">입금자명</th>
                  <th className="px-4 py-2">메모</th>
                  <th className="px-4 py-2">일시</th>
                <th className="px-4 py-2">처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/80">
                  <td className="px-4 py-2 text-zinc-200">
                    {loginLabel(r.user)}
                    <br />
                    <span className="text-xs text-zinc-500">
                      {r.user.displayName ?? ""}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
                    {signupModeLabel(r.user.signupMode)}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
                    {r.type} / {r.currency}
                  </td>
                  <td className="px-4 py-2 font-mono text-zinc-200">
                    <div>{amountLabel(r)}</div>
                    {krwSubLabel(r) ? (
                      <div className="mt-0.5 text-[11px] font-normal text-zinc-400">
                        {krwSubLabel(r)}
                      </div>
                    ) : null}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-2 text-xs text-zinc-400">
                    {r.currency === "USDT"
                      ? r.user.usdtWalletAddress ?? "지갑 미등록"
                      : r.user.bankAccountNumber
                        ? `${r.user.bankAccountHolder ?? ""} · ${r.user.bankAccountNumber}`
                        : "계좌 미등록"}
                  </td>
                  <td className="max-w-[100px] truncate px-4 py-2 text-zinc-300">
                    {r.depositorName ?? "—"}
                  </td>
                  <td className="max-w-[140px] truncate px-4 py-2 text-zinc-500">
                    {r.note ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => approve(r.id)}
                        className="rounded bg-emerald-800 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => reject(r.id)}
                        className="rounded border border-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-950/30 disabled:opacity-50"
                      >
                        거절
                      </button>
                    </div>
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

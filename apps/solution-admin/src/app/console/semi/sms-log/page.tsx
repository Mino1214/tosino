"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type Row = {
  id: string;
  platformId: string | null;
  status: string;
  statusLabelKo: string;
  outcomeCategory: string;
  outcomeCategoryKo: string;
  failureReason: string | null;
  sender: string | null;
  recipientPhoneSnapshot: string | null;
  parsedJson: unknown;
  rawBody: string;
  matchedWalletRequestId: string | null;
  semiVirtualDeviceMatch: boolean;
  createdAt: string;
};

type WalletHistoryRow = {
  id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  depositorName: string | null;
  note: string | null;
  user: {
    loginId?: string | null;
    email: string | null;
    displayName: string | null;
  };
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "상태(전체)" },
  { value: "AUTO_CREDITED", label: "자동 입금 완료" },
  { value: "NO_MATCH", label: "입금 신청 없음/불일치" },
  { value: "NO_PLATFORM", label: "플랫폼·힌트 불일치" },
  { value: "PARSE_ERROR", label: "본문 파싱 실패" },
  { value: "IGNORE_WITHDRAWAL", label: "출금 문자" },
  { value: "DUPLICATE", label: "중복" },
];

function buildQuery(status: string, deviceOnly: boolean): string {
  const q = new URLSearchParams();
  if (status) q.set("status", status);
  if (deviceOnly) q.set("deviceMatch", "true");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default function SolutionAdminSemiSmsLogPage() {
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [walletRows, setWalletRows] = useState<WalletHistoryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [deviceOnly, setDeviceOnly] = useState(false);

  const queryStr = useMemo(
    () => buildQuery(statusFilter, deviceOnly),
    [statusFilter, deviceOnly],
  );

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return Promise.all([
      apiFetch<Row[]>(`/platforms/${selectedPlatformId}/bank-sms-ingests${queryStr}`),
      apiFetch<WalletHistoryRow[]>(`/platforms/${selectedPlatformId}/wallet-requests`),
    ])
      .then(([sms, wallet]) => {
        setRows(sms);
        setWalletRows(wallet);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"));
  }, [selectedPlatformId, queryStr]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) {
      setRows(null);
      setWalletRows(null);
      return;
    }
    setErr(null);
    void load();
  }, [load, selectedPlatformId, platformLoading]);

  if (platformLoading) {
    return <p className="text-gray-500">불러오는 중…</p>;
  }
  if (!selectedPlatformId) {
    return (
      <p className="rounded-lg border border-[#3182f6]/20 bg-[#3182f6]/5 px-4 py-3 text-sm text-gray-700">
        플랫폼 컨텍스트가 없습니다.
      </p>
    );
  }

  if (err && !rows) {
    return <p className="text-red-600">{err}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-100">SMS 입금 로그</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-zinc-400">
            반가상에 등록한 수신 번호로 들어온 문자 기록입니다. 자동 입금 여부는 상태 열에서 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/console/semi/usdt-deposits" className="text-sm font-medium text-[#3182f6] hover:underline">
            ← 반가상 내역
          </Link>
          <Link href="/console/wallet-requests" className="text-sm text-gray-500 hover:text-gray-800 hover:underline">
            입출금 요청
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            새로고침
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <label className="text-xs text-gray-500 dark:text-zinc-400">
          필터
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={deviceOnly}
            onChange={(e) => setDeviceOnly(e.target.checked)}
            className="rounded border-gray-300 dark:border-zinc-600"
          />
          등록 기기(수신번호)로 귀속된 문자만
        </label>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {!rows ? (
        <p className="text-gray-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">조건에 맞는 기록이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">시각</th>
                <th className="px-3 py-2">구분</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">기기</th>
                <th className="px-3 py-2">수신번호</th>
                <th className="px-3 py-2">메모</th>
                <th className="px-3 py-2">본문</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 align-top dark:border-zinc-800/80">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-xs text-gray-800 dark:text-zinc-300">
                    {r.outcomeCategoryKo}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={
                        r.status === "AUTO_CREDITED"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : r.status === "NO_MATCH" ||
                              r.status === "PARSE_ERROR" ||
                              r.status === "NO_PLATFORM"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-gray-600 dark:text-zinc-400"
                      }
                    >
                      {r.statusLabelKo}
                    </span>
                    {r.matchedWalletRequestId ? (
                      <div className="mt-0.5 font-mono text-[10px] text-gray-400">
                        wr: {r.matchedWalletRequestId.slice(0, 8)}…
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-center text-xs">
                    {r.semiVirtualDeviceMatch ? (
                      <span className="text-emerald-700 dark:text-emerald-400" title="등록 수신번호로 귀속">
                        연동
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-zinc-400">
                    {r.recipientPhoneSnapshot ?? "—"}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-xs text-gray-500">{r.failureReason ?? "—"}</td>
                  <td className="max-w-md px-3 py-2">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-gray-500 dark:text-zinc-500">
                      {r.rawBody.length > 400 ? `${r.rawBody.slice(0, 400)}…` : r.rawBody}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-zinc-100">최근 입출금 신청</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">SMS 로그와 함께 보면 매칭 여부를 가늠할 수 있습니다.</p>
        </div>
        {!walletRows ? (
          <p className="text-gray-500">불러오는 중…</p>
        ) : walletRows.length === 0 ? (
          <p className="text-gray-500">최근 입출금 신청이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-700">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">회원</th>
                  <th className="px-3 py-2">유형</th>
                  <th className="px-3 py-2">금액</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">메모</th>
                  <th className="px-3 py-2">시각</th>
                </tr>
              </thead>
              <tbody>
                {walletRows.slice(0, 12).map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-zinc-800/80">
                    <td className="px-3 py-2 text-gray-900 dark:text-zinc-200">
                      {row.user.loginId || row.user.email || "—"}
                      <div className="text-xs text-gray-500">{row.user.displayName ?? ""}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-zinc-300">
                      {row.type === "DEPOSIT"
                        ? row.currency === "USDT"
                          ? "테더 입금"
                          : "원화 입금"
                        : row.currency === "USDT"
                          ? "테더 출금"
                          : "원화 출금"}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-900 dark:text-zinc-200">
                      {row.currency === "USDT"
                        ? `${Number(row.amount).toLocaleString("en-US")} USDT`
                        : `${Number(row.amount).toLocaleString("ko-KR")}원`}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          row.status === "APPROVED"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : row.status === "REJECTED"
                              ? "text-red-600 dark:text-rose-400"
                              : "text-amber-700 dark:text-amber-400"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-xs text-gray-500">
                      {row.depositorName || row.note || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(row.createdAt).toLocaleString("ko-KR")}
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

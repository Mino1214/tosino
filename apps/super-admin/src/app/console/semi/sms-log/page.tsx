"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
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

export default function SemiSmsLogPage() {
  const router = useRouter();
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
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "SUPER_ADMIN") {
      router.replace("/console/sales");
      return;
    }
    if (!selectedPlatformId || platformLoading) {
      setRows(null);
      setWalletRows(null);
      return;
    }
    setErr(null);
    void load();
  }, [load, router, selectedPlatformId, platformLoading]);

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  if (err && !rows) {
    return <p className="text-red-400">{err}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">SMS 입금 로그</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            반가상에 등록한 수신 번호로 들어온 문자는,{" "}
            <strong className="text-zinc-400">대기 입금 신청이 없어도</strong>{" "}
            여기에 남습니다. &quot;구분&quot; 열에서 기기 수신만 된 경우와 자동
            입금 완료를 구분할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/console/wallet-requests"
            className="text-sm text-teal-400 hover:text-teal-300"
          >
            실제 입출금 요청 보기
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            새로고침
          </button>
        </div>
      </div>

      <Link
        href="/console/semi/settings"
        className="text-sm text-violet-400 hover:text-violet-300"
      >
        ← 반가상 설정
      </Link>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <label className="text-xs text-zinc-500">
          필터
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={deviceOnly}
            onChange={(e) => setDeviceOnly(e.target.checked)}
            className="rounded border-zinc-600"
          />
          등록 기기(수신번호)로 귀속된 문자만
        </label>
      </div>

      {err && <p className="text-sm text-red-400">{err}</p>}

      {!rows ? (
        <p className="text-zinc-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-zinc-500">조건에 맞는 기록이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
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
                <tr key={r.id} className="border-b border-zinc-800/80 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-xs text-zinc-300">
                    {r.outcomeCategoryKo}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={
                        r.status === "AUTO_CREDITED"
                          ? "text-emerald-400"
                          : r.status === "NO_MATCH" ||
                              r.status === "PARSE_ERROR" ||
                              r.status === "NO_PLATFORM"
                            ? "text-amber-400"
                            : "text-zinc-400"
                      }
                    >
                      {r.statusLabelKo}
                    </span>
                    <div className="mt-0.5 font-mono text-[10px] text-zinc-600">
                      {r.status}
                    </div>
                    {r.matchedWalletRequestId && (
                      <div className="mt-0.5 font-mono text-[10px] text-zinc-600">
                        wr: {r.matchedWalletRequestId.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-center text-xs">
                    {r.semiVirtualDeviceMatch ? (
                      <span className="text-emerald-400/90" title="등록 수신번호로 플랫폼에 귀속">
                        연동
                      </span>
                    ) : (
                      <span className="text-zinc-600" title="번호 미전달 또는 미등록">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                    {r.recipientPhoneSnapshot ?? "—"}
                  </td>
                  <td className="max-w-[220px] px-3 py-2 text-xs text-zinc-500">
                    {r.failureReason ?? "—"}
                  </td>
                  <td className="max-w-md px-3 py-2">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-zinc-500">
                      {r.rawBody.length > 400
                        ? `${r.rawBody.slice(0, 400)}…`
                        : r.rawBody}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div>
          <h2 className="text-lg font-medium text-zinc-100">
            최근 실제 입출금 이력
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            반가상 문자 로그와 별개로, 이 플랫폼에서 실제로 생성된 입금/출금 신청과
            승인 상태를 같이 보여줍니다.
          </p>
        </div>
        {!walletRows ? (
          <p className="text-zinc-500">불러오는 중…</p>
        ) : walletRows.length === 0 ? (
          <p className="text-zinc-500">최근 입출금 신청이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
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
                  <tr key={row.id} className="border-b border-zinc-800/80">
                    <td className="px-3 py-2 text-zinc-200">
                      {row.user.loginId || row.user.email || "—"}
                      <div className="text-xs text-zinc-500">
                        {row.user.displayName ?? ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {row.type === "DEPOSIT"
                        ? row.currency === "USDT"
                          ? "테더 입금"
                          : "원화 입금"
                        : row.currency === "USDT"
                          ? "테더 출금"
                          : "원화 출금"}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-200">
                      {row.currency === "USDT"
                        ? `${Number(row.amount).toLocaleString("en-US")} USDT`
                        : `${Number(row.amount).toLocaleString("ko-KR")}원`}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          row.status === "APPROVED"
                            ? "text-emerald-400"
                            : row.status === "REJECTED"
                              ? "text-rose-400"
                              : "text-amber-400"
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-xs text-zinc-500">
                      {row.depositorName || row.note || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {new Date(row.createdAt).toLocaleString()}
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

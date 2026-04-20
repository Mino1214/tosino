"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type CreditSummary = {
  totalDeposited: number;
  totalAllocated: number;
  remaining: number;
  pendingRequestCount: number;
  totalCreditBalance: number;
};

type PlatformCreditRow = {
  id: string;
  name: string;
  slug: string;
  totalAllocated: number;
  creditBalance: number;
};

type VendorDeposit = {
  id: string;
  amountKrw: string;
  note: string | null;
  createdAt: string;
};

type CreditRequestRow = {
  id: string;
  platformId: string;
  platform: { id: string; name: string; slug: string };
  requestedAmountKrw: string;
  requesterNote: string | null;
  status: string;
  approvedAmountKrw: string | null;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

type ReserveSummary = {
  platformId: string;
  platformName: string;
  platformSlug: string;
  enabled: boolean;
  restoreEnabled: boolean;
  rate: string | null;
  manualOverrideRate: string | null;
  policyCasinoBillingPct: string | null;
  currentAmount: string;
  initialAmount: string;
  remainingHeadroom: string;
  todayDeductAmount: string;
  todayRestoreAmount: string;
  todayNetChange: string;
  todayDeductCount: number;
  todayRestoreCount: number;
};

type ReserveLogItem = {
  id: string;
  type: string;
  baseAmount: string;
  rate: string;
  computedAmount: string;
  changedAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  initialAmount: string;
  eventKey: string | null;
  note: string | null;
  createdAt: string;
};

type ReserveLogsResponse = { total: number; items: ReserveLogItem[] };

function krw(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

function ReqStatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">승인</span>;
  if (status === "REJECTED")
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-300">거절</span>;
  return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">대기</span>;
}

export function CreditsHub({ focusRequests = false }: { focusRequests?: boolean }) {
  const { selectedPlatformId: barPlatformId } = usePlatform();
  const requestsRef = useRef<HTMLDivElement>(null);

  const [summary, setSummary] = useState<CreditSummary | null>(null);
  const [byPlatform, setByPlatform] = useState<PlatformCreditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [deposits, setDeposits] = useState<VendorDeposit[]>([]);
  const [includeSimVendorDeposits, setIncludeSimVendorDeposits] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depNote, setDepNote] = useState("");
  const [depSubmitting, setDepSubmitting] = useState(false);

  const [reqStatus, setReqStatus] = useState<string>("");
  const [reqPlatformFilter, setReqPlatformFilter] = useState<string>("");
  const [requests, setRequests] = useState<CreditRequestRow[]>([]);
  const [reqTotal, setReqTotal] = useState(0);
  const [reqLoading, setReqLoading] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [resolveAmount, setResolveAmount] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  const [settingsPlatformId, setSettingsPlatformId] = useState<string>("");
  const [reserveSummary, setReserveSummary] = useState<ReserveSummary | null>(null);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveErr, setReserveErr] = useState<string | null>(null);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formRestore, setFormRestore] = useState(true);
  /** 수동 폴백 비율 % (0~100), API는 0~1 소수 */
  const [formRatePct, setFormRatePct] = useState("");
  const [reserveSaving, setReserveSaving] = useState(false);
  const [recoverAmount, setRecoverAmount] = useState("");
  const [recoverNote, setRecoverNote] = useState("");
  const [recoverSubmitting, setRecoverSubmitting] = useState(false);

  const [logPlatformId, setLogPlatformId] = useState<string>("");
  const [logPageSize, setLogPageSize] = useState<10 | 20>(10);
  const [logPage, setLogPage] = useState(0);
  const [logs, setLogs] = useState<ReserveLogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsErr, setLogsErr] = useState<string | null>(null);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [s, p] = await Promise.all([
        apiFetch<CreditSummary>("/hq/credits/summary"),
        apiFetch<PlatformCreditRow[]>("/hq/credits/platform-summary"),
      ]);
      setSummary(s);
      setByPlatform(p);
      setLogPlatformId((prev) => pickPlatformId(prev, p, barPlatformId));
      setSettingsPlatformId((prev) => pickPlatformId(prev, p, barPlatformId));
      setReqPlatformFilter((prev) => (prev && p.some((x) => x.id === prev) ? prev : ""));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오지 못했습니다");
      setSummary(null);
      setByPlatform([]);
    } finally {
      setLoading(false);
    }
  }, [barPlatformId]);

  const loadDeposits = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      q.set("limit", "30");
      if (includeSimVendorDeposits) q.set("includeSimulation", "1");
      const res = await apiFetch<{ items: VendorDeposit[] }>(`/hq/credits/vendor-deposits?${q}`);
      setDeposits(res.items ?? []);
    } catch {
      setDeposits([]);
    }
  }, [includeSimVendorDeposits]);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("limit", "80");
      q.set("offset", "0");
      if (reqStatus) q.set("status", reqStatus);
      if (reqPlatformFilter) q.set("platformId", reqPlatformFilter);
      const res = await apiFetch<{ items: CreditRequestRow[]; total: number }>(
        `/hq/credits/requests?${q}`,
      );
      setRequests(res.items ?? []);
      setReqTotal(res.total ?? 0);
    } catch {
      setRequests([]);
      setReqTotal(0);
    } finally {
      setReqLoading(false);
    }
  }, [reqStatus, reqPlatformFilter]);

  const loadReserve = useCallback(async (platformId: string) => {
    if (!platformId) {
      setReserveSummary(null);
      return;
    }
    setReserveLoading(true);
    setReserveErr(null);
    try {
      const s = await apiFetch<ReserveSummary>(`/hq/credits/reserve/${platformId}/summary`);
      setReserveSummary(s);
      setFormEnabled(s.enabled);
      setFormRestore(s.restoreEnabled);
      const manual = s.manualOverrideRate != null ? Number(s.manualOverrideRate) * 100 : "";
      setFormRatePct(manual === "" || !Number.isFinite(manual) ? "" : String(Math.round(manual * 1e6) / 1e6));
    } catch (e) {
      setReserveErr(e instanceof Error ? e.message : "알 요약 조회 실패");
      setReserveSummary(null);
    } finally {
      setReserveLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async (platformId: string, page: number, pageSize: number) => {
    if (!platformId) {
      setLogs(null);
      return;
    }
    setLogsLoading(true);
    setLogsErr(null);
    const offset = page * pageSize;
    try {
      const data = await apiFetch<ReserveLogsResponse>(
        `/hq/credits/reserve/${platformId}/logs?limit=${pageSize}&offset=${offset}`,
      );
      setLogs(data);
      if (data.total === 0) {
        if (page !== 0) setLogPage(0);
      } else {
        const maxPage = Math.max(0, Math.ceil(data.total / pageSize) - 1);
        if (page > maxPage) setLogPage(maxPage);
      }
    } catch (e) {
      setLogsErr(e instanceof Error ? e.message : "로그를 불러오지 못했습니다");
      setLogs(null);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
    void loadDeposits();
  }, [loadCore, loadDeposits]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    void loadReserve(settingsPlatformId);
  }, [settingsPlatformId, loadReserve]);

  useEffect(() => {
    if (logPlatformId) void loadLogs(logPlatformId, logPage, logPageSize);
  }, [logPlatformId, logPage, logPageSize, loadLogs]);

  useEffect(() => {
    if (focusRequests && requestsRef.current) {
      requestsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusRequests]);

  const logTotalPages = logs && logPageSize > 0 ? Math.max(1, Math.ceil(logs.total / logPageSize)) : 1;
  const logPageDisplay = Math.min(logPage + 1, logTotalPages);

  async function submitVendorDeposit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(depAmount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("본사 입금액을 올바르게 입력하세요.");
      return;
    }
    setDepSubmitting(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch("/hq/credits/vendor-deposits", {
        method: "POST",
        body: JSON.stringify({ amountKrw: amt, note: depNote.trim() || undefined }),
      });
      setDepAmount("");
      setDepNote("");
      setMsg("본사 입금이 등록되었습니다.");
      await loadCore();
      await loadDeposits();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setDepSubmitting(false);
    }
  }

  async function deleteDeposit(id: string) {
    if (!confirm("이 본사 입금 기록을 삭제할까요?")) return;
    try {
      await apiFetch(`/hq/credits/vendor-deposits/${id}`, { method: "DELETE" });
      setMsg("삭제했습니다.");
      await loadCore();
      await loadDeposits();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  async function submitResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveId) return;
    setResolveSubmitting(true);
    setErr(null);
    try {
      const body: {
        status: "APPROVED" | "REJECTED";
        approvedAmountKrw?: number;
        adminNote?: string;
      } = { status: resolveAction, adminNote: resolveNote.trim() || undefined };
      if (resolveAction === "APPROVED") {
        const amt = Number(resolveAmount.replace(/,/g, ""));
        if (!Number.isFinite(amt) || amt <= 0) {
          setErr("승인 금액을 입력하세요.");
          setResolveSubmitting(false);
          return;
        }
        body.approvedAmountKrw = amt;
      }
      await apiFetch(`/hq/credits/requests/${resolveId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setResolveId(null);
      setResolveAmount("");
      setResolveNote("");
      setMsg("요청을 처리했습니다.");
      await loadCore();
      await loadRequests();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setResolveSubmitting(false);
    }
  }

  async function saveReserveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsPlatformId) return;
    const pct = formRatePct.trim() === "" ? null : Number(formRatePct);
    if (pct != null && (pct < 0 || pct > 100)) {
      setReserveErr("수동 비율은 0~100% 사이로 입력하세요.");
      return;
    }
    const ratePct = pct == null ? null : pct / 100;
    setReserveSaving(true);
    setReserveErr(null);
    setMsg(null);
    try {
      await apiFetch(`/hq/credits/reserve/${settingsPlatformId}/settings`, {
        method: "PATCH",
        body: JSON.stringify({
          enabled: formEnabled,
          restoreEnabled: formRestore,
          ratePct,
        }),
      });
      setMsg("알(리저브) 설정을 저장했습니다.");
      await loadReserve(settingsPlatformId);
      await loadCore();
    } catch (e) {
      setReserveErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setReserveSaving(false);
    }
  }

  async function submitRecover(e: React.FormEvent) {
    e.preventDefault();
    if (!settingsPlatformId) return;
    const amt = Number(recoverAmount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setReserveErr("회수 금액(원)을 올바르게 입력하세요.");
      return;
    }
    setRecoverSubmitting(true);
    setReserveErr(null);
    setMsg(null);
    try {
      await apiFetch(`/hq/credits/reserve/${settingsPlatformId}/hq-recover`, {
        method: "POST",
        body: JSON.stringify({
          amountKrw: Math.round(amt),
          note: recoverNote.trim() || undefined,
        }),
      });
      setRecoverAmount("");
      setRecoverNote("");
      setMsg("플랫폼 알 회수를 반영했습니다.");
      await loadReserve(settingsPlatformId);
      await loadCore();
      if (logPlatformId === settingsPlatformId) {
        await loadLogs(settingsPlatformId, logPage, logPageSize);
      }
    } catch (err) {
      setReserveErr(err instanceof Error ? err.message : "회수 실패");
    } finally {
      setRecoverSubmitting(false);
    }
  }

  const pendingRow = requests.find((r) => r.id === resolveId);

  return (
    <div className="space-y-10">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">알값 · 크레딧 허브</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              본사 입금·플랫폼 충전 요청·알 배율(리저브)·변동 로그를 한곳에서 다룹니다. 정책 청구율 전체는{" "}
              <Link href="/console/operational" className="font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
                알값 / 정책
              </Link>
              에서 솔루션 선택 후 편집하세요.
            </p>
          </div>
          {focusRequests ? (
            <Link
              href="/console/credits"
              className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              전체 허브 보기 →
            </Link>
          ) : (
            <Link
              href="/console/credits/requests"
              className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              충전 요청만 보기 →
            </Link>
          )}
        </div>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          {msg}
        </div>
      ) : null}

      {loading && !summary ? (
        <p className="text-sm text-gray-500 dark:text-zinc-400">불러오는 중…</p>
      ) : null}

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[
            {
              label: "본사 총 입금",
              value: `${krw(summary.totalDeposited)}원`,
              sub: "수동 등록만 (테스트 시나리오 자동분 제외)",
            },
            { label: "플랫폼 배정 누적", value: `${krw(summary.totalAllocated)}원`, sub: null },
            { label: "본사 잔여", value: `${krw(summary.remaining)}원`, sub: "충전 − 배정" },
            { label: "플랫폼 알 잔액 Σ", value: `${krw(summary.totalCreditBalance)}원`, sub: null },
            {
              label: "승인 대기",
              value: `${summary.pendingRequestCount}건`,
              sub: summary.pendingRequestCount > 0 ? "처리 필요" : "대기 없음",
            },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">{c.label}</p>
              <p className="mt-2 text-lg font-bold tabular-nums text-gray-900 dark:text-zinc-50">{c.value}</p>
              {c.sub ? <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">{c.sub}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">본사 입금 (벤더·상위 충전 기록)</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
          HQ가 상위에 납입한 금액을 수동으로 적으면 &quot;본사 총 입금&quot;에 반영됩니다. 자동 테스트·시뮬레이션이 만든 입금 행(
          <span className="font-mono">testscenario:</span> 메모)은 목록·집계에서 빼 두었습니다.
        </p>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          <input
            type="checkbox"
            checked={includeSimVendorDeposits}
            onChange={(e) => setIncludeSimVendorDeposits(e.target.checked)}
            className="rounded border-gray-300 dark:border-zinc-600"
          />
          테스트/시뮬 자동 입금까지 목록에 표시 (디버그)
        </label>
        <form onSubmit={submitVendorDeposit} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">금액 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              value={depAmount}
              onChange={(e) => setDepAmount(e.target.value)}
              placeholder="예: 1000000"
              className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs text-gray-500">메모</label>
            <input
              type="text"
              value={depNote}
              onChange={(e) => setDepNote(e.target.value)}
              placeholder="이체 확인 등"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={depSubmitting}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {depSubmitting ? "등록 중…" : "입금 등록"}
          </button>
        </form>
        {deposits.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="border-b text-gray-500 dark:text-zinc-400">
                <tr>
                  <th className="py-2 pr-3">일시</th>
                  <th className="py-2 pr-3 text-right">금액</th>
                  <th className="py-2 pr-3">메모</th>
                  <th className="py-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 dark:border-zinc-800">
                    <td className="py-2 pr-3 font-mono text-gray-600 dark:text-zinc-400">
                      {new Date(d.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{krw(Number(d.amountKrw))}원</td>
                    <td className="py-2 pr-3 text-gray-600 dark:text-zinc-300">{d.note ?? "—"}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => void deleteDeposit(d.id)}
                        className="text-red-600 hover:underline dark:text-red-400"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-400">등록된 본사 입금이 없습니다.</p>
        )}
      </section>

      {byPlatform.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-zinc-200">플랫폼별 배정 · 알 잔액</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/40">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">솔루션</th>
                  <th className="px-4 py-3 font-medium">슬러그</th>
                  <th className="px-4 py-3 font-medium text-right">배정 누적</th>
                  <th className="px-4 py-3 font-medium text-right">알 잔액</th>
                </tr>
              </thead>
              <tbody>
                {byPlatform.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-zinc-800/80">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">{r.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-zinc-400">{r.slug}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-800 dark:text-zinc-200">
                      {krw(r.totalAllocated)}원
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-800 dark:text-zinc-200">
                      {krw(r.creditBalance)}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section ref={requestsRef} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">플랫폼 알 충전 요청 (전체)</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
          솔루션 관리자가 올린 크레딧 충전 요청을 승인/거절합니다. ({reqTotal.toLocaleString("ko-KR")}건 중 최근 {requests.length}건)
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={reqStatus}
            onChange={(e) => setReqStatus(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">전체 상태</option>
            <option value="PENDING">대기</option>
            <option value="APPROVED">승인됨</option>
            <option value="REJECTED">거절됨</option>
          </select>
          <select
            value={reqPlatformFilter}
            onChange={(e) => setReqPlatformFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">전체 솔루션</option>
            {byPlatform.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadRequests()}
            disabled={reqLoading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600 dark:text-zinc-200"
          >
            새로고침
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b text-gray-500 dark:text-zinc-400">
              <tr>
                <th className="py-2 pr-2">솔루션</th>
                <th className="py-2 pr-2">요청액</th>
                <th className="py-2 pr-2">상태</th>
                <th className="py-2 pr-2">요청일</th>
                <th className="py-2 pr-2">메모</th>
                <th className="py-2 w-24">처리</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 dark:border-zinc-800/80">
                  <td className="py-2 pr-2 font-medium text-gray-900 dark:text-zinc-100">{r.platform?.name ?? r.platformId}</td>
                  <td className="py-2 pr-2 font-mono">{krw(Number(r.requestedAmountKrw))}원</td>
                  <td className="py-2 pr-2">
                    <ReqStatusBadge status={r.status} />
                  </td>
                  <td className="py-2 pr-2 font-mono text-gray-600 dark:text-zinc-400">
                    {new Date(r.createdAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="max-w-[200px] truncate py-2 pr-2 text-gray-500" title={r.requesterNote ?? ""}>
                    {r.requesterNote ?? "—"}
                  </td>
                  <td className="py-2">
                    {r.status === "PENDING" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setResolveId(r.id);
                          setResolveAction("APPROVED");
                          setResolveAmount(String(Math.round(Number(r.requestedAmountKrw))));
                          setResolveNote("");
                        }}
                        className="text-violet-600 hover:underline dark:text-violet-400"
                      >
                        처리
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && !reqLoading ? (
            <p className="mt-2 text-sm text-gray-400">조건에 맞는 요청이 없습니다.</p>
          ) : null}
        </div>

        {resolveId && pendingRow ? (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">요청 처리 · {pendingRow.platform?.name}</p>
            <form onSubmit={submitResolve} className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={resolveAction === "APPROVED"}
                    onChange={() => setResolveAction("APPROVED")}
                  />
                  승인
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={resolveAction === "REJECTED"}
                    onChange={() => setResolveAction("REJECTED")}
                  />
                  거절
                </label>
              </div>
              {resolveAction === "APPROVED" ? (
                <div>
                  <label className="mb-1 block text-xs text-gray-500">승인 금액 (원)</label>
                  <input
                    type="text"
                    value={resolveAmount}
                    onChange={(e) => setResolveAmount(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs text-gray-500">관리자 메모</label>
                <input
                  type="text"
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={resolveSubmitting}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {resolveSubmitting ? "처리 중…" : "확인"}
                </button>
                <button
                  type="button"
                  onClick={() => setResolveId(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-zinc-600 dark:text-zinc-200"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">플랫폼 알 배율 · 실시간 리저브</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
          카지노 버킷 베팅에 대한 가상 알 차감/복구 비율입니다. <strong>솔루션 정책(청구율)</strong>이 있으면 실시간 계산에는 정책이 우선되고, 아래 값은{" "}
          <strong>폴백(수동 %)</strong>으로 저장됩니다. 상세 정책 편집은{" "}
          <Link href="/console/operational" className="text-violet-600 underline dark:text-violet-400">
            알값 / 정책
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="reserve-platform" className="mb-1 block text-xs text-gray-500">
              솔루션
            </label>
            <select
              id="reserve-platform"
              value={settingsPlatformId}
              onChange={(e) => setSettingsPlatformId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">— 선택 —</option>
              {byPlatform.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {reserveErr ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{reserveErr}</p>
        ) : null}
        {reserveLoading && !reserveSummary ? (
          <p className="mt-3 text-sm text-gray-400">불러오는 중…</p>
        ) : null}
        {reserveSummary ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-gray-500">정책 카지노 청구율 (%)</p>
                <p className="mt-1 font-mono font-semibold text-gray-900 dark:text-zinc-100">
                  {reserveSummary.policyCasinoBillingPct ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-gray-500">실효 비율 (표시, 소수)</p>
                <p className="mt-1 font-mono font-semibold text-gray-900 dark:text-zinc-100">{reserveSummary.rate ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-gray-500">현재 알 / 상한</p>
                <p className="mt-1 font-mono font-semibold text-gray-900 dark:text-zinc-100">
                  {krw(Number(reserveSummary.currentAmount))} / {krw(Number(reserveSummary.initialAmount))}원
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-gray-500">오늘 차감 / 복구 (건수)</p>
                <p className="mt-1 font-mono text-gray-900 dark:text-zinc-100">
                  {krw(Number(reserveSummary.todayDeductAmount))} / {krw(Number(reserveSummary.todayRestoreAmount))}원 ({reserveSummary.todayDeductCount} / {reserveSummary.todayRestoreCount})
                </p>
              </div>
            </div>
            <form onSubmit={saveReserveSettings} className="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-zinc-800">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} />
                실시간 알 반영 (reserveEnabled)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formRestore} onChange={(e) => setFormRestore(e.target.checked)} />
                승리 시 가상 복구 (restoreEnabled)
              </label>
              <div>
                <label className="mb-1 block text-xs text-gray-500">수동 폴백 비율 (% · 비우면 수동값 제거)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formRatePct}
                  onChange={(e) => setFormRatePct(e.target.value)}
                  placeholder="예: 7 (= 7%, 정책 없을 때)"
                  className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                disabled={reserveSaving || !settingsPlatformId}
                className="w-fit rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {reserveSaving ? "저장 중…" : "설정 저장"}
              </button>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-4 dark:border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-zinc-400">
                플랫폼 알 회수 (HQ)
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                솔루션에 남은 가상 알(크레딧)을 본사 기준으로 되돌립니다. 현재 알 잔액과 상한(initial)이 같은 원화만큼 함께 줄어듭니다.
              </p>
              <form onSubmit={(ev) => void submitRecover(ev)} className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">회수 금액 (원)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={recoverAmount}
                    onChange={(e) => setRecoverAmount(e.target.value)}
                    placeholder="예: 500000"
                    disabled={!settingsPlatformId}
                    className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="min-w-[12rem] flex-1">
                  <label className="mb-1 block text-xs text-gray-500">메모</label>
                  <input
                    type="text"
                    value={recoverNote}
                    onChange={(e) => setRecoverNote(e.target.value)}
                    placeholder="회수 사유 등"
                    disabled={!settingsPlatformId}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recoverSubmitting || !settingsPlatformId}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  {recoverSubmitting ? "처리 중…" : "알 회수 반영"}
                </button>
              </form>
            </div>
          </div>
        ) : !settingsPlatformId ? (
          <p className="mt-3 text-sm text-gray-400">솔루션을 선택하세요.</p>
        ) : null}
      </section>

      {byPlatform.length > 0 ? (
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">알 변동 로그 (플랫폼별)</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="credit-log-platform" className="text-xs text-gray-500 dark:text-zinc-400">
                솔루션
              </label>
              <select
                id="credit-log-platform"
                value={logPlatformId}
                onChange={(e) => {
                  setLogPlatformId(e.target.value);
                  setLogPage(0);
                }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {byPlatform.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label htmlFor="credit-log-page-size" className="text-xs text-gray-500 dark:text-zinc-400">
                페이지
              </label>
              <select
                id="credit-log-page-size"
                value={logPageSize}
                onChange={(e) => {
                  setLogPageSize(Number(e.target.value) as 10 | 20);
                  setLogPage(0);
                }}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value={10}>10건</option>
                <option value={20}>20건</option>
              </select>
              <button
                type="button"
                onClick={() => logPlatformId && void loadLogs(logPlatformId, logPage, logPageSize)}
                disabled={logsLoading || !logPlatformId}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {logsLoading ? "불러오는 중…" : "새로고침"}
              </button>
            </div>
          </div>
          <p className="mb-2 text-xs text-gray-400 dark:text-zinc-500">
            왼쪽 바에서 고른 솔루션이 있으면 로그·설정 기본 선택에 반영됩니다.
          </p>
          {logsErr ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              {logsErr}
            </div>
          ) : null}
          {!logsErr && logs && logs.items.length === 0 && !logsLoading ? (
            <p className="text-sm text-gray-400 dark:text-zinc-500">이 플랫폼에 기록된 로그가 없습니다.</p>
          ) : null}
          {logs && logs.items.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/40">
              <table className="w-full min-w-[880px] text-left text-xs">
                <thead className="border-b border-gray-100 bg-gray-50/80 text-[10px] uppercase tracking-wide text-gray-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">시각</th>
                    <th className="px-3 py-2 font-medium">유형</th>
                    <th className="px-3 py-2 font-medium text-right">변동</th>
                    <th className="px-3 py-2 font-medium text-right">잔액 후</th>
                    <th className="px-3 py-2 font-medium">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.items.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 dark:border-zinc-800/80">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-600 dark:text-zinc-400">
                        {new Date(row.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-zinc-200">{row.type}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-800 dark:text-zinc-200">
                        {Number(row.changedAmount).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-600 dark:text-zinc-400">
                        {Number(row.balanceAfter).toLocaleString("ko-KR")}
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-2 text-gray-500 dark:text-zinc-500" title={row.note ?? ""}>
                        {row.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 dark:border-zinc-800">
                <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                  총 {logs.total.toLocaleString("ko-KR")}건 · {logPageSize}건씩 · {logPageDisplay} / {logTotalPages} 페이지
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={logsLoading || logPage <= 0}
                    onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={logsLoading || logPage >= logTotalPages - 1}
                    onClick={() => setLogPage((p) => p + 1)}
                    className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function pickPlatformId(prev: string, list: PlatformCreditRow[], bar: string | null) {
  if (prev && list.some((x) => x.id === prev)) return prev;
  if (bar && list.some((x) => x.id === bar)) return bar;
  return list[0]?.id ?? "";
}

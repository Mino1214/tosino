"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type CreditRequest = {
  id: string;
  platformId: string;
  platform: { id: string; name: string; slug: string };
  requestedAmountKrw: string;
  requesterNote: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvedAmountKrw: string | null;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

type BalanceStats = {
  creditBalance: string;
  pendingCreditRequests: number;
  totalPointBalance: string;
  totalWalletBalance: string;
  totalCompSettled: string;
};

/** 가상 알 복구(reserve) 잔액 · 로그 */
type ReserveSummary = {
  platformId: string;
  platformName: string;
  platformSlug: string;
  /** 마스터 스위치 (LIVE=true 이면 운영 실시간 반영 중) */
  enabled: boolean;
  restoreEnabled: boolean;
  rate: string | null;
  currentAmount: string;
  initialAmount: string;
  remainingHeadroom: string;
  todayDeductAmount: string;
  todayRestoreAmount: string;
  todayNetChange: string;
  todayDeductCount: number;
  todayRestoreCount: number;
  totalDeductAmount: string;
  totalRestoreAmount: string;
};

type ReserveLogRow = {
  id: string;
  type: "DEDUCT" | "RESTORE" | "ADJUST" | "ROLLBACK";
  baseAmount: string;
  rate: string;
  computedAmount: string;
  changedAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  initialAmount: string;
  relatedUserId: string | null;
  relatedGameId: string | null;
  relatedBetId: string | null;
  eventKey: string | null;
  note: string | null;
  createdAt: string;
};

function krw(v: string | number | null | undefined) {
  const n = Math.round(Number(v ?? 0));
  return Number.isFinite(n) ? n.toLocaleString("ko-KR") : "0";
}

function dt(s: string) {
  return new Date(s).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        승인됨
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
        거절됨
      </span>
    );
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
      대기중
    </span>
  );
}

type InnerTab = "requests" | "new";

export default function CreditsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();

  const [tab, setTab] = useState<InnerTab>("requests");
  const [requests, setRequests] = useState<CreditRequest[] | null>(null);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const [reserveSummary, setReserveSummary] = useState<ReserveSummary | null>(
    null,
  );
  const [reserveLogs, setReserveLogs] = useState<ReserveLogRow[]>([]);
  const [reserveLogLoading, setReserveLogLoading] = useState(false);
  const [reserveLogPage, setReserveLogPage] = useState(1); // 1-based
  const [reserveLogTotal, setReserveLogTotal] = useState(0);
  const RESERVE_LOG_PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 신규 요청 폼
  const [reqAmount, setReqAmount] = useState("");
  const [reqNote, setReqNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setReserveLogLoading(true);
    setErr(null);
    try {
      const [reqRes, balRes, reserveSumRes, reserveLogsRes] =
        await Promise.allSettled([
          apiFetch<{ items: CreditRequest[]; total: number }>(
            `/platforms/${selectedPlatformId}/credit-requests?limit=100`,
          ),
          apiFetch<BalanceStats>(
            `/platforms/${selectedPlatformId}/balance-stats`,
          ),
          apiFetch<ReserveSummary>(
            `/platforms/${selectedPlatformId}/reserve/summary`,
          ),
          apiFetch<{ items: ReserveLogRow[]; total: number }>(
            `/platforms/${selectedPlatformId}/reserve/logs?limit=${RESERVE_LOG_PAGE_SIZE}&offset=${(reserveLogPage - 1) * RESERVE_LOG_PAGE_SIZE}`,
          ),
        ]);
      if (reqRes.status === "fulfilled") {
        setRequests(reqRes.value.items ?? []);
      } else {
        setRequests([]);
      }
      if (balRes.status === "fulfilled") {
        setBalanceStats(balRes.value);
      }
      if (reserveSumRes.status === "fulfilled") {
        setReserveSummary(reserveSumRes.value);
      } else {
        setReserveSummary(null);
      }
      if (reserveLogsRes.status === "fulfilled") {
        setReserveLogs(reserveLogsRes.value.items ?? []);
        setReserveLogTotal(reserveLogsRes.value.total ?? 0);
      } else {
        setReserveLogs([]);
        setReserveLogTotal(0);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
      setReserveLogLoading(false);
    }
  }, [selectedPlatformId, reserveLogPage]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) return;
    void loadRequests();
  }, [loadRequests, router, selectedPlatformId, platformLoading]);

  // 플랫폼을 바꾸면 로그 페이지는 항상 1 로 리셋
  useEffect(() => {
    setReserveLogPage(1);
  }, [selectedPlatformId]);

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatformId || !reqAmount) return;
    setSubmitting(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/credit-requests`, {
        method: "POST",
        body: JSON.stringify({
          requestedAmountKrw: Number(reqAmount.replace(/,/g, "")),
          requesterNote: reqNote.trim() || undefined,
        }),
      });
      setMsg("알 구매 요청이 접수되었습니다. 슈퍼어드민 승인 후 크레딧이 지급됩니다.");
      setReqAmount("");
      setReqNote("");
      setTab("requests");
      await loadRequests();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "요청 실패");
    } finally {
      setSubmitting(false);
    }
  }

  const pending = (requests ?? []).filter((r) => r.status === "PENDING");
  const approved = (requests ?? []).filter((r) => r.status === "APPROVED");
  const totalApproved = approved.reduce(
    (s, r) => s + Number(r.approvedAmountKrw ?? 0),
    0,
  );
  const creditBalance = Number(balanceStats?.creditBalance ?? 0);

  return (
    <div className="space-y-5 px-1">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-black">알 관리</h1>
          <p className="mt-1 text-xs text-gray-500">
            솔루션 크레딧(알) 구매 요청 내역 · 슈퍼어드민 승인 확인
          </p>
        </div>
        <button
          onClick={() => void loadRequests()}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition"
        >
          {loading ? "조회중…" : "새로고침"}
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      {/* 잔여 알 히어로 */}
      <div className={`relative overflow-hidden rounded-2xl px-6 py-5 ${
        creditBalance <= 0
          ? "bg-gradient-to-br from-red-500 to-rose-600"
          : creditBalance < 100000
          ? "bg-gradient-to-br from-amber-400 to-orange-500"
          : "bg-gradient-to-br from-[#3182f6] to-[#1a56c4]"
      }`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
          현재 잔여 알 (크레딧)
        </p>
        <p className="mt-2 text-3xl font-bold font-mono text-white">
          {loading ? "…" : `${krw(creditBalance)}원`}
        </p>
        <p className="mt-1.5 text-xs text-white/70">
          {creditBalance <= 0
            ? "⚠ 잔액 없음 — 즉시 충전이 필요합니다"
            : creditBalance < 100000
            ? "⚠ 잔액이 부족합니다 — 충전을 권장합니다"
            : "정상 · 마스터어드민 승인으로 충전 · 배팅 GGR 청구 시 차감"}
          {pending.length > 0 && (
            <span className="ml-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
              대기 {pending.length}건
            </span>
          )}
        </p>
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-4 -right-2 h-16 w-16 rounded-full bg-white/5" />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            대기중
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-amber-700">
            {pending.length}건
          </p>
          <p className="mt-0.5 text-xs text-gray-500">승인 대기</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            누적 승인액
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-700">
            {krw(totalApproved)}원
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{approved.length}건 승인</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            포인트 잔액
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-violet-700">
            {balanceStats
              ? `${Number(balanceStats.totalPointBalance).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}P`
              : "—"}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">전체 유저 보유 포인트</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            콤프 지급 누계
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-orange-700">
            {balanceStats ? `${krw(balanceStats.totalCompSettled)}원` : "—"}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">누적 콤프 지급 합계</p>
        </div>
      </div>

      {/* ── 가상 알 복구(실시간) 현황 ── */}
      {reserveSummary && (
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <header className="border-b border-gray-100 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-[13px] font-bold text-black">
                가상 알 잔액 · 실시간 변동
              </h2>
              <p className="mt-0.5 text-[11px] text-gray-500">
                유저 카지노 낙첨·승리 이벤트가 즉시 반영되는 관리자용 가상 잔액
                (실제 지갑과 무관)
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <span
                className={`rounded-full px-2 py-0.5 font-bold ${
                  reserveSummary.enabled
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
                title={
                  reserveSummary.enabled
                    ? "운영 실시간 모드: 모든 카지노 배팅이 즉시 반영됨"
                    : "테스트 전용 모드: 실시간 훅 스킵 (마스터어드민이 ON 전환 필요)"
                }
              >
                {reserveSummary.enabled ? "● LIVE (운영 실시간)" : "○ TEST (테스트 전용)"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-bold ${
                  reserveSummary.restoreEnabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                복구 {reserveSummary.restoreEnabled ? "ON" : "OFF"}
              </span>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-blue-700">
                rate {reserveSummary.rate ?? "자동(판매율)"}
              </span>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                현재 잔액
              </p>
              <p className="mt-1.5 font-mono text-lg font-bold text-blue-700">
                {krw(reserveSummary.currentAmount)}원
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                최초 {krw(reserveSummary.initialAmount)}원
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                오늘 차감
              </p>
              <p className="mt-1.5 font-mono text-lg font-bold text-red-600">
                −{krw(reserveSummary.todayDeductAmount)}원
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                {reserveSummary.todayDeductCount}건 (낙첨)
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                오늘 복구
              </p>
              <p className="mt-1.5 font-mono text-lg font-bold text-emerald-700">
                +{krw(reserveSummary.todayRestoreAmount)}원
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                {reserveSummary.todayRestoreCount}건 (승리)
              </p>
            </div>
            <div
              className={`rounded-xl border p-3 ${
                Number(reserveSummary.todayNetChange) >= 0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                오늘 순변동
              </p>
              <p
                className={`mt-1.5 font-mono text-lg font-bold ${
                  Number(reserveSummary.todayNetChange) >= 0
                    ? "text-emerald-700"
                    : "text-red-600"
                }`}
              >
                {Number(reserveSummary.todayNetChange) >= 0 ? "+" : ""}
                {krw(reserveSummary.todayNetChange)}원
              </p>
              <p className="mt-0.5 text-[10px] text-gray-500">
                누적 차감 {krw(reserveSummary.totalDeductAmount)} · 복구{" "}
                {krw(reserveSummary.totalRestoreAmount)}
              </p>
            </div>
          </div>

          {/* 최근 로그 */}
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="px-5 py-2.5 flex items-center justify-between">
              <h3 className="text-[12px] font-bold text-gray-700">
                최근 변동 로그 (최대 30건)
              </h3>
              <span className="text-[10px] text-gray-500">
                카지노(casino / slot / minigame) 한정
              </span>
            </div>
            <div className="overflow-x-auto border-t border-gray-200">
              <table className="min-w-full text-[12px]">
                <thead className="bg-white text-left text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2 font-semibold">일시</th>
                    <th className="px-3 py-2 font-semibold">유형</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      원금 (base)
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">비율</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      실제 적용
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      잔액 변화
                    </th>
                    <th className="px-3 py-2 font-semibold">메모</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {reserveLogLoading && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-4 text-center text-gray-500"
                      >
                        로딩 중…
                      </td>
                    </tr>
                  )}
                  {!reserveLogLoading && reserveLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-4 text-center text-gray-500"
                      >
                        변동 로그가 없습니다. (카지노 배팅이 발생하면 즉시 기록됩니다)
                      </td>
                    </tr>
                  )}
                  {reserveLogs.map((log) => {
                    const changedNum = Number(log.changedAmount);
                    const typeColor =
                      log.type === "DEDUCT"
                        ? "bg-red-50 text-red-600"
                        : log.type === "RESTORE"
                        ? "bg-emerald-50 text-emerald-700"
                        : log.type === "ROLLBACK"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-100 text-gray-700";
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                          {dt(log.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${typeColor}`}
                          >
                            {log.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-800">
                          {krw(log.baseAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">
                          {Number(log.rate).toFixed(4)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono font-bold ${
                            log.type === "DEDUCT"
                              ? "text-red-600"
                              : log.type === "RESTORE"
                              ? "text-emerald-700"
                              : "text-gray-700"
                          }`}
                        >
                          {log.type === "DEDUCT"
                            ? "−"
                            : log.type === "RESTORE"
                            ? "+"
                            : ""}
                          {krw(log.changedAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600 whitespace-nowrap">
                          {krw(log.balanceBefore)} →{" "}
                          <span className="font-bold text-black">
                            {krw(log.balanceAfter)}
                          </span>
                          {changedNum === 0 && (
                            <p className="mt-0.5 text-[10px] text-amber-600 text-right">
                              변동 0 (클램프/rate=0)
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-500 truncate max-w-[260px]">
                          {log.note ? (
                            <span title={log.note}>{log.note}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* 페이지네이션 — 10개 단위 */}
            {reserveLogTotal > RESERVE_LOG_PAGE_SIZE && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-600">
                <div>
                  전체 <span className="font-bold text-gray-800">{reserveLogTotal.toLocaleString()}</span>건 ·
                  현재 <span className="font-bold text-gray-800">{reserveLogPage}</span> / {Math.max(1, Math.ceil(reserveLogTotal / RESERVE_LOG_PAGE_SIZE))} 페이지
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={reserveLogPage <= 1 || reserveLogLoading}
                    onClick={() => setReserveLogPage(1)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >« 처음</button>
                  <button
                    type="button"
                    disabled={reserveLogPage <= 1 || reserveLogLoading}
                    onClick={() => setReserveLogPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >‹ 이전</button>
                  <button
                    type="button"
                    disabled={reserveLogPage * RESERVE_LOG_PAGE_SIZE >= reserveLogTotal || reserveLogLoading}
                    onClick={() => setReserveLogPage((p) => p + 1)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >다음 ›</button>
                  <button
                    type="button"
                    disabled={reserveLogPage * RESERVE_LOG_PAGE_SIZE >= reserveLogTotal || reserveLogLoading}
                    onClick={() => {
                      const last = Math.max(1, Math.ceil(reserveLogTotal / RESERVE_LOG_PAGE_SIZE));
                      setReserveLogPage(last);
                    }}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >끝 »</button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 탭 */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {(
          [
            { key: "requests" as const, label: "구매 요청 내역" },
            { key: "new" as const, label: "+ 새 구매 요청" },
          ] satisfies { key: InnerTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-[#3182f6]/10 text-[#3182f6]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 내역 탭 */}
      {tab === "requests" && (
        <>
          {/* 대기중 */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-700">
                ⏳ 승인 대기 ({pending.length}건)
              </p>
              <div className="overflow-x-auto rounded-xl border border-amber-200 bg-amber-50/50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-amber-200">
                      {["요청일", "요청 금액", "메모", "상태"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((r) => (
                      <tr key={r.id} className="border-b border-amber-100">
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                          {dt(r.createdAt)}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-gray-800 whitespace-nowrap">
                          {krw(Number(r.requestedAmountKrw))}원
                        </td>
                        <td className="px-4 py-2.5 max-w-[180px] truncate text-gray-500">
                          {r.requesterNote || "—"}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 전체 내역 */}
          {loading ? (
            <p className="py-6 text-sm text-gray-400">불러오는 중…</p>
          ) : !requests || requests.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
              <p className="text-sm text-gray-400">구매 요청 내역이 없습니다.</p>
              <button
                onClick={() => setTab("new")}
                className="mt-3 rounded-lg bg-[#3182f6] px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
              >
                새 구매 요청
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    {[
                      "요청일",
                      "요청 금액",
                      "승인 금액",
                      "상태",
                      "어드민 메모",
                      "처리일",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                        {dt(r.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-gray-800 whitespace-nowrap">
                        {krw(Number(r.requestedAmountKrw))}원
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-700 whitespace-nowrap">
                        {r.approvedAmountKrw
                          ? `${krw(Number(r.approvedAmountKrw))}원`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-2.5 max-w-[160px] truncate text-gray-500">
                        {r.adminNote || "—"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-400">
                        {r.resolvedAt ? dt(r.resolvedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 새 요청 탭 */}
      {tab === "new" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-1 text-base font-semibold text-black">알 구매 요청</h2>
          <p className="mb-5 text-sm text-gray-500">
            슈퍼어드민에게 알(크레딧) 구매를 요청합니다. 승인 후 반영됩니다.
          </p>
          <form
            onSubmit={(e) => void handleSubmitRequest(e)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  요청 금액 (원) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={reqAmount}
                  onChange={(e) => setReqAmount(e.target.value)}
                  placeholder="예: 1,000,000"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm text-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  메모 (선택)
                </label>
                <input
                  type="text"
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  placeholder="예: 5월 알 구매 요청"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#3182f6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
              >
                {submitting ? "요청 중…" : "구매 요청 제출"}
              </button>
              <button
                type="button"
                onClick={() => setTab("requests")}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

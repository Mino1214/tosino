"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

/* ─── Types ─── */
type Summary = {
  totalDeposited: number;
  totalAllocated: number;
  remaining: number;
  pendingRequestCount: number;
};

type VendorDeposit = {
  id: string;
  amountKrw: string;
  note: string | null;
  createdAt: string;
};

type CreditRequest = {
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

type PlatformAllocated = {
  id: string;
  name: string;
  slug: string;
  totalAllocated: number;
};

/* ─── Reserve (가상 알 복구) ─── */
type ReserveSummary = {
  platformId: string;
  platformName: string;
  platformSlug: string;
  /** 마스터 스위치. true=운영 실시간 반영, false=테스트/수동 전용 */
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

type PlatformSalesRow = {
  id: string;
  name: string;
  slug: string;
  ggr: number;
  upstreamCost: number;
  platformCharge: number;
  solutionMargin: number;
  upstreamCasinoPct: string | null;
  upstreamSportsPct: string | null;
  platformCasinoPct: string | null;
  platformSportsPct: string | null;
  totalAllocated: number;
};

/* ─── Helpers ─── */
function krw(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ko-KR");
}

function pct(v: string | null | undefined) {
  if (!v) return "—";
  return `${Number(v).toFixed(1)}%`;
}

function statusBadge(s: string) {
  if (s === "APPROVED") return <span className="rounded-full bg-[#3182f6]/10 px-2 py-0.5 text-[11px] font-bold text-[#3182f6]">승인됨</span>;
  if (s === "REJECTED") return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">거절됨</span>;
  return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">대기중</span>;
}

/* ─── SalesRow API shape ─── */
type SalesSummaryAPI = {
  betting: { ggr: string };
  costs: {
    solutionRates: {
      upstreamCasinoPct: string | null;
      upstreamSportsPct: string | null;
      platformCasinoPct: string | null;
      platformSportsPct: string | null;
      upstreamCostKrw: string;
      platformChargeKrw: string;
      solutionMarginKrw: string;
    };
  };
};

export default function CreditsPage() {
  const { platforms } = usePlatform();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [deposits, setDeposits] = useState<VendorDeposit[]>([]);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [allocated, setAllocated] = useState<PlatformAllocated[]>([]);
  const [salesRows, setSalesRows] = useState<PlatformSalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Vendor deposit form
  const [depositAmt, setDepositAmt] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [addingDeposit, setAddingDeposit] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);

  // Request resolve
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAmt, setResolveAmt] = useState<Record<string, string>>({});
  const [resolveNote, setResolveNote] = useState<Record<string, string>>({});

  // Active section
  const [showDeposits, setShowDeposits] = useState(false);

  // Reserve (가상 알 복구) — 플랫폼별 요약 + 선택된 플랫폼 로그
  const [reserveSummaries, setReserveSummaries] = useState<ReserveSummary[]>([]);
  const [reserveLogs, setReserveLogs] = useState<ReserveLogRow[]>([]);
  const [reserveLogPlatformId, setReserveLogPlatformId] = useState<string | null>(null);
  const [reserveLogLoading, setReserveLogLoading] = useState(false);
  const [reserveLogPage, setReserveLogPage] = useState(1); // 1-based
  const [reserveLogTotal, setReserveLogTotal] = useState(0);
  const RESERVE_LOG_PAGE_SIZE = 10;
  const [reserveSaving, setReserveSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setOk(null);
    try {
      const query = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
      const [sum, dep, req, plt] = await Promise.all([
        apiFetch<Summary>("/hq/credits/summary"),
        apiFetch<{ items: VendorDeposit[] }>("/hq/credits/vendor-deposits?limit=50"),
        apiFetch<{ items: CreditRequest[] }>("/hq/credits/requests?limit=100"),
        apiFetch<PlatformAllocated[]>("/hq/credits/platform-summary"),
      ]);
      setSummary(sum);
      setDeposits(dep.items);
      setRequests(req.items);
      setAllocated(plt);

      // Fetch per-platform sales summaries + reserve summaries in parallel
      if (platforms.length > 0) {
        const [salesSettled, reserveSettled] = await Promise.all([
          Promise.allSettled(
            platforms.map(async (p) => {
              const s = await apiFetch<SalesSummaryAPI>(`/platforms/${p.id}/sales/summary?${query}`);
              const alloc = plt.find((a) => a.id === p.id);
              return {
                id: p.id,
                name: p.name,
                slug: p.slug,
                ggr: Number(s.betting.ggr ?? 0),
                upstreamCost: Number(s.costs.solutionRates.upstreamCostKrw ?? 0),
                platformCharge: Number(s.costs.solutionRates.platformChargeKrw ?? 0),
                solutionMargin: Number(s.costs.solutionRates.solutionMarginKrw ?? 0),
                upstreamCasinoPct: s.costs.solutionRates.upstreamCasinoPct,
                upstreamSportsPct: s.costs.solutionRates.upstreamSportsPct,
                platformCasinoPct: s.costs.solutionRates.platformCasinoPct,
                platformSportsPct: s.costs.solutionRates.platformSportsPct,
                totalAllocated: alloc?.totalAllocated ?? 0,
              } satisfies PlatformSalesRow;
            }),
          ),
          Promise.allSettled(
            platforms.map((p) =>
              apiFetch<ReserveSummary>(`/hq/credits/reserve/${p.id}/summary`),
            ),
          ),
        ]);
        setSalesRows(
          salesSettled
            .filter((r): r is PromiseFulfilledResult<PlatformSalesRow> => r.status === "fulfilled")
            .map((r) => r.value),
        );
        const reserveList = reserveSettled
          .filter((r): r is PromiseFulfilledResult<ReserveSummary> => r.status === "fulfilled")
          .map((r) => r.value);
        setReserveSummaries(reserveList);

        // 첫 로드 시 가장 최근 변동(DEDUCT/RESTORE) 이 있는 플랫폼의 로그를 자동 펼쳐서 보여준다.
        // — 유저가 "보기" 버튼을 누르지 않아도 실시간 기록이 즉시 확인되도록.
        if (reserveList.length > 0 && !reserveLogPlatformId) {
          const pickTarget =
            reserveList
              .slice()
              .sort(
                (a, b) =>
                  b.todayDeductCount + b.todayRestoreCount -
                  (a.todayDeductCount + a.todayRestoreCount),
              )[0] ?? reserveList[0];
          if (pickTarget) {
            void handleLoadReserveLogs(pickTarget.platformId);
          }
        }
      } else {
        setReserveSummaries([]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [from, platforms, to]);

  useEffect(() => { void load(); }, [load]);

  async function handleAddDeposit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(depositAmt.replace(/,/g, ""));
    if (!n || n <= 0) { setErr("금액을 입력해주세요."); return; }
    setAddingDeposit(true);
    setErr(null);
    try {
      await apiFetch("/hq/credits/vendor-deposits", {
        method: "POST",
        body: JSON.stringify({ amountKrw: n, note: depositNote || undefined }),
      });
      setDepositAmt(""); setDepositNote(""); setShowDepositForm(false);
      setOk("상위 잔액이 기록되었습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setAddingDeposit(false);
    }
  }

  async function handleDeleteDeposit(id: string) {
    if (!confirm("이 입금 내역을 삭제하시겠습니까?")) return;
    try {
      await apiFetch(`/hq/credits/vendor-deposits/${id}`, { method: "DELETE" });
      setOk("삭제되었습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  async function handleResolve(req: CreditRequest, status: "APPROVED" | "REJECTED") {
    setResolvingId(req.id);
    setErr(null);
    try {
      const approvedAmt = status === "APPROVED"
        ? Number((resolveAmt[req.id] ?? req.requestedAmountKrw).replace?.(/,/g, "") ?? req.requestedAmountKrw)
        : null;
      await apiFetch(`/hq/credits/requests/${req.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, approvedAmountKrw: approvedAmt, adminNote: resolveNote[req.id] || undefined }),
      });
      setOk(status === "APPROVED" ? "승인 완료" : "거절 완료");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setResolvingId(null);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const resolvedRequests = requests.filter((r) => r.status !== "PENDING");

  async function handleToggleRestore(platformId: string, enabled: boolean) {
    setReserveSaving(platformId);
    setErr(null);
    try {
      const updated = await apiFetch<ReserveSummary>(
        `/hq/credits/reserve/${platformId}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({ restoreEnabled: enabled }),
        },
      );
      setReserveSummaries((prev) =>
        prev.map((s) => (s.platformId === platformId ? updated : s)),
      );
      setOk(enabled ? "가상 복구 활성화" : "가상 복구 비활성화");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "설정 변경 실패");
    } finally {
      setReserveSaving(null);
    }
  }

  async function handleToggleMaster(platformId: string, enabled: boolean) {
    // 운영 ON ↔ 테스트 전용 OFF 전환. true 로 바꾸는 순간부터 Vinus 실시간 훅이 활성화된다.
    setReserveSaving(platformId);
    setErr(null);
    try {
      const updated = await apiFetch<ReserveSummary>(
        `/hq/credits/reserve/${platformId}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        },
      );
      setReserveSummaries((prev) =>
        prev.map((s) => (s.platformId === platformId ? updated : s)),
      );
      setOk(
        enabled
          ? "운영 모드로 전환됨 — 실시간 배팅에 즉시 반영"
          : "테스트 전용 모드로 전환됨 — 실시간 훅 스킵",
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "설정 변경 실패");
    } finally {
      setReserveSaving(null);
    }
  }

  async function handleSaveReserveRate(platformId: string, raw: string) {
    const trimmed = raw.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 1)) {
      setErr("rate 는 0 ~ 1 사이 값이어야 합니다 (예: 0.07)");
      return;
    }
    setReserveSaving(platformId);
    setErr(null);
    try {
      const updated = await apiFetch<ReserveSummary>(
        `/hq/credits/reserve/${platformId}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify({ ratePct: parsed }),
        },
      );
      setReserveSummaries((prev) =>
        prev.map((s) => (s.platformId === platformId ? updated : s)),
      );
      setOk("알 비율 저장됨");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setReserveSaving(null);
    }
  }

  async function handleLoadReserveLogs(platformId: string, page = 1) {
    setReserveLogPlatformId(platformId);
    setReserveLogPage(page);
    setReserveLogLoading(true);
    try {
      const offset = (page - 1) * RESERVE_LOG_PAGE_SIZE;
      const res = await apiFetch<{ items: ReserveLogRow[]; total: number }>(
        `/hq/credits/reserve/${platformId}/logs?limit=${RESERVE_LOG_PAGE_SIZE}&offset=${offset}`,
      );
      setReserveLogs(res.items);
      setReserveLogTotal(res.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "로그 조회 실패");
    } finally {
      setReserveLogLoading(false);
    }
  }

  const totalGgr = salesRows.reduce((s, r) => s + r.ggr, 0);
  const totalUpstreamCost = salesRows.reduce((s, r) => s + r.upstreamCost, 0);
  const totalMargin = salesRows.reduce((s, r) => s + r.solutionMargin, 0);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3182f6]">HQ Credit Hub</p>
          <h1 className="mt-1 text-[24px] font-bold text-black">알값 크레딧 허브</h1>
          <p className="mt-1 text-[14px] text-gray-500">상위 벤더 잔액 관리 · 플랫폼 배팅 및 소진 현황</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "오늘", from: today, to: today },
            { label: "이번달", from: monthStart, to: today },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setFrom(p.from); setTo(p.to); }}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                from === p.from && to === p.to
                  ? "bg-[#3182f6] text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[13px] text-gray-900" />
          <span className="text-gray-400">~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[13px] text-gray-900" />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-[#3182f6] px-4 py-1.5 text-[13px] font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {loading ? "집계 중…" : "새로고침"}
          </button>
        </div>
      </div>

      {err && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}
      {ok && <p className="rounded-xl border border-[#3182f6]/30 bg-[#3182f6]/5 px-4 py-3 text-[14px] font-semibold text-[#3182f6]">{ok}</p>}

      {/* ── HQ Balance + Period Summary ── */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* HQ 잔액 */}
        <div className={`rounded-2xl border p-4 relative overflow-hidden ${summary && summary.remaining >= 0 ? "border-[#3182f6]/30 bg-[#3182f6]/5" : "border-red-200 bg-red-50"}`}>
          <div className={`absolute top-3 right-3 h-2 w-2 rounded-full ${summary && summary.remaining >= 0 ? "bg-[#3182f6]" : "bg-red-400"}`} />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">HQ 잔여 잔액</p>
          <p className={`mt-2 text-[22px] font-bold ${summary && summary.remaining >= 0 ? "text-[#3182f6]" : "text-red-500"}`}>
            {summary ? `${krw(summary.remaining)}원` : "—"}
          </p>
          <p className="mt-1 text-[12px] text-gray-500">상위 납입 - 플랫폼 배정 합계</p>
        </div>

        {/* 기간 GGR */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 relative overflow-hidden">
          <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">기간 총 GGR</p>
          <p className="mt-2 text-[22px] font-bold text-emerald-700">{krw(totalGgr)}원</p>
          <p className="mt-1 text-[12px] text-gray-500">전체 플랫폼 낙첨금 합산</p>
        </div>

        {/* 알값 소진 */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4 relative overflow-hidden">
          <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-purple-400" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">기간 알값 소진</p>
          <p className="mt-2 text-[22px] font-bold text-purple-700">{krw(totalUpstreamCost)}원</p>
          <p className="mt-1 text-[12px] text-gray-500">GGR × 상위 매입율 합산</p>
        </div>

        {/* 본사 마진 */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 relative overflow-hidden">
          <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-400" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">기간 본사 마진</p>
          <p className={`mt-2 text-[22px] font-bold ${totalMargin >= 0 ? "text-amber-700" : "text-red-600"}`}>
            {totalMargin >= 0 ? "+" : ""}{krw(totalMargin)}원
          </p>
          <p className="mt-1 text-[12px] text-gray-500">플랫폼 청구 - 상위 원가</p>
        </div>
      </section>

      {/* ── 플랫폼별 알값 배율 & 소진 현황 ── */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-black">플랫폼별 알값 배율 & 소진 현황</h2>
            <p className="mt-0.5 text-[12px] text-gray-500">매입율(상위) → 판매율(플랫폼) 차이가 본사 마진</p>
          </div>
          {summary && summary.pendingRequestCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[12px] font-bold text-amber-700">
              충전 요청 {summary.pendingRequestCount}건 대기
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 font-semibold">솔루션</th>
                <th className="px-4 py-2.5 text-center font-semibold">
                  <span title="상위 매입율 (카지노/스포츠)">매입율 (상위)</span>
                </th>
                <th className="px-4 py-2.5 text-center font-semibold">
                  <span title="플랫폼 판매율 (카지노/스포츠)">판매율 (플랫폼)</span>
                </th>
                <th className="px-4 py-2.5 text-right font-semibold">기간 GGR</th>
                <th className="px-4 py-2.5 text-right font-semibold">알값 소진</th>
                <th className="px-4 py-2.5 text-right font-semibold">본사 마진</th>
                <th className="px-4 py-2.5 text-right font-semibold">배정 잔여</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {loading ? "데이터를 불러오는 중…" : "플랫폼 없음"}
                  </td>
                </tr>
              )}
              {salesRows.map((row) => {
                const alloc = allocated.find((a) => a.id === row.id);
                const allocTotal = alloc?.totalAllocated ?? row.totalAllocated;
                const remaining = allocTotal - row.upstreamCost;
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-black">{row.name}</p>
                      <p className="text-[11px] text-gray-400">{row.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                          카 {pct(row.upstreamCasinoPct)}
                        </span>
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                          스 {pct(row.upstreamSportsPct)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex flex-col items-center gap-0.5">
                        <span className="rounded bg-[#3182f6]/10 px-2 py-0.5 text-[11px] font-bold text-[#3182f6]">
                          카 {pct(row.platformCasinoPct)}
                        </span>
                        <span className="rounded bg-[#3182f6]/10 px-2 py-0.5 text-[11px] font-bold text-[#3182f6]">
                          스 {pct(row.platformSportsPct)}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                      {krw(row.ggr)}원
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-purple-700">
                      {krw(row.upstreamCost)}원
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${row.solutionMargin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {row.solutionMargin >= 0 ? "+" : ""}{krw(row.solutionMargin)}원
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${remaining >= 0 ? "text-[#3182f6]" : "text-red-500"}`}>
                      {krw(remaining)}원
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {salesRows.length > 0 && (
              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                <tr>
                  <td className="px-4 py-2.5 text-[12px] font-bold text-gray-700" colSpan={3}>합계</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[13px] font-bold text-gray-900">{krw(totalGgr)}원</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[13px] font-bold text-purple-700">{krw(totalUpstreamCost)}원</td>
                  <td className={`px-4 py-2.5 text-right font-mono text-[13px] font-bold ${totalMargin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {totalMargin >= 0 ? "+" : ""}{krw(totalMargin)}원
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-[13px] font-bold text-gray-700">
                    {krw(salesRows.reduce((s, r) => {
                      const al = allocated.find((a) => a.id === r.id);
                      return s + (al?.totalAllocated ?? r.totalAllocated) - r.upstreamCost;
                    }, 0))}원
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ── 플랫폼별 가상 알 복구 (관리자 전용 잔액) ── */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-black">가상 알 복구 · 잔액 대시보드</h2>
          <p className="mt-0.5 text-[12px] text-gray-500">
            실제 돈 이동과 무관한 관리자용 가상 잔액. 낙첨 시 차감 · 승리 시 복구 (비율 × 금액). 잔액은 항상 0 ~ 최초 충전 금액 사이로 유지됩니다.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[13px]">
            <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 font-semibold">플랫폼</th>
                <th className="px-4 py-2.5 text-right font-semibold">현재 잔액</th>
                <th className="px-4 py-2.5 text-right font-semibold">최초 충전 (상한)</th>
                <th className="px-4 py-2.5 text-right font-semibold text-red-500">오늘 차감</th>
                <th className="px-4 py-2.5 text-right font-semibold text-emerald-600">오늘 복구</th>
                <th className="px-4 py-2.5 text-right font-semibold">오늘 순변동</th>
                <th className="px-4 py-2.5 text-center font-semibold text-blue-600">운영 실시간</th>
                <th className="px-4 py-2.5 text-center font-semibold">복구 ON/OFF</th>
                <th className="px-4 py-2.5 text-center font-semibold">비율</th>
                <th className="px-4 py-2.5 text-center font-semibold">로그</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reserveSummaries.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    {loading ? "데이터를 불러오는 중…" : "플랫폼 없음"}
                  </td>
                </tr>
              )}
              {reserveSummaries.map((row) => {
                const net = Number(row.todayNetChange);
                const current = Number(row.currentAmount);
                const initial = Number(row.initialAmount);
                const ratio = initial > 0 ? (current / initial) * 100 : 0;
                return (
                  <tr key={row.platformId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-black">{row.platformName}</p>
                      <p className="text-[11px] text-gray-400">{row.platformSlug}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-black">{krw(row.currentAmount)}원</span>
                      <div className="mt-1 h-1.5 w-28 ml-auto rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-[#3182f6]"
                          style={{ width: `${Math.max(0, Math.min(100, ratio))}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">{ratio.toFixed(1)}%</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {krw(row.initialAmount)}원
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-500">
                      −{krw(row.todayDeductAmount)}원
                      <p className="text-[10px] text-gray-400 font-normal">{row.todayDeductCount}건</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                      +{krw(row.todayRestoreAmount)}원
                      <p className="text-[10px] text-gray-400 font-normal">{row.todayRestoreCount}건</p>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${net >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {net >= 0 ? "+" : ""}{krw(row.todayNetChange)}원
                    </td>
                    {/* 마스터 스위치 — true 면 Vinus 실시간 훅 + 배치 정산 모두에서 reserve 반영 */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleMaster(row.platformId, !row.enabled)}
                        disabled={reserveSaving === row.platformId}
                        className={`inline-flex h-6 w-11 items-center rounded-full transition ${
                          row.enabled ? "bg-blue-600" : "bg-gray-300"
                        } disabled:opacity-50`}
                        title={row.enabled ? "운영 실시간 모드 — 모든 카지노 배팅에 즉시 반영" : "테스트 전용 모드 — 실시간 훅 스킵"}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
                            row.enabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <p className={`mt-0.5 text-[10px] font-bold ${row.enabled ? "text-blue-600" : "text-gray-500"}`}>
                        {row.enabled ? "LIVE" : "TEST"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleRestore(row.platformId, !row.restoreEnabled)}
                        disabled={reserveSaving === row.platformId}
                        className={`inline-flex h-6 w-11 items-center rounded-full transition ${
                          row.restoreEnabled ? "bg-emerald-500" : "bg-gray-300"
                        } disabled:opacity-50`}
                        title={row.restoreEnabled ? "복구 활성화됨" : "복구 비활성화"}
                      >
                        <span
                          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition ${
                            row.restoreEnabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        {row.restoreEnabled ? "ON" : "OFF"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="text"
                        defaultValue={row.rate ?? ""}
                        placeholder="0.07"
                        onBlur={(e) => {
                          if (e.target.value !== (row.rate ?? "")) {
                            void handleSaveReserveRate(row.platformId, e.target.value);
                          }
                        }}
                        className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-center font-mono text-[12px] text-gray-900"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => void handleLoadReserveLogs(row.platformId)}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── 선택된 플랫폼 최근 로그 ── */}
        {reserveLogPlatformId && (
          <div className="border-t border-gray-100 bg-gray-50">
            <div className="px-5 py-3 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-gray-700">
                최근 변동 로그
                <span className="ml-2 text-[11px] font-normal text-gray-500">
                  {reserveSummaries.find((s) => s.platformId === reserveLogPlatformId)?.platformName ?? reserveLogPlatformId}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => { setReserveLogPlatformId(null); setReserveLogs([]); }}
                className="text-[11px] text-gray-500 hover:text-gray-700"
              >
                닫기 ✕
              </button>
            </div>
            <div className="overflow-x-auto border-t border-gray-200">
              <table className="min-w-full text-[12px]">
                <thead className="text-left text-[10px] uppercase tracking-wide text-gray-500 bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2 font-semibold">일시</th>
                    <th className="px-3 py-2 font-semibold">유형</th>
                    <th className="px-3 py-2 text-right font-semibold">원금 (base)</th>
                    <th className="px-3 py-2 text-right font-semibold">비율</th>
                    <th className="px-3 py-2 text-right font-semibold">계산값</th>
                    <th className="px-3 py-2 text-right font-semibold">실제 적용</th>
                    <th className="px-3 py-2 text-right font-semibold">잔액 변화</th>
                    <th className="px-3 py-2 font-semibold">메모</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {reserveLogLoading && (
                    <tr><td colSpan={8} className="px-3 py-4 text-center text-gray-500">로딩 중…</td></tr>
                  )}
                  {!reserveLogLoading && reserveLogs.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-4 text-center text-gray-500">변동 로그가 없습니다.</td></tr>
                  )}
                  {reserveLogs.map((log) => {
                    const changedNum = Number(log.changedAmount);
                    const typeColor =
                      log.type === "DEDUCT" ? "bg-red-50 text-red-600" :
                      log.type === "RESTORE" ? "bg-emerald-50 text-emerald-700" :
                      log.type === "ROLLBACK" ? "bg-amber-50 text-amber-700" :
                      "bg-gray-100 text-gray-700";
                    return (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                          {new Date(log.createdAt).toLocaleString("ko-KR")}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${typeColor}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-800">{krw(log.baseAmount)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">{Number(log.rate).toFixed(4)}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-500">{krw(log.computedAmount)}</td>
                        <td className={`px-3 py-2 text-right font-mono font-bold ${
                          log.type === "DEDUCT" ? "text-red-600" :
                          log.type === "RESTORE" ? "text-emerald-700" : "text-gray-700"
                        }`}>
                          {log.type === "DEDUCT" ? "−" : log.type === "RESTORE" ? "+" : ""}{krw(log.changedAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600">
                          {krw(log.balanceBefore)} → <span className="font-bold text-black">{krw(log.balanceAfter)}</span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-gray-500">
                          {log.note ? (
                            <p className="text-gray-600 truncate max-w-[320px]" title={log.note}>{log.note}</p>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                          {changedNum === 0 && (
                            <p className="mt-0.5 text-[10px] text-amber-600">잔액 변동 0 (클램프/복구 OFF)</p>
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
                    onClick={() => reserveLogPlatformId && void handleLoadReserveLogs(reserveLogPlatformId, 1)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >« 처음</button>
                  <button
                    type="button"
                    disabled={reserveLogPage <= 1 || reserveLogLoading}
                    onClick={() => reserveLogPlatformId && void handleLoadReserveLogs(reserveLogPlatformId, reserveLogPage - 1)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >‹ 이전</button>
                  <button
                    type="button"
                    disabled={reserveLogPage * RESERVE_LOG_PAGE_SIZE >= reserveLogTotal || reserveLogLoading}
                    onClick={() => reserveLogPlatformId && void handleLoadReserveLogs(reserveLogPlatformId, reserveLogPage + 1)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >다음 ›</button>
                  <button
                    type="button"
                    disabled={reserveLogPage * RESERVE_LOG_PAGE_SIZE >= reserveLogTotal || reserveLogLoading}
                    onClick={() => {
                      if (!reserveLogPlatformId) return;
                      const last = Math.max(1, Math.ceil(reserveLogTotal / RESERVE_LOG_PAGE_SIZE));
                      void handleLoadReserveLogs(reserveLogPlatformId, last);
                    }}
                    className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
                  >끝 »</button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 승인 대기 충전 요청 ── */}
      {pendingRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-bold text-amber-700 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {pendingRequests.length}
            </span>
            충전 요청 승인 대기
          </h2>
          {pendingRequests.map((req) => (
            <div key={req.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-black">{req.platform.name}</span>
                    {statusBadge(req.status)}
                  </div>
                  <p className="mt-1 text-[13px] text-gray-700">
                    요청 금액: <span className="font-mono font-bold text-black">{krw(Number(req.requestedAmountKrw))}원</span>
                  </p>
                  {req.requesterNote && (
                    <p className="mt-0.5 text-[12px] text-gray-500">메모: {req.requesterNote}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {new Date(req.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3 border-t border-amber-200 pt-3">
                <label className="block text-[12px] text-gray-600">
                  승인 금액
                  <input
                    type="text"
                    value={resolveAmt[req.id] ?? req.requestedAmountKrw}
                    onChange={(e) => setResolveAmt((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    className="ml-2 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-[13px] text-gray-900 w-36"
                  />
                  원
                </label>
                <label className="block text-[12px] text-gray-600">
                  관리자 메모
                  <input
                    type="text"
                    value={resolveNote[req.id] ?? ""}
                    onChange={(e) => setResolveNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                    placeholder="선택"
                    className="ml-2 rounded border border-gray-300 bg-white px-2 py-1 text-[13px] text-gray-900 w-40"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={resolvingId === req.id}
                    onClick={() => handleResolve(req, "APPROVED")}
                    className="rounded-lg bg-[#3182f6] px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
                  >
                    {resolvingId === req.id ? "처리 중…" : "승인"}
                  </button>
                  <button
                    type="button"
                    disabled={resolvingId === req.id}
                    onClick={() => handleResolve(req, "REJECTED")}
                    className="rounded-lg border border-red-300 px-4 py-1.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    거절
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── 상위 벤더 충전 기록 ── */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-black">상위 벤더 충전 내역</h2>
            <p className="mt-0.5 text-[12px] text-gray-500">
              납입 합계: <span className="font-mono font-bold text-black">{summary ? `${krw(summary.totalDeposited)}원` : "—"}</span>
              &nbsp;·&nbsp; 배정 합계: <span className="font-mono font-bold text-gray-700">{summary ? `${krw(summary.totalAllocated)}원` : "—"}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowDeposits((v) => !v); setShowDepositForm(false); }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            {showDeposits ? "접기 ↑" : "내역 보기 ↓"}
          </button>
        </div>

        {showDeposits && (
          <>
            <div className="px-5 py-3 border-b border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowDepositForm((v) => !v); setOk(null); setErr(null); }}
                className="rounded-lg bg-[#3182f6] px-4 py-2 text-[13px] font-semibold text-white hover:bg-blue-600 transition"
              >
                + 충전 기록 추가
              </button>
            </div>

            {showDepositForm && (
              <form onSubmit={handleAddDeposit} className="border-b border-gray-100 bg-gray-50 px-5 py-4 space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[13px] font-medium text-gray-700">
                    충전 금액 (KRW) <span className="text-red-500">*</span>
                    <input
                      required type="text" value={depositAmt}
                      onChange={(e) => setDepositAmt(e.target.value)}
                      placeholder="예: 10000000"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-[14px] text-gray-900"
                    />
                  </label>
                  <label className="block text-[13px] font-medium text-gray-700">
                    메모 (선택)
                    <input
                      type="text" value={depositNote}
                      onChange={(e) => setDepositNote(e.target.value)}
                      placeholder="예: 4월 1차 선충전"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-[14px] text-gray-900"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={addingDeposit}
                    className="rounded-lg bg-[#3182f6] px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition">
                    {addingDeposit ? "저장 중…" : "저장"}
                  </button>
                  <button type="button" onClick={() => setShowDepositForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 transition">
                    취소
                  </button>
                </div>
              </form>
            )}

            <table className="min-w-full text-[13px]">
              <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">일시</th>
                  <th className="px-4 py-2.5 text-right font-semibold">금액</th>
                  <th className="px-4 py-2.5 font-semibold">메모</th>
                  <th className="px-4 py-2.5 text-center font-semibold">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-black">
                      {krw(Number(d.amountKrw))}원
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{d.note ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteDeposit(d.id)}
                        className="text-[12px] text-red-400 hover:text-red-600 transition"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {deposits.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">충전 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* ── 처리된 충전 요청 ── */}
      {resolvedRequests.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-bold text-black">처리된 충전 요청</h2>
          </div>
          <table className="min-w-full text-[13px]">
            <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 font-semibold">플랫폼</th>
                <th className="px-4 py-2.5 text-right font-semibold">요청액</th>
                <th className="px-4 py-2.5 text-right font-semibold">승인액</th>
                <th className="px-4 py-2.5 text-center font-semibold">상태</th>
                <th className="px-4 py-2.5 font-semibold">처리일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {resolvedRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-black">{req.platform.name}</p>
                    {req.requesterNote && <p className="text-[11px] text-gray-500">{req.requesterNote}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-700">{krw(Number(req.requestedAmountKrw))}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-black">
                    {req.approvedAmountKrw ? krw(Number(req.approvedAmountKrw)) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center">{statusBadge(req.status)}</td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-500 whitespace-nowrap">
                    {req.resolvedAt ? new Date(req.resolvedAt).toLocaleDateString("ko-KR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

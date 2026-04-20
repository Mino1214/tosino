"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

// ─── 타입 ─────────────────────────────────────────────────
type Summary = {
  period: { from: string | null; to: string | null };
  platform: { userCnt: number; agentCnt: number };
  betting: {
    rounds: number;
    betStake: string;
    winTotal: string;
    ggr: string;
    rtp: string;
  };
  wallet: {
    depositCount: number;
    depositTotal: string;
    withdrawCount: number;
    withdrawTotal: string;
    netInflow: string;
    houseEdge: string;
    estimatedRootAgentSettlementKrw?: string;
  };
  costs: {
    money: {
      depositBonus: string;
      pointRedeem: string;
      otherWalletCredits: string;
      total: string;
    };
    pointAccrual: {
      redeemKrwPerPoint: string | null;
      attendancePoints: string;
      attendanceStreakPoints: string;
      loseBetPoints: string;
      referralPoints: string;
      depositPoints: string;
      bulkGrantPoints: string;
      otherAdjustmentPoints: string;
      totalPoints: string;
      estimatedKrw: string | null;
    };
    comp: {
      enabled: boolean;
      settlementCycle: "INSTANT" | "DAILY_MIDNIGHT" | "BET_DAY_PLUS";
      settlementOffsetDays: number | null;
      ratePct: string | null;
      estimatedKrw: string;
      actualSettledKrw: string;
      modeledBase: string;
    };
    solutionRates: {
      upstreamCasinoPct: string | null;
      upstreamSportsPct: string | null;
      platformCasinoPct: string | null;
      platformSportsPct: string | null;
      autoMarginPct: string | null;
      casinoBaseGgr: string;
      sportsBaseGgr: string;
      upstreamCostKrw: string;
      platformChargeKrw: string;
      solutionMarginKrw: string;
      modeledBase: string;
    };
  };
  verticals: Record<string, { betStake: string; winTotal: string; ggr: string; rounds: number }>;
};

type DirectUserRow = {
  userId: string;
  loginId: string;
  displayName: string;
  depositTotal: string;
  withdrawTotal: string;
  houseEdge: string;
  balance: string;
};

type AgentRow = {
  agentId: string;
  parentAgentId: string | null;
  treeParentAgentId?: string | null;
  loginId: string;
  displayName: string;
  memo: string;
  isTopAgent: boolean;
  platformSharePct: number;
  splitFromParentPct: number;
  effectivePct: number;
  downlineUsers: number;
  betStake: string;
  winTotal: string;
  ggr: string;
  depositTotal: string;
  withdrawTotal: string;
  houseEdge: string;
  myEstimatedSettlement: string;
  /** Sum of immediate child agents' estimated settlement (collapsed hint) */
  childrenSettlementTotal?: string;
  /** Users with parentUserId = this agent */
  directUsers?: DirectUserRow[];
};

function salesAgentTreeParentId(a: AgentRow): string | null {
  if (a.treeParentAgentId !== undefined) return a.treeParentAgentId;
  return a.parentAgentId;
}

type LedgerRow = {
  id: string;
  userId: string;
  userLoginId: string;
  userDisplayName: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  vertical: string;
  gameName: string;
  createdAt: string;
};

type SolutionBillingSettlementItem = {
  id: string;
  periodFrom: string;
  periodTo: string;
  casinoBaseGgr: string;
  sportsBaseGgr: string;
  upstreamCasinoPct: string;
  upstreamSportsPct: string;
  platformCasinoPct: string;
  platformSportsPct: string;
  upstreamCost: string;
  platformCharge: string;
  solutionMargin: string;
  note: string | null;
  settledByUserId: string | null;
  settledByLoginId: string | null;
  createdAt: string;
};

type SolutionBillingListResponse = {
  count: number;
  totalUpstreamCost: string;
  totalPlatformCharge: string;
  totalSolutionMargin: string;
  items: SolutionBillingSettlementItem[];
};

type SolutionBillingRunResult = {
  dryRun: boolean;
  status: "already_settled" | "ready" | "created";
  period: { from: string; to: string };
  settlement: {
    id: string | null;
    periodFrom: string;
    periodTo: string;
    casinoBaseGgr: string;
    sportsBaseGgr: string;
    upstreamCasinoPct: string;
    upstreamSportsPct: string;
    platformCasinoPct: string;
    platformSportsPct: string;
    upstreamCost: string;
    platformCharge: string;
    solutionMargin: string;
    note: string | null;
    settledByUserId: string | null;
    settledByLoginId: string | null;
    createdAt: string | null;
  };
};

// ─── 유틸 ─────────────────────────────────────────────────
function krw(v: string | number | null | undefined) {
  const n = Math.round(Number(v ?? 0));
  return Number.isFinite(n) ? n.toLocaleString("ko-KR") : "0";
}
function dt(s: string) {
  return new Date(s).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}
function vertLabel(v: string) {
  return { casino: "🎰 카지노", sports: "⚽ 스포츠", minigame: "🕹️ 미니게임", slot: "🎰 슬롯" }[v] ?? v;
}
function ledgerRowVisuals(type: string, amountStr: string) {
  const amt = Number(amountStr);
  const isWin = type === "WIN";
  const positive = amt > 0;
  const negative = amt < 0;
  const label = isWin ? "WIN" : positive ? "정산" : "BET";
  const badgeClass = positive
    ? "bg-emerald-400/10 text-[#3182f6]"
    : negative
      ? "bg-red-400/10 text-red-400"
      : "bg-gray-200/80 text-gray-600";
  const amtClass = positive ? "text-[#3182f6]" : negative ? "text-red-400" : "text-gray-500";
  return { label, badgeClass, amtClass, amtPrefix: positive ? "+" : "", amt };
}
function ggrColor(v: string | number) {
  const n = Number(v);
  return n > 0 ? "text-[#3182f6]" : n < 0 ? "text-red-400" : "text-gray-500";
}
function pointText(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : "0";
}
function compCycleLabel(
  cycle: "INSTANT" | "DAILY_MIDNIGHT" | "BET_DAY_PLUS",
  offsetDays: number | null,
) {
  if (cycle === "DAILY_MIDNIGHT") return "매일 00시";
  if (cycle === "BET_DAY_PLUS") return `배팅일 +${offsetDays ?? 0}일`;
  return "즉시";
}

type InnerTab = "summary" | "agents" | "ledger" | "solution";

type HqPortfolioRow = {
  platformId: string;
  name: string;
  slug: string;
  loadError: string | null;
  depositTotal?: string | null;
  withdrawTotal?: string | null;
  houseEdge?: string | null;
  topAgentSettlement?: string | null;
  cashNet?: string | null;
  upstreamCost?: string | null;
  solutionMargin?: string | null;
};

type HqPortfolioResponse = {
  totals: {
    solutionsTotal: number;
    solutionsWithMetrics: number;
    depositTotal: string;
    withdrawTotal: string;
    houseEdge: string;
    topAgentSettlement: string;
    cashNet: string;
    upstreamCost: string;
    solutionMargin: string;
  };
  rows: HqPortfolioRow[];
};

function SalesPageBody() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { platforms } = usePlatform();
  const isSuperAdmin = getStoredUser()?.role === "SUPER_ADMIN";

  const platformFromUrl = searchParams.get("platform");
  const viewPid = useMemo(() => {
    if (!platformFromUrl) return null;
    return platforms.some((p) => p.id === platformFromUrl) ? platformFromUrl : null;
  }, [platformFromUrl, platforms]);

  const setViewPlatform = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("platform", id);
      else params.delete("platform");
      const qs = params.toString();
      router.replace(qs ? `/console/sales?${qs}` : "/console/sales", { scroll: false });
    },
    [router, searchParams],
  );

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<InnerTab>("summary");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [solutionBilling, setSolutionBilling] =
    useState<SolutionBillingListResponse | null>(null);
  const [solutionBillingNote, setSolutionBillingNote] = useState("");
  const [solutionBillingResult, setSolutionBillingResult] =
    useState<SolutionBillingRunResult | null>(null);
  const [solutionPreviewing, setSolutionPreviewing] = useState(false);
  const [solutionRunning, setSolutionRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // 에이전트 트리 펼침 상태 (agentId 집합)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [ledgerOrder, setLedgerOrder] = useState<"asc" | "desc">("asc");
  const [portfolio, setPortfolio] = useState<HqPortfolioResponse | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  const loadPortfolio = useCallback(async () => {
    if (viewPid || !isSuperAdmin) {
      setPortfolio(null);
      return;
    }
    setPortfolioLoading(true);
    setErr(null);
    const q = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
    try {
      const data = await apiFetch<HqPortfolioResponse>(`/platforms/hq/portfolio-summary?${q}`);
      setPortfolio(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "전체 요약 조회 실패");
      setPortfolio(null);
    } finally {
      setPortfolioLoading(false);
    }
  }, [viewPid, from, to, isSuperAdmin]);

  const load = useCallback(async () => {
    if (!viewPid) return;
    setLoading(true);
    setErr(null);
    const q = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
    try {
      const [s, a, l, billing] = await Promise.all([
        apiFetch<Summary>(`/platforms/${viewPid}/sales/summary?${q}`),
        apiFetch<AgentRow[]>(`/platforms/${viewPid}/sales/agents?${q}`),
        apiFetch<LedgerRow[]>(
          `/platforms/${viewPid}/sales/ledger?${q}&limit=200&order=${ledgerOrder}`,
        ),
        isSuperAdmin
          ? apiFetch<SolutionBillingListResponse>(
              `/platforms/${viewPid}/solution-billing-settlements?take=20`,
            )
          : Promise.resolve(null),
      ]);
      setSummary(s);
      setAgents(a);
      setLedger(l);
      setSolutionBilling(billing);
      setOpenIds(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [viewPid, from, to, isSuperAdmin, ledgerOrder]);

  useEffect(() => {
    if (!viewPid) {
      setSummary(null);
      setAgents(null);
      setLedger(null);
      setSolutionBilling(null);
    }
  }, [viewPid]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSolutionBilling(dryRun: boolean) {
    if (!viewPid || !isSuperAdmin) return;
    if (!from || !to) {
      setErr("솔루션 청구 기간을 확인해주세요.");
      return;
    }

    if (dryRun) {
      setSolutionPreviewing(true);
    } else {
      setSolutionRunning(true);
    }
    setErr(null);
    setMsg(null);

    try {
      const result = await apiFetch<SolutionBillingRunResult>(
        `/platforms/${viewPid}/solution-billing-settlements/run`,
        {
          method: "POST",
          body: JSON.stringify({
            from: `${from}T00:00:00.000Z`,
            to: `${to}T23:59:59.999Z`,
            note: solutionBillingNote.trim() || undefined,
            dryRun,
          }),
        },
      );
      setSolutionBillingResult(result);
      if (dryRun) {
        setMsg(
          `솔루션 청구 미리보기: 상위업체 비용 ${krw(
            result.settlement.upstreamCost,
          )}원 / 플랫폼 청구 ${krw(result.settlement.platformCharge)}원`,
        );
      } else {
        setMsg(
          result.status === "already_settled"
            ? "이미 같은 기간 청구 원장이 등록되어 있습니다."
            : `솔루션 청구 원장 생성 완료: 플랫폼 청구 ${krw(
                result.settlement.platformCharge,
              )}원`,
        );
        await load();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "솔루션 청구 실행 실패");
    } finally {
      setSolutionPreviewing(false);
      setSolutionRunning(false);
    }
  }

  const TABS: { key: InnerTab; label: string }[] = [
    { key: "summary", label: "📊 매출 요약" },
    { key: "agents", label: "👤 총판 정산 구조" },
    { key: "ledger", label: "📋 배팅 원장" },
    ...(isSuperAdmin
      ? [{ key: "solution" as const, label: "🧾 솔루션 청구" }]
      : []),
  ];

  const selectedPlatformLabel = platforms.find((p) => p.id === viewPid)?.name ?? "";

  return (
    <div className="space-y-5 px-1">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">청구 / 정산</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            {viewPid
              ? `${selectedPlatformLabel} 상세 · 기간별 매출·총판·원장`
              : "전체 솔루션 합계입니다. 행 또는 선택 상자에서 솔루션을 고르면 상세 탭이 열립니다."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="sales-platform" className="text-xs text-gray-500 dark:text-zinc-500">
              솔루션
            </label>
            <select
              id="sales-platform"
              value={viewPid ?? ""}
              onChange={(e) => setViewPlatform(e.target.value || null)}
              className="max-w-[min(100%,20rem)] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">전체 요약</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "오늘", from: today, to: today },
            { label: "이번달", from: monthStart, to: today },
            { label: "이번주", from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0,10); })(), to: today },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => { setFrom(p.from); setTo(p.to); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                from === p.from && to === p.to
                  ? "bg-gray-200 text-gray-900 dark:bg-zinc-700 dark:text-zinc-100"
                  : "bg-gray-100 text-gray-500 hover:text-gray-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200" />
          <span className="text-gray-400 text-xs">~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200" />
          <button
            type="button"
            onClick={() => {
              if (viewPid) void load();
              else void loadPortfolio();
            }}
            disabled={viewPid ? loading : portfolioLoading}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {viewPid ? (loading ? "조회중…" : "조회") : portfolioLoading ? "조회중…" : "조회"}
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{err}</div>
      )}
      {msg && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{msg}</div>
      )}

      {!viewPid && isSuperAdmin ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-zinc-200">솔루션별 요약</h2>
          {portfolioLoading && !portfolio ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400">불러오는 중…</p>
          ) : portfolio ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                  <tr>
                    {["솔루션", "충전", "환전", "낙첨", "총판정산", "현금순익", "알원가", "본사마진", ""].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 font-medium text-gray-600 dark:text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {portfolio.rows.map((row) => (
                    <tr
                      key={row.platformId}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewPlatform(row.platformId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setViewPlatform(row.platformId);
                        }
                      }}
                      className="cursor-pointer border-b border-gray-100 transition hover:bg-gray-50 dark:border-zinc-800/80 dark:hover:bg-zinc-900"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-zinc-100">{row.name}</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-zinc-300">{krw(row.depositTotal)}원</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-zinc-300">{krw(row.withdrawTotal)}원</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-zinc-300">{krw(row.houseEdge)}원</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-zinc-300">{krw(row.topAgentSettlement)}원</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-zinc-300">{krw(row.cashNet)}원</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-zinc-300">{krw(row.upstreamCost)}원</td>
                      <td className="px-3 py-2 font-mono text-gray-700 dark:text-zinc-300">{krw(row.solutionMargin)}원</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-zinc-500">
                        {row.loadError ? <span className="text-red-500">오류</span> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50/80 font-semibold dark:border-zinc-800 dark:bg-zinc-900/50">
                  <tr>
                    <td className="px-3 py-2 text-gray-800 dark:text-zinc-200">합계 ({portfolio.totals.solutionsWithMetrics}/{portfolio.totals.solutionsTotal})</td>
                    <td className="px-3 py-2 font-mono dark:text-zinc-200">{krw(portfolio.totals.depositTotal)}원</td>
                    <td className="px-3 py-2 font-mono dark:text-zinc-200">{krw(portfolio.totals.withdrawTotal)}원</td>
                    <td className="px-3 py-2 font-mono dark:text-zinc-200">{krw(portfolio.totals.houseEdge)}원</td>
                    <td className="px-3 py-2 font-mono dark:text-zinc-200">{krw(portfolio.totals.topAgentSettlement)}원</td>
                    <td className="px-3 py-2 font-mono dark:text-zinc-200">{krw(portfolio.totals.cashNet)}원</td>
                    <td className="px-3 py-2 font-mono dark:text-zinc-200">{krw(portfolio.totals.upstreamCost)}원</td>
                    <td className="px-3 py-2 font-mono dark:text-zinc-200">{krw(portfolio.totals.solutionMargin)}원</td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400">요약 데이터가 없습니다.</p>
          )}
        </section>
      ) : null}

      {viewPid ? (
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      ) : null}

      {viewPid ? (
      <>
      {/* ── 매출 요약 탭 ── */}
      {tab === "summary" && summary && (() => {
        const deposit = Number(summary.wallet.depositTotal);
        const withdraw = Number(summary.wallet.withdrawTotal);
        // 총판 정산 기준: 회원별 낙첨금(입금-출금) 합계
        const houseEdge = Number(summary.wallet.houseEdge ?? (deposit - withdraw));
        const userProfit = withdraw - deposit;
        const rtp = Number(summary.betting.rtp);
        const totalSettle = Number(
          summary.wallet.estimatedRootAgentSettlementKrw ?? 0,
        );
        const depositBonus = Number(summary.costs.money.depositBonus);
        const pointRedeem = Number(summary.costs.money.pointRedeem);
        const otherMoneyCredits = Number(summary.costs.money.otherWalletCredits);
        const actualComp = Number(summary.costs.comp.actualSettledKrw ?? 0);
        const realizedMoneyCost = Number(summary.costs.money.total);
        const pointIssued = Number(summary.costs.pointAccrual.totalPoints);
        const pointIssuedEstimated = Number(summary.costs.pointAccrual.estimatedKrw ?? 0);
        const compEstimated = Number(summary.costs.comp.estimatedKrw ?? 0);
        const upstreamCost = Number(summary.costs.solutionRates.upstreamCostKrw ?? 0);
        const platformCharge = Number(summary.costs.solutionRates.platformChargeKrw ?? 0);
        const solutionRateMargin = Number(summary.costs.solutionRates.solutionMarginKrw ?? 0);
        const cashNet = houseEdge - totalSettle - realizedMoneyCost;
        const solutionCashNet = cashNet - upstreamCost;
        const policyEstimatedNet =
          houseEdge -
          totalSettle -
          depositBonus -
          otherMoneyCredits -
          pointIssuedEstimated -
          compEstimated;
        const solutionPolicyNet = policyEstimatedNet - upstreamCost;
        // 충전 대비 낙첨금 비율
        const lossRate = deposit > 0 ? (houseEdge / deposit * 100) : 0;
        return (
        <div className="space-y-5">
          {/* 핵심 KPI 카드 - 현금 기준 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className={`rounded-xl border p-4 ${houseEdge >= 0 ? "border-emerald-800/50 bg-[#3182f6]/5" : "border-red-800/50 bg-red-950/20"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">💸 총 낙첨금</p>
              <p className={`mt-2 text-2xl font-bold font-mono ${houseEdge >= 0 ? "text-[#3182f6]" : "text-red-400"}`}>
                {houseEdge >= 0 ? "+" : ""}{krw(houseEdge)}원
              </p>
              <p className="mt-1 text-xs text-gray-400">회원별 (충전 − 환전) 합계</p>
            </div>
            <div className={`rounded-xl border p-4 ${userProfit >= 0 ? "border-rose-800/50 bg-rose-950/20" : "border-emerald-800/50 bg-[#3182f6]/5"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">👤 유저 손익 합계</p>
              <p className={`mt-2 text-2xl font-bold font-mono ${userProfit >= 0 ? "text-rose-300" : "text-[#3182f6]"}`}>
                {userProfit >= 0 ? "+" : ""}{krw(userProfit)}원
              </p>
              <p className="mt-1 text-xs text-gray-400">총환전 − 총충전</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">✅ 총 입금</p>
              <p className="mt-2 text-2xl font-bold font-mono text-[#3182f6]">{krw(deposit)}원</p>
              <p className="mt-1 text-xs text-gray-400">{summary.wallet.depositCount}건 승인</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">💳 총 출금</p>
              <p className="mt-2 text-2xl font-bold font-mono text-red-300">{krw(withdraw)}원</p>
              <p className="mt-1 text-xs text-gray-400">{summary.wallet.withdrawCount}건 승인</p>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${isSuperAdmin ? "xl:grid-cols-7" : "xl:grid-cols-6"}`}>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">💰 총판 예상 정산금</p>
              <p className="mt-2 text-xl font-bold font-mono text-[#3182f6]">{krw(totalSettle)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">총 낙첨금 × 총판 실효율</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🎁 입금보너스</p>
              <p className="mt-2 text-xl font-bold font-mono text-rose-300">{krw(depositBonus)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">이벤트/첫충 등 머니 지급</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🔁 포인트 전환</p>
              <p className="mt-2 text-xl font-bold font-mono text-rose-300">{krw(pointRedeem)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">포인트 → 머니 실제 전환</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🗂️ 실집행 콤프</p>
              <p className="mt-2 text-xl font-bold font-mono text-rose-300">{krw(actualComp)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">수동 정산으로 실제 지급된 콤프</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🧾 기타 머니지급</p>
              <p className="mt-2 text-xl font-bold font-mono text-rose-300">{krw(otherMoneyCredits)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">수동/기타 지갑 지급분</p>
            </div>
            <div className={`rounded-xl border p-4 ${cashNet >= 0 ? "border-emerald-800/40 bg-[#3182f6]/5" : "border-red-800/40 bg-red-950/10"}`}>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🏦 플랫폼 현금 순이익</p>
              <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(cashNet)}`}>{krw(cashNet)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">낙첨금 − 총판 − 실제 머니비용</p>
            </div>
            {isSuperAdmin ? (
              <div className={`rounded-xl border p-4 ${solutionCashNet >= 0 ? "border-cyan-800/40 bg-cyan-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">🛰️ 솔루션 현금 순이익</p>
                <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(solutionCashNet)}`}>{krw(solutionCashNet)}원</p>
                <p className="mt-0.5 text-xs text-gray-400">플랫폼 현금 순익 − 상위업체 비용</p>
              </div>
            ) : null}
          </div>

          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${isSuperAdmin ? "xl:grid-cols-8" : "xl:grid-cols-5"}`}>
            <div className={`rounded-xl border p-4 ${policyEstimatedNet >= 0 ? "border-emerald-800/40 bg-[#3182f6]/5" : "border-red-800/40 bg-red-950/10"}`}>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">📉 플랫폼 정책 추정 순이익</p>
              <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(policyEstimatedNet)}`}>{krw(policyEstimatedNet)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">포인트 발행·콤프를 당기 비용으로 가정</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🪙 발행 포인트</p>
              <p className="mt-2 text-xl font-bold font-mono text-gray-900">{pointText(pointIssued)}P</p>
              <p className="mt-0.5 text-xs text-gray-400">당기 포인트 적립 합계</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">📌 포인트 충당 추정</p>
              <p className="mt-2 text-xl font-bold font-mono text-[#3182f6]">
                {summary.costs.pointAccrual.estimatedKrw != null
                  ? `${krw(summary.costs.pointAccrual.estimatedKrw)}원`
                  : "환산율 없음"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {summary.costs.pointAccrual.redeemKrwPerPoint
                  ? `1P = ${summary.costs.pointAccrual.redeemKrwPerPoint}원 기준`
                  : "KRW 전환율 미설정"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🗓️ 콤프 추정</p>
              <p className="mt-2 text-xl font-bold font-mono text-[#3182f6]">{krw(compEstimated)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {summary.costs.comp.enabled
                  ? `${compCycleLabel(
                      summary.costs.comp.settlementCycle,
                      summary.costs.comp.settlementOffsetDays,
                    )} · ${summary.costs.comp.ratePct ?? "0"}%`
                  : "콤프 미사용"}
              </p>
            </div>
            {isSuperAdmin ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">🏢 상위업체 비용</p>
                  <p className="mt-2 text-xl font-bold font-mono text-rose-300">{krw(upstreamCost)}원</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    카지노·슬롯·미니 / 스포츠 양수 GGR 기준
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">🧾 플랫폼 청구액</p>
                  <p className="mt-2 text-xl font-bold font-mono text-gray-900">{krw(platformCharge)}원</p>
                  <p className="mt-0.5 text-xs text-gray-400">설정된 카지노/스포츠 요율</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">📐 솔루션 요율 마진</p>
                  <p className="mt-2 text-xl font-bold font-mono text-[#3182f6]">{krw(solutionRateMargin)}원</p>
                  <p className="mt-0.5 text-xs text-gray-400">플랫폼 청구액 − 상위업체 비용</p>
                </div>
                <div className={`rounded-xl border p-4 ${solutionPolicyNet >= 0 ? "border-cyan-800/40 bg-cyan-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">🛰️ 솔루션 정책 추정 순이익</p>
                  <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(solutionPolicyNet)}`}>{krw(solutionPolicyNet)}원</p>
                  <p className="mt-0.5 text-xs text-gray-400">플랫폼 정책 순익 − 상위업체 비용</p>
                </div>
              </>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className={`rounded-xl border p-4 ${lossRate >= 0 ? "border-[#3182f6]/30 bg-[#3182f6]/5" : "border-red-800/50 bg-red-950/20"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">📈 낙첨률</p>
              <p className={`mt-2 text-2xl font-bold font-mono ${lossRate >= 0 ? "text-[#3182f6]" : "text-red-400"}`}>
                {lossRate >= 0 ? "+" : ""}{lossRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-gray-400">총 낙첨금 ÷ 총 충전</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🎰 총 배팅액</p>
              <p className="mt-2 text-xl font-bold font-mono text-gray-900">{krw(summary.betting.betStake)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">{summary.betting.rounds}라운드</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">🏆 총 당첨금</p>
              <p className="mt-2 text-xl font-bold font-mono text-gray-900">{krw(summary.betting.winTotal)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">RTP {rtp}%</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">📊 베팅 순수익</p>
              <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(summary.betting.ggr)}`}>{krw(summary.betting.ggr)}원</p>
              <p className="mt-0.5 text-xs text-gray-400">배팅 − 당첨 (참고값)</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">👥 회원 / 총판</p>
              <p className="mt-2 text-xl font-bold font-mono text-gray-900">{summary.platform.userCnt}명</p>
              <p className="mt-0.5 text-xs text-gray-400">총판 {summary.platform.agentCnt}명</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">비용 · 충당 상세</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-gray-700">실제 머니 차감</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">총판 예상 정산금</span>
                      <span className="font-mono text-[#3182f6]">{krw(totalSettle)}원</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">입금보너스</span>
                      <span className="font-mono text-rose-300">{krw(depositBonus)}원</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">포인트 머니전환</span>
                      <span className="font-mono text-rose-300">{krw(pointRedeem)}원</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">실집행 콤프</span>
                      <span className="font-mono text-rose-300">{krw(actualComp)}원</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">기타 머니지급</span>
                      <span className="font-mono text-rose-300">{krw(otherMoneyCredits)}원</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-2">
                      <span className="text-gray-500">현금 순이익</span>
                      <span className={`font-mono font-bold ${ggrColor(cashNet)}`}>{krw(cashNet)}원</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-black/20 p-4">
                  <p className="text-xs font-semibold text-gray-700">포인트 · 콤프 충당</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">출석/연속출석</span>
                      <span className="font-mono text-gray-800">
                        {pointText(
                          Number(summary.costs.pointAccrual.attendancePoints) +
                            Number(summary.costs.pointAccrual.attendanceStreakPoints),
                        )}P
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">낙첨 포인트</span>
                      <span className="font-mono text-gray-800">{pointText(summary.costs.pointAccrual.loseBetPoints)}P</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">추천 포인트</span>
                      <span className="font-mono text-gray-800">{pointText(summary.costs.pointAccrual.referralPoints)}P</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">충전형 포인트</span>
                      <span className="font-mono text-gray-800">{pointText(summary.costs.pointAccrual.depositPoints)}P</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">전체/기타 포인트</span>
                      <span className="font-mono text-gray-800">
                        {pointText(
                          Number(summary.costs.pointAccrual.bulkGrantPoints) +
                            Number(summary.costs.pointAccrual.otherAdjustmentPoints),
                        )}P
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">포인트 충당 추정</span>
                      <span className="font-mono text-[#3182f6]">
                        {summary.costs.pointAccrual.estimatedKrw != null
                          ? `${krw(summary.costs.pointAccrual.estimatedKrw)}원`
                          : "환산율 없음"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-500">콤프 정책 추정</span>
                      <span className="font-mono text-[#3182f6]">{krw(compEstimated)}원</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-2">
                      <span className="text-gray-500">정책상 추정 순이익</span>
                      <span className={`font-mono font-bold ${ggrColor(policyEstimatedNet)}`}>{krw(policyEstimatedNet)}원</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                    정책상 추정 순이익은 포인트 발행과 콤프를 당기 비용으로 본 값입니다.
                    포인트 머니전환과 실집행 콤프는 현금 순이익에만 반영해 이중 차감을 피했습니다.
                  </p>
                </div>
              </div>
              {isSuperAdmin ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-black/20 p-4">
                <p className="text-xs font-semibold text-gray-700">상위업체 요율 기준</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white/40 px-3 py-3">
                    <p className="text-[11px] text-gray-500">카지노</p>
                    <p className="mt-1 text-sm text-gray-800">
                      상위 {summary.costs.solutionRates.upstreamCasinoPct ?? "0"}% / 플랫폼 {summary.costs.solutionRates.platformCasinoPct ?? "0"}%
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      기준 GGR {krw(summary.costs.solutionRates.casinoBaseGgr)}원
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white/40 px-3 py-3">
                    <p className="text-[11px] text-gray-500">스포츠</p>
                    <p className="mt-1 text-sm text-gray-800">
                      상위 {summary.costs.solutionRates.upstreamSportsPct ?? "0"}% / 플랫폼 {summary.costs.solutionRates.platformSportsPct ?? "0"}%
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      기준 GGR {krw(summary.costs.solutionRates.sportsBaseGgr)}원
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white/40 px-3 py-3">
                    <p className="text-[11px] text-gray-500">자동 마진</p>
                    <p className="mt-1 text-sm text-[#3182f6]">
                      {summary.costs.solutionRates.autoMarginPct ?? "0"}%
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      기준: {summary.costs.solutionRates.modeledBase}
                    </p>
                  </div>
                </div>
              </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">게임별 하우스 수익</h3>
              <div className="space-y-2">
                {Object.entries(summary.verticals).map(([vert, data]) => {
                  const ggrN = Number(data.ggr);
                  const stakeN = Number(data.betStake);
                  const pct = stakeN > 0 ? (ggrN / stakeN) * 100 : 0;
                  return (
                    <div key={vert} className="rounded-lg border border-gray-200 bg-black/20 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{vertLabel(vert)}</span>
                        <span className="text-xs text-gray-400">{data.rounds}라운드</span>
                      </div>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-gray-400">배팅 {krw(data.betStake)}원 / 당첨 {krw(data.winTotal)}원</p>
                        </div>
                        <p className={`text-base font-bold font-mono ${ggrColor(data.ggr)}`}>
                          수익 {krw(data.ggr)}원
                          <span className="ml-1 text-xs text-gray-500">({pct.toFixed(1)}%)</span>
                        </p>
                      </div>
                      {/* 진행바 */}
                      <div className="mt-1.5 h-1 rounded-full bg-gray-100">
                        <div
                          className={`h-1 rounded-full ${ggrN > 0 ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, Math.abs(pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
        );
      })()}

      {/* ── 에이전트 정산 탭 (트리 뷰) ── */}
      {tab === "agents" && (() => {
        if (!viewPid) {
          return (
            <p className="text-sm text-[#3182f6]/90">
              플랫폼을 선택해 주세요.
            </p>
          );
        }
        if (agents === null && loading) {
          return <p className="text-sm text-gray-500">불러오는 중...</p>;
        }
        if (!agents || agents.length === 0) {
          return <p className="text-sm text-gray-400">등록된 총판이 없습니다.</p>;
        }

        // 회원별 낙첨금(입금-출금)을 총판 트리 기준으로 통합 합산
        const totalHouseEdge = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.houseEdge ?? 0), 0);
        const totalSettle = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.myEstimatedSettlement), 0);
        const totalDeposit = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.depositTotal), 0);
        const totalWithdraw = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.withdrawTotal), 0);
        const totalUserProfit = totalWithdraw - totalDeposit;
        const postSettlementResidual = totalHouseEdge - totalSettle;

        const topAgents = agents.filter(a => a.isTopAgent);

        const toggleAgent = (id: string) => {
          setOpenIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        };

        const renderAgent = (agent: AgentRow, depth: number): React.ReactNode => {
          const childAgents = agents.filter(
            (a) => salesAgentTreeParentId(a) === agent.agentId,
          );
          const directUsers = agent.directUsers ?? [];
          const hasChildren = childAgents.length > 0 || directUsers.length > 0;
          const isOpen = openIds.has(agent.agentId);
          const indent = depth * 20;
          const childSettleSum = Number(agent.childrenSettlementTotal ?? 0);
          return (
            <div key={agent.agentId} className={depth > 0 ? "border-t border-gray-200/40 bg-white/30" : ""}>
              <button
                type="button"
                onClick={() => {
                  toggleAgent(agent.agentId);
                }}
                className="relative z-10 w-full cursor-pointer select-none flex items-center gap-2 px-4 py-3 text-left transition hover:bg-gray-100"
                style={{ paddingLeft: `${16 + indent}px` }}
              >
                <span className="w-4 shrink-0 text-gray-500 text-xs">
                  {isOpen ? "▼" : "▶"}
                </span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  depth === 0 ? "bg-amber-600/25 text-[#3182f6]" :
                  depth === 1 ? "bg-violet-700/30 text-[#3182f6]" :
                  "bg-gray-200/40 text-gray-500"
                }`}>
                  {depth === 0 ? "최상위" : depth === 1 ? "하위" : `${depth + 1}단`}
                </span>
                <span className="font-mono text-sm font-semibold text-gray-900 min-w-0 truncate">{agent.loginId}</span>
                {agent.displayName && <span className="text-xs text-gray-500 shrink-0 hidden sm:inline">{agent.displayName}</span>}
                {childAgents.length > 0 && (
                  <span className="text-[10px] text-gray-400 shrink-0 ml-1">하위 총판 {childAgents.length}</span>
                )}
                {directUsers.length > 0 && (
                  <span className="text-[10px] text-gray-400 shrink-0">직속 유저 {directUsers.length}</span>
                )}
                {!hasChildren && (
                  <span className="text-[10px] text-gray-400 shrink-0">하위 없음</span>
                )}
                <div className="pointer-events-none ml-auto flex flex-col items-end gap-0.5 text-xs shrink-0 sm:flex-row sm:items-center sm:gap-3">
                  {childAgents.length > 0 && (
                    <span
                      className="text-[10px] text-cyan-400/90 font-mono hidden sm:inline"
                      title="직속 하위 총판 정산금 합계(펼치기 전)"
                    >
                      하위정산 Σ {krw(childSettleSum)}원
                    </span>
                  )}
                  <span className="text-gray-500 hidden md:block">전체 유저 {agent.downlineUsers}명</span>
                  <span className={`font-mono font-bold ${Number(agent.houseEdge ?? 0) >= 0 ? "text-[#3182f6]" : "text-red-400"}`}>
                    낙첨금 {krw(agent.houseEdge ?? 0)}원
                  </span>
                  <span className="text-[#3182f6] font-mono font-bold">예상정산 {krw(agent.myEstimatedSettlement)}원</span>
                </div>
              </button>
              {isOpen && (
                <div style={{ paddingLeft: `${indent}px` }} className="pb-1">
                  {!hasChildren && (
                    <p className="px-8 py-2 text-[11px] text-gray-500">
                      이 기간에 직속 하위 총판·직속 유저 실적이 없습니다.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 px-8 py-1.5 text-[11px] text-gray-500 bg-black/20">
                    <span>입금 <b className="text-[#3182f6]">{krw(agent.depositTotal)}원</b></span>
                    <span>출금 <b className="text-red-400">{krw(agent.withdrawTotal)}원</b></span>
                    <span>유저손익 <b className={Number(agent.houseEdge ?? 0) <= 0 ? "text-[#3182f6]" : "text-red-300"}>{krw(-Number(agent.houseEdge ?? 0))}원</b></span>
                    <span>총 낙첨금 <b className={Number(agent.houseEdge ?? 0) >= 0 ? "text-[#3182f6]" : "text-red-300"}>{krw(agent.houseEdge ?? 0)}원</b></span>
                    <span>예상 정산금 <b className="text-[#3182f6]">{krw(agent.myEstimatedSettlement)}원</b></span>
                    {childAgents.length > 0 && (
                      <span>하위정산 Σ <b className="text-[#3182f6]">{krw(childSettleSum)}원</b></span>
                    )}
                    {agent.platformSharePct > 0 && <span>플랫폼요율 <b className="text-gray-700">{agent.platformSharePct}%</b></span>}
                    {agent.splitFromParentPct > 0 && <span>분배율 <b className="text-gray-700">{agent.splitFromParentPct}%</b></span>}
                    {agent.effectivePct > 0 && <span>실효율 <b className="text-[#3182f6]">{agent.effectivePct}%</b></span>}
                  </div>
                  {childAgents.length > 0 ? (
                    <div className="mt-2 border-t border-gray-200/50 pt-2">
                      <p className="px-8 text-[11px] font-semibold uppercase tracking-wide text-gray-500">하위 총판</p>
                      <div className="mt-1">
                        {[...childAgents].sort((a, b) => a.loginId.localeCompare(b.loginId)).map((c) => renderAgent(c, depth + 1))}
                      </div>
                    </div>
                  ) : null}
                  {directUsers.length > 0 ? (
                    <div className="mt-3 border-t border-gray-200/50 pt-2 px-4 sm:px-8 pb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">직속 유저</p>
                      <div className="overflow-x-auto rounded-lg border border-gray-200/80 bg-black/20">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                              {["로그인", "표시명", "입금", "출금", "유저손익", "총판기준 낙첨금", "현재 잔액"].map((h) => (
                                <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...directUsers].sort((a, b) => a.loginId.localeCompare(b.loginId)).map((u) => {
                              const agentDrop = Number(u.houseEdge);
                              const userProfit = -agentDrop;
                              return (
                                <tr key={u.userId} className="border-b border-gray-100/80 hover:bg-gray-50">
                                  <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">{u.loginId}</td>
                                  <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate" title={u.displayName}>{u.displayName || "—"}</td>
                                  <td className="px-3 py-2 font-mono text-[#3182f6]/90 whitespace-nowrap">{krw(u.depositTotal)}원</td>
                                  <td className="px-3 py-2 font-mono text-red-400/90 whitespace-nowrap">{krw(u.withdrawTotal)}원</td>
                                  <td className={`px-3 py-2 font-mono whitespace-nowrap ${userProfit >= 0 ? "text-rose-300/90" : "text-[#3182f6]/90"}`}>
                                    {krw(userProfit)}원
                                  </td>
                                  <td className={`px-3 py-2 font-mono whitespace-nowrap ${agentDrop >= 0 ? "text-[#3182f6]/90" : "text-red-300/90"}`}>
                                    {krw(agentDrop)}원
                                  </td>
                                  <td className="px-3 py-2 font-mono text-gray-700 whitespace-nowrap">{krw(u.balance)}원</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="space-y-4">
            {/* 전체 합계 카드 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">💸 총 낙첨금 합계</p>
                <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(totalHouseEdge)}`}>{krw(totalHouseEdge)}원</p>
                <p className="mt-0.5 text-xs text-gray-400">총입금 {krw(totalDeposit)} − 총출금 {krw(totalWithdraw)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">💰 총판 예상 정산금</p>
                <p className="mt-2 text-xl font-bold font-mono text-[#3182f6]">{krw(totalSettle)}원</p>
                <p className="mt-0.5 text-xs text-gray-400">총 낙첨금 × 각 총판 실효율</p>
              </div>
              <div className={`rounded-xl border p-4 ${postSettlementResidual >= 0 ? "border-emerald-800/40 bg-[#3182f6]/5" : "border-red-800/40 bg-red-950/10"}`}>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">🏦 총판 차감 후 잔여금</p>
                <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(postSettlementResidual)}`}>{krw(postSettlementResidual)}원</p>
                <p className="mt-1 text-xs text-gray-400">총 낙첨금 − 총판 예상 정산금 (보너스/포인트/콤프 제외)</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">👤 유저 손익 합계</p>
                <p className={`mt-2 text-xl font-bold font-mono ${totalUserProfit >= 0 ? "text-rose-300" : "text-[#3182f6]"}`}>{krw(totalUserProfit)}원</p>
                <p className="mt-0.5 text-xs text-gray-400">총환전 − 총입금</p>
              </div>
            </div>

            {/* 트리 뷰 */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500">총판 구조</span>
                <span className="text-[10px] text-gray-400">▶ 클릭하여 하위 총판 펼치기/닫기</span>
              </div>
              <div>
                {topAgents.map(a => renderAgent(a, 0))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 솔루션 청구 탭 ── */}
      {tab === "solution" && isSuperAdmin && (
        <div className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white/50 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  솔루션 청구 실행
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  선택 기간의 카지노·슬롯·미니(동일 버킷) 및 스포츠 양수 GGR 기준으로
                  상위업체 비용과 플랫폼 청구액을 계산해 원장으로 고정합니다.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[28rem]">
                <input
                  type="text"
                  value={solutionBillingNote}
                  onChange={(e) => setSolutionBillingNote(e.target.value)}
                  placeholder="메모 (예: 4월 월마감 청구)"
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runSolutionBilling(true)}
                    disabled={solutionPreviewing || solutionRunning || loading}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                  >
                    {solutionPreviewing ? "미리보기 중..." : "미리보기"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void runSolutionBilling(false)}
                    disabled={solutionRunning || solutionPreviewing || loading}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {solutionRunning ? "원장 생성 중..." : "원장 생성"}
                  </button>
                </div>
              </div>
            </div>

            {solutionBillingResult ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-xl border border-gray-200 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      상태
                    </p>
                    <p className="mt-2 text-lg font-bold text-gray-900">
                      {solutionBillingResult.status === "already_settled"
                        ? "기존 원장 있음"
                        : solutionBillingResult.status === "created"
                          ? "원장 생성 완료"
                          : "생성 가능"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(
                        solutionBillingResult.settlement.periodFrom,
                      ).toLocaleDateString("ko-KR")}{" "}
                      ~{" "}
                      {new Date(
                        solutionBillingResult.settlement.periodTo,
                      ).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      카·슬·미니 양수 GGR
                    </p>
                    <p className="mt-2 text-lg font-bold font-mono text-gray-900">
                      {krw(solutionBillingResult.settlement.casinoBaseGgr)}원
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      요율 {solutionBillingResult.settlement.platformCasinoPct}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      스포츠 양수 GGR
                    </p>
                    <p className="mt-2 text-lg font-bold font-mono text-gray-900">
                      {krw(solutionBillingResult.settlement.sportsBaseGgr)}원
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      요율 {solutionBillingResult.settlement.platformSportsPct}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-black/20 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      상위업체 비용
                    </p>
                    <p className="mt-2 text-lg font-bold font-mono text-rose-300">
                      {krw(solutionBillingResult.settlement.upstreamCost)}원
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      카지노 {solutionBillingResult.settlement.upstreamCasinoPct}% /
                      스포츠 {solutionBillingResult.settlement.upstreamSportsPct}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      솔루션 요율 마진
                    </p>
                    <p className="mt-2 text-lg font-bold font-mono text-[#3182f6]">
                      {krw(solutionBillingResult.settlement.solutionMargin)}원
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      플랫폼 청구 {krw(solutionBillingResult.settlement.platformCharge)}원
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-black/20 px-4 py-3 text-sm text-gray-500">
                  {solutionBillingResult.settlement.note ? (
                    <span>메모: {solutionBillingResult.settlement.note}</span>
                  ) : (
                    <span>메모 없음</span>
                  )}
                  {solutionBillingResult.settlement.createdAt ? (
                    <span className="ml-3">
                      생성시각 {dt(solutionBillingResult.settlement.createdAt)}
                    </span>
                  ) : null}
                  {solutionBillingResult.settlement.settledByLoginId ? (
                    <span className="ml-3">
                      처리자 {solutionBillingResult.settlement.settledByLoginId}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                누적 청구 건수
              </p>
              <p className="mt-2 text-xl font-bold font-mono text-gray-900">
                {solutionBilling?.count ?? 0}건
              </p>
              <p className="mt-1 text-xs text-gray-400">최근 생성 원장 기준</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                누적 상위업체 비용
              </p>
              <p className="mt-2 text-xl font-bold font-mono text-rose-300">
                {krw(solutionBilling?.totalUpstreamCost ?? 0)}원
              </p>
              <p className="mt-1 text-xs text-gray-400">등록된 청구 원장 합계</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                누적 플랫폼 청구액
              </p>
              <p className="mt-2 text-xl font-bold font-mono text-gray-900">
                {krw(solutionBilling?.totalPlatformCharge ?? 0)}원
              </p>
              <p className="mt-1 text-xs text-gray-400">플랫폼 대상 누적 청구</p>
            </div>
            <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/10 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                누적 솔루션 마진
              </p>
              <p className="mt-2 text-xl font-bold font-mono text-[#3182f6]">
                {krw(solutionBilling?.totalSolutionMargin ?? 0)}원
              </p>
              <p className="mt-1 text-xs text-gray-400">플랫폼 청구액 - 상위업체 비용</p>
            </div>
          </section>

          <section className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {[
                    "생성시각",
                    "정산기간",
                    "카지노 GGR",
                    "스포츠 GGR",
                    "상위업체 비용",
                    "플랫폼 청구액",
                    "솔루션 마진",
                    "처리자",
                    "메모",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {solutionBilling?.items.length ? (
                  solutionBilling.items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {dt(row.createdAt)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                        {new Date(row.periodFrom).toLocaleDateString("ko-KR")} ~{" "}
                        {new Date(row.periodTo).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">
                        {krw(row.casinoBaseGgr)}원
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">
                        {krw(row.sportsBaseGgr)}원
                      </td>
                      <td className="px-3 py-2 font-mono text-rose-300 whitespace-nowrap">
                        {krw(row.upstreamCost)}원
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-900 whitespace-nowrap">
                        {krw(row.platformCharge)}원
                      </td>
                      <td className="px-3 py-2 font-mono text-[#3182f6] whitespace-nowrap">
                        {krw(row.solutionMargin)}원
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {row.settledByLoginId ?? "SYSTEM"}
                      </td>
                      <td
                        className="px-3 py-2 max-w-[16rem] truncate text-gray-500"
                        title={row.note ?? ""}
                      >
                        {row.note || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-8 text-center text-sm text-gray-400"
                    >
                      등록된 솔루션 청구 원장이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ── 배팅 원장 탭 ── */}
      {tab === "ledger" && (
        <div>
          <div className="flex flex-wrap items-center justify-end gap-2 mb-3 text-[11px] text-gray-600">
            <span className="text-gray-500">원장 정렬</span>
            <button
              type="button"
              onClick={() => setLedgerOrder("asc")}
              className={`rounded-lg border px-2.5 py-1 transition ${
                ledgerOrder === "asc"
                  ? "border-[#3182f6] bg-blue-50 font-semibold text-[#1e4e8c]"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              오래된순
            </button>
            <button
              type="button"
              onClick={() => setLedgerOrder("desc")}
              className={`rounded-lg border px-2.5 py-1 transition ${
                ledgerOrder === "desc"
                  ? "border-[#3182f6] bg-blue-50 font-semibold text-[#1e4e8c]"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              최신순
            </button>
          </div>
          {loading ? (
            <p className="py-6 text-sm text-gray-500">불러오는 중...</p>
          ) : ledger && ledger.length === 0 ? (
            <p className="py-6 text-sm text-gray-400">배팅 원장이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-[65vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                    {["시각", "유저", "타입", "게임", "카테고리", "금액", "처리후잔액", "라운드ID"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger?.map((r) => {
                    const { label, badgeClass, amtClass, amtPrefix, amt } = ledgerRowVisuals(
                      r.type,
                      r.amount,
                    );
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{dt(r.createdAt)}</td>
                        <td className="px-3 py-2 font-mono text-gray-800">{r.userLoginId}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${badgeClass}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{r.gameName || "—"}</td>
                        <td className="px-3 py-2 text-gray-500">{vertLabel(r.vertical)}</td>
                        <td className={`px-3 py-2 font-mono font-bold ${amtClass}`}>
                          {amtPrefix}
                          {krw(amt)}원
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500">{krw(r.balanceAfter)}원</td>
                        <td className="px-3 py-2 font-mono text-zinc-700 max-w-[100px] truncate" title={r.reference ?? ""}>
                          {r.reference ? r.reference.slice(0, 10) + "…" : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </>
      ) : null}
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-10 text-center text-sm text-gray-500 dark:text-zinc-400">불러오는 중…</div>
      }
    >
      <SalesPageBody />
    </Suspense>
  );
}

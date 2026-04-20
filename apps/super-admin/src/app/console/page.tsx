"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { inferAdminHost, inferAgentHost, inferRootHost } from "@/lib/platform-hosts";
import { usePlatform } from "@/context/PlatformContext";

type Summary = {
  platform: { userCnt: number; agentCnt: number };
  betting: { rounds: number; betStake: string; winTotal: string; ggr: string; rtp: string };
  wallet: {
    depositCount: number; depositTotal: string; withdrawCount: number;
    withdrawTotal: string; netInflow: string; houseEdge: string;
  };
  costs: {
    money: { depositBonus: string; pointRedeem: string; otherWalletCredits: string; total: string };
    pointAccrual: { estimatedKrw: string | null; totalPoints: string };
    comp: { estimatedKrw: string; actualSettledKrw: string };
    solutionRates: {
      upstreamCasinoPct: string | null; upstreamSportsPct: string | null;
      platformCasinoPct: string | null; platformSportsPct: string | null;
      upstreamCostKrw: string; platformChargeKrw: string; solutionMarginKrw: string;
    };
  };
};

type AgentRow = { isTopAgent: boolean; myEstimatedSettlement: string };

type PlatformOverview = {
  id: string; slug: string; name: string;
  rootHost: string | null; adminHost: string | null; agentHost: string | null;
  previewPort: number | null;
  userCnt: number; agentCnt: number;
  deposit: number; withdraw: number; houseEdge: number;
  totalSettle: number; ggr: number;
  realizedMoneyCost: number;
  upstreamCost: number; platformCharge: number; solutionRateMargin: number;
  cashNet: number;
  platformCasinoPct: string | null; platformSportsPct: string | null;
};

function krw(v: number | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0";
  try { return n.toLocaleString("ko-KR"); } catch { return "0"; }
}

function signed(v: number | null | undefined) {
  const n = Number(v ?? 0);
  return `${Number.isFinite(n) && n > 0 ? "+" : ""}${krw(n)}원`;
}

function numColor(v: number | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "text-gray-900";
  return n > 0 ? "text-[#3182f6] font-bold" : n < 0 ? "text-red-500 font-bold" : "text-gray-500";
}

/* ── KPI Card (light theme with accent colors) ── */
function KpiCard({
  label, value, sub, highlight = false, accent = "default",
}: {
  label: string; value: string; sub: string; highlight?: boolean;
  accent?: "default" | "blue" | "green" | "orange" | "purple" | "red";
}) {
  const styles: Record<string, { border: string; bg: string; text: string; dot: string }> = {
    default: { border: "border-gray-200", bg: "bg-white", text: "text-black", dot: "bg-gray-300" },
    blue:    { border: "border-[#3182f6]/30", bg: "bg-[#3182f6]/5", text: "text-[#3182f6]", dot: "bg-[#3182f6]" },
    green:   { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    orange:  { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
    purple:  { border: "border-violet-200", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-400" },
    red:     { border: "border-red-200", bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
  };
  const s = highlight ? styles.blue : styles[accent] ?? styles.default;
  return (
    <div className={`rounded-2xl border ${s.border} ${s.bg} p-4 relative overflow-hidden`}>
      <div className={`absolute top-3 right-3 h-2 w-2 rounded-full ${s.dot}`} />
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className={`mt-2 text-[22px] font-bold ${s.text}`}>{value}</p>
      <p className="mt-1 text-[12px] text-gray-500">{sub}</p>
    </div>
  );
}

/* ── SVG Donut Chart ── */
const DONUT_COLORS = [
  "#3182f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#f97316", "#6366f1",
];

function DonutChart({ rows, metric, title }: {
  rows: PlatformOverview[];
  metric: "houseEdge" | "solutionRateMargin";
  title: string;
}) {
  if (rows.length === 0) return null;
  const values = rows.map((r) => Math.max(0, r[metric]));
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return <p className="text-[13px] text-gray-400 text-center py-4">데이터 없음</p>;

  const R = 80;
  const r = 52;
  const cx = 100;
  const cy = 100;
  let currentAngle = -Math.PI / 2;

  const slices = values.map((v, i) => {
    const frac = v / total;
    const startAngle = currentAngle;
    const endAngle = currentAngle + frac * 2 * Math.PI;
    currentAngle = endAngle;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const ix1 = cx + r * Math.cos(endAngle);
    const iy1 = cy + r * Math.sin(endAngle);
    const ix2 = cx + r * Math.cos(startAngle);
    const iy2 = cy + r * Math.sin(startAngle);
    const large = frac > 0.5 ? 1 : 0;
    return {
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      name: rows[i].name,
      value: v,
      frac,
    };
  });

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="shrink-0">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {slices.map((s, i) => (
            <path key={i} d={s.d} fill={s.color} opacity={0.88} />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="#6b7280" fontWeight="600">합계</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={13} fill="#111827" fontWeight="700">
            {krw(total)}
          </text>
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize={10} fill="#9ca3af">원</text>
        </svg>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-[13px] font-bold text-black mb-2">{title}</p>
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-[13px] text-gray-700">{s.name}</span>
            <span className="font-mono text-[13px] font-semibold text-gray-900">{krw(s.value)}원</span>
            <span className="text-[11px] text-gray-400">{(s.frac * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PLATFORM_ACTIONS = [
  { label: "청구 / 정산", path: "/console/sales" },
  { label: "알값 / 정책", path: "/console/operational" },
  { label: "자산 배정", path: "/console/assets" },
  { label: "운영 계정", path: "/console/users" },
  { label: "솔루션 테마", path: "/console/theme" },
  { label: "도메인 / 배포", path: "/console/sync" },
  { label: "테스트 시나리오", path: "/console/test-scenario" },
];

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { platforms, loading: platformLoading, setSelectedPlatformId, selectedPlatformId } = usePlatform();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<PlatformOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = platforms.find((p) => p.id === selectedPlatformId) ?? null;
  const selectedRow = rows.find((r) => r.id === selectedPlatformId) ?? null;

  const load = useCallback(async () => {
    if (platforms.length === 0) { setRows([]); return; }
    setLoading(true);
    setErr(null);
    const query = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
    try {
      const settled = await Promise.allSettled(
        platforms.map(async (platform) => {
          const [summary, agents] = await Promise.all([
            apiFetch<Summary>(`/platforms/${platform.id}/sales/summary?${query}`),
            apiFetch<AgentRow[]>(`/platforms/${platform.id}/sales/agents?${query}`),
          ]);
          const deposit = Number(summary.wallet.depositTotal ?? 0);
          const withdraw = Number(summary.wallet.withdrawTotal ?? 0);
          const houseEdge = Number(summary.wallet.houseEdge ?? deposit - withdraw);
          const totalSettle = agents
            .filter((a) => a.isTopAgent)
            .reduce((sum, a) => sum + Number(a.myEstimatedSettlement ?? 0), 0);
          const realizedMoneyCost = Number(summary.costs.money.total ?? 0);
          const upstreamCost = Number(summary.costs.solutionRates.upstreamCostKrw ?? 0);
          const platformCharge = Number(summary.costs.solutionRates.platformChargeKrw ?? 0);
          const solutionRateMargin = Number(summary.costs.solutionRates.solutionMarginKrw ?? 0);
          const cashNet = houseEdge - totalSettle - realizedMoneyCost;
          return {
            id: platform.id, slug: platform.slug, name: platform.name,
            rootHost: inferRootHost(platform), adminHost: inferAdminHost(platform),
            agentHost: inferAgentHost(platform), previewPort: platform.previewPort,
            userCnt: summary.platform.userCnt, agentCnt: summary.platform.agentCnt,
            deposit, withdraw, houseEdge, totalSettle,
            ggr: Number(summary.betting.ggr ?? 0),
            realizedMoneyCost, upstreamCost, platformCharge, solutionRateMargin,
            cashNet,
            platformCasinoPct: summary.costs.solutionRates.platformCasinoPct ?? null,
            platformSportsPct: summary.costs.solutionRates.platformSportsPct ?? null,
          } satisfies PlatformOverview;
        }),
      );
      const fulfilled = settled
        .filter((r): r is PromiseFulfilledResult<PlatformOverview> => r.status === "fulfilled")
        .map((r) => r.value);
      setRows(fulfilled.sort((a, b) => b.solutionRateMargin - a.solutionRateMargin));
      const rejectedCount = settled.length - fulfilled.length;
      if (rejectedCount > 0) setErr(`${rejectedCount}개 솔루션 집계를 불러오지 못했습니다.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "대시보드를 불러오지 못했습니다.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, platforms, to]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => rows.reduce(
    (acc, r) => {
      acc.solutions += 1; acc.users += r.userCnt; acc.agents += r.agentCnt;
      acc.deposit += r.deposit; acc.withdraw += r.withdraw; acc.houseEdge += r.houseEdge;
      acc.totalSettle += r.totalSettle; acc.cashNet += r.cashNet;
      acc.upstreamCost += r.upstreamCost; acc.solutionRateMargin += r.solutionRateMargin;
      acc.platformCharge += r.platformCharge;
      return acc;
    },
    { solutions: 0, users: 0, agents: 0, deposit: 0, withdraw: 0, houseEdge: 0,
      totalSettle: 0, cashNet: 0, upstreamCost: 0, solutionRateMargin: 0, platformCharge: 0 },
  ), [rows]);

  /* ── Date filter bar ── */
  const filterBar = (
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
      <span className="text-[13px] text-gray-400">~</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[13px] text-gray-900" />
      <button
        type="button"
        onClick={() => void load()}
        disabled={loading || platformLoading}
        className="rounded-lg bg-[#3182f6] px-4 py-1.5 text-[13px] font-bold text-white hover:bg-blue-600 disabled:opacity-50 transition"
      >
        {loading ? "집계 중…" : "새로고침"}
      </button>
    </div>
  );

  /* ── Platform selected view ── */
  if (selectedPlatformId && selected) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3182f6]">Selected Solution</p>
            <h1 className="mt-1.5 text-[24px] font-bold text-black">{selected.name}</h1>
            <p className="mt-1 font-mono text-[14px] text-gray-500">
              {selectedRow?.rootHost ?? selected.slug}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filterBar}
            <button
              type="button"
              onClick={() => setSelectedPlatformId(null)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              ← 전체 보기
            </button>
          </div>
        </div>

        {err && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>
        )}

        {/* Platform KPIs */}
        {selectedRow && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="충전" value={`${krw(selectedRow.deposit)}원`} sub={`환전 ${krw(selectedRow.withdraw)}원`} accent="blue" />
            <KpiCard label="낙첨금" value={`${krw(selectedRow.houseEdge)}원`} sub="충전 - 환전" accent="green" />
            <KpiCard label="플랫폼 순익" value={signed(selectedRow.cashNet)} sub="낙첨금 - 총판 - 비용" accent={selectedRow.cashNet >= 0 ? "green" : "red"} />
            <KpiCard label="본사 순마진" value={signed(selectedRow.solutionRateMargin)} sub="청구액 - 알원가" highlight />
            <KpiCard label="회원" value={`${krw(selectedRow.userCnt)}명`} sub={`총판 ${krw(selectedRow.agentCnt)}명`} accent="purple" />
            <KpiCard label="총판 예상 정산" value={`${krw(selectedRow.totalSettle)}원`} sub="최상위 총판 기준" accent="orange" />
            <KpiCard label="상위 알 원가" value={`${krw(selectedRow.upstreamCost)}원`} sub={`카 ${selectedRow.platformCasinoPct ?? "0"}% / 스 ${selectedRow.platformSportsPct ?? "0"}%`} accent="purple" />
            <KpiCard label="플랫폼 청구액" value={`${krw(selectedRow.platformCharge)}원`} sub="본사 청구" accent="orange" />
          </section>
        )}

        {loading && !selectedRow && (
          <p className="py-8 text-center text-[14px] text-gray-500">데이터를 불러오는 중…</p>
        )}

        {/* Quick actions */}
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">빠른 이동</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_ACTIONS.map((action) => (
              <button
                key={action.path}
                type="button"
                onClick={() => router.push(action.path)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-[14px] font-medium text-gray-800 hover:border-[#3182f6] hover:text-[#3182f6] transition"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── HQ overview (no platform selected) ── */
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3182f6]">Head Office</p>
          <h1 className="mt-1.5 text-[24px] font-bold text-black">본사 총괄 대시보드</h1>
          <p className="mt-1.5 text-[14px] text-gray-600">전체 솔루션 합산 · 좌측에서 솔루션 선택 시 해당 제어 화면으로 전환됩니다.</p>
        </div>
        {filterBar}
      </div>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>
      )}

      {/* Aggregate KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="총 솔루션" value={`${totals.solutions}개`} sub={`회원 ${krw(totals.users)}명 / 총판 ${krw(totals.agents)}명`} accent="purple" />
        <KpiCard label="총 충전" value={`${krw(totals.deposit)}원`} sub="기간 합계" accent="blue" />
        <KpiCard label="총 환전" value={`${krw(totals.withdraw)}원`} sub="기간 합계" accent="orange" />
        <KpiCard label="총 낙첨금" value={`${krw(totals.houseEdge)}원`} sub="충전 - 환전" accent="green" />
        <KpiCard label="총판 예상 정산" value={`${krw(totals.totalSettle)}원`} sub="최상위 총판 기준" accent="orange" />
        <KpiCard label="플랫폼 현금 순익" value={signed(totals.cashNet)} sub="낙첨금 - 총판 - 비용" accent={totals.cashNet >= 0 ? "green" : "red"} />
        <KpiCard label="상위 알 원가" value={`${krw(totals.upstreamCost)}원`} sub="GGR × 상위 알값%" accent="purple" />
        <KpiCard label="본사 순마진" value={signed(totals.solutionRateMargin)} sub="청구액 - 알원가" highlight />
      </section>

      {/* Donut charts */}
      {rows.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-[15px] font-bold text-black">낙첨금 비율 (솔루션별)</h2>
            <DonutChart rows={rows} metric="houseEdge" title="낙첨금 분포" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-[15px] font-bold text-black">본사 마진 비율 (솔루션별)</h2>
            <DonutChart rows={rows.filter((r) => r.solutionRateMargin > 0)} metric="solutionRateMargin" title="순마진 분포" />
          </div>
        </section>
      )}

      {/* Platform table */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-black">솔루션별 비교</h2>
          <p className="mt-0.5 text-[12px] text-gray-500">행을 클릭하면 해당 솔루션 제어 화면으로 전환됩니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[14px]">
            <thead className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 font-semibold">솔루션</th>
                <th className="px-4 py-2.5 text-right font-semibold">낙첨금</th>
                <th className="px-4 py-2.5 text-right font-semibold">플랫폼 순익</th>
                <th className="px-4 py-2.5 text-right font-semibold">본사 마진</th>
                <th className="px-4 py-2.5 text-right font-semibold">청구액</th>
                <th className="px-4 py-2.5 text-center font-semibold">제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer transition hover:bg-gray-50"
                  onClick={() => setSelectedPlatformId(row.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-black">{row.name}</p>
                    <p className="text-[12px] text-gray-500">{row.rootHost ?? row.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">{krw(row.houseEdge)}원</td>
                  <td className={`px-4 py-3 text-right font-mono ${numColor(row.cashNet)}`}>{signed(row.cashNet)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${numColor(row.solutionRateMargin)}`}>{signed(row.solutionRateMargin)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">{krw(row.platformCharge)}원</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedPlatformId(row.id); }}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-[12px] font-medium text-gray-700 hover:border-[#3182f6] hover:text-[#3182f6] transition"
                    >
                      선택 →
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {loading || platformLoading ? "집계를 불러오는 중…" : "표시할 솔루션이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { inferAdminHost, inferAgentHost, inferRootHost } from "@/lib/platform-hosts";
import { usePlatform } from "@/context/PlatformContext";

type Summary = {
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
  };
  costs: {
    money: {
      depositBonus: string;
      pointRedeem: string;
      otherWalletCredits: string;
      total: string;
    };
    pointAccrual: {
      estimatedKrw: string | null;
      totalPoints: string;
    };
    comp: {
      estimatedKrw: string;
      actualSettledKrw: string;
    };
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

type AgentRow = {
  isTopAgent: boolean;
  myEstimatedSettlement: string;
};

type PlatformOverview = {
  id: string;
  slug: string;
  name: string;
  rootHost: string | null;
  adminHost: string | null;
  agentHost: string | null;
  previewPort: number | null;
  userCnt: number;
  agentCnt: number;
  deposit: number;
  withdraw: number;
  houseEdge: number;
  totalSettle: number;
  ggr: number;
  depositBonus: number;
  pointRedeem: number;
  otherMoneyCredits: number;
  actualComp: number;
  realizedMoneyCost: number;
  pointIssuedEstimated: number;
  compEstimated: number;
  upstreamCost: number;
  platformCharge: number;
  solutionRateMargin: number;
  platformCasinoPct: string | null;
  platformSportsPct: string | null;
  cashNet: number;
  solutionCashNet: number;
  policyEstimatedNet: number;
  solutionPolicyNet: number;
};

function krw(value: number) {
  return value.toLocaleString("ko-KR");
}

function signed(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${krw(value)}원`;
}

function moneyClass(value: number) {
  return value > 0
    ? "text-emerald-300"
    : value < 0
      ? "text-rose-300"
      : "text-zinc-100";
}

function KpiCard({
  label,
  value,
  hint,
  accent = "default",
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "default" | "emerald" | "cyan" | "amber" | "rose";
}) {
  const theme =
    accent === "emerald"
      ? "border-emerald-800/40 bg-emerald-950/10"
      : accent === "cyan"
        ? "border-cyan-800/40 bg-cyan-950/10"
        : accent === "amber"
          ? "border-amber-800/40 bg-amber-950/10"
          : accent === "rose"
            ? "border-rose-800/40 bg-rose-950/10"
            : "border-zinc-800 bg-zinc-950/60";
  return (
    <div className={`rounded-2xl border p-4 ${theme}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{hint}</p>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const { platforms, loading: platformLoading, setSelectedPlatformId, selectedPlatformId } =
    usePlatform();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<PlatformOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (platforms.length === 0) {
      setRows([]);
      return;
    }
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
            .filter((agent) => agent.isTopAgent)
            .reduce((sum, agent) => sum + Number(agent.myEstimatedSettlement ?? 0), 0);
          const depositBonus = Number(summary.costs.money.depositBonus ?? 0);
          const pointRedeem = Number(summary.costs.money.pointRedeem ?? 0);
          const otherMoneyCredits = Number(summary.costs.money.otherWalletCredits ?? 0);
          const actualComp = Number(summary.costs.comp.actualSettledKrw ?? 0);
          const realizedMoneyCost = Number(summary.costs.money.total ?? 0);
          const pointIssuedEstimated = Number(
            summary.costs.pointAccrual.estimatedKrw ?? 0,
          );
          const compEstimated = Number(summary.costs.comp.estimatedKrw ?? 0);
          const upstreamCost = Number(summary.costs.solutionRates.upstreamCostKrw ?? 0);
          const platformCharge = Number(
            summary.costs.solutionRates.platformChargeKrw ?? 0,
          );
          const solutionRateMargin = Number(
            summary.costs.solutionRates.solutionMarginKrw ?? 0,
          );
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
          return {
            id: platform.id,
            slug: platform.slug,
            name: platform.name,
            rootHost: inferRootHost(platform),
            adminHost: inferAdminHost(platform),
            agentHost: inferAgentHost(platform),
            previewPort: platform.previewPort,
            userCnt: summary.platform.userCnt,
            agentCnt: summary.platform.agentCnt,
            deposit,
            withdraw,
            houseEdge,
            totalSettle,
            ggr: Number(summary.betting.ggr ?? 0),
            depositBonus,
            pointRedeem,
            otherMoneyCredits,
            actualComp,
            realizedMoneyCost,
            pointIssuedEstimated,
            compEstimated,
            upstreamCost,
            platformCharge,
            solutionRateMargin,
            platformCasinoPct: summary.costs.solutionRates.platformCasinoPct ?? null,
            platformSportsPct: summary.costs.solutionRates.platformSportsPct ?? null,
            cashNet,
            solutionCashNet,
            policyEstimatedNet,
            solutionPolicyNet,
          } satisfies PlatformOverview;
        }),
      );
      const fulfilled = settled
        .filter(
          (result): result is PromiseFulfilledResult<PlatformOverview> =>
            result.status === "fulfilled",
        )
        .map((result) => result.value);
      const rejectedCount = settled.length - fulfilled.length;
      setRows(
        fulfilled.sort((a, b) => b.solutionCashNet - a.solutionCashNet),
      );
      if (rejectedCount > 0) {
        setErr(`${rejectedCount}개 솔루션의 집계를 불러오지 못했습니다.`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "대시보드를 불러오지 못했습니다.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, platforms, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.solutions += 1;
        acc.users += row.userCnt;
        acc.agents += row.agentCnt;
        acc.deposit += row.deposit;
        acc.withdraw += row.withdraw;
        acc.houseEdge += row.houseEdge;
        acc.totalSettle += row.totalSettle;
        acc.ggr += row.ggr;
        acc.cashNet += row.cashNet;
        acc.platformCharge += row.platformCharge;
        acc.upstreamCost += row.upstreamCost;
        acc.solutionRateMargin += row.solutionRateMargin;
        acc.solutionCashNet += row.solutionCashNet;
        acc.solutionPolicyNet += row.solutionPolicyNet;
        return acc;
      },
      {
        solutions: 0,
        users: 0,
        agents: 0,
        deposit: 0,
        withdraw: 0,
        houseEdge: 0,
        totalSettle: 0,
        ggr: 0,
        cashNet: 0,
        platformCharge: 0,
        upstreamCost: 0,
        solutionRateMargin: 0,
        solutionCashNet: 0,
        solutionPolicyNet: 0,
      },
    );
  }, [rows]);

  const strongest = rows.slice(0, 5);
  const weakest = [...rows]
    .sort((a, b) => a.solutionCashNet - b.solutionCashNet)
    .slice(0, 5);

  function openPlatform(platformId: string, path: string) {
    setSelectedPlatformId(platformId);
    router.push(path);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
            Head Office
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">
            본사 총괄 대시보드
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-500">
            모든 솔루션의 현금 흐름, 알 원가, 플랫폼 청구액, 본사 순마진을 같은
            기간으로 비교합니다. 아래 테이블에서 바로 솔루션 상세 운영 화면으로
            들어갈 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "오늘", from: today, to: today },
            { label: "이번달", from: monthStart, to: today },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setFrom(preset.from);
                setTo(preset.to);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                from === preset.from && to === preset.to
                  ? "bg-amber-600/20 text-amber-300"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {preset.label}
            </button>
          ))}
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
          />
          <span className="text-xs text-zinc-600">~</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || platformLoading}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? "집계 중…" : "새로고침"}
          </button>
        </div>
      </div>

      {err ? (
        <p className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
          {err}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="총 솔루션"
          value={`${totals.solutions}개`}
          hint={`회원 ${krw(totals.users)}명 / 총판 ${krw(totals.agents)}명`}
          accent="default"
        />
        <KpiCard
          label="총 충전"
          value={`${krw(totals.deposit)}원`}
          hint="선택 기간 승인 입금 합계"
          accent="emerald"
        />
        <KpiCard
          label="총 환전"
          value={`${krw(totals.withdraw)}원`}
          hint="선택 기간 승인 출금 합계"
          accent="rose"
        />
        <KpiCard
          label="총 낙첨금"
          value={signed(totals.houseEdge)}
          hint="회원별 (충전 - 환전) 합계"
          accent="amber"
        />
        <KpiCard
          label="총판 예상 정산"
          value={`${krw(totals.totalSettle)}원`}
          hint="최상위 총판 기준 예상 정산금"
          accent="default"
        />
        <KpiCard
          label="플랫폼 현금 순익"
          value={signed(totals.cashNet)}
          hint="낙첨금 - 총판 - 실제 머니 비용"
          accent="emerald"
        />
        <KpiCard
          label="상위 알 원가"
          value={`${krw(totals.upstreamCost)}원`}
          hint="카지노/스포츠 양수 GGR 기준 원가"
          accent="rose"
        />
        <KpiCard
          label="본사 순마진"
          value={signed(totals.solutionCashNet)}
          hint="플랫폼 현금 순익 - 상위 알 원가"
          accent="cyan"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                솔루션별 비교
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                본사 마진 기준으로 정렬됩니다. 행을 누르면 해당 솔루션을 선택합니다.
              </p>
            </div>
            <Link
              href="/console/platforms"
              className="text-sm text-amber-300 hover:text-amber-200"
            >
              솔루션 관리로 →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2">솔루션</th>
                  <th className="px-3 py-2">도메인</th>
                  <th className="px-3 py-2 text-right">낙첨금</th>
                  <th className="px-3 py-2 text-right">플랫폼 순익</th>
                  <th className="px-3 py-2 text-right">본사 마진</th>
                  <th className="px-3 py-2 text-right">청구액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((row) => {
                  const active = selectedPlatformId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer transition hover:bg-zinc-800/40 ${
                        active ? "bg-amber-950/20" : ""
                      }`}
                      onClick={() => setSelectedPlatformId(row.id)}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium text-zinc-100">{row.name}</p>
                        <p className="text-xs text-zinc-600">{row.slug}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-mono text-xs text-zinc-300">
                          {row.rootHost ?? "—"}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          관리자 {row.adminHost ?? "—"}
                        </p>
                      </td>
                      <td className={`px-3 py-3 text-right font-mono ${moneyClass(row.houseEdge)}`}>
                        {signed(row.houseEdge)}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono ${moneyClass(row.cashNet)}`}>
                        {signed(row.cashNet)}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono ${moneyClass(row.solutionCashNet)}`}>
                        {signed(row.solutionCashNet)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-100">
                        {krw(row.platformCharge)}원
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                      {loading || platformLoading
                        ? "집계를 불러오는 중입니다…"
                        : "표시할 솔루션이 없습니다."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">상위 마진 솔루션</h2>
          <p className="mt-1 text-sm text-zinc-500">
            같은 기간 기준 본사 현금 순마진 상위입니다.
          </p>
          <div className="mt-4 space-y-3">
            {strongest.map((row, index) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openPlatform(row.id, "/console/sales")}
                className="w-full rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-left hover:border-emerald-700/40"
              >
                <p className="text-xs text-zinc-600">#{index + 1}</p>
                <p className="mt-1 font-medium text-zinc-100">{row.name}</p>
                <p className="mt-2 font-mono text-lg text-emerald-300">
                  {signed(row.solutionCashNet)}
                </p>
                <p className="text-xs text-zinc-600">{row.rootHost ?? row.slug}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">점검 필요 솔루션</h2>
          <p className="mt-1 text-sm text-zinc-500">
            본사 마진이 낮거나 음수인 솔루션부터 확인합니다.
          </p>
          <div className="mt-4 space-y-3">
            {weakest.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openPlatform(row.id, "/console/operational")}
                className="w-full rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-left hover:border-rose-700/40"
              >
                <p className="font-medium text-zinc-100">{row.name}</p>
                <p className={`mt-2 font-mono text-lg ${moneyClass(row.solutionCashNet)}`}>
                  {signed(row.solutionCashNet)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  낙첨금 {krw(row.houseEdge)}원 / 상위 알 원가 {krw(row.upstreamCost)}원
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">선택 솔루션 빠른 이동</h2>
            <p className="mt-1 text-sm text-zinc-500">
              대시보드에서 바로 해당 솔루션의 청구, 알값, 자산, 운영계정 화면으로 이동합니다.
            </p>
          </div>
          <p className="text-sm text-zinc-500">
            현재 선택:{" "}
            <span className="font-medium text-zinc-200">
              {rows.find((row) => row.id === selectedPlatformId)?.name ?? "없음"}
            </span>
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            { href: "/console/platforms", label: "솔루션 관리", hint: "도메인 · 계정 · 상태" },
            { href: "/console/sales", label: "전체 매출 / 정산", hint: "청구 · 원가 · 마진" },
            { href: "/console/operational", label: "알값 관리", hint: "상위 알 · 자동 마진" },
            { href: "/console/assets", label: "자산 관리", hint: "반가상 · 테더 · 입출금" },
          ].map((item) => (
            <button
              key={item.href}
              type="button"
              disabled={!selectedPlatformId}
              onClick={() => selectedPlatformId && router.push(item.href)}
              className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-4 text-left hover:border-amber-700/40 disabled:opacity-40"
            >
              <p className="text-sm font-medium text-zinc-100">{item.label}</p>
              <p className="mt-1 text-xs text-zinc-500">{item.hint}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

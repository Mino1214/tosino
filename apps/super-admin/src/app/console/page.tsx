"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type PortfolioSummary = {
  period: { from: string | null; to: string | null };
  totals: {
    solutionsWithMetrics: number;
    solutionsTotal: number;
    memberCount: number;
    agentCount: number;
    depositTotal: string;
    withdrawTotal: string;
    topAgentSettlement: string;
    houseEdge: string;
    cashNet: string;
    solutionCashNet: string;
    solutionPolicyNet: string;
    upstreamCost: string;
    platformCharge: string;
    solutionMargin: string;
    ggr: string;
  };
};

type CreditSummary = {
  totalDeposited: number;
  totalAllocated: number;
  remaining: number;
  pendingRequestCount: number;
  totalCreditBalance: number;
};

type ServiceHealth = {
  checkedAt: string;
  checks: {
    id: string;
    label: string;
    ok: boolean;
    ms?: number;
    detail?: string;
  }[];
};

function won(v: string | number | null | undefined) {
  const n = Math.round(Number(v ?? 0));
  return Number.isFinite(n) ? `${n.toLocaleString("ko-KR")}원` : "0원";
}

function wonSigned(v: string | number | null | undefined) {
  const n = Math.round(Number(v ?? 0));
  if (!Number.isFinite(n)) return "0원";
  const p = n > 0 ? "+" : "";
  return `${p}${n.toLocaleString("ko-KR")}원`;
}

function MetricCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: "violet" | "emerald" | "amber" | "slate" | "rose";
}) {
  const ring =
    accent === "emerald"
      ? "ring-emerald-500/20 dark:ring-emerald-400/15"
      : accent === "amber"
        ? "ring-amber-500/20 dark:ring-amber-400/15"
        : accent === "rose"
          ? "ring-rose-500/20 dark:ring-rose-400/15"
          : accent === "violet"
            ? "ring-violet-500/25 dark:ring-violet-400/20"
            : "ring-slate-200 dark:ring-zinc-700";
  return (
    <div
      className={`rounded-2xl border border-gray-100/80 bg-white p-5 shadow-sm ring-1 ${ring} dark:border-zinc-800/80 dark:bg-zinc-900/70`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-zinc-50">{value}</p>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-gray-400 dark:text-zinc-500">{hint}</p> : null}
    </div>
  );
}

const QUICK = [
  { href: "/console/sales", label: "청구 · 정산", sub: "전체 요약 · 솔루션 상세", emoji: "📊" },
  { href: "/console/credits", label: "알값 · 크레딧", sub: "충전 · 배정 · 잔액", emoji: "💎" },
  { href: "/console/platforms", label: "솔루션 목록", sub: "플랫폼 · 도메인", emoji: "🧩" },
  { href: "/console/semi-virtual-accounts", label: "반가상 번들", sub: "계좌 묶음 집계", emoji: "🏦" },
  { href: "/console/sync", label: "헬스체크", sub: "API · 연동", emoji: "🩺" },
  { href: "/console/test-scenario", label: "테스트 시나리오", sub: "시드 · 검증", emoji: "🧪" },
] as const;

export default function HqDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [credits, setCredits] = useState<CreditSummary | null>(null);
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const q = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z&includeRows=false`;
    try {
      const [p, c, h] = await Promise.all([
        apiFetch<PortfolioSummary>(`/platforms/hq/portfolio-summary?${q}`),
        apiFetch<CreditSummary>("/hq/credits/summary"),
        apiFetch<ServiceHealth>("/hq/service-health"),
      ]);
      setData(p);
      setCredits(c);
      setHealth(h);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오지 못했습니다");
      setData(null);
      setCredits(null);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const t = data?.totals;

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl border border-gray-200/60 bg-gradient-to-br from-white via-violet-50/40 to-white px-6 py-8 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:via-violet-950/30 dark:to-zinc-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Headquarters</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">HQ 대시보드</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-zinc-400">
              선택한 기간의 전 솔루션 합계와 알값·연동 상태를 한 번에 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/70 p-2 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-950/50">
            <span className="px-2 text-xs text-gray-500 dark:text-zinc-500">기간</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <span className="text-gray-300 dark:text-zinc-600">—</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 dark:bg-violet-500 dark:hover:bg-violet-400"
            >
              조회
            </button>
          </div>
        </div>
      </header>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/50 dark:text-red-300">
          {err}
        </div>
      ) : null}

      {loading && !t ? (
        <p className="text-sm text-gray-500 dark:text-zinc-400">불러오는 중…</p>
      ) : null}

      {t ? (
        <>
          <section aria-labelledby="scale-heading">
            <h2 id="scale-heading" className="mb-4 text-sm font-semibold text-gray-800 dark:text-zinc-200">
              규모 · 현금 흐름
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="솔루션 · 회원 · 총판"
                value={
                  <span className="text-lg">
                    {t.solutionsTotal}개 · {(t.memberCount ?? 0).toLocaleString("ko-KR")}명 ·{" "}
                    {(t.agentCount ?? 0).toLocaleString("ko-KR")}명
                  </span>
                }
                hint="등록된 전체 규모"
                accent="slate"
              />
              <MetricCard label="총 충전" value={won(t.depositTotal)} hint="기간 승인 입금 합계" accent="emerald" />
              <MetricCard label="총 환전" value={won(t.withdrawTotal)} hint="기간 승인 출금 합계" accent="amber" />
              <MetricCard
                label="총 낙첨금"
                value={won(t.houseEdge)}
                hint="회원 기준 순입금(충전 − 환전)"
                accent="violet"
              />
            </div>
          </section>

          <section aria-labelledby="profit-heading">
            <h2 id="profit-heading" className="mb-4 text-sm font-semibold text-gray-800 dark:text-zinc-200">
              정산 · 본사 손익
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="총판 예상 정산"
                value={won(t.topAgentSettlement)}
                hint="최상위 총판 기준 합계"
                accent="slate"
              />
              <MetricCard
                label="플랫폼 현금 순익"
                value={wonSigned(t.cashNet)}
                hint="낙첨금 − 총판 − 실제 머니 비용"
                accent="emerald"
              />
              <MetricCard
                label="상위 알 원가"
                value={won(t.upstreamCost)}
                hint="GGR × 상위 알값%"
                accent="amber"
              />
              <MetricCard
                label="본사 순마진"
                value={wonSigned(t.solutionMargin)}
                hint="청구액 − 알 원가"
                accent="violet"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="솔루션 현금 순익"
                value={wonSigned(t.solutionCashNet)}
                hint="플랫폼 현금 순익 − 상위 알 원가"
                accent="slate"
              />
              <MetricCard
                label="플랫폼 정책 추정 순익"
                value={wonSigned(t.solutionPolicyNet)}
                hint="포인트·콤프 가정 반영 후 − 알 원가"
                accent="slate"
              />
            </div>
            {t.solutionsWithMetrics < t.solutionsTotal ? (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                집계 성공 {t.solutionsWithMetrics}/{t.solutionsTotal}개 솔루션 — 일부 오류는 청구/정산 표에서 확인하세요.
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      {credits ? (
        <section aria-labelledby="credit-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="credit-heading" className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
              알값 · 크레딧
            </h2>
            <Link
              href="/console/credits"
              className="text-xs font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              허브로 이동 →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="본사 총 입금"
              value={`${Math.round(credits.totalDeposited).toLocaleString("ko-KR")}원`}
              accent="slate"
            />
            <MetricCard
              label="플랫폼 배정 누적"
              value={`${Math.round(credits.totalAllocated).toLocaleString("ko-KR")}원`}
              accent="violet"
            />
            <MetricCard
              label="본사 잔여"
              value={`${Math.round(credits.remaining).toLocaleString("ko-KR")}원`}
              hint="충전 − 배정"
              accent="emerald"
            />
            <MetricCard
              label="플랫폼 알 잔액 Σ"
              value={`${Math.round(credits.totalCreditBalance).toLocaleString("ko-KR")}원`}
              accent="amber"
            />
            <MetricCard
              label="승인 대기"
              value={`${credits.pendingRequestCount}건`}
              hint={
                credits.pendingRequestCount > 0 ? (
                  <Link href="/console/credits/requests" className="text-violet-600 underline-offset-2 hover:underline dark:text-violet-400">
                    요청 처리하기
                  </Link>
                ) : (
                  "대기 없음"
                )
              }
              accent="rose"
            />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="quick-heading">
        <h2 id="quick-heading" className="mb-4 text-sm font-semibold text-gray-800 dark:text-zinc-200">
          빠른 이동
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex min-h-[5.5rem] items-start gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition hover:border-violet-300/80 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-violet-500/30"
            >
              <span className="text-2xl opacity-90" aria-hidden>
                {item.emoji}
              </span>
              <div>
                <span className="font-semibold text-gray-900 group-hover:text-violet-700 dark:text-zinc-100 dark:group-hover:text-violet-300">
                  {item.label}
                </span>
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {health ? (
        <section aria-labelledby="health-heading">
          <h2 id="health-heading" className="mb-4 text-sm font-semibold text-gray-800 dark:text-zinc-200">
            연동 상태
          </h2>
          <div className="flex flex-wrap gap-3">
            {health.checks.map((c) => (
              <div
                key={c.id}
                className={`min-w-[10rem] flex-1 rounded-2xl border px-4 py-3 shadow-sm ${
                  c.ok
                    ? "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/30"
                    : "border-red-200/80 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/30"
                }`}
              >
                <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">{c.label}</p>
                <p className={`mt-1 text-sm font-semibold ${c.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {c.ok ? "정상" : "점검"}
                  {typeof c.ms === "number" ? ` · ${c.ms}ms` : ""}
                </p>
                {c.detail ? <p className="mt-1 text-[10px] text-gray-500 dark:text-zinc-500">{c.detail}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-gray-400 dark:text-zinc-600">
            확인 시각 {new Date(health.checkedAt).toLocaleString("ko-KR")}
          </p>
        </section>
      ) : null}
    </div>
  );
}

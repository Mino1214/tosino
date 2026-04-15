"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
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

// ─── 유틸 ─────────────────────────────────────────────────
function krw(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
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
function ggrColor(v: string | number) {
  const n = Number(v);
  return n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-zinc-400";
}

// ─── 공통 카드 ─────────────────────────────────────────────
function StatCard({ label, value, sub, color = "text-zinc-100" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

type InnerTab = "summary" | "agents" | "ledger";

export default function SalesPage() {
  const { selectedPlatformId } = usePlatform();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<InnerTab>("summary");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 에이전트 트리 펼침 상태 (agentId 집합)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setErr(null);
    const q = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
    try {
      const [s, a, l] = await Promise.all([
        apiFetch<Summary>(`/platforms/${selectedPlatformId}/sales/summary?${q}`),
        apiFetch<AgentRow[]>(`/platforms/${selectedPlatformId}/sales/agents?${q}`),
        apiFetch<LedgerRow[]>(`/platforms/${selectedPlatformId}/sales/ledger?${q}&limit=200`),
      ]);
      setSummary(s);
      setAgents(a);
      setLedger(l);
      // 최상위 총판은 기본 펼침
      setOpenIds(new Set(a.filter((ag: AgentRow) => ag.isTopAgent).map((ag: AgentRow) => ag.agentId)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedPlatformId, from, to]);

  useEffect(() => { void load(); }, [load]);

  const TABS: { key: InnerTab; label: string }[] = [
    { key: "summary", label: "📊 매출 요약" },
    { key: "agents", label: "👤 에이전트 정산" },
    { key: "ledger", label: "📋 배팅 원장" },
  ];

  return (
    <div className="space-y-5 px-1">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-zinc-100">매출 현황</h1>
        {/* 기간 필터 */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "오늘", from: today, to: today },
            { label: "이번달", from: monthStart, to: today },
            { label: "이번주", from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0,10); })(), to: today },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => { setFrom(p.from); setTo(p.to); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                from === p.from && to === p.to
                  ? "bg-amber-600/20 text-amber-300"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300" />
          <span className="text-zinc-600 text-xs">~</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300" />
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? "조회중..." : "조회"}
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">{err}</div>
      )}

      {/* 이너 탭 */}
      <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-amber-600/20 text-amber-300"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 매출 요약 탭 ── */}
      {tab === "summary" && summary && (() => {
        const deposit = Number(summary.wallet.depositTotal);
        const withdraw = Number(summary.wallet.withdrawTotal);
        // 낙첨금액 = 입금 - 출금 (유저가 실제로 잃은 금액)
        const houseEdge = Number(summary.wallet.houseEdge ?? (deposit - withdraw));
        const rtp = Number(summary.betting.rtp);
        // 입금 대비 낙첨금액 비율
        const lossRate = deposit > 0 ? (houseEdge / deposit * 100) : 0;
        return (
        <div className="space-y-5">
          {/* 핵심 KPI 카드 - 낙첨금액 기반 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* 낙첨금액 (메인) */}
            <div className={`rounded-xl border p-4 ${houseEdge >= 0 ? "border-emerald-800/50 bg-emerald-950/20" : "border-red-800/50 bg-red-950/20"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">💸 낙첨금액</p>
              <p className={`mt-2 text-2xl font-bold font-mono ${houseEdge >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {houseEdge >= 0 ? "+" : ""}{krw(houseEdge)}원
              </p>
              <p className="mt-1 text-xs text-zinc-600">총입금 − 총출금 (플랫폼에 남은 금액)</p>
            </div>
            {/* 총 입금 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">✅ 총 입금</p>
              <p className="mt-2 text-2xl font-bold font-mono text-emerald-300">{krw(deposit)}원</p>
              <p className="mt-1 text-xs text-zinc-600">{summary.wallet.depositCount}건 승인</p>
            </div>
            {/* 총 출금 */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">💳 총 출금</p>
              <p className="mt-2 text-2xl font-bold font-mono text-red-300">{krw(withdraw)}원</p>
              <p className="mt-1 text-xs text-zinc-600">{summary.wallet.withdrawCount}건 승인</p>
            </div>
            {/* 낙첨률 */}
            <div className={`rounded-xl border p-4 ${lossRate >= 0 ? "border-amber-800/50 bg-amber-950/20" : "border-red-800/50 bg-red-950/20"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">📈 낙첨률</p>
              <p className={`mt-2 text-2xl font-bold font-mono ${lossRate >= 0 ? "text-amber-300" : "text-red-400"}`}>
                {lossRate >= 0 ? "+" : ""}{lossRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-zinc-600">낙첨금 ÷ 입금 총액</p>
            </div>
          </div>

          {/* 2번째 줄: 베팅 참고지표 + 회원 수 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">🎰 총 배팅액</p>
              <p className="mt-2 text-xl font-bold font-mono text-zinc-100">{krw(summary.betting.betStake)}원</p>
              <p className="mt-0.5 text-xs text-zinc-600">{summary.betting.rounds}라운드</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">🏆 총 당첨금</p>
              <p className="mt-2 text-xl font-bold font-mono text-zinc-100">{krw(summary.betting.winTotal)}원</p>
              <p className="mt-0.5 text-xs text-zinc-600">RTP {rtp}%</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">📊 베팅 순수익</p>
              <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(summary.betting.ggr)}`}>{krw(summary.betting.ggr)}원</p>
              <p className="mt-0.5 text-xs text-zinc-600">배팅 − 당첨 (참고값)</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">👥 회원 / 총판</p>
              <p className="mt-2 text-xl font-bold font-mono text-zinc-100">{summary.platform.userCnt}명</p>
              <p className="mt-0.5 text-xs text-zinc-600">총판 {summary.platform.agentCnt}명</p>
            </div>
          </div>

          {/* 입출금 + 게임 세로 분할 */}
          <div className="grid gap-4 xl:grid-cols-2">
            {/* 게임별 하우스 수익 */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-zinc-100">게임별 하우스 수익</h3>
              <div className="space-y-2">
                {Object.entries(summary.verticals).map(([vert, data]) => {
                  const ggrN = Number(data.ggr);
                  const stakeN = Number(data.betStake);
                  const pct = stakeN > 0 ? (ggrN / stakeN) * 100 : 0;
                  return (
                    <div key={vert} className="rounded-lg border border-zinc-800 bg-black/20 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">{vertLabel(vert)}</span>
                        <span className="text-xs text-zinc-600">{data.rounds}라운드</span>
                      </div>
                      <div className="mt-1.5 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-zinc-600">배팅 {krw(data.betStake)}원 / 당첨 {krw(data.winTotal)}원</p>
                        </div>
                        <p className={`text-base font-bold font-mono ${ggrColor(data.ggr)}`}>
                          수익 {krw(data.ggr)}원
                          <span className="ml-1 text-xs text-zinc-500">({pct.toFixed(1)}%)</span>
                        </p>
                      </div>
                      {/* 진행바 */}
                      <div className="mt-1.5 h-1 rounded-full bg-zinc-800">
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
        if (agents === null && loading) return <p className="text-sm text-zinc-500">불러오는 중...</p>;
        if (!agents || agents.length === 0) return <p className="text-sm text-zinc-600">등록된 총판이 없습니다.</p>;

        // 낙첨금액 합계 = 최상위 총판들의 입금-출금 합
        const totalHouseEdge = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.houseEdge ?? 0), 0);
        const totalSettle = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.myEstimatedSettlement), 0);
        const totalDeposit = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.depositTotal), 0);
        const totalWithdraw = agents.filter(a => a.isTopAgent).reduce((s, a) => s + Number(a.withdrawTotal), 0);
        // 순수익 = 낙첨금액 - 총판 지급금
        const netProfit = totalHouseEdge - totalSettle;

        const topAgents = agents.filter(a => a.isTopAgent);

        const toggleAgent = (id: string) => {
          setOpenIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
        };

        const renderAgent = (agent: AgentRow, depth: number): React.ReactNode => {
          const childAgents = agents.filter(a => a.parentAgentId === agent.agentId);
          const directUsers = agent.directUsers ?? [];
          const canExpand = childAgents.length > 0 || directUsers.length > 0;
          const isOpen = openIds.has(agent.agentId);
          const indent = depth * 20;
          const childSettleSum = Number(agent.childrenSettlementTotal ?? 0);
          return (
            <div key={agent.agentId} className={depth > 0 ? "border-t border-zinc-800/40 bg-zinc-950/30" : ""}>
              <button
                type="button"
                onClick={() => { if (canExpand) toggleAgent(agent.agentId); }}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left transition hover:bg-zinc-800/40 ${canExpand ? "" : "cursor-default opacity-90"}`}
                style={{ paddingLeft: `${16 + indent}px` }}
              >
                <span className="w-4 shrink-0 text-zinc-500 text-xs">
                  {!canExpand ? "·" : isOpen ? "▼" : "▶"}
                </span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  depth === 0 ? "bg-amber-600/25 text-amber-400" :
                  depth === 1 ? "bg-violet-700/30 text-violet-300" :
                  "bg-zinc-700/40 text-zinc-400"
                }`}>
                  {depth === 0 ? "최상위" : depth === 1 ? "하위" : "3단"}
                </span>
                <span className="font-mono text-sm font-semibold text-zinc-100 min-w-0 truncate">{agent.loginId}</span>
                {agent.displayName && <span className="text-xs text-zinc-500 shrink-0 hidden sm:inline">{agent.displayName}</span>}
                {childAgents.length > 0 && (
                  <span className="text-[10px] text-zinc-600 shrink-0 ml-1">하위 총판 {childAgents.length}</span>
                )}
                {directUsers.length > 0 && (
                  <span className="text-[10px] text-zinc-600 shrink-0">직속 유저 {directUsers.length}</span>
                )}
                <div className="ml-auto flex flex-col items-end gap-0.5 text-xs shrink-0 sm:flex-row sm:items-center sm:gap-3">
                  {childAgents.length > 0 && (
                    <span
                      className="text-[10px] text-cyan-400/90 font-mono hidden sm:inline"
                      title="직속 하위 총판 정산금 합계(펼치기 전)"
                    >
                      하위정산 Σ {krw(childSettleSum)}원
                    </span>
                  )}
                  <span className="text-zinc-500 hidden md:block">전체 유저 {agent.downlineUsers}명</span>
                  <span className={`font-mono font-bold ${Number(agent.houseEdge ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    낙첨 {krw(agent.houseEdge ?? 0)}원
                  </span>
                  <span className="text-amber-300 font-mono font-bold">정산 {krw(agent.myEstimatedSettlement)}원</span>
                </div>
              </button>
              {isOpen && canExpand && (
                <div style={{ paddingLeft: `${indent}px` }} className="pb-1">
                  <div className="flex flex-wrap gap-x-5 gap-y-1 px-8 py-1.5 text-[11px] text-zinc-500 bg-black/20">
                    <span>입금 <b className="text-emerald-400">{krw(agent.depositTotal)}원</b></span>
                    <span>출금 <b className="text-red-400">{krw(agent.withdrawTotal)}원</b></span>
                    <span>낙첨금액 <b className={Number(agent.houseEdge ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}>{krw(agent.houseEdge ?? 0)}원</b></span>
                    <span>총판지급 <b className="text-amber-300">{krw(agent.myEstimatedSettlement)}원</b></span>
                    {childAgents.length > 0 && (
                      <span>하위정산 Σ <b className="text-cyan-300">{krw(childSettleSum)}원</b></span>
                    )}
                    {agent.platformSharePct > 0 && <span>플랫폼요율 <b className="text-zinc-300">{agent.platformSharePct}%</b></span>}
                    {agent.splitFromParentPct > 0 && <span>분배율 <b className="text-zinc-300">{agent.splitFromParentPct}%</b></span>}
                    {agent.effectivePct > 0 && <span>실효율 <b className="text-violet-300">{agent.effectivePct}%</b></span>}
                  </div>
                  {childAgents.length > 0 && (
                    <div className="mt-2 border-t border-zinc-800/50 pt-2">
                      <p className="px-8 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">하위 총판</p>
                      <div className="mt-1">
                        {[...childAgents].sort((a, b) => a.loginId.localeCompare(b.loginId)).map((c) => renderAgent(c, depth + 1))}
                      </div>
                    </div>
                  )}
                  {directUsers.length > 0 && (
                    <div className="mt-3 border-t border-zinc-800/50 pt-2 px-4 sm:px-8 pb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-2">직속 유저</p>
                      <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-black/20">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-500">
                              {["로그인", "표시명", "입금", "출금", "낙첨(기간)", "현재 잔액"].map((h) => (
                                <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...directUsers].sort((a, b) => a.loginId.localeCompare(b.loginId)).map((u) => (
                              <tr key={u.userId} className="border-b border-zinc-900/80 hover:bg-zinc-900/40">
                                <td className="px-3 py-2 font-mono text-zinc-200 whitespace-nowrap">{u.loginId}</td>
                                <td className="px-3 py-2 text-zinc-400 max-w-[140px] truncate" title={u.displayName}>{u.displayName || "—"}</td>
                                <td className="px-3 py-2 font-mono text-emerald-400/90 whitespace-nowrap">{krw(u.depositTotal)}원</td>
                                <td className="px-3 py-2 font-mono text-red-400/90 whitespace-nowrap">{krw(u.withdrawTotal)}원</td>
                                <td className={`px-3 py-2 font-mono whitespace-nowrap ${Number(u.houseEdge) >= 0 ? "text-emerald-300/90" : "text-red-300/90"}`}>
                                  {krw(u.houseEdge)}원
                                </td>
                                <td className="px-3 py-2 font-mono text-zinc-300 whitespace-nowrap">{krw(u.balance)}원</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <div className="space-y-4">
            {/* 전체 합계 카드 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">💸 낙첨금액 합계</p>
                <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(totalHouseEdge)}`}>{krw(totalHouseEdge)}원</p>
                <p className="mt-0.5 text-xs text-zinc-600">총입금 {krw(totalDeposit)} − 총출금 {krw(totalWithdraw)}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">💰 총판 지급금</p>
                <p className="mt-2 text-xl font-bold font-mono text-amber-300">{krw(totalSettle)}원</p>
                <p className="mt-0.5 text-xs text-zinc-600">낙첨금 × 각 총판 실효율</p>
              </div>
              <div className={`rounded-xl border p-4 ${netProfit >= 0 ? "border-emerald-800/40 bg-emerald-950/10" : "border-red-800/40 bg-red-950/10"}`}>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">🏦 플랫폼 순수익</p>
                <p className={`mt-2 text-xl font-bold font-mono ${ggrColor(netProfit)}`}>{krw(netProfit)}원</p>
                <p className="mt-1 text-xs text-zinc-600">낙첨금 − 총판 지급금</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">📊 총 배팅액 (참고)</p>
                <p className="mt-2 text-xl font-bold font-mono text-zinc-400">{krw(agents.reduce((s, a) => s + Number(a.betStake), 0))}원</p>
              </div>
            </div>

            {/* 트리 뷰 */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <div className="bg-zinc-900/60 px-4 py-2.5 flex items-center gap-2 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400">총판 구조</span>
                <span className="text-[10px] text-zinc-600">▶ 클릭하여 하위 총판 펼치기/닫기</span>
              </div>
              <div>
                {topAgents.map(a => renderAgent(a, 0))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 배팅 원장 탭 ── */}
      {tab === "ledger" && (
        <div>
          {loading ? (
            <p className="py-6 text-sm text-zinc-500">불러오는 중...</p>
          ) : ledger && ledger.length === 0 ? (
            <p className="py-6 text-sm text-zinc-600">배팅 원장이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800 max-h-[65vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-10">
                    {["시각", "유저", "타입", "게임", "카테고리", "금액", "처리후잔액", "라운드ID"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger?.map((r) => {
                    const isBet = r.type === "BET";
                    const amt = Number(r.amount);
                    return (
                      <tr key={r.id} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition">
                        <td className="px-3 py-2 whitespace-nowrap text-zinc-500">{dt(r.createdAt)}</td>
                        <td className="px-3 py-2 font-mono text-zinc-200">{r.userLoginId}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            isBet ? "bg-red-400/10 text-red-400" : "bg-emerald-400/10 text-emerald-400"
                          }`}>
                            {isBet ? "BET" : "WIN"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 max-w-[120px] truncate">{r.gameName || "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">{vertLabel(r.vertical)}</td>
                        <td className={`px-3 py-2 font-mono font-bold ${isBet ? "text-red-400" : "text-emerald-400"}`}>
                          {isBet ? "" : "+"}{krw(amt)}원
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-400">{krw(r.balanceAfter)}원</td>
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
    </div>
  );
}

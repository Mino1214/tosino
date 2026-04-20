"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, getStoredUser } from "@/lib/api";

type GameBlock = {
  betSum: string;
  betStakeAbs: string;
  winSum: string;
  byKind?: Record<string, GameBlock>;
};

type GameSales = {
  LIVE_CASINO: GameBlock;
  SPORTS: GameBlock;
  MINIGAME: GameBlock;
  SLOT: GameBlock;
  UNKNOWN: GameBlock;
};

type MemberSalesRow = {
  userId: string;
  loginId: string;
  uplinePrivateMemo: string | null;
  displayName: string | null;
  approvedDepositSum: string;
  approvedWithdrawSum: string;
  netInflow: string;
  ledgerBetSum: string;
  ledgerBetStakeAbs: string;
  ledgerWinSum: string;
  estGgr: string;
};

type Sales = {
  from: string;
  to: string;
  approvedDepositSum: string;
  approvedWithdrawSum: string;
  netInflow: string;
  ledgerBetSum: string;
  ledgerBetStakeAbs: string;
  ledgerWinSum: string;
  estGgr?: string;
  effectiveAgentSharePct?: number;
  myEstimatedSettlement?: string;
  subAgentSettlementTotal?: string;
  gameSales: GameSales;
  gameSalesMeta?: string;
  members?: MemberSalesRow[];
};

type SalesActivityItem = {
  source: string;
  id: string;
  occurredAt: string;
  entryType: string;
  amount: string;
  note: string | null;
  reference: string | null;
  vertical: string | null;
  subVertical: string | null;
};

type SalesActivityRes = {
  page: number;
  pageSize: number;
  total: number;
  items: SalesActivityItem[];
};

function num(v: string | number | undefined) {
  return Number(v ?? 0);
}

function fmt(v: string | number | undefined | null) {
  const n = Math.round(Number(v ?? 0));
  if (!Number.isFinite(n)) return "₩0";
  return "₩" + n.toLocaleString("ko-KR");
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { from: localDateStr(start), to: localDateStr(end) };
}

const VERTICAL_LABEL: Record<string, string> = {
  LIVE_CASINO: "🎰 라이브 카지노",
  SPORTS: "⚽ 스포츠",
  MINIGAME: "🎮 미니게임",
  SLOT: "🎯 슬롯",
  UNKNOWN: "기타",
};

function verticalBadge(v: string | null) {
  if (!v) return <span className="text-gray-400">—</span>;
  const u = v.toUpperCase();
  if (u.includes("CASINO") || u === "CASINO") return <span className="rounded bg-[#3182f6]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#3182f6]">카지노</span>;
  if (u === "SPORTS" || u.includes("SPORT")) return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">스포츠</span>;
  if (u === "MINIGAME" || u.includes("MINI")) return <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-700">미니</span>;
  if (u === "SLOT") return <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">슬롯</span>;
  return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{v}</span>;
}

function entryLabel(t: string) {
  switch (t) {
    case "DEPOSIT": return "충전";
    case "WITHDRAWAL": return "환전";
    case "BET": return "배팅";
    case "WIN": return "당첨";
    default: return t;
  }
}

function MemberActivityPanel({ userId, from, to }: { userId: string; from: string; to: string }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SalesActivityRes | null>(null);

  useEffect(() => { setPage(1); }, [userId, from, to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams({ from, to, page: String(page), pageSize: "15" });
    apiFetch<SalesActivityRes>(`/me/agent/downline/${userId}/sales-activity?${q}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, from, to, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3" onClick={(e) => e.stopPropagation()} role="presentation" onKeyDown={(e) => e.stopPropagation()}>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">구간 내 내역 (최신순)</p>
      {loading ? (
        <p className="text-[13px] text-gray-500">불러오는 중…</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-[13px] text-gray-500">이 구간에 표시할 내역이 없습니다.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                <tr>
                  <th className="px-3 py-2">일시</th>
                  <th className="px-3 py-2">구분</th>
                  <th className="px-3 py-2">게임</th>
                  <th className="px-3 py-2 text-right">금액</th>
                  <th className="px-3 py-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => {
                  const gameHint = row.vertical || row.subVertical
                    ? [row.vertical, row.subVertical].filter(Boolean).join(" · ")
                    : null;
                  const note = row.source === "WALLET" ? row.note
                    : [row.reference, gameHint].filter(Boolean).join(" · ") || null;
                  const amtColor =
                    row.entryType === "DEPOSIT" || row.entryType === "WIN"
                      ? "text-[#3182f6] font-semibold"
                      : row.entryType === "WITHDRAWAL"
                      ? "text-red-500 font-semibold"
                      : "text-gray-800";
                  return (
                    <tr key={`${row.source}-${row.id}`} className="border-b border-gray-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                        {new Date(row.occurredAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {entryLabel(row.entryType)}
                        <span className="ml-1 text-[10px] font-normal text-gray-400">
                          {row.source === "WALLET" ? "입출금" : "원장"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.vertical ? verticalBadge(row.vertical) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${amtColor}`}>{row.amount}</td>
                      <td className="max-w-[240px] truncate px-3 py-2 text-gray-500 text-[12px]">{note ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px] text-gray-500">
            <span>총 {data.total}건 · {data.page}/{totalPages}페이지</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-300 px-2.5 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-40">이전</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-2.5 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-40">다음</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AgentSalesPage() {
  const [from, setFrom] = useState(defaultRange().from);
  const [to, setTo] = useState(defaultRange().to);
  const [data, setData] = useState<Sales | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [memberQ, setMemberQ] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      const s = await apiFetch<Sales>(`/me/agent/sales?${q}`);
      const zero: GameBlock = { betSum: "0.00", betStakeAbs: "0.00", winSum: "0.00", byKind: {} };
      if (!s.gameSales) {
        s.gameSales = { LIVE_CASINO: { ...zero }, SPORTS: { ...zero }, MINIGAME: { ...zero }, SLOT: { ...zero }, UNKNOWN: { ...zero } };
      }
      for (const k of ["LIVE_CASINO", "SPORTS", "MINIGAME", "SLOT", "UNKNOWN"] as const) {
        if (!s.gameSales[k].byKind) s.gameSales[k].byKind = {};
      }
      setData({ ...s, members: s.members ?? [] });
      setExpandedMemberId(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const members = useMemo(() => data?.members ?? [], [data?.members]);
  const filteredMembers = useMemo(() => {
    const t = memberQ.trim().toLowerCase();
    if (!t) return members;
    return members.filter((m) =>
      m.loginId.toLowerCase().includes(t) ||
      (m.displayName?.toLowerCase().includes(t) ?? false) ||
      (m.uplinePrivateMemo?.toLowerCase().includes(t) ?? false),
    );
  }, [members, memberQ]);


  const settleAmt = data?.myEstimatedSettlement;
  const currentUser = getStoredUser();
  const hasNoMembers = !loading && data !== null && members.length === 0;

  const GAME_ROWS: Array<{ key: keyof GameSales; label: string; emoji: string }> = [
    { key: "LIVE_CASINO", label: "라이브 카지노", emoji: "🎰" },
    { key: "SPORTS", label: "스포츠", emoji: "⚽" },
    { key: "MINIGAME", label: "미니게임", emoji: "🎮" },
    { key: "SLOT", label: "슬롯", emoji: "🎯" },
    { key: "UNKNOWN", label: "분류없음", emoji: "?" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with current user */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">Agent Sales</p>
          <h1 className="mt-0.5 text-[22px] font-bold text-black">매출 현황</h1>
        </div>
        {currentUser && (
          <div className="text-right">
            <p className="text-[11px] text-gray-400">현재 계정</p>
            <p className="text-[14px] font-bold text-black">{currentUser.loginId ?? currentUser.email}</p>
          </div>
        )}
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-[13px] font-medium text-gray-700">
          시작
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        <label className="block text-[13px] font-medium text-gray-700">
          종료
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        {[
          { label: "오늘", days: 0 },
          { label: "7일", days: 7 },
          { label: "30일", days: 30 },
          { label: "90일", days: 90 },
        ].map(({ label, days }) => (
          <button key={label} type="button"
            onClick={() => {
              const e = new Date();
              const s = new Date(e);
              s.setDate(s.getDate() - days);
              setFrom(localDateStr(s));
              setTo(localDateStr(e));
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition">
            {label}
          </button>
        ))}
        <button type="button" onClick={() => void load()} disabled={loading}
          className="rounded-lg bg-[#3182f6] px-5 py-1.5 text-[14px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition">
          {loading ? "조회 중…" : "조회"}
        </button>
      </div>

      {err && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}

      {hasNoMembers && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[14px] font-bold text-amber-800">하위 회원(유저)이 없거나 이 기간에 활동 내역이 없습니다</p>
          <p className="mt-1 text-[13px] text-amber-700">
            테스트 시나리오를 실행하려면 <strong>슈퍼어드민 → 테스트 시나리오</strong>에서 1~9단계를 실행하세요.<br />
            테스트 계정: <code className="rounded bg-amber-100 px-1 font-mono text-[13px]">test_top_agent_a</code> / <code className="rounded bg-amber-100 px-1 font-mono text-[13px]">Test1234!</code>
          </p>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-[14px] text-gray-500">집계 중…</p>
      ) : data ? (
        <>
          {/* 정산금 Hero */}
          {settleAmt !== undefined && (
            <div className="rounded-2xl border-2 border-[#3182f6]/30 bg-[#3182f6]/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-[#3182f6]">
                    내 정산금
                  </p>
                  <p className="mt-2 text-[36px] font-bold text-[#3182f6]">
                    {fmt(settleAmt)}원
                  </p>
                </div>
                <Link href="/agent/commission-history"
                  className="shrink-0 rounded-xl border border-[#3182f6]/30 bg-white px-4 py-2 text-[13px] font-semibold text-[#3182f6] hover:bg-[#3182f6]/5 transition">
                  정산 내역 →
                </Link>
              </div>
            </div>
          )}

          {/* 게임별 요약 */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-[15px] font-bold text-black">게임별 배팅 요약</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[14px]">
                <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">게임 종류</th>
                    <th className="px-4 py-3 text-right">총 배팅</th>
                    <th className="px-4 py-3 text-right">총 당첨금</th>
                    <th className="px-4 py-3 text-right">비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {GAME_ROWS.map(({ key, label, emoji }) => {
                    const g = data.gameSales[key];
                    const stake = num(g.betStakeAbs);
                    const win = num(g.winSum);
                    const totalStake = GAME_ROWS.reduce((s, r) => s + num(data.gameSales[r.key].betStakeAbs), 0);
                    const pct = totalStake > 0 ? (stake / totalStake) * 100 : 0;
                    if (stake === 0 && win === 0) return null;
                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-black">{emoji} {label}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(stake)}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(win)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-[#3182f6]" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[12px] text-gray-600">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {GAME_ROWS.every(({ key }) => num(data.gameSales[key].betStakeAbs) === 0) ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center">
                        <p className="text-[14px] font-semibold text-gray-600">이 기간 내 게임 배팅 내역이 없습니다</p>
                        <p className="mt-1 text-[12px] text-gray-400">기간을 넓히거나 테스트 시나리오를 실행해 보세요</p>
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                      <td className="px-4 py-3 text-[13px] text-gray-700">합계</td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] text-black">
                        {fmt(GAME_ROWS.reduce((s, r) => s + num(data.gameSales[r.key].betStakeAbs), 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] text-black">
                        {fmt(GAME_ROWS.reduce((s, r) => s + num(data.gameSales[r.key].winSum), 0))}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 회원별 매출 */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[16px] font-bold text-black">
                회원별 매출
                <span className="ml-2 text-[14px] font-normal text-gray-500">({members.length}명)</span>
              </h2>
              <input
                type="search"
                value={memberQ}
                onChange={(e) => setMemberQ(e.target.value)}
                placeholder="아이디 / 닉네임 / 메모 검색"
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-[14px] text-gray-900 placeholder:text-gray-400"
              />
            </div>

            {filteredMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
                <p className="text-[14px] font-semibold text-gray-600">
                  {members.length === 0 ? "이 기간에 활동한 하위 회원이 없습니다" : "검색 결과가 없습니다"}
                </p>
                {members.length === 0 && (
                  <p className="mt-1 text-[12px] text-gray-400">
                    충전/환전 또는 배팅 내역이 있는 회원이 있어야 표시됩니다
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-[14px]">
                    <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="w-8 px-3 py-3" />
                        <th className="px-3 py-3">No</th>
                        <th className="px-3 py-3">회원</th>
                        <th className="px-3 py-3 text-right">충전</th>
                        <th className="px-3 py-3 text-right">환전</th>
                        <th className="px-3 py-3 text-right">총 배팅액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m, i) => {
                        const open = expandedMemberId === m.userId;
                        const stakeN = num(m.ledgerBetStakeAbs);
                        const maxStake = filteredMembers.reduce((a, r) => Math.max(a, num(r.ledgerBetStakeAbs)), 0) || 1;
                        const barPct = Math.min(100, (stakeN / maxStake) * 100);

                        return (
                          <Fragment key={m.userId}>
                            <tr
                              className={`cursor-pointer border-b border-gray-100 transition hover:bg-gray-50 ${open ? "bg-gray-50" : ""}`}
                              onClick={() => setExpandedMemberId((id) => id === m.userId ? null : m.userId)}
                            >
                              <td className="px-3 py-3 text-center text-gray-400 text-[12px]">
                                {open ? "▼" : "▶"}
                              </td>
                              <td className="px-3 py-3 text-gray-500">{i + 1}</td>
                              <td className="px-3 py-3">
                                <p className="font-mono text-[13px] font-semibold text-black">{m.loginId}</p>
                                {m.displayName && <p className="text-[12px] text-gray-500">{m.displayName}</p>}
                                {m.uplinePrivateMemo && (
                                  <p className="text-[11px] text-[#3182f6]">{m.uplinePrivateMemo}</p>
                                )}
                                <div className="mt-1 h-1 max-w-[140px] overflow-hidden rounded-full bg-gray-100">
                                  <div className="h-full rounded-full bg-[#3182f6]" style={{ width: `${barPct}%` }} />
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-[13px] font-semibold text-[#3182f6]">{fmt(m.approvedDepositSum)}</td>
                              <td className="px-3 py-3 text-right font-mono text-[13px] font-semibold text-red-500">{fmt(m.approvedWithdrawSum)}</td>
                              <td className="px-3 py-3 text-right font-mono text-[13px] text-gray-800">{fmt(m.ledgerBetStakeAbs)}</td>
                            </tr>
                            {open && (
                              <tr className="border-b border-gray-100">
                                <td colSpan={6} className="p-0">
                                  <MemberActivityPanel userId={m.userId} from={from} to={to} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <p className="text-[12px] text-gray-400">
            집계 구간: {new Date(data.from).toLocaleString("ko-KR")} ~ {new Date(data.to).toLocaleString("ko-KR")}
          </p>
        </>
      ) : null}
    </div>
  );
}

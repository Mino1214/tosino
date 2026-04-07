"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

type GameBlock = {
  betSum: string;
  betStakeAbs: string;
  winSum: string;
};

type GameSales = {
  LIVE_CASINO: GameBlock & { byKind: Record<string, GameBlock> };
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
  gameSales: GameSales;
  gameSalesMeta?: string;
  members?: MemberSalesRow[];
};

type SalesView =
  | { kind: "all" }
  | { kind: "members" }
  | { kind: "live"; subKey?: string }
  | { kind: "vertical"; vertical: "SPORTS" | "MINIGAME" | "SLOT" | "UNKNOWN" };

const LIVE_SUB_KO: Record<string, string> = {
  BACCARAT: "바카라",
  BLACKJACK: "블랙잭",
  ROULETTE: "룰렛",
  DRAGON_TIGER: "드래곤타이거",
  SICBO: "식보",
  GAME_SHOW: "게임쇼",
  POKER: "포커",
  OTHER: "기타",
};

function defaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function ggrHint(stakeAbs: string, winSum: string): string {
  const s = Number(stakeAbs);
  const w = Number(winSum);
  if (Number.isNaN(s) || Number.isNaN(w)) return "—";
  return (s - w).toFixed(2);
}

function entryTypeLabel(t: string): string {
  switch (t) {
    case "DEPOSIT":
      return "충전";
    case "WITHDRAWAL":
      return "환전";
    case "BET":
      return "배팅";
    case "WIN":
      return "당첨";
    default:
      return t;
  }
}

type SalesActivityRes = {
  page: number;
  pageSize: number;
  total: number;
  items: Array<{
    source: string;
    id: string;
    occurredAt: string;
    entryType: string;
    amount: string;
    note: string | null;
    reference: string | null;
    vertical: string | null;
    subVertical: string | null;
  }>;
};

function MemberSalesActivityPanel({
  userId,
  from,
  to,
}: {
  userId: string;
  from: string;
  to: string;
}) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SalesActivityRes | null>(null);

  useEffect(() => {
    setPage(1);
  }, [userId, from, to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const q = new URLSearchParams({
      from,
      to,
      page: String(page),
      pageSize: "10",
    });
    apiFetch<SalesActivityRes>(
      `/me/agent/downline/${userId}/sales-activity?${q}`,
    )
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "오류");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, from, to, page]);

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <div
      className="border-t border-zinc-800/80 bg-zinc-950/90 px-3 py-3"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        구간 내 내역 (승인 입출금 · 배팅/당첨, 최신순)
      </p>
      {err && (
        <p className="mt-2 text-xs text-red-300">{err}</p>
      )}
      {loading ? (
        <p className="mt-2 text-xs text-zinc-500">불러오는 중…</p>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">이 구간에 표시할 내역이 없습니다.</p>
      ) : (
        <>
          <div className="mt-2 overflow-x-auto rounded-lg border border-zinc-800/90">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-500">
                <tr>
                  <th className="px-2 py-2">시각</th>
                  <th className="px-2 py-2">구분</th>
                  <th className="px-2 py-2 text-right">금액</th>
                  <th className="px-2 py-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => {
                  const gameHint =
                    row.vertical || row.subVertical
                      ? [row.vertical, row.subVertical].filter(Boolean).join(" · ")
                      : null;
                  const extra =
                    row.source === "WALLET"
                      ? row.note
                      : [row.reference, gameHint].filter(Boolean).join(" · ") ||
                        null;
                  return (
                    <tr
                      key={`${row.source}-${row.id}`}
                      className="border-b border-zinc-800/60 last:border-0"
                    >
                      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-400">
                        {new Date(row.occurredAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-zinc-300">
                        {entryTypeLabel(row.entryType)}
                        {row.source === "LEDGER" && (
                          <span className="ml-1 text-[10px] text-zinc-600">
                            원장
                          </span>
                        )}
                        {row.source === "WALLET" && (
                          <span className="ml-1 text-[10px] text-zinc-600">
                            입출금
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-right font-mono ${
                          row.entryType === "DEPOSIT" ||
                          row.entryType === "WIN"
                            ? "text-emerald-300/85"
                            : row.entryType === "WITHDRAWAL"
                              ? "text-rose-300/85"
                              : "text-sky-300/85"
                        }`}
                      >
                        {row.amount}
                      </td>
                      <td className="max-w-[280px] truncate px-2 py-1.5 text-zinc-500">
                        {extra ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
            <span>
              총 {data.total}건 · {data.page}/{totalPages} 페이지
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                이전
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AgentSalesPage() {
  const router = useRouter();
  const [from, setFrom] = useState(defaultRange().from);
  const [to, setTo] = useState(defaultRange().to);
  const [data, setData] = useState<Sales | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<SalesView>({ kind: "all" });
  const [memberQ, setMemberQ] = useState("");
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      const s = await apiFetch<Sales>(`/me/agent/sales?${q}`);
      if (!s.gameSales) {
        s.gameSales = {
          LIVE_CASINO: {
            betSum: "0.00",
            betStakeAbs: "0.00",
            winSum: "0.00",
            byKind: {},
          },
          SPORTS: { betSum: "0.00", betStakeAbs: "0.00", winSum: "0.00" },
          MINIGAME: { betSum: "0.00", betStakeAbs: "0.00", winSum: "0.00" },
          SLOT: { betSum: "0.00", betStakeAbs: "0.00", winSum: "0.00" },
          UNKNOWN: { betSum: "0.00", betStakeAbs: "0.00", winSum: "0.00" },
        };
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
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "MASTER_AGENT") {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  const liveSubs = useMemo(() => {
    if (!data) return [] as string[];
    return Object.keys(data.gameSales.LIVE_CASINO.byKind).sort();
  }, [data]);

  const memberRows = data?.members ?? [];
  const filteredMembers = useMemo(() => {
    const t = memberQ.trim().toLowerCase();
    if (!t) return memberRows;
    return memberRows.filter(
      (m) =>
        m.loginId.toLowerCase().includes(t) ||
        (m.displayName?.toLowerCase().includes(t) ?? false) ||
        (m.uplinePrivateMemo?.toLowerCase().includes(t) ?? false),
    );
  }, [memberRows, memberQ]);

  if (!getAccessToken()) return null;

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <label className="text-sm text-zinc-400">
            시작
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-zinc-100"
            />
          </label>
          <label className="text-sm text-zinc-400">
            종료
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-zinc-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-amber-700/80 px-4 py-2 text-sm text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {loading ? "조회 중…" : "조회"}
          </button>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-zinc-100">매출</h1>
          <p className="mt-1 text-sm text-zinc-500">
            입출금은 전 구간 합계, 게임 수치는{" "}
            <span className="text-zinc-400">metaJson.vertical</span>·
            <span className="text-zinc-400">subVertical</span> 기준 집계입니다.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/45 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            매출 구분
          </p>
          <div className="overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
            <div className="flex w-max max-w-none flex-nowrap items-center gap-2 md:w-full md:max-w-full md:flex-wrap">
            <SalesSegTab
              active={view.kind === "all"}
              onClick={() => setView({ kind: "all" })}
            >
              전체 요약
            </SalesSegTab>
            <SalesSegTab
              active={view.kind === "members"}
              onClick={() => setView({ kind: "members" })}
            >
              회원별
              {data ? (
                <span className="ml-1 font-mono text-[11px] text-zinc-500">
                  ({memberRows.length})
                </span>
              ) : null}
            </SalesSegTab>
            <span
              className="hidden h-5 w-px shrink-0 bg-zinc-700 md:block"
              aria-hidden
            />
            <span className="shrink-0 text-[10px] font-medium uppercase text-zinc-600 md:pl-1">
              게임
            </span>
            <SalesSegTab
              active={view.kind === "live" && view.subKey === undefined}
              onClick={() => setView({ kind: "live" })}
            >
              라이브
            </SalesSegTab>
            {liveSubs.map((key) => (
              <SalesSegTab
                key={key}
                active={view.kind === "live" && view.subKey === key}
                nested
                onClick={() => setView({ kind: "live", subKey: key })}
              >
                {LIVE_SUB_KO[key] ?? key}
              </SalesSegTab>
            ))}
            <SalesSegTab
              active={view.kind === "vertical" && view.vertical === "SPORTS"}
              onClick={() => setView({ kind: "vertical", vertical: "SPORTS" })}
            >
              스포츠
            </SalesSegTab>
            <SalesSegTab
              active={view.kind === "vertical" && view.vertical === "MINIGAME"}
              onClick={() =>
                setView({ kind: "vertical", vertical: "MINIGAME" })
              }
            >
              미니게임
            </SalesSegTab>
            <SalesSegTab
              active={view.kind === "vertical" && view.vertical === "SLOT"}
              onClick={() => setView({ kind: "vertical", vertical: "SLOT" })}
            >
              슬롯
            </SalesSegTab>
            <SalesSegTab
              active={view.kind === "vertical" && view.vertical === "UNKNOWN"}
              onClick={() =>
                setView({ kind: "vertical", vertical: "UNKNOWN" })
              }
            >
              분류 없음
            </SalesSegTab>
            </div>
          </div>
        </div>

        {err && (
          <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}

        {loading ? (
          <p className="text-zinc-500">불러오는 중…</p>
        ) : data ? (
          <>
            {view.kind === "all" && (
              <div className="space-y-6">
                <h2 className="text-sm font-medium text-amber-200/90">
                  전체 요약
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard
                    label="승인 충전 합계"
                    value={data.approvedDepositSum}
                    accent="text-emerald-300"
                  />
                  <StatCard
                    label="승인 환전 합계"
                    value={data.approvedWithdrawSum}
                    accent="text-rose-300"
                  />
                  <StatCard
                    label="순입금 (충전 − 환전)"
                    value={data.netInflow}
                    accent="text-amber-200"
                  />
                  <StatCard
                    label="배팅 원장 합 (BET, 부호 유지)"
                    value={data.ledgerBetSum}
                    accent="text-zinc-200"
                  />
                  <StatCard
                    label="배팅액 (|BET| 합)"
                    value={data.ledgerBetStakeAbs}
                    accent="text-sky-300/90"
                  />
                  <StatCard
                    label="당첨 합 (WIN)"
                    value={data.ledgerWinSum}
                    accent="text-violet-300/90"
                  />
                </div>
                {memberRows.length > 0 && (
                  <TopMembersStrip
                    members={memberRows}
                    onSeeAll={() => setView({ kind: "members" })}
                  />
                )}
                <GameGridPreview gs={data.gameSales} />
              </div>
            )}

            {view.kind === "members" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-sm font-medium text-amber-200/90">
                      회원별 매출
                    </h2>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
                      구간 내{" "}
                      <span className="text-zinc-400">승인된 충전·환전</span> 또는{" "}
                      <span className="text-zinc-400">배팅·당첨 원장</span>이 있는
                      회원만 표시됩니다. 기본 정렬은 배팅액(|BET|) 높은 순입니다.{" "}
                      <span className="text-zinc-600">
                        행을 누르면 해당 기간 상세 내역이 펼쳐집니다 (10건씩).
                      </span>
                    </p>
                  </div>
                  <input
                    type="search"
                    value={memberQ}
                    onChange={(e) => setMemberQ(e.target.value)}
                    placeholder="아이디·닉네임·식별 메모 검색"
                    className="w-full min-w-[200px] max-w-sm rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 sm:w-auto"
                  />
                </div>
                {filteredMembers.length === 0 ? (
                  <p className="text-zinc-500">
                    {memberRows.length === 0
                      ? "이 구간에 활동한 하위 회원이 없습니다."
                      : "검색 결과가 없습니다."}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
                        <tr>
                          <th className="w-8 px-2 py-2.5" aria-label="펼침" />
                          <th className="px-3 py-2.5">No</th>
                          <th className="px-3 py-2.5">회원</th>
                          <th className="px-3 py-2.5">식별 메모</th>
                          <th className="px-3 py-2.5 text-right">충전</th>
                          <th className="px-3 py-2.5 text-right">환전</th>
                          <th className="px-3 py-2.5 text-right">순입금</th>
                          <th className="px-3 py-2.5 text-right">배팅(|BET|)</th>
                          <th className="px-3 py-2.5 text-right">당첨</th>
                          <th className="px-3 py-2.5 text-right">추정 GGR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((m, i) => {
                          const net = Number(m.netInflow);
                          const open = expandedMemberId === m.userId;
                          const stakeN = Number(m.ledgerBetStakeAbs);
                          const maxStake =
                            filteredMembers.reduce(
                              (acc, row) =>
                                Math.max(acc, Number(row.ledgerBetStakeAbs)),
                              0,
                            ) || 1;
                          const barPct = Math.min(
                            100,
                            (stakeN / maxStake) * 100,
                          );
                          return (
                            <Fragment key={m.userId}>
                              <tr
                                className={`cursor-pointer border-b border-zinc-800/70 transition hover:bg-zinc-900/50 ${
                                  open ? "bg-zinc-900/35" : ""
                                }`}
                                onClick={() =>
                                  setExpandedMemberId((id) =>
                                    id === m.userId ? null : m.userId,
                                  )
                                }
                              >
                                <td className="px-2 py-2.5 text-center text-zinc-500">
                                  <span className="text-xs" aria-hidden>
                                    {open ? "▼" : "▶"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 text-zinc-500">
                                  {i + 1}
                                </td>
                                <td className="max-w-[200px] px-3 py-2.5">
                                  <p className="truncate font-mono text-xs text-zinc-200">
                                    {m.loginId}
                                  </p>
                                  <p className="truncate text-xs text-zinc-500">
                                    {m.displayName ?? "—"}
                                  </p>
                                  <div
                                    className="mt-1.5 h-1 max-w-[180px] overflow-hidden rounded-full bg-zinc-800"
                                    title="구간 배팅액(|BET|) 상대 비율"
                                  >
                                    <div
                                      className="h-full rounded-full bg-sky-600/75"
                                      style={{ width: `${barPct}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="max-w-[140px] px-3 py-2.5 align-top">
                                  <p className="line-clamp-3 text-[11px] leading-snug text-amber-200/85">
                                    {m.uplinePrivateMemo?.trim()
                                      ? m.uplinePrivateMemo
                                      : "—"}
                                  </p>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs text-emerald-300/90">
                                  {m.approvedDepositSum}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs text-rose-300/90">
                                  {m.approvedWithdrawSum}
                                </td>
                                <td
                                  className={`px-3 py-2.5 text-right font-mono text-xs ${
                                    net >= 0
                                      ? "text-teal-300/90"
                                      : "text-orange-300/90"
                                  }`}
                                >
                                  {m.netInflow}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs text-sky-300/90">
                                  {m.ledgerBetStakeAbs}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs text-violet-300/90">
                                  {m.ledgerWinSum}
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-xs text-amber-200/90">
                                  {m.estGgr}
                                </td>
                              </tr>
                              {open && (
                                <tr className="border-b border-zinc-800/70 bg-zinc-950/50">
                                  <td colSpan={10} className="p-0 align-top">
                                    <MemberSalesActivityPanel
                                      userId={m.userId}
                                      from={from}
                                      to={to}
                                    />
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {memberRows.length >= 400 && (
                  <p className="text-xs text-zinc-600">
                    서버에서 배팅·입출금 활동이 있는 회원 최대 400명까지
                    내려줍니다.
                  </p>
                )}
              </div>
            )}

            {view.kind === "live" && (
              <GameDetailPanel
                title={
                  view.subKey
                    ? `라이브 카지노 · ${
                        LIVE_SUB_KO[view.subKey] ?? view.subKey
                      }`
                    : "라이브 카지노"
                }
                block={
                  view.subKey
                    ? data.gameSales.LIVE_CASINO.byKind[view.subKey] ?? {
                        betSum: "0.00",
                        betStakeAbs: "0.00",
                        winSum: "0.00",
                      }
                    : {
                        betSum: data.gameSales.LIVE_CASINO.betSum,
                        betStakeAbs: data.gameSales.LIVE_CASINO.betStakeAbs,
                        winSum: data.gameSales.LIVE_CASINO.winSum,
                      }
                }
              />
            )}

            {view.kind === "vertical" && view.vertical === "SPORTS" && (
              <GameDetailPanel
                title="스포츠"
                block={data.gameSales.SPORTS}
              />
            )}
            {view.kind === "vertical" && view.vertical === "MINIGAME" && (
              <GameDetailPanel
                title="미니게임"
                block={data.gameSales.MINIGAME}
              />
            )}
            {view.kind === "vertical" && view.vertical === "SLOT" && (
              <GameDetailPanel title="슬롯" block={data.gameSales.SLOT} />
            )}
            {view.kind === "vertical" && view.vertical === "UNKNOWN" && (
              <GameDetailPanel
                title="분류 없음"
                subtitle="metaJson.vertical 이 없거나 허용 값이 아닐 때"
                block={data.gameSales.UNKNOWN}
              />
            )}

            <p className="text-xs text-zinc-600">
              집계 구간: {new Date(data.from).toLocaleString()} ~{" "}
              {new Date(data.to).toLocaleString()}
            </p>
            {data.gameSalesMeta && (
              <p className="text-[11px] leading-relaxed text-zinc-600">
                연동 참고: {data.gameSalesMeta}
              </p>
            )}
          </>
        ) : null}
    </div>
  );
}

function TopMembersStrip({
  members,
  onSeeAll,
}: {
  members: MemberSalesRow[];
  onSeeAll: () => void;
}) {
  const top = members.slice(0, 6);
  const maxStake = Math.max(
    ...top.map((m) => Number(m.ledgerBetStakeAbs)),
    1e-9,
  );
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-300">
          회원별 한눈에 (배팅액 상위)
        </h3>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline"
        >
          전체 표 보기 →
        </button>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {top.map((m) => {
          const net = Number(m.netInflow);
          const stakeN = Number(m.ledgerBetStakeAbs);
          const barPct = Math.min(100, (stakeN / maxStake) * 100);
          return (
            <div
              key={m.userId}
              className="min-w-[210px] max-w-[240px] shrink-0 rounded-lg border border-zinc-800/90 bg-zinc-950/70 px-3 py-2.5"
            >
              <p className="truncate font-mono text-[11px] text-zinc-200">
                {m.loginId}
              </p>
              <p className="truncate text-[11px] text-zinc-500">
                {m.displayName ?? "닉네임 없음"}
              </p>
              {m.uplinePrivateMemo?.trim() ? (
                <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-amber-200/80">
                  {m.uplinePrivateMemo}
                </p>
              ) : null}
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800"
                title="배팅액 상대 비율"
              >
                <div
                  className="h-full rounded-full bg-sky-600/80"
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <dl className="mt-2 space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-2 text-zinc-500">
                  <dt>배팅액</dt>
                  <dd className="font-mono text-sky-300/90">
                    {m.ledgerBetStakeAbs}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 text-zinc-500">
                  <dt>당첨</dt>
                  <dd className="font-mono text-violet-300/85">
                    {m.ledgerWinSum}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 text-zinc-500">
                  <dt>순입금</dt>
                  <dd
                    className={`font-mono ${
                      net >= 0 ? "text-teal-300/90" : "text-orange-300/90"
                    }`}
                  >
                    {m.netInflow}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 text-zinc-500">
                  <dt>추정 GGR</dt>
                  <dd className="font-mono text-amber-200/90">{m.estGgr}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SalesSegTab({
  children,
  active,
  nested,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  nested?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${
        nested ? "border border-dashed border-zinc-700/80 text-xs" : ""
      } ${
        active
          ? "bg-amber-600/15 font-medium text-amber-200 ring-1 ring-amber-600/40"
          : "bg-zinc-950/50 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 font-mono text-lg ${accent}`}>
        {value} <span className="text-sm text-zinc-500">원</span>
      </p>
    </div>
  );
}

function GameGridPreview({ gs }: { gs: GameSales }) {
  const rows: { key: string; label: string; b: GameBlock }[] = [
    { key: "lc", label: "라이브 카지노", b: gs.LIVE_CASINO },
    { key: "sp", label: "스포츠", b: gs.SPORTS },
    { key: "mg", label: "미니게임", b: gs.MINIGAME },
    { key: "sl", label: "슬롯", b: gs.SLOT },
  ];
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        게임별 배팅·당첨 (미리보기)
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div
            key={r.key}
            className="rounded-xl border border-zinc-800/90 bg-zinc-950/40 px-4 py-3"
          >
            <p className="text-sm font-medium text-zinc-200">{r.label}</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-zinc-500">
              <div>
                <dt>배팅액</dt>
                <dd className="font-mono text-zinc-300">{r.b.betStakeAbs}</dd>
              </div>
              <div>
                <dt>당첨</dt>
                <dd className="font-mono text-emerald-400/80">{r.b.winSum}</dd>
              </div>
              <div>
                <dt>추정 GGR</dt>
                <dd className="font-mono text-amber-200/80">
                  {ggrHint(r.b.betStakeAbs, r.b.winSum)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameDetailPanel({
  title,
  subtitle,
  block,
}: {
  title: string;
  subtitle?: string;
  block: GameBlock;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-amber-200/90">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="BET 합 (부호 유지)"
          value={block.betSum}
          accent="text-zinc-200"
        />
        <StatCard
          label="배팅액 (절댓값 합)"
          value={block.betStakeAbs}
          accent="text-sky-300/90"
        />
        <StatCard
          label="WIN 합"
          value={block.winSum}
          accent="text-violet-300/90"
        />
        <StatCard
          label="추정 GGR (배팅액 − 당첨)"
          value={ggrHint(block.betStakeAbs, block.winSum)}
          accent="text-amber-200"
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type MatchStatus = "live" | "prematch" | "finished" | "unknown";
type MatchStatusFilter = "live" | "prematch" | "finished" | "all";

type SnapshotFilters = {
  sports: string[];
  bookmakers: string[];
  matchLimit: number;
  cacheTtlSeconds: number;
};

type OddsApiConfig = {
  enabled: boolean;
  sports: string[];
  bookmakers: string[];
  status: "all" | "live" | "prematch";
  cacheTtlSeconds: number;
  matchLimit: number;
};

type CatalogSummary = {
  id: string;
  fetchedAt: string;
  totalItems: number;
  sports: string[];
  bookmakers: string[];
  matchLimit: number;
  cacheTtlSeconds: number;
};

type ProcessedSummary = {
  id: string;
  snapshotType: "live" | "prematch";
  catalogSnapshotId: string | null;
  fetchedAt: string;
  totalMatches: number;
  sports: string[];
  bookmakers: string[];
  matchLimit: number;
  cacheTtlSeconds: number;
};

type OverviewResponse = {
  platformId: string;
  config: OddsApiConfig | null;
  latestCatalog: CatalogSummary | null;
  latestProcessed: {
    live: ProcessedSummary | null;
    prematch: ProcessedSummary | null;
  };
  historyCounts: {
    catalog: number;
    processed: number;
  };
  scheduler: {
    enabled: boolean;
    cron: string | null;
  };
};

type OddsApiCatalogItem = {
  id: string;
  sport: string;
  home: string | null;
  away: string | null;
  league: string | null;
  date: string | null;
  status: string | null;
  scores: {
    home: number | null;
    away: number | null;
    periods?: Record<string, { home: number; away: number }>;
  } | null;
  bookmakers: Record<string, unknown>;
  fetchedAt: string;
};

type CatalogItemsResponse = {
  platformId: string;
  fetchedAt: string | null;
  totalItems: number;
  filters: SnapshotFilters | null;
  items: OddsApiCatalogItem[];
};

type AggregatedMoneyline = {
  home: number;
  draw?: number;
  away: number;
  margin: number;
};

type AggregatedHandicap = {
  line: number;
  home: number;
  away: number;
  margin: number;
};

type AggregatedTotals = {
  line: number;
  over: number;
  under: number;
  margin: number;
};

type HandicapLine = AggregatedHandicap & { primary?: boolean };
type TotalsLine = AggregatedTotals & { primary?: boolean };

type AggregatedExtraOutcome = {
  key: string;
  label?: string | null;
  price: number;
};
type AggregatedExtraLine = {
  hdp?: number | null;
  label?: string | null;
  outcomes: AggregatedExtraOutcome[];
};
type AggregatedExtraMarket = {
  name: string;
  lines: AggregatedExtraLine[];
};

type AggregatedMatch = {
  matchId: string;
  sport: string;
  status: MatchStatus;
  startTime: string | null;
  kickoffUtc?: string | null;
  kickoffKst?: string | null;
  league: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    slug?: string | null;
  };
  home: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    externalId?: number | null;
  };
  away: {
    name: string | null;
    nameKr: string | null;
    logoUrl: string | null;
    externalId?: number | null;
  };
  scores: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
  markets: {
    moneyline?: AggregatedMoneyline;
    handicap?: AggregatedHandicap;
    totals?: AggregatedTotals;
    handicapLines?: HandicapLine[];
    totalsLines?: TotalsLine[];
    extras?: Record<string, AggregatedExtraMarket>;
  };
  bookies: string[];
  bookieCount: number;
  url?: string;
  lastUpdatedMs: number;
};

type MatchesResponse = {
  status: MatchStatusFilter;
  sport: string | null;
  total: number;
  matches: AggregatedMatch[];
  fetchedAt: string;
  filters: SnapshotFilters;
};

type CatalogHistoryResponse = {
  platformId: string;
  rows: CatalogSummary[];
};

type ProcessedHistoryResponse = {
  platformId: string;
  rows: ProcessedSummary[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return "—";
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

function marketSummary(match: AggregatedMatch) {
  const chunks: string[] = [];
  if (match.markets.moneyline) {
    const ml = match.markets.moneyline;
    chunks.push(
      `ML ${ml.home.toFixed(2)}${ml.draw ? ` / ${ml.draw.toFixed(2)}` : ""} / ${ml.away.toFixed(2)}`,
    );
  }
  const hdLines = match.markets.handicapLines ?? (match.markets.handicap ? [match.markets.handicap as HandicapLine] : []);
  if (hdLines.length > 0) chunks.push(`HCP ${hdLines.length}라인`);
  const tLines = match.markets.totalsLines ?? (match.markets.totals ? [match.markets.totals as TotalsLine] : []);
  if (tLines.length > 0) chunks.push(`O/U ${tLines.length}라인`);
  const extras = match.markets.extras ?? {};
  const extraNames = Object.keys(extras);
  if (extraNames.length > 0) {
    chunks.push(`+${extraNames.length}개 스페셜`);
  }
  return chunks.join(" · ") || "배당 없음";
}

/** 스페셜 마켓 이름을 한국어로 보기 좋게 변환. */
function prettyMarketName(raw: string): string {
  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    moneyline: "승부 (Moneyline)",
    ml: "승부 (Moneyline)",
    "draw no bet": "무승부 환불 (DNB)",
    "double chance": "더블 찬스",
    "both teams to score": "양팀 득점 (BTTS)",
    btts: "양팀 득점 (BTTS)",
    "european handicap": "유럽식 핸디캡",
    "half time / full time": "전반 / 종료",
    "half time/full time": "전반 / 종료",
    htft: "전반 / 종료",
    "1st half moneyline": "전반 승부",
    "1st half totals": "전반 O/U",
    "1st half handicap": "전반 핸디캡",
    "2nd half moneyline": "후반 승부",
    "2nd half totals": "후반 O/U",
    "2nd half handicap": "후반 핸디캡",
    "team totals": "팀별 O/U",
    "correct score": "정확한 스코어",
    "odd even": "홀/짝",
    "odd/even": "홀/짝",
  };
  return map[lower] ?? raw;
}

/** 한글 outcome 라벨 */
function prettyOutcomeKey(key: string): string {
  const k = key.toLowerCase();
  const map: Record<string, string> = {
    home: "홈",
    away: "원정",
    draw: "무",
    yes: "예(Yes)",
    no: "아니오(No)",
    over: "오버",
    under: "언더",
    "1": "1",
    "2": "2",
    x: "X",
    "1x": "1X",
    "12": "12",
    x2: "X2",
  };
  return map[k] ?? key;
}

function formatKickoff(match: AggregatedMatch) {
  const iso = match.kickoffKst || match.startTime;
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: MatchStatus) {
  const map: Record<MatchStatus, { label: string; cls: string }> = {
    live: { label: "LIVE", cls: "bg-red-600/20 text-red-300 border-red-500/40" },
    prematch: { label: "PREMATCH", cls: "bg-blue-600/20 text-blue-300 border-blue-500/40" },
    finished: { label: "FINISHED", cls: "bg-zinc-600/30 text-zinc-300 border-zinc-500/40" },
    unknown: { label: "UNKNOWN", cls: "bg-zinc-700/30 text-zinc-400 border-zinc-600/40" },
  };
  const { label, cls } = map[status] ?? map.unknown;
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded border ${cls}`}>
      {label}
    </span>
  );
}

function oddsCell(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return <span className="text-zinc-600">—</span>;
  return <span className="font-mono text-zinc-100">{v.toFixed(2)}</span>;
}

function marginPill(margin: number | null | undefined) {
  if (margin == null || !Number.isFinite(margin)) return null;
  const pct = (margin * 100).toFixed(1);
  const cls =
    margin <= 0.05
      ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40"
      : margin <= 0.1
        ? "bg-amber-600/20 text-amber-300 border-amber-600/40"
        : "bg-red-600/20 text-red-300 border-red-600/40";
  return (
    <span className={`px-1.5 py-0.5 text-[10px] rounded border ${cls}`}>
      margin {pct}%
    </span>
  );
}

function primaryHandicap(match: AggregatedMatch): HandicapLine[] {
  const lines = match.markets.handicapLines;
  if (lines && lines.length > 0) return lines;
  return match.markets.handicap ? [{ ...match.markets.handicap, primary: true }] : [];
}

function primaryTotals(match: AggregatedMatch): TotalsLine[] {
  const lines = match.markets.totalsLines;
  if (lines && lines.length > 0) return lines;
  return match.markets.totals ? [{ ...match.markets.totals, primary: true }] : [];
}

function formatHcpLine(line: number) {
  if (line === 0) return "0";
  return line > 0 ? `+${line}` : `${line}`;
}

function MarketDetailsPanel({ match }: { match: AggregatedMatch }) {
  const ml = match.markets.moneyline;
  const hcps = primaryHandicap(match);
  const totals = primaryTotals(match);
  const extras = match.markets.extras ?? {};
  const extraNames = Object.keys(extras);
  const hasAny =
    !!ml || hcps.length > 0 || totals.length > 0 || extraNames.length > 0;

  if (!hasAny) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-center text-sm text-zinc-500">
        이 경기의 가공된 배당이 없습니다. (bookmaker {match.bookieCount}개)
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-3">
      {/* Moneyline */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold tracking-wide text-zinc-400">
            승부 (Moneyline)
          </span>
          {ml ? marginPill(ml.margin) : null}
        </div>
        {ml ? (
          <div className="grid grid-cols-3 gap-1 text-center text-sm">
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-[10px] text-zinc-500">HOME</div>
              <div className="mt-1">{oddsCell(ml.home)}</div>
            </div>
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-[10px] text-zinc-500">DRAW</div>
              <div className="mt-1">{oddsCell(ml.draw ?? null)}</div>
            </div>
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-[10px] text-zinc-500">AWAY</div>
              <div className="mt-1">{oddsCell(ml.away)}</div>
            </div>
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-zinc-600">—</div>
        )}
      </div>

      {/* Handicap */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold tracking-wide text-zinc-400">
            핸디캡 ({hcps.length}라인)
          </span>
        </div>
        {hcps.length > 0 ? (
          <div className="space-y-1 text-sm">
            <div className="grid grid-cols-[3rem_1fr_1fr_auto] items-center gap-1 text-[10px] text-zinc-500">
              <span>라인</span>
              <span className="text-center">HOME</span>
              <span className="text-center">AWAY</span>
              <span />
            </div>
            {hcps.map((l, idx) => (
              <div
                key={`hcp-${idx}`}
                className={`grid grid-cols-[3rem_1fr_1fr_auto] items-center gap-1 rounded p-1 ${l.primary ? "bg-blue-900/20 ring-1 ring-blue-700/40" : "bg-zinc-900"}`}
              >
                <span className="font-mono text-xs text-zinc-300">
                  {formatHcpLine(l.line)}
                </span>
                <span className="text-center">{oddsCell(l.home)}</span>
                <span className="text-center">{oddsCell(l.away)}</span>
                <span className="ml-1">{marginPill(l.margin)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-zinc-600">—</div>
        )}
      </div>

      {/* Totals */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold tracking-wide text-zinc-400">
            오버/언더 ({totals.length}라인)
          </span>
        </div>
        {totals.length > 0 ? (
          <div className="space-y-1 text-sm">
            <div className="grid grid-cols-[3rem_1fr_1fr_auto] items-center gap-1 text-[10px] text-zinc-500">
              <span>라인</span>
              <span className="text-center">OVER</span>
              <span className="text-center">UNDER</span>
              <span />
            </div>
            {totals.map((l, idx) => (
              <div
                key={`tt-${idx}`}
                className={`grid grid-cols-[3rem_1fr_1fr_auto] items-center gap-1 rounded p-1 ${l.primary ? "bg-blue-900/20 ring-1 ring-blue-700/40" : "bg-zinc-900"}`}
              >
                <span className="font-mono text-xs text-zinc-300">{l.line}</span>
                <span className="text-center">{oddsCell(l.over)}</span>
                <span className="text-center">{oddsCell(l.under)}</span>
                <span className="ml-1">{marginPill(l.margin)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-zinc-600">—</div>
        )}
      </div>

      {/* 스페셜 마켓 (DNB / Double Chance / BTTS / European Handicap / HTFT / …) */}
      {extraNames.length > 0 ? (
        <div className="md:col-span-3 grid gap-3 md:grid-cols-2">
          {extraNames.map((name) => (
            <ExtraMarketSection
              key={name}
              name={name}
              market={extras[name]}
            />
          ))}
        </div>
      ) : null}

      {match.bookies.length > 0 ? (
        <div className="md:col-span-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-[11px] font-semibold tracking-wide text-zinc-400 mb-2">
            참여 북메이커 ({match.bookieCount}개)
          </div>
          <div className="flex flex-wrap gap-1">
            {match.bookies.map((b) => (
              <span
                key={b}
                className="px-2 py-0.5 text-[11px] rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExtraMarketSection({
  name,
  market,
}: {
  name: string;
  market: AggregatedExtraMarket;
}) {
  const lines = market?.lines ?? [];
  if (lines.length === 0) return null;
  // 같은 outcome 키 세트를 쓰는 라인이 많으면 고정 컬럼, 아니면 라인별 자유 렌더
  const outcomeKeys = Array.from(
    new Set(lines.flatMap((l) => l.outcomes.map((o) => o.key))),
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wide text-zinc-400">
          {prettyMarketName(name)}
          <span className="ml-1 text-zinc-600">({lines.length}라인)</span>
        </span>
      </div>
      <div
        className="grid gap-1 text-[11px] text-zinc-500"
        style={{
          gridTemplateColumns: `minmax(3rem, auto) repeat(${outcomeKeys.length}, minmax(0, 1fr))`,
        }}
      >
        <span />
        {outcomeKeys.map((k) => (
          <span key={k} className="text-center uppercase">
            {prettyOutcomeKey(k)}
          </span>
        ))}
        {lines.map((ln, idx) => {
          const byKey = new Map(ln.outcomes.map((o) => [o.key, o.price]));
          const lineLabel =
            ln.label ??
            (ln.hdp === null || ln.hdp === undefined
              ? "—"
              : ln.hdp > 0
                ? `+${ln.hdp}`
                : String(ln.hdp));
          return (
            <div
              key={`ex-${idx}`}
              className="col-span-full grid items-center gap-1 rounded bg-zinc-900 p-1"
              style={{
                gridTemplateColumns: `minmax(3rem, auto) repeat(${outcomeKeys.length}, minmax(0, 1fr))`,
              }}
            >
              <span className="font-mono text-[11px] text-zinc-300">
                {lineLabel}
              </span>
              {outcomeKeys.map((k) => (
                <span key={k} className="text-center text-sm">
                  {oddsCell(byKey.get(k))}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  expanded,
  onToggle,
}: {
  match: AggregatedMatch;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasAnyOdds =
    !!match.markets.moneyline ||
    (match.markets.handicapLines?.length ?? 0) > 0 ||
    (match.markets.totalsLines?.length ?? 0) > 0 ||
    !!match.markets.handicap ||
    !!match.markets.totals;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        expanded
          ? "border-blue-600/60 bg-zinc-900/80"
          : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {statusBadge(match.status)}
              <span className="text-[11px] text-zinc-500 uppercase tracking-wide">
                {match.sport}
              </span>
              <span className="text-[11px] text-zinc-400 truncate">
                {match.league.nameKr || match.league.name || "리그 미상"}
              </span>
              {!hasAnyOdds && (
                <span className="px-1.5 py-0.5 text-[10px] rounded border border-zinc-700 bg-zinc-800 text-zinc-500">
                  배당 없음
                </span>
              )}
            </div>
            <div className="mt-1.5 text-sm font-semibold text-zinc-100 truncate">
              {match.home.nameKr || match.home.name || "?"}
              <span className="mx-2 text-zinc-500">vs</span>
              {match.away.nameKr || match.away.name || "?"}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              KST {formatKickoff(match)} · book {match.bookieCount}개 · {marketSummary(match)}
            </div>
          </div>
          <div className="text-right text-xs text-zinc-400 whitespace-nowrap shrink-0">
            <div className="font-mono">{scoreText(match.scores)}</div>
            <div className="mt-1 text-[10px] text-zinc-500">
              {formatRelativeTime(new Date(match.lastUpdatedMs).toISOString())}
            </div>
            <div className="mt-1 text-[10px] text-blue-400">
              {expanded ? "▲ 접기" : "▼ 배당 보기"}
            </div>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <MarketDetailsPanel match={match} />
        </div>
      )}
    </div>
  );
}

function scoreText(
  scores:
    | {
        home: number | null;
        away: number | null;
      }
    | null
    | undefined,
) {
  if (!scores) return "—";
  return `${scores.home ?? 0} : ${scores.away ?? 0}`;
}

function bookmakerCount(bookmakers: Record<string, unknown>) {
  return Object.keys(bookmakers ?? {}).length;
}

function ProcessedMatchesSection(props: {
  statusTab: MatchStatusFilter;
  setStatusTab: (t: MatchStatusFilter) => void;
  sportFilter: string;
  setSportFilter: (s: string) => void;
  searchQ: string;
  setSearchQ: (s: string) => void;
  onlyWithOdds: boolean;
  setOnlyWithOdds: (b: boolean) => void;
  expandedMatchId: string | null;
  setExpandedMatchId: (id: string | null) => void;
  liveMatches: MatchesResponse | null;
  prematchMatches: MatchesResponse | null;
  finishedMatches: MatchesResponse | null;
}) {
  const {
    statusTab,
    setStatusTab,
    sportFilter,
    setSportFilter,
    searchQ,
    setSearchQ,
    onlyWithOdds,
    setOnlyWithOdds,
    expandedMatchId,
    setExpandedMatchId,
    liveMatches,
    prematchMatches,
    finishedMatches,
  } = props;

  const allMatches = useMemo(() => {
    const L = liveMatches?.matches ?? [];
    const P = prematchMatches?.matches ?? [];
    const F = finishedMatches?.matches ?? [];
    return { live: L, prematch: P, finished: F, all: [...L, ...P, ...F] };
  }, [liveMatches, prematchMatches, finishedMatches]);

  const activeMatches = useMemo(() => {
    switch (statusTab) {
      case "live":
        return allMatches.live;
      case "prematch":
        return allMatches.prematch;
      case "finished":
        return allMatches.finished;
      default:
        return allMatches.all;
    }
  }, [statusTab, allMatches]);

  const sportCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of activeMatches) {
      map.set(m.sport, (map.get(m.sport) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activeMatches]);

  const filteredMatches = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return activeMatches.filter((m) => {
      if (sportFilter !== "all" && m.sport !== sportFilter) return false;
      if (onlyWithOdds) {
        const has =
          !!m.markets.moneyline ||
          (m.markets.handicapLines?.length ?? 0) > 0 ||
          (m.markets.totalsLines?.length ?? 0) > 0 ||
          !!m.markets.handicap ||
          !!m.markets.totals;
        if (!has) return false;
      }
      if (q) {
        const hay = [
          m.home.name,
          m.home.nameKr,
          m.away.name,
          m.away.nameKr,
          m.league.name,
          m.league.nameKr,
          m.matchId,
        ]
          .filter((v): v is string => !!v)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeMatches, sportFilter, onlyWithOdds, searchQ]);

  const tabs: { key: MatchStatusFilter; label: string; count: number }[] = [
    { key: "live", label: "LIVE", count: allMatches.live.length },
    { key: "prematch", label: "PREMATCH", count: allMatches.prematch.length },
    { key: "finished", label: "FINISHED", count: allMatches.finished.length },
    { key: "all", label: "전체", count: allMatches.all.length },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
            Processed Matches
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
            클라이언트 송출용으로 재가공된 live · prematch · finished 배당. 경기를 클릭하면 배팅슬립 형태로 배당을 펼칩니다.
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-zinc-500">
          live {formatRelativeTime(liveMatches?.fetchedAt)} · prematch {formatRelativeTime(prematchMatches?.fetchedAt)}
        </div>
      </div>

      {/* tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatusTab(t.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t ${
              statusTab === t.key
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t.label} <span className="ml-1 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={sportFilter}
          onChange={(e) => setSportFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
        >
          <option value="all">모든 종목 ({activeMatches.length})</option>
          {sportCounts.map(([s, n]) => (
            <option key={s} value={s}>
              {s} ({n})
            </option>
          ))}
        </select>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="팀/리그 검색"
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 w-48"
        />
        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyWithOdds}
            onChange={(e) => setOnlyWithOdds(e.target.checked)}
            className="accent-blue-600"
          />
          배당 있는 것만
        </label>
        <span className="ml-auto text-xs text-zinc-500">
          {filteredMatches.length} / {activeMatches.length}
        </span>
      </div>

      {/* list */}
      <div className="mt-3 space-y-2">
        {filteredMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-8 text-center text-sm text-zinc-500">
            조건에 맞는 경기가 없습니다.
          </div>
        ) : (
          filteredMatches.map((match) => (
            <MatchCard
              key={`${statusTab}-${match.matchId}`}
              match={match}
              expanded={expandedMatchId === match.matchId}
              onToggle={() =>
                setExpandedMatchId(expandedMatchId === match.matchId ? null : match.matchId)
              }
            />
          ))
        )}
      </div>
    </section>
  );
}

function InfoCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-zinc-100">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">{sub}</p> : null}
    </div>
  );
}

export default function OddsApiWsPage() {
  const { platforms, selectedPlatformId, loading: platformLoading } = usePlatform();
  const selectedPlatform = useMemo(
    () => platforms.find((row) => row.id === selectedPlatformId) ?? null,
    [platforms, selectedPlatformId],
  );

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItemsResponse | null>(null);
  const [liveMatches, setLiveMatches] = useState<MatchesResponse | null>(null);
  const [prematchMatches, setPrematchMatches] = useState<MatchesResponse | null>(null);
  const [finishedMatches, setFinishedMatches] = useState<MatchesResponse | null>(null);
  const [catalogHistory, setCatalogHistory] = useState<CatalogSummary[]>([]);
  const [processedHistory, setProcessedHistory] = useState<ProcessedSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusTab, setStatusTab] = useState<MatchStatusFilter>("live");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [searchQ, setSearchQ] = useState<string>("");
  const [onlyWithOdds, setOnlyWithOdds] = useState<boolean>(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedPlatformId) {
      setOverview(null);
      setCatalogItems(null);
      setLiveMatches(null);
      setPrematchMatches(null);
      setFinishedMatches(null);
      setCatalogHistory([]);
      setProcessedHistory([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const q = new URLSearchParams({ platformId: selectedPlatformId });
      const [
        nextOverview,
        nextCatalogItems,
        nextLive,
        nextPrematch,
        nextFinished,
        nextCatalogHistory,
        nextProcessedHistory,
      ] = await Promise.all([
        apiFetch<OverviewResponse>(`/hq/odds-api-ws/platform-overview?${q}`),
        apiFetch<CatalogItemsResponse>(`/hq/odds-api-ws/catalog-items?${q}&limit=20`),
        apiFetch<MatchesResponse>(`/hq/odds-api-ws/matches?${q}&status=live&limit=500`),
        apiFetch<MatchesResponse>(`/hq/odds-api-ws/matches?${q}&status=prematch&limit=500`),
        apiFetch<MatchesResponse>(
          `/hq/odds-api-ws/matches?${q}&status=finished&limit=500`,
        ).catch(() => ({ matches: [], total: 0, fetchedAt: "", sport: null, filters: {} } as unknown as MatchesResponse)),
        apiFetch<CatalogHistoryResponse>(`/hq/odds-api-ws/catalog-history?${q}&take=8`),
        apiFetch<ProcessedHistoryResponse>(
          `/hq/odds-api-ws/processed-history?${q}&take=12`,
        ),
      ]);
      setOverview(nextOverview);
      setCatalogItems(nextCatalogItems);
      setLiveMatches(nextLive);
      setPrematchMatches(nextPrematch);
      setFinishedMatches(nextFinished);
      setCatalogHistory(nextCatalogHistory.rows);
      setProcessedHistory(nextProcessedHistory.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "odds-api 저장 상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 15000);
    return () => window.clearInterval(id);
  }, [load]);

  async function runRefresh() {
    if (!selectedPlatformId) return;
    setRefreshing(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiFetch<{
        liveCount: number;
        prematchCount: number;
        catalogCount: number;
        fetchedAt: string;
      }>("/hq/odds-api-ws/platform-refresh", {
        method: "POST",
        body: JSON.stringify({ platformId: selectedPlatformId }),
      });
      setMessage(
        `수집을 실행했습니다. raw ${res.catalogCount}건 · live ${res.liveCount}건 · prematch ${res.prematchCount}건`,
      );
      await load();
    } catch (e) {
      setRefreshing(false);
      setError(e instanceof Error ? e.message : "수집 실행에 실패했습니다.");
    }
  }

  if (platformLoading || loading) {
    return <p className="text-sm text-gray-500 dark:text-zinc-400">Live Odds 저장 상태를 불러오는 중…</p>;
  }

  if (!selectedPlatformId || !selectedPlatform) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-400">
        좌측 사이드바에서 솔루션을 먼저 선택하면, 해당 플랫폼의 raw 저장 목록과 processed 저장 결과를 여기서 제어할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-zinc-500">
            HQ Control
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            Live Odds Control Room
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
            선택 플랫폼 <span className="font-semibold text-gray-900 dark:text-zinc-100">{selectedPlatform.name}</span>의
            raw catalog 저장과 processed snapshot 저장 상태를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => void runRefresh()}
            disabled={refreshing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing ? "실행 중…" : "지금 수집 실행"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
          {message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">파이프라인 개요</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              cron 기반 자동 실행 여부, 현재 플랫폼 설정, 최신 raw/processed 저장 시각입니다.
            </p>
          </div>
          <div className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            cron {overview?.scheduler.enabled ? overview.scheduler.cron : "disabled"}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Raw Catalog"
            value={`${overview?.latestCatalog?.totalItems ?? 0}건`}
            sub={formatDateTime(overview?.latestCatalog?.fetchedAt)}
          />
          <InfoCard
            label="Processed Live"
            value={`${overview?.latestProcessed.live?.totalMatches ?? 0}건`}
            sub={formatDateTime(overview?.latestProcessed.live?.fetchedAt)}
          />
          <InfoCard
            label="Processed Prematch"
            value={`${overview?.latestProcessed.prematch?.totalMatches ?? 0}건`}
            sub={formatDateTime(overview?.latestProcessed.prematch?.fetchedAt)}
          />
          <InfoCard
            label="Config"
            value={overview?.config?.enabled ? "enabled" : "disabled"}
            sub={
              overview?.config
                ? `sports ${overview.config.sports.length} · bookmakers ${overview.config.bookmakers.length}`
                : "oddsApi 설정 없음"
            }
          />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="font-semibold text-gray-900 dark:text-zinc-100">현재 설정</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <p className="text-gray-600 dark:text-zinc-400">
              sports:{" "}
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                {overview?.config?.sports.join(", ") || "—"}
              </span>
            </p>
            <p className="text-gray-600 dark:text-zinc-400">
              status filter:{" "}
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                {overview?.config?.status ?? "—"}
              </span>
            </p>
            <p className="text-gray-600 dark:text-zinc-400">
              bookmakers:{" "}
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                {overview?.config?.bookmakers.join(", ") || "—"}
              </span>
            </p>
            <p className="text-gray-600 dark:text-zinc-400">
              matchLimit / ttl:{" "}
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                {overview?.config?.matchLimit ?? 0} / {overview?.config?.cacheTtlSeconds ?? 0}s
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Raw Catalog 저장 목록</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              최근 수집된 raw list 중 최신 스냅샷 일부입니다. 이 데이터가 processed 단계의 입력이 됩니다.
            </p>
          </div>
          <div className="text-xs text-gray-500 dark:text-zinc-500">
            최신 저장 {formatRelativeTime(catalogItems?.fetchedAt)}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">경기</th>
                <th className="px-3 py-2">리그 / 상태</th>
                <th className="px-3 py-2">시각</th>
                <th className="px-3 py-2">북메이커</th>
                <th className="px-3 py-2">스코어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {(catalogItems?.items ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-gray-900 dark:text-zinc-100">
                    <div className="font-medium">{row.home ?? "?"} vs {row.away ?? "?"}</div>
                    <div className="text-xs text-gray-500 dark:text-zinc-500">
                      {row.id} · {row.sport}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                    <div>{row.league ?? "—"}</div>
                    <div className="text-xs">{row.status ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                    <div>{formatDateTime(row.date)}</div>
                    <div className="text-xs">{formatRelativeTime(row.fetchedAt)}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                    {bookmakerCount(row.bookmakers)}개
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                    {scoreText(row.scores)}
                  </td>
                </tr>
              ))}
              {(catalogItems?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500 dark:text-zinc-500">
                    저장된 raw catalog가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <ProcessedMatchesSection
        statusTab={statusTab}
        setStatusTab={(t) => {
          setStatusTab(t);
          setExpandedMatchId(null);
        }}
        sportFilter={sportFilter}
        setSportFilter={setSportFilter}
        searchQ={searchQ}
        setSearchQ={setSearchQ}
        onlyWithOdds={onlyWithOdds}
        setOnlyWithOdds={setOnlyWithOdds}
        expandedMatchId={expandedMatchId}
        setExpandedMatchId={setExpandedMatchId}
        liveMatches={liveMatches}
        prematchMatches={prematchMatches}
        finishedMatches={finishedMatches}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Raw 저장 이력</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
                어떤 시점에 raw catalog가 저장됐는지 최근 실행 이력을 봅니다.
              </p>
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-500">
              총 {overview?.historyCounts.catalog ?? 0}건
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">시각</th>
                  <th className="px-3 py-2">건수</th>
                  <th className="px-3 py-2">sports</th>
                  <th className="px-3 py-2">limit / ttl</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {catalogHistory.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-gray-900 dark:text-zinc-100">
                      <div>{formatDateTime(row.fetchedAt)}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-500">{row.id}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">{row.totalItems}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                      {row.sports.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                      {row.matchLimit} / {row.cacheTtlSeconds}s
                    </td>
                  </tr>
                ))}
                {catalogHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500 dark:text-zinc-500">
                      raw 저장 이력이 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Processed 저장 이력</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
                raw 입력을 바탕으로 live / prematch 결과가 저장된 실행 이력입니다.
              </p>
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-500">
              총 {overview?.historyCounts.processed ?? 0}건
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">시각</th>
                  <th className="px-3 py-2">타입</th>
                  <th className="px-3 py-2">건수</th>
                  <th className="px-3 py-2">raw 연결</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                {processedHistory.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 text-gray-900 dark:text-zinc-100">
                      <div>{formatDateTime(row.fetchedAt)}</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-500">{row.id}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">{row.snapshotType}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">{row.totalMatches}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">
                      {row.catalogSnapshotId ?? "—"}
                    </td>
                  </tr>
                ))}
                {processedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-gray-500 dark:text-zinc-500">
                      processed 저장 이력이 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

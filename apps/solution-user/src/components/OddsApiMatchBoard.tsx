"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOddsApiMatches,
  fetchOddsApiWsStatus,
  type AggregatedMatch,
  type AggregatedMoneyline,
  type AggregatedHandicap,
  type AggregatedTotals,
  type AggregatedHandicapLine,
  type AggregatedTotalsLine,
  type AggregatedExtraMarket,
  type OddsApiWsEvent,
  type OddsApiWsStatus,
} from "@/lib/api";
import { useBootstrap, useBootstrapHost } from "./BootstrapProvider";
import { useBettingCart } from "./BettingCartContext";
import { LiveMatchPanel, useLiveMatchPanelState } from "./LiveMatchPanel";

/**
 * /public/odds-api-ws/matches 응답을 그대로 그려주는 매치 보드.
 * 책임 (서버에서 다 정리해서 옴):
 *  - 그룹핑/베스트 가격/마진 재조정 → 서버
 *  - 한글 리그/팀명, 리그 로고 → 서버
 * 본 컴포넌트는 표시·종목 필터·트래커 패널 열기만 담당.
 *
 * mode: 'live'|'prematch' — 외부에서 결정 (SportsHubClient 의 탭과 동기화).
 */
export function OddsApiMatchBoard({
  mode,
}: {
  mode: "live" | "prematch";
}) {
  const b = useBootstrap();
  const requestHost = useBootstrapHost();
  const { lines, addLine, removeLine } = useBettingCart();
  const [matches, setMatches] = useState<AggregatedMatch[]>([]);
  const [status, setStatus] = useState<OddsApiWsStatus | null>(null);
  const [activeSport, setActiveSport] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const live = useLiveMatchPanelState();
  const slipTemplate = b?.oddsApi?.betSlipTemplate;
  const marketPriority =
    slipTemplate?.marketPriority?.length && slipTemplate.marketPriority.length > 0
      ? slipTemplate.marketPriority
      : (["moneyline", "handicap", "totals"] as const);

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        fetchOddsApiWsStatus(requestHost),
        fetchOddsApiMatches({
          host: requestHost,
          status: mode,
          sport: activeSport || undefined,
          limit: 200,
        }),
      ]);
      setStatus(s);
      setMatches(m.matches);
      setErr(null);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [mode, activeSport, requestHost]);

  useEffect(() => {
    void load();
    // 라이브는 4초, 프리매치는 30초 간격으로 폴링
    const interval = mode === "live" ? 4_000 : 30_000;
    const id = window.setInterval(() => void load(), interval);
    return () => clearInterval(id);
  }, [load, mode]);

  useEffect(() => {
    if (status && status.filters.sports.length > 0 && !activeSport) {
      setActiveSport(status.filters.sports[0]);
    }
  }, [status, activeSport]);

  const isLight = (b?.theme.ui?.background ?? "dark") === "light";

  const matchesByLeague = useMemo(() => groupByLeague(matches), [matches]);

  const sportCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of matches) {
      m.set(x.sport, (m.get(x.sport) ?? 0) + 1);
    }
    return m;
  }, [matches]);

  const picked = useMemo(() => {
    const next = new Set<string>();
    for (const line of lines) {
      if (line.selectionKey) next.add(line.selectionKey);
    }
    return next;
  }, [lines]);

  const togglePick = useCallback(
    (pick: OddsPickPayload) => {
      const existing = lines.find((line) => line.selectionKey === pick.selectionKey);
      if (existing) {
        removeLine(existing.id);
        return;
      }
      addLine({
        matchLabel: `${pick.homeName} vs ${pick.awayName}`,
        pickLabel: pick.pickLabel,
        odd: pick.odd.toFixed(2),
        selectionKey: pick.selectionKey,
        source: "odds-api",
        marketType: pick.marketType,
        outcome: pick.outcome,
        line: pick.line ?? null,
        leagueName: pick.leagueName,
        homeName: pick.homeName,
        awayName: pick.awayName,
        startTime: pick.startTime,
        bookmakerCount: pick.bookmakerCount,
        sourceBookmaker: null,
      });
    },
    [addLine, lines, removeLine],
  );

  const onOpenTracker = useCallback(
    (match: AggregatedMatch) => {
      // LiveMatchPanel 은 OddsApiWsEvent shape 기대 — AggregatedMatch 를 그 모양으로 변환
      const fakeEvent: OddsApiWsEvent = {
        sport: match.sport,
        eventId: match.matchId,
        bookie: match.bookies[0] ?? "—",
        url: match.url,
        markets: [],
        timestamp: match.lastUpdatedMs / 1000,
        seq: 0,
        updatedAt: new Date(match.lastUpdatedMs || Date.now()).toISOString(),
        home: match.home.nameKr ?? match.home.name,
        away: match.away.nameKr ?? match.away.name,
        league: match.league.nameKr ?? match.league.name,
        date: match.startTime,
        eventStatus: match.status,
        scores: match.scores,
      };
      live.openWith(fakeEvent);
    },
    [live],
  );

  if (!b) return null;

  const totalMatches = matches.length;

  return (
    <section className="mt-4" id="odds-api-match-board">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            className={`text-lg font-semibold md:text-xl ${
              isLight ? "text-zinc-900" : "text-white"
            }`}
          >
            {mode === "live" ? "인게임 라이브" : "프리매치"}
          </h2>
          <p
            className={`mt-0.5 text-xs ${
              isLight ? "text-zinc-500" : "text-zinc-500"
            }`}
          >
            {status
              ? `${totalMatches}개 매치 · ${status.filters.sports.join(", ") || "—"}`
              : "조회 중…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {picked.size > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(218,174,87,0.18)] px-3 py-1 text-[11px] font-bold text-main-gold">
              선택 {picked.size}개
            </span>
          ) : null}
          <ConnectionBadge status={status} loading={loading} mode={mode} />
        </div>
      </div>

      {err ? (
        <p className="mb-3 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-200/90">
          상태 조회 실패: {err}
        </p>
      ) : null}

      {!status?.configured ? (
        <EmptyBox isLight={isLight}>
          아직 이 플랫폼의 Live Odds가 활성화되지 않았습니다.
        </EmptyBox>
      ) : status.filters.sports.length === 0 ? (
        <EmptyBox isLight={isLight}>
          HQ 구독 종목 또는 플랫폼 종목 필터를 먼저 설정해 주세요.
        </EmptyBox>
      ) : (
        <>
          {/* 종목 탭 */}
          <div className="mb-3 flex flex-wrap gap-2">
            {status.filters.sports.map((sp) => {
              const active = activeSport === sp;
              const n = sportCounts.get(sp) ?? 0;
              return (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setActiveSport(sp)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition md:px-4 ${
                    active
                      ? `border-[rgba(218,174,87,0.55)] bg-[rgba(218,174,87,0.15)] ${isLight ? "text-zinc-900" : "text-main-gold"}`
                      : isLight
                        ? "border-zinc-200 bg-white/80 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                        : "border-white/10 bg-zinc-900/50 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                  }`}
                >
                  <span className="font-semibold capitalize">{prettySport(sp)}</span>
                  <span className="text-[11px] opacity-80">({n})</span>
                </button>
              );
            })}
          </div>

          {totalMatches === 0 ? (
            <EmptyBox isLight={isLight}>
              {mode === "live"
                ? "현재 진행 중인 라이브 경기가 없습니다."
                : "예정 경기 데이터가 없습니다."}
            </EmptyBox>
          ) : (
            <div className="space-y-4">
              {matchesByLeague.map((group) => (
                <LeagueBlock
                  key={group.key}
                  group={group}
                  isLight={isLight}
                  picked={picked}
                  marketPriority={marketPriority}
                  showBookmakerCount={slipTemplate?.showBookmakerCount !== false}
                  onPick={togglePick}
                  onOpenTracker={onOpenTracker}
                />
              ))}
            </div>
          )}
        </>
      )}
      <LiveMatchPanel open={live.open} data={live.data} onClose={live.close} />
    </section>
  );
}

/* ─────────────────────────── presentation ─────────────────────────── */

function EmptyBox({
  isLight,
  children,
}: {
  isLight: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${
        isLight
          ? "border-zinc-300 bg-zinc-200/40 text-zinc-600"
          : "border-white/15 bg-zinc-950/60 text-zinc-500"
      }`}
    >
      {children}
    </div>
  );
}

function ConnectionBadge({
  status,
  loading,
  mode,
}: {
  status: OddsApiWsStatus | null;
  loading: boolean;
  mode: "live" | "prematch";
}) {
  if (loading && !status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-400">
        조회 중…
      </span>
    );
  }
  if (!status) return null;
  if (mode === "prematch") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-semibold text-blue-300">
        <span className="h-2 w-2 rounded-full bg-blue-400" />
        프리매치
      </span>
    );
  }
  const map: Record<
    OddsApiWsStatus["connectionState"],
    { label: string; cls: string; dot: string }
  > = {
    idle: {
      label: "대기",
      cls: "bg-white/5 text-zinc-400",
      dot: "bg-zinc-400",
    },
    connecting: {
      label: "연결 중",
      cls: "bg-blue-500/10 text-blue-300 animate-pulse",
      dot: "bg-blue-400",
    },
    open: {
      label: "라이브",
      cls: "bg-emerald-500/15 text-emerald-300",
      dot: "bg-emerald-400 animate-pulse",
    },
    closed: {
      label: "끊김",
      cls: "bg-amber-500/15 text-amber-300",
      dot: "bg-amber-400",
    },
    error: {
      label: "오류",
      cls: "bg-red-500/15 text-red-300",
      dot: "bg-red-400",
    },
  };
  const m = map[status.connectionState];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${m.cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

type LeagueGroup = {
  key: string;
  sport: string;
  leagueDisplay: string;
  leagueLogo: string | null;
  matches: AggregatedMatch[];
};

type MarketPriorityKey = "moneyline" | "handicap" | "totals";

type OddsPickPayload = {
  selectionKey: string;
  marketType: MarketPriorityKey;
  outcome: "home" | "draw" | "away" | "over" | "under";
  line?: number | null;
  odd: number;
  pickLabel: string;
  homeName: string;
  awayName: string;
  leagueName: string | null;
  startTime: string | null;
  bookmakerCount: number;
};

function groupByLeague(matches: AggregatedMatch[]): LeagueGroup[] {
  const map = new Map<string, LeagueGroup>();
  for (const m of matches) {
    const display = m.league.nameKr ?? m.league.name ?? "기타 리그";
    const key = `${m.sport}::${display}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        sport: m.sport,
        leagueDisplay: display,
        leagueLogo: m.league.logoUrl,
        matches: [],
      };
      map.set(key, g);
    }
    g.matches.push(m);
  }
  return [...map.values()].sort((a, b) => {
    const aw = a.sport === "unknown" ? 1 : 0;
    const bw = b.sport === "unknown" ? 1 : 0;
    if (aw !== bw) return aw - bw;
    return a.leagueDisplay.localeCompare(b.leagueDisplay);
  });
}

function LeagueBlock({
  group,
  isLight,
  picked,
  marketPriority,
  showBookmakerCount,
  onPick,
  onOpenTracker,
}: {
  group: LeagueGroup;
  isLight: boolean;
  picked: Set<string>;
  marketPriority: readonly MarketPriorityKey[];
  showBookmakerCount: boolean;
  onPick: (pick: OddsPickPayload) => void;
  onOpenTracker: (m: AggregatedMatch) => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        isLight
          ? "border-zinc-200 bg-white/80"
          : "border-white/10 bg-zinc-950/40"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b px-4 py-2 text-[12px] font-semibold ${
          isLight
            ? "border-zinc-200 bg-zinc-50 text-zinc-700"
            : "border-white/10 bg-zinc-900/70 text-zinc-300"
        }`}
      >
        {group.leagueLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.leagueLogo}
            alt=""
            className="h-4 w-4 shrink-0 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="text-base leading-none">{sportEmoji(group.sport)}</span>
        )}
        <span className="truncate">{group.leagueDisplay}</span>
        <span className="ml-auto text-[10px] font-normal text-zinc-500">
          {group.matches.length}경기
        </span>
      </div>

      <ul className="divide-y divide-white/5">
        {group.matches.map((m) => (
          <MatchRow
            key={m.matchId}
            match={m}
            isLight={isLight}
            picked={picked}
            marketPriority={marketPriority}
            showBookmakerCount={showBookmakerCount}
            onPick={onPick}
            onOpenTracker={onOpenTracker}
          />
        ))}
      </ul>
    </div>
  );
}

function MatchRow({
  match,
  isLight,
  picked,
  marketPriority,
  showBookmakerCount,
  onPick,
  onOpenTracker,
}: {
  match: AggregatedMatch;
  isLight: boolean;
  picked: Set<string>;
  marketPriority: readonly MarketPriorityKey[];
  showBookmakerCount: boolean;
  onPick: (pick: OddsPickPayload) => void;
  onOpenTracker: (m: AggregatedMatch) => void;
}) {
  const isLive = match.status === "live";
  const homeName = match.home.nameKr ?? match.home.name;
  const awayName = match.away.nameKr ?? match.away.name;
  const displayHomeName = homeName ?? "HOME";
  const displayAwayName = awayName ?? "AWAY";
  const hasNames = !!(homeName && awayName);
  const leagueName = match.league.nameKr ?? match.league.name;
  const kickoff = formatKickoff(match.startTime, isLive);
  const updatedSec = Math.max(
    0,
    Math.floor((Date.now() - match.lastUpdatedMs) / 1000),
  );
  const displayMarket = pickDisplayMarket(match, marketPriority);
  // 기본적으로 모든 마켓을 펼쳐서 보여준다 (DNB / 유럽식 HDP / HTFT / Double Chance / BTTS …).
  // 데이터 많은 경우 사용자 요청으로 접을 수 있음.
  const [expanded, setExpanded] = useState(true);

  // 펼쳐볼 게 있는지: 대표 라인 외 추가 라인 or extras
  const extraHandicapCount = Math.max(
    0,
    (match.markets.handicapLines?.length ?? 0) - 1,
  );
  const extraTotalsCount = Math.max(
    0,
    (match.markets.totalsLines?.length ?? 0) - 1,
  );
  const extrasCount = match.markets.extras
    ? Object.keys(match.markets.extras).length
    : 0;
  const hasExtras = extraHandicapCount + extraTotalsCount + extrasCount > 0;
  const extraTotal = extraHandicapCount + extraTotalsCount + extrasCount;

  return (
    <li
      className={`grid grid-cols-1 gap-2 px-3 py-3 transition md:grid-cols-[140px_minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-4 ${
        isLight ? "hover:bg-zinc-50/80" : "hover:bg-white/5"
      }`}
    >
      {/* 시간/상태 */}
      <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-1">
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            LIVE
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
              isLight
                ? "bg-zinc-100 text-zinc-600"
                : "bg-zinc-800/80 text-zinc-400"
            }`}
          >
            {kickoff?.badge ?? "예정"}
          </span>
        )}
        <span
          className={`font-mono text-[11px] ${isLight ? "text-zinc-500" : "text-zinc-500"}`}
        >
          {kickoff?.time ?? "—"}
        </span>
      </div>

      {/* 매치 정보 */}
      <div className="min-w-0">
        {hasNames ? (
          <button
            type="button"
            onClick={() => onOpenTracker(match)}
            className="group flex w-full items-start gap-2 text-left"
            title="라이브 트래커 열기"
          >
            <div className="min-w-0 flex-1">
              <p
                className={`flex min-w-0 items-center gap-2 truncate text-[14px] font-semibold leading-tight group-hover:text-main-gold ${
                  isLight ? "text-zinc-900" : "text-white"
                }`}
              >
                <TeamLogo src={match.home.logoUrl} />
                <span className="truncate">{homeName}</span>
                {match.scores?.home != null ? (
                  <span className="ml-2 font-mono text-main-gold">
                    {match.scores.home}
                  </span>
                ) : null}
              </p>
              <p
                className={`flex min-w-0 items-center gap-2 truncate text-[14px] font-semibold leading-tight group-hover:text-main-gold ${
                  isLight ? "text-zinc-900" : "text-white"
                }`}
              >
                <TeamLogo src={match.away.logoUrl} />
                <span className="truncate">{awayName}</span>
                {match.scores?.away != null ? (
                  <span className="ml-2 font-mono text-main-gold">
                    {match.scores.away}
                  </span>
                ) : null}
              </p>
            </div>
            <span
              className={`mt-0.5 hidden shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition md:inline-flex ${
                isLive
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300 group-hover:border-rose-500/70"
                  : "border-white/15 bg-white/5 text-zinc-400 group-hover:border-main-gold/50 group-hover:text-main-gold"
              }`}
            >
              트래커 ›
            </span>
          </button>
        ) : (
          <p
            className={`text-[13px] font-medium ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
          >
            #{match.matchId} (보강 대기)
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
          {showBookmakerCount ? (
            <>
              <span className="text-zinc-500">북메이커 {match.bookieCount}개</span>
              <span className="text-zinc-600">·</span>
            </>
          ) : null}
          <span className="text-zinc-500">{ago(updatedSec)}</span>
          {hasExtras ? (
            <>
              <span className="text-zinc-600">·</span>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300 transition hover:border-main-gold/50 hover:text-main-gold"
              >
                <span>{expanded ? "▲ 접기" : "▼ 전체 마켓"}</span>
                <span className="opacity-70">+{extraTotal}</span>
              </button>
            </>
          ) : null}
        </p>
      </div>

      {/* 시장: 플랫폼 템플릿 우선순위에 따라 1개 시장만 노출 */}
      <div className="grid grid-cols-3 gap-1.5 md:min-w-[280px]">
        {displayMarket ? (
          renderMarketCells({
            match,
            picked,
            onPick,
            market: displayMarket,
            homeName: displayHomeName,
            awayName: displayAwayName,
            leagueName,
          })
        ) : (
          <div className="col-span-3 rounded-md border border-white/5 px-2 py-2 text-center text-[11px] text-zinc-600">
            마켓 대기 중
          </div>
        )}
      </div>

      {/* 펼침 패널 — 전체 마켓 */}
      {expanded && hasExtras ? (
        <div className="col-span-1 md:col-span-3">
          <ExpandedMarkets
            match={match}
            isLight={isLight}
            picked={picked}
            onPick={onPick}
            homeName={displayHomeName}
            awayName={displayAwayName}
            leagueName={leagueName}
          />
        </div>
      ) : null}
    </li>
  );
}

function TeamLogo({ src }: { src: string | null | undefined }) {
  if (!src) {
    return <span className="inline-block h-4 w-4 shrink-0 rounded-full bg-white/5" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-4 w-4 shrink-0 rounded-full object-contain"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

function PriceCell({
  selectionKey,
  label,
  price,
  picked,
  onPick,
  pick,
  fallback,
}: {
  selectionKey: string;
  label: string;
  price?: number;
  picked: Set<string>;
  onPick: (pick: OddsPickPayload) => void;
  pick: OddsPickPayload;
  fallback?: string;
}) {
  const isPicked = picked.has(selectionKey);
  const hasPrice = typeof price === "number" && price > 1;
  const display = hasPrice ? price!.toFixed(2) : fallback ?? "—";
  return (
    <button
      type="button"
      disabled={!hasPrice}
      onClick={() => hasPrice && onPick(pick)}
      className={`flex flex-col items-center justify-center rounded-md border px-2 py-1.5 transition ${
        !hasPrice
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600"
          : isPicked
            ? "border-main-gold bg-[rgba(218,174,87,0.18)] text-main-gold shadow-[0_0_0_1px_rgba(218,174,87,0.55)]"
            : "border-white/10 bg-zinc-900/60 text-zinc-200 hover:border-main-gold/50 hover:bg-[rgba(218,174,87,0.08)] hover:text-main-gold"
      }`}
      title={hasPrice ? `${label} @ ${display}` : "현재 가격 없음"}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="font-mono text-[14px] font-bold leading-tight">
        {display}
      </span>
    </button>
  );
}

/* ─────────────────────────── 펼침 패널 ─────────────────────────── */

function ExpandedMarkets({
  match,
  isLight,
  picked,
  onPick,
  homeName,
  awayName,
  leagueName,
}: {
  match: AggregatedMatch;
  isLight: boolean;
  picked: Set<string>;
  onPick: (pick: OddsPickPayload) => void;
  homeName: string;
  awayName: string;
  leagueName: string | null;
}) {
  const handicapLines = match.markets.handicapLines ?? [];
  const totalsLines = match.markets.totalsLines ?? [];
  const extras = match.markets.extras ?? {};
  const extraNames = Object.keys(extras);

  const sectionClass = isLight
    ? "rounded-xl border border-zinc-200 bg-zinc-50/60 p-3"
    : "rounded-xl border border-white/10 bg-zinc-950/60 p-3";
  const titleClass = isLight ? "text-zinc-700" : "text-zinc-300";

  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {handicapLines.length > 1 ? (
        <section className={sectionClass}>
          <h4 className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${titleClass}`}>
            핸디캡 전체 ({handicapLines.length}라인)
          </h4>
          <LineTable>
            {handicapLines.map((ln) => (
              <HandicapLineRow
                key={`h:${ln.line}`}
                line={ln}
                match={match}
                picked={picked}
                onPick={onPick}
                homeName={homeName}
                awayName={awayName}
                leagueName={leagueName}
              />
            ))}
          </LineTable>
        </section>
      ) : null}

      {totalsLines.length > 1 ? (
        <section className={sectionClass}>
          <h4 className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${titleClass}`}>
            언/오버 전체 ({totalsLines.length}라인)
          </h4>
          <LineTable>
            {totalsLines.map((ln) => (
              <TotalsLineRow
                key={`t:${ln.line}`}
                line={ln}
                match={match}
                picked={picked}
                onPick={onPick}
                homeName={homeName}
                awayName={awayName}
                leagueName={leagueName}
              />
            ))}
          </LineTable>
        </section>
      ) : null}

      {extraNames.length > 0
        ? extraNames.map((name) => (
            <section key={name} className={sectionClass}>
              <h4
                className={`mb-2 text-[11px] font-bold uppercase tracking-wider ${titleClass}`}
              >
                {prettyMarketName(name)} · {extras[name].lines.reduce((a, l) => a + l.outcomes.length, 0)}개
              </h4>
              <ExtraMarketTable
                market={extras[name]}
                match={match}
                picked={picked}
                onPick={onPick}
                homeName={homeName}
                awayName={awayName}
                leagueName={leagueName}
              />
            </section>
          ))
        : null}
    </div>
  );
}

function LineTable({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-1">{children}</div>;
}

function HandicapLineRow({
  line,
  match,
  picked,
  onPick,
  homeName,
  awayName,
  leagueName,
}: {
  line: AggregatedHandicapLine;
  match: AggregatedMatch;
  picked: Set<string>;
  onPick: (pick: OddsPickPayload) => void;
  homeName: string;
  awayName: string;
  leagueName: string | null;
}) {
  return (
    <div className="grid grid-cols-[60px_1fr_1fr] items-center gap-1.5">
      <span
        className={`font-mono text-[11px] ${
          line.primary ? "text-main-gold" : "text-zinc-500"
        }`}
      >
        {formatLine(line.line, "home")}
      </span>
      <PriceCell
        selectionKey={buildSelectionKey(match.matchId, "handicap", "home", line.line)}
        label="홈"
        price={line.home}
        picked={picked}
        onPick={onPick}
        pick={buildPickPayload({
          match,
          marketType: "handicap",
          outcome: "home",
          odd: line.home,
          line: line.line,
          pickLabel: `${homeName} 핸디캡 ${formatLine(line.line, "home")}`,
          homeName,
          awayName,
          leagueName,
        })}
      />
      <PriceCell
        selectionKey={buildSelectionKey(match.matchId, "handicap", "away", line.line)}
        label="원정"
        price={line.away}
        picked={picked}
        onPick={onPick}
        pick={buildPickPayload({
          match,
          marketType: "handicap",
          outcome: "away",
          odd: line.away,
          line: line.line,
          pickLabel: `${awayName} 핸디캡 ${formatLine(line.line, "away")}`,
          homeName,
          awayName,
          leagueName,
        })}
      />
    </div>
  );
}

function TotalsLineRow({
  line,
  match,
  picked,
  onPick,
  homeName,
  awayName,
  leagueName,
}: {
  line: AggregatedTotalsLine;
  match: AggregatedMatch;
  picked: Set<string>;
  onPick: (pick: OddsPickPayload) => void;
  homeName: string;
  awayName: string;
  leagueName: string | null;
}) {
  return (
    <div className="grid grid-cols-[60px_1fr_1fr] items-center gap-1.5">
      <span
        className={`font-mono text-[11px] ${
          line.primary ? "text-main-gold" : "text-zinc-500"
        }`}
      >
        {line.line}
      </span>
      <PriceCell
        selectionKey={buildSelectionKey(match.matchId, "totals", "over", line.line)}
        label="Over"
        price={line.over}
        picked={picked}
        onPick={onPick}
        pick={buildPickPayload({
          match,
          marketType: "totals",
          outcome: "over",
          odd: line.over,
          line: line.line,
          pickLabel: `오버 ${line.line}`,
          homeName,
          awayName,
          leagueName,
        })}
      />
      <PriceCell
        selectionKey={buildSelectionKey(match.matchId, "totals", "under", line.line)}
        label="Under"
        price={line.under}
        picked={picked}
        onPick={onPick}
        pick={buildPickPayload({
          match,
          marketType: "totals",
          outcome: "under",
          odd: line.under,
          line: line.line,
          pickLabel: `언더 ${line.line}`,
          homeName,
          awayName,
          leagueName,
        })}
      />
    </div>
  );
}

/**
 * 스페셜 마켓(pass-through) 을 라인 × outcome 그리드로 렌더.
 * 선택은 extras 전용 selectionKey 사용 (기존 slip 구조와 충돌 방지).
 */
function ExtraMarketTable({
  market,
  match,
  picked,
  onPick,
  homeName,
  awayName,
  leagueName,
}: {
  market: AggregatedExtraMarket;
  match: AggregatedMatch;
  picked: Set<string>;
  onPick: (pick: OddsPickPayload) => void;
  homeName: string;
  awayName: string;
  leagueName: string | null;
}) {
  return (
    <div className="grid gap-1">
      {market.lines.map((line, i) => {
        const cols = Math.min(Math.max(line.outcomes.length, 2), 4);
        return (
          <div
            key={`${market.name}:${i}`}
            className="grid items-center gap-1.5"
            style={{
              gridTemplateColumns:
                line.hdp != null || line.label
                  ? `60px repeat(${cols}, 1fr)`
                  : `repeat(${cols}, 1fr)`,
            }}
          >
            {line.hdp != null || line.label ? (
              <span className="font-mono text-[11px] text-zinc-500">
                {line.hdp != null ? formatSignedLine(line.hdp) : line.label ?? ""}
              </span>
            ) : null}
            {line.outcomes.map((oc) => {
              const outcomeKey = oc.label ?? oc.key;
              const selectionKey = `${match.matchId}:extra:${market.name}:${oc.label ?? oc.key}:${line.hdp ?? ""}`;
              return (
                <ExtraPriceCell
                  key={selectionKey}
                  selectionKey={selectionKey}
                  label={prettyOutcomeKey(oc.label ?? oc.key, market.name, homeName, awayName)}
                  price={oc.price}
                  picked={picked}
                  onPick={() =>
                    onPick({
                      selectionKey,
                      // slip 에서는 일단 moneyline 계열로 처리하되, 실제 pickLabel 에 마켓/라인 정보 포함
                      marketType: "moneyline",
                      outcome: "home",
                      odd: oc.price,
                      pickLabel: `[${prettyMarketName(market.name)}${line.hdp != null ? ` ${formatSignedLine(line.hdp)}` : ""}] ${prettyOutcomeKey(outcomeKey, market.name, homeName, awayName)}`,
                      homeName,
                      awayName,
                      leagueName,
                      startTime: match.startTime,
                      bookmakerCount: match.bookieCount,
                    })
                  }
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ExtraPriceCell({
  selectionKey,
  label,
  price,
  picked,
  onPick,
}: {
  selectionKey: string;
  label: string;
  price: number;
  picked: Set<string>;
  onPick: () => void;
}) {
  const isPicked = picked.has(selectionKey);
  const hasPrice = price > 1;
  return (
    <button
      type="button"
      disabled={!hasPrice}
      onClick={onPick}
      className={`flex min-w-0 flex-col items-center justify-center rounded-md border px-1.5 py-1 transition ${
        !hasPrice
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600"
          : isPicked
            ? "border-main-gold bg-[rgba(218,174,87,0.18)] text-main-gold shadow-[0_0_0_1px_rgba(218,174,87,0.55)]"
            : "border-white/10 bg-zinc-900/60 text-zinc-200 hover:border-main-gold/50 hover:bg-[rgba(218,174,87,0.08)] hover:text-main-gold"
      }`}
      title={`${label} @ ${price.toFixed(2)}`}
    >
      <span className="truncate text-[10px] font-semibold uppercase tracking-wider opacity-80">
        {label}
      </span>
      <span className="font-mono text-[13px] font-bold leading-tight">
        {price.toFixed(2)}
      </span>
    </button>
  );
}

function formatSignedLine(v: number): string {
  if (v === 0) return "0";
  return v > 0 ? `+${v}` : `${v}`;
}

function prettyMarketName(name: string): string {
  const m: Record<string, string> = {
    "Draw No Bet": "무승부 제외",
    "Double Chance": "더블찬스",
    "Both Teams To Score": "양팀 득점",
    "European Handicap": "유러피언 핸디캡",
    "Half Time / Full Time": "전반/전체",
    "1st Half ML": "전반 승부",
    "Team Totals": "팀 토탈",
    "Correct Score": "정확한 스코어",
    "Odd/Even": "홀짝",
  };
  return m[name] ?? name;
}

function prettyOutcomeKey(
  key: string,
  marketName: string,
  homeName: string,
  awayName: string,
): string {
  const k = key.toLowerCase();
  // 공통
  if (k === "home") return homeName;
  if (k === "away") return awayName;
  if (k === "draw") return "무승부";
  if (k === "yes") return "Yes";
  if (k === "no") return "No";
  // Double Chance
  if (key === "1X") return `${homeName}/무`;
  if (key === "X2") return `무/${awayName}`;
  if (key === "12") return `${homeName}/${awayName}`;
  // HTFT label: "1/1" "1/X" "X/2" …
  if (/^[1X2]\/[1X2]$/.test(key)) {
    const [ht, ft] = key.split("/");
    const map: Record<string, string> = { "1": "홈", X: "무", "2": "원" };
    return `${map[ht]}→${map[ft]}`;
  }
  return key;
}

/* ─────────────────────────── helpers ─────────────────────────── */

function pickDisplayMarket(
  match: AggregatedMatch,
  marketPriority: readonly MarketPriorityKey[],
):
  | {
      type: "moneyline";
      market: AggregatedMoneyline;
    }
  | {
      type: "handicap";
      market: AggregatedHandicap;
    }
  | {
      type: "totals";
      market: AggregatedTotals;
    }
  | null {
  for (const key of marketPriority) {
    if (key === "moneyline" && match.markets.moneyline) {
      return { type: "moneyline", market: match.markets.moneyline };
    }
    if (key === "handicap" && match.markets.handicap) {
      return { type: "handicap", market: match.markets.handicap };
    }
    if (key === "totals" && match.markets.totals) {
      return { type: "totals", market: match.markets.totals };
    }
  }
  return null;
}

function renderMarketCells({
  match,
  picked,
  onPick,
  market,
  homeName,
  awayName,
  leagueName,
}: {
  match: AggregatedMatch;
  picked: Set<string>;
  onPick: (pick: OddsPickPayload) => void;
  market:
    | { type: "moneyline"; market: AggregatedMoneyline }
    | { type: "handicap"; market: AggregatedHandicap }
    | { type: "totals"; market: AggregatedTotals };
  homeName: string;
  awayName: string;
  leagueName: string | null;
}) {
  if (market.type === "moneyline") {
    return (
      <>
        <PriceCell
          selectionKey={buildSelectionKey(match.matchId, "moneyline", "home")}
          label="1"
          price={market.market.home}
          picked={picked}
          onPick={onPick}
          pick={buildPickPayload({
            match,
            marketType: "moneyline",
            outcome: "home",
            odd: market.market.home,
            pickLabel: `${homeName} 승`,
            homeName,
            awayName,
            leagueName,
          })}
        />
        <PriceCell
          selectionKey={buildSelectionKey(match.matchId, "moneyline", "draw")}
          label="X"
          price={market.market.draw}
          picked={picked}
          onPick={onPick}
          pick={buildPickPayload({
            match,
            marketType: "moneyline",
            outcome: "draw",
            odd: market.market.draw ?? 0,
            pickLabel: "무승부",
            homeName,
            awayName,
            leagueName,
          })}
          fallback="—"
        />
        <PriceCell
          selectionKey={buildSelectionKey(match.matchId, "moneyline", "away")}
          label="2"
          price={market.market.away}
          picked={picked}
          onPick={onPick}
          pick={buildPickPayload({
            match,
            marketType: "moneyline",
            outcome: "away",
            odd: market.market.away,
            pickLabel: `${awayName} 승`,
            homeName,
            awayName,
            leagueName,
          })}
        />
      </>
    );
  }

  if (market.type === "handicap") {
    return (
      <>
        <PriceCell
          selectionKey={buildSelectionKey(
            match.matchId,
            "handicap",
            "home",
            market.market.line,
          )}
          label={`H ${formatLine(market.market.line, "home")}`}
          price={market.market.home}
          picked={picked}
          onPick={onPick}
          pick={buildPickPayload({
            match,
            marketType: "handicap",
            outcome: "home",
            odd: market.market.home,
            line: market.market.line,
            pickLabel: `${homeName} 핸디캡 ${formatLine(market.market.line, "home")}`,
            homeName,
            awayName,
            leagueName,
          })}
        />
        <div />
        <PriceCell
          selectionKey={buildSelectionKey(
            match.matchId,
            "handicap",
            "away",
            market.market.line,
          )}
          label={`A ${formatLine(market.market.line, "away")}`}
          price={market.market.away}
          picked={picked}
          onPick={onPick}
          pick={buildPickPayload({
            match,
            marketType: "handicap",
            outcome: "away",
            odd: market.market.away,
            line: market.market.line,
            pickLabel: `${awayName} 핸디캡 ${formatLine(market.market.line, "away")}`,
            homeName,
            awayName,
            leagueName,
          })}
        />
      </>
    );
  }

  return (
    <>
      <PriceCell
        selectionKey={buildSelectionKey(
          match.matchId,
          "totals",
          "over",
          market.market.line,
        )}
        label={`O ${market.market.line}`}
        price={market.market.over}
        picked={picked}
        onPick={onPick}
        pick={buildPickPayload({
          match,
          marketType: "totals",
          outcome: "over",
          odd: market.market.over,
          line: market.market.line,
          pickLabel: `오버 ${market.market.line}`,
          homeName,
          awayName,
          leagueName,
        })}
      />
      <div />
      <PriceCell
        selectionKey={buildSelectionKey(
          match.matchId,
          "totals",
          "under",
          market.market.line,
        )}
        label={`U ${market.market.line}`}
        price={market.market.under}
        picked={picked}
        onPick={onPick}
        pick={buildPickPayload({
          match,
          marketType: "totals",
          outcome: "under",
          odd: market.market.under,
          line: market.market.line,
          pickLabel: `언더 ${market.market.line}`,
          homeName,
          awayName,
          leagueName,
        })}
      />
    </>
  );
}

function buildSelectionKey(
  matchId: string,
  marketType: MarketPriorityKey,
  outcome: OddsPickPayload["outcome"],
  line?: number,
) {
  return line == null
    ? `${matchId}:${marketType}:${outcome}`
    : `${matchId}:${marketType}:${outcome}:${line}`;
}

function buildPickPayload({
  match,
  marketType,
  outcome,
  odd,
  pickLabel,
  homeName,
  awayName,
  leagueName,
  line,
}: {
  match: AggregatedMatch;
  marketType: MarketPriorityKey;
  outcome: OddsPickPayload["outcome"];
  odd: number;
  pickLabel: string;
  homeName: string;
  awayName: string;
  leagueName: string | null;
  line?: number;
}): OddsPickPayload {
  return {
    selectionKey: buildSelectionKey(match.matchId, marketType, outcome, line),
    marketType,
    outcome,
    line,
    odd,
    pickLabel,
    homeName,
    awayName,
    leagueName,
    startTime: match.startTime,
    bookmakerCount: match.bookieCount,
  };
}

function formatLine(line: number, side: "home" | "away"): string {
  // 핸디캡 라인은 home 기준. away 는 부호 반전.
  const v = side === "home" ? line : -line;
  if (v === 0) return "0";
  return v > 0 ? `+${v}` : `${v}`;
}

function ago(seconds: number): string {
  if (seconds < 5) return "방금";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

function formatKickoff(
  iso: string | null,
  isLive: boolean,
): { badge?: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  const delta = d.getTime() - now;
  const absMin = Math.abs(delta) / 60_000;

  let badge: string | undefined;
  if (!isLive) {
    if (delta < 0) badge = "종료?";
    else if (absMin < 60) badge = `${Math.round(absMin)}분`;
    else if (absMin < 24 * 60)
      badge = d.toLocaleString("ko-KR", { weekday: "short" });
    else badge = d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit" });
  }

  const time = d.toLocaleString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { badge, time };
}

function sportEmoji(sport: string): string {
  switch (sport) {
    case "football":
    case "soccer":
      return "⚽";
    case "basketball":
      return "🏀";
    case "tennis":
      return "🎾";
    case "baseball":
      return "⚾";
    case "ice-hockey":
      return "🏒";
    case "esports":
      return "🎮";
    case "volleyball":
      return "🏐";
    case "handball":
      return "🤾";
    case "table-tennis":
      return "🏓";
    case "boxing":
    case "mma":
      return "🥊";
    case "rugby-union":
      return "🏉";
    case "american-football":
      return "🏈";
    default:
      return "🏟️";
  }
}

function prettySport(sport: string): string {
  switch (sport) {
    case "football":
      return "축구";
    case "basketball":
      return "농구";
    case "tennis":
      return "테니스";
    case "baseball":
      return "야구";
    case "ice-hockey":
      return "아이스하키";
    case "esports":
      return "이스포츠";
    case "volleyball":
      return "배구";
    case "handball":
      return "핸드볼";
    case "table-tennis":
      return "탁구";
    case "american-football":
      return "미식축구";
    case "rugby-union":
      return "럭비";
    case "boxing":
      return "복싱";
    case "mma":
      return "MMA";
    case "unknown":
      return "기타";
    default:
      return sport;
  }
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOddsApiMatches,
  fetchOddsApiWsStatus,
  type AggregatedMatch,
  type AggregatedMatchStatus,
  type OddsApiWsEvent,
  type OddsApiWsStatus,
} from "@/lib/api";
import { useBootstrap } from "./BootstrapProvider";
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
  const [matches, setMatches] = useState<AggregatedMatch[]>([]);
  const [status, setStatus] = useState<OddsApiWsStatus | null>(null);
  const [activeSport, setActiveSport] = useState<string>("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const live = useLiveMatchPanelState();

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        fetchOddsApiWsStatus(),
        fetchOddsApiMatches({
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
  }, [mode, activeSport]);

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

  const togglePick = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
          API 서버에 odds-api.io 키가 설정되지 않았습니다.
        </EmptyBox>
      ) : status.filters.sports.length === 0 ? (
        <EmptyBox isLight={isLight}>
          슈퍼어드민 콘솔에서 구독 종목을 1~2개 선택해 주세요.
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
  onPick,
  onOpenTracker,
}: {
  group: LeagueGroup;
  isLight: boolean;
  picked: Set<string>;
  onPick: (id: string) => void;
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
  onPick,
  onOpenTracker,
}: {
  match: AggregatedMatch;
  isLight: boolean;
  picked: Set<string>;
  onPick: (id: string) => void;
  onOpenTracker: (m: AggregatedMatch) => void;
}) {
  const isLive = match.status === "live";
  const ml = match.markets.moneyline;
  const totals = match.markets.totals;
  const hdp = match.markets.handicap;
  const homeName = match.home.nameKr ?? match.home.name;
  const awayName = match.away.nameKr ?? match.away.name;
  const hasNames = !!(homeName && awayName);
  const kickoff = formatKickoff(match.startTime, isLive);
  const updatedSec = Math.max(
    0,
    Math.floor((Date.now() - match.lastUpdatedMs) / 1000),
  );

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
                className={`truncate text-[14px] font-semibold leading-tight group-hover:text-main-gold ${
                  isLight ? "text-zinc-900" : "text-white"
                }`}
              >
                {homeName}
                {match.scores?.home != null ? (
                  <span className="ml-2 font-mono text-main-gold">
                    {match.scores.home}
                  </span>
                ) : null}
              </p>
              <p
                className={`truncate text-[14px] font-semibold leading-tight group-hover:text-main-gold ${
                  isLight ? "text-zinc-900" : "text-white"
                }`}
              >
                {awayName}
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
          <span className="text-zinc-500">북메이커 {match.bookieCount}개</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">{ago(updatedSec)}</span>
        </p>
      </div>

      {/* 시장: ML 우선, 없으면 핸디캡, 없으면 토탈 */}
      <div className="grid grid-cols-3 gap-1.5 md:min-w-[280px]">
        {ml ? (
          <>
            <PriceCell
              id={`${match.matchId}:ML:1`}
              label="1"
              price={ml.home}
              picked={picked}
              onPick={onPick}
            />
            <PriceCell
              id={`${match.matchId}:ML:X`}
              label="X"
              price={ml.draw}
              picked={picked}
              onPick={onPick}
              fallback="—"
            />
            <PriceCell
              id={`${match.matchId}:ML:2`}
              label="2"
              price={ml.away}
              picked={picked}
              onPick={onPick}
            />
          </>
        ) : hdp ? (
          <>
            <PriceCell
              id={`${match.matchId}:HDP:1`}
              label={`H ${formatLine(hdp.line, "home")}`}
              price={hdp.home}
              picked={picked}
              onPick={onPick}
            />
            <div />
            <PriceCell
              id={`${match.matchId}:HDP:2`}
              label={`A ${formatLine(hdp.line, "away")}`}
              price={hdp.away}
              picked={picked}
              onPick={onPick}
            />
          </>
        ) : totals ? (
          <>
            <PriceCell
              id={`${match.matchId}:OU:O`}
              label={`O ${totals.line}`}
              price={totals.over}
              picked={picked}
              onPick={onPick}
            />
            <div />
            <PriceCell
              id={`${match.matchId}:OU:U`}
              label={`U ${totals.line}`}
              price={totals.under}
              picked={picked}
              onPick={onPick}
            />
          </>
        ) : (
          <div className="col-span-3 rounded-md border border-white/5 px-2 py-2 text-center text-[11px] text-zinc-600">
            마켓 대기 중
          </div>
        )}
      </div>
    </li>
  );
}

function PriceCell({
  id,
  label,
  price,
  picked,
  onPick,
  fallback,
}: {
  id: string;
  label: string;
  price?: number;
  picked: Set<string>;
  onPick: (id: string) => void;
  fallback?: string;
}) {
  const isPicked = picked.has(id);
  const hasPrice = typeof price === "number" && price > 1;
  const display = hasPrice ? price!.toFixed(2) : fallback ?? "—";
  return (
    <button
      type="button"
      disabled={!hasPrice}
      onClick={() => hasPrice && onPick(id)}
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

/* ─────────────────────────── helpers ─────────────────────────── */

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

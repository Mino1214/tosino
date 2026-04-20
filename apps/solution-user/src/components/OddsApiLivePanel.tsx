"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOddsApiWsEvents,
  fetchOddsApiWsStatus,
  type OddsApiWsEvent,
  type OddsApiWsStatus,
} from "@/lib/api";
import { useBootstrap } from "./BootstrapProvider";
import { LiveMatchPanel, useLiveMatchPanelState } from "./LiveMatchPanel";

const POLL_MS = 4000;

/**
 * 슈퍼어드민 콘솔(odds-api.io WebSocket) 가 만들어 둔 in-memory 스트림을 솔루션 회원 페이지에 그대로 노출.
 *
 * 표기 정책 (실제 스포츠북에 가깝게):
 *  - 같은 eventId 의 다(多) 북메이커 행은 합쳐서 한 매치당 한 줄.
 *  - 각 시장(ML / Spread / Totals) 은 가장 좋은(높은 배당) 가격을 채택, 어디 북메이커인지 작게 표기.
 *  - 라이브/예정 상태에 따라 시각 다르게 표시(LIVE 펄스 + 시간/킥오프 카운트다운).
 *  - 가격 셀은 클릭 가능한 "선택" 버튼처럼 보이게 (현재는 시각만, 베팅 슬립은 추후).
 */
export function OddsApiLivePanel() {
  const b = useBootstrap();
  const [status, setStatus] = useState<OddsApiWsStatus | null>(null);
  const [events, setEvents] = useState<OddsApiWsEvent[]>([]);
  const [activeSport, setActiveSport] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const live = useLiveMatchPanelState();

  const load = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([
        fetchOddsApiWsStatus(),
        fetchOddsApiWsEvents({
          sport: activeSport || undefined,
          limit: 200, // 그룹핑 후 매치 수가 줄어드므로 넉넉히
        }),
      ]);
      setStatus(s);
      setEvents(e.events);
      setErr(null);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [activeSport]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (status && status.filters.sports.length > 0 && !activeSport) {
      setActiveSport(status.filters.sports[0]);
    }
  }, [status, activeSport]);

  const isLight = (b?.theme.ui?.background ?? "dark") === "light";

  /** eventId 단위 그룹핑 + 리그별 묶음 */
  const matchesByLeague = useMemo(() => {
    const matches = groupEventsToMatches(events);
    return groupByLeague(matches);
  }, [events]);

  const sportCounts = useMemo(() => {
    const m = new Map<string, number>();
    const seen = new Set<string>();
    for (const ev of events) {
      const k = `${ev.sport}:${ev.eventId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      m.set(ev.sport, (m.get(ev.sport) ?? 0) + 1);
    }
    return m;
  }, [events]);

  const togglePick = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (!b) return null;

  const totalMatches = matchesByLeague.reduce(
    (acc, g) => acc + g.matches.length,
    0,
  );

  return (
    <section className="mt-10" id="odds-api-live">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            className={`text-lg font-semibold md:text-xl ${
              isLight ? "text-zinc-900" : "text-white"
            }`}
          >
            라이브 배당
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
          <ConnectionBadge status={status} loading={loading} />
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
          {/* Sport tabs */}
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
              {status.connectionState === "open"
                ? "현재 활성 매치가 없습니다. 잠시 후 다시 표시됩니다."
                : "연결 중입니다…"}
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
                  onOpenLive={live.openWith}
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

/* ─────────────────────────── presentation pieces ─────────────────────────── */

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
}: {
  status: OddsApiWsStatus | null;
  loading: boolean;
}) {
  if (loading && !status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-400">
        조회 중…
      </span>
    );
  }
  if (!status) return null;
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

function LeagueBlock({
  group,
  isLight,
  picked,
  onPick,
  onOpenLive,
}: {
  group: LeagueGroup;
  isLight: boolean;
  picked: Set<string>;
  onPick: (id: string) => void;
  onOpenLive: (ev: OddsApiWsEvent) => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        isLight
          ? "border-zinc-200 bg-white/80"
          : "border-white/10 bg-zinc-950/40"
      }`}
    >
      {/* League header */}
      <div
        className={`flex items-center gap-2 border-b px-4 py-2 text-[12px] font-semibold ${
          isLight
            ? "border-zinc-200 bg-zinc-50 text-zinc-700"
            : "border-white/10 bg-zinc-900/70 text-zinc-300"
        }`}
      >
        <span className="text-base leading-none">{sportEmoji(group.sport)}</span>
        <span className="truncate">{group.league || "기타 리그"}</span>
        <span className="ml-auto text-[10px] font-normal text-zinc-500">
          {group.matches.length}경기
        </span>
      </div>

      {/* Match rows — 데스크톱은 그리드 1줄, 모바일은 스택 */}
      <ul className="divide-y divide-white/5">
        {group.matches.map((m) => (
          <MatchRow
            key={m.eventId}
            match={m}
            isLight={isLight}
            picked={picked}
            onPick={onPick}
            onOpenLive={onOpenLive}
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
  onOpenLive,
}: {
  match: Match;
  isLight: boolean;
  picked: Set<string>;
  onPick: (id: string) => void;
  onOpenLive: (ev: OddsApiWsEvent) => void;
}) {
  const isLive = match.eventStatus === "live";
  const ml = match.bestML;
  const totals = match.bestTotals;
  const spread = match.bestSpread;
  const hasMatchInfo = !!(match.home && match.away);
  const headerLabel = hasMatchInfo
    ? null
    : `#${match.eventId} (보강 대기)`;
  const kickoff = formatKickoff(match.date, isLive);
  const updatedSec = Math.max(
    0,
    Math.floor((Date.now() - match.lastUpdatedMs) / 1000),
  );

  return (
    <li
      className={`grid grid-cols-1 gap-2 px-3 py-3 transition md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-4 ${
        isLight ? "hover:bg-zinc-50/80" : "hover:bg-white/5"
      }`}
    >
      {/* Time / status column */}
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

      {/* Match info column */}
      <div className="min-w-0">
        {hasMatchInfo ? (
          <button
            type="button"
            onClick={() => match.repEvent && onOpenLive(match.repEvent)}
            className={`group flex w-full items-start gap-2 text-left ${
              match.repEvent ? "cursor-pointer" : "cursor-default"
            }`}
            title={match.repEvent ? "라이브 트래커 열기" : undefined}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[14px] font-semibold leading-tight ${
                  isLight ? "text-zinc-900" : "text-white"
                } ${
                  match.repEvent
                    ? "group-hover:text-main-gold"
                    : ""
                }`}
              >
                {match.home}
                {match.scores?.home != null ? (
                  <span className="ml-2 font-mono text-main-gold">
                    {match.scores.home}
                  </span>
                ) : null}
              </p>
              <p
                className={`truncate text-[14px] font-semibold leading-tight ${
                  isLight ? "text-zinc-900" : "text-white"
                } ${
                  match.repEvent
                    ? "group-hover:text-main-gold"
                    : ""
                }`}
              >
                {match.away}
                {match.scores?.away != null ? (
                  <span className="ml-2 font-mono text-main-gold">
                    {match.scores.away}
                  </span>
                ) : null}
              </p>
            </div>
            {match.repEvent ? (
              <span
                className={`mt-0.5 hidden shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition md:inline-flex ${
                  isLive
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300 group-hover:border-rose-500/70"
                    : "border-white/15 bg-white/5 text-zinc-400 group-hover:border-main-gold/50 group-hover:text-main-gold"
                }`}
              >
                트래커 ›
              </span>
            ) : null}
          </button>
        ) : (
          <p
            className={`text-[13px] font-medium ${isLight ? "text-zinc-500" : "text-zinc-400"}`}
          >
            {headerLabel}
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-zinc-500">
          {match.bookies.map((bk) => (
            <span
              key={bk.bookie}
              className={`rounded px-1.5 py-px font-mono ${
                isLight
                  ? "bg-zinc-100 text-zinc-500"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              {bk.bookie}
            </span>
          ))}
          <span className="ml-1 text-zinc-600">·</span>
          <span className="text-zinc-500">{ago(updatedSec)}</span>
          {match.url ? (
            <a
              href={match.url}
              target="_blank"
              rel="noreferrer"
              className="ml-1 rounded border border-white/10 px-1 text-zinc-500 hover:text-zinc-300"
              title="외부 vendor 페이지"
            >
              ↗
            </a>
          ) : null}
        </p>
      </div>

      {/* Odds column */}
      <div className="grid grid-cols-3 gap-1.5 md:min-w-[260px]">
        {ml?.home || ml?.draw || ml?.away ? (
          <>
            <PriceCell
              id={`${match.eventId}:ML:1`}
              label="1"
              quote={ml?.home}
              picked={picked}
              onPick={onPick}
            />
            <PriceCell
              id={`${match.eventId}:ML:X`}
              label="X"
              quote={ml?.draw}
              picked={picked}
              onPick={onPick}
              fallback="—"
            />
            <PriceCell
              id={`${match.eventId}:ML:2`}
              label="2"
              quote={ml?.away}
              picked={picked}
              onPick={onPick}
            />
          </>
        ) : totals?.over || totals?.under ? (
          <>
            <PriceCell
              id={`${match.eventId}:OU:O`}
              label={`O ${totals.line ?? ""}`}
              quote={totals.over}
              picked={picked}
              onPick={onPick}
            />
            <div /> {/* spacer */}
            <PriceCell
              id={`${match.eventId}:OU:U`}
              label={`U ${totals.line ?? ""}`}
              quote={totals.under}
              picked={picked}
              onPick={onPick}
            />
          </>
        ) : spread?.home || spread?.away ? (
          <>
            <PriceCell
              id={`${match.eventId}:SPR:1`}
              label={`+${formatHdp(spread.hdp)}`}
              quote={spread.home}
              picked={picked}
              onPick={onPick}
            />
            <div /> {/* spacer */}
            <PriceCell
              id={`${match.eventId}:SPR:2`}
              label={`-${formatHdp(spread.hdp)}`}
              quote={spread.away}
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
  quote,
  picked,
  onPick,
  fallback,
}: {
  id: string;
  label: string;
  quote?: PriceQuote;
  picked: Set<string>;
  onPick: (id: string) => void;
  fallback?: string;
}) {
  const isPicked = picked.has(id);
  const hasPrice = !!(quote && quote.value);

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
      title={
        hasPrice
          ? `${label} @ ${quote!.value} (${quote!.bookie})`
          : "현재 가격 없음"
      }
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="font-mono text-[14px] font-bold leading-tight">
        {hasPrice ? quote!.value : (fallback ?? "—")}
      </span>
    </button>
  );
}

/* ─────────────────────────── grouping & best-odds logic ─────────────────────────── */

type PriceQuote = { value: string; bookie: string };

type Match = {
  eventId: string;
  sport: string;
  home: string | null;
  away: string | null;
  league: string | null;
  date: string | null;
  eventStatus: string | null;
  url?: string;
  scores?: OddsApiWsEvent["scores"];
  bookies: Array<{
    bookie: string;
    seq: number;
    updatedAt: string;
  }>;
  lastUpdatedMs: number;
  /** 라이브 트래커 패널에 넘길 대표 이벤트 (가장 보강이 잘 된 것) */
  repEvent?: OddsApiWsEvent;
  /** 가격 셀에 직접 사용 — 가장 좋은 (높은 배당) 가격 + 출처 북메이커 */
  bestML?: { home?: PriceQuote; draw?: PriceQuote; away?: PriceQuote };
  bestSpread?: { home?: PriceQuote; away?: PriceQuote; hdp?: number };
  bestTotals?: { over?: PriceQuote; under?: PriceQuote; line?: number };
};

type LeagueGroup = {
  key: string;
  sport: string;
  league: string | null;
  matches: Match[];
};

function groupEventsToMatches(events: OddsApiWsEvent[]): Match[] {
  const map = new Map<string, Match>();

  for (const ev of events) {
    let m = map.get(ev.eventId);
    if (!m) {
      m = {
        eventId: ev.eventId,
        sport: ev.sport,
        home: ev.home ?? null,
        away: ev.away ?? null,
        league: ev.league ?? null,
        date: ev.date ?? null,
        eventStatus: ev.eventStatus ?? null,
        url: ev.url,
        scores: ev.scores ?? null,
        bookies: [],
        lastUpdatedMs: 0,
        repEvent: ev,
      };
      map.set(ev.eventId, m);
    } else {
      // 더 풍부한 정보가 늦게 도착할 수도 있어서 빈 값만 채움
      m.home = m.home ?? ev.home ?? null;
      m.away = m.away ?? ev.away ?? null;
      m.league = m.league ?? ev.league ?? null;
      m.date = m.date ?? ev.date ?? null;
      m.eventStatus = m.eventStatus ?? ev.eventStatus ?? null;
      if (!m.url && ev.url) m.url = ev.url;
      if (m.sport === "unknown" && ev.sport !== "unknown") m.sport = ev.sport;
      if (!m.scores && ev.scores) m.scores = ev.scores;
      // 더 보강된(home/away 둘 다 있는) 이벤트가 들어오면 대표로 교체
      if (
        ev.home &&
        ev.away &&
        (!m.repEvent?.home || !m.repEvent?.away)
      ) {
        m.repEvent = ev;
      }
      // repEvent 가 있으면 가장 최근 scores 를 합쳐서 트래커 패널이 최신 상태를 받게
      if (m.repEvent && m.scores) {
        m.repEvent = { ...m.repEvent, scores: m.scores };
      }
    }

    m.bookies.push({
      bookie: ev.bookie,
      seq: ev.seq,
      updatedAt: ev.updatedAt,
    });
    const t = new Date(ev.updatedAt).getTime();
    if (Number.isFinite(t) && t > m.lastUpdatedMs) m.lastUpdatedMs = t;

    accumulateBest(m, ev);
  }

  // 북메이커 행은 한 매치 안에서 중복 제거
  for (const m of map.values()) {
    const seen = new Set<string>();
    m.bookies = m.bookies.filter((b) => {
      if (seen.has(b.bookie)) return false;
      seen.add(b.bookie);
      return true;
    });
  }

  // 최근 업데이트 순
  return [...map.values()].sort(
    (a, b) => b.lastUpdatedMs - a.lastUpdatedMs,
  );
}

function accumulateBest(m: Match, ev: OddsApiWsEvent) {
  if (!Array.isArray(ev.markets)) return;
  for (const market of ev.markets) {
    if (!market || typeof market !== "object") continue;
    const name = String((market as { name?: unknown }).name ?? "").toLowerCase();
    const odds = (market as { odds?: unknown }).odds;
    if (!Array.isArray(odds) || odds.length === 0) continue;
    const first = odds[0] as Record<string, unknown>;
    if (name === "ml") {
      m.bestML = m.bestML ?? {};
      mergeBest(m.bestML, "home", first.home, ev.bookie);
      mergeBest(m.bestML, "draw", first.draw, ev.bookie);
      mergeBest(m.bestML, "away", first.away, ev.bookie);
    } else if (name === "spread" || name.includes("handicap")) {
      const hdp = typeof first.hdp === "number" ? first.hdp : undefined;
      m.bestSpread = m.bestSpread ?? {};
      mergeBest(m.bestSpread, "home", first.home, ev.bookie);
      mergeBest(m.bestSpread, "away", first.away, ev.bookie);
      if (hdp !== undefined && m.bestSpread.hdp === undefined)
        m.bestSpread.hdp = hdp;
    } else if (name === "totals" || name.includes("total")) {
      const line =
        typeof first.hdp === "number"
          ? first.hdp
          : typeof first.max === "number"
            ? first.max
            : undefined;
      m.bestTotals = m.bestTotals ?? {};
      mergeBest(m.bestTotals, "over", first.over, ev.bookie);
      mergeBest(m.bestTotals, "under", first.under, ev.bookie);
      if (line !== undefined && m.bestTotals.line === undefined)
        m.bestTotals.line = line;
    }
  }
}

function mergeBest(
  bag: Record<string, PriceQuote | number | undefined>,
  key: string,
  value: unknown,
  bookie: string,
) {
  if (typeof value !== "string" || !value) return;
  const cur = bag[key] as PriceQuote | undefined;
  const v = parseFloat(value);
  if (!Number.isFinite(v)) return;
  if (!cur || parseFloat(cur.value) < v) {
    bag[key] = { value, bookie };
  }
}

function groupByLeague(matches: Match[]): LeagueGroup[] {
  const map = new Map<string, LeagueGroup>();
  for (const m of matches) {
    const key = `${m.sport}::${m.league ?? ""}`;
    let g = map.get(key);
    if (!g) {
      g = { key, sport: m.sport, league: m.league, matches: [] };
      map.set(key, g);
    }
    g.matches.push(m);
  }
  // unknown sport / no league 그룹은 뒤로
  return [...map.values()].sort((a, b) => {
    const aw = a.sport === "unknown" ? 1 : 0;
    const bw = b.sport === "unknown" ? 1 : 0;
    if (aw !== bw) return aw - bw;
    return (a.league ?? "zzz").localeCompare(b.league ?? "zzz");
  });
}

/* ─────────────────────────── tiny helpers ─────────────────────────── */

function ago(seconds: number): string {
  if (seconds < 5) return "방금";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

function formatHdp(hdp?: number): string {
  if (typeof hdp !== "number") return "?";
  return Math.abs(hdp).toString();
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

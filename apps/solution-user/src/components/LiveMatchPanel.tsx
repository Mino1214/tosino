"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OddsApiWsEvent } from "@/lib/api";

/**
 * Vendor-agnostic 라이브 매치 디테일 패널 (Bet365 의 어택 트래커 컨셉).
 *
 * 이 컴포넌트는 "어디서" 데이터가 오는지 모릅니다 — `LiveMatchData` 인터페이스만 받습니다.
 * 현재는 odds-api.io 의 home/away/score/period 만 진짜이고, attack/possession/shots/events 는
 * 데모용 mock(DEMO 배지) 입니다. 추후 Sportradar LMT / API-Sports / 자체 피드를 붙일 때
 * `LiveMatchData` 만 채워주면 그대로 동작하도록 격리.
 */
export type LiveMatchData = {
  eventId: string;
  sport: string;
  home: { name: string | null; score: number | null };
  away: { name: string | null; score: number | null };
  league: string | null;
  startsAt: string | null;
  status: "live" | "prematch" | "ended" | "unknown";
  /** 진행 정보 (있을 때) */
  clock?: {
    minute: number | null; // 1~120 (overtime 포함)
    period: string | null; // "1H" / "2H" / "HT" / "FT" / "OT" 등
  } | null;
  /** 피리어드별 점수 (odds-api `scores.periods` 그대로 매핑) */
  periodScores?: Record<string, { home: number; away: number }> | null;
  /** [DEMO] 인-매치 통계 — 실제 벤더 붙을 때까지는 placeholder */
  stats?: LiveMatchStats | null;
  /** [DEMO] 최근 이벤트 타임라인 */
  events?: LiveMatchEvent[];
  /** 외부 vendor 페이지 (있으면 새 탭) */
  externalUrl?: string;
};

export type LiveMatchStats = {
  possession: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  shotsOffTarget: { home: number; away: number };
  corners: { home: number; away: number };
  yellow: { home: number; away: number };
  red: { home: number; away: number };
  /** -1 ~ +1. 음수는 home, 양수는 away 어택 모멘텀 */
  attackMomentum: number;
  /** 0~1. 위험 어택 강도 (0=조용, 1=박스 안 슈팅 직전) */
  dangerLevel: number;
  /** 'home'|'away'|null — 현재 어택 진영 */
  attackingSide: "home" | "away" | null;
};

export type LiveMatchEvent = {
  minute: number;
  side: "home" | "away";
  type: "goal" | "yellow" | "red" | "sub" | "shot" | "corner" | "danger";
  text: string;
};

/**
 * odds-api 이벤트를 LiveMatchData 로 어댑트.
 * 실데이터: home/away/league/startsAt/status/score/periodScores
 * mock 데이터: stats / events  (eventId 시드 기반 의사난수로 안정적)
 */
export function adaptOddsApiEventToLiveMatch(ev: OddsApiWsEvent): LiveMatchData {
  const status: LiveMatchData["status"] =
    ev.eventStatus === "live"
      ? "live"
      : ev.eventStatus === "ended" || ev.eventStatus === "finished"
        ? "ended"
        : ev.eventStatus === "prematch" || ev.eventStatus === "pending"
          ? "prematch"
          : "unknown";

  const isLive = status === "live";
  const seed = hashSeed(ev.eventId);
  const rand = mulberry32(seed);

  // mock 통계 — eventId 별 안정적
  const stats: LiveMatchStats | null = isLive
    ? {
        possession: balanced(rand, 35, 65),
        shotsOnTarget: { home: irand(rand, 0, 6), away: irand(rand, 0, 6) },
        shotsOffTarget: { home: irand(rand, 1, 9), away: irand(rand, 1, 9) },
        corners: { home: irand(rand, 0, 8), away: irand(rand, 0, 8) },
        yellow: { home: irand(rand, 0, 4), away: irand(rand, 0, 4) },
        red: { home: irand(rand, 0, 1), away: irand(rand, 0, 1) },
        attackMomentum: rand() * 2 - 1,
        dangerLevel: rand(),
        attackingSide: rand() > 0.5 ? "home" : "away",
      }
    : null;

  // 진행시간 mock — 실제 벤더 붙으면 그쪽 minute 사용
  const clock = isLive
    ? {
        minute: irand(rand, 1, 90),
        period: rand() > 0.5 ? "2H" : "1H",
      }
    : null;

  return {
    eventId: ev.eventId,
    sport: ev.sport,
    home: { name: ev.home ?? null, score: ev.scores?.home ?? null },
    away: { name: ev.away ?? null, score: ev.scores?.away ?? null },
    league: ev.league ?? null,
    startsAt: ev.date ?? null,
    status,
    clock,
    periodScores: ev.scores?.periods ?? null,
    stats,
    events: isLive ? buildMockEvents(ev.eventId, rand) : [],
    externalUrl: ev.url,
  };
}

function buildMockEvents(eventId: string, rand: () => number): LiveMatchEvent[] {
  const types: LiveMatchEvent["type"][] = [
    "goal",
    "yellow",
    "red",
    "sub",
    "shot",
    "corner",
    "danger",
  ];
  const out: LiveMatchEvent[] = [];
  const n = 3 + Math.floor(rand() * 4);
  let minute = 1;
  for (let i = 0; i < n; i++) {
    minute += Math.floor(rand() * 18) + 2;
    if (minute > 90) break;
    const side = rand() > 0.5 ? "home" : "away";
    const type = types[Math.floor(rand() * types.length)];
    out.push({
      minute,
      side,
      type,
      text: prettyEventText(type),
    });
  }
  // 시드 디버그용으로 마지막에 noop
  void eventId;
  return out.reverse();
}

function prettyEventText(t: LiveMatchEvent["type"]): string {
  switch (t) {
    case "goal":
      return "골!";
    case "yellow":
      return "옐로카드";
    case "red":
      return "레드카드";
    case "sub":
      return "교체";
    case "shot":
      return "슛";
    case "corner":
      return "코너킥";
    case "danger":
      return "위험한 어택";
  }
}

/* ─────────────────────────── Drawer / Panel ─────────────────────────── */

export function LiveMatchPanel({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: LiveMatchData | null;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !data) return null;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-label="close"
      />
      {/* drawer (mobile = bottom sheet, md+ = right side panel) */}
      <div
        ref={ref}
        className="fixed inset-x-0 bottom-0 z-[81] max-h-[92vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 text-zinc-100 shadow-[0_-30px_60px_-20px_rgba(0,0,0,0.6)] md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:h-full md:max-h-none md:w-[480px] md:rounded-l-2xl md:rounded-tr-none md:border-l"
        role="dialog"
        aria-modal="true"
      >
        <PanelHeader data={data} onClose={onClose} />
        <PanelScoreboard data={data} />
        {data.status === "live" && data.stats ? (
          <>
            <PanelPitch data={data} />
            <PanelStats data={data} />
            <PanelTimeline data={data} />
          </>
        ) : (
          <PrematchEmpty data={data} />
        )}
        <PanelFooter data={data} />
      </div>
    </>
  );
}

function PanelHeader({
  data,
  onClose,
}: {
  data: LiveMatchData;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] uppercase tracking-wider text-zinc-500">
          {data.league || "Live Match"} · #{data.eventId}
        </p>
        <p className="text-sm font-semibold text-zinc-200">매치 디테일</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/5"
      >
        ✕ 닫기
      </button>
    </div>
  );
}

function PanelScoreboard({ data }: { data: LiveMatchData }) {
  const isLive = data.status === "live";
  return (
    <div className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 px-5 py-5">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-zinc-400">
          {prettyStatus(data.status)}
        </span>
        {isLive && data.clock?.minute != null ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/15 px-2 py-0.5 font-bold text-rose-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
            {data.clock.period ?? ""} {data.clock.minute}&apos;
          </span>
        ) : data.startsAt ? (
          <span className="font-mono text-zinc-500">
            {new Date(data.startsAt).toLocaleString("ko-KR", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <SideName name={data.home.name} align="right" />
        <ScorePair home={data.home.score} away={data.away.score} />
        <SideName name={data.away.name} align="left" />
      </div>

      {data.periodScores && Object.keys(data.periodScores).length > 0 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] font-mono text-zinc-500">
          {Object.entries(data.periodScores).map(([k, p]) => (
            <span
              key={k}
              className="rounded border border-white/10 bg-zinc-900/80 px-2 py-0.5"
            >
              {prettyPeriodLabel(k)}{" "}
              <span className="text-zinc-300">
                {p.home}-{p.away}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SideName({
  name,
  align,
}: {
  name: string | null;
  align: "left" | "right";
}) {
  return (
    <p
      className={`truncate text-base font-bold text-white md:text-lg ${
        align === "right" ? "text-right" : "text-left"
      }`}
      title={name ?? undefined}
    >
      {name ?? "—"}
    </p>
  );
}

function ScorePair({
  home,
  away,
}: {
  home: number | null;
  away: number | null;
}) {
  if (home == null && away == null) {
    return <span className="font-mono text-2xl text-zinc-600">vs</span>;
  }
  return (
    <span className="rounded-md bg-zinc-900 px-3 py-1 font-mono text-2xl font-bold text-main-gold md:text-3xl">
      {home ?? "-"}{" "}
      <span className="text-zinc-600">:</span> {away ?? "-"}
    </span>
  );
}

function PanelPitch({ data }: { data: LiveMatchData }) {
  const stats = data.stats!;
  const momentum = stats.attackMomentum;
  const danger = stats.dangerLevel;
  const isFootball = data.sport === "football" || data.sport === "soccer";

  return (
    <div className="border-b border-white/10 px-5 py-4">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="text-zinc-500">실시간 어택</span>
        <DemoBadge />
      </div>

      {/* 미니 피치 (축구일 때만 의미 있음. 다른 종목은 단순 모멘텀 바로 폴백) */}
      {isFootball ? (
        <MiniPitch
          home={data.home.name}
          away={data.away.name}
          attackingSide={stats.attackingSide}
          dangerLevel={danger}
        />
      ) : (
        <div className="rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-6 text-center text-[12px] text-zinc-500">
          {prettySport(data.sport)} 트래커는 추후 vendor 연결 시 활성화됩니다.
        </div>
      )}

      {/* 모멘텀 바 (-1 home ~ +1 away) */}
      <div className="mt-3">
        <p className="mb-1 flex items-center justify-between text-[10px] text-zinc-500">
          <span>{data.home.name ?? "HOME"}</span>
          <span>모멘텀</span>
          <span>{data.away.name ?? "AWAY"}</span>
        </p>
        <MomentumBar value={momentum} />
      </div>
    </div>
  );
}

function MiniPitch({
  home,
  away,
  attackingSide,
  dangerLevel,
}: {
  home: string | null;
  away: string | null;
  attackingSide: "home" | "away" | null;
  dangerLevel: number;
}) {
  // 어택 위치를 0(home goal) ~ 1(away goal) 사이로 추정
  const x =
    attackingSide === "home" ? 0.65 + dangerLevel * 0.3 : attackingSide === "away" ? 0.35 - dangerLevel * 0.3 : 0.5;
  const left = `${(x * 100).toFixed(1)}%`;
  const dangerColor =
    dangerLevel > 0.7
      ? "bg-rose-500"
      : dangerLevel > 0.4
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <div className="relative aspect-[2/1] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-r from-emerald-900/60 to-emerald-800/60">
      {/* center line */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/15" />
      {/* center circle */}
      <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
      {/* penalty boxes (very simple) */}
      <div className="absolute left-0 top-1/2 h-3/5 w-1/6 -translate-y-1/2 border-y border-r border-white/15" />
      <div className="absolute right-0 top-1/2 h-3/5 w-1/6 -translate-y-1/2 border-y border-l border-white/15" />
      {/* goals */}
      <div className="absolute left-0 top-1/2 h-1/4 w-[2px] -translate-y-1/2 bg-white/40" />
      <div className="absolute right-0 top-1/2 h-1/4 w-[2px] -translate-y-1/2 bg-white/40" />
      {/* team name labels */}
      <span className="absolute left-2 top-1.5 truncate rounded bg-black/30 px-1 text-[9px] font-bold text-white/80">
        {home ?? "HOME"}
      </span>
      <span className="absolute right-2 top-1.5 truncate rounded bg-black/30 px-1 text-[9px] font-bold text-white/80">
        {away ?? "AWAY"}
      </span>
      {/* attack ball */}
      <div
        className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${dangerColor} shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-all`}
        style={{ left, animation: "pulse 1.4s ease-in-out infinite" }}
      />
    </div>
  );
}

function MomentumBar({ value }: { value: number }) {
  // value -1 ~ +1
  const pct = Math.max(0, Math.min(1, (value + 1) / 2)); // 0 ~ 1
  const widthHome = `${((1 - pct) * 100).toFixed(1)}%`;
  const widthAway = `${(pct * 100).toFixed(1)}%`;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-zinc-900/80">
      <div
        className="bg-gradient-to-r from-blue-400 to-blue-500 transition-all"
        style={{ width: widthHome }}
      />
      <div
        className="bg-gradient-to-r from-rose-500 to-rose-400 transition-all"
        style={{ width: widthAway }}
      />
    </div>
  );
}

function PanelStats({ data }: { data: LiveMatchData }) {
  const s = data.stats!;
  return (
    <div className="border-b border-white/10 px-5 py-4">
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="text-zinc-500">팀 스탯</span>
        <DemoBadge />
      </div>
      <div className="space-y-2">
        <StatRow label="볼 점유율" home={s.possession.home} away={s.possession.away} unit="%" mode="percent" />
        <StatRow label="유효 슈팅" home={s.shotsOnTarget.home} away={s.shotsOnTarget.away} mode="number" />
        <StatRow label="슈팅" home={s.shotsOnTarget.home + s.shotsOffTarget.home} away={s.shotsOnTarget.away + s.shotsOffTarget.away} mode="number" />
        <StatRow label="코너킥" home={s.corners.home} away={s.corners.away} mode="number" />
        <StatRow label="옐로카드" home={s.yellow.home} away={s.yellow.away} mode="number" muted />
        {s.red.home + s.red.away > 0 ? (
          <StatRow label="레드카드" home={s.red.home} away={s.red.away} mode="number" muted />
        ) : null}
      </div>
    </div>
  );
}

function StatRow({
  label,
  home,
  away,
  unit,
  mode,
  muted,
}: {
  label: string;
  home: number;
  away: number;
  unit?: string;
  mode: "percent" | "number";
  muted?: boolean;
}) {
  const total = home + away || 1;
  const homePct = mode === "percent" ? home : (home / total) * 100;
  const awayPct = mode === "percent" ? away : (away / total) * 100;
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-[12px]">
        <span className={`font-mono font-bold ${muted ? "text-zinc-500" : "text-white"}`}>
          {home}
          {unit ?? ""}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {label}
        </span>
        <span className={`font-mono font-bold ${muted ? "text-zinc-500" : "text-white"}`}>
          {away}
          {unit ?? ""}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-900/80">
        <div
          className="bg-blue-500/70"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-rose-500/70"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}

function PanelTimeline({ data }: { data: LiveMatchData }) {
  const events = data.events ?? [];
  if (events.length === 0) return null;
  return (
    <div className="border-b border-white/10 px-5 py-4">
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-wider">
        <span className="text-zinc-500">최근 이벤트</span>
        <DemoBadge />
      </div>
      <ul className="space-y-2">
        {events.map((e, i) => (
          <li
            key={`${e.minute}-${i}`}
            className={`flex items-center gap-3 rounded-md border px-2.5 py-1.5 text-[12px] ${
              e.type === "goal"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : e.type === "red"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300"
            }`}
          >
            <span className="w-8 shrink-0 font-mono text-zinc-500">
              {e.minute}&apos;
            </span>
            <span className="text-base leading-none">
              {eventEmoji(e.type)}
            </span>
            <span className="flex-1 truncate font-medium">{e.text}</span>
            <span className="text-[10px] uppercase text-zinc-500">
              {e.side === "home" ? "HOME" : "AWAY"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function eventEmoji(t: LiveMatchEvent["type"]): string {
  switch (t) {
    case "goal":
      return "⚽";
    case "yellow":
      return "🟨";
    case "red":
      return "🟥";
    case "sub":
      return "🔁";
    case "shot":
      return "🎯";
    case "corner":
      return "🚩";
    case "danger":
      return "🔥";
  }
}

function PrematchEmpty({ data }: { data: LiveMatchData }) {
  return (
    <div className="border-b border-white/10 px-5 py-10 text-center">
      <p className="text-sm text-zinc-400">
        아직 라이브가 아닙니다. 시작 시간이 되면 어택 트래커가 활성화됩니다.
      </p>
      {data.startsAt ? (
        <p className="mt-2 font-mono text-xs text-zinc-500">
          킥오프{" "}
          {new Date(data.startsAt).toLocaleString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      ) : null}
    </div>
  );
}

function PanelFooter({ data }: { data: LiveMatchData }) {
  return (
    <div className="px-5 py-4 text-[11px] text-zinc-500">
      <p>
        실시간 점수는 <span className="text-zinc-300">odds-api.io</span> REST
        보강에서 가져옵니다. 어택 트래커·통계·이벤트는 <DemoBadge inline /> 로
        표기되며, 향후 vendor (Sportradar / API-Sports 등) 연결 시 실제 값으로
        대체됩니다.
      </p>
      {data.externalUrl ? (
        <a
          href={data.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block rounded-md border border-white/10 px-2 py-1 text-[11px] text-main-gold hover:border-main-gold/50"
        >
          ↗ 외부 vendor 페이지 (라이센스 필요)
        </a>
      ) : null}
    </div>
  );
}

function DemoBadge({ inline }: { inline?: boolean } = {}) {
  return (
    <span
      className={`rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 ${
        inline ? "" : ""
      }`}
    >
      DEMO
    </span>
  );
}

/* ─────────────────────────── tiny helpers ─────────────────────────── */

function prettyStatus(s: LiveMatchData["status"]): string {
  switch (s) {
    case "live":
      return "라이브 진행중";
    case "prematch":
      return "경기 전";
    case "ended":
      return "경기 종료";
    default:
      return "—";
  }
}

function prettyPeriodLabel(k: string): string {
  switch (k.toLowerCase()) {
    case "p1":
      return "1H";
    case "p2":
      return "2H";
    case "p3":
      return "3쿼";
    case "p4":
      return "4쿼";
    case "fulltime":
      return "FT";
    case "overtime":
      return "OT";
    default:
      return k;
  }
}

function prettySport(s: string): string {
  switch (s) {
    case "football":
    case "soccer":
      return "축구";
    case "basketball":
      return "농구";
    case "tennis":
      return "테니스";
    case "baseball":
      return "야구";
    case "ice-hockey":
      return "아이스하키";
    default:
      return s;
  }
}

/* ─────────────────────────── seeded RNG (mock 통계 안정화) ─────────────────────────── */

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function irand(rand: () => number, lo: number, hi: number): number {
  return Math.floor(rand() * (hi - lo + 1)) + lo;
}

function balanced(rand: () => number, lo: number, hi: number) {
  const home = irand(rand, lo, hi);
  return { home, away: 100 - home };
}

/* ─────────────────────────── responsive helper for parent ─────────────────────────── */

export function useLiveMatchPanelState() {
  const [open, setOpen] = useState(false);
  const [event, setEvent] = useState<OddsApiWsEvent | null>(null);
  const data = useMemo(
    () => (event ? adaptOddsApiEventToLiveMatch(event) : null),
    [event],
  );
  return {
    open,
    data,
    openWith(ev: OddsApiWsEvent) {
      setEvent(ev);
      setOpen(true);
    },
    close() {
      setOpen(false);
    },
  };
}

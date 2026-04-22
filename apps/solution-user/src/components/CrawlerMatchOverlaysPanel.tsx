"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  fetchCrawlerMatchOverlays,
  type CrawlerMatchOverlayItem,
  type CrawlerMatchOverlaysResponse,
} from "@/lib/api";
import { overlayDisplayTeamName } from "@/lib/crawlerOverlayDisplay";
import { useBootstrapHost } from "@/components/BootstrapProvider";
import { CrawlerMatchOverlayDetail } from "@/components/CrawlerMatchOverlayDetail";
import { useBettingCart } from "@/components/BettingCartContext";

/**
 * 상단 고정 종목 필터 — 크롤러 source_sport_slug 와 1:1 매핑.
 * (aiscore 기준: football / baseball / basketball / volleyball / ice-hockey /
 *               american-football / tennis / esports)
 */
const FIXED_SPORT_FILTERS: ReadonlyArray<{
  id: string;
  label: string;
  emoji: string;
  /** 크롤러 API 로 넘길 `sportSlug` 값 */
  sportSlug: string;
}> = [
  { id: "football", label: "축구", emoji: "⚽", sportSlug: "football" },
  { id: "baseball", label: "야구", emoji: "⚾", sportSlug: "baseball" },
  { id: "basketball", label: "농구", emoji: "🏀", sportSlug: "basketball" },
  { id: "volleyball", label: "배구", emoji: "🏐", sportSlug: "volleyball" },
  { id: "ice-hockey", label: "아이스하키", emoji: "🏒", sportSlug: "ice-hockey" },
  {
    id: "american-football",
    label: "미식축구",
    emoji: "🏈",
    sportSlug: "american-football",
  },
  { id: "tennis", label: "테니스", emoji: "🎾", sportSlug: "tennis" },
  { id: "lol", label: "LOL", emoji: "🎮", sportSlug: "esports" },
];

const DEFAULT_SPORT_FILTER_ID = "football";

/**
 * 로드 실패한 이미지 URL 전역 블랙리스트. 한 번 깨진 URL 은 다음 렌더에서도
 * 즉시 숨김 처리해서 재요청·placeholder 깜빡임을 줄인다.
 */
const BROKEN_IMG_URLS = new Set<string>();

function firstOkUrl(urls: Array<string | null | undefined>): string | null {
  for (const u of urls) {
    const s = (u || "").trim();
    if (!s) continue;
    if (BROKEN_IMG_URLS.has(s)) continue;
    return s;
  }
  return null;
}

/**
 * 404·로드 실패 시 자동으로 숨기는 이미지.
 * - src 가 비었거나 이전에 실패했던 URL 이면 렌더 X.
 * - 여러 후보를 넘기면 앞에서부터 시도해서 첫 유효한 것 사용.
 */
function SafeImg({
  src,
  srcCandidates,
  alt,
  className,
}: {
  src?: string | null | undefined;
  srcCandidates?: Array<string | null | undefined>;
  alt: string;
  className?: string;
}) {
  const [, setTick] = useState(0);
  const url = srcCandidates
    ? firstOkUrl(srcCandidates)
    : firstOkUrl([src]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onError={() => {
        BROKEN_IMG_URLS.add(url);
        setTick((n) => n + 1);
      }}
    />
  );
}

function formatFixtureTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function kickoffMs(row: CrawlerMatchOverlayItem): number {
  const u = row.rawKickoffUtc;
  if (!u) return Number.MAX_SAFE_INTEGER;
  const t = Date.parse(u);
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

/** KST(UTC+9) 기준 날짜 키·라벨·버킷 정렬 ms */
function kstDateInfo(iso: string | null): {
  dateKey: string;
  dateLabel: string;
  bucketMs: number;
} {
  const src = iso ? Date.parse(iso) : NaN;
  const ms = Number.isFinite(src) ? src : Date.now();
  const kst = new Date(ms + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const mo = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const dow = "일월화수목금토"[kst.getUTCDay()];
  const dateKey = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dateLabel = `${mo}월 ${d}일 (${dow})`;
  const bucketMs = Date.UTC(y, mo - 1, d) - 9 * 60 * 60 * 1000;
  return { dateKey, dateLabel, bucketMs };
}

function leagueTitle(row: CrawlerMatchOverlayItem): string {
  const pv = row.providerOddsPreview;
  /**
   * displayLeagueName(alias·크롤 한글 라벨) 단독 최우선 금지.
   * 크롤/alias 오류로 CPBL 등 엉뚱한 헤더가 나온 사례 있음 — 실제 연결된 이벤트의 스냅샷 리그명이 진실에 가깝다.
   */
  const snapKr = (pv?.league?.nameKr || "").trim();
  if (snapKr) return snapKr;
  const snapEn = (pv?.league?.name || "").trim();
  if (snapEn) return snapEn;
  const dn = (row.displayLeagueName || "").trim();
  if (dn) return dn;
  const paired = (row.pairedLocaleRaw?.rawLeagueLabel || "").trim();
  if (paired) return paired;
  const rawSlug = (row.rawLeagueSlug || "").trim();
  if (rawSlug) return rawSlug;
  return "기타 리그";
}

/** 리그 그룹핑 전용 안정 키 — 스냅샷 league.slug → DB providerLeagueSlug → raw 슬러그 */
function leagueGroupKey(row: CrawlerMatchOverlayItem): string {
  const pv = row.providerOddsPreview;
  const fromPreview = (pv?.league?.slug || "").trim();
  if (fromPreview) return `psl:${fromPreview}`;
  const mapped = (row.providerLeagueSlug || "").trim();
  if (mapped) return `psl:${mapped}`;
  const rawSlug = (row.rawLeagueSlug || "").trim();
  if (rawSlug) return `rsl:${rawSlug}`;
  return `ttl:${leagueTitle(row)}`;
}

/** 경기(provider event) 단위 중복 제거용 키 */
function matchDedupKey(row: CrawlerMatchOverlayItem): string {
  const eid = (row.providerExternalEventId || "").trim();
  if (eid) return `ev:${eid}`;
  const pv = row.providerOddsPreview;
  const mid = (pv?.matchId || "").trim();
  if (mid) return `mid:${mid}`;
  return `row:${row.id}`;
}

/** 중복 후보 중 "한글/현지 표현이 풍부한" row 선호 */
function scoreRow(row: CrawlerMatchOverlayItem): number {
  let s = 0;
  if ((row.providerOddsPreview?.league?.slug || "").trim()) s += 6;
  if ((row.providerOddsPreview?.league?.nameKr || "").trim()) s += 4;
  if ((row.displayLeagueName || "").trim()) s += 3;
  if ((row.pairedLocaleRaw?.rawLeagueLabel || "").trim()) s += 2;
  if ((row.providerOddsPreview?.home?.nameKr || "").trim()) s += 1;
  if ((row.providerOddsPreview?.away?.nameKr || "").trim()) s += 1;
  if (row.providerOddsPreview?.primaryMarkets?.moneyline) s += 1;
  return s;
}

/**
 * 국가 표시 우선순위
 *  1) providerCountryKo (OddsApiLeagueAlias.country 기반 한글화)
 *  2) pairedLocaleRaw.rawCountryLabel (크롤 locale 원문 국가)
 *  3) oddsLeagueAliasCountry (alias 원문 — 영문/현지어 폴백)
 */
function countryLabel(row: CrawlerMatchOverlayItem): string | null {
  const ko = (row.providerCountryKo || "").trim();
  if (ko) return ko;
  const paired = (row.pairedLocaleRaw?.rawCountryLabel || "").trim();
  if (paired) return paired;
  const raw = (row.oddsLeagueAliasCountry || "").trim();
  if (raw) return raw;
  return null;
}

function leagueLogoUrl(row: CrawlerMatchOverlayItem): string | null {
  const pv = row.providerOddsPreview;
  return pv?.league?.logoUrl || row.sourceLeagueLogo || null;
}

function leagueCountryFlag(row: CrawlerMatchOverlayItem): string | null {
  return row.sourceCountryFlag || null;
}

function sectionId(title: string): string {
  return `crawl-league-${encodeURIComponent(title).replace(/%/g, "_")}`;
}

function fmt(n: number) {
  return n.toFixed(2);
}

type FixtureRowProps = {
  row: CrawlerMatchOverlayItem;
  leagueName: string;
  onOpenDetail: (id: string) => void;
};

function FixtureRow({ row, leagueName, onOpenDetail }: FixtureRowProps) {
  const { addLine, lines } = useBettingCart();
  const pickedSet = useMemo(() => {
    const s = new Set<string>();
    for (const l of lines) if (l.selectionKey) s.add(l.selectionKey);
    return s;
  }, [lines]);
  const pm = row.providerOddsPreview?.primaryMarkets;
  const ml = pm?.moneyline;
  const expandable = row.providerOddsPreview?.expandableMarketCount ?? 0;
  const pv = row.providerOddsPreview;
  const home = overlayDisplayTeamName(row, "home");
  const away = overlayDisplayTeamName(row, "away");
  const homeLogo = pv?.home?.logoUrl || row.providerHomeLogo || row.sourceHomeLogo || null;
  const awayLogo = pv?.away?.logoUrl || row.providerAwayLogo || row.sourceAwayLogo || null;
  const matchLabel = `${home} vs ${away}`;

  const matchKey = matchDedupKey(row);
  const addMl = (outcome: "home" | "draw" | "away", odd: number, pickLabel: string) => {
    addLine({
      matchLabel,
      pickLabel,
      odd: fmt(odd),
      selectionKey: `${matchKey}:moneyline:${outcome}`,
      source: "manual",
      marketType: "moneyline",
      outcome,
      leagueName,
      homeName: home,
      awayName: away,
      startTime: row.rawKickoffUtc,
      bookmakerCount: null,
      sourceBookmaker: null,
    });
  };

  const hasDraw = ml != null && ml.draw != null;
  const canHome = ml != null;
  const canDraw = hasDraw;
  const canAway = ml != null;
  const pickedHome = pickedSet.has(`${matchKey}:moneyline:home`);
  const pickedDraw = pickedSet.has(`${matchKey}:moneyline:draw`);
  const pickedAway = pickedSet.has(`${matchKey}:moneyline:away`);
  const sideBtn = (active: boolean, disabled: boolean) =>
    `flex min-w-[3.25rem] flex-1 flex-col items-center justify-center rounded border py-1.5 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-35 md:min-w-[4rem] md:py-2 ${
      active
        ? "border-main-gold bg-[rgba(218,174,87,0.22)] text-main-gold shadow-[0_0_0_1px_rgba(218,174,87,0.55)]"
        : "border-white/12 bg-zinc-900/80 hover:border-[rgba(218,174,87,0.45)]"
    }`;

  return (
    <div className="flex flex-wrap items-stretch gap-2 border-b border-white/6 bg-black/15 py-2.5 pl-2 pr-1 hover:bg-black/28 md:flex-nowrap md:gap-3 md:py-2">
      <div className="flex w-[4.5rem] shrink-0 flex-col justify-center text-center md:w-[5.25rem]">
        <span className="font-mono text-[11px] font-medium text-zinc-200">
          {formatFixtureTime(row.rawKickoffUtc)}
        </span>
        <span className="mt-0.5 text-[9px] text-zinc-500">{hasDraw ? "승무패" : "승패"}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 md:flex-row md:items-center md:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] leading-snug text-zinc-100 md:max-w-[40%]">
          {homeLogo ? (
            <SafeImg
              src={homeLogo}
              alt=""
              className="h-4 w-4 shrink-0 rounded-sm border border-white/10 bg-zinc-900 object-contain"
            />
          ) : null}
          <span className="min-w-0 truncate font-medium">{home}</span>
          <span className="mx-0.5 shrink-0 text-zinc-500">vs</span>
          {awayLogo ? (
            <SafeImg
              src={awayLogo}
              alt=""
              className="h-4 w-4 shrink-0 rounded-sm border border-white/10 bg-zinc-900 object-contain"
            />
          ) : null}
          <span className="min-w-0 truncate font-medium">{away}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
          <button
            type="button"
            disabled={!canHome}
            onClick={(e) => {
              e.stopPropagation();
              if (ml) addMl("home", ml.home, `홈 ${fmt(ml.home)}`);
            }}
            className={sideBtn(pickedHome, !canHome)}
          >
            <span className={`text-[9px] ${pickedHome ? "text-main-gold" : "text-zinc-500"}`}>홈</span>
            <span className="font-mono text-[12px] font-semibold text-main-gold">
              {ml ? fmt(ml.home) : "—"}
            </span>
          </button>
          <button
            type="button"
            disabled={!canDraw}
            onClick={(e) => {
              e.stopPropagation();
              if (ml && ml.draw != null) addMl("draw", ml.draw, `무 ${fmt(ml.draw)}`);
            }}
            className={sideBtn(pickedDraw, !canDraw)}
          >
            <span className={`text-[9px] ${pickedDraw ? "text-main-gold" : "text-zinc-500"}`}>무</span>
            <span className="font-mono text-[12px] font-semibold text-main-gold">
              {ml?.draw != null ? fmt(ml.draw) : "—"}
            </span>
          </button>
          <button
            type="button"
            disabled={!canAway}
            onClick={(e) => {
              e.stopPropagation();
              if (ml) addMl("away", ml.away, `원 ${fmt(ml.away)}`);
            }}
            className={sideBtn(pickedAway, !canAway)}
          >
            <span className={`text-[9px] ${pickedAway ? "text-main-gold" : "text-zinc-500"}`}>원</span>
            <span className="font-mono text-[12px] font-semibold text-main-gold">
              {ml ? fmt(ml.away) : "—"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-1.5 md:w-auto md:flex-col md:justify-center">
        <button
          type="button"
          onClick={() => onOpenDetail(row.id)}
          className="rounded border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-zinc-300 hover:border-[rgba(218,174,87,0.4)] hover:text-main-gold"
        >
          {expandable > 0 ? `+${expandable}` : "상세"}
        </button>
      </div>
    </div>
  );
}

type GroupedRows = {
  /** 고유 키 (리그 그룹키 + 날짜) */
  key: string;
  title: string;
  country: string | null;
  dateLabel: string;
  /** 그룹 날짜 KST 00:00 ms */
  bucketMs: number;
  /** 그룹 내 첫 경기 킥오프 ms (정렬용) */
  minKickoffMs: number;
  rows: CrawlerMatchOverlayItem[];
  leagueLogo: string | null;
  countryFlag: string | null;
};

export function CrawlerMatchOverlaysPanel() {
  const host = useBootstrapHost();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const detailId = sp.get("crawlMatch");

  /** 선택된 종목 필터 id (FIXED_SPORT_FILTERS 기준). 기본은 축구. */
  const [activeSportId, setActiveSportId] = useState<string>(
    DEFAULT_SPORT_FILTER_ID,
  );
  const [leagueFilter, setLeagueFilter] = useState<string | null>(null);
  const [data, setData] = useState<CrawlerMatchOverlaysResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeFilter = useMemo(
    () =>
      FIXED_SPORT_FILTERS.find((f) => f.id === activeSportId) ??
      FIXED_SPORT_FILTERS[0],
    [activeSportId],
  );

  const openDetail = useCallback(
    (id: string) => {
      const q = new URLSearchParams(sp.toString());
      q.set("crawlMatch", id);
      router.push(`${pathname}?${q.toString()}`);
    },
    [pathname, router, sp],
  );

  const closeDetail = useCallback(() => {
    const q = new URLSearchParams(sp.toString());
    q.delete("crawlMatch");
    router.push(`${pathname}?${q.toString()}`);
  }, [pathname, router, sp]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCrawlerMatchOverlays({
        host,
        sourceSite: "aiscore",
        sportSlug: activeFilter.sportSlug,
        status: "matched",
        kickoffScope: "upcoming",
        take: 100,
        includeOdds: true,
      });
      setData(res);
      setLeagueFilter(null);
      setErr(null);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [host, activeFilter.sportSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 클라이언트에서도 한번 더: kickoff 지난 건 숨김. 주기만 업데이트(목록 재요청 X). */
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  /**
   * 1) providerExternalEventId 기준으로 중복 row 제거(paired locale 2중 mapping 대응).
   * 2) 리그 그룹키(providerLeagueSlug 우선)+KST 날짜로 묶음.
   * 3) 킥오프 지난 경기는 숨김.
   */
  const grouped = useMemo<GroupedRows[]>(() => {
    const rawItems = (data?.items ?? []).filter((row) => {
      if (!row.rawKickoffUtc) return true;
      const t = Date.parse(row.rawKickoffUtc);
      if (!Number.isFinite(t)) return true;
      return t > nowMs;
    });
    if (!rawItems.length) return [];

    const bestByMatch = new Map<string, CrawlerMatchOverlayItem>();
    for (const row of rawItems) {
      const k = matchDedupKey(row);
      const prev = bestByMatch.get(k);
      if (!prev) {
        bestByMatch.set(k, row);
      } else if (scoreRow(row) > scoreRow(prev)) {
        bestByMatch.set(k, row);
      }
    }
    const items = [...bestByMatch.values()];

    const map = new Map<string, GroupedRows>();
    for (const row of items) {
      const lgKey = leagueGroupKey(row);
      const { dateKey, dateLabel, bucketMs } = kstDateInfo(row.rawKickoffUtc);
      const key = `${lgKey}::${dateKey}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          title: leagueTitle(row),
          country: countryLabel(row),
          dateLabel,
          bucketMs,
          minKickoffMs: kickoffMs(row),
          rows: [],
          leagueLogo: leagueLogoUrl(row),
          countryFlag: leagueCountryFlag(row),
        };
        map.set(key, g);
      } else {
        if (scoreRow(row) > scoreRow(g.rows[0] ?? row)) {
          g.title = leagueTitle(row);
          g.country = countryLabel(row) ?? g.country;
          g.leagueLogo = leagueLogoUrl(row) ?? g.leagueLogo;
          g.countryFlag = leagueCountryFlag(row) ?? g.countryFlag;
        }
      }
      g.rows.push(row);
    }
    const arr = [...map.values()];
    for (const g of arr) {
      g.rows.sort((a, b) => kickoffMs(a) - kickoffMs(b));
      g.minKickoffMs = g.rows.length ? kickoffMs(g.rows[0]) : g.bucketMs;
    }
    // 그룹 정렬: 가장 가까운(이른) 킥오프 순 → 이름(안정화).
    return arr.sort((a, b) => {
      if (a.minKickoffMs !== b.minKickoffMs) return a.minKickoffMs - b.minKickoffMs;
      return a.title.localeCompare(b.title, "ko");
    });
  }, [data, nowMs]);

  const leagueSidebar = useMemo(() => {
    const total = grouped.reduce((s, g) => s + g.rows.length, 0);
    return {
      total,
      items: grouped.map((g) => ({
        key: g.key,
        title: g.title,
        country: g.country,
        dateLabel: g.dateLabel,
        count: g.rows.length,
        leagueLogo: g.leagueLogo,
        countryFlag: g.countryFlag,
      })),
    };
  }, [grouped]);

  const scrollToLeague = useCallback((key: string | null) => {
    setLeagueFilter(key);
    if (!key) return;
    window.requestAnimationFrame(() => {
      const el = document.getElementById(sectionId(key));
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const filteredGroups = useMemo(() => {
    if (!leagueFilter) return grouped;
    return grouped.filter((g) => g.key === leagueFilter);
  }, [grouped, leagueFilter]);

  if (detailId) {
    return (
      <CrawlerMatchOverlayDetail
        host={host}
        mappingId={detailId}
        onBack={closeDetail}
      />
    );
  }

  const totalMatches = grouped.reduce((s, g) => s + g.rows.length, 0);

  return (
    <div className="min-h-0 flex-1">
      {/* 상단 종목 필터바 — 모바일: 1열 가로 스크롤, 데스크탑: 여러 줄 래핑 */}
      <div className="border-b border-white/10 bg-zinc-950/80 px-2 py-3 md:px-6 md:py-4">
        <div className="flex flex-nowrap gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:gap-3 md:overflow-visible">
          {FIXED_SPORT_FILTERS.map((f) => {
            const active = activeSportId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveSportId(f.id)}
                className={`flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold transition md:min-w-[108px] md:shrink md:px-5 md:py-3.5 md:text-[15px] ${
                  active
                    ? "border-[rgba(218,174,87,0.65)] bg-[rgba(218,174,87,0.18)] text-main-gold shadow-[0_0_0_1px_rgba(218,174,87,0.4)]"
                    : "border-white/10 bg-zinc-900/50 text-zinc-300 hover:border-white/25 hover:bg-zinc-900/80 hover:text-zinc-100"
                }`}
              >
                <span className="text-base leading-none md:text-xl">{f.emoji}</span>
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* 좌측 리그 네비 — 로고/국기 + 볼드 타이틀, 스크롤바 숨김 */}
        <aside className="hidden w-[15rem] shrink-0 border-r border-white/8 bg-zinc-950/90 lg:block">
          <div className="sticky top-[var(--app-desktop-header)] max-h-[calc(100vh-var(--app-desktop-header))] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="border-b border-white/8 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              리그
            </div>
            <button
              type="button"
              onClick={() => setLeagueFilter(null)}
              className={`flex w-full items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5 text-left text-[13px] font-bold hover:bg-white/5 ${
                leagueFilter == null ? "bg-white/8 text-main-gold" : "text-zinc-200"
              }`}
            >
              <span>전체</span>
              <span className="font-mono text-[11px] font-semibold text-zinc-400">
                {leagueSidebar.total}
              </span>
            </button>
            {leagueSidebar.items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => scrollToLeague(it.key)}
                className={`flex w-full items-center gap-2 border-b border-white/5 px-3 py-2.5 text-left text-[13px] font-bold hover:bg-white/5 ${
                  leagueFilter === it.key ? "bg-white/8 text-main-gold" : "text-zinc-200"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-zinc-900/80">
                  <SafeImg
                    srcCandidates={[it.leagueLogo, it.countryFlag]}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="line-clamp-2 break-words">{it.title}</span>
                  {it.country ? (
                    <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-500">
                      {it.country}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-zinc-400">
                  {it.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-3 px-2 py-3 md:px-4 md:py-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-3">
            <span className="rounded-full border border-[rgba(218,174,87,0.4)] bg-[rgba(218,174,87,0.12)] px-2.5 py-1 text-[12px] font-semibold text-main-gold">
              {activeFilter.label}
            </span>
            {totalMatches > 0 ? (
              <span className="text-[11px] text-zinc-500">{totalMatches}경기</span>
            ) : null}
            <span className="ml-auto text-[10px] text-zinc-600">
              크롤러 매칭된 경기만 표시
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-500">불러오는 중…</p>
          ) : err ? (
            <p className="text-sm text-amber-400/95">{err}</p>
          ) : totalMatches === 0 ? (
            <p className="text-sm text-zinc-500">
              선택한 종목({activeFilter.label})의 매칭된 경기가 없습니다.
            </p>
          ) : (
            <>
              <p className="text-[10px] text-zinc-600">
                홈·무·원을 누르면 우측 배팅카트에 담깁니다. 상세는「+N」또는「상세」만 누르세요.
              </p>
              <div className="space-y-0 rounded-lg border border-white/10 bg-zinc-950/30">
                {filteredGroups.map((g) => (
                  <section key={g.key} id={sectionId(g.key)}>
                    <div className="flex items-center gap-2 border-b border-white/10 bg-black/25 px-2 py-2 md:px-3">
                      <span className="text-[13px]" aria-hidden>
                        {activeFilter.emoji}
                      </span>
                      <SafeImg
                        src={g.countryFlag}
                        alt=""
                        className="h-4 w-6 shrink-0 rounded border border-white/10 object-cover"
                      />
                      <SafeImg
                        src={g.leagueLogo}
                        alt=""
                        className="h-6 w-6 shrink-0 rounded border border-white/10 bg-zinc-900 object-contain"
                      />
                      <h2 className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate text-[12px] font-semibold text-zinc-200">
                        {g.country ? (
                          <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-[1px] text-[10px] font-medium text-zinc-300">
                            {g.country}
                          </span>
                        ) : null}
                        <span className="truncate">{g.title}</span>
                      </h2>
                      <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {g.dateLabel}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                        {g.rows.length}경기
                      </span>
                    </div>
                    <div>
                      {g.rows.map((row) => (
                        <FixtureRow
                          key={row.id}
                          row={row}
                          leagueName={g.title}
                          onOpenDetail={openDetail}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

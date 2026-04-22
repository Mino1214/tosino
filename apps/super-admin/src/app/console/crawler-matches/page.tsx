"use client";

import type { CSSProperties } from "react";
import {
  DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch, publicAssetUrl } from "@/lib/api";
import {
  crawlerLeagueContextTitle,
  resolveCrawlerCountryKo,
} from "@/lib/crawler-country-ko";

// ────────────────────────────────────────────────────────────
// 타입
// ────────────────────────────────────────────────────────────
type MatchStatus =
  | "auto"
  | "pending"
  | "confirmed"
  | "rejected"
  | "ignored";

type RawMatch = {
  id: string;
  sourceSite: string;
  sourceSportSlug: string;
  sourceMatchId: string;
  internalSportSlug: string | null;
  /** aiscore 이중 로케일 (있으면) */
  sourceLocale?: string | null;
  rawHomeName: string | null;
  rawAwayName: string | null;
  rawLeagueLabel: string | null;
  rawLeagueSlug: string | null;
  rawCountryLabel: string | null;
  rawKickoffUtc: string | null;
  rawStatusText: string | null;
  rawScoreText: string | null;
};

type MatchMapping = {
  id: string;
  rawMatchId: string;
  rawMatch: RawMatch;
  sourceSite: string;
  sourceSportSlug: string;
  internalSportSlug: string | null;
  rawLeagueSlug: string | null;
  rawHomeName: string | null;
  rawAwayName: string | null;
  rawKickoffUtc: string | null;
  providerName: string;
  providerSportSlug: string | null;
  providerLeagueSlug: string | null;
  providerExternalEventId: string | null;
  providerHomeExternalId: string | null;
  providerAwayExternalId: string | null;
  providerHomeName: string | null;
  providerAwayName: string | null;
  providerKickoffUtc: string | null;
  kickoffDeltaSeconds: number | null;
  status: MatchStatus;
  matchedVia: string | null;
  matchScore: number | null;
  reason: string | null;
  note: string | null;
  updatedAt: string;
  // enrich 필드
  sourceHomeLogo: string | null;
  sourceAwayLogo: string | null;
  sourceHomeConfirmed: boolean;
  sourceAwayConfirmed: boolean;
  sourceLeagueLogo: string | null;
  sourceCountryFlag: string | null;
  providerHomeLogo: string | null;
  providerAwayLogo: string | null;
  providerHomeKoreanName: string | null;
  providerAwayKoreanName: string | null;
  /** OddsApiLeagueAlias.country (Nest enrich) */
  oddsLeagueAliasCountry: string | null;
  /** (sport, leagueSlug) → odds alias + slug 맵 기반 한글 국가 힌트 */
  providerCountryKo: string | null;
  /** Nest enrich: 짝 로케일 raw (예 en 카드 + ko 한글 라벨) */
  pairedLocaleRaw?: {
    sourceLocale: string;
    rawHomeName: string | null;
    rawAwayName: string | null;
    rawLeagueLabel: string | null;
    rawCountryLabel: string | null;
  } | null;
};

type ListResponse = {
  items: MatchMapping[];
  total: number;
};

type StatsResponse = {
  total: number;
  auto: number;
  pending: number;
  confirmed: number;
  rejected: number;
  ignored: number;
  rawTotal: number;
  unmatched: number;
};

type RunMatcherQueuedResponse = {
  queued: true;
  jobId?: string;
  message: string;
};

/** (과거) 동기 실행 응답 — 현재 API는 큐 응답만 반환 */
type RunMatcherDoneResponse = {
  scanned: number;
  auto: number;
  pending: number;
  unchanged: number;
  error: number;
  durationMs: number;
  reasonBreakdown: Record<string, number>;
};

function isRunMatcherQueued(
  r: RunMatcherQueuedResponse | RunMatcherDoneResponse,
): r is RunMatcherQueuedResponse {
  return "queued" in r && r.queued === true;
}

type FacetsResponse = {
  sports: { sourceSport: string; internalSport: string | null; count: number }[];
  leagues: { sourceSport: string; leagueSlug: string; count: number }[];
};

type ProviderEvent = {
  id: string;
  sport: string;
  leagueSlug: string | null;
  homeId: number | null;
  awayId: number | null;
  home: string | null;
  away: string | null;
  date: string | null;
  status: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  homeKoreanName: string | null;
  awayKoreanName: string | null;
  homeAliasId: string | null;
  awayAliasId: string | null;
  country: string | null;
  leagueKoreanName: string | null;
  leagueLogo: string | null;
  leagueAliasId: string | null;
  used: boolean;
};

type ProviderPoolResponse = {
  events: ProviderEvent[];
  /** 필터 적용 후 풀 전체 건수(미사용 필터 포함) */
  total: number;
  totalBeforeFilter?: number;
  hasMore?: boolean;
  skip?: number;
  /** 최근 스냅샷에서 읽은 카탈로그 이벤트 총량(종목 필터 전) */
  catalogTotalEvents?: number;
  catalogSportSlugs?: string[];
};

type CrawlSuggestSide = {
  apiName: string;
  crawlName: string;
  score: number;
  matchType: string;
};

type CrawlSuggestCandidate = {
  apiMatchId: string | number;
  crawlMatchId: string;
  score: number;
  rawScore: number;
  leagueMatched: boolean;
  leagueScore: number;
  home: CrawlSuggestSide;
  away: CrawlSuggestSide;
  bonus: number;
  reason: string[];
  tier: "strong" | "review" | "low";
  suggestedFold: boolean;
};

type SuggestCrawlCandidatesResponse = {
  candidates: CrawlSuggestCandidate[];
  confirmedMappingsUsed: number;
  scanned: number;
  thresholds: { strong: number; review: number; lowBelow: number };
};

const STATUS_LABELS: Record<MatchStatus | "all", string> = {
  all: "전체",
  auto: "자동",
  pending: "대기",
  confirmed: "수동확정",
  rejected: "거부",
  ignored: "무시",
};

const STATUS_COLOR: Record<MatchStatus, string> = {
  auto: "#2563eb",
  pending: "#f0b400",
  confirmed: "#17a673",
  rejected: "#dc2626",
  ignored: "#9aa0a6",
};

const DND_MIME = "application/x-tosino-provider-event";

/** odds-api / 내부 slug — 기본은 축구(전체 종목 자동 로드 안 함) */
const DEFAULT_SPORT_SLUG = "soccer";

const QUICK_SPORT_PILLS: { slug: string; label: string }[] = [
  { slug: "soccer", label: "축구" },
  { slug: "basketball", label: "농구" },
  { slug: "baseball", label: "야구" },
  { slug: "ice-hockey", label: "아이스하키" },
  { slug: "tennis", label: "테니스" },
  { slug: "football", label: "풋볼" },
];

type ListStatusTab = "pending" | "matched" | "misc";

const LIST_TAB_META: {
  id: ListStatusTab;
  label: string;
  hint: string;
  apiStatus: "pending" | "matched" | "misc";
}[] = [
  {
    id: "pending",
    label: "매칭 대기",
    hint: "strict 미충족·수동 확정 전",
    apiStatus: "pending",
  },
  {
    id: "matched",
    label: "매칭됨",
    hint: "자동·수동확정 (크롤 쪽 이름 ✏ 수정)",
    apiStatus: "matched",
  },
  {
    id: "misc",
    label: "미분류",
    hint: "거부·무시",
    apiStatus: "misc",
  },
];

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString("ko-KR");
  } catch {
    return String(v);
  }
}

function fmtDelta(sec: number | null | undefined) {
  if (sec === null || sec === undefined) return "-";
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m`;
}

/** 킥오프 미정은 목록 맨 뒤(오른쪽 provider 풀과 동일한 감각). */
function kickoffSortMs(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/** 크롤/픽스처 페이지에 가깝게: kickoff → 리그 slug → sourceMatchId */
function compareMappingsCrawlOrder(a: MatchMapping, b: MatchMapping): number {
  const ka = kickoffSortMs(a.rawKickoffUtc ?? a.rawMatch?.rawKickoffUtc ?? null);
  const kb = kickoffSortMs(b.rawKickoffUtc ?? b.rawMatch?.rawKickoffUtc ?? null);
  if (ka !== kb) return ka - kb;
  const la = (a.rawLeagueSlug || a.rawMatch?.rawLeagueSlug || "").toLowerCase();
  const lb = (b.rawLeagueSlug || b.rawMatch?.rawLeagueSlug || "").toLowerCase();
  const lc = la.localeCompare(lb, "ko");
  if (lc !== 0) return lc;
  const ida = (a.rawMatch?.sourceMatchId || "").trim();
  const idb = (b.rawMatch?.sourceMatchId || "").trim();
  return ida.localeCompare(idb, undefined, { numeric: true, sensitivity: "base" });
}

/** 왼쪽: 종목 → 리그 계층 (크롤 원본·매핑 카드) */
type CrawlerLeagueGroup = {
  leagueKey: string;
  leagueLabel: string;
  items: MatchMapping[];
};

type CrawlerSportGroup = {
  sportKey: string;
  sportLabel: string;
  leagues: CrawlerLeagueGroup[];
  itemCount: number;
};

function groupMappingsBySportThenLeague(items: MatchMapping[]): CrawlerSportGroup[] {
  const sportMap = new Map<string, Map<string, MatchMapping[]>>();
  for (const m of items) {
    const sk =
      (m.internalSportSlug || m.sourceSportSlug || "").trim() || "__sport__";
    const raw = m.rawMatch;
    const lk = (
      (m.rawLeagueSlug || raw?.rawLeagueSlug || raw?.rawLeagueLabel || "") as string
    ).trim() || "__league__";
    if (!sportMap.has(sk)) sportMap.set(sk, new Map());
    const lm = sportMap.get(sk)!;
    if (!lm.has(lk)) lm.set(lk, []);
    lm.get(lk)!.push(m);
  }

  const minKickoffMs = (arr: MatchMapping[]) =>
    arr.reduce(
      (acc, m) => Math.min(acc, kickoffSortMs(m.rawKickoffUtc ?? m.rawMatch?.rawKickoffUtc ?? null)),
      Number.POSITIVE_INFINITY,
    );

  const sportGroups: CrawlerSportGroup[] = [];
  for (const [sportKey, leagueMap] of sportMap) {
    const leagues: CrawlerLeagueGroup[] = [];
    let itemCount = 0;
    for (const [leagueKey, leagueItems] of leagueMap) {
      const ordered = [...leagueItems].sort(compareMappingsCrawlOrder);
      const sample = ordered[0];
      const raw = sample?.rawMatch;
      const leagueLabel =
        leagueKey === "__league__"
          ? "리그 미정"
          : (raw?.rawLeagueLabel?.trim() ||
              sample?.rawLeagueSlug?.trim() ||
              leagueKey) as string;
      itemCount += ordered.length;
      leagues.push({ leagueKey, leagueLabel, items: ordered });
    }
    leagues.sort((a, b) => {
      const ta = minKickoffMs(a.items);
      const tb = minKickoffMs(b.items);
      if (ta !== tb) return ta - tb;
      return a.leagueLabel.localeCompare(b.leagueLabel, "ko");
    });
    const sportLabel = sportKey === "__sport__" ? "종목 미정" : sportKey;
    sportGroups.push({ sportKey, sportLabel, leagues, itemCount });
  }
  sportGroups.sort((a, b) => {
    const ta = minKickoffMs(a.leagues.flatMap((l) => l.items));
    const tb = minKickoffMs(b.leagues.flatMap((l) => l.items));
    if (ta !== tb) return ta - tb;
    return a.sportLabel.localeCompare(b.sportLabel, "ko");
  });
  return sportGroups;
}

/** 오른쪽: 종목 → 리그 (provider 카탈로그 카드) */
type ProviderLeagueGroup = {
  leagueKey: string;
  leagueLabel: string;
  items: ProviderEvent[];
};

type ProviderSportGroup = {
  sportKey: string;
  sportLabel: string;
  leagues: ProviderLeagueGroup[];
  itemCount: number;
};

function compareProviderCrawlOrder(a: ProviderEvent, b: ProviderEvent): number {
  const ka = kickoffSortMs(a.date);
  const kb = kickoffSortMs(b.date);
  if (ka !== kb) return ka - kb;
  const la = (a.leagueSlug || "").toLowerCase();
  const lb = (b.leagueSlug || "").toLowerCase();
  const lc = la.localeCompare(lb, "ko");
  if (lc !== 0) return lc;
  return String(a.id).localeCompare(String(b.id), undefined, { numeric: true, sensitivity: "base" });
}

function groupProviderBySportThenLeague(events: ProviderEvent[]): ProviderSportGroup[] {
  const sportMap = new Map<string, Map<string, ProviderEvent[]>>();
  for (const ev of events) {
    const sk = (ev.sport || "").trim() || "__sport__";
    const lk = (ev.leagueSlug || "").trim() || "__league__";
    if (!sportMap.has(sk)) sportMap.set(sk, new Map());
    const lm = sportMap.get(sk)!;
    if (!lm.has(lk)) lm.set(lk, []);
    lm.get(lk)!.push(ev);
  }

  const minKickoffEv = (arr: ProviderEvent[]) =>
    arr.reduce((acc, ev) => Math.min(acc, kickoffSortMs(ev.date)), Number.POSITIVE_INFINITY);

  const out: ProviderSportGroup[] = [];
  for (const [sportKey, leagueMap] of sportMap) {
    const leagues: ProviderLeagueGroup[] = [];
    let itemCount = 0;
    for (const [leagueKey, leagueItems] of leagueMap) {
      const ordered = [...leagueItems].sort(compareProviderCrawlOrder);
      const sample = ordered[0];
      const leagueLabel =
        leagueKey === "__league__"
          ? "리그 미정"
          : (sample.leagueKoreanName?.trim() ||
              sample.leagueSlug?.trim() ||
              leagueKey) as string;
      itemCount += ordered.length;
      leagues.push({ leagueKey, leagueLabel, items: ordered });
    }
    leagues.sort((a, b) => {
      const ta = minKickoffEv(a.items);
      const tb = minKickoffEv(b.items);
      if (ta !== tb) return ta - tb;
      return a.leagueLabel.localeCompare(b.leagueLabel, "ko");
    });
    const sportLabel = sportKey === "__sport__" ? "종목 미정" : sportKey;
    out.push({ sportKey, sportLabel, leagues, itemCount });
  }
  out.sort((a, b) => {
    const ta = minKickoffEv(a.leagues.flatMap((l) => l.items));
    const tb = minKickoffEv(b.leagues.flatMap((l) => l.items));
    if (ta !== tb) return ta - tb;
    return a.sportLabel.localeCompare(b.sportLabel, "ko");
  });
  return out;
}

// ────────────────────────────────────────────────────────────
// 메인 페이지
// ────────────────────────────────────────────────────────────
export default function CrawlerMatchesPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [items, setItems] = useState<MatchMapping[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listStatusTab, setListStatusTab] = useState<ListStatusTab>("pending");
  const [sportFilter, setSportFilter] = useState(DEFAULT_SPORT_SLUG);
  const [leagueFilter, setLeagueFilter] = useState("");
  const [query, setQuery] = useState("");
  const [runBusy, setRunBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<
    RunMatcherQueuedResponse | RunMatcherDoneResponse | null
  >(null);
  const [confirmTarget, setConfirmTarget] = useState<MatchMapping | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [quickConfirming, setQuickConfirming] = useState<string | null>(null);
  /**
   * upcoming: kickoff ≥ 지금 또는 미정만 (라이브 작업용)
   * past: 이미 지난 kickoff
   * all: 무관 — 스코어 크롤이 과거 경기만 넣는 경우 기본이 upcoming 이면 목록이 비어 보임
   */
  const [kickoffScope, setKickoffScope] = useState<"upcoming" | "past" | "all">(
    "all",
  );

  // ── 데이터 로드 ────────────────────────────────────────────
  const refreshFacets = useCallback(async () => {
    try {
      const r = await apiFetch<FacetsResponse>("/hq/crawler/matches/facets");
      setFacets(r);
    } catch (e) {
      console.warn("facets fail", e);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const r = await apiFetch<StatsResponse>("/hq/crawler/matches/stats");
      setStats(r);
    } catch (e) {
      console.warn("stats fail", e);
    }
  }, []);

  const listApiStatus = LIST_TAB_META.find((t) => t.id === listStatusTab)?.apiStatus ?? "pending";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qp = new URLSearchParams();
      qp.set("status", listApiStatus);
      if (sportFilter.trim()) qp.set("sportSlug", sportFilter.trim());
      if (leagueFilter.trim()) qp.set("leagueSlug", leagueFilter.trim());
      if (query.trim()) qp.set("q", query.trim());
      qp.set("kickoffScope", kickoffScope);
      qp.set("take", "500");
      const r = await apiFetch<ListResponse>(
        `/hq/crawler/matches?${qp.toString()}`,
      );
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록 불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [listApiStatus, sportFilter, leagueFilter, query, kickoffScope]);

  useEffect(() => {
    void refreshStats();
    void refreshFacets();
  }, [refreshStats, refreshFacets]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** facets 로 실제 있는 slug 로 보정 (기본 soccer 가 DB 에 없을 때) */
  useEffect(() => {
    if (!facets?.sports?.length) return;
    const slugs = new Set(
      facets.sports
        .map((s) => (s.internalSport || s.sourceSport).trim())
        .filter(Boolean),
    );
    if (slugs.has(sportFilter)) return;
    const pick =
      ["soccer", "football", "basketball", "baseball", "ice-hockey", "tennis"].find(
        (s) => slugs.has(s),
      ) ??
      facets.sports[0].internalSport ??
      facets.sports[0].sourceSport;
    if (pick) setSportFilter(pick);
  }, [facets, sportFilter]);

  const syncMappingRowsFromRaw = useCallback(async () => {
    setSyncBusy(true);
    setError(null);
    setSyncHint(null);
    try {
      const r = await apiFetch<{ upserted: number }>(
        "/hq/crawler/matches/sync-mapping-rows-from-raw",
        { method: "POST", body: JSON.stringify({ limit: 5000 }) },
      );
      await Promise.all([refresh(), refreshStats(), refreshFacets()]);
      setSyncHint(
        r.upserted > 0
          ? `raw → 매핑 행 ${r.upserted.toLocaleString()}건 생성·갱신(고아 백필)`
          : "생성할 고아 raw 없음(이미 매핑 행 있음)",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "매핑 행 동기화 실패");
    } finally {
      setSyncBusy(false);
    }
  }, [refresh, refreshStats, refreshFacets]);

  const runMatcher = useCallback(async () => {
    setRunBusy(true);
    setRunResult(null);
    try {
      const body: Record<string, unknown> = { limit: 2000 };
      if (listStatusTab === "pending") {
        body.onlyStatuses = ["pending", "rejected"];
      }
      const r = await apiFetch<RunMatcherQueuedResponse | RunMatcherDoneResponse>(
        "/hq/crawler/matches/run-matcher",
        { method: "POST", body: JSON.stringify(body) },
      );
      setRunResult(r);
      if (!isRunMatcherQueued(r)) {
        await Promise.all([refresh(), refreshStats(), refreshFacets()]);
      } else {
        void Promise.all([refresh(), refreshStats(), refreshFacets()]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "매처 실행 실패");
    } finally {
      setRunBusy(false);
    }
  }, [refresh, refreshStats, refreshFacets, listStatusTab]);

  const actionReject = useCallback(
    async (row: MatchMapping) => {
      if (!confirm(`경기 매핑을 거부 처리?`)) return;
      await apiFetch(`/hq/crawler/matches/${row.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await Promise.all([refresh(), refreshStats()]);
    },
    [refresh, refreshStats],
  );

  const actionReopen = useCallback(
    async (row: MatchMapping) => {
      await apiFetch(`/hq/crawler/matches/${row.id}/reopen`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await Promise.all([refresh(), refreshStats()]);
    },
    [refresh, refreshStats],
  );

  /**
   * 크롤러 원본(LEFT) 의 홈/원정/리그 한글명을 수정.
   * 매핑이 이미 provider 와 붙어 있으면 OddsApiTeamAlias/OddsApiLeagueAlias 도 자동 전파.
   */
  const saveRawLabel = useCallback(
    async (
      row: MatchMapping,
      field: "home" | "away" | "league",
      value: string,
    ) => {
      await apiFetch(`/hq/crawler/matches/raw/${row.rawMatchId}`, {
        method: "PATCH",
        body: JSON.stringify({ field, value }),
      });
      // 낙관적 업데이트: refresh 를 기다리지 않고 로컬 state 바로 반영
      setItems((curr) =>
        curr.map((r) => {
          if (r.rawMatchId !== row.rawMatchId) return r;
          const next = { ...r };
          const trimmed = value.trim();
          if (field === "home") next.rawHomeName = trimmed || null;
          else if (field === "away") next.rawAwayName = trimmed || null;
          else if (field === "league") {
            next.rawMatch = {
              ...r.rawMatch,
              rawLeagueLabel: trimmed || null,
            };
          }
          return next;
        }),
      );
    },
    [],
  );

  // ── 드롭: provider event 카드를 crawler 매칭 위에 놓으면 즉시 확정 ──
  const handleDropConfirm = useCallback(
    async (row: MatchMapping, ev: ProviderEvent) => {
      setQuickConfirming(row.id);
      try {
        await apiFetch(`/hq/crawler/matches/${row.id}/confirm`, {
          method: "PATCH",
          body: JSON.stringify({
            providerExternalEventId: ev.id,
            providerSportSlug: ev.sport,
            providerLeagueSlug: ev.leagueSlug ?? undefined,
          }),
        });
        await Promise.all([refresh(), refreshStats()]);
      } catch (e) {
        alert(e instanceof Error ? e.message : "확정 실패");
      } finally {
        setQuickConfirming(null);
        setDragOverId(null);
      }
    },
    [refresh, refreshStats],
  );

  const counts = useMemo(() => stats, [stats]);

  // ── UI ─────────────────────────────────────────────────────
  const pillBase: CSSProperties = {
    padding: "7px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    lineHeight: 1.2,
  };
  const pillActive: CSSProperties = {
    ...pillBase,
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    boxShadow: "0 0 0 1px rgba(37,99,235,0.2)",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0%",
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        gap: 0,
      }}
    >
      <div style={{ flexShrink: 0 }}>
      <h1 style={{ marginBottom: 4 }}>크롤러 경기 매칭</h1>
      <p style={{ color: "#666", marginBottom: 12, fontSize: 12, lineHeight: 1.5 }}>
        크롤 원본은 ingest 시 DB에 저장되고, 같은 시점에{" "}
        <strong>대기(pending) 매핑 행</strong>이 만들어져 이 목록에 나타납니다.{" "}
        <strong>매처(Bull <code style={{ fontSize: 11 }}>crawler-matcher</code>)</strong>는
        선택적 유틸입니다. 서버에서 주기 잡을 켜도 기본은{" "}
        <strong>후보 JSON이 아직 없는 pending</strong>만 소량 선작업합니다. 주기는{" "}
        <code style={{ fontSize: 11 }}>CRAWLER_MATCHER_TICK_MS</code>(ms, 운영 기본 약 7분).
        비프로덕션·미설정 시에도 약 7분 기본, 끄려면 0. HQ의
        「매칭 큐에 넣기」는 전체 재검사입니다. 최종 확정은 드래그·수동으로 합니다.
      </p>

      {(counts?.rawTotal ?? 0) === 0 && (
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            fontSize: 12,
            lineHeight: 1.55,
            color: "#881337",
          }}
        >
          <strong>Postgres에 크롤 원시 경기(CrawlerRawMatch)가 0건입니다.</strong>{" "}
          스코어 크롤러는 기본적으로 sqlite에만 쌓고, <strong>Nest DB로 넣으려면</strong>{" "}
          <code style={{ fontSize: 11 }}>apps/score-crawler/.env</code>에 다음이 있어야
          합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>
              <code style={{ fontSize: 11 }}>BACKEND_BASE_URL=http://127.0.0.1:4001/api</code>{" "}
              — 반드시 <strong>/api</strong> 포함, 이 HQ가 붙은 Nest와 호스트·포트 동일
            </li>
            <li>
              <code style={{ fontSize: 11 }}>BACKEND_INTEGRATION_KEY</code> = Nest{" "}
              <code style={{ fontSize: 11 }}>ODDS_API_INTEGRATION_KEYS</code> 콤마 목록{" "}
              <strong>중 하나와 완전 동일</strong> (키 비면 Nest는 401)
            </li>
            <li>
              한 사이클 끝나면 터미널에{" "}
              <code style={{ fontSize: 11 }}>ingest matches skipped: …</code> /{" "}
              <code style={{ fontSize: 11 }}>ingest matches ok …</code> 로그 확인
            </li>
          </ul>
          수동 검증:{" "}
          <code style={{ fontSize: 11 }}>POST /api/integrations/crawler/matches/ingest</code> +{" "}
          <code style={{ fontSize: 11 }}>x-integration-key</code>. HQ{" "}
          <code style={{ fontSize: 11 }}>NEXT_PUBLIC_API_URL</code>이 지금 보는 Nest와
          같은 DB를 가리키는지도 확인하세요.
        </div>
      )}

      {/* 상태 카운터 */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        {(["auto", "pending", "confirmed", "rejected"] as MatchStatus[]).map(
          (s) => (
            <div
              key={s}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "#f5f6f8",
                minWidth: 100,
                borderLeft: `4px solid ${STATUS_COLOR[s]}`,
              }}
            >
              <div style={{ fontSize: 11, color: "#666" }}>
                {STATUS_LABELS[s]}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {(counts?.[s] ?? 0).toLocaleString()}
              </div>
            </div>
          ),
        )}
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "#fff7ed",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 11, color: "#666" }}>unmatched raw</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {(counts?.unmatched ?? 0).toLocaleString()}
          </div>
        </div>
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "#eef2ff",
            minWidth: 100,
          }}
        >
          <div style={{ fontSize: 11, color: "#666" }}>raw 합계</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {(counts?.rawTotal ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 구간 + 워커 큐 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>구간</span>
        <select
          value={kickoffScope}
          onChange={(e) =>
            setKickoffScope(e.target.value as "upcoming" | "past" | "all")
          }
          style={{ ...inputStyle, minWidth: 220 }}
        >
          <option value="all">전체 (kickoff 예정·과거)</option>
          <option value="upcoming">예정·진행 (kickoff ≥ 지금 또는 미정)</option>
          <option value="past">미처리(과거) · kickoff 시각 경과</option>
        </select>

        <button
          type="button"
          onClick={() => void runMatcher()}
          disabled={runBusy}
          style={btnPrimary}
          title="전체(또는 탭에 맞는 status) 재검사 — 운영 부담이 크면 limit 를 줄이세요"
        >
          {runBusy ? "요청 중…" : "매칭 큐에 넣기(전체 검사)"}
        </button>
        <button
          type="button"
          onClick={() => void syncMappingRowsFromRaw()}
          disabled={syncBusy}
          style={btnGhost}
          title="CrawlerRawMatch 에만 있고 CrawlerMatchMapping 이 없는 행에 pending 매핑 생성"
        >
          {syncBusy ? "동기화…" : "raw→매핑 행 동기화"}
        </button>
        {syncHint && (
          <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>{syncHint}</span>
        )}
        {runResult && (
          <span style={{ fontSize: 11, color: "#444" }}>
            {isRunMatcherQueued(runResult) ? (
              <>
                {runResult.message}
                {runResult.jobId ? ` · job ${runResult.jobId}` : ""}
              </>
            ) : (
              <>
                scanned={runResult.scanned} auto={runResult.auto} pending=
                {runResult.pending} ({runResult.durationMs}ms)
              </>
            )}
          </span>
        )}

        <button type="button" onClick={() => void refresh()} style={btnGhost}>
          새로고침
        </button>
        {loading && (
          <span style={{ fontSize: 11, color: "#666" }}>loading…</span>
        )}
      </div>

      {/* 종목 pill — 기본 축구, 전체는 명시 선택 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginRight: 4 }}>
          종목
        </span>
        {QUICK_SPORT_PILLS.map((p) => {
          const active = sportFilter === p.slug;
          return (
            <button
              key={p.slug}
              type="button"
              onClick={() => {
                setSportFilter(p.slug);
                setLeagueFilter("");
              }}
              style={active ? pillActive : pillBase}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setSportFilter("");
            setLeagueFilter("");
          }}
          style={sportFilter === "" ? pillActive : pillBase}
        >
          전체
        </button>
        {(facets?.sports ?? [])
          .filter((s) => {
            const slug = (s.internalSport || s.sourceSport).trim();
            return (
              slug &&
              !QUICK_SPORT_PILLS.some((p) => p.slug === slug)
            );
          })
          .slice(0, 8)
          .map((s) => {
            const slug = (s.internalSport || s.sourceSport).trim();
            const active = sportFilter === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  setSportFilter(slug);
                  setLeagueFilter("");
                }}
                style={active ? pillActive : pillBase}
              >
                {slug}
                <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: 11 }}>
                  {" "}
                  ({s.count})
                </span>
              </button>
            );
          })}
      </div>

      {/* 목록 탭: 대기 / 매칭됨 / 미분류 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        {LIST_TAB_META.map((t) => {
          const active = listStatusTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={t.hint}
              onClick={() => setListStatusTab(t.id)}
              style={active ? pillActive : pillBase}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 리그 · 검색 (좌·우 목록 공통 필터) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "#555" }}>league</span>
        <select
          value={leagueFilter}
          onChange={(e) => setLeagueFilter(e.target.value)}
          style={{ ...inputStyle, minWidth: 200 }}
        >
          <option value="">(전체 리그)</option>
          {(facets?.leagues ?? [])
            .filter(
              (l) =>
                !sportFilter.trim() || l.sourceSport === sportFilter.trim(),
            )
            .map((l) => (
              <option
                key={`${l.sourceSport}::${l.leagueSlug}`}
                value={l.leagueSlug}
              >
                {l.leagueSlug} ({l.count})
              </option>
            ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void refresh();
            }
          }}
          placeholder="팀 / 리그 / eventId (좌·우 동시 필터)"
          style={{ ...inputStyle, minWidth: 240, flex: 1 }}
        />
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            background: "#fee",
            border: "1px solid #fbb",
            marginBottom: 10,
            borderRadius: 6,
            color: "#a00",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
      </div>

      {/* 2-pane: 부모 flex 높이 안에서만 자라며, 각 열은 내부 overflow 로만 스크롤 (dvh 고정 금지) */}
      <div
        style={{
          display: "grid",
          /** 좌(크롤) 조금 더 넓게 — 카드 가로 여유 */
          gridTemplateColumns: "minmax(300px, 1.18fr) minmax(280px, 1fr)",
          /** auto 행이면 콘텐츠 높이로만 커져 flex 안에서 스크롤이 안 생김 */
          gridTemplateRows: "minmax(0, 1fr)",
          gap: 10,
          alignItems: "stretch",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
          flex: "1 1 0%",
          minHeight: 0,
          minWidth: 0,
        }}
      >
        {/* 왼쪽: 크롤러 매칭 — 밝은 패널 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0%",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
            background: "#fff",
            borderRight: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: "10px 14px",
              background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
              크롤러 원본 · 매핑
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.45 }}>
              <strong>종목 → 리그</strong>로 묶고, 안에서는 <strong>kickoff → 리그 → 경기 id</strong> 순(크롤
              픽스처 목록에 가깝게)입니다. 한 줄은 <strong>매핑 행</strong>(raw + 매칭 상태)입니다. 대기·거부
              카드에 오른쪽 provider 카드를 놓으면 확정됩니다.
            </div>
          </div>
          {/* 스크롤 루트는 flex 자식이 아닌 단일 overflow 블록이어야 긴 리스트가 확실히 스크롤됨 */}
          <div
            style={{
              flex: "1 1 0%",
              minHeight: 0,
              overflow: "auto",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              padding: "10px 12px 12px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          {items.length === 0 && !loading && (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#999",
                fontSize: 13,
                border: "1px dashed #ddd",
                borderRadius: 10,
              }}
            >
              표시할 경기가 없습니다. 종목·구간·검색 필터를 바꾸거나, 위의{" "}
              <strong>raw→매핑 행 동기화</strong> 후 새로고침 해 보세요.
              {(counts?.rawTotal ?? 0) > 0 &&
                (counts?.total ?? 0) === 0 &&
                listStatusTab === "pending" && (
                  <>
                    <br />
                    <span style={{ fontSize: 12, color: "#b45309" }}>
                      raw 합계는 있는데 대기 탭이 비면: 과거 ingest 는 매핑 행을 안
                      만들었을 수 있습니다. 동기화 버튼으로 pending 행을 만든 뒤 다시
                      조회하세요.
                    </span>
                  </>
                )}
              {kickoffScope === "upcoming" && (
                <>
                  <br />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>
                    과거에 열린 경기만 크롤되었다면, 위 구간을「전체」또는「미처리(과거)」로
                    바꾸면 보입니다.
                  </span>
                </>
              )}
            </div>
          )}
          {groupMappingsBySportThenLeague(items).map((sg) => (
            <CountrySection
              key={sg.sportKey}
              label={sg.sportLabel}
              flag={null}
              count={sg.itemCount}
              defaultOpen={true}
            >
              {sg.leagues.map((lg) => (
                <div key={lg.leagueKey}>
                  <ProviderCountryGroup
                    label={lg.leagueLabel}
                    count={lg.items.length}
                    nestLevel={1}
                  >
                    {lg.items.map((r) => (
                      <MappingCard
                        key={r.id}
                        row={r}
                        dragOver={dragOverId === r.id}
                        onDragEnter={() => setDragOverId(r.id)}
                        onDragLeave={() => setDragOverId(null)}
                        onDrop={(ev) => void handleDropConfirm(r, ev)}
                        quickConfirming={quickConfirming === r.id}
                        onOpenConfirm={() => setConfirmTarget(r)}
                        onReject={() => void actionReject(r)}
                        onReopen={() => void actionReopen(r)}
                        onSaveRawLabel={saveRawLabel}
                      />
                    ))}
                  </ProviderCountryGroup>
                </div>
              ))}
            </CountrySection>
          ))}
          <div style={{ fontSize: 11, color: "#888", paddingTop: 4 }}>
            {items.length.toLocaleString()} / {total.toLocaleString()} 건
          </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: provider 카탈로그 — 열마다 스크롤 루트 분리 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0%",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <ProviderPoolPanel
            sport={sportFilter}
            leagueSlug={leagueFilter}
            kickoffScope={kickoffScope}
            searchQuery={query}
          />
        </div>
      </div>

      {confirmTarget && (
        <ConfirmCandidateModal
          target={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onDone={async () => {
            setConfirmTarget(null);
            await Promise.all([refresh(), refreshStats()]);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 매칭 카드 (왼쪽 리스트 아이템)
// ────────────────────────────────────────────────────────────
function MappingCard({
  row,
  dragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  quickConfirming,
  onOpenConfirm,
  onReject,
  onReopen,
  onSaveRawLabel,
}: {
  row: MatchMapping;
  dragOver: boolean;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (ev: ProviderEvent) => void;
  quickConfirming: boolean;
  onOpenConfirm: () => void;
  onReject: () => void;
  onReopen: () => void;
  onSaveRawLabel: (
    row: MatchMapping,
    field: "home" | "away" | "league",
    value: string,
  ) => Promise<void>;
}) {
  // 왼쪽 LEFT 셀 인라인 편집 상태 (홈/원정/리그)
  const [editField, setEditField] = useState<null | "home" | "away" | "league">(
    null,
  );
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const startEdit = (f: "home" | "away" | "league") => {
    const v =
      f === "home"
        ? row.rawHomeName
        : f === "away"
          ? row.rawAwayName
          : row.rawMatch?.rawLeagueLabel;
    setDraft(v ?? "");
    setEditField(f);
  };
  const cancelEdit = () => {
    setEditField(null);
    setDraft("");
  };
  const saveEdit = async () => {
    if (!editField) return;
    setSaving(true);
    try {
      await onSaveRawLabel(row, editField, draft);
      setEditField(null);
      setDraft("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };
  const canDrop = row.status === "pending" || row.status === "rejected";
  const countryKo =
    row.providerCountryKo ??
    resolveCrawlerCountryKo(
      row.rawMatch?.rawCountryLabel,
      row.rawMatch?.rawLeagueSlug ?? row.rawLeagueSlug,
    );
  const leagueLineTitle = crawlerLeagueContextTitle(
    row.providerCountryKo,
    row.rawMatch?.rawCountryLabel,
    row.rawMatch?.rawLeagueSlug ?? row.rawLeagueSlug,
    row.rawMatch?.rawLeagueLabel ?? row.rawLeagueSlug,
  );
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canDrop) return;
    if (Array.from(e.dataTransfer.types).includes(DND_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!canDrop) return;
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData(DND_MIME);
      if (!raw) return;
      const ev = JSON.parse(raw) as ProviderEvent;
      onDrop(ev);
    } catch {
      // ignore
    }
  };

  return (
    <div
      onDragEnter={canDrop ? onDragEnter : undefined}
      onDragLeave={canDrop ? onDragLeave : undefined}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        border: dragOver ? "2px dashed #2563eb" : "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 10,
        background: dragOver ? "#eff6ff" : "#fff",
        display: "grid",
        // status 는 컨텐츠에 맞추고, raw 팀은 최대한 넓게(2fr), provider 는 좁게(minmax),
        // 작업 컬럼은 자동. 이렇게 하면 긴 팀 이름이 잘려서 연필만 보이는 현상이 사라짐.
        gridTemplateColumns:
          "minmax(88px, auto) minmax(0, 3fr) minmax(140px, 1.25fr) minmax(104px, auto)",
        gap: 12,
        alignItems: "start",
        transition: "background .12s, border .12s",
      }}
    >
      {/* 상태 badge */}
      <div>
        <span
          style={{
            display: "inline-block",
            padding: "3px 9px",
            borderRadius: 999,
            background: STATUS_COLOR[row.status],
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {STATUS_LABELS[row.status]}
        </span>
        <div style={{ fontSize: 10, color: "#888", marginTop: 4 }}>
          {row.internalSportSlug || row.sourceSportSlug || "-"}
        </div>
        {row.matchedVia && (
          <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
            via {row.matchedVia}
          </div>
        )}
      </div>

      {/* raw 경기 (홈 vs 원정 + 로고 + 인라인 편집) */}
      <div style={{ minWidth: 0 }}>
        {/* 리그 라벨 줄 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            minWidth: 0,
          }}
        >
          {row.sourceCountryFlag && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicAssetUrl(row.sourceCountryFlag) ?? ""}
              alt={countryKo ? `${countryKo} 국기` : "국가 국기"}
              title={countryKo ?? undefined}
              width={18}
              height={12}
              style={{
                borderRadius: 2,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          )}
          {editField === "league" ? (
            <InlineEditor
              value={draft}
              onChange={setDraft}
              onCancel={cancelEdit}
              onSave={saveEdit}
              saving={saving}
              placeholder={row.rawLeagueSlug ?? "리그 한글명"}
            />
          ) : (
            <>
              {countryKo ? (
                <span
                  style={{
                    color: "#334155",
                    fontSize: 11,
                    fontWeight: 600,
                    flexShrink: 0,
                    maxWidth: "42%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={leagueLineTitle}
                >
                  {countryKo}
                </span>
              ) : null}
              {countryKo ? (
                <span style={{ color: "#cbd5e1", fontSize: 11, flexShrink: 0 }} aria-hidden>
                  ·
                </span>
              ) : null}
              <span
                style={{
                  color: "#666",
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
                title={leagueLineTitle}
              >
                {row.rawMatch?.rawLeagueLabel ?? row.rawLeagueSlug ?? "-"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit("league");
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={pencilBtn}
                title="리그명 수정 (한글)"
              >
                ✏
              </button>
            </>
          )}
        </div>

        {/* 홈/원정 — 세로로 쌓아서 각 팀 전체 행 너비를 사용 (이름이 충분히 보이도록) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 4,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 14,
                fontSize: 9,
                fontWeight: 700,
                color: "#94a3b8",
                flexShrink: 0,
                textAlign: "center",
              }}
            >
              H
            </span>
            <EditableRawChip
              name={row.rawHomeName}
              logo={row.sourceHomeLogo}
              confirmed={row.sourceHomeConfirmed}
              editing={editField === "home"}
              draft={draft}
              onChangeDraft={setDraft}
              onStart={() => startEdit("home")}
              onCancel={cancelEdit}
              onSave={saveEdit}
              saving={saving && editField === "home"}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 14,
                fontSize: 9,
                fontWeight: 700,
                color: "#94a3b8",
                flexShrink: 0,
                textAlign: "center",
              }}
            >
              A
            </span>
            <EditableRawChip
              name={row.rawAwayName}
              logo={row.sourceAwayLogo}
              confirmed={row.sourceAwayConfirmed}
              editing={editField === "away"}
              draft={draft}
              onChangeDraft={setDraft}
              onStart={() => startEdit("away")}
              onCancel={cancelEdit}
              onSave={saveEdit}
              saving={saving && editField === "away"}
            />
          </div>
        </div>
        {row.pairedLocaleRaw ? (
          <div
            style={{
              marginTop: 6,
              padding: "6px 8px",
              borderRadius: 6,
              background: "#f1f5f9",
              fontSize: 11,
              color: "#334155",
              lineHeight: 1.45,
            }}
            title="동일 경기의 다른 로케일 크롤(한글 표시용)"
          >
            <span style={{ fontWeight: 700, color: "#64748b" }}>
              [{row.pairedLocaleRaw.sourceLocale}]
            </span>{" "}
            {row.pairedLocaleRaw.rawHomeName ?? "—"} vs{" "}
            {row.pairedLocaleRaw.rawAwayName ?? "—"}
            {row.pairedLocaleRaw.rawLeagueLabel ? (
              <>
                {" "}
                · {row.pairedLocaleRaw.rawLeagueLabel}
              </>
            ) : null}
            {row.pairedLocaleRaw.rawCountryLabel ? (
              <>
                {" "}
                · {row.pairedLocaleRaw.rawCountryLabel}
              </>
            ) : null}
          </div>
        ) : null}
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
          kickoff {fmtDate(row.rawKickoffUtc)}
          {row.rawMatch?.rawStatusText
            ? ` · ${row.rawMatch.rawStatusText}`
            : ""}
        </div>
        {row.reason && (
          <div style={{ fontSize: 11, color: "#a60", marginTop: 2 }}>
            ⚠ {row.reason}
          </div>
        )}
        {row.note && (
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
            📝 {row.note}
          </div>
        )}
      </div>

      {/* provider 매칭 (있으면) */}
      <div style={{ fontSize: 12 }}>
        {row.providerExternalEventId ? (
          <>
            <div style={{ fontFamily: "monospace", color: "#366" }}>
              #{row.providerExternalEventId}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              <TeamChip
                name={row.providerHomeKoreanName ?? row.providerHomeName}
                logo={row.providerHomeLogo}
                small
              />
              <span style={{ color: "#bbb" }}>·</span>
              <TeamChip
                name={row.providerAwayKoreanName ?? row.providerAwayName}
                logo={row.providerAwayLogo}
                small
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#888",
                marginTop: 3,
                fontFamily: "monospace",
              }}
            >
              {row.providerLeagueSlug || "-"} · Δ{fmtDelta(row.kickoffDeltaSeconds)}
            </div>
          </>
        ) : (
          <div style={{ color: "#bbb" }}>
            — 오른쪽 카드를 드래그
          </div>
        )}
      </div>

      {/* 작업 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {quickConfirming && (
          <div style={{ fontSize: 11, color: "#2563eb" }}>확정 중…</div>
        )}
        {(row.status === "pending" || row.status === "rejected") && (
          <>
            <button
              type="button"
              onClick={onOpenConfirm}
              style={{ ...btnPrimary, fontSize: 11, padding: "4px 8px" }}
            >
              후보 검색 확정
            </button>
            {row.status === "pending" && (
              <button
                type="button"
                onClick={onReject}
                style={{ ...btnGhost, fontSize: 11, padding: "4px 8px" }}
              >
                거부
              </button>
            )}
          </>
        )}
        {(row.status === "auto" || row.status === "confirmed") && (
          <button
            type="button"
            onClick={onReopen}
            style={{ ...btnGhost, fontSize: 11, padding: "4px 8px" }}
          >
            대기로
          </button>
        )}
      </div>
    </div>
  );
}

function CountrySection({
  label,
  flag,
  count,
  defaultOpen = true,
  children,
}: {
  label: string;
  flag: string | null;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          background: "#f8fafc",
          border: "none",
          borderBottom: open ? "1px solid #e5e7eb" : "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          color: "#1f2937",
          textAlign: "left",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 12,
            textAlign: "center",
            color: "#94a3b8",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.12s",
          }}
        >
          ▶
        </span>
        {flag && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicAssetUrl(flag) ?? ""}
            alt=""
            width={22}
            height={14}
            style={{ borderRadius: 2, objectFit: "cover" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <span>{label}</span>
        <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
          {count}
        </span>
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: 8,
            minWidth: 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function TeamChip({
  name,
  logo,
  confirmed,
  small,
}: {
  name: string | null;
  logo: string | null;
  confirmed?: boolean;
  small?: boolean;
}) {
  const size = small ? 16 : 22;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        minWidth: 0,
        maxWidth: small ? 150 : 220,
      }}
    >
      {logo ? (
        <img
          src={publicAssetUrl(logo) ?? ""}
          alt=""
          width={size}
          height={size}
          style={{ borderRadius: 3, background: "#f4f4f4", objectFit: "contain" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span
          style={{
            display: "inline-block",
            width: size,
            height: size,
            borderRadius: 3,
            background: "#eee",
          }}
        />
      )}
      <span
        style={{
          fontWeight: small ? 500 : 600,
          fontSize: small ? 11 : 13,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={name ?? undefined}
      >
        {name || "-"}
      </span>
      {confirmed && (
        <span
          title="팀 매핑 confirmed"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "#17a673",
          }}
        />
      )}
    </span>
  );
}

/**
 * 왼쪽(raw) 경기 카드의 팀 칩 - 로고 + 한글명 + 연필 버튼.
 * 이름을 클릭하면 인라인 편집으로 전환. 편집 중에는 드래그가 동작하지 않도록 stopPropagation.
 * 로고가 긴 팀 이름에 겹치지 않도록 `flexShrink: 0` + `minWidth: 0` 적용.
 */
function EditableRawChip({
  name,
  logo,
  confirmed,
  editing,
  draft,
  onChangeDraft,
  onStart,
  onCancel,
  onSave,
  saving,
}: {
  name: string | null;
  logo: string | null;
  confirmed?: boolean;
  editing: boolean;
  draft: string;
  onChangeDraft: (v: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const size = 22;
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
        flex: 1,
        width: "100%",
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicAssetUrl(logo) ?? ""}
          alt=""
          width={size}
          height={size}
          style={{
            width: size,
            height: size,
            borderRadius: 3,
            background: "#f4f4f4",
            objectFit: "contain",
            flexShrink: 0,
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span
          style={{
            display: "inline-block",
            width: size,
            height: size,
            borderRadius: 3,
            background: "#eee",
            flexShrink: 0,
          }}
        />
      )}
      {editing ? (
        <InlineEditor
          value={draft}
          onChange={onChangeDraft}
          onCancel={onCancel}
          onSave={onSave}
          saving={saving}
          placeholder={name ?? "한글명"}
        />
      ) : (
        <>
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              flex: 1,
            }}
            title={name ?? undefined}
          >
            {name || "-"}
          </span>
          {confirmed && (
            <span
              title="팀 매핑 confirmed"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: "#17a673",
                flexShrink: 0,
              }}
            />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={pencilBtn}
            title="한글명 수정 (크롤러 번역 소스)"
          >
            ✏
          </button>
        </>
      )}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// provider 카드 기준 → 크롤 raw 경기 자동 후보 (점수·이유)
// ────────────────────────────────────────────────────────────
function CrawlSuggestModal({
  ev,
  sourceSite,
  onClose,
}: {
  ev: ProviderEvent;
  sourceSite: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<SuggestCrawlCandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        apiMatch: {
          id: ev.id,
          home: ev.home ?? "",
          away: ev.away ?? "",
          sport: { slug: ev.sport },
          league: { slug: ev.leagueSlug ?? "" },
        },
        limit: 5,
        maxScan: 4000,
      };
      if (sourceSite.trim()) body.sourceSite = sourceSite.trim();
      const r = await apiFetch<SuggestCrawlCandidatesResponse>(
        "/hq/crawler/matches/suggest-crawl-candidates",
        { method: "POST", body: JSON.stringify(body) },
      );
      setData(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "후보 추천 요청 실패");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ev, sourceSite]);

  useEffect(() => {
    void load();
  }, [load]);

  const tierColor: Record<CrawlSuggestCandidate["tier"], string> = {
    strong: "#15803d",
    review: "#a16207",
    low: "#94a3b8",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "min(720px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              크롤 raw 후보 추천 (자동 감별)
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
              <strong>{ev.home}</strong>
              <span style={{ color: "#888" }}> vs </span>
              <strong>{ev.away}</strong>
              <span style={{ color: "#aaa" }}>
                {" · "}
                {ev.sport}
                {ev.leagueSlug && ` · ${ev.leagueSlug}`}
              </span>
            </div>
            <div
              style={{ fontSize: 11, color: "#888", marginTop: 4, fontFamily: "monospace" }}
            >
              provider event #{ev.id}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button type="button" onClick={() => void load()} style={btnGhost}>
              ↻ 다시
            </button>
            <button type="button" onClick={onClose} style={btnGhost}>
              닫기
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "12px 18px" }}>
          {loading && (
            <div style={{ fontSize: 13, color: "#888", padding: 20, textAlign: "center" }}>
              후보 계산 중…
            </div>
          )}
          {err && (
            <div
              style={{
                fontSize: 12,
                color: "#b91c1c",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              {err}
            </div>
          )}
          {!loading && data && (
            <>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
                스캔 raw{" "}
                <strong>{data.scanned.toLocaleString()}</strong>건 · 확정 팀 매핑{" "}
                <strong>{data.confirmedMappingsUsed.toLocaleString()}</strong>건 · 임계값
                강함 ≥{data.thresholds.strong} / 검토 ≥{data.thresholds.review}
              </div>
              {data.candidates.length === 0 ? (
                <div style={{ fontSize: 13, color: "#999", textAlign: "center", padding: 24 }}>
                  조건에 맞는 크롤 후보가 없습니다. 리그·종목 slug 가 DB raw 와 일치하는지,
                  수집 사이트 필터를 확인해 보세요.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.candidates.map((c) => (
                    <div
                      key={c.crawlMatchId}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 10,
                        background: c.suggestedFold ? "#f8fafc" : "#fff",
                        opacity: c.suggestedFold ? 0.92 : 1,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          raw id: {c.crawlMatchId}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: tierColor[c.tier],
                          }}
                        >
                          {c.score}점 ({c.tier}
                          {c.suggestedFold ? " · 접기 권장" : ""})
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                        <div>
                          홈 {c.home.crawlName}{" "}
                          <span style={{ color: "#94a3b8" }}>
                            ({c.home.matchType} +{c.home.score})
                          </span>
                        </div>
                        <div>
                          원정 {c.away.crawlName}{" "}
                          <span style={{ color: "#94a3b8" }}>
                            ({c.away.matchType} +{c.away.score})
                          </span>
                        </div>
                      </div>
                      {c.reason.length > 0 && (
                        <ul
                          style={{
                            margin: "8px 0 0",
                            paddingLeft: 18,
                            fontSize: 11,
                            color: "#64748b",
                          }}
                        >
                          {c.reason.map((line, i) => (
                            <li key={`${c.crawlMatchId}-r-${i}`}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid #eee",
            background: "#fafafa",
            fontSize: 11,
            color: "#64748b",
          }}
        >
          자동 추천일 뿐 확정은 하지 않습니다. 왼쪽 카드에 드래그하거나 수동 확정 모달을
          사용하세요.
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 오른쪽: provider catalog event 풀 (드래그 소스)
// ────────────────────────────────────────────────────────────
function ProviderPoolPanel({
  sport,
  leagueSlug,
  kickoffScope,
  searchQuery,
}: {
  sport: string;
  leagueSlug: string;
  kickoffScope: "upcoming" | "past" | "all";
  searchQuery: string;
}) {
  const [events, setEvents] = useState<ProviderEvent[]>([]);
  const [poolTotal, setPoolTotal] = useState(0);
  const [catalogTotalEvents, setCatalogTotalEvents] = useState<number | null>(
    null,
  );
  const [catalogSportSlugs, setCatalogSportSlugs] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onlyUnused, setOnlyUnused] = useState(true);
  const [suggestSourceSite, setSuggestSourceSite] = useState("");
  const [crawlSuggestEv, setCrawlSuggestEv] = useState<ProviderEvent | null>(
    null,
  );
  const listLenRef = useRef(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listLenRef.current = events.length;
  }, [events.length]);

  /** fromSkip=0 이면 목록 교체, 그보다 크면 이어 붙임(페이지네이션). */
  const load = useCallback(
    async (fromSkip: number) => {
      setLoading(true);
      setErr(null);
      try {
        const qp = new URLSearchParams();
        if (sport.trim()) qp.set("sport", sport.trim());
        if (leagueSlug.trim()) qp.set("leagueSlug", leagueSlug.trim());
        if (searchQuery.trim()) qp.set("q", searchQuery.trim());
        if (onlyUnused) qp.set("onlyUnused", "1");
        qp.set("kickoffScope", kickoffScope);
        qp.set("limit", "400");
        qp.set("skip", String(fromSkip));
        const r = await apiFetch<ProviderPoolResponse>(
          `/hq/crawler/matches/provider-pool?${qp.toString()}`,
        );
        setPoolTotal(r.total);
        setCatalogTotalEvents(
          typeof r.catalogTotalEvents === "number" ? r.catalogTotalEvents : null,
        );
        setCatalogSportSlugs(
          Array.isArray(r.catalogSportSlugs) ? r.catalogSportSlugs : [],
        );
        setHasMore(Boolean(r.hasMore));
        if (fromSkip === 0) {
          setEvents(r.events);
        } else {
          setEvents((prev) => [...prev, ...r.events]);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "풀 조회 실패");
      } finally {
        setLoading(false);
      }
    },
    [sport, leagueSlug, searchQuery, onlyUnused, kickoffScope],
  );

  /** 팀/리그 한글명 upsert 후 카드 state 낙관적 업데이트. */
  const saveTeamKorean = useCallback(
    async (ev: ProviderEvent, side: "home" | "away", koreanName: string) => {
      const externalId = side === "home" ? ev.homeId : ev.awayId;
      const originalName = side === "home" ? ev.home : ev.away;
      if (externalId == null) throw new Error("externalId 없음");
      const saved = await apiFetch<{ id: string }>(
        `/hq/crawler/matches/provider-team-alias`,
        {
          method: "PATCH",
          body: JSON.stringify({
            sport: ev.sport,
            externalId: String(externalId),
            originalName: originalName ?? undefined,
            koreanName: koreanName.trim(),
          }),
        },
      );
      setEvents((curr) =>
        curr.map((e) => {
          if (side === "home" && e.homeId === externalId && e.sport === ev.sport) {
            return {
              ...e,
              homeKoreanName: koreanName.trim() || null,
              homeAliasId: saved.id,
            };
          }
          if (side === "away" && e.awayId === externalId && e.sport === ev.sport) {
            return {
              ...e,
              awayKoreanName: koreanName.trim() || null,
              awayAliasId: saved.id,
            };
          }
          // 같은 팀이 다른 경기에도 있을 수 있음 -> home/away 양방향 체크
          const patch: Partial<ProviderEvent> = {};
          if (e.sport === ev.sport && e.homeId === externalId) {
            patch.homeKoreanName = koreanName.trim() || null;
            patch.homeAliasId = saved.id;
          }
          if (e.sport === ev.sport && e.awayId === externalId) {
            patch.awayKoreanName = koreanName.trim() || null;
            patch.awayAliasId = saved.id;
          }
          return Object.keys(patch).length > 0 ? { ...e, ...patch } : e;
        }),
      );
    },
    [],
  );

  const saveLeagueKorean = useCallback(
    async (ev: ProviderEvent, koreanName: string) => {
      if (!ev.leagueSlug) throw new Error("leagueSlug 없음");
      const saved = await apiFetch<{ id: string }>(
        `/hq/crawler/matches/provider-league-alias`,
        {
          method: "PATCH",
          body: JSON.stringify({
            sport: ev.sport,
            slug: ev.leagueSlug,
            originalName: ev.leagueSlug,
            koreanName: koreanName.trim(),
          }),
        },
      );
      setEvents((curr) =>
        curr.map((e) =>
          e.sport === ev.sport && e.leagueSlug === ev.leagueSlug
            ? {
                ...e,
                leagueKoreanName: koreanName.trim() || null,
                leagueAliasId: saved.id,
              }
            : e,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0%",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: "10px 14px",
          background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            Provider 카탈로그
          </div>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
            {events.length.toLocaleString()}
            {poolTotal > 0 && (
              <span style={{ color: "#475569", fontWeight: 500 }}>
                {" "}
                / {poolTotal.toLocaleString()} 건
              </span>
            )}
            {hasMore ? " · 더 있음" : ""}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            marginTop: 4,
            lineHeight: 1.45,
          }}
        >
          <strong>종목 → 리그</strong>로 묶고, 안에서는 <strong>kickoff 순</strong>(왼쪽과 같은 기준)입니다.
          왼쪽과 동일한 구간·종목·리그·검색어로 풀을 불러오며, 카드를 왼쪽으로 드래그하면 확정됩니다.
          {kickoffScope === "upcoming"
            ? " 예정·진행 이벤트만."
            : kickoffScope === "past"
              ? " 과거 kickoff 이벤트만."
              : " 예정·과거 이벤트 전체."}
          {catalogTotalEvents !== null && catalogTotalEvents === 0 && (
            <span style={{ color: "#b45309", display: "block", marginTop: 4 }}>
              최근 24h 카탈로그 스냅샷에 이벤트가 없습니다. odds-api 스냅샷·bookmakers 설정을
              확인하세요.
            </span>
          )}
          {catalogTotalEvents !== null &&
            catalogTotalEvents > 0 &&
            sport.trim() &&
            !catalogSportSlugs.includes(sport.trim()) && (
              <span style={{ color: "#b45309", display: "block", marginTop: 4 }}>
                선택 종목「{sport}」는 카탈로그 sport 키에 없습니다. 축구는{" "}
                <code style={{ fontSize: 10 }}>soccer</code> /{" "}
                <code style={{ fontSize: 10 }}>football</code> 등 표기 차이가 있을 수 있습니다. (
                {catalogSportSlugs.slice(0, 8).join(", ")}
                {catalogSportSlugs.length > 8 ? "…" : ""})
              </span>
            )}
          {!sport.trim() && (
            <span style={{ color: "#b45309", display: "block", marginTop: 4 }}>
              종목이 「전체」이면 여러 스포츠가 섞여 앞쪽 일부만 보일 수 있습니다.
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          background: "#fafafa",
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#555",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={onlyUnused}
            onChange={(e) => setOnlyUnused(e.target.checked)}
          />
          미사용만
        </label>
        <label style={{ fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>
          후보 sourceSite
        </label>
        <input
          value={suggestSourceSite}
          onChange={(e) => setSuggestSourceSite(e.target.value)}
          placeholder="예: livesport"
          style={{ ...inputStyle, minWidth: 120, flex: 1, maxWidth: 260 }}
        />
        <button
          type="button"
          onClick={() => void load(0)}
          style={btnGhost}
          title="첫 페이지부터 다시"
        >
          ↻ 새로고침
        </button>
      </div>
      {err && (
        <div
          style={{
            fontSize: 12,
            color: "#a00",
            padding: "8px 14px",
            flexShrink: 0,
            borderBottom: "1px solid #fecaca",
            background: "#fef2f2",
          }}
        >
          {err}
        </div>
      )}

      <div
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflow: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          padding: "10px 12px 12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        {loading && events.length === 0 && (
          <div style={{ fontSize: 12, color: "#888", textAlign: "center", padding: 16 }}>
            loading…
          </div>
        )}
        {!loading && events.length === 0 && (
          <div
            style={{
              fontSize: 12,
              color: "#888",
              textAlign: "center",
              padding: 24,
              border: "1px dashed #ddd",
              borderRadius: 10,
              lineHeight: 1.55,
            }}
          >
            카드 없음 — 종목·구간·리그·검색어를 조정하거나{" "}
            <strong>미사용만</strong> 체크를 해제해 보세요.
            {catalogTotalEvents !== null &&
              catalogTotalEvents > 0 &&
              poolTotal === 0 && (
                <>
                  <br />
                  <span style={{ color: "#64748b" }}>
                    (카탈로그 원본은 {catalogTotalEvents.toLocaleString()}건 있으나 현재 필터
                    조합에선 0건입니다.)
                  </span>
                </>
              )}
          </div>
        )}
        {groupProviderBySportThenLeague(events).map((sg) => (
          <ProviderCountryGroup
            key={sg.sportKey}
            label={sg.sportLabel}
            count={sg.itemCount}
            nestLevel={0}
          >
            {sg.leagues.map((lg) => (
              <ProviderCountryGroup
                key={`${sg.sportKey}|${lg.leagueKey}`}
                label={lg.leagueLabel}
                count={lg.items.length}
                nestLevel={1}
              >
                {lg.items.map((ev) => (
                  <ProviderCard
                    key={ev.id}
                    ev={ev}
                    onSaveTeamKorean={saveTeamKorean}
                    onSaveLeagueKorean={saveLeagueKorean}
                    onCrawlSuggest={() => setCrawlSuggestEv(ev)}
                  />
                ))}
              </ProviderCountryGroup>
            ))}
          </ProviderCountryGroup>
        ))}
        {hasMore && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(listLenRef.current)}
            style={{
              ...btnGhost,
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              fontSize: 12,
            }}
          >
            {loading ? "불러오는 중…" : "더 불러오기 (최대 400건씩)"}
          </button>
        )}
        </div>
      </div>
      {crawlSuggestEv && (
        <CrawlSuggestModal
          ev={crawlSuggestEv}
          sourceSite={suggestSourceSite}
          onClose={() => setCrawlSuggestEv(null)}
        />
      )}
    </div>
  );
}

function ProviderCountryGroup({
  label,
  count,
  children,
  nestLevel = 0,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
  /** 0=종목, 1=리그(안쪽) */
  nestLevel?: 0 | 1;
}) {
  const [open, setOpen] = useState(true);
  const isNested = nestLevel === 1;
  return (
    <div
      style={{
        border: `1px solid ${isNested ? "#e2e8f0" : "#dbe1ef"}`,
        borderRadius: isNested ? 6 : 8,
        background: "#fff",
        overflow: "hidden",
        marginBottom: isNested ? 6 : 10,
        marginLeft: isNested ? 4 : 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: isNested ? "5px 7px" : "6px 8px",
          background: isNested ? "#f8fafc" : "#eef2ff",
          border: "none",
          borderBottom: open ? `1px solid ${isNested ? "#e2e8f0" : "#dbe1ef"}` : "none",
          cursor: "pointer",
          fontSize: isNested ? 11 : 12,
          fontWeight: 600,
          color: isNested ? "#334155" : "#1e3a8a",
          textAlign: "left",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 10,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 10,
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.12s",
          }}
        >
          ▶
        </span>
        <span>{label}</span>
        <span style={{ color: "#94a3b8", fontSize: isNested ? 10 : 11, fontWeight: 500 }}>
          {count}
        </span>
      </button>
      {open && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: isNested ? 5 : 6,
            minWidth: 0,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  ev,
  onSaveTeamKorean,
  onSaveLeagueKorean,
  onCrawlSuggest,
}: {
  ev: ProviderEvent;
  onSaveTeamKorean: (
    ev: ProviderEvent,
    side: "home" | "away",
    koreanName: string,
  ) => Promise<void>;
  onSaveLeagueKorean: (ev: ProviderEvent, koreanName: string) => Promise<void>;
  onCrawlSuggest: () => void;
}) {
  const [editing, setEditing] = useState<"home" | "away" | "league" | null>(
    null,
  );
  const [draftValue, setDraftValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (editing) {
      // 편집 중에는 드래그 금지
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(DND_MIME, JSON.stringify(ev));
  };

  const startEdit = (kind: "home" | "away" | "league") => {
    setEditing(kind);
    if (kind === "home") setDraftValue(ev.homeKoreanName ?? "");
    else if (kind === "away") setDraftValue(ev.awayKoreanName ?? "");
    else setDraftValue(ev.leagueKoreanName ?? "");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftValue("");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing === "league") {
        await onSaveLeagueKorean(ev, draftValue);
      } else {
        await onSaveTeamKorean(ev, editing, draftValue);
      }
      setEditing(null);
      setDraftValue("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      draggable={!editing}
      onDragStart={handleDragStart}
      title={editing ? "" : "왼쪽 크롤러 매칭 카드로 드래그하세요"}
      style={{
        border: ev.used ? "1px dashed #c7c7c7" : "1px solid #dbe1ef",
        borderRadius: 8,
        padding: 8,
        background: ev.used ? "#f5f5f5" : "#fff",
        cursor: editing ? "text" : "grab",
        opacity: ev.used ? 0.7 : 1,
        userSelect: editing ? "text" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#888",
          marginBottom: 4,
          gap: 6,
        }}
      >
        <span style={{ fontFamily: "monospace" }}>#{ev.id}</span>
        <span style={{ flexShrink: 0 }}>{ev.sport}</span>
        {ev.country ? (
          <span
            style={{
              fontSize: 10,
              color: "#64748b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
              maxWidth: 220,
            }}
            title={ev.country}
          >
            {ev.country}
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 0,
          flexWrap: "wrap",
        }}
      >
        <EditableTeamChip
          logo={ev.homeLogo}
          original={ev.home}
          koreanName={ev.homeKoreanName}
          editing={editing === "home"}
          draftValue={editing === "home" ? draftValue : ""}
          onChangeDraft={setDraftValue}
          onStart={() => startEdit("home")}
          onCancel={cancelEdit}
          onSave={save}
          saving={saving && editing === "home"}
        />
        <span style={{ color: "#bbb", fontSize: 11 }}>vs</span>
        <EditableTeamChip
          logo={ev.awayLogo}
          original={ev.away}
          koreanName={ev.awayKoreanName}
          editing={editing === "away"}
          draftValue={editing === "away" ? draftValue : ""}
          onChangeDraft={setDraftValue}
          onStart={() => startEdit("away")}
          onCancel={cancelEdit}
          onSave={save}
          saving={saving && editing === "away"}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#666",
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {editing === "league" ? (
          <InlineEditor
            value={draftValue}
            onChange={setDraftValue}
            onCancel={cancelEdit}
            onSave={save}
            saving={saving}
            placeholder={ev.leagueSlug ?? "한글 리그명"}
          />
        ) : (
          <>
            <span
              style={{
                fontFamily: ev.leagueKoreanName ? undefined : "monospace",
                color: ev.leagueKoreanName ? "#1f2937" : "#888",
                fontSize: 11,
                maxWidth: 240,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={ev.leagueSlug ?? undefined}
            >
              {ev.leagueKoreanName ?? ev.leagueSlug ?? "-"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEdit("league");
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={pencilBtn}
              title="리그 한글명 수정"
            >
              ✏
            </button>
          </>
        )}
      </div>
      {ev.leagueKoreanName && ev.leagueSlug && (
        <div
          style={{
            fontSize: 10,
            color: "#aaa",
            fontFamily: "monospace",
            marginTop: 1,
          }}
          title={ev.leagueSlug}
        >
          {ev.leagueSlug}
        </div>
      )}
      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
        {fmtDate(ev.date)}
        {ev.used && (
          <span style={{ color: "#c00", marginLeft: 6 }}>[사용 중]</span>
        )}
      </div>
      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          disabled={!ev.leagueSlug || !(ev.home ?? "").trim() || !(ev.away ?? "").trim()}
          onClick={(e) => {
            e.stopPropagation();
            onCrawlSuggest();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          title="이 provider 경기에 맞는 크롤 raw 후보를 점수순으로 조회"
          style={{
            ...btnGhost,
            width: "100%",
            fontSize: 11,
            padding: "6px 8px",
            opacity:
              !ev.leagueSlug || !(ev.home ?? "").trim() || !(ev.away ?? "").trim()
                ? 0.5
                : 1,
          }}
        >
          크롤 raw 후보 추천
        </button>
      </div>
    </div>
  );
}

/** 팀 이름 표시 + 인라인 수정. 한글명이 없으면 원어를 보여주고 ✏ 버튼으로 한글명을 입력할 수 있다. */
function EditableTeamChip({
  logo,
  original,
  koreanName,
  editing,
  draftValue,
  onChangeDraft,
  onStart,
  onCancel,
  onSave,
  saving,
}: {
  logo: string | null;
  original: string | null;
  koreanName: string | null;
  editing: boolean;
  draftValue: string;
  onChangeDraft: (v: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const size = 16;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flex: 1,
        minWidth: 0,
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicAssetUrl(logo) ?? ""}
          alt=""
          width={size}
          height={size}
          style={{
            borderRadius: 3,
            background: "#f4f4f4",
            objectFit: "contain",
            flexShrink: 0,
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span
          style={{
            display: "inline-block",
            width: size,
            height: size,
            borderRadius: 3,
            background: "#eee",
            flexShrink: 0,
          }}
        />
      )}
      {editing ? (
        <InlineEditor
          value={draftValue}
          onChange={onChangeDraft}
          onCancel={onCancel}
          onSave={onSave}
          saving={saving}
          placeholder={original ?? "한글명"}
        />
      ) : (
        <>
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              flex: 1,
            }}
            title={original ?? undefined}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: koreanName ? "#1f2937" : "#94a3b8",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {koreanName ?? original ?? "-"}
            </span>
            {koreanName && original && (
              <span
                style={{
                  fontSize: 9,
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {original}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={pencilBtn}
            title="한글명 수정"
          >
            ✏
          </button>
        </>
      )}
    </span>
  );
}

function InlineEditor({
  value,
  onChange,
  onCancel,
  onSave,
  saving,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  placeholder?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        flex: 1,
        minWidth: 0,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSave();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          padding: "2px 6px",
          fontSize: 11,
          flex: 1,
          minWidth: 60,
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        disabled={saving}
        style={{ ...pencilBtn, color: "#16a34a" }}
        title="저장 (Enter)"
      >
        {saving ? "…" : "✓"}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        style={{ ...pencilBtn, color: "#c00" }}
        title="취소 (Esc)"
      >
        ✕
      </button>
    </span>
  );
}

const pencilBtn: React.CSSProperties = {
  width: 18,
  height: 18,
  border: "none",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 11,
  padding: 0,
  flexShrink: 0,
};

// ────────────────────────────────────────────────────────────
// 스타일
// ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 12,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#fff",
};
const btnPrimary: React.CSSProperties = {
  padding: "5px 12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};
const btnGhost: React.CSSProperties = {
  padding: "5px 12px",
  background: "#f3f4f6",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

// ────────────────────────────────────────────────────────────
// 후보 검색 모달 (기존 로직 — 드래그가 어려운 경우용 fallback)
// ────────────────────────────────────────────────────────────
type CandidateEvent = {
  id: string;
  sport?: string | null;
  leagueSlug?: string | null;
  home?: string | null;
  away?: string | null;
  homeId?: string | number | null;
  awayId?: string | number | null;
  date?: string | null;
};

type CandidatesResponse = {
  mapping: MatchMapping;
  stored: CandidateEvent[];
  live: CandidateEvent[];
  hints: {
    sport: string | null;
    providerLeagueSlug: string | null;
    homeExternalId: string | null;
    awayExternalId: string | null;
    kickoffUtc: string | null;
    countrySlugHints?: string[];
  };
};

function ConfirmCandidateModal({
  target,
  onClose,
  onDone,
}: {
  target: MatchMapping;
  onClose: () => void;
  onDone: () => void;
}) {
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [selected, setSelected] = useState<CandidateEvent | null>(null);
  const [manualId, setManualId] = useState(target.providerExternalEventId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qp = new URLSearchParams();
      if (q.trim()) qp.set("q", q.trim());
      if (leagueFilter.trim()) qp.set("leagueSlug", leagueFilter.trim());
      qp.set("limit", "60");
      const r = await apiFetch<CandidatesResponse>(
        `/hq/crawler/matches/${target.id}/candidates?${qp.toString()}`,
      );
      setData(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "후보 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [target.id, q, leagueFilter]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  const submit = useCallback(
    async (eventId: string) => {
      const id = eventId.trim();
      if (!id) return;
      setSubmitting(true);
      try {
        await apiFetch(`/hq/crawler/matches/${target.id}/confirm`, {
          method: "PATCH",
          body: JSON.stringify({
            providerExternalEventId: id,
            providerLeagueSlug: selected?.leagueSlug ?? undefined,
            providerSportSlug: selected?.sport ?? undefined,
            note: note.trim() || undefined,
          }),
        });
        onDone();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "확정 실패");
        setSubmitting(false);
      }
    },
    [target.id, selected, note, onDone],
  );

  const rowsStored = data?.stored ?? [];
  const rowsLive = data?.live ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "min(1100px, 100%)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              후보 이벤트 선택 — 수동 확정
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              <strong>{target.rawHomeName}</strong>
              <span style={{ color: "#888" }}> vs </span>
              <strong>{target.rawAwayName}</strong>
              <span style={{ color: "#aaa" }}>
                {" · "}
                {target.sourceSportSlug}
                {target.rawLeagueSlug && ` · ${target.rawLeagueSlug}`}
                {target.rawKickoffUtc && ` · ${fmtDate(target.rawKickoffUtc)}`}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} style={btnGhost}>
            닫기
          </button>
        </div>

        <div
          style={{
            padding: "10px 18px",
            borderBottom: "1px solid #eee",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 12, color: "#555" }}>검색</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
            placeholder="팀명 / leagueSlug / eventId"
            style={{ ...inputStyle, minWidth: 220 }}
          />
          <label style={{ fontSize: 12, color: "#555" }}>leagueSlug</label>
          <input
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
            placeholder="예: england-premier-league"
            style={{ ...inputStyle, minWidth: 200 }}
          />
          <button type="button" onClick={() => void load()} style={btnPrimary}>
            {loading ? "조회 중…" : "다시 조회"}
          </button>
          {err && (
            <span style={{ color: "#c00", fontSize: 12 }}>{err}</span>
          )}
          {data?.hints?.countrySlugHints && data.hints.countrySlugHints.length > 0 && (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              catalog 국가 접두:{" "}
              <code style={{ fontSize: 10 }}>
                {data.hints.countrySlugHints.join(", ")}
              </code>
            </span>
          )}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "10px 18px" }}>
          <CandidateSection
            title={`저장된 후보 (pending 기록)`}
            rows={rowsStored}
            selected={selected}
            onSelect={(c) => {
              setSelected(c);
              setManualId(c.id);
            }}
            rawHome={target.rawHomeName}
            rawAway={target.rawAwayName}
          />
          <div style={{ height: 12 }} />
          <CandidateSection
            title={`catalog 실시간 제안 (${rowsLive.length}건)`}
            rows={rowsLive}
            selected={selected}
            onSelect={(c) => {
              setSelected(c);
              setManualId(c.id);
            }}
            rawHome={target.rawHomeName}
            rawAway={target.rawAwayName}
          />
          {!loading && rowsStored.length === 0 && rowsLive.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "#999",
                fontSize: 13,
              }}
            >
              후보 없음 — 검색어나 leagueSlug 로 다시 조회해 보세요.
              <br />
              직접 externalEventId 를 입력해 확정할 수도 있습니다.
            </div>
          )}
        </div>

        <div
          style={{
            padding: "12px 18px",
            borderTop: "1px solid #eee",
            background: "#fafafa",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: 12, color: "#555" }}>externalEventId</label>
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="예: 70311954"
            style={{
              ...inputStyle,
              minWidth: 180,
              fontFamily: "monospace",
            }}
          />
          <label style={{ fontSize: 12, color: "#555" }}>note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="수동 검수 메모 (선택)"
            style={{ ...inputStyle, minWidth: 220 }}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={btnGhost}>
              취소
            </button>
            <button
              type="button"
              onClick={() => void submit(manualId)}
              disabled={submitting || !manualId.trim()}
              style={{
                ...btnPrimary,
                opacity: submitting || !manualId.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? "확정 중…" : "이 이벤트로 확정"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateSection({
  title,
  rows,
  selected,
  onSelect,
  rawHome,
  rawAway,
}: {
  title: string;
  rows: CandidateEvent[];
  selected: CandidateEvent | null;
  onSelect: (c: CandidateEvent) => void;
  rawHome: string | null;
  rawAway: string | null;
}) {
  if (rows.length === 0) return null;
  const norm = (s: string | null | undefined) =>
    (s ?? "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  const homeN = norm(rawHome);
  const awayN = norm(rawAway);

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#666",
          fontWeight: 600,
          padding: "4px 0 8px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {rows.map((c) => {
          const isSel = selected?.id === c.id;
          const homeHit =
            (homeN && norm(c.home).includes(homeN)) ||
            (homeN && norm(c.away).includes(homeN));
          const awayHit =
            (awayN && norm(c.away).includes(awayN)) ||
            (awayN && norm(c.home).includes(awayN));
          const reversed =
            homeN &&
            awayN &&
            norm(c.home).includes(awayN) &&
            norm(c.away).includes(homeN);
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 120px 1fr 200px 140px 100px",
                gap: 8,
                padding: 8,
                borderTop: "1px solid #eee",
                cursor: "pointer",
                background: isSel ? "#eff6ff" : undefined,
                fontSize: 12,
              }}
            >
              <input
                type="radio"
                checked={isSel}
                onChange={() => onSelect(c)}
              />
              <span style={{ fontFamily: "monospace", color: "#366" }}>
                #{c.id}
              </span>
              <div>
                <strong>{c.home}</strong>
                <span style={{ color: "#888" }}> vs </span>
                <strong>{c.away}</strong>
                <div
                  style={{
                    fontSize: 10,
                    color: "#888",
                    fontFamily: "monospace",
                  }}
                >
                  home#{c.homeId ?? "?"} · away#{c.awayId ?? "?"}
                </div>
              </div>
              <span style={{ fontFamily: "monospace" }}>
                {c.leagueSlug ?? "—"}
              </span>
              <span>{fmtDate(c.date)}</span>
              <span>
                {reversed ? (
                  <span style={{ color: "#b45309" }}>홈/원정 뒤바뀜</span>
                ) : homeHit && awayHit ? (
                  <span style={{ color: "#047857" }}>양팀 일치</span>
                ) : homeHit || awayHit ? (
                  <span style={{ color: "#666" }}>한쪽 일치</span>
                ) : (
                  <span style={{ color: "#bbb" }}>—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

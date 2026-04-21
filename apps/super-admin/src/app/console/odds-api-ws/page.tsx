"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type ConnectionState = "idle" | "connecting" | "open" | "closed" | "error";
type MatchStatus = "live" | "prematch" | "finished" | "unknown";
type MatchStatusFilter = MatchStatus | "all";
type WsStatusFilter = "live" | "prematch" | "all";

type OddsApiAdminStatus = {
  configured: boolean;
  autoConnectEnabled: boolean;
  connectionState: ConnectionState;
  connectedAt: string | null;
  disconnectedAt: string | null;
  lastMessageAt: string | null;
  reconnectAttempts: number;
  lastSeq: number;
  lastError: string | null;
  welcome: Record<string, unknown> | null;
  filters: {
    sports: string[];
    markets: string[];
    bookmakers: string[];
    status: "live" | "prematch" | null;
  };
  counters: Record<string, number>;
  stateCount: number;
  sportCounts: Record<string, number>;
  bookieCounts: Record<string, number>;
  endpoint: string;
  enrichmentCount: number;
  sportLookup: Record<string, { count: number; fetchedAt: string | null }>;
  restCache?: {
    eventCacheSize?: number;
    listCacheSize?: number;
    bySportCacheSize?: number;
  };
};

type ServiceHealth = {
  checkedAt: string;
  checks: {
    id: string;
    label: string;
    ok: boolean;
    ms?: number;
    detail?: string;
  }[];
};

type OddsApiRawEvent = {
  sport: string;
  eventId: string;
  bookie: string;
  url?: string;
  markets: unknown;
  timestamp: number;
  seq: number;
  updatedAt: string;
  home: string | null;
  away: string | null;
  league: string | null;
  date: string | null;
  eventStatus: string | null;
  scores: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
};

type OddsApiRawResponse = {
  sport: string | null;
  bookie: string | null;
  total: number;
  events: OddsApiRawEvent[];
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

type AggregatedMatch = {
  matchId: string;
  sport: string;
  status: MatchStatus;
  startTime: string | null;
  league: { name: string | null; nameKr: string | null; logoUrl: string | null };
  home: { name: string | null; nameKr: string | null; logoUrl: string | null };
  away: { name: string | null; nameKr: string | null; logoUrl: string | null };
  scores: {
    home: number | null;
    away: number | null;
    periods: Record<string, { home: number; away: number }>;
  } | null;
  markets: {
    moneyline?: AggregatedMoneyline;
    handicap?: AggregatedHandicap;
    totals?: AggregatedTotals;
  };
  bookies: string[];
  bookieCount: number;
  url?: string;
  lastUpdatedMs: number;
};

type AggregatedMatchesResponse = {
  status: MatchStatusFilter;
  sport: string | null;
  total: number;
  matches: AggregatedMatch[];
};

type PublicPrematchSnapshot = {
  fetchedAt: string | null;
  payload: unknown;
};

type OddsApiDiscoveryItem = {
  id: string;
  name: string | null;
  slug: string | null;
};

type OddsApiDiscoveryResponse = {
  sports: OddsApiDiscoveryItem[];
  bookmakers: OddsApiDiscoveryItem[];
  selectedBookmakers: OddsApiDiscoveryItem[];
};

type CategoryOddsItem = {
  id: string;
  sport: string;
  home: string | null;
  away: string | null;
  league: string | null;
  date: string | null;
  status: string | null;
  odds: {
    home: number | null;
    draw: number | null;
    away: number | null;
    sourceBookmaker: string | null;
  };
};

type CategoryOddsResponse = {
  sport: string | null;
  page: number;
  pageSize: number;
  totalEvents: number;
  items: CategoryOddsItem[];
};

type ConfigForm = {
  apiKey: string;
  sportsCsv: string;
  marketsCsv: string;
  bookmakersCsv: string;
  status: WsStatusFilter;
  autoConnect: boolean;
};

const DEFAULT_FORM: ConfigForm = {
  apiKey: "",
  sportsCsv: "football,basketball",
  marketsCsv: "ML,Spread,Totals",
  bookmakersCsv: "Bet365,Sbobet",
  status: "all",
  autoConnect: true,
};

function parseCsv(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

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

function formatStatusLabel(state: ConnectionState) {
  switch (state) {
    case "open":
      return "연결됨";
    case "connecting":
      return "연결 중";
    case "closed":
      return "연결 종료";
    case "error":
      return "에러";
    default:
      return "대기";
  }
}

function badgeClass(ok: boolean) {
  return ok
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : "border-red-500/30 bg-red-500/10 text-red-300";
}

function valueClass(state: ConnectionState) {
  if (state === "open") return "text-emerald-300";
  if (state === "connecting") return "text-blue-300";
  if (state === "error") return "text-red-300";
  if (state === "closed") return "text-amber-300";
  return "text-zinc-200";
}

function marketSummary(match: AggregatedMatch) {
  const chunks: string[] = [];
  if (match.markets.moneyline) {
    const ml = match.markets.moneyline;
    chunks.push(
      `ML ${ml.home.toFixed(2)}${
        ml.draw ? ` / ${ml.draw.toFixed(2)}` : ""
      } / ${ml.away.toFixed(2)}`,
    );
  }
  if (match.markets.handicap) {
    const hd = match.markets.handicap;
    chunks.push(
      `HCP ${hd.line > 0 ? "+" : ""}${hd.line} (${hd.home.toFixed(
        2,
      )} / ${hd.away.toFixed(2)})`,
    );
  }
  if (match.markets.totals) {
    const tt = match.markets.totals;
    chunks.push(
      `O/U ${tt.line} (${tt.over.toFixed(2)} / ${tt.under.toFixed(2)})`,
    );
  }
  return chunks.join(" · ") || "가공 시장 없음";
}

function rawMarketCount(markets: unknown) {
  return Array.isArray(markets) ? markets.length : 0;
}

function scoreText(match: AggregatedMatch) {
  if (!match.scores) return "—";
  return `${match.scores.home ?? 0} : ${match.scores.away ?? 0}`;
}

function scoreTextRaw(event: OddsApiRawEvent) {
  if (!event.scores) return "—";
  return `${event.scores.home ?? 0} : ${event.scores.away ?? 0}`;
}

function countPrematchGames(payload: unknown): number {
  if (!payload || typeof payload !== "object") return 0;
  const o = payload as { game?: unknown; games?: unknown };
  if (Array.isArray(o.game)) return o.game.length;
  if (Array.isArray(o.games)) return o.games.length;
  return 0;
}

export default function OddsApiWsPage() {
  const REST_ONLY_MODE = true;
  const [status, setStatus] = useState<OddsApiAdminStatus | null>(null);
  const [raw, setRaw] = useState<OddsApiRawResponse | null>(null);
  const [matches, setMatches] = useState<AggregatedMatchesResponse | null>(null);
  const [form, setForm] = useState<ConfigForm>(DEFAULT_FORM);
  const [rawSport, setRawSport] = useState("");
  const [rawBookie, setRawBookie] = useState("");
  const [rawLimit, setRawLimit] = useState("40");
  const [matchStatus, setMatchStatus] = useState<MatchStatusFilter>("all");
  const [matchSport, setMatchSport] = useState("");
  const [matchLimit, setMatchLimit] = useState("24");
  const [prematchHost, setPrematchHost] = useState("nexus001.vip");
  const [prematchLoading, setPrematchLoading] = useState(false);
  const [prematchErr, setPrematchErr] = useState<string | null>(null);
  const [prematchSnap, setPrematchSnap] = useState<PublicPrematchSnapshot | null>(null);
  const [discovery, setDiscovery] = useState<OddsApiDiscoveryResponse | null>(null);
  const [categorySport, setCategorySport] = useState("football");
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryPageSize, setCategoryPageSize] = useState(10);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryErr, setCategoryErr] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryOddsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<ServiceHealth | null>(null);
  const [saving, setSaving] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const next = await apiFetch<OddsApiAdminStatus>("/hq/odds-api-ws/status");
    setStatus(next);
    setForm((prev) => ({
      ...prev,
      sportsCsv:
        prev.sportsCsv === DEFAULT_FORM.sportsCsv && next.filters.sports.length > 0
          ? next.filters.sports.join(",")
          : prev.sportsCsv,
      marketsCsv:
        prev.marketsCsv === DEFAULT_FORM.marketsCsv && next.filters.markets.length > 0
          ? next.filters.markets.join(",")
          : prev.marketsCsv,
      bookmakersCsv:
        prev.bookmakersCsv === DEFAULT_FORM.bookmakersCsv &&
        next.filters.bookmakers.length > 0
          ? next.filters.bookmakers.join(",")
          : prev.bookmakersCsv,
      status: next.filters.status ?? "all",
      autoConnect: next.autoConnectEnabled,
    }));
    return next;
  }, []);

  const loadHealth = useCallback(async () => {
    const next = await apiFetch<ServiceHealth>("/hq/service-health");
    setHealth(next);
  }, []);

  const loadDiscovery = useCallback(async () => {
    const next = await apiFetch<OddsApiDiscoveryResponse>("/hq/odds-api-ws/discovery");
    setDiscovery(next);
  }, []);

  const loadRaw = useCallback(
    async (nextStatus?: OddsApiAdminStatus | null) => {
      const q = new URLSearchParams();
      const sport = rawSport.trim();
      const bookie = rawBookie.trim();
      if (sport) q.set("sport", sport);
      if (bookie) q.set("bookie", bookie);
      if (rawLimit.trim()) q.set("limit", rawLimit.trim());
      const next = await apiFetch<OddsApiRawResponse>(
        `/hq/odds-api-ws/events?${q}`,
      );
      setRaw(next);
      const source = nextStatus ?? status;
      if (!rawSport && source?.filters.sports?.length && next.total > 0) {
        setRawSport(source.filters.sports[0]);
      }
    },
    [rawBookie, rawLimit, rawSport, status],
  );

  const loadMatches = useCallback(async () => {
    const q = new URLSearchParams();
    if (matchStatus !== "all") q.set("status", matchStatus);
    if (matchSport.trim()) q.set("sport", matchSport.trim());
    if (matchLimit.trim()) q.set("limit", matchLimit.trim());
    const next = await apiFetch<AggregatedMatchesResponse>(
      `/hq/odds-api-ws/matches?${q}`,
    );
    setMatches(next);
  }, [matchLimit, matchSport, matchStatus]);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      if (REST_ONLY_MODE) {
        await Promise.all([loadHealth(), loadDiscovery()]);
        return;
      }
      const nextStatus = await loadStatus();
      await Promise.all([loadRaw(nextStatus), loadMatches(), loadHealth(), loadDiscovery()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [REST_ONLY_MODE, loadDiscovery, loadHealth, loadMatches, loadRaw, loadStatus]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadAll();
    }, 5000);
    return () => window.clearInterval(id);
  }, [loadAll]);

  const currentSports = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.keys(status?.sportCounts ?? {}),
          ...(discovery?.sports
            ?.map((x) => x.slug || x.name || "")
            .filter(Boolean) ?? []),
        ]),
      ).sort(),
    [discovery?.sports, status],
  );
  const currentBookies = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.entries(status?.bookieCounts ?? {})
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name),
          ...(discovery?.bookmakers
            ?.map((x) => x.name || x.slug || "")
            .filter(Boolean) ?? []),
        ]),
      ),
    [discovery?.bookmakers, status],
  );
  const bookmakerOptions = useMemo(() => {
    const set = new Set<string>([
      ...parseCsv(form.bookmakersCsv),
      ...currentBookies,
      ...(status?.filters.bookmakers ?? []),
    ]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [currentBookies, form.bookmakersCsv, status?.filters.bookmakers]);

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const body: {
        apiKey?: string;
        sports: string[];
        markets: string[];
        bookmakers: string[];
        status: "live" | "prematch" | null;
        autoConnect: boolean;
      } = {
        sports: parseCsv(form.sportsCsv),
        markets: parseCsv(form.marketsCsv),
        bookmakers: parseCsv(form.bookmakersCsv),
        status: form.status === "all" ? null : form.status,
        autoConnect: form.autoConnect,
      };
      if (form.apiKey.trim()) {
        body.apiKey = form.apiKey.trim();
      }
      await apiFetch("/hq/odds-api-ws/config", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage("전역 odds-api 런타임 설정을 저장했습니다.");
      setForm((prev) => ({ ...prev, apiKey: "" }));
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  function toggleBookmaker(name: string) {
    const current = new Set(parseCsv(form.bookmakersCsv));
    if (current.has(name)) current.delete(name);
    else current.add(name);
    setForm((prev) => ({
      ...prev,
      bookmakersCsv: [...current].join(","),
    }));
  }

  function applyDiscoveredSports() {
    const sports = (discovery?.sports ?? [])
      .map((x) => x.slug || x.name || "")
      .filter(Boolean);
    setForm((prev) => ({ ...prev, sportsCsv: sports.join(",") }));
  }

  function applySelectedBookmakers() {
    const selected = (discovery?.selectedBookmakers ?? [])
      .map((x) => x.name || x.slug || "")
      .filter(Boolean);
    if (selected.length === 0) return;
    setForm((prev) => ({ ...prev, bookmakersCsv: selected.join(",") }));
  }

  async function reconnectNow() {
    setReconnecting(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch("/hq/odds-api-ws/reconnect", {
        method: "POST",
      });
      setMessage("전역 WS 재연결을 요청했습니다.");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "재연결 실패");
    } finally {
      setReconnecting(false);
    }
  }

  async function runPrematchTest() {
    setPrematchLoading(true);
    setPrematchErr(null);
    try {
      const host = prematchHost.trim();
      const q = new URLSearchParams(host ? { host } : {});
      const next = await apiFetch<PublicPrematchSnapshot>(
        `/public/sports-prematch?${q}`,
      );
      setPrematchSnap(next);
    } catch (e) {
      setPrematchSnap(null);
      setPrematchErr(
        e instanceof Error ? e.message : "프리마켓 테스트에 실패했습니다.",
      );
    } finally {
      setPrematchLoading(false);
    }
  }

  async function loadCategoryOdds(nextPage = categoryPage) {
    setCategoryLoading(true);
    setCategoryErr(null);
    try {
      const q = new URLSearchParams({
        sport: categorySport,
        page: String(nextPage),
        pageSize: String(categoryPageSize),
      });
      const b = parseCsv(form.bookmakersCsv);
      if (b.length > 0) q.set("bookmakers", b.join(","));
      const next = await apiFetch<CategoryOddsResponse>(
        `/hq/odds-api-ws/category-odds?${q}`,
      );
      setCategoryPage(next.page);
      setCategoryData(next);
    } catch (e) {
      setCategoryErr(e instanceof Error ? e.message : "카테고리 배당 조회 실패");
      setCategoryData(null);
    } finally {
      setCategoryLoading(false);
    }
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
          <p className="mt-2 max-w-3xl text-sm text-gray-600 dark:text-zinc-400">
            REST 우선 모드입니다. WS는 잠시 비활성화하고 `sports/bookmakers/events+odds/multi`
            기반 프리마켓 데이터만 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            새로고침
          </button>
          {!REST_ONLY_MODE ? (
            <>
              <button
                type="button"
                onClick={() => void reconnectNow()}
                disabled={reconnecting}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
              >
                {reconnecting ? "재연결 중…" : "WS 재연결"}
              </button>
              <button
                type="button"
                onClick={() => void saveConfig()}
                disabled={saving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "전역 설정 저장"}
              </button>
            </>
          ) : null}
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
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">관리자 헬스체크</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              관리자 콘솔에서 API/odds 연동 상태를 즉시 확인합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            다시 확인
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {health?.checks.map((c) => (
            <span
              key={c.id}
              className={`rounded-full border px-3 py-1 text-xs ${
                c.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
              title={c.detail || ""}
            >
              {c.label}: {c.ok ? "정상" : "점검 필요"}
            </span>
          ))}
          {!health ? (
            <span className="text-xs text-gray-500 dark:text-zinc-500">헬스 정보를 불러오는 중…</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              카테고리 배당 (REST, 비WS)
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              `events + odds/multi`로 종목별 최고 배당을 페이지 단위로 조회합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={categorySport}
              onChange={(e) => setCategorySport(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {currentSports.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={5}
              max={50}
              value={categoryPageSize}
              onChange={(e) => setCategoryPageSize(Math.min(50, Math.max(5, Number(e.target.value) || 10)))}
              className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void loadCategoryOdds(1)}
              disabled={categoryLoading}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {categoryLoading ? "조회 중…" : "조회"}
            </button>
          </div>
        </div>
        {categoryErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-300">{categoryErr}</p>
        ) : null}
        {categoryData ? (
          <>
            <div className="mt-3 text-xs text-gray-600 dark:text-zinc-400">
              총 이벤트 {categoryData.totalEvents}건 · 페이지 {categoryData.page}
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">경기</th>
                    <th className="px-3 py-2">리그</th>
                    <th className="px-3 py-2">최고배당 1/X/2</th>
                    <th className="px-3 py-2">북메이커</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {categoryData.items.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-gray-900 dark:text-zinc-200">
                        {(row.home ?? "?") + " vs " + (row.away ?? "?")}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">{row.league ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-gray-900 dark:text-zinc-200">
                        {(row.odds.home ?? "—").toString()} / {(row.odds.draw ?? "—").toString()} / {(row.odds.away ?? "—").toString()}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-zinc-400">{row.odds.sourceBookmaker ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={categoryData.page <= 1 || categoryLoading}
                onClick={() => void loadCategoryOdds(categoryData.page - 1)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
              >
                이전
              </button>
              <button
                type="button"
                disabled={
                  categoryLoading ||
                  categoryData.page * categoryData.pageSize >= categoryData.totalEvents
                }
                onClick={() => void loadCategoryOdds(categoryData.page + 1)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200"
              >
                다음
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              프리마켓 테스트 (비WS)
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              웹소켓과 별개로 `public/sports-prematch` 스냅샷 응답을 즉시 점검합니다.
            </p>
          </div>
          <div className="flex w-full max-w-xl gap-2">
            <input
              value={prematchHost}
              onChange={(e) => setPrematchHost(e.target.value)}
              placeholder="host (예: nexus001.vip)"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void runPrematchTest()}
              disabled={prematchLoading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {prematchLoading ? "테스트 중…" : "테스트"}
            </button>
          </div>
        </div>
        {prematchErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-300">{prematchErr}</p>
        ) : null}
        {prematchSnap ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-gray-700 dark:text-zinc-200">
              fetchedAt: {formatDateTime(prematchSnap.fetchedAt)}
            </p>
            <p className="mt-1 text-gray-700 dark:text-zinc-200">
              game count 추정: {countPrematchGames(prematchSnap.payload)}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              Odds-API 문서 기능 인덱스
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              `/sports`, `/bookmakers`, `/bookmakers/selected`를 관리자 탭에서
              바로 조회해 설정에 반영합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadDiscovery()}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              목록 다시조회
            </button>
            <button
              type="button"
              onClick={applyDiscoveredSports}
              disabled={!discovery || discovery.sports.length === 0}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              종목 자동적용
            </button>
            <button
              type="button"
              onClick={applySelectedBookmakers}
              disabled={!discovery || discovery.selectedBookmakers.length === 0}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              선택 북메이커 적용
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-gray-500 dark:text-zinc-500">sports</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-zinc-100">
              {discovery?.sports.length ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-gray-500 dark:text-zinc-500">bookmakers</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-zinc-100">
              {discovery?.bookmakers.length ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-gray-500 dark:text-zinc-500">selected bookmakers</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-zinc-100">
              {discovery?.selectedBookmakers.length ?? 0}
            </p>
          </div>
        </div>
      </section>

      {!REST_ONLY_MODE ? (
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
            Connection
          </p>
          <p className={`mt-2 text-2xl font-semibold ${valueClass(status?.connectionState ?? "idle")}`}>
            {formatStatusLabel(status?.connectionState ?? "idle")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
            {status?.configured ? "API 키 설정됨" : "API 키 미설정"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
            State Rows
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            {(status?.stateCount ?? 0).toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
            seq {status?.lastSeq?.toLocaleString("ko-KR") ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
            Enrichment
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
            {(status?.enrichmentCount ?? 0).toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
            REST 캐시 이벤트 {status?.restCache?.eventCacheSize ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-500">
            Last Message
          </p>
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-zinc-100">
            {formatRelativeTime(status?.lastMessageAt)}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
            {formatDateTime(status?.lastMessageAt)}
          </p>
        </div>
      </div>
      ) : null}

      {!REST_ONLY_MODE ? (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="border-b border-gray-200 pb-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              upstream 제어
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              여기서 `odds-api.io` WebSocket 구독 종목, 시장, 상태 필터를
              런타임 변경합니다.
            </p>
          </div>

          <label className="block text-sm text-gray-700 dark:text-zinc-400">
            새 API Key
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="바꾸지 않으려면 비워두세요"
            />
          </label>

          <label className="block text-sm text-gray-700 dark:text-zinc-400">
            종목 (쉼표)
            <input
              value={form.sportsCsv}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sportsCsv: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="football,basketball"
            />
          </label>

          <label className="block text-sm text-gray-700 dark:text-zinc-400">
            시장 (쉼표)
            <input
              value={form.marketsCsv}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, marketsCsv: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="ML,Spread,Totals"
            />
          </label>

          <label className="block text-sm text-gray-700 dark:text-zinc-400">
            배팅사이트(북메이커) (쉼표)
            <input
              value={form.bookmakersCsv}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bookmakersCsv: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              placeholder="Bet365,Sbobet"
            />
          </label>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-xs font-semibold text-zinc-300">
              배팅사이트 온/오프 스위치
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              켜진 북메이커만 수집/가공 대상으로 사용합니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {bookmakerOptions.map((b) => {
                const on = parseCsv(form.bookmakersCsv).includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBookmaker(b)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      on
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400"
                    }`}
                  >
                    {b} {on ? "ON" : "OFF"}
                  </button>
                );
              })}
              {bookmakerOptions.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  아직 북메이커 데이터가 없습니다. 먼저 연결 후 새로고침하세요.
                </p>
              ) : null}
            </div>
          </div>

          <label className="block text-sm text-gray-700 dark:text-zinc-400">
            상태 필터
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as WsStatusFilter,
                }))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="all">all</option>
              <option value="live">live only</option>
              <option value="prematch">prematch only</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={form.autoConnect}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  autoConnect: e.target.checked,
                }))
              }
            />
            자동 재연결 사용
          </label>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
            <p className="font-semibold text-gray-900 dark:text-zinc-100">현재 적용값</p>
            <p className="mt-2">
              sports:{" "}
              <span className="text-gray-900 dark:text-zinc-200">
                {status?.filters.sports.join(", ") || "없음"}
              </span>
            </p>
            <p className="mt-1">
              markets:{" "}
              <span className="text-gray-900 dark:text-zinc-200">
                {status?.filters.markets.join(", ") || "없음"}
              </span>
            </p>
            <p className="mt-1">
              bookmakers:{" "}
              <span className="text-gray-900 dark:text-zinc-200">
                {status?.filters.bookmakers.join(", ") || "전체"}
              </span>
            </p>
            <p className="mt-1">
              status:{" "}
              <span className="text-gray-900 dark:text-zinc-200">
                {status?.filters.status ?? "all"}
              </span>
            </p>
            <p className="mt-1">
              endpoint:{" "}
              <span className="break-all text-gray-900 dark:text-zinc-200">
                {status?.endpoint ?? "—"}
              </span>
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="border-b border-gray-200 pb-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              실시간 상태
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
              연결 상태, 북메이커 분포, 수신 카운터, REST 보강 캐시 현황입니다.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InfoBox label="마지막 연결" value={formatDateTime(status?.connectedAt)} />
            <InfoBox label="마지막 종료" value={formatDateTime(status?.disconnectedAt)} />
            <InfoBox label="재연결 시도" value={`${status?.reconnectAttempts ?? 0}회`} />
            <InfoBox label="welcome" value={`${status?.counters?.welcome ?? 0}`} />
            <InfoBox label="created / updated" value={`${status?.counters?.created ?? 0} / ${status?.counters?.updated ?? 0}`} />
            <InfoBox label="deleted / no_markets" value={`${status?.counters?.deleted ?? 0} / ${status?.counters?.no_markets ?? 0}`} />
          </div>

          {status?.lastError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              최근 에러: {status.lastError}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Sport Count</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(status?.sportCounts ?? {}).map(([sport, count]) => (
                  <span
                    key={sport}
                    className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                  >
                    {sport} {count}
                  </span>
                ))}
                {Object.keys(status?.sportCounts ?? {}).length === 0 ? (
                  <span className="text-xs text-zinc-500">아직 수신 없음</span>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Top Bookmakers
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(status?.bookieCounts ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([name, count]) => (
                    <span
                      key={name}
                      className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                    >
                      {name} {count}
                    </span>
                  ))}
                {Object.keys(status?.bookieCounts ?? {}).length === 0 ? (
                  <span className="text-xs text-zinc-500">아직 수신 없음</span>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
      ) : null}

      {!REST_ONLY_MODE ? (
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-4 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
                원본 WS 이벤트
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
                upstream 메시지를 보강 후 메모리에 적재한 상태입니다.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${badgeClass(
                !!raw?.events?.length,
              )}`}
            >
              {raw?.total ?? 0} rows
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm text-gray-700 dark:text-zinc-400">
              sport
              <input
                list="odds-sports"
                value={rawSport}
                onChange={(e) => setRawSport(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                placeholder="football"
              />
            </label>
            <label className="block text-sm text-gray-700 dark:text-zinc-400">
              bookmaker
              <input
                list="odds-bookies"
                value={rawBookie}
                onChange={(e) => setRawBookie(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                placeholder="Bet365"
              />
            </label>
            <label className="block text-sm text-gray-700 dark:text-zinc-400">
              limit
              <input
                type="number"
                min={1}
                max={500}
                value={rawLimit}
                onChange={(e) => setRawLimit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-zinc-800">
            <div className="max-h-[480px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">경기</th>
                    <th className="px-3 py-2">북메이커</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">시장수</th>
                    <th className="px-3 py-2">업데이트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {raw?.events.map((event) => (
                    <tr key={`${event.eventId}:${event.bookie}:${event.seq}`}>
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-zinc-100">
                          {event.home ?? "?"} vs {event.away ?? "?"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {event.league ?? event.sport} · {scoreTextRaw(event)}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          {event.eventId}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top text-zinc-300">
                        {event.bookie}
                      </td>
                      <td className="px-3 py-2 align-top text-zinc-300">
                        {event.eventStatus ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-zinc-300">
                        {rawMarketCount(event.markets)}
                      </td>
                      <td className="px-3 py-2 align-top text-zinc-400">
                        <p>{formatRelativeTime(event.updatedAt)}</p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          seq {event.seq}
                        </p>
                      </td>
                    </tr>
                  ))}
                  {raw && raw.events.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                        조건에 맞는 원본 이벤트가 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-4 dark:border-zinc-800">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
                서버 가공 매치
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
                그룹핑, best odds, 마진 보정이 끝난 결과입니다.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${badgeClass(
                !!matches?.matches?.length,
              )}`}
            >
              {matches?.total ?? 0} matches
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="block text-sm text-gray-700 dark:text-zinc-400">
              status
              <select
                value={matchStatus}
                onChange={(e) =>
                  setMatchStatus(e.target.value as MatchStatusFilter)
                }
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="all">all</option>
                <option value="live">live</option>
                <option value="prematch">prematch</option>
                <option value="finished">finished</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
            <label className="block text-sm text-gray-700 dark:text-zinc-400">
              sport
              <input
                list="odds-sports"
                value={matchSport}
                onChange={(e) => setMatchSport(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                placeholder="football"
              />
            </label>
            <label className="block text-sm text-gray-700 dark:text-zinc-400">
              limit
              <input
                type="number"
                min={1}
                max={500}
                value={matchLimit}
                onChange={(e) => setMatchLimit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
          </div>

          <div className="space-y-3">
            {matches?.matches.map((match) => (
              <article
                key={match.matchId}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-zinc-100">
                      {match.home.nameKr ?? match.home.name} vs{" "}
                      {match.away.nameKr ?? match.away.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {match.league.nameKr ?? match.league.name ?? match.sport} ·{" "}
                      {match.status} · 점수 {scoreText(match)}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      {formatDateTime(match.startTime)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-zinc-200">
                      {match.bookieCount} bookmakers
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {formatRelativeTime(new Date(match.lastUpdatedMs).toISOString())}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-300">
                  {marketSummary(match)}
                </p>
              </article>
            ))}
            {matches && matches.matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
                조건에 맞는 가공 매치가 없습니다.
              </div>
            ) : null}
          </div>
        </section>
      </div>
      ) : null}

      <datalist id="odds-sports">
        {currentSports.map((sport) => (
          <option key={sport} value={sport} />
        ))}
      </datalist>
      <datalist id="odds-bookies">
        {currentBookies.map((bookie) => (
          <option key={bookie} value={bookie} />
        ))}
      </datalist>

      {loading ? (
        <p className="text-sm text-zinc-500">전역 odds-api 상태를 불러오는 중…</p>
      ) : null}
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

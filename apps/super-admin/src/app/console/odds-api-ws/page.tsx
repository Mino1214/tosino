"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type MatchStatus = "live" | "prematch" | "finished" | "unknown";
type MatchStatusFilter = "live" | "prematch" | "all";

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
  if (match.markets.handicap) {
    const hd = match.markets.handicap;
    chunks.push(
      `HCP ${hd.line > 0 ? "+" : ""}${hd.line} (${hd.home.toFixed(2)} / ${hd.away.toFixed(2)})`,
    );
  }
  if (match.markets.totals) {
    const tt = match.markets.totals;
    chunks.push(`O/U ${tt.line} (${tt.over.toFixed(2)} / ${tt.under.toFixed(2)})`);
  }
  return chunks.join(" · ") || "가공 시장 없음";
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
  const [catalogHistory, setCatalogHistory] = useState<CatalogSummary[]>([]);
  const [processedHistory, setProcessedHistory] = useState<ProcessedSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedPlatformId) {
      setOverview(null);
      setCatalogItems(null);
      setLiveMatches(null);
      setPrematchMatches(null);
      setCatalogHistory([]);
      setProcessedHistory([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const q = new URLSearchParams({ platformId: selectedPlatformId });
      const [nextOverview, nextCatalogItems, nextLive, nextPrematch, nextCatalogHistory, nextProcessedHistory] =
        await Promise.all([
          apiFetch<OverviewResponse>(`/hq/odds-api-ws/platform-overview?${q}`),
          apiFetch<CatalogItemsResponse>(`/hq/odds-api-ws/catalog-items?${q}&limit=20`),
          apiFetch<MatchesResponse>(
            `/hq/odds-api-ws/matches?${q}&status=live&limit=12`,
          ),
          apiFetch<MatchesResponse>(
            `/hq/odds-api-ws/matches?${q}&status=prematch&limit=12`,
          ),
          apiFetch<CatalogHistoryResponse>(
            `/hq/odds-api-ws/catalog-history?${q}&take=8`,
          ),
          apiFetch<ProcessedHistoryResponse>(
            `/hq/odds-api-ws/processed-history?${q}&take=12`,
          ),
        ]);
      setOverview(nextOverview);
      setCatalogItems(nextCatalogItems);
      setLiveMatches(nextLive);
      setPrematchMatches(nextPrematch);
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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Processed Live</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
                클라이언트 송출용으로 재가공된 live snapshot 최신 결과입니다.
              </p>
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-500">
              {formatDateTime(liveMatches?.fetchedAt)}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {(liveMatches?.matches ?? []).map((match) => (
              <div
                key={match.matchId}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {match.home.nameKr || match.home.name || "?"} vs {match.away.nameKr || match.away.name || "?"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                      {match.league.nameKr || match.league.name || "리그 미상"} · {formatDateTime(match.startTime)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-zinc-500">
                    <div>{match.status}</div>
                    <div>{scoreText(match.scores)}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700 dark:text-zinc-300">{marketSummary(match)}</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
                  bookmakers {match.bookieCount}개 · updated {formatRelativeTime(new Date(match.lastUpdatedMs).toISOString())}
                </p>
              </div>
            ))}
            {(liveMatches?.matches ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-zinc-700 dark:text-zinc-500">
                저장된 live processed 결과가 없습니다.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">Processed Prematch</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-500">
                클라이언트 송출용으로 재가공된 prematch snapshot 최신 결과입니다.
              </p>
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-500">
              {formatDateTime(prematchMatches?.fetchedAt)}
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {(prematchMatches?.matches ?? []).map((match) => (
              <div
                key={match.matchId}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {match.home.nameKr || match.home.name || "?"} vs {match.away.nameKr || match.away.name || "?"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                      {match.league.nameKr || match.league.name || "리그 미상"} · {formatDateTime(match.startTime)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-zinc-500">
                    <div>{match.status}</div>
                    <div>{scoreText(match.scores)}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700 dark:text-zinc-300">{marketSummary(match)}</p>
                <p className="mt-2 text-xs text-gray-500 dark:text-zinc-500">
                  bookmakers {match.bookieCount}개 · updated {formatRelativeTime(new Date(match.lastUpdatedMs).toISOString())}
                </p>
              </div>
            ))}
            {(prematchMatches?.matches ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-zinc-700 dark:text-zinc-500">
                저장된 prematch processed 결과가 없습니다.
              </div>
            ) : null}
          </div>
        </section>
      </div>

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

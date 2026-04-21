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

type ConfigForm = {
  apiKey: string;
  sportsCsv: string;
  marketsCsv: string;
  status: WsStatusFilter;
  autoConnect: boolean;
};

const DEFAULT_FORM: ConfigForm = {
  apiKey: "",
  sportsCsv: "football,basketball",
  marketsCsv: "ML,Spread,Totals",
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

export default function OddsApiWsPage() {
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
  const [loading, setLoading] = useState(true);
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
      status: next.filters.status ?? "all",
      autoConnect: next.autoConnectEnabled,
    }));
    return next;
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
      const nextStatus = await loadStatus();
      await Promise.all([loadRaw(nextStatus), loadMatches()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [loadMatches, loadRaw, loadStatus]);

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
    () => Object.keys(status?.sportCounts ?? {}).sort(),
    [status],
  );
  const currentBookies = useMemo(
    () =>
      Object.entries(status?.bookieCounts ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name),
    [status],
  );

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const body: {
        apiKey?: string;
        sports: string[];
        markets: string[];
        status: "live" | "prematch" | null;
        autoConnect: boolean;
      } = {
        sports: parseCsv(form.sportsCsv),
        markets: parseCsv(form.marketsCsv),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            HQ Control
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-100">
            Live Odds Control Room
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            플랫폼별 분기 없이 HQ에서 `odds-api.io` 전체 피드를 제어하고,
            서버 가공 결과까지 한 번에 검수하는 화면입니다. 나중에 솔루션
            연결을 붙이더라도, upstream 제어와 가공 검수는 여기서 계속 할 수
            있게 구성했습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={() => void reconnectNow()}
            disabled={reconnecting}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
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
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Connection
          </p>
          <p className={`mt-2 text-2xl font-semibold ${valueClass(status?.connectionState ?? "idle")}`}>
            {formatStatusLabel(status?.connectionState ?? "idle")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {status?.configured ? "API 키 설정됨" : "API 키 미설정"}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            State Rows
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {(status?.stateCount ?? 0).toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            seq {status?.lastSeq?.toLocaleString("ko-KR") ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Enrichment
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {(status?.enrichmentCount ?? 0).toLocaleString("ko-KR")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            REST 캐시 이벤트 {status?.restCache?.eventCacheSize ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Last Message
          </p>
          <p className="mt-2 text-lg font-semibold text-zinc-100">
            {formatRelativeTime(status?.lastMessageAt)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatDateTime(status?.lastMessageAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-base font-semibold text-zinc-100">
              upstream 제어
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              여기서 `odds-api.io` WebSocket 구독 종목, 시장, 상태 필터를
              런타임 변경합니다.
            </p>
          </div>

          <label className="block text-sm text-zinc-400">
            새 API Key
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="바꾸지 않으려면 비워두세요"
            />
          </label>

          <label className="block text-sm text-zinc-400">
            종목 (쉼표)
            <input
              value={form.sportsCsv}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sportsCsv: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="football,basketball"
            />
          </label>

          <label className="block text-sm text-zinc-400">
            시장 (쉼표)
            <input
              value={form.marketsCsv}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, marketsCsv: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              placeholder="ML,Spread,Totals"
            />
          </label>

          <label className="block text-sm text-zinc-400">
            상태 필터
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as WsStatusFilter,
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
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

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-400">
            <p className="font-semibold text-zinc-100">현재 적용값</p>
            <p className="mt-2">
              sports:{" "}
              <span className="text-zinc-200">
                {status?.filters.sports.join(", ") || "없음"}
              </span>
            </p>
            <p className="mt-1">
              markets:{" "}
              <span className="text-zinc-200">
                {status?.filters.markets.join(", ") || "없음"}
              </span>
            </p>
            <p className="mt-1">
              status:{" "}
              <span className="text-zinc-200">
                {status?.filters.status ?? "all"}
              </span>
            </p>
            <p className="mt-1">
              endpoint:{" "}
              <span className="break-all text-zinc-200">
                {status?.endpoint ?? "—"}
              </span>
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="border-b border-zinc-800 pb-4">
            <h2 className="text-base font-semibold text-zinc-100">
              실시간 상태
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
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
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-sm font-semibold text-zinc-100">Sport Count</p>
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

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-sm font-semibold text-zinc-100">
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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                원본 WS 이벤트
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
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
            <label className="block text-sm text-zinc-400">
              sport
              <input
                list="odds-sports"
                value={rawSport}
                onChange={(e) => setRawSport(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="football"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              bookmaker
              <input
                list="odds-bookies"
                value={rawBookie}
                onChange={(e) => setRawBookie(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="Bet365"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              limit
              <input
                type="number"
                min={1}
                max={500}
                value={rawLimit}
                onChange={(e) => setRawLimit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <div className="max-h-[480px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">경기</th>
                    <th className="px-3 py-2">북메이커</th>
                    <th className="px-3 py-2">상태</th>
                    <th className="px-3 py-2">시장수</th>
                    <th className="px-3 py-2">업데이트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
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

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                서버 가공 매치
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
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
            <label className="block text-sm text-zinc-400">
              status
              <select
                value={matchStatus}
                onChange={(e) =>
                  setMatchStatus(e.target.value as MatchStatusFilter)
                }
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="all">all</option>
                <option value="live">live</option>
                <option value="prematch">prematch</option>
                <option value="finished">finished</option>
                <option value="unknown">unknown</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-400">
              sport
              <input
                list="odds-sports"
                value={matchSport}
                onChange={(e) => setMatchSport(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                placeholder="football"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              limit
              <input
                type="number"
                min={1}
                max={500}
                value={matchLimit}
                onChange={(e) => setMatchLimit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>

          <div className="space-y-3">
            {matches?.matches.map((match) => (
              <article
                key={match.matchId}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
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

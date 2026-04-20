"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

/* ─── Types ─── */
type OddsApiStatus = {
  configured: boolean;
  autoConnectEnabled: boolean;
  connectionState: "idle" | "connecting" | "open" | "closed" | "error";
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
  sportCounts?: Record<string, number>;
  bookieCounts?: Record<string, number>;
  endpoint: string;
  enrichmentCount?: number;
  sportLookup?: Record<string, { count: number; fetchedAt: string | null }>;
  restCache?: {
    odds: number;
    eventsBySport: number;
    callsLastMinute: number;
    cooldownMs: number;
  };
};

type OddsApiEvent = {
  sport: string;
  eventId: string;
  bookie: string;
  url?: string;
  markets: unknown;
  timestamp: number;
  seq: number;
  updatedAt: string;
  home?: string | null;
  away?: string | null;
  league?: string | null;
  date?: string | null;
  eventStatus?: string | null;
};

type EventsResp = {
  sport: string | null;
  bookie: string | null;
  total: number;
  events: OddsApiEvent[];
};

/* ─── Sport / market presets ─── */
/**
 * 가이드: docs.odds-api.io. sport 슬러그는 벤더 종목 슬러그(예: football, basketball, tennis, ...).
 * 우리는 1~2개만 동시에 사용할 예정이므로, 실제 운영 종목 위주의 프리셋만 노출.
 */
const SPORT_PRESETS: Array<{ id: string; label: string }> = [
  { id: "football", label: "축구" },
  { id: "basketball", label: "농구" },
  { id: "tennis", label: "테니스" },
  { id: "baseball", label: "야구" },
  { id: "ice-hockey", label: "아이스하키" },
  { id: "esports", label: "이스포츠" },
  { id: "volleyball", label: "배구" },
  { id: "handball", label: "핸드볼" },
];

const MARKET_PRESETS = ["ML", "Spread", "Totals", "BTTS", "DC"] as const;

/* ─── Helpers ─── */
function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleTimeString("ko-KR");
  if (diff < 1500) return "방금";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}초 전`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  return new Date(iso).toLocaleString("ko-KR");
}

function StateBadge({ state }: { state: OddsApiStatus["connectionState"] }) {
  const map: Record<
    OddsApiStatus["connectionState"],
    { label: string; cls: string; dot: string }
  > = {
    idle: {
      label: "대기",
      cls: "bg-gray-100 text-gray-600",
      dot: "bg-gray-400",
    },
    connecting: {
      label: "연결 중…",
      cls: "bg-blue-50 text-blue-600 animate-pulse",
      dot: "bg-blue-500",
    },
    open: {
      label: "라이브 수신",
      cls: "bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
    },
    closed: {
      label: "끊김",
      cls: "bg-amber-50 text-amber-700",
      dot: "bg-amber-500",
    },
    error: {
      label: "오류",
      cls: "bg-red-50 text-red-600",
      dot: "bg-red-500",
    },
  };
  const m = map[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${m.cls}`}
    >
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export default function OddsApiWsConsolePage() {
  const [status, setStatus] = useState<OddsApiStatus | null>(null);
  const [events, setEvents] = useState<EventsResp | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Local form state (only synced from status on first load / explicit reset)
  const [draftSports, setDraftSports] = useState<string[]>([]);
  const [draftMarkets, setDraftMarkets] = useState<string[]>([]);
  const [draftStatus, setDraftStatus] = useState<"any" | "live" | "prematch">(
    "any",
  );
  const [draftAutoConnect, setDraftAutoConnect] = useState(true);
  const initializedRef = useRef(false);

  const [filterSport, setFilterSport] = useState<string>("");
  const [filterBookie, setFilterBookie] = useState<string>("");

  const loadStatus = useCallback(async () => {
    try {
      const s = await apiFetch<OddsApiStatus>("/hq/odds-api-ws/status");
      setStatus(s);
      setLoadErr(null);
      if (!initializedRef.current) {
        setDraftSports(s.filters.sports);
        setDraftMarkets(s.filters.markets);
        setDraftStatus(s.filters.status ?? "any");
        setDraftAutoConnect(s.autoConnectEnabled);
        initializedRef.current = true;
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "상태 조회 실패");
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const q = new URLSearchParams({ limit: "50" });
      if (filterSport) q.set("sport", filterSport);
      if (filterBookie) q.set("bookie", filterBookie);
      const r = await apiFetch<EventsResp>(`/hq/odds-api-ws/events?${q}`);
      setEvents(r);
    } catch (e) {
      // Don't surface event errors loudly while status is the focus
      console.warn("events load failed", e);
    }
  }, [filterSport, filterBookie]);

  useEffect(() => {
    void loadStatus();
    void loadEvents();
    const id = window.setInterval(() => {
      void loadStatus();
      void loadEvents();
    }, 4000);
    return () => clearInterval(id);
  }, [loadStatus, loadEvents]);

  function toggleSport(id: string) {
    setDraftSports((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  }

  function toggleMarket(m: string) {
    setDraftMarkets((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  async function applyConfig() {
    setSaving(true);
    setSaveErr(null);
    try {
      const body: Record<string, unknown> = {
        sports: draftSports,
        markets: draftMarkets,
        autoConnect: draftAutoConnect,
      };
      if (draftStatus === "any") body.status = null;
      else body.status = draftStatus;
      const s = await apiFetch<OddsApiStatus>("/hq/odds-api-ws/config", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setStatus(s);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "설정 저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function reconnectNow() {
    setSaving(true);
    setSaveErr(null);
    try {
      const s = await apiFetch<OddsApiStatus>("/hq/odds-api-ws/reconnect", {
        method: "POST",
      });
      setStatus(s);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "재연결 실패");
    } finally {
      setSaving(false);
    }
  }

  const dirty = useMemo(() => {
    if (!status) return false;
    const a = [...draftSports].sort().join(",");
    const b = [...status.filters.sports].sort().join(",");
    if (a !== b) return true;
    const am = [...draftMarkets].sort().join(",");
    const bm = [...status.filters.markets].sort().join(",");
    if (am !== bm) return true;
    if (draftAutoConnect !== status.autoConnectEnabled) return true;
    const sf = status.filters.status ?? "any";
    if (draftStatus !== sf) return true;
    return false;
  }, [status, draftSports, draftMarkets, draftAutoConnect, draftStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-500">
            Live Odds Feed
          </p>
          <h1 className="mt-1.5 text-2xl font-bold text-gray-900">
            odds-api.io WebSocket
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            실시간 배당 스트림. 1~2개 종목만 동시에 구독해서 솔루션 페이지(스포츠 라이브 패널)에 그대로 노출됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status ? <StateBadge state={status.connectionState} /> : null}
          <button
            type="button"
            onClick={() => void reconnectNow()}
            disabled={saving}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            지금 재연결
          </button>
        </div>
      </div>

      {loadErr ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          상태 조회 실패: {loadErr}
        </p>
      ) : null}

      {status && !status.configured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          API 키가 설정되지 않았습니다. <code>apps/api/.env</code> 의{" "}
          <code>ODDS_API_KEY</code> 를 채우고 API를 재시작하세요.
        </p>
      ) : null}

      {/* Status grid */}
      {status ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="활성 이벤트(메모리)" value={`${status.stateCount}건`} />
          <Stat label="마지막 메시지" value={timeAgo(status.lastMessageAt)} />
          <Stat label="lastSeq" value={status.lastSeq.toLocaleString()} />
          <Stat
            label="재연결 시도"
            value={`${status.reconnectAttempts}회`}
          />
          <Stat
            label="구독 종목"
            value={
              status.filters.sports.length
                ? status.filters.sports.join(", ")
                : "—"
            }
          />
          <Stat
            label="구독 마켓"
            value={
              status.filters.markets.length
                ? status.filters.markets.join(", ")
                : "—"
            }
          />
          <Stat
            label="상태 필터"
            value={status.filters.status ?? "전체(라이브+프리매치)"}
          />
          <Stat
            label="자동 재연결"
            value={status.autoConnectEnabled ? "ON" : "OFF"}
          />
        </section>
      ) : null}

      {status?.lastError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          최근 오류: {status.lastError}
        </p>
      ) : null}

      {/* Bookmakers from welcome message — odds-api.io 대시보드에서 선택한 값 */}
      {status?.welcome ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-gray-900">
              구독 중인 북메이커
            </h2>
            <span className="text-[11px] text-gray-500">
              odds-api.io 대시보드에서 선택한 값을 그대로 따라갑니다 (WS 쿼리에 별도 파라미터 없음)
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {extractBookmakers(status.welcome).length > 0 ? (
              extractBookmakers(status.welcome).map((b) => (
                <span
                  key={b}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700"
                >
                  {b}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">
                welcome 응답에 bookmakers 가 비어 있습니다 — odds-api.io 대시보드에서 1개 이상 선택해 주세요.
              </span>
            )}
          </div>
          {typeof status.welcome.warning === "string" && status.welcome.warning ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠ {status.welcome.warning}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Config form */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-bold text-gray-900">구독 설정</h2>
        <p className="mt-1 text-sm text-gray-500">
          종목은 동시 최대 <strong>2개</strong> 까지 활성화할 수 있도록 제한했습니다(가이드 1~2개 권장).
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              종목 (최대 2)
            </label>
            <div className="flex flex-wrap gap-2">
              {SPORT_PRESETS.map((sp) => {
                const active = draftSports.includes(sp.id);
                const disabled = !active && draftSports.length >= 2;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => toggleSport(sp.id)}
                    disabled={disabled}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-blue-500 bg-blue-500 text-white"
                        : disabled
                          ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {sp.label}
                    <span className="ml-1.5 text-[11px] opacity-70">
                      {sp.id}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              현재 선택: {draftSports.join(", ") || "없음"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
              마켓 (필수)
            </label>
            <div className="flex flex-wrap gap-2">
              {MARKET_PRESETS.map((m) => {
                const active = draftMarkets.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMarket(m)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-mono font-semibold transition ${
                      active
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                상태 필터
              </label>
              <div className="flex gap-1 rounded-lg border border-gray-300 bg-gray-50 p-0.5">
                {(["any", "live", "prematch"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDraftStatus(opt)}
                    className={`rounded px-3 py-1 text-xs font-semibold transition ${
                      draftStatus === opt
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    {opt === "any"
                      ? "전체"
                      : opt === "live"
                        ? "라이브"
                        : "프리매치"}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draftAutoConnect}
                onChange={(e) => setDraftAutoConnect(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                자동 재연결
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => void applyConfig()}
              disabled={
                saving ||
                !dirty ||
                draftSports.length === 0 ||
                draftMarkets.length === 0
              }
              className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? "적용 중…" : dirty ? "설정 적용 → 재연결" : "변경 사항 없음"}
            </button>
            {saveErr ? (
              <span className="text-sm text-red-600">{saveErr}</span>
            ) : null}
            {dirty ? (
              <span className="text-xs text-amber-600">
                저장 시 기존 in-memory 상태는 비워지고 새 세션을 시작합니다.
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* Counters */}
      {status ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900">메시지 카운터</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(status.counters).map(([k, v]) => (
              <span
                key={k}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-mono text-gray-700"
              >
                <span className="text-gray-500">{k}</span>:{" "}
                <span className="font-bold text-gray-900">{v}</span>
              </span>
            ))}
          </div>

          {status.sportCounts && Object.keys(status.sportCounts).length > 0 ? (
            <>
              <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-gray-500">
                종목별 활성 이벤트
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(status.sportCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([sport, n]) => {
                    const isUnknown = sport === "unknown";
                    return (
                      <span
                        key={sport}
                        className={`rounded-lg border px-3 py-1 text-xs font-mono ${
                          isUnknown
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        <span className="opacity-70">{sport}</span>:{" "}
                        <span className="font-bold">{n}</span>
                      </span>
                    );
                  })}
              </div>
              {status.sportCounts.unknown ? (
                <p className="mt-2 text-[11px] text-amber-700">
                  ⚠ <strong>unknown</strong> 은 메시지/URL 만으로 종목을 단정 못한 이벤트입니다. Bet365 처럼 URL 에 종목 path 가 없는 북메이커는 다른 북메이커가 같은 eventId 를 흘려보낼 때까지 unknown 으로 잡힐 수 있습니다.
                </p>
              ) : null}
            </>
          ) : null}

          {status.bookieCounts && Object.keys(status.bookieCounts).length > 0 ? (
            <>
              <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-gray-500">
                북메이커별 활성 이벤트
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(status.bookieCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([bookie, n]) => (
                    <span
                      key={bookie}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-mono text-gray-700"
                    >
                      <span className="opacity-70">{bookie}</span>:{" "}
                      <span className="font-bold">{n}</span>
                    </span>
                  ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* Live events */}
      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">최근 이벤트 (라이브)</h2>
            <p className="text-xs text-gray-500">
              4초 주기로 갱신. 최대 50건 표시.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">전체 종목</option>
              {sportFilterOptions(status).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterBookie}
              onChange={(e) => setFilterBookie(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">전체 북메이커</option>
              {bookieFilterOptions(status).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-semibold">seq</th>
                <th className="px-4 py-2 font-semibold">sport</th>
                <th className="px-4 py-2 font-semibold">match</th>
                <th className="px-4 py-2 font-semibold">date / status</th>
                <th className="px-4 py-2 font-semibold">bookie</th>
                <th className="px-4 py-2 font-semibold">markets</th>
                <th className="px-4 py-2 font-semibold">updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(events?.events ?? []).map((ev) => {
                const ml = pickFirstMarket(ev.markets, "ML");
                const matchLabel =
                  ev.home && ev.away
                    ? `${ev.home} vs ${ev.away}`
                    : null;
                return (
                  <tr key={`${ev.sport}-${ev.eventId}-${ev.bookie}`}>
                    <td className="px-4 py-2 font-mono text-[12px] text-gray-500">
                      {ev.seq}
                    </td>
                    <td className="px-4 py-2 text-gray-800">
                      {ev.sport === "unknown" ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          unknown
                        </span>
                      ) : (
                        ev.sport
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {matchLabel ? (
                        <div>
                          <p className="font-medium text-gray-900">
                            {matchLabel}
                          </p>
                          <p className="font-mono text-[10px] text-gray-400">
                            {ev.league ? `${ev.league} · ` : ""}#{ev.eventId}
                          </p>
                        </div>
                      ) : (
                        <span className="font-mono text-[12px] text-gray-400">
                          #{ev.eventId} (보강 대기)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-gray-600">
                      {ev.date ? (
                        <div className="text-gray-700">
                          {new Date(ev.date).toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      ) : (
                        "—"
                      )}
                      {ev.eventStatus ? (
                        <div
                          className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            ev.eventStatus === "live"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {ev.eventStatus}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-gray-800">{ev.bookie}</td>
                    <td className="px-4 py-2 font-mono text-[12px] text-gray-700">
                      {summariseMarkets(ev.markets)}
                      {ml ? (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                          ML {ml}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-gray-500">
                      {timeAgo(ev.updatedAt)}
                    </td>
                  </tr>
                );
              })}
              {(!events || events.events.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    {status?.connectionState === "open"
                      ? "아직 수신된 이벤트가 없습니다."
                      : "연결 후 이벤트가 표시됩니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* REST enrichment & sport lookup diagnostics */}
      {status?.restCache || status?.sportLookup ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900">
            REST 보강 / 종목 룩업 (odds-api.io REST)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            WS 메시지에 없는 home/away/date/status 는{" "}
            <code>/v3/odds?eventId=...</code> 로 보강. 종목 정확도는{" "}
            <code>/v3/events?sport=...</code> 5분 캐시로 보장.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="이벤트 보강 캐시"
              value={`${status.enrichmentCount ?? 0}건`}
            />
            <Stat
              label="REST /v3/odds 캐시"
              value={`${status.restCache?.odds ?? 0}건`}
            />
            <Stat
              label="최근 1분 호출"
              value={`${status.restCache?.callsLastMinute ?? 0}회`}
            />
            <Stat
              label="쿨다운"
              value={
                status.restCache && status.restCache.cooldownMs > 0
                  ? `${Math.ceil(status.restCache.cooldownMs / 1000)}s`
                  : "—"
              }
            />
          </div>
          {status.sportLookup &&
          Object.keys(status.sportLookup).length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(status.sportLookup).map(([sp, info]) => (
                <span
                  key={sp}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-mono text-blue-800"
                >
                  <span className="opacity-70">{sp}</span>:{" "}
                  <span className="font-bold">{info.count}</span>
                  <span className="ml-1 opacity-60">
                    {info.fetchedAt ? `· ${timeAgo(info.fetchedAt)}` : ""}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="text-[11px] text-gray-400">
        엔드포인트: <code>{status?.endpoint ?? "wss://api.odds-api.io/v3/ws"}</code>
        {" · "}
        키 가이드: <a
          className="underline"
          href="https://docs.odds-api.io/guides/websocket"
          target="_blank"
          rel="noreferrer"
        >
          docs.odds-api.io
        </a>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 truncate text-base font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function sportFilterOptions(status: OddsApiStatus | null): string[] {
  if (!status) return [];
  const set = new Set<string>(status.filters.sports);
  if (status.sportCounts) {
    for (const k of Object.keys(status.sportCounts)) set.add(k);
  }
  return [...set].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return a.localeCompare(b);
  });
}

function bookieFilterOptions(status: OddsApiStatus | null): string[] {
  if (!status) return [];
  const set = new Set<string>();
  if (status.welcome) for (const b of extractBookmakers(status.welcome)) set.add(b);
  if (status.bookieCounts) for (const k of Object.keys(status.bookieCounts)) set.add(k);
  return [...set].sort();
}

function extractBookmakers(welcome: Record<string, unknown>): string[] {
  const v = welcome.bookmakers;
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : ""))
    .filter((x) => x.length > 0);
}

function summariseMarkets(markets: unknown): string {
  if (!Array.isArray(markets) || markets.length === 0) return "—";
  return markets
    .map((m) => {
      if (m && typeof m === "object") {
        const name = (m as { name?: unknown }).name;
        if (typeof name === "string") return name;
      }
      return "?";
    })
    .join(", ");
}

function pickFirstMarket(markets: unknown, name: string): string | null {
  if (!Array.isArray(markets)) return null;
  for (const m of markets) {
    if (
      m &&
      typeof m === "object" &&
      (m as { name?: unknown }).name === name
    ) {
      const odds = (m as { odds?: unknown }).odds;
      if (Array.isArray(odds) && odds.length > 0) {
        const first = odds[0] as Record<string, unknown>;
        const home = first.home as string | undefined;
        const draw = first.draw as string | undefined;
        const away = first.away as string | undefined;
        const parts = [home, draw, away].filter(
          (x): x is string => typeof x === "string" && x.length > 0,
        );
        return parts.join(" / ");
      }
    }
  }
  return null;
}

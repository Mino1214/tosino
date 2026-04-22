"use client";

/**
 * 크롤 콘솔 — HQ 가 운영 중 들여다보는 "단일 페이지".
 *
 * 요구 (서머리):
 *  - 상단: API 상태 체크(WS 연결·최근 수신·카운트) + 마지막 크롤 요약 로그
 *  - 북메이커 편집 (odds-api.io 한정, 저장 시 API 반영)
 *  - 매칭 리스트: 페이지네이션 + 리그명/경기명 검색 + 리그명/경기명(한글) 수정
 *
 * 구버전에 있던 "크롤러 리그/팀 매핑", "Odds 매핑", "Odds 화이트리스트" 탭은
 * ConsoleChrome 의 메뉴에서 제거했고, 이 한 페이지에 필요한 것만 모은다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type ConsoleSummary = {
  ws: {
    connected: boolean;
    connectionState: string;
    lastMessageAt: string | null;
    sports: string[];
    stateCount: number;
    autoConnect: boolean;
  };
  snapshots: {
    catalog: { at: string; sport: string; count: number } | null;
    processed: { at: string; sport: string; count: number } | null;
  };
  crawler: {
    lastRawSeenAt: string | null;
    bySport: Array<{ sport: string; locale: string; count: number }>;
    matchedCount: number;
  };
  bookmakers: string[];
};

type MatchingRow = {
  id: string;
  rawMatchId: string;
  internalSportSlug: string | null;
  providerSportSlug: string | null;
  rawLeagueSlug: string | null;
  rawHomeName: string | null;
  rawAwayName: string | null;
  rawKickoffUtc: string | null;
  providerExternalEventId: string | null;
  providerLeagueSlug: string | null;
  providerHomeName: string | null;
  providerAwayName: string | null;
  status: string;
  rawMatch?: {
    id: string;
    sourceLocale?: string | null;
    rawLeagueLabel: string | null;
    rawLeagueSlug: string | null;
    rawCountryLabel: string | null;
    rawHomeName: string | null;
    rawAwayName: string | null;
    pairedRawMatch?: {
      sourceLocale?: string | null;
      rawHomeName: string | null;
      rawAwayName: string | null;
      rawLeagueLabel: string | null;
      rawCountryLabel: string | null;
    } | null;
  };
  // enrichMappingsWithLogos 가 넣어주는 필드
  sourceHomeLogo: string | null;
  sourceAwayLogo: string | null;
  sourceLeagueLogo: string | null;
  sourceCountryFlag: string | null;
  providerHomeLogo: string | null;
  providerAwayLogo: string | null;
  providerHomeKoreanName: string | null;
  providerAwayKoreanName: string | null;
  providerCountryKo: string | null;
  displayLeagueName: string | null;
};

type MatchingListResp = {
  total?: number;
  items?: MatchingRow[];
  rows?: MatchingRow[];
};

function TeamLogo({ src }: { src: string | null }) {
  if (!src) {
    return (
      <span className="inline-block h-5 w-5 flex-none rounded-full bg-gray-100" />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      className="h-5 w-5 flex-none rounded-full object-contain ring-1 ring-gray-200"
    />
  );
}

function CountryCell({
  flag,
  label,
}: {
  flag: string | null;
  label: string | null;
}) {
  if (!flag && !label) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flag}
          alt=""
          className="h-4 w-5 flex-none rounded-sm object-cover ring-1 ring-gray-200"
        />
      ) : null}
      <span className="truncate text-xs text-gray-700">{label ?? "—"}</span>
    </div>
  );
}

/**
 * 같은 providerExternalEventId 로 ko/en 두 행이 내려오면 한 묶음으로 병합.
 * en 쪽을 "primary" 로 유지(매처가 en 기준이라 provider 필드가 채워진 쪽일 가능성 ↑).
 * 이미 pairedRawMatch 가 내재된 경우는 중복 없이 그대로 통과.
 */
function mergeLocalePairs(rows: MatchingRow[]): MatchingRow[] {
  const byEvent = new Map<string, MatchingRow>();
  const out: MatchingRow[] = [];
  for (const r of rows) {
    const key = r.providerExternalEventId;
    if (!key) {
      out.push(r);
      continue;
    }
    const prev = byEvent.get(key);
    if (!prev) {
      byEvent.set(key, r);
      out.push(r);
      continue;
    }
    const prevLocale = (prev.rawMatch?.sourceLocale ?? "").toLowerCase();
    const curLocale = (r.rawMatch?.sourceLocale ?? "").toLowerCase();
    if (curLocale === "en" && prevLocale !== "en") {
      const idx = out.indexOf(prev);
      if (idx >= 0) out[idx] = r;
      byEvent.set(key, r);
    }
  }
  return out;
}

/**
 * row 에서 ko/en 한 쌍을 뽑는다.
 * - 본 row 의 sourceLocale 가 en 이면 self=en, pair=ko
 * - 반대면 self=ko, pair=en
 */
function extractLocalePair(r: MatchingRow): {
  en: { home: string | null; away: string | null; league: string | null } | null;
  ko: { home: string | null; away: string | null; league: string | null } | null;
} {
  const selfLocale = (r.rawMatch?.sourceLocale ?? "").toLowerCase();
  const self = {
    home: r.rawHomeName,
    away: r.rawAwayName,
    league: r.rawMatch?.rawLeagueLabel ?? null,
  };
  const paired = r.rawMatch?.pairedRawMatch;
  const pair = paired
    ? {
        home: paired.rawHomeName,
        away: paired.rawAwayName,
        league: paired.rawLeagueLabel,
      }
    : null;
  if (selfLocale === "en") return { en: self, ko: pair };
  if (selfLocale === "ko") return { ko: self, en: pair };
  // locale 불명: self 를 en 으로 간주(매처 기준이 en)
  return { en: self, ko: pair };
}

function LocaleBadge({ locale }: { locale: "en" | "ko" }) {
  const isEn = locale === "en";
  return (
    <span
      className={`inline-flex h-4 flex-none items-center rounded px-1 text-[9px] font-bold ${
        isEn ? "bg-gray-200 text-gray-600" : "bg-blue-100 text-blue-700"
      }`}
    >
      {isEn ? "EN" : "KR"}
    </span>
  );
}

function fmtDt(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString("ko-KR", { hour12: false });
  } catch {
    return s;
  }
}

export default function CrawlerConsolePage() {
  const { selectedPlatformId, platforms, loading: platLoading } = usePlatform();

  const [summary, setSummary] = useState<ConsoleSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const qs = selectedPlatformId
        ? `?platformId=${encodeURIComponent(selectedPlatformId)}`
        : "";
      const res = await apiFetch<ConsoleSummary>(
        `/hq/odds-api-ws/crawler-console/summary${qs}`,
      );
      setSummary(res);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    loadSummary();
    const id = window.setInterval(loadSummary, 30_000);
    return () => clearInterval(id);
  }, [loadSummary]);

  // ── 북메이커 편집
  const [bookInput, setBookInput] = useState("");
  const [bookSaving, setBookSaving] = useState(false);
  const [bookMsg, setBookMsg] = useState<string | null>(null);

  useEffect(() => {
    setBookInput((summary?.bookmakers ?? []).join(", "));
  }, [summary?.bookmakers]);

  const saveBookmakers = useCallback(async () => {
    if (!selectedPlatformId) {
      setBookMsg("좌측에서 솔루션을 먼저 선택해 주세요.");
      return;
    }
    const list = bookInput
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      setBookSaving(true);
      setBookMsg(null);
      await apiFetch(`/hq/odds-api-ws/bookmakers`, {
        method: "POST",
        body: JSON.stringify({
          platformId: selectedPlatformId,
          bookmakers: list,
        }),
      });
      setBookMsg(`${list.length}개 저장 · WS 재연결 요청`);
      loadSummary();
    } catch (e) {
      setBookMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBookSaving(false);
    }
  }, [bookInput, selectedPlatformId, loadSummary]);

  // ── 매칭 리스트
  const [query, setQuery] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [page, setPage] = useState(1);
  const take = 20;
  const [rows, setRows] = useState<MatchingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);

  const loadRows = useCallback(async () => {
    try {
      setLoadingRows(true);
      const qs = new URLSearchParams({
        status: "matched",
        take: String(take),
        skip: String((page - 1) * take),
        kickoffScope: "upcoming",
      });
      if (query) qs.set("q", query);
      const res = await apiFetch<MatchingListResp>(
        `/hq/crawler/matches?${qs.toString()}`,
      );
      const items = res.items ?? res.rows ?? [];
      setRows(items);
      setTotal(res.total ?? items.length);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "목록 로드 실패");
    } finally {
      setLoadingRows(false);
    }
  }, [page, query]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / take)),
    [total],
  );

  // ── 인라인 편집
  const [editing, setEditing] = useState<
    Record<
      string,
      { league: string; home: string; away: string; country: string }
    >
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  /**
   * "클라이언트에 실제로 보여지는 값" 을 편집 초기값으로.
   * - 리그명: OddsApiLeagueAlias.koreanName(=displayLeagueName 우선) > raw 라벨
   * - 팀명:   OddsApiTeamAlias.koreanName(=providerXxxKoreanName) > raw
   * - 국가:   OddsApiLeagueAlias.country → resolver(providerCountryKo) > raw
   */
  function startEdit(row: MatchingRow) {
    setEditing((prev) => ({
      ...prev,
      [row.id]: {
        league: row.displayLeagueName ?? row.rawMatch?.rawLeagueLabel ?? "",
        home: row.providerHomeKoreanName ?? row.rawHomeName ?? "",
        away: row.providerAwayKoreanName ?? row.rawAwayName ?? "",
        country:
          row.providerCountryKo ?? row.rawMatch?.rawCountryLabel ?? "",
      },
    }));
  }
  function cancelEdit(id: string) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function saveEdit(row: MatchingRow) {
    const draft = editing[row.id];
    if (!draft) return;
    const rawMatchId = row.rawMatchId;
    try {
      setSaving((s) => ({ ...s, [row.id]: true }));
      const tasks: Promise<unknown>[] = [];
      /**
       * raw/:id PATCH 는 서버가 raw + (매칭돼있으면) OddsApi*Alias.koreanName 까지 함께 upsert.
       * 즉 "솔루션 클라이언트가 실제로 보는 한글명" 이 저장됨.
       * 변경 여부는 "현재 보여지는 값"(alias 우선) 과 비교.
       */
      const curLeague =
        (row.displayLeagueName ?? row.rawMatch?.rawLeagueLabel ?? "").trim();
      const curHome = (row.providerHomeKoreanName ?? row.rawHomeName ?? "").trim();
      const curAway = (row.providerAwayKoreanName ?? row.rawAwayName ?? "").trim();
      if (draft.league.trim() !== curLeague) {
        tasks.push(
          apiFetch(`/hq/crawler/matches/raw/${rawMatchId}`, {
            method: "PATCH",
            body: JSON.stringify({ field: "league", value: draft.league }),
          }),
        );
      }
      if (draft.home.trim() !== curHome) {
        tasks.push(
          apiFetch(`/hq/crawler/matches/raw/${rawMatchId}`, {
            method: "PATCH",
            body: JSON.stringify({ field: "home", value: draft.home }),
          }),
        );
      }
      if (draft.away.trim() !== curAway) {
        tasks.push(
          apiFetch(`/hq/crawler/matches/raw/${rawMatchId}`, {
            method: "PATCH",
            body: JSON.stringify({ field: "away", value: draft.away }),
          }),
        );
      }
      /**
       * 국가명 저장 — OddsApiLeagueAlias.country 로 upsert.
       * 표시용 providerCountryKo 는 해당 값을 기반으로 resolver 가 한글로 변환한다.
       * 저장 키: (sport, providerLeagueSlug ?? rawLeagueSlug)
       */
      const originalCountry = (
        row.providerCountryKo ?? row.rawMatch?.rawCountryLabel ?? ""
      ).trim();
      const nextCountry = draft.country.trim();
      if (nextCountry !== originalCountry) {
        const sport = (
          row.internalSportSlug ||
          (row as { providerSportSlug?: string | null }).providerSportSlug ||
          ""
        )
          .toString()
          .trim();
        const leagueSlug = (
          row.providerLeagueSlug ||
          row.rawLeagueSlug ||
          ""
        )
          .toString()
          .trim();
        if (!sport || !leagueSlug) {
          setErr(
            "국가명을 저장하려면 리그 슬러그(provider 또는 raw)와 종목이 필요합니다.",
          );
        } else {
          tasks.push(
            apiFetch(`/hq/crawler/matches/provider-league-alias`, {
              method: "PATCH",
              body: JSON.stringify({
                sport,
                slug: leagueSlug,
                originalName: row.displayLeagueName ?? leagueSlug,
                country: nextCountry,
              }),
            }),
          );
        }
      }
      await Promise.all(tasks);
      cancelEdit(row.id);
      loadRows();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setSaving((s) => {
        const next = { ...s };
        delete next[row.id];
        return next;
      });
    }
  }

  const selectedPlatformLabel =
    platforms.find((p) => p.id === selectedPlatformId)?.name ?? "—";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-bold text-black">크롤 콘솔</h1>
        <p className="text-sm text-gray-500">
          odds-api.io 연결 상태 · 크롤러 최근 사이클 · 매칭된 경기 목록을 한 화면에서.
        </p>
      </header>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* 상태 스트립 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-black">API · 크롤 상태</h2>
          <button
            type="button"
            onClick={loadSummary}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            새로고침
          </button>
        </div>
        {loadingSummary && !summary ? (
          <p className="text-sm text-gray-400">불러오는 중…</p>
        ) : summary ? (
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                WebSocket
              </p>
              <p className="flex items-center gap-1.5 text-base font-semibold text-black">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    summary.ws.connected ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                {summary.ws.connectionState}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                최근 수신: {fmtDt(summary.ws.lastMessageAt)}
              </p>
              <p className="text-[11px] text-gray-500">
                이벤트 보관: {summary.ws.stateCount}건 · 종목{" "}
                {summary.ws.sports.length}개
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                최근 스냅샷 (플랫폼: {selectedPlatformLabel})
              </p>
              <p className="text-xs text-gray-700">
                catalog:{" "}
                {summary.snapshots.catalog
                  ? `${summary.snapshots.catalog.count}건 (${summary.snapshots.catalog.sport}) · ${fmtDt(
                      summary.snapshots.catalog.at,
                    )}`
                  : "없음"}
              </p>
              <p className="text-xs text-gray-700">
                processed:{" "}
                {summary.snapshots.processed
                  ? `${summary.snapshots.processed.count}건 · ${fmtDt(
                      summary.snapshots.processed.at,
                    )}`
                  : "없음"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                마지막 크롤
              </p>
              <p className="text-xs text-gray-700">
                최근 수집: {fmtDt(summary.crawler.lastRawSeenAt)}
              </p>
              <p className="text-xs text-gray-700">
                매칭 완료: <b>{summary.crawler.matchedCount.toLocaleString()}</b>건
              </p>
              {summary.crawler.bySport.length ? (
                <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                  {summary.crawler.bySport.slice(0, 12).map((g) => (
                    <span
                      key={`${g.sport}:${g.locale}`}
                      className="rounded bg-white px-1.5 py-0.5 text-gray-600 ring-1 ring-gray-200"
                    >
                      {g.sport}/{g.locale}: {g.count}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {/* 북메이커 편집 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-black">
            북메이커 (odds-api.io)
          </h2>
          <p className="text-[11px] text-gray-500">
            쉼표(,) 또는 줄바꿈으로 구분. 저장 시 API 가 즉시 재연결됩니다.
          </p>
        </div>
        <textarea
          value={bookInput}
          onChange={(e) => setBookInput(e.target.value)}
          rows={2}
          disabled={!selectedPlatformId || platLoading}
          placeholder="1xbet, Sbobet, Bet365, 22Bet, GG.bet"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={saveBookmakers}
            disabled={bookSaving || !selectedPlatformId}
            className="rounded-lg bg-[#3182f6] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {bookSaving ? "저장 중…" : "저장 · WS 재연결"}
          </button>
          {bookMsg ? (
            <span className="text-xs text-gray-600">{bookMsg}</span>
          ) : null}
        </div>
      </section>

      {/* 매칭 리스트 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-black">매칭된 경기</h2>
            <p className="text-[11px] text-gray-500">
              providerExternalEventId 가 확정된 경기만 · 리그/팀 한글명 수정 가능
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={queryDraft}
              onChange={(e) => setQueryDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setQuery(queryDraft.trim());
                }
              }}
              placeholder="리그명·팀명 검색"
              className="w-60 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setQuery(queryDraft.trim());
              }}
              className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              검색
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="py-2 pr-3">종목</th>
                <th className="py-2 pr-3">국가</th>
                <th className="py-2 pr-3">리그</th>
                <th className="py-2 pr-3">경기</th>
                <th className="py-2 pr-3">킥오프(UTC)</th>
                <th className="py-2 pr-3">EventId</th>
                <th className="py-2 pr-3 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-400">
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-400">
                    매칭된 경기가 없습니다.
                  </td>
                </tr>
              ) : (
                mergeLocalePairs(rows).map((r) => {
                  const ed = editing[r.id];
                  const pair = extractLocalePair(r);
                  const koHome =
                    pair.ko?.home ?? r.providerHomeKoreanName ?? null;
                  const koAway =
                    pair.ko?.away ?? r.providerAwayKoreanName ?? null;
                  const koLeague = pair.ko?.league ?? r.displayLeagueName ?? null;
                  const enHome = pair.en?.home ?? r.providerHomeName ?? null;
                  const enAway = pair.en?.away ?? r.providerAwayName ?? null;
                  const enLeague = pair.en?.league ?? r.providerLeagueSlug ?? null;
                  const countryLabel =
                    r.providerCountryKo ??
                    r.rawMatch?.rawCountryLabel ??
                    null;
                  const leagueLabel =
                    r.displayLeagueName ??
                    r.rawMatch?.rawLeagueLabel ??
                    r.rawLeagueSlug ??
                    "—";
                  if (ed) {
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-gray-100 bg-blue-50/30 align-top"
                      >
                        <td className="py-2 pr-3 text-xs text-gray-600">
                          {r.internalSportSlug ?? "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-1.5">
                            {r.sourceCountryFlag ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.sourceCountryFlag}
                                alt=""
                                className="h-4 w-5 flex-none rounded-sm object-cover ring-1 ring-gray-200"
                              />
                            ) : null}
                            <input
                              value={ed.country}
                              onChange={(e) =>
                                setEditing((prev) => ({
                                  ...prev,
                                  [r.id]: {
                                    ...prev[r.id],
                                    country: e.target.value,
                                  },
                                }))
                              }
                              placeholder="대한민국"
                              className="w-28 rounded border border-gray-200 px-2 py-1 text-xs"
                            />
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {r.sourceLeagueLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={r.sourceLeagueLogo}
                                  alt=""
                                  className="h-5 w-5 flex-none rounded-sm object-contain"
                                />
                              ) : null}
                              <LocaleBadge locale="ko" />
                              <input
                                value={ed.league}
                                onChange={(e) =>
                                  setEditing((prev) => ({
                                    ...prev,
                                    [r.id]: {
                                      ...prev[r.id],
                                      league: e.target.value,
                                    },
                                  }))
                                }
                                className="w-52 rounded border border-gray-200 px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2 pl-7">
                              <LocaleBadge locale="en" />
                              <span className="truncate text-[11px] text-gray-500">
                                {enLeague ?? "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <TeamLogo src={r.sourceHomeLogo} />
                                <LocaleBadge locale="ko" />
                                <input
                                  value={ed.home}
                                  onChange={(e) =>
                                    setEditing((prev) => ({
                                      ...prev,
                                      [r.id]: {
                                        ...prev[r.id],
                                        home: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-48 rounded border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2 pl-7">
                                <LocaleBadge locale="en" />
                                <span className="text-[11px] text-gray-500">
                                  {enHome ?? "—"}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <TeamLogo src={r.sourceAwayLogo} />
                                <LocaleBadge locale="ko" />
                                <input
                                  value={ed.away}
                                  onChange={(e) =>
                                    setEditing((prev) => ({
                                      ...prev,
                                      [r.id]: {
                                        ...prev[r.id],
                                        away: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-48 rounded border border-gray-200 px-2 py-1 text-xs"
                                />
                              </div>
                              <div className="flex items-center gap-2 pl-7">
                                <LocaleBadge locale="en" />
                                <span className="text-[11px] text-gray-500">
                                  {enAway ?? "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-gray-500">
                          {fmtDt(r.rawKickoffUtc)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-gray-700">
                          {r.providerExternalEventId ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          <button
                            type="button"
                            disabled={saving[r.id]}
                            onClick={() => saveEdit(r)}
                            className="mr-1 rounded bg-[#3182f6] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(r.id)}
                            className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700"
                          >
                            취소
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {r.internalSportSlug ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <CountryCell
                          flag={r.sourceCountryFlag}
                          label={countryLabel}
                        />
                      </td>
                      <td className="py-2 pr-3 text-sm text-black">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {r.sourceLeagueLogo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.sourceLeagueLogo}
                                alt=""
                                className="h-5 w-5 flex-none rounded-sm object-contain"
                              />
                            ) : null}
                            <LocaleBadge locale="ko" />
                            <span className="truncate font-medium">
                              {koLeague ?? leagueLabel ?? "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pl-7">
                            <LocaleBadge locale="en" />
                            <span className="truncate text-xs text-gray-500">
                              {enLeague ?? "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-sm text-black">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <TeamLogo src={r.sourceHomeLogo} />
                              <LocaleBadge locale="ko" />
                              <span className="font-medium">
                                {koHome ??
                                  r.providerHomeKoreanName ??
                                  r.rawHomeName ??
                                  "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pl-7">
                              <LocaleBadge locale="en" />
                              <span className="text-xs text-gray-500">
                                {enHome ?? "—"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <TeamLogo src={r.sourceAwayLogo} />
                              <LocaleBadge locale="ko" />
                              <span className="font-medium">
                                {koAway ??
                                  r.providerAwayKoreanName ??
                                  r.rawAwayName ??
                                  "—"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pl-7">
                              <LocaleBadge locale="en" />
                              <span className="text-xs text-gray-500">
                                {enAway ?? "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-gray-500">
                        {fmtDt(r.rawKickoffUtc)}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-gray-700">
                        {r.providerExternalEventId ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>
            총 {total.toLocaleString()}건 · 페이지 {page} / {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-gray-200 px-2 py-1 disabled:opacity-30"
            >
              이전
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded border border-gray-200 px-2 py-1 disabled:opacity-30"
            >
              다음
            </button>
          </div>
        </div>
      </section>

      {/*
       * ---------------------------------------------------------------
       * 알리아스 편집기 — 리그 / 팀 을 "수집내역" 기준으로 독립 수정
       * (강등·이적으로 리그-팀 관계가 바뀌는 경우를 따로 관리하기 위함)
       * ---------------------------------------------------------------
       */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeagueAliasPanel />
        <TeamAliasPanel />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 알리아스(=솔루션 표시명) 독립 편집기                                 */
/* ------------------------------------------------------------------ */

const SPORT_OPTIONS = [
  "",
  "football",
  "basketball",
  "baseball",
  "ice-hockey",
  "volleyball",
  "tennis",
  "american-football",
  "esports",
];

type LeagueAliasRow = {
  id: string;
  sport: string;
  slug: string;
  originalName: string | null;
  koreanName: string | null;
  country: string | null;
  logoUrl: string | null;
};

type TeamAliasRow = {
  id: string;
  sport: string;
  externalId: string;
  originalName: string | null;
  koreanName: string | null;
  logoUrl: string | null;
};

function LeagueAliasPanel() {
  const [sport, setSport] = useState("football");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const [rows, setRows] = useState<LeagueAliasRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    Record<string, { koreanName: string; country: string }>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (sport) qs.set("sport", sport);
      if (q) qs.set("q", q);
      if (onlyUnmapped) qs.set("onlyUnmapped", "true");
      qs.set("take", "300");
      const r = await apiFetch<{ rows: LeagueAliasRow[] }>(
        `/hq/odds-api-ws/aliases/leagues?${qs.toString()}`,
      );
      setRows(r.rows ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [sport, q, onlyUnmapped]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row: LeagueAliasRow) {
    setDraft((prev) => ({
      ...prev,
      [row.id]: {
        koreanName: row.koreanName ?? "",
        country: row.country ?? "",
      },
    }));
  }

  function cancelEdit(id: string) {
    setDraft((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  }

  async function save(row: LeagueAliasRow) {
    const d = draft[row.id];
    if (!d) return;
    try {
      setSaving((s) => ({ ...s, [row.id]: true }));
      await apiFetch(`/hq/odds-api-ws/aliases/leagues/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          koreanName: d.koreanName.trim(),
          country: d.country.trim(),
        }),
      });
      cancelEdit(row.id);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving((s) => {
        const n = { ...s };
        delete n[row.id];
        return n;
      });
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-black">
          리그 수집내역 (알리아스)
        </h2>
        <span className="text-xs text-gray-500">
          {loading ? "불러오는 중…" : `${rows.length}건`}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded border border-gray-200 px-2 py-1 text-xs"
        >
          {SPORT_OPTIONS.map((s) => (
            <option key={s || "all"} value={s}>
              {s || "전체 종목"}
            </option>
          ))}
        </select>
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQ(qDraft.trim());
          }}
          placeholder="리그명(영/한) · slug 로 검색"
          className="flex-1 min-w-[180px] rounded border border-gray-200 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => setQ(qDraft.trim())}
          className="rounded bg-[#3182f6] px-3 py-1 text-xs font-semibold text-white"
        >
          검색
        </button>
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={onlyUnmapped}
            onChange={(e) => setOnlyUnmapped(e.target.checked)}
          />
          한글 미입력만
        </label>
      </div>

      {err ? (
        <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {err}
        </div>
      ) : null}

      <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white text-left text-[10px] uppercase tracking-wider text-gray-500">
            <tr className="border-b border-gray-100">
              <th className="py-1 pr-2">종목</th>
              <th className="py-1 pr-2">원문 / slug</th>
              <th className="py-1 pr-2">한글명</th>
              <th className="py-1 pr-2">국가</th>
              <th className="py-1 pr-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-400">
                  결과 없음
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const d = draft[row.id];
                return (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-1 pr-2 text-[11px] text-gray-500">
                      {row.sport}
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex flex-col">
                        <span>{row.originalName ?? row.slug}</span>
                        <span className="font-mono text-[10px] text-gray-400">
                          {row.slug}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      {d ? (
                        <input
                          value={d.koreanName}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                koreanName: e.target.value,
                              },
                            }))
                          }
                          className="w-40 rounded border border-gray-200 px-2 py-0.5 text-xs"
                        />
                      ) : (
                        <span className="font-medium">
                          {row.koreanName ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-2">
                      {d ? (
                        <input
                          value={d.country}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                country: e.target.value,
                              },
                            }))
                          }
                          className="w-28 rounded border border-gray-200 px-2 py-0.5 text-xs"
                        />
                      ) : (
                        <span className="text-[11px] text-gray-600">
                          {row.country ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-2 text-right">
                      {d ? (
                        <>
                          <button
                            type="button"
                            disabled={saving[row.id]}
                            onClick={() => save(row)}
                            className="mr-1 rounded bg-[#3182f6] px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(row.id)}
                            className="rounded border border-gray-200 px-2 py-0.5 text-[11px]"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50"
                        >
                          수정
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamAliasPanel() {
  const [sport, setSport] = useState("football");
  const [q, setQ] = useState("");
  const [qDraft, setQDraft] = useState("");
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const [rows, setRows] = useState<TeamAliasRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { koreanName: string }>>(
    {},
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (sport) qs.set("sport", sport);
      if (q) qs.set("q", q);
      if (onlyUnmapped) qs.set("onlyUnmapped", "true");
      qs.set("take", "300");
      const r = await apiFetch<{ rows: TeamAliasRow[] }>(
        `/hq/odds-api-ws/aliases/teams?${qs.toString()}`,
      );
      setRows(r.rows ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [sport, q, onlyUnmapped]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(row: TeamAliasRow) {
    setDraft((prev) => ({
      ...prev,
      [row.id]: { koreanName: row.koreanName ?? "" },
    }));
  }

  function cancelEdit(id: string) {
    setDraft((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  }

  async function save(row: TeamAliasRow) {
    const d = draft[row.id];
    if (!d) return;
    try {
      setSaving((s) => ({ ...s, [row.id]: true }));
      await apiFetch(`/hq/odds-api-ws/aliases/teams/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ koreanName: d.koreanName.trim() }),
      });
      cancelEdit(row.id);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving((s) => {
        const n = { ...s };
        delete n[row.id];
        return n;
      });
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-black">
          팀(경기) 수집내역 (알리아스)
        </h2>
        <span className="text-xs text-gray-500">
          {loading ? "불러오는 중…" : `${rows.length}건`}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="rounded border border-gray-200 px-2 py-1 text-xs"
        >
          {SPORT_OPTIONS.map((s) => (
            <option key={s || "all"} value={s}>
              {s || "전체 종목"}
            </option>
          ))}
        </select>
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQ(qDraft.trim());
          }}
          placeholder="팀명(영/한) · id 로 검색"
          className="flex-1 min-w-[180px] rounded border border-gray-200 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={() => setQ(qDraft.trim())}
          className="rounded bg-[#3182f6] px-3 py-1 text-xs font-semibold text-white"
        >
          검색
        </button>
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={onlyUnmapped}
            onChange={(e) => setOnlyUnmapped(e.target.checked)}
          />
          한글 미입력만
        </label>
      </div>

      {err ? (
        <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {err}
        </div>
      ) : null}

      <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white text-left text-[10px] uppercase tracking-wider text-gray-500">
            <tr className="border-b border-gray-100">
              <th className="py-1 pr-2">종목</th>
              <th className="py-1 pr-2">원문 팀명 / id</th>
              <th className="py-1 pr-2">한글명</th>
              <th className="py-1 pr-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-400">
                  결과 없음
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const d = draft[row.id];
                return (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-1 pr-2 text-[11px] text-gray-500">
                      {row.sport}
                    </td>
                    <td className="py-1 pr-2">
                      <div className="flex items-center gap-2">
                        <TeamLogo src={row.logoUrl} />
                        <div className="flex flex-col">
                          <span>{row.originalName ?? row.externalId}</span>
                          <span className="font-mono text-[10px] text-gray-400">
                            id: {row.externalId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      {d ? (
                        <input
                          value={d.koreanName}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                koreanName: e.target.value,
                              },
                            }))
                          }
                          className="w-40 rounded border border-gray-200 px-2 py-0.5 text-xs"
                        />
                      ) : (
                        <span className="font-medium">
                          {row.koreanName ?? (
                            <span className="text-gray-400">—</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-2 text-right">
                      {d ? (
                        <>
                          <button
                            type="button"
                            disabled={saving[row.id]}
                            onClick={() => save(row)}
                            className="mr-1 rounded bg-[#3182f6] px-2 py-0.5 text-[11px] font-semibold text-white disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEdit(row.id)}
                            className="rounded border border-gray-200 px-2 py-0.5 text-[11px]"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded border border-gray-200 px-2 py-0.5 text-[11px] hover:bg-gray-50"
                        >
                          수정
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

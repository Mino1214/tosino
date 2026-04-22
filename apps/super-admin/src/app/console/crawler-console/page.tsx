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
    rawLeagueLabel: string | null;
    rawLeagueSlug: string | null;
    rawHomeName: string | null;
    rawAwayName: string | null;
  };
};

type MatchingListResp = {
  total?: number;
  items?: MatchingRow[];
  rows?: MatchingRow[];
};

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
    Record<string, { league: string; home: string; away: string }>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  function startEdit(row: MatchingRow) {
    setEditing((prev) => ({
      ...prev,
      [row.id]: {
        league: row.rawMatch?.rawLeagueLabel ?? "",
        home: row.rawHomeName ?? "",
        away: row.rawAwayName ?? "",
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
      if (draft.league.trim() !== (row.rawMatch?.rawLeagueLabel ?? "").trim()) {
        tasks.push(
          apiFetch(`/hq/crawler/matches/raw/${rawMatchId}`, {
            method: "PATCH",
            body: JSON.stringify({ field: "league", value: draft.league }),
          }),
        );
      }
      if (draft.home.trim() !== (row.rawHomeName ?? "").trim()) {
        tasks.push(
          apiFetch(`/hq/crawler/matches/raw/${rawMatchId}`, {
            method: "PATCH",
            body: JSON.stringify({ field: "home", value: draft.home }),
          }),
        );
      }
      if (draft.away.trim() !== (row.rawAwayName ?? "").trim()) {
        tasks.push(
          apiFetch(`/hq/crawler/matches/raw/${rawMatchId}`, {
            method: "PATCH",
            body: JSON.stringify({ field: "away", value: draft.away }),
          }),
        );
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
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    매칭된 경기가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const ed = editing[r.id];
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
                          <input
                            value={ed.league}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [r.id]: { ...prev[r.id], league: e.target.value },
                              }))
                            }
                            className="w-52 rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-col gap-1">
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
                            <span className="text-[10px] text-gray-400">vs</span>
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
                      <td className="py-2 pr-3 text-sm text-black">
                        {r.rawMatch?.rawLeagueLabel ??
                          r.rawLeagueSlug ??
                          "—"}
                      </td>
                      <td className="py-2 pr-3 text-sm text-black">
                        {r.rawHomeName ?? "—"}{" "}
                        <span className="text-gray-400">vs</span>{" "}
                        {r.rawAwayName ?? "—"}
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
    </div>
  );
}

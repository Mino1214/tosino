"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SportsLobbyLayout,
  type DataSourceTabSpec,
} from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES } from "@/data/sports-leagues";
import {
  fetchOddsHostInplayGame,
  fetchOddsHostInplayList,
  fetchSportsLive,
  type SportsLiveGameDto,
} from "@/lib/api";
import { useOddsHostProxySecret } from "@/lib/useOddsHostProxySecret";
import { liveGamesToLeagueGroups } from "@/lib/sports-live-mapper";
import { extractSportsLiveGamesFromPayload } from "@/lib/sports-live-game-extract";
import { useBootstrapHost } from "@/components/BootstrapProvider";
import { OddsHostDiagnosticPanel } from "@/components/OddsHostDiagnosticPanel";
import { sportsLobbyShowOperatorTools } from "@/lib/sports-lobby-mode";

const DATA_TABS: DataSourceTabSpec[] = [
  { id: "demo", label: "데모" },
  { id: "api", label: "API 테스트" },
];

type InplayApiSub = "list" | "game";
type ListSource = "snapshot" | "oddshost" | "paste";

const BET_TABS_NOTICE =
  "전체·축구·농구·E스포츠 탭은 UI만 있고, 아직 종목별로 목록을 필터하지 않습니다. 같은 데이터가 표시됩니다.";

export function InplayLobbyClient() {
  const requestHost = useBootstrapHost();
  const showOperatorTools = sportsLobbyShowOperatorTools();
  const [activeDataSource, setActiveDataSource] = useState(
    showOperatorTools ? "api" : "live",
  );
  const [apiSub, setApiSub] = useState<InplayApiSub>("list");
  const [listSource, setListSource] = useState<ListSource>("snapshot");
  const [sport, setSport] = useState("1");
  const [gameId, setGameId] = useState("");
  const { effectiveSecret, autoSecret, manualOverride, setManualOverride } =
    useOddsHostProxySecret({ allowManualOverride: true });
  const [pasteText, setPasteText] = useState("");
  const [games, setGames] = useState<SportsLiveGameDto[]>([]);
  const [gameDetail, setGameDetail] = useState<unknown>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [gameErr, setGameErr] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);

  const loadListSnapshot = useCallback(async () => {
    setLoadingList(true);
    setListErr(null);
    try {
      const r = await fetchSportsLive(requestHost);
      setGames(Array.isArray(r.game) ? r.game : []);
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "sports-live 실패");
      setGames([]);
    } finally {
      setLoadingList(false);
    }
  }, [requestHost]);

  const loadListOddshost = useCallback(async () => {
    setLoadingList(true);
    setListErr(null);
    try {
      const data = await fetchOddsHostInplayList(
        requestHost,
        sport.trim() || "1",
        effectiveSecret.trim() || undefined,
      );
      const g = extractSportsLiveGamesFromPayload(data);
      setGames(g);
      if (g.length === 0) setListErr("응답에 game 배열이 없습니다.");
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "인플레이 목록 프록시 실패");
      setGames([]);
    } finally {
      setLoadingList(false);
    }
  }, [effectiveSecret, requestHost, sport]);

  const applyPasteList = useCallback(() => {
    setListErr(null);
    try {
      const parsed = JSON.parse(pasteText || "{}") as unknown;
      const g = extractSportsLiveGamesFromPayload(parsed);
      setGames(g);
      if (g.length === 0) setListErr("JSON에서 game[] 를 찾지 못했습니다.");
    } catch (e) {
      setListErr(e instanceof Error ? e.message : "JSON 파싱 실패");
      setGames([]);
    }
  }, [pasteText]);

  useEffect(() => {
    if (!showOperatorTools) setApiSub("list");
  }, [showOperatorTools]);

  useEffect(() => {
    if (!showOperatorTools) {
      const tick = () => void loadListSnapshot();
      tick();
      const id = window.setInterval(tick, 10_000);
      return () => clearInterval(id);
    }
    if (activeDataSource !== "api" || apiSub !== "list") return;
    if (listSource !== "snapshot" && listSource !== "oddshost") return;

    const tick = () => {
      if (listSource === "snapshot") void loadListSnapshot();
      else void loadListOddshost();
    };
    tick();
    const ms = listSource === "snapshot" ? 10_000 : 10_000;
    const id = window.setInterval(tick, ms);
    return () => clearInterval(id);
  }, [
    showOperatorTools,
    activeDataSource,
    apiSub,
    listSource,
    loadListOddshost,
    loadListSnapshot,
  ]);

  const loadGameDetail = useCallback(async () => {
    const gid = gameId.trim();
    if (!gid) {
      setGameErr("game_id 를 입력하세요.");
      return;
    }
    setLoadingGame(true);
    setGameErr(null);
    try {
      const data = await fetchOddsHostInplayGame(
        requestHost,
        sport.trim() || "1",
        gid,
        effectiveSecret.trim() || undefined,
      );
      setGameDetail(data);
    } catch (e) {
      setGameErr(e instanceof Error ? e.message : "라이브 게임 프록시 실패");
      setGameDetail(null);
    } finally {
      setLoadingGame(false);
    }
  }, [gameId, effectiveSecret, requestHost, sport]);

  useEffect(() => {
    if (!showOperatorTools) return;
    if (activeDataSource !== "api" || apiSub !== "game") return;
    const gid = gameId.trim();
    if (!gid) {
      setGameDetail(null);
      return;
    }
    void loadGameDetail();
    const id = window.setInterval(() => {
      void loadGameDetail();
    }, 2000);
    return () => clearInterval(id);
  }, [showOperatorTools, activeDataSource, apiSub, gameId, loadGameDetail]);

  const apiLeagues = useMemo(() => liveGamesToLeagueGroups(games), [games]);

  const leagues =
    showOperatorTools && activeDataSource === "demo"
      ? SHARED_LEAGUES
      : showOperatorTools && apiSub === "game"
        ? []
        : apiLeagues;

  const panel =
    showOperatorTools && activeDataSource === "api" ? (
      <div className="space-y-3 text-[11px] text-zinc-300">
        <p className="text-zinc-500">
          라이브 목록 권장 주기 약 10초, 라이브 게임 상세 약 1~2초. OddsHost는 허용 IP의
          API 서버에서만 프록시가 동작합니다.
        </p>
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "list" as const, label: "라이브 목록" },
              { id: "game" as const, label: "라이브 게임(상세)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setApiSub(t.id)}
              className={[
                "rounded-md px-3 py-1.5 font-semibold transition-colors",
                apiSub === t.id
                  ? "bg-[rgba(218,174,87,0.2)] text-main-gold ring-1 ring-[rgba(218,174,87,0.45)]"
                  : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-zinc-500">sport id</span>
            <input
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-24 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
            />
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col gap-0.5">
            <span className="text-zinc-500">oddshostSecret (수동 덮어쓰기)</span>
            <input
              type="password"
              value={manualOverride}
              onChange={(e) => setManualOverride(e.target.value)}
              placeholder={
                autoSecret
                  ? "비우면 부트스트랩·환경값 사용"
                  : "API ODDSHOST_PROXY_SECRET 필요"
              }
              className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
              autoComplete="off"
            />
          </label>
        </div>

        <OddsHostDiagnosticPanel
          requestHost={requestHost}
          sport={sport}
          oddshostSecret={effectiveSecret}
        />

        {apiSub === "list" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  { id: "snapshot" as const, label: "DB 스냅샷 (sports-live)" },
                  { id: "oddshost" as const, label: "OddsHost 프록시" },
                  { id: "paste" as const, label: "JSON 붙여넣기" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setListSource(s.id)}
                  className={[
                    "rounded border px-2 py-1",
                    listSource === s.id
                      ? "border-[rgba(218,174,87,0.5)] text-main-gold"
                      : "border-white/10 text-zinc-500",
                  ].join(" ")}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {listSource === "paste" && (
              <div className="space-y-1">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  spellCheck={false}
                  placeholder='{ "success": 1, "game": [ … ] }'
                  className="min-h-[100px] w-full rounded border border-white/10 bg-black/50 p-2 font-mono text-[10px]"
                />
                <button
                  type="button"
                  onClick={applyPasteList}
                  className="rounded border border-white/15 px-2 py-1 text-zinc-200"
                >
                  목록 반영
                </button>
              </div>
            )}
            {listErr && (
              <p className="text-red-400">{listErr}</p>
            )}
            {loadingList && <p className="text-zinc-500">불러오는 중…</p>}
            {listSource === "snapshot" &&
              !loadingList &&
              !listErr &&
              games.length === 0 && (
                <p className="rounded border border-amber-900/40 bg-amber-950/30 px-2 py-2 text-[10px] leading-relaxed text-amber-200/90">
                  <code className="text-amber-100/80">fetchedAt: null</code>,{" "}
                  <code className="text-amber-100/80">game: []</code> 는 DB에
                  sports-live 스냅샷이 없을 때의 정상 응답입니다.{" "}
                  <code className="text-amber-100/80">
                    POST …/sync/sports-live
                  </code>{" "}
                  업로드, <strong>JSON 붙여넣기</strong>, 또는{" "}
                  <strong>OddsHost 프록시</strong>를 선택하세요.
                </p>
              )}
            {games.length > 0 && (
              <label className="flex flex-col gap-0.5 text-zinc-400">
                상세 탭으로 보낼 game_id
                <select
                  className="max-w-full rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                >
                  <option value="">선택…</option>
                  {games.map((g) => (
                    <option key={g.game_id} value={g.game_id}>
                      {g.game_id} — {g.team[0]?.team1_name_kor} vs{" "}
                      {g.team[1]?.team2_name_kor}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mt-1 w-fit rounded bg-white/10 px-2 py-1 text-zinc-200"
                  onClick={() => setApiSub("game")}
                >
                  라이브 게임 탭으로
                </button>
              </label>
            )}
          </div>
        )}

        {apiSub === "game" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-0.5">
                <span className="text-zinc-500">game_id</span>
                <input
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="w-44 rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
                />
              </label>
              <button
                type="button"
                disabled={loadingGame}
                onClick={() => void loadGameDetail()}
                className="rounded bg-[rgba(218,174,87,0.15)] px-2 py-1 text-main-gold disabled:opacity-40"
              >
                수동 새로고침
              </button>
            </div>
            {gameErr && <p className="text-red-400">{gameErr}</p>}
            <pre className="max-h-[320px] overflow-auto rounded border border-white/10 bg-black/60 p-2 text-[10px] text-zinc-300">
              {gameDetail != null
                ? JSON.stringify(gameDetail, null, 2)
                : "(응답 없음)"}
            </pre>
          </div>
        )}
      </div>
    ) : null;

  const betTabs = useMemo(
    () => [
      {
        id: "all",
        label: "전체",
        count: showOperatorTools && activeDataSource === "demo" ? 34 : games.length,
      },
      {
        id: "soccer",
        label: "축구",
        count: showOperatorTools && activeDataSource === "demo" ? 12 : 0,
      },
      {
        id: "basketball",
        label: "농구",
        count: showOperatorTools && activeDataSource === "demo" ? 8 : 0,
      },
      {
        id: "esports",
        label: "E스포츠",
        count: showOperatorTools && activeDataSource === "demo" ? 6 : 0,
      },
    ],
    [activeDataSource, games.length, showOperatorTools],
  );

  return (
    <SportsLobbyLayout
      title="인플레이"
      betTabs={betTabs}
      leagues={leagues}
      bannerText="인플레이 이벤트 — 실시간으로 경기를 보며 배팅하세요!"
      dataSourceTabs={showOperatorTools ? DATA_TABS : undefined}
      activeDataSource={showOperatorTools ? activeDataSource : undefined}
      onDataSourceChange={
        showOperatorTools ? setActiveDataSource : undefined
      }
      dataSourcePanel={showOperatorTools ? panel : undefined}
      betTabsNotice={showOperatorTools ? BET_TABS_NOTICE : undefined}
    />
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SportsLobbyLayout,
  type DataSourceTabSpec,
} from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES } from "@/data/sports-leagues";
import {
  defaultOddshostProxySecretFromEnv,
  fetchOddsHostInplayList,
  fetchSportsLive,
  type SportsLiveGameDto,
} from "@/lib/api";
import { extractSportsLiveGamesFromPayload } from "@/lib/sports-live-game-extract";
import { liveGamesToLeagueGroups } from "@/lib/sports-live-mapper";
import { useBootstrapHost } from "@/components/BootstrapProvider";

const DATA_TABS: DataSourceTabSpec[] = [
  { id: "demo", label: "데모" },
  { id: "api", label: "API 테스트" },
];

type ListSource = "snapshot" | "oddshost" | "paste";

const BET_TABS_NOTICE =
  "크로스·스페셜·실시간 탭은 UI만 있고, 아직 API별로 목록을 나누지 않습니다. 같은 데이터가 표시됩니다.";

export function SportsKrLobbyClient() {
  const requestHost = useBootstrapHost();
  const [activeDataSource, setActiveDataSource] = useState("api");
  const [listSource, setListSource] = useState<ListSource>("snapshot");
  const [sport, setSport] = useState("1");
  const [oddshostSecret, setOddshostSecret] = useState(
    defaultOddshostProxySecretFromEnv,
  );
  const [pasteText, setPasteText] = useState("");
  const [games, setGames] = useState<SportsLiveGameDto[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

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
        oddshostSecret.trim() || undefined,
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
  }, [oddshostSecret, requestHost, sport]);

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
    if (activeDataSource !== "api") return;
    if (listSource !== "snapshot" && listSource !== "oddshost") return;

    const tick = () => {
      if (listSource === "snapshot") void loadListSnapshot();
      else void loadListOddshost();
    };
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [activeDataSource, listSource, loadListOddshost, loadListSnapshot]);

  const apiLeagues = useMemo(() => liveGamesToLeagueGroups(games), [games]);

  const leagues =
    activeDataSource === "demo" ? SHARED_LEAGUES : apiLeagues;

  const panel =
    activeDataSource === "api" ? (
      <div className="space-y-3 text-[11px] text-zinc-300">
        <p className="text-zinc-500">
          인플레이 라이브 목록과 동일 소스(DB 스냅샷 / OddsHost / JSON)입니다. 스냅샷이 비어 있으면
          붙여넣기 또는 프록시를 사용하세요.
        </p>
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
            <span className="text-zinc-500">oddshostSecret</span>
            <input
              type="password"
              value={oddshostSecret}
              onChange={(e) => setOddshostSecret(e.target.value)}
              className="rounded border border-white/10 bg-zinc-900 px-2 py-1 text-white"
              autoComplete="off"
            />
          </label>
        </div>
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
        {listErr && <p className="text-red-400">{listErr}</p>}
        {loadingList && <p className="text-zinc-500">불러오는 중…</p>}
        {listSource === "snapshot" &&
          !loadingList &&
          !listErr &&
          games.length === 0 && (
            <p className="rounded border border-amber-900/40 bg-amber-950/30 px-2 py-2 text-[10px] leading-relaxed text-amber-200/90">
              <code className="text-amber-100/80">game: []</code> ·{" "}
              <code className="text-amber-100/80">fetchedAt: null</code> 은 이
              플랫폼에 <strong>sports-live</strong> 스냅샷이 아직 없다는 뜻입니다(오류 아님).
              관리자 JWT로{" "}
              <code className="text-amber-100/80">
                POST /api/platforms/플랫폼ID/sync/sports-live
              </code>{" "}
              에 라이브 목록 JSON 본문을 올리거나, 여기서{" "}
              <strong>JSON 붙여넣기</strong> / <strong>OddsHost 프록시</strong>를
              쓰면 목록이 채워집니다.
            </p>
          )}
      </div>
    ) : null;

  const betTabs = useMemo(
    () => [
      {
        id: "cross",
        label: "크로스",
        count: activeDataSource === "demo" ? 83 : games.length,
      },
      {
        id: "special",
        label: "스페셜",
        count: activeDataSource === "demo" ? 22 : games.length,
      },
      {
        id: "realtime",
        label: "실시간",
        count: activeDataSource === "demo" ? 88 : games.length,
      },
    ],
    [activeDataSource, games.length],
  );

  return (
    <SportsLobbyLayout
      title="스포츠"
      betTabs={betTabs}
      leagues={leagues}
      bannerText="스포츠 이벤트 진행 중 — 첫충/매충 보너스 혜택을 받아가세요!"
      dataSourceTabs={DATA_TABS}
      activeDataSource={activeDataSource}
      onDataSourceChange={setActiveDataSource}
      dataSourcePanel={panel}
      betTabsNotice={BET_TABS_NOTICE}
    />
  );
}

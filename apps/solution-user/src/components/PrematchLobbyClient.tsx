"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SportsLobbyLayout,
  type DataSourceTabSpec,
} from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES } from "@/data/sports-leagues";
import {
  fetchOddsHostPrematch,
  fetchSportsPrematchSnapshot,
  type SportsLiveGameDto,
} from "@/lib/api";
import { useOddsHostProxySecret } from "@/lib/useOddsHostProxySecret";
import { extractSportsLiveGamesFromPayload } from "@/lib/sports-live-game-extract";
import { liveGamesToLeagueGroups } from "@/lib/sports-live-mapper";
import { sportsLobbyShowOperatorTools } from "@/lib/sports-lobby-mode";
import { useBootstrapHost } from "@/components/BootstrapProvider";
import { OddsHostDiagnosticPanel } from "@/components/OddsHostDiagnosticPanel";

const DATA_TABS: DataSourceTabSpec[] = [
  { id: "demo", label: "데모" },
  { id: "api", label: "API 테스트" },
];

const BET_TABS_NOTICE =
  "예정경기·오늘·내일 탭은 UI만 있고, 아직 날짜별로 목록을 나누지 않습니다. 같은 데이터가 표시됩니다.";

export function PrematchLobbyClient() {
  const requestHost = useBootstrapHost();
  const showOperatorTools = sportsLobbyShowOperatorTools();
  /** 운영 모드에선 스냅샷만 카드에 반영. 개발에선 데모/API 테스트 전환 */
  const [activeDataSource, setActiveDataSource] = useState(
    showOperatorTools ? "demo" : "live",
  );
  const [sport, setSport] = useState("1");
  const { effectiveSecret, autoSecret, manualOverride, setManualOverride } =
    useOddsHostProxySecret({ allowManualOverride: true });
  const [rawJson, setRawJson] = useState<string>("");
  const [snapshotGames, setSnapshotGames] = useState<SportsLiveGameDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const applyPayload = useCallback((payload: unknown) => {
    setErr(null);
    try {
      setRawJson(JSON.stringify(payload, null, 2));
    } catch {
      setRawJson(String(payload));
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetchSportsPrematchSnapshot(requestHost);
      const payload = r.payload ?? null;
      setSnapshotGames(extractSportsLiveGamesFromPayload(payload));
      if (showOperatorTools) {
        applyPayload(
          payload ?? { fetchedAt: r.fetchedAt, note: "payload 비어 있음" },
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "스냅샷 로드 실패");
      setSnapshotGames([]);
    } finally {
      setLoading(false);
    }
  }, [applyPayload, requestHost, showOperatorTools]);

  useEffect(() => {
    if (!showOperatorTools) {
      const tick = () => void loadSnapshot();
      tick();
      const id = window.setInterval(tick, 120_000);
      return () => clearInterval(id);
    }
  }, [showOperatorTools, loadSnapshot]);

  const fetchProxyPrematch = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchOddsHostPrematch(
        requestHost,
        sport.trim() || "1",
        effectiveSecret.trim() || undefined,
      );
      setSnapshotGames(extractSportsLiveGamesFromPayload(data));
      applyPayload(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "프리매치 프록시 실패");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, effectiveSecret, requestHost, sport]);

  const onPasteApply = useCallback(() => {
    setErr(null);
    try {
      const parsed = JSON.parse(rawJson || "{}") as unknown;
      setSnapshotGames(extractSportsLiveGamesFromPayload(parsed));
      applyPayload(parsed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "JSON 파싱 실패");
    }
  }, [applyPayload, rawJson]);

  const snapshotLeagues = useMemo(
    () => liveGamesToLeagueGroups(snapshotGames),
    [snapshotGames],
  );

  const leagues = useMemo(() => {
    if (showOperatorTools && activeDataSource === "demo") {
      return SHARED_LEAGUES;
    }
    if (!showOperatorTools) {
      return snapshotLeagues;
    }
    return activeDataSource === "demo" ? SHARED_LEAGUES : snapshotLeagues;
  }, [activeDataSource, showOperatorTools, snapshotLeagues]);

  const panel =
    showOperatorTools && activeDataSource === "api" ? (
      <div className="space-y-3 text-[11px] text-zinc-300">
        <p className="text-zinc-500">
          프리매치 카드 매핑 전 단계입니다. OddsHost 프록시(
          <code className="text-zinc-400">/public/oddshost/prematch</code>) 또는
          스냅샷·JSON 붙여넣기로 응답을 확인하세요. 인증키는 서버{" "}
          <code className="text-zinc-400">.env</code>에만 두세요.
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
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchProxyPrematch()}
            className="rounded bg-[rgba(218,174,87,0.2)] px-3 py-1.5 font-semibold text-main-gold ring-1 ring-[rgba(218,174,87,0.35)] disabled:opacity-40"
          >
            프록시 호출
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadSnapshot()}
            className="rounded border border-white/15 px-3 py-1.5 text-zinc-200 disabled:opacity-40"
          >
            DB 스냅샷
          </button>
          <button
            type="button"
            onClick={onPasteApply}
            className="rounded border border-white/15 px-3 py-1.5 text-zinc-200"
          >
            아래 JSON 적용
          </button>
        </div>
        <OddsHostDiagnosticPanel
          requestHost={requestHost}
          sport={sport}
          oddshostSecret={effectiveSecret}
        />
        {err && (
          <p className="rounded border border-red-900/50 bg-red-950/40 px-2 py-1 text-red-300">
            {err}
          </p>
        )}
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          spellCheck={false}
          placeholder='{"…": …}'
          className="min-h-[200px] w-full resize-y rounded border border-white/10 bg-black/60 p-2 font-mono text-[10px] text-zinc-200"
        />
      </div>
    ) : null;

  const nPrematch = snapshotGames.length;

  const betTabs = useMemo(
    () => [
      {
        id: "upcoming",
        label: "예정경기",
        count:
          showOperatorTools && activeDataSource === "demo" ? 134 : nPrematch,
      },
      {
        id: "today",
        label: "오늘",
        count: showOperatorTools && activeDataSource === "demo" ? 58 : 0,
      },
      {
        id: "tomorrow",
        label: "내일",
        count: showOperatorTools && activeDataSource === "demo" ? 76 : 0,
      },
    ],
    [activeDataSource, nPrematch, showOperatorTools],
  );

  return (
    <SportsLobbyLayout
      title="프리매치"
      betTabs={betTabs}
      leagues={leagues}
      bannerText="프리매치 이벤트 — 경기 시작 전 미리 배팅하세요!"
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

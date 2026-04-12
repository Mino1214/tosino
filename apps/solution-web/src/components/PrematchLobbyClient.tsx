"use client";

import { useCallback, useMemo, useState } from "react";
import {
  SportsLobbyLayout,
  type DataSourceTabSpec,
} from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES } from "@/data/sports-leagues";
import {
  fetchOddsHostPrematch,
  fetchSportsPrematchSnapshot,
} from "@/lib/api";
import { useBootstrapHost } from "@/components/BootstrapProvider";

const DATA_TABS: DataSourceTabSpec[] = [
  { id: "demo", label: "데모" },
  { id: "api", label: "API 테스트" },
];

const BET_TABS_NOTICE =
  "예정경기·오늘·내일 탭은 UI만 있고, 아직 날짜별로 목록을 나누지 않습니다. 같은 데이터가 표시됩니다.";

export function PrematchLobbyClient() {
  const requestHost = useBootstrapHost();
  /** 프리매치 카드 매핑 전이라 API 모드는 JSON 위주 — 기본은 데모로 카드 확인 */
  const [activeDataSource, setActiveDataSource] = useState("demo");
  const [sport, setSport] = useState("1");
  const [oddshostSecret, setOddshostSecret] = useState(
    () => process.env.NEXT_PUBLIC_ODDSHOST_PROXY_SECRET?.trim() ?? "",
  );
  const [rawJson, setRawJson] = useState<string>("");
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
      applyPayload(r.payload ?? { fetchedAt: r.fetchedAt, note: "payload 비어 있음" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "스냅샷 로드 실패");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, requestHost]);

  const fetchProxyPrematch = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchOddsHostPrematch(
        requestHost,
        sport.trim() || "1",
        oddshostSecret.trim() || undefined,
      );
      applyPayload(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "프리매치 프록시 실패");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, oddshostSecret, requestHost, sport]);

  const onPasteApply = useCallback(() => {
    setErr(null);
    try {
      const parsed = JSON.parse(rawJson || "{}") as unknown;
      applyPayload(parsed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "JSON 파싱 실패");
    }
  }, [applyPayload, rawJson]);

  const leagues = useMemo(
    () => (activeDataSource === "demo" ? SHARED_LEAGUES : []),
    [activeDataSource],
  );

  const panel =
    activeDataSource === "api" ? (
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
            <span className="text-zinc-500">oddshostSecret (ODDSHOST_PROXY_SECRET)</span>
            <input
              type="password"
              value={oddshostSecret}
              onChange={(e) => setOddshostSecret(e.target.value)}
              placeholder="API ODDSHOST_PROXY_SECRET 과 동일"
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

  const betTabs = useMemo(
    () => [
      { id: "upcoming", label: "예정경기", count: activeDataSource === "demo" ? 134 : 0 },
      { id: "today", label: "오늘", count: activeDataSource === "demo" ? 58 : 0 },
      { id: "tomorrow", label: "내일", count: activeDataSource === "demo" ? 76 : 0 },
    ],
    [activeDataSource],
  );

  return (
    <SportsLobbyLayout
      title="프리매치"
      betTabs={betTabs}
      leagues={leagues}
      bannerText="프리매치 이벤트 — 경기 시작 전 미리 배팅하세요!"
      dataSourceTabs={DATA_TABS}
      activeDataSource={activeDataSource}
      onDataSourceChange={setActiveDataSource}
      dataSourcePanel={panel}
      betTabsNotice={BET_TABS_NOTICE}
    />
  );
}

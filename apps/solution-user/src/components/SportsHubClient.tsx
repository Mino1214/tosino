"use client";

/**
 * 스포츠 허브: DB 스냅샷(실시간·프리매치) + OddsHost 프록시(프리매치 스페셜·오즈마켓).
 * 운영: bootstrap 의 oddshostProxySecret(API ODDSHOST_PROXY_SECRET)으로 OddsHost 프록시 자동 호출.
 * (선택) NEXT_PUBLIC_ODDSHOST_PROXY_SECRET — 부트스트랩보다 우선하지 않음, 부트스트랩 없을 때만.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SportsLobbyLayout } from "@/components/SportsLobbyLayout";
import { SHARED_LEAGUES } from "@/data/sports-leagues";
import {
  fetchOddsHostMarkets,
  fetchOddsHostPrematch,
  fetchSportsLive,
  fetchSportsPrematchSnapshot,
  type SportsLiveGameDto,
} from "@/lib/api";
import { extractSportsLiveGamesFromPayload } from "@/lib/sports-live-game-extract";
import { liveGamesToLeagueGroups } from "@/lib/sports-live-mapper";
import { sportsLobbyShowOperatorTools } from "@/lib/sports-lobby-mode";
import { useBootstrap, useBootstrapHost } from "@/components/BootstrapProvider";
import { useOddsHostProxySecret } from "@/lib/useOddsHostProxySecret";
import { OddsHostDiagnosticPanel } from "@/components/OddsHostDiagnosticPanel";
import { OddsApiLivePanel } from "@/components/OddsApiLivePanel";
import { OddsApiMatchBoard } from "@/components/OddsApiMatchBoard";

const HUB_TABS = [
  { id: "live" as const, label: "실시간" },
  { id: "prematch" as const, label: "프리매치" },
  { id: "pmspecial" as const, label: "프리매치(스페셜)" },
  { id: "ozmarkets" as const, label: "오즈마켓" },
] as const;

type HubSection = (typeof HUB_TABS)[number]["id"];

const BET_NOTICE_DEV =
  "데모·테스트 모드입니다. 운영에서는 스냅샷만 표시됩니다. 종목 필터·크로스 탭은 아직 연결 전입니다.";

const OZ_TAB_NOTICE =
  "OddsHost 프록시 응답입니다. API 서버에 ODDSHOST_TEMPLATE_MARKETS(또는 PATH)가 있어야 오즈마켓 탭이 동작합니다. Wix 홍보 페이지 HTML이 아니라 가이드의 JSON URL을 넣으세요.";

const PM_SPECIAL_NOTICE =
  "프리매치 URL에 special=1 을 붙여 호출합니다(스페셜 플랜). 베이직 전용 키면 403·빈 응답일 수 있습니다.";

/** 문서(SPORTS_SNAPSHOT_MY_NOTES §2.2·§5·§6): 일반 프리매치 탭은 DB 스냅샷만 — 벤더 JSON 직통은 스페셜·오즈마켓 탭 */
const PM_DB_TAB_NOTICE =
  "이 탭은 GET /public/sports-prematch(DB 스냅샷)만 씁니다. 벤더가 준 OddsHost JSON으로 바로 검증하려면 「프리매치(스페셜)」「오즈마켓」과 API의 ODDSHOST_TEMPLATE_* / ODDSHOST_PATH_* 를 설정하세요.";

function parseHubSection(tab: string | null): HubSection {
  if (tab === "prematch") return "prematch";
  if (tab === "pmspecial") return "pmspecial";
  if (tab === "ozmarkets") return "ozmarkets";
  // 프리매치 우선 정책: 쿼리가 없으면 prematch를 기본 탭으로 사용
  return "prematch";
}

function HubSectionNav({
  active,
  onSelect,
}: {
  active: HubSection;
  onSelect: (id: HubSection) => void;
}) {
  return (
    <div className="border-b border-white/10 bg-zinc-900/95 px-2 py-2 md:px-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          구분
        </span>
        <div className="flex flex-wrap gap-1">
          {HUB_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={[
                "rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors",
                active === t.id
                  ? "bg-[rgba(218,174,87,0.2)] text-main-gold ring-1 ring-[rgba(218,174,87,0.45)]"
                  : "text-zinc-400 hover:text-zinc-200",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SportsHubClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const requestHost = useBootstrapHost();
  const bootstrap = useBootstrap();
  const oh = bootstrap?.oddshost;
  const showOperatorTools = sportsLobbyShowOperatorTools();

  const section = parseHubSection(sp.get("tab"));

  const setSection = useCallback(
    (next: HubSection) => {
      router.replace(`/lobby/sports?tab=${next}`);
    },
    [router],
  );

  const [liveGames, setLiveGames] = useState<SportsLiveGameDto[]>([]);
  const [prematchGames, setPrematchGames] = useState<SportsLiveGameDto[]>([]);
  const [pmSpecialGames, setPmSpecialGames] = useState<SportsLiveGameDto[]>(
    [],
  );
  const [ozExtractedGames, setOzExtractedGames] = useState<SportsLiveGameDto[]>(
    [],
  );
  const [proxyRawJson, setProxyRawJson] = useState<string>("");
  /** 운영에서도 서버가 준 본문 전체를 확인할 수 있게(카드에 못 실린 필드 포함) */
  const [liveResponseJson, setLiveResponseJson] = useState<string>("");
  const [pmPayloadJson, setPmPayloadJson] = useState<string>("");

  const [liveFetchedAt, setLiveFetchedAt] = useState<string | null>(null);
  const [pmFetchedAt, setPmFetchedAt] = useState<string | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [pmErr, setPmErr] = useState<string | null>(null);
  const [pmSpecErr, setPmSpecErr] = useState<string | null>(null);
  const [ozErr, setOzErr] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingPm, setLoadingPm] = useState(false);
  const [loadingPmSpec, setLoadingPmSpec] = useState(false);
  const [loadingOz, setLoadingOz] = useState(false);

  const [devLiveSource, setDevLiveSource] = useState<"demo" | "api">("api");
  const [sport, setSport] = useState("1");
  const { effectiveSecret, autoSecret, manualOverride, setManualOverride } =
    useOddsHostProxySecret({ allowManualOverride: showOperatorTools });

  const useOddsProxy = !showOperatorTools || devLiveSource === "api";

  const loadLive = useCallback(async () => {
    setLoadingLive(true);
    setLiveErr(null);
    try {
      const r = await fetchSportsLive(requestHost);
      setLiveFetchedAt(r.fetchedAt ?? null);
      setLiveResponseJson(JSON.stringify(r, null, 2));
      const gameList = Array.isArray(r.game) ? r.game : [];
      /** 응답 루트(success·total 등)를 DFS 하지 않도록 game 만 넘김 — 팀 슬롯·메타 오탐 방지 */
      setLiveGames(
        extractSportsLiveGamesFromPayload({ game: gameList, games: gameList }),
      );
    } catch (e) {
      setLiveErr(e instanceof Error ? e.message : "sports-live 실패");
      setLiveGames([]);
      setLiveResponseJson("");
    } finally {
      setLoadingLive(false);
    }
  }, [requestHost]);

  const loadPrematch = useCallback(async () => {
    setLoadingPm(true);
    setPmErr(null);
    try {
      const r = await fetchSportsPrematchSnapshot(requestHost);
      setPmFetchedAt(r.fetchedAt ?? null);
      setPmPayloadJson(
        r.payload != null ? JSON.stringify(r.payload, null, 2) : "",
      );
      setPrematchGames(
        extractSportsLiveGamesFromPayload(r.payload ?? null),
      );
    } catch (e) {
      setPmErr(e instanceof Error ? e.message : "sports-prematch 실패");
      setPrematchGames([]);
      setPmPayloadJson("");
    } finally {
      setLoadingPm(false);
    }
  }, [requestHost]);

  const loadPmSpecial = useCallback(async () => {
    setLoadingPmSpec(true);
    setPmSpecErr(null);
    try {
      const data = await fetchOddsHostPrematch(
        requestHost,
        sport.trim() || "1",
        effectiveSecret.trim() || undefined,
        { special: "1" },
      );
      setProxyRawJson(JSON.stringify(data, null, 2));
      setPmSpecialGames(extractSportsLiveGamesFromPayload(data));
    } catch (e) {
      setPmSpecErr(e instanceof Error ? e.message : "스페셜 프리매치 실패");
      setPmSpecialGames([]);
      setProxyRawJson("");
    } finally {
      setLoadingPmSpec(false);
    }
  }, [requestHost, sport, effectiveSecret]);

  const loadOzMarkets = useCallback(async () => {
    setLoadingOz(true);
    setOzErr(null);
    try {
      const data = await fetchOddsHostMarkets(
        requestHost,
        sport.trim() || "1",
        effectiveSecret.trim() || undefined,
      );
      setProxyRawJson(JSON.stringify(data, null, 2));
      setOzExtractedGames(extractSportsLiveGamesFromPayload(data));
    } catch (e) {
      setOzErr(e instanceof Error ? e.message : "오즈마켓 실패");
      setOzExtractedGames([]);
      setProxyRawJson("");
    } finally {
      setLoadingOz(false);
    }
  }, [requestHost, sport, effectiveSecret]);

  /** 마운트 시 라이브·DB 프리매치만 선로드 */
  useEffect(() => {
    if (showOperatorTools && devLiveSource === "demo") return;
    // Odds API 문서 권장(프리매치 캐시/갱신 주기 분리)에 맞춰 prematch를 먼저 로드
    void (async () => {
      await loadPrematch();
      await loadLive();
    })();
  }, [requestHost, showOperatorTools, devLiveSource, loadLive, loadPrematch]);

  useEffect(() => {
    if (section !== "live") return;
    if (showOperatorTools && devLiveSource === "demo") return;
    void loadLive();
    const id = window.setInterval(() => void loadLive(), 10_000);
    return () => clearInterval(id);
  }, [section, showOperatorTools, devLiveSource, loadLive]);

  useEffect(() => {
    if (section !== "prematch") return;
    if (showOperatorTools && devLiveSource === "demo") return;
    void loadPrematch();
    const id = window.setInterval(() => void loadPrematch(), 120_000);
    return () => clearInterval(id);
  }, [section, showOperatorTools, devLiveSource, loadPrematch]);

  useEffect(() => {
    if (section !== "pmspecial") return;
    if (!useOddsProxy) return;
    void loadPmSpecial();
    const id = window.setInterval(() => void loadPmSpecial(), 120_000);
    return () => clearInterval(id);
  }, [section, useOddsProxy, loadPmSpecial]);

  useEffect(() => {
    if (section !== "ozmarkets") return;
    if (!useOddsProxy) return;
    void loadOzMarkets();
    const id = window.setInterval(() => void loadOzMarkets(), 120_000);
    return () => clearInterval(id);
  }, [section, useOddsProxy, loadOzMarkets]);

  const liveLeagues = useMemo(() => {
    try {
      return liveGamesToLeagueGroups(liveGames);
    } catch {
      return [];
    }
  }, [liveGames]);

  const pmLeagues = useMemo(() => {
    try {
      return liveGamesToLeagueGroups(prematchGames);
    } catch {
      return [];
    }
  }, [prematchGames]);
  const prematchFallbackToLive =
    section === "prematch" &&
    !loadingPm &&
    !pmErr &&
    prematchGames.length === 0 &&
    liveGames.length > 0;

  const pmSpecLeagues = useMemo(() => {
    try {
      return liveGamesToLeagueGroups(pmSpecialGames);
    } catch {
      return [];
    }
  }, [pmSpecialGames]);

  const ozLeagues = useMemo(() => {
    try {
      return liveGamesToLeagueGroups(ozExtractedGames);
    } catch {
      return [];
    }
  }, [ozExtractedGames]);

  const leagues = useMemo(() => {
    if (section === "live") {
      return showOperatorTools && devLiveSource === "demo"
        ? SHARED_LEAGUES
        : liveLeagues;
    }
    if (section === "prematch") {
      return showOperatorTools && devLiveSource === "demo"
        ? SHARED_LEAGUES
        : prematchFallbackToLive
          ? liveLeagues
          : pmLeagues;
    }
    if (section === "pmspecial") {
      if (!useOddsProxy) return [];
      return pmSpecLeagues;
    }
    if (section === "ozmarkets") {
      if (!useOddsProxy) return [];
      return ozLeagues;
    }
    return liveLeagues;
  }, [
    section,
    showOperatorTools,
    devLiveSource,
    liveLeagues,
    pmLeagues,
    pmSpecLeagues,
    ozLeagues,
    useOddsProxy,
  ]);

  const betTabs = useMemo(() => {
    if (section === "live") {
      return showOperatorTools && devLiveSource === "demo"
        ? [
            { id: "all", label: "전체", count: 34 },
            { id: "soccer", label: "축구", count: 12 },
            { id: "basketball", label: "농구", count: 8 },
            { id: "esports", label: "E스포츠", count: 6 },
          ]
        : [{ id: "live", label: "라이브", count: liveGames.length }];
    }
    if (section === "prematch") {
      return showOperatorTools && devLiveSource === "demo"
        ? [
            { id: "upcoming", label: "예정경기", count: 134 },
            { id: "today", label: "오늘", count: 58 },
            { id: "tomorrow", label: "내일", count: 76 },
          ]
        : [
            {
              id: "pm",
              label: prematchFallbackToLive ? "경기(라이브 대체)" : "경기",
              count: prematchFallbackToLive
                ? liveGames.length
                : prematchGames.length,
            },
          ];
    }
    if (section === "pmspecial") {
      return [{ id: "spec", label: "스페셜", count: pmSpecialGames.length }];
    }
    return [{ id: "oz", label: "마켓", count: ozExtractedGames.length }];
  }, [
    section,
    showOperatorTools,
    devLiveSource,
    liveGames.length,
    prematchGames.length,
    pmSpecialGames.length,
    ozExtractedGames.length,
  ]);

  const title = useMemo(() => {
    if (section === "live") return "인게임 · 실시간";
    if (section === "prematch") return "프리매치";
    if (section === "pmspecial") return "프리매치 · 스페셜 플랜";
    return "오즈마켓";
  }, [section]);

  const betTabsNoticeExtra = useMemo(() => {
    if (section === "ozmarkets") return OZ_TAB_NOTICE;
    if (section === "pmspecial") return PM_SPECIAL_NOTICE;
    if (section === "prematch") return PM_DB_TAB_NOTICE;
    return undefined;
  }, [section]);

  const emptyStateMessage = useMemo(() => {
    if (section === "live") {
      if (liveErr) return `연결 오류: ${liveErr}`;
      if (liveGames.length > 0 && liveLeagues.length === 0) {
        return "경기 데이터는 받았지만 카드 형식으로 표시할 수 없습니다. game[] 필수 필드를 확인해 주세요.";
      }
      if (liveFetchedAt == null && liveGames.length === 0) {
        return "아직 sports-live 스냅샷이 없습니다. API에서 OddsHost 수집(ODDS 동기화·ingest) 또는 관리용 sports-live 업로드로 DB를 채우면 여기에 표시됩니다.";
      }
      if (liveGames.length === 0) {
        return `표시할 라이브 경기가 없습니다. (마지막 스냅샷 시각: ${liveFetchedAt ?? "—"})`;
      }
      return "현재 진행 중인 경기가 없습니다.";
    }
    if (section === "prematch") {
      if (pmErr) return `연결 오류: ${pmErr}`;
      if (prematchFallbackToLive) {
        return "프리매치 데이터가 비어 있어 라이브 데이터를 대신 표시 중입니다.";
      }
      if (prematchGames.length > 0 && pmLeagues.length === 0) {
        return "프리매치 payload 에 game[] 또는 games[] 형식이 필요합니다.";
      }
      if (pmFetchedAt == null && prematchGames.length === 0) {
        return "프리매치 스냅샷이 아직 없습니다.";
      }
      if (prematchGames.length === 0) {
        return `표시할 프리매치 경기가 없습니다. (마지막 수집: ${pmFetchedAt ?? "—"})`;
      }
      return "등록된 경기가 없습니다.";
    }
    if (section === "pmspecial") {
      if (!useOddsProxy) {
        return "데모 카드 모드에서는 OddsHost 프록시를 호출하지 않습니다. 위 패널에서 「API 데이터」를 선택하세요.";
      }
      if (pmSpecErr) return `연결 오류: ${pmSpecErr}`;
      if (pmSpecialGames.length > 0 && pmSpecLeagues.length === 0) {
        return "응답에 game[] / games[] 이 없거나 필드가 부족합니다. 아래 원문 JSON 을 확인하세요.";
      }
      if (pmSpecialGames.length === 0) {
        return "스페셜 플랜 응답에 표시할 경기가 없습니다. 플랜·키·종목(sport)을 확인하거나 아래 JSON 을 확인하세요.";
      }
      return "등록된 경기가 없습니다.";
    }
    if (!useOddsProxy) {
      return "데모 카드 모드에서는 OddsHost 프록시를 호출하지 않습니다. 「API 데이터」로 전환하세요.";
    }
    if (ozErr) return `연결 오류: ${ozErr}`;
    if (ozExtractedGames.length > 0 && ozLeagues.length === 0) {
      return "오즈마켓 JSON 구조가 카드 매퍼와 다릅니다. 아래 원문을 확인하세요.";
    }
    if (ozExtractedGames.length === 0) {
      return "오즈마켓에서 game[] 형으로 추출된 경기가 없습니다. API에 ODDSHOST_TEMPLATE_MARKETS 설정 여부를 확인하거나 아래 JSON 을 보세요.";
    }
    return "표시할 항목이 없습니다.";
  }, [
    section,
    useOddsProxy,
    liveErr,
    pmErr,
    pmSpecErr,
    ozErr,
    liveFetchedAt,
    pmFetchedAt,
    liveGames.length,
    prematchGames.length,
    pmSpecialGames.length,
    ozExtractedGames.length,
    prematchFallbackToLive,
    liveLeagues.length,
    pmLeagues.length,
    pmSpecLeagues.length,
    ozLeagues.length,
  ]);

  const feedAppend = useMemo(() => {
    const jsonDetails = (
      key: string,
      summary: string,
      body: string,
      defaultOpen: boolean,
    ): ReactNode =>
      body.length > 0 ? (
        <details
          key={key}
          open={defaultOpen}
          className="rounded border border-white/10 bg-black/40 p-2 text-[10px] text-zinc-400"
        >
          <summary className="cursor-pointer text-zinc-300">{summary}</summary>
          <pre className="mt-2 max-h-[min(50vh,420px)] overflow-auto whitespace-pre-wrap break-all text-zinc-500">
            {body}
          </pre>
        </details>
      ) : null;

    const parts: ReactNode[] = [];
    if (section === "live" && liveResponseJson) {
      parts.push(
        jsonDetails(
          "live-raw",
          "sports-live API 응답 원문(표시 가능한 필드는 카드로도 반영)",
          liveResponseJson,
          liveGames.length === 0,
        ),
      );
    }
    if (section === "prematch" && pmPayloadJson) {
      parts.push(
        jsonDetails(
          "pm-payload",
          "sports-prematch 스냅샷 payload 원문",
          pmPayloadJson,
          prematchGames.length === 0,
        ),
      );
    }
    if (
      (section === "pmspecial" || section === "ozmarkets") &&
      proxyRawJson.length > 0
    ) {
      const openEmpty =
        section === "pmspecial"
          ? pmSpecialGames.length === 0
          : ozExtractedGames.length === 0;
      parts.push(
        jsonDetails(
          "oddshost-raw",
          "OddsHost 업스트림 원문 JSON",
          proxyRawJson,
          openEmpty,
        ),
      );
    }
    const filtered = parts.filter(Boolean);
    if (!filtered.length) return undefined;
    return <div className="space-y-2">{filtered}</div>;
  }, [
    section,
    liveResponseJson,
    liveGames.length,
    pmPayloadJson,
    prematchGames.length,
    proxyRawJson,
    pmSpecialGames.length,
    ozExtractedGames.length,
  ]);

  const operatorErr =
    section === "live"
      ? liveErr
      : section === "prematch"
        ? pmErr
        : section === "pmspecial"
          ? pmSpecErr
          : ozErr;

  const operatorLoading =
    section === "live"
      ? loadingLive
      : section === "prematch"
        ? loadingPm
        : section === "pmspecial"
          ? loadingPmSpec
          : loadingOz;

  const operatorPanel =
    showOperatorTools ? (
      <div className="space-y-3 text-[11px] text-zinc-300">
        <p className="text-zinc-500">
          OddsHost·스냅샷 연동 점검(개발 전용). 운영 빌드에서는 이 블록이 표시되지 않습니다.
        </p>
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: "demo" as const, label: "데모 카드" },
              { id: "api" as const, label: "API 데이터" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDevLiveSource(t.id === "demo" ? "demo" : "api")}
              className={[
                "rounded border px-2 py-1",
                devLiveSource === t.id
                  ? "border-[rgba(218,174,87,0.5)] text-main-gold"
                  : "border-white/10 text-zinc-500",
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
                  : "API에 ODDSHOST_PROXY_SECRET 필요"
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
        <div className="flex flex-wrap gap-2 text-zinc-500">
          <button
            type="button"
            className="rounded border border-white/15 px-2 py-1 text-zinc-200"
            onClick={() => void loadLive()}
          >
            sports-live 새로고침
          </button>
          <button
            type="button"
            className="rounded border border-white/15 px-2 py-1 text-zinc-200"
            onClick={() => void loadPrematch()}
          >
            sports-prematch 새로고침
          </button>
          <button
            type="button"
            className="rounded border border-white/15 px-2 py-1 text-zinc-200"
            onClick={() => void loadPmSpecial()}
          >
            스페셜 프리매치
          </button>
          <button
            type="button"
            className="rounded border border-white/15 px-2 py-1 text-zinc-200"
            onClick={() => void loadOzMarkets()}
          >
            오즈마켓
          </button>
        </div>
        {operatorErr ? <p className="text-red-400">{operatorErr}</p> : null}
        {operatorLoading ? <p className="text-zinc-500">불러오는 중…</p> : null}
      </div>
    ) : null;

  const statusStrip =
    !showOperatorTools ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/10 bg-zinc-900/85 px-3 py-2 text-[11px] text-zinc-400 md:px-8">
        {section === "live" ? (
          <>
            <span className="text-zinc-500">sports-live</span>
            <span>
              {loadingLive ? "불러오는 중…" : `경기 ${liveGames.length}건`}
            </span>
            {liveFetchedAt ? (
              <span className="text-zinc-500">수집 {liveFetchedAt}</span>
            ) : null}
            {liveErr ? (
              <span className="text-amber-400/95">오류: {liveErr}</span>
            ) : null}
          </>
        ) : section === "prematch" ? (
          <>
            <span className="text-zinc-500">sports-prematch</span>
            <span>
              {loadingPm ? "불러오는 중…" : `경기 ${prematchGames.length}건`}
            </span>
            {pmFetchedAt ? (
              <span className="text-zinc-500">수집 {pmFetchedAt}</span>
            ) : null}
            {pmErr ? (
              <span className="text-amber-400/95">오류: {pmErr}</span>
            ) : null}
          </>
        ) : section === "pmspecial" ? (
          <>
            <span className="text-zinc-500">OddsHost prematch special=1</span>
            <span>
              {loadingPmSpec ? "불러오는 중…" : `추출 ${pmSpecialGames.length}건`}
            </span>
            {oh && oh.keyConfigured === false ? (
              <span className="max-w-[min(100%,42rem)] text-amber-400/95">
                API에 ODDSHOST_KEY 없음 → 503
              </span>
            ) : null}
            {oh?.keyConfigured && !oh.prematchConfigured ? (
              <span className="max-w-[min(100%,42rem)] text-amber-400/95">
                API에 ODDSHOST_TEMPLATE_PREMATCH 또는 BASE+PATH_PREMATCH 없음 → 503
              </span>
            ) : null}
            {pmSpecErr ? (
              <span className="max-w-[min(100%,42rem)] text-amber-400/95">
                오류: {pmSpecErr}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span className="text-zinc-500">OddsHost markets</span>
            <span>
              {loadingOz ? "불러오는 중…" : `추출 ${ozExtractedGames.length}건`}
            </span>
            {oh && oh.keyConfigured === false ? (
              <span className="max-w-[min(100%,42rem)] text-amber-400/95">
                API에 ODDSHOST_KEY 없음 → 503
              </span>
            ) : null}
            {oh?.keyConfigured && !oh.marketsConfigured ? (
              <span className="max-w-[min(100%,42rem)] text-amber-400/95">
                API에 ODDSHOST_TEMPLATE_MARKETS 또는 BASE+PATH_MARKETS 없음 → 503
              </span>
            ) : null}
            {ozErr ? (
              <span className="max-w-[min(100%,42rem)] text-amber-400/95">
                오류: {ozErr}
              </span>
            ) : null}
          </>
        )}
      </div>
    ) : null;

  const combinedBetNotice = [BET_NOTICE_DEV, betTabsNoticeExtra]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="border-b border-[rgba(218,174,87,0.2)] bg-black px-4 py-2.5 md:px-6 lg:px-10">
        <h1 className="text-base font-bold text-main-gold sm:text-lg md:text-xl">
          스포츠
        </h1>
      </div>

      <HubSectionNav active={section} onSelect={setSection} />

      {/* live/prematch 는 odds-api.io 신규 매치 보드(서버 그룹핑·한글 보강·마진 9.95~10.1%) */}
      {section === "live" || section === "prematch" ? (
        <div className="px-2 py-3 md:px-6 lg:px-10">
          <OddsApiMatchBoard mode={section} />
        </div>
      ) : null}

      {/* 운영자 모드에서는 기존 OddsHost/DB 스냅샷 도구도 함께 노출 */}
      {showOperatorTools ? (
        <>
          <div className="border-y border-white/5 bg-zinc-950 px-2 py-3 md:px-6 lg:px-10">
            <OddsApiLivePanel />
          </div>

          {statusStrip}

          <div className="border-b border-white/5 bg-zinc-950 px-2 py-3 md:px-6 lg:px-10">
            {operatorPanel}
          </div>

          <SportsLobbyLayout
            title={title}
            betTabs={betTabs}
            leagues={leagues}
            bannerText={`${title} — 개발 모드`}
            hideBanner={false}
            betTabsNotice={combinedBetNotice}
            layoutChrome="full"
            emptyStateMessage={emptyStateMessage}
            feedAppend={feedAppend}
          />
        </>
      ) : (
        <>
          {/* pmspecial / ozmarkets 는 운영용 — 일반 사용자에게 빈 자리 대신 안내 */}
          {section === "pmspecial" || section === "ozmarkets" ? (
            <div className="px-2 py-6 md:px-6 lg:px-10">
              <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950/60 px-4 py-8 text-center text-sm text-zinc-500">
                준비 중인 탭입니다.
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

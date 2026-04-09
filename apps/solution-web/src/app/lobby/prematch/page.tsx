/*
  프리매치 로비
  · 배팅카트 활성화 (AppShell이 /lobby/prematch prefix 감지)
  · 사전 경기 데이터만 표시 (status: "UPCOMING")
*/
import { SportsLobbyLayout }              from "@/components/SportsLobbyLayout";
import { SAMPLE_LEAGUES, type LeagueGroupData } from "@/components/SportsDomesticCard";

const BET_TABS = [
  { id: "prematch", label: "프리매치", count: 47 },
  { id: "today",    label: "오늘경기", count: 18 },
  { id: "tomorrow", label: "내일경기", count: 29 },
];

/* 프리매치: UPCOMING 경기만 필터 (샘플에서 시뮬레이션) */
const PREMATCH_LEAGUES: LeagueGroupData[] = SAMPLE_LEAGUES.map((lg) => ({
  ...lg,
  matches: lg.matches.map((m) => ({ ...m, status: "UPCOMING" as const })),
}));

export default function PrematchPage() {
  return (
    <SportsLobbyLayout
      title="프리매치"
      betTabs={BET_TABS}
      leagues={PREMATCH_LEAGUES}
      bannerText="프리매치 이벤트 — 최대 배당으로 승리를 잡으세요!"
    />
  );
}

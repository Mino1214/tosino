/*
  스포츠북 (해외 스포츠) 로비
  · 배팅카트 활성화 (AppShell이 /lobby/sportsbook prefix 감지)
*/
import { SportsLobbyLayout }                    from "@/components/SportsLobbyLayout";
import { SAMPLE_LEAGUES, type LeagueGroupData } from "@/components/SportsDomesticCard";

const BET_TABS = [
  { id: "sportsbook", label: "스포츠북", count: 120 },
  { id: "live",       label: "인플레이", count: 34  },
];

/* 스포츠북용 샘플: 다른 리그 이름으로 표시 */
const SB_LEAGUES: LeagueGroupData[] = [
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_1.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/EG.svg",
    leagueName: "[이집트] 프리미어리그",
    eventAt: "04.10 00:00",
    matches: [
      {
        eventId: "sb-1001",
        status: "LIVE",
        eventAt: "2026-04-09T15:00:00.000Z",
        homeTeam: { name: "카라바 이스마일리아" },
        awayTeam: { name: "알 이티하드" },
        markets: [
          { name: "승무패", center: "Draw", home: { label: "Home", odds: "3.62" }, draw: { label: "Draw", odds: "2.89" }, away: { label: "Away", odds: "2.17" } },
          { name: "핸디캡", center: "0.5", home: { label: "Home", odds: "1.63" }, away: { label: "Away", odds: "2.13" } },
          { name: "오버언더", center: "2", home: { label: "Over", odds: "1.80" }, away: { label: "Under", odds: "1.90" }, isOverUnder: true },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_1.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/SA.svg",
    leagueName: "[사우디아라비아] 사우디 프로페셔널 리그",
    eventAt: "04.10 01:00",
    matches: [
      {
        eventId: "sb-2001",
        status: "LIVE",
        eventAt: "2026-04-09T16:00:00.000Z",
        homeTeam: { name: "다막 FC" },
        awayTeam: { name: "알 카디시야" },
        markets: [
          { name: "승무패", center: "Draw", home: { label: "Home", odds: "5.40" }, draw: { label: "Draw", odds: "4.39" }, away: { label: "Away", odds: "1.49" } },
          { name: "핸디캡", center: "1",   home: { label: "Home", odds: "1.88" }, away: { label: "Away", odds: "1.81" } },
          { name: "오버언더", center: "3", home: { label: "Over", odds: "1.92" }, away: { label: "Under", odds: "1.78" }, isOverUnder: true },
        ],
      },
    ],
  },
];

export default function SportsbookPage() {
  return (
    <SportsLobbyLayout
      title="스포츠북"
      betTabs={BET_TABS}
      leagues={[...SB_LEAGUES, ...SAMPLE_LEAGUES]}
      bannerText="해외 스포츠 이벤트 — 다양한 리그에 배팅하세요!"
    />
  );
}

/*
  프리매치 로비
  · 배팅카트 활성화 (AppShell이 /lobby/prematch prefix 감지)
  · 사전 경기 데이터만 표시 (status: "UPCOMING")
*/
import { SportsLobbyLayout }       from "@/components/SportsLobbyLayout";
import type { LeagueGroupData }    from "@/components/SportsDomesticCard";

const BET_TABS = [
  { id: "prematch", label: "프리매치", count: 47 },
  { id: "today",    label: "오늘경기", count: 18 },
  { id: "tomorrow", label: "내일경기", count: 29 },
];

const PREMATCH_LEAGUES: LeagueGroupData[] = [
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_1.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/TR.svg",
    leagueName: "[터키] 2부 리그",
    eventAt: "04.09 23:00",
    matches: [
      {
        eventId: "pm-1001",
        status: "UPCOMING",
        eventAt: "2026-04-09T14:00:00.000Z",
        homeTeam: { name: "볼루스포르" },
        awayTeam: { name: "시바스포르" },
        markets: [
          { name: "승무패", center: "Draw", home: { label: "Home", odds: "2.58" }, draw: { label: "Draw", odds: "3.42" }, away: { label: "Away", odds: "2.48" } },
          { name: "핸디캡", center: "0",   home: { label: "Home", odds: "1.88" }, away: { label: "Away", odds: "1.81" } },
          { name: "오버언더", center: "2.5", home: { label: "Over", odds: "1.78" }, away: { label: "Under", odds: "1.91" }, isOverUnder: true },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_109.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "카운터스트라이크",
    eventAt: "04.10 01:00",
    matches: [
      {
        eventId: "pm-2001",
        status: "UPCOMING",
        eventAt: "2026-04-09T16:00:00.000Z",
        homeTeam: { name: "MongolZ" },
        awayTeam: { name: "PV" },
        markets: [
          { name: "승무패", center: "VS", home: { label: "Home", odds: "2.00" }, away: { label: "Away", odds: "1.70" } },
          { name: "핸디캡", center: "-1.5", home: { label: "Home", odds: "2.35" }, away: { label: "Away", odds: "1.35" } },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_194.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "발로란트",
    eventAt: "04.10 00:00",
    matches: [
      {
        eventId: "pm-3001",
        status: "UPCOMING",
        eventAt: "2026-04-09T15:00:00.000Z",
        homeTeam: { name: "FNC" },
        awayTeam: { name: "VIT" },
        markets: [
          { name: "승무패", center: "VS", home: { label: "Home", odds: "1.85" }, away: { label: "Away", odds: "1.75" } },
        ],
      },
    ],
  },
];

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

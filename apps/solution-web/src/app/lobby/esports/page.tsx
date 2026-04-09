import { SportsLobbyLayout }    from "@/components/SportsLobbyLayout";
import type { LeagueGroupData } from "@/components/SportsDomesticCard";

const BET_TABS = [
  { id: "esports",  label: "E스포츠", count: 28 },
  { id: "lol",      label: "LoL",     count: 14 },
  { id: "cs",       label: "CS2",     count:  4 },
  { id: "valorant", label: "Valorant",count:  2 },
];

const LEAGUES: LeagueGroupData[] = [
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_110.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/KR.svg",
    leagueName: "2026 LCK",
    eventAt: "04.09 20:15",
    matches: [
      {
        eventId: "es-1001",
        status: "LIVE",
        eventAt: "2026-04-09T11:15:00.000Z",
        homeTeam: { name: "kt 롤스터", imgSrc: "https://files.asia-sportradar.com/api/file/view?filename=competitor/56347.png" },
        awayTeam: { name: "농심 레드포스", imgSrc: "https://files.asia-sportradar.com/api/file/view?filename=competitor/56516.png" },
        markets: [
          { name: "승무패", center: "VS",   home: { label: "Home", odds: "1.40" }, away: { label: "Away", odds: "2.30" } },
          { name: "핸디캡", center: "-1.5", home: { label: "Home", odds: "2.20" }, away: { label: "Away", odds: "1.50" } },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_110.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "2026 TCL",
    eventAt: "04.09 23:30",
    matches: [
      {
        eventId: "es-2001",
        status: "LIVE",
        eventAt: "2026-04-09T14:30:00.000Z",
        homeTeam: { name: "BGT" },
        awayTeam: { name: "PCF" },
        markets: [
          { name: "승무패", center: "VS",   home: { label: "Home", odds: "1.55" }, away: { label: "Away", odds: "2.15" } },
          { name: "핸디캡", center: "-1.5", home: { label: "Home", odds: "2.35" }, away: { label: "Away", odds: "1.35" } },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_109.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "카운터스트라이크",
    eventAt: "04.09 22:00",
    matches: [
      {
        eventId: "es-3001",
        status: "LIVE",
        eventAt: "2026-04-09T13:00:00.000Z",
        homeTeam: { name: "B8" },
        awayTeam: { name: "FUT" },
        markets: [
          { name: "승무패", center: "VS",  home: { label: "Home", odds: "2.35" }, away: { label: "Away", odds: "1.35" } },
          { name: "핸디캡", center: "1.5", home: { label: "Home", odds: "1.55" }, away: { label: "Away", odds: "2.15" } },
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
        eventId: "es-4001",
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
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_110.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "2026 LFL",
    eventAt: "04.10 01:00",
    matches: [
      {
        eventId: "es-5001",
        status: "UPCOMING",
        eventAt: "2026-04-09T16:00:00.000Z",
        homeTeam: { name: "ES" },
        awayTeam: { name: "SC" },
        markets: [
          { name: "승무패", center: "VS", home: { label: "Home", odds: "2.20" }, away: { label: "Away", odds: "1.50" } },
        ],
      },
    ],
  },
];

export default function EsportsPage() {
  return (
    <SportsLobbyLayout
      title="E스포츠"
      betTabs={BET_TABS}
      leagues={LEAGUES}
      bannerText="E스포츠 이벤트 — LoL · CS2 · Valorant 최고 배당!"
    />
  );
}

import { SportsLobbyLayout }    from "@/components/SportsLobbyLayout";
import type { LeagueGroupData } from "@/components/SportsDomesticCard";

const BET_TABS = [
  { id: "inplay",     label: "인플레이",  count: 34 },
  { id: "soccer",     label: "축구",      count: 12 },
  { id: "basketball", label: "농구",      count:  8 },
  { id: "esports",    label: "E스포츠",   count:  6 },
];

const LEAGUES: LeagueGroupData[] = [
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_1.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "[세계] AFC 컵 낙아웃 스테이지",
    eventAt: "04.09 21:00",
    matches: [
      {
        eventId: "live-1001",
        status: "LIVE",
        eventAt: "2026-04-09T12:00:00.000Z",
        homeTeam: { name: "스바이 리엥" },
        awayTeam: { name: "마닐라 디거" },
        markets: [
          { name: "승무패", center: "Draw", home: { label: "Home", odds: "1.50" }, draw: { label: "Draw", odds: "4.36" }, away: { label: "Away", odds: "5.38" } },
          { name: "핸디캡", center: "-1",   home: { label: "Home", odds: "1.74" }, away: { label: "Away", odds: "1.97" } },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_2.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "농구-아시아챔피언스리그",
    eventAt: "04.09 21:00",
    matches: [
      {
        eventId: "live-2001",
        status: "LIVE",
        eventAt: "2026-04-09T12:00:00.000Z",
        homeTeam: { name: "사우스 차이나" },
        awayTeam: { name: "타오위안 파일럿츠" },
        markets: [
          { name: "승무패",  center: "VS",    home: { label: "Home", odds: "3.69" }, away: { label: "Away", odds: "1.11" } },
          { name: "핸디캡", center: "12.5",  home: { label: "Home", odds: "1.88" }, away: { label: "Away", odds: "1.82" } },
          { name: "오버언더", center: "176.5", home: { label: "Over", odds: "1.87" }, away: { label: "Under", odds: "1.82" }, isOverUnder: true },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_110.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/KR.svg",
    leagueName: "2026 LCK",
    eventAt: "04.09 20:15",
    matches: [
      {
        eventId: "live-3001",
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
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_1.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/SA.svg",
    leagueName: "[사우디] 사우디 프로페셔널 리그",
    eventAt: "04.10 01:00",
    matches: [
      {
        eventId: "live-4001",
        status: "LIVE",
        eventAt: "2026-04-09T16:00:00.000Z",
        homeTeam: { name: "다막 FC" },
        awayTeam: { name: "알 카디시야" },
        markets: [
          { name: "승무패",  center: "Draw", home: { label: "Home", odds: "5.40" }, draw: { label: "Draw", odds: "4.39" }, away: { label: "Away", odds: "1.49" } },
          { name: "핸디캡", center: "1",    home: { label: "Home", odds: "1.88" }, away: { label: "Away", odds: "1.81" } },
          { name: "오버언더", center: "3",  home: { label: "Over", odds: "1.92" }, away: { label: "Under", odds: "1.78" }, isOverUnder: true },
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
        eventId: "live-5001",
        status: "LIVE",
        eventAt: "2026-04-09T13:00:00.000Z",
        homeTeam: { name: "MongolZ" },
        awayTeam: { name: "PV" },
        markets: [
          { name: "승무패", center: "VS",  home: { label: "Home", odds: "2.00" }, away: { label: "Away", odds: "1.70" } },
          { name: "핸디캡", center: "-1.5", home: { label: "Home", odds: "2.35" }, away: { label: "Away", odds: "1.35" } },
        ],
      },
    ],
  },
];

export default function InplayPage() {
  return (
    <SportsLobbyLayout
      title="인플레이"
      betTabs={BET_TABS}
      leagues={LEAGUES}
      bannerText="인플레이 이벤트 — 실시간으로 경기를 보며 배팅하세요!"
    />
  );
}

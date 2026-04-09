/*
  스포츠 크로스 / 스페셜 / 실시간 로비
  · 배팅카트 활성화 (AppShell이 /lobby/sports-kr prefix 감지)
  · 광고 배너 + 종목 Nav + 폴더보너스 + 매치리스트
*/
import { SportsLobbyLayout }    from "@/components/SportsLobbyLayout";
import type { LeagueGroupData } from "@/components/SportsDomesticCard";

const BET_TABS = [
  { id: "cross",    label: "크로스",  count: 83 },
  { id: "special",  label: "스페셜",  count: 22 },
  { id: "realtime", label: "실시간",  count: 88 },
];

const LEAGUES: LeagueGroupData[] = [
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_110.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/KR.svg",
    leagueName: "2026 LCK",
    eventAt: "04.09 20:15",
    matches: [
      {
        eventId: "sk-1001",
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
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_2.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/CN.svg",
    leagueName: "[중국] CBA",
    eventAt: "04.09 20:35",
    matches: [
      {
        eventId: "sk-2001",
        status: "LIVE",
        eventAt: "2026-04-09T11:35:00.000Z",
        homeTeam: { name: "장쑤 드래곤즈" },
        awayTeam: { name: "저장 조주" },
        markets: [
          { name: "승무패",  center: "VS",    home: { label: "Home", odds: "3.69" }, away: { label: "Away", odds: "1.22" } },
          { name: "핸디캡", center: "8.5",   home: { label: "Home", odds: "1.87" }, away: { label: "Away", odds: "1.83" } },
          { name: "오버언더", center: "165.5", home: { label: "Over", odds: "1.87" }, away: { label: "Under", odds: "1.83" }, isOverUnder: true },
        ],
      },
      {
        eventId: "sk-2002",
        status: "LIVE",
        eventAt: "2026-04-09T11:35:00.000Z",
        homeTeam: { name: "산시 룽즈" },
        awayTeam: { name: "선전 에비에이터즈" },
        markets: [
          { name: "승무패",  center: "VS",    home: { label: "Home", odds: "2.38" }, away: { label: "Away", odds: "1.50" } },
          { name: "핸디캡", center: "4.5",   home: { label: "Home", odds: "1.80" }, away: { label: "Away", odds: "1.90" } },
          { name: "오버언더", center: "208.5", home: { label: "Over", odds: "1.88" }, away: { label: "Under", odds: "1.81" }, isOverUnder: true },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_4.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/RU.svg",
    leagueName: "KHL",
    eventAt: "04.09 23:00",
    matches: [
      {
        eventId: "sk-3001",
        status: "UPCOMING",
        eventAt: "2026-04-09T14:00:00.000Z",
        homeTeam: { name: "메탈루르크 마그니토" },
        awayTeam: { name: "니즈니 노브고로드" },
        markets: [
          { name: "승무패",  center: "Draw", home: { label: "Home", odds: "1.55" }, draw: { label: "Draw", odds: "4.49" }, away: { label: "Away", odds: "4.67" } },
          { name: "핸디캡", center: "-1.5", home: { label: "Home", odds: "1.97" }, away: { label: "Away", odds: "1.74" } },
          { name: "오버언더", center: "5.5", home: { label: "Over", odds: "2.18" }, away: { label: "Under", odds: "1.60" }, isOverUnder: true },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_1.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/BG.svg",
    leagueName: "[불가리아] 프로 1부 리그",
    eventAt: "04.09 21:30",
    matches: [
      {
        eventId: "sk-4001",
        status: "LIVE",
        eventAt: "2026-04-09T12:30:00.000Z",
        homeTeam: { name: "Lok.소피아" },
        awayTeam: { name: "바로에" },
        markets: [
          { name: "승무패",  center: "Draw", home: { label: "Home", odds: "1.57" }, draw: { label: "Draw", odds: "3.93" }, away: { label: "Away", odds: "5.25" } },
          { name: "핸디캡", center: "-1",   home: { label: "Home", odds: "1.95" }, away: { label: "Away", odds: "1.76" } },
          { name: "오버언더", center: "2.5", home: { label: "Over", odds: "1.75" }, away: { label: "Under", odds: "1.96" }, isOverUnder: true },
        ],
      },
    ],
  },
];

export default function SportsKrPage() {
  return (
    <SportsLobbyLayout
      title="스포츠"
      betTabs={BET_TABS}
      leagues={LEAGUES}
      bannerText="스포츠 이벤트 진행 중 — 첫충/매충 보너스 혜택을 받아가세요!"
    />
  );
}

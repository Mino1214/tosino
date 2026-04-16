import type { LeagueGroupData } from "@/components/SportsDomesticCard";

/**
 * 스포츠 / 프리매치 / 인플레이 / E스포츠 공용 샘플 리그 데이터
 * (실제 API 연동 전 플레이스홀더)
 */
export const SHARED_LEAGUES: LeagueGroupData[] = [
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_1.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/SA.svg",
    leagueName: "[사우디] 사우디 프로페셔널 리그",
    eventAt: "04.10 01:00",
    matches: [
      {
        eventId: "sh-1001",
        status: "LIVE",
        eventAt: "2026-04-09T16:00:00.000Z",
        homeTeam: { name: "다막 FC" },
        awayTeam: { name: "알 카디시야" },
        markets: [
          { name: "승무패",   center: "Draw", home: { label: "Home", odds: "5.40" }, draw: { label: "Draw", odds: "4.39" }, away: { label: "Away", odds: "1.49" } },
          { name: "핸디캡",   center: "1",    home: { label: "Home", odds: "1.88" }, away: { label: "Away", odds: "1.81" } },
          { name: "오버언더", center: "3",    home: { label: "Over", odds: "1.92" }, away: { label: "Under", odds: "1.78" }, isOverUnder: true },
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
        eventId: "sh-1002",
        status: "LIVE",
        eventAt: "2026-04-09T12:30:00.000Z",
        homeTeam: { name: "Lok.소피아" },
        awayTeam: { name: "바로에" },
        markets: [
          { name: "승무패",   center: "Draw", home: { label: "Home", odds: "1.57" }, draw: { label: "Draw", odds: "3.93" }, away: { label: "Away", odds: "5.25" } },
          { name: "핸디캡",   center: "-1",   home: { label: "Home", odds: "1.95" }, away: { label: "Away", odds: "1.76" } },
          { name: "오버언더", center: "2.5",  home: { label: "Over", odds: "1.75" }, away: { label: "Under", odds: "1.96" }, isOverUnder: true },
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
        eventId: "sh-2001",
        status: "LIVE",
        eventAt: "2026-04-09T11:35:00.000Z",
        homeTeam: { name: "장쑤 드래곤즈" },
        awayTeam: { name: "저장 골든 불스" },
        markets: [
          { name: "승무패",   center: "VS",    home: { label: "Home", odds: "3.80" }, away: { label: "Away", odds: "1.22" } },
          { name: "핸디캡",   center: "8.5",   home: { label: "Home", odds: "1.87" }, away: { label: "Away", odds: "1.83" } },
          { name: "오버언더", center: "165.5", home: { label: "Over", odds: "1.87" }, away: { label: "Under", odds: "1.83" }, isOverUnder: true },
        ],
      },
      {
        eventId: "sh-2002",
        status: "UPCOMING",
        eventAt: "2026-04-09T13:00:00.000Z",
        homeTeam: { name: "산시 룽즈" },
        awayTeam: { name: "선전 에비에이터즈" },
        markets: [
          { name: "승무패",   center: "VS",    home: { label: "Home", odds: "2.38" }, away: { label: "Away", odds: "1.52" } },
          { name: "핸디캡",   center: "4.5",   home: { label: "Home", odds: "1.80" }, away: { label: "Away", odds: "1.90" } },
          { name: "오버언더", center: "208.5", home: { label: "Over", odds: "1.88" }, away: { label: "Under", odds: "1.81" }, isOverUnder: true },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_2.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/KR.svg",
    leagueName: "WKBL",
    eventAt: "04.09 19:00",
    matches: [
      {
        eventId: "sh-2003",
        status: "LIVE",
        eventAt: "2026-04-09T10:00:00.000Z",
        homeTeam: { name: "부천 하나원큐" },
        awayTeam: { name: "용인 삼성생명 블루밍스" },
        markets: [
          { name: "승무패",   center: "VS",    home: { label: "Home", odds: "1.20" }, away: { label: "Away", odds: "4.00" } },
          { name: "오버언더", center: "145.5", home: { label: "Over", odds: "1.90" }, away: { label: "Under", odds: "1.80" }, isOverUnder: true },
        ],
      },
    ],
  },
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_3.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/JP.svg",
    leagueName: "NPB 일본 프로야구",
    eventAt: "04.09 18:00",
    matches: [
      {
        eventId: "sh-3001",
        status: "LIVE",
        eventAt: "2026-04-09T09:00:00.000Z",
        homeTeam: { name: "후쿠오카 소프트뱅크 호크스", imgSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/competitor/sr_competitor_67122.png" },
        awayTeam: { name: "세이부 라이온스", imgSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/competitor/sr_competitor_67120.png" },
        markets: [
          { name: "승무패", center: "VS", home: { label: "Home", odds: "1.32" }, away: { label: "Away", odds: "2.55" } },
        ],
      },
      {
        eventId: "sh-3002",
        status: "LIVE",
        eventAt: "2026-04-09T09:00:00.000Z",
        homeTeam: { name: "오릭스 버팔로스", imgSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/competitor/sr_competitor_67116.png" },
        awayTeam: { name: "지바 롯데 마린스", imgSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/competitor/sr_competitor_67112.png" },
        markets: [
          { name: "승무패", center: "VS", home: { label: "Home", odds: "1.15" }, away: { label: "Away", odds: "3.60" } },
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
        eventId: "sh-4001",
        status: "UPCOMING",
        eventAt: "2026-04-09T14:00:00.000Z",
        homeTeam: { name: "메탈루르크 마그니토" },
        awayTeam: { name: "니즈니 노브고로드" },
        markets: [
          { name: "승무패",   center: "Draw", home: { label: "Home", odds: "1.48" }, draw: { label: "Draw", odds: "4.30" }, away: { label: "Away", odds: "4.10" } },
          { name: "핸디캡",   center: "-1.5", home: { label: "Home", odds: "1.97" }, away: { label: "Away", odds: "1.74" } },
          { name: "오버언더", center: "5.5",  home: { label: "Over", odds: "2.18" }, away: { label: "Under", odds: "1.60" }, isOverUnder: true },
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
        eventId: "sh-5001",
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
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_109.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/UN.png",
    leagueName: "카운터스트라이크 — 메이저",
    eventAt: "04.09 22:00",
    matches: [
      {
        eventId: "sh-6001",
        status: "UPCOMING",
        eventAt: "2026-04-09T13:00:00.000Z",
        homeTeam: { name: "MongolZ" },
        awayTeam: { name: "PV" },
        markets: [
          { name: "승무패", center: "VS",   home: { label: "Home", odds: "2.00" }, away: { label: "Away", odds: "1.70" } },
          { name: "핸디캡", center: "-1.5", home: { label: "Home", odds: "2.35" }, away: { label: "Away", odds: "1.35" } },
        ],
      },
    ],
  },
];

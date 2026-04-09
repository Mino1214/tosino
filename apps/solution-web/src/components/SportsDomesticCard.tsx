"use client";

/*
  SportsDomesticCard — ZXX.BET 모바일 스포츠 배당 카드
  ─────────────────────────────────────────────────────
  구조 (ZXX.BET `.SportsDomestic` 기반):

    [LeagueGroup]  sport-icon | flag | leagueName | time

    [Match Row]
      LogoAndTeamContainer
        homeTeamImg  homeTeamName | VS | awayTeamName  awayTeamImg

      market wrapper × N  (승무패 / 핸디캡 / 오버언더)
        marketName
        marketItemList
          [Home btn] [center: VS | -1.5 | 165.5] [Away btn]

  · 클릭 시 BettingCart에 선택된 배당 추가
  · 이미 선택된 배당은 highlighted
*/

import { useBettingCart } from "./BettingCartContext";

/* ── 타입 정의 ────────────────────────────────────────────── */

export type MarketOption = {
  label: string;   // "Home" | "Draw" | "Away" | "Over" | "Under"
  odds: string;    // "1.40"
};

export type MarketRow = {
  /** "승무패" | "핸디캡" | "오버언더" */
  name: string;
  /** 가운데 표시: "VS" | "-1.5" | "165.5" */
  center: string;
  home: MarketOption;
  away: MarketOption;
  /** 승무패(3-way)일 때 draw 존재 */
  draw?: MarketOption;
  isOverUnder?: boolean;
};

export type MatchData = {
  eventId: string;
  status: "LIVE" | "UPCOMING";
  eventAt: string;
  homeTeam: { name: string; imgSrc?: string };
  awayTeam: { name: string; imgSrc?: string };
  markets: MarketRow[];
};

export type LeagueGroupData = {
  sportIconSrc?: string;
  flagSrc?: string;
  leagueName: string;
  eventAt: string;
  matches: MatchData[];
};

/* ── 샘플 데이터 (실제 데이터 주입 전 placeholder) ─────────── */

export const SAMPLE_LEAGUES: LeagueGroupData[] = [
  {
    sportIconSrc: "https://files-zx.asia-sportradar.com//img/frontend/betradar/icon/sport/sr_sport_110.png",
    flagSrc: "https://files-zx.asia-sportradar.com//img/frontend/flag/KR.svg",
    leagueName: "2026 LCK",
    eventAt: "04.09 20:15",
    matches: [
      {
        eventId: "1001",
        status: "LIVE",
        eventAt: "2026-04-09T11:15:00.000Z",
        homeTeam: { name: "kt 롤스터", imgSrc: "https://files.asia-sportradar.com/api/file/view?filename=competitor/56347.png" },
        awayTeam: { name: "농심 레드포스", imgSrc: "https://files.asia-sportradar.com/api/file/view?filename=competitor/56516.png" },
        markets: [
          { name: "승무패", center: "VS", home: { label: "Home", odds: "1.40" }, away: { label: "Away", odds: "2.30" } },
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
        eventId: "2001",
        status: "LIVE",
        eventAt: "2026-04-09T11:35:00.000Z",
        homeTeam: { name: "장쑤 드래곤즈" },
        awayTeam: { name: "저장 조주" },
        markets: [
          { name: "승무패", center: "VS",    home: { label: "Home", odds: "3.69" }, away: { label: "Away", odds: "1.22" } },
          { name: "핸디캡", center: "8.5",   home: { label: "Home", odds: "1.87" }, away: { label: "Away", odds: "1.83" } },
          { name: "오버언더", center: "165.5", home: { label: "Over", odds: "1.87" }, away: { label: "Under", odds: "1.83" }, isOverUnder: true },
        ],
      },
      {
        eventId: "2002",
        status: "LIVE",
        eventAt: "2026-04-09T11:35:00.000Z",
        homeTeam: { name: "산시 룽즈" },
        awayTeam: { name: "선전 에비에이터즈" },
        markets: [
          { name: "승무패", center: "VS",    home: { label: "Home", odds: "2.38" }, away: { label: "Away", odds: "1.50" } },
          { name: "핸디캡", center: "4.5",   home: { label: "Home", odds: "1.80" }, away: { label: "Away", odds: "1.90" } },
          { name: "오버언더", center: "208.5", home: { label: "Over", odds: "1.88" }, away: { label: "Under", odds: "1.81" }, isOverUnder: true },
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
        eventId: "3001",
        status: "LIVE",
        eventAt: "2026-04-09T12:30:00.000Z",
        homeTeam: { name: "Lok.소피아" },
        awayTeam: { name: "바로에" },
        markets: [
          { name: "승무패", center: "Draw",   home: { label: "Home", odds: "1.57" }, draw: { label: "Draw", odds: "3.93" }, away: { label: "Away", odds: "5.25" } },
          { name: "핸디캡", center: "-1",     home: { label: "Home", odds: "1.95" }, away: { label: "Away", odds: "1.76" } },
          { name: "오버언더", center: "2.5",  home: { label: "Over", odds: "1.75" }, away: { label: "Under", odds: "1.96" }, isOverUnder: true },
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
        eventId: "4001",
        status: "UPCOMING",
        eventAt: "2026-04-09T14:00:00.000Z",
        homeTeam: { name: "메탈루르크 마그니토" },
        awayTeam: { name: "니즈니 노브고로드" },
        markets: [
          { name: "승무패", center: "Draw",  home: { label: "Home", odds: "1.55" }, draw: { label: "Draw", odds: "4.49" }, away: { label: "Away", odds: "4.67" } },
          { name: "핸디캡", center: "-1.5", home: { label: "Home", odds: "1.97" }, away: { label: "Away", odds: "1.74" } },
          { name: "오버언더", center: "5.5", home: { label: "Over", odds: "2.18" }, away: { label: "Under", odds: "1.60" }, isOverUnder: true },
        ],
      },
    ],
  },
];

/* ── 개별 MarketItem 버튼 ────────────────────────────────── */

function MarketItemBtn({
  label,
  odds,
  selected,
  onClick,
}: {
  label: string;
  odds: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded py-2 text-center",
        "transition-colors border",
        selected
          ? "border-[var(--theme-primary,#c9a227)] bg-[var(--theme-primary,#c9a227)]/20"
          : "border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <span className={`text-[10px] uppercase ${selected ? "text-[var(--theme-primary,#c9a227)]" : "text-zinc-500"}`}>
        {label}
      </span>
      <span className={`text-sm font-bold ${selected ? "text-[var(--theme-primary,#c9a227)]" : "text-white"}`}>
        {odds}
      </span>
    </button>
  );
}

/* ── 하나의 Match Row ────────────────────────────────────── */

function SportsDomesticMatch({ match }: { match: MatchData; leagueName: string }) {
  const { lines, addLine, removeLine } = useBettingCart();

  const isSelected = (eventId: string, marketName: string, label: string) =>
    lines.some(
      (l) => l.id === `${eventId}-${marketName}-${label}`,
    );

  const handleClick = (option: MarketOption, marketName: string) => {
    const id = `${match.eventId}-${marketName}-${option.label}`;
    if (isSelected(match.eventId, marketName, option.label)) {
      removeLine(id);
    } else {
      addLine({
        matchLabel: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
        pickLabel: `${marketName} · ${option.label}`,
        odd: option.odds,
      });
    }
  };

  return (
    <div className="border-b border-white/5 last:border-none">
      {/* 팀 로고 & 이름 */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* LIVE / UPCOMING 뱃지 */}
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
            match.status === "LIVE"
              ? "bg-red-600/80 text-white"
              : "bg-zinc-700 text-zinc-300"
          }`}
        >
          {match.status}
        </span>

        {/* 홈팀 */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {match.homeTeam.imgSrc && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={match.homeTeam.imgSrc} alt="" className="h-5 w-5 rounded-full object-contain" />
          )}
          <span className="min-w-0 truncate text-xs font-medium text-white">
            {match.homeTeam.name}
          </span>
        </div>

        <span className="shrink-0 text-[10px] text-zinc-600">VS</span>

        {/* 원정팀 */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <span className="min-w-0 truncate text-right text-xs font-medium text-white">
            {match.awayTeam.name}
          </span>
          {match.awayTeam.imgSrc && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={match.awayTeam.imgSrc} alt="" className="h-5 w-5 rounded-full object-contain" />
          )}
        </div>
      </div>

      {/* 마켓 배당 rows */}
      <div className="space-y-1 px-3 pb-3">
        {match.markets.map((mkt) => (
          <div key={mkt.name}>
            <p className="mb-1 text-[9px] uppercase tracking-wider text-zinc-600">
              {mkt.name}
              {mkt.isOverUnder && (
                <span className="ml-1 text-zinc-700">({mkt.center})</span>
              )}
            </p>

            {/* 3-way (승무패 with draw) */}
            {mkt.draw ? (
              <div className="flex gap-1">
                <MarketItemBtn
                  label={mkt.home.label}
                  odds={mkt.home.odds}
                  selected={isSelected(match.eventId, mkt.name, mkt.home.label)}
                  onClick={() => handleClick(mkt.home, mkt.name)}
                />
                <MarketItemBtn
                  label={mkt.draw.label}
                  odds={mkt.draw.odds}
                  selected={isSelected(match.eventId, mkt.name, mkt.draw.label)}
                  onClick={() => handleClick(mkt.draw!, mkt.name)}
                />
                <MarketItemBtn
                  label={mkt.away.label}
                  odds={mkt.away.odds}
                  selected={isSelected(match.eventId, mkt.name, mkt.away.label)}
                  onClick={() => handleClick(mkt.away, mkt.name)}
                />
              </div>
            ) : (
              /* 2-way (승패 / 핸디캡 / 오버언더) */
              <div className="flex gap-1">
                <MarketItemBtn
                  label={mkt.home.label}
                  odds={mkt.home.odds}
                  selected={isSelected(match.eventId, mkt.name, mkt.home.label)}
                  onClick={() => handleClick(mkt.home, mkt.name)}
                />
                {/* 가운데 핸디캡/기준값 */}
                <div className="flex w-14 shrink-0 items-center justify-center rounded border border-white/5 bg-white/[0.02] text-[10px] font-bold text-zinc-600">
                  {mkt.center}
                </div>
                <MarketItemBtn
                  label={mkt.away.label}
                  odds={mkt.away.odds}
                  selected={isSelected(match.eventId, mkt.name, mkt.away.label)}
                  onClick={() => handleClick(mkt.away, mkt.name)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── LeagueGroup: 리그 헤더 + 매치들 ────────────────────── */

export function LeagueGroup({ group }: { group: LeagueGroupData }) {
  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-white/5 bg-zinc-900/60">
      {/* 리그 헤더 */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-zinc-900 px-3 py-2">
        {group.sportIconSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.sportIconSrc} alt="" className="h-4 w-4 object-contain" />
        )}
        {group.flagSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={group.flagSrc} alt="" className="h-3 w-4 object-cover rounded-[1px]" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-200">
          {group.leagueName}
        </span>
        <span className="shrink-0 text-[10px] text-zinc-500">{group.eventAt}</span>
      </div>

      {/* 매치들 */}
      {group.matches.map((match) => (
        <SportsDomesticMatch key={match.eventId} match={match} leagueName={group.leagueName} />
      ))}
    </div>
  );
}

/* ── SportsDomesticList: 전체 리스트 ────────────────────── */

export function SportsDomesticList({ leagues }: { leagues: LeagueGroupData[] }) {
  return (
    <div>
      {leagues.map((g, i) => (
        <LeagueGroup key={i} group={g} />
      ))}
    </div>
  );
}

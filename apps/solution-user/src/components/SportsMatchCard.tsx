"use client";

/*
  ─── SportsMatchCard 규격 (ZXX.BET 참조) ──────────────────────────

  구조:
  ┌─────────────────────────────────────────────────────┐
  │ [leagueIcon] 리그명                    [LIVE/UPCOMING]│
  │                                                      │
  │  [logo] 홈팀명           1 : 0    원정팀명 [logo]     │
  │                                                      │
  │  [HOME  1.32]   [DRAW  4.50]   [AWAY  2.55]         │
  └─────────────────────────────────────────────────────┘

  MarketItem:
    - 2개 (HOME/AWAY) or 3개 (HOME/DRAW/AWAY)
    - 클릭 시 useBettingCart().addLine() 호출
  ─────────────────────────────────────────────────────
*/

import { useBettingCart } from "./BettingCartContext";

export type MatchStatus = "live" | "upcoming";

export type MarketOdds = {
  label: string;   // "HOME" | "DRAW" | "AWAY"
  odds: string;    // "1.32"
};

export type SportsMatchCardProps = {
  status: MatchStatus;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  markets: MarketOdds[];  // 2 or 3 items
};

export function SportsMatchCard({
  status,
  leagueName,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  markets,
}: SportsMatchCardProps) {
  const { addLine } = useBettingCart();

  function handleOddsClick(market: MarketOdds) {
    addLine({
      matchLabel: `${homeTeam} vs ${awayTeam}`,
      pickLabel:  market.label === "HOME"
        ? homeTeam
        : market.label === "AWAY"
        ? awayTeam
        : "무승부",
      odd: market.odds,
    });
  }

  return (
    <div className="border border-white/8 bg-[#111118]">
      {/* 리그 정보 + 상태 뱃지 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs text-zinc-400">{leagueName}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
            status === "live"
              ? "bg-red-600 text-white"
              : "border border-white/20 text-zinc-500"
          }`}
        >
          {status === "live" ? "LIVE" : "UPCOMING"}
        </span>
      </div>

      {/* 팀 + 스코어 */}
      <div className="flex items-center px-3 py-3">
        {/* 홈팀 */}
        <div className="flex flex-1 flex-col items-start gap-1">
          <span className="text-sm font-semibold text-white leading-tight">{homeTeam}</span>
        </div>

        {/* 스코어 */}
        <div className="flex shrink-0 items-center gap-2 px-4">
          <span className="font-mono text-xl font-bold text-white">{homeScore}</span>
          <span className="text-sm text-zinc-500">:</span>
          <span className="font-mono text-xl font-bold text-white">{awayScore}</span>
        </div>

        {/* 원정팀 */}
        <div className="flex flex-1 flex-col items-end gap-1">
          <span className="text-sm font-semibold text-white leading-tight text-right">{awayTeam}</span>
        </div>
      </div>

      {/* 배당 버튼 */}
      <div className="flex border-t border-white/5">
        {markets.map((market, idx) => (
          <button
            key={market.label}
            type="button"
            onClick={() => handleOddsClick(market)}
            className={`flex flex-1 flex-col items-center py-2.5 text-center transition-colors hover:bg-white/5 ${
              idx < markets.length - 1 ? "border-r border-white/5" : ""
            }`}
          >
            <span className="text-[10px] text-zinc-500 uppercase">{market.label}</span>
            <span className="mt-0.5 font-mono text-sm font-semibold text-main-gold">
              {market.odds}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 샘플 데이터 (실제 API 연동 전 뼈대용) ─────────────────────── */
export const SAMPLE_MATCHES: SportsMatchCardProps[] = [
  {
    status: "live",
    leagueName: "NPB",
    homeTeam: "후쿠오카 호크스",
    awayTeam: "세이부 라이온스",
    homeScore: 0,
    awayScore: 0,
    markets: [
      { label: "HOME", odds: "1.32" },
      { label: "AWAY", odds: "2.55" },
    ],
  },
  {
    status: "live",
    leagueName: "NPB",
    homeTeam: "오릭스 버팔로스",
    awayTeam: "지바 롯데 마린스",
    homeScore: 1,
    awayScore: 0,
    markets: [
      { label: "HOME", odds: "1.15" },
      { label: "AWAY", odds: "3.60" },
    ],
  },
  {
    status: "live",
    leagueName: "WKBL",
    homeTeam: "부천 하나원큐",
    awayTeam: "용인 삼성생명",
    homeScore: 12,
    awayScore: 6,
    markets: [
      { label: "HOME", odds: "1.20" },
      { label: "DRAW", odds: "14.00" },
      { label: "AWAY", odds: "4.00" },
    ],
  },
  {
    status: "upcoming",
    leagueName: "CBA",
    homeTeam: "장쑤 드래곤즈",
    awayTeam: "저장 골든 불스",
    homeScore: 0,
    awayScore: 0,
    markets: [
      { label: "HOME", odds: "3.80" },
      { label: "DRAW", odds: "15.00" },
      { label: "AWAY", odds: "1.22" },
    ],
  },
  {
    status: "upcoming",
    leagueName: "KHL",
    homeTeam: "메탈루르크",
    awayTeam: "토르페도",
    homeScore: 0,
    awayScore: 0,
    markets: [
      { label: "HOME", odds: "1.48" },
      { label: "DRAW", odds: "4.30" },
      { label: "AWAY", odds: "4.10" },
    ],
  },
];

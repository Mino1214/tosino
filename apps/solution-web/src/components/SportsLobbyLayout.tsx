"use client";

/*
  SportsLobbyLayout — 스포츠/프리매치/e스포츠 공용 레이아웃
  ─────────────────────────────────────────────────────────
  구조 (ZXX.BET 모바일 스포츠 페이지 기반):

    [AdBanner]           ← 광고 배너 (공용, 모든 스포츠 탭)
    [SportTypeNav]       ← 종목 아이콘 가로 스크롤 (All/Soccer/…)
    [BetTypeNav]         ← 크로스/스페셜/실시간 탭 + 검색
    [FolderBonus]        ← 3폴더/5폴더/7폴더 보너스
    [MatchList]          ← LeagueGroup + SportsDomestic rows
    [Pagination]
*/

import { useState } from "react";
import { SportsDomesticList, type LeagueGroupData } from "./SportsDomesticCard";

/* ── 광고 배너 (공용) ─────────────────────────────────── */
export function AdBanner({ title = "이벤트 배너" }: { title?: string }) {
  return (
    <div className="flex h-12 w-full items-center justify-center bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 px-4 text-center text-xs text-zinc-400 border-b border-white/5">
      <span className="text-main-gold font-semibold mr-2">★</span>
      {title}
      <span className="text-main-gold font-semibold ml-2">★</span>
    </div>
  );
}

/* ── 종목 타입 Nav (가로 스크롤) ─────────────────────── */
const SPORT_TYPES = [
  { id: "all",        label: "All",           icon: "🏅", count: 83 },
  { id: "soccer",     label: "Soccer",        icon: "⚽", count: 27 },
  { id: "basketball", label: "Basketball",    icon: "🏀", count: 16 },
  { id: "hockey",     label: "Ice Hockey",    icon: "🏒", count: 16 },
  { id: "lol",        label: "League of Legends", icon: "🎮", count: 14 },
  { id: "baseball",   label: "Baseball",      icon: "⚾", count: 6  },
  { id: "cs",         label: "Counter-Strike",icon: "🔫", count: 2  },
  { id: "valorant",   label: "Valorant",      icon: "🎯", count: 2  },
  { id: "tennis",     label: "Tennis",        icon: "🎾", count: 0  },
  { id: "volleyball", label: "Volleyball",    icon: "🏐", count: 0  },
];

function SportTypeNav({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto border-b border-white/5 bg-zinc-950">
      <div className="flex gap-1 px-2 py-2" style={{ minWidth: "max-content" }}>
        {SPORT_TYPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={[
              "flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors",
              active === s.id
                ? "bg-[rgba(218,174,87,0.15)] text-main-gold"
                : s.count === 0
                  ? "text-zinc-700"
                  : "text-main-gold-solid/55 hover:text-main-gold-solid",
            ].join(" ")}
          >
            <span className="text-base">{s.icon}</span>
            <span className="text-[9px] leading-none">{s.label}</span>
            {s.count > 0 && (
              <span className="text-[9px] font-bold">{s.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 배팅 타입 Nav (크로스/스페셜/실시간) + 검색 ────────── */
type BetTab = { id: string; label: string; count: number };

function BetTypeNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: BetTab[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  return (
    <div className="flex items-center gap-1 border-b border-white/5 bg-zinc-950 px-2 py-1.5">
      {/* 탭들 */}
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={[
              "rounded px-3 py-1 text-[11px] font-semibold transition-colors",
              active === t.id
                ? "bg-gold-gradient text-black"
                : "text-main-gold-solid/65 hover:text-main-gold-solid",
            ].join(" ")}
          >
            {t.label}
            <span className="ml-1 text-[9px] opacity-70">{t.count}</span>
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="ml-auto flex items-center gap-1 rounded border border-white/10 bg-zinc-900 px-2 py-1">
        <span className="text-zinc-600 text-xs">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="팀명 검색"
          className="w-28 bg-transparent text-[11px] text-white placeholder:text-zinc-600 outline-none"
        />
      </div>
    </div>
  );
}

/* ── 폴더 보너스 ─────────────────────────────────────── */
function FolderBonus() {
  const [active, setActive] = useState<string | null>(null);
  const bonuses = [
    { id: "3", label: "3폴더", odds: "1.03" },
    { id: "5", label: "5폴더", odds: "1.05" },
    { id: "7", label: "7폴더", odds: "1.07" },
  ];
  return (
    <div className="flex gap-1.5 border-b border-white/5 bg-zinc-950/80 px-3 py-2">
      {bonuses.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setActive(active === b.id ? null : b.id)}
          className={[
            "flex flex-1 items-center justify-center gap-1.5 rounded border py-1.5 text-xs transition-colors",
            active === b.id
              ? "border-[rgba(218,174,87,0.55)] bg-[rgba(218,174,87,0.1)] text-main-gold"
              : "border-[rgba(218,174,87,0.15)] text-main-gold-solid/55 hover:border-[rgba(218,174,87,0.35)] hover:text-main-gold-solid",
          ].join(" ")}
        >
          <span className="font-semibold">{b.label}</span>
          <span className="text-[10px] opacity-70">×{b.odds}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Pagination ──────────────────────────────────────── */
function Pagination({
  total,
  current,
  onChange,
}: {
  total: number;
  current: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-6">
      <button
        type="button"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-zinc-400 disabled:opacity-30"
      >
        ‹
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={[
            "flex h-7 w-7 items-center justify-center rounded border text-xs font-semibold transition-colors",
            p === current
              ? "border-[rgba(218,174,87,0.55)] bg-[rgba(218,174,87,0.15)] text-main-gold"
              : "border-white/5 text-zinc-500 hover:text-zinc-200",
          ].join(" ")}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-zinc-400 disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}

/* ── SportsLobbyLayout — 메인 컴포넌트 ──────────────── */

export interface SportsLobbyLayoutProps {
  /** 페이지 타이틀 (예: "스포츠 크로스" / "프리매치") */
  title: string;
  /** 배당 탭 목록 */
  betTabs: BetTab[];
  /** 매치 데이터 */
  leagues: LeagueGroupData[];
  /** 광고 배너 텍스트 */
  bannerText?: string;
  /** 광고 배너 숨김 여부 */
  hideBanner?: boolean;
}

export function SportsLobbyLayout({
  title,
  betTabs,
  leagues,
  bannerText,
  hideBanner = false,
}: SportsLobbyLayoutProps) {
  const [sportType, setSportType]   = useState("all");
  const [betTab, setBetTab]         = useState(betTabs[0]?.id ?? "cross");
  const [page, setPage]             = useState(1);

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 pb-4">
      {/* 공용 광고 배너 */}
      {!hideBanner && (
        <AdBanner title={bannerText ?? `${title} 이벤트 진행 중 — 실시간 채널 이벤트 혜택을 받아가세요!`} />
      )}

      <div className="border-b border-[rgba(218,174,87,0.2)] bg-black px-4 py-2.5 md:px-6 lg:px-10">
        <h1 className="text-base font-bold text-main-gold sm:text-lg md:text-xl">{title}</h1>
      </div>

      {/* 종목 아이콘 Nav */}
      <div className="md:px-6 lg:px-10">
        <SportTypeNav active={sportType} onSelect={setSportType} />
      </div>

      {/* 배팅 타입 + 검색 */}
      <div className="md:px-6 lg:px-10">
        <BetTypeNav tabs={betTabs} active={betTab} onSelect={setBetTab} />
      </div>

      {/* 폴더 보너스 */}
      <div className="md:px-6 lg:px-10">
        <FolderBonus />
      </div>

      {/* 매치 리스트 */}
      <div className="px-2 pt-2 md:px-6 lg:px-10">
        {leagues.length > 0 ? (
          <SportsDomesticList leagues={leagues} />
        ) : (
          <div className="py-20 text-center text-sm text-zinc-600">
            현재 진행 중인 경기가 없습니다.
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      <Pagination total={5} current={page} onChange={setPage} />
    </div>
  );
}

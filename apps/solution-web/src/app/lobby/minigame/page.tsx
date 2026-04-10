"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/* ──────────────────────────────────────────── 게임 정의 */
type Market = {
  title: string;
  cols: number;
  options: { label: string; odds: string; color?: string }[];
};

type GameDef = {
  id: string;
  name: string;        // "보글보글" | "슈퍼 마리오" | "룰렛"
  type: "bubble" | "mario" | "roulette";
  minutes: number;
  url: string;
  cardBg: string;
  logoSrc: string;
  accentColor: string; // tailwind bg class for card accent
};

const BUBBLE_LOGO = "https://files-zx.asia-sportradar.com//img/frontend/minigame/big_icon/bubble_bobble_logo.svg";
const MARIO_LOGO  = "https://files-zx.asia-sportradar.com//img/frontend/minigame/big_icon/super_mario_logo.svg";
const ROULETTE_LOGO = "https://files-zx.asia-sportradar.com//img/frontend/minigame/big_icon/rock_paper_scissor_logo.svg";



const GAMES: GameDef[] = [
  // 보글보글 ×3
  { id:"bubble-1", name:"보글보글 1분", type:"bubble", minutes:1, url:"https://retrototo.com/bubble/?GameTime=1",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/zxx_assets/minigame/Bubble1.webp?ver=3",
    logoSrc: BUBBLE_LOGO, accentColor:"from-pink-950" },
  { id:"bubble-2", name:"보글보글 2분", type:"bubble", minutes:2, url:"https://retrototo.com/bubble/?GameTime=2",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/minigame/card_bg/bb_2.webp",
    logoSrc: BUBBLE_LOGO, accentColor:"from-pink-950" },
  { id:"bubble-3", name:"보글보글 3분", type:"bubble", minutes:3, url:"https://retrototo.com/bubble/?GameTime=3",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/minigame/card_bg/bb_3.webp",
    logoSrc: BUBBLE_LOGO, accentColor:"from-pink-950" },
  // 슈퍼마리오 ×3
  { id:"mario-1", name:"슈퍼 마리오 1분", type:"mario", minutes:1, url:"https://retrototo.com/super/?GameTime=1",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/zxx_assets/minigame/Mario1.webp?ver=2",
    logoSrc: MARIO_LOGO, accentColor:"from-red-950" },
  { id:"mario-2", name:"슈퍼 마리오 2분", type:"mario", minutes:2, url:"https://retrototo.com/super/?GameTime=2",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/minigame/card_bg/sm_2.webp",
    logoSrc: MARIO_LOGO, accentColor:"from-red-950" },
  { id:"mario-3", name:"슈퍼 마리오 3분", type:"mario", minutes:3, url:"https://retrototo.com/super/?GameTime=3",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/minigame/card_bg/sm_3.webp",
    logoSrc: MARIO_LOGO, accentColor:"from-red-950" },
  // 룰렛 ×3
  { id:"roulette-1", name:"가위바위보 1분", type:"roulette", minutes:1, url:"https://retrototo.com/ruletee/?GameTime=1",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/minigame/card_bg/roulette_1.jpg",
    logoSrc: ROULETTE_LOGO, accentColor:"from-violet-950" },
  { id:"roulette-2", name:"가위바위보 2분", type:"roulette", minutes:2, url:"https://retrototo.com/ruletee/?GameTime=2",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/minigame/card_bg/roulette_2.jpg",
    logoSrc: ROULETTE_LOGO, accentColor:"from-violet-950" },
  { id:"roulette-3", name:"가위바위보 3분", type:"roulette", minutes:3, url:"https://retrototo.com/ruletee/?GameTime=3",
    cardBg:"https://files-zx.asia-sportradar.com//img/frontend/minigame/card_bg/roulette_3.jpg",
    logoSrc: ROULETTE_LOGO, accentColor:"from-violet-950" },
];

/* 게임 타입별 배팅 마켓 */
const MARKETS: Record<string, Market[]> = {
  bubble: [
    { title:"홀짝",    cols:2, options:[{ label:"홀", odds:"1.95" },{ label:"짝", odds:"1.95" }] },
    { title:"방향",    cols:2, options:[{ label:"좌", odds:"1.95" },{ label:"우", odds:"1.95" }] },
    { title:"줄 개수", cols:2, options:[{ label:"3줄", odds:"1.95" },{ label:"4줄", odds:"1.95" }] },
  ],
  mario: [
    { title:"홀짝",    cols:2, options:[{ label:"홀", odds:"1.95" },{ label:"짝", odds:"1.95" }] },
    { title:"방향",    cols:2, options:[{ label:"좌", odds:"1.95" },{ label:"우", odds:"1.95" }] },
    { title:"줄 개수", cols:2, options:[{ label:"3줄", odds:"1.95" },{ label:"4줄", odds:"1.95" }] },
  ],
  roulette: [
    { title:"가위 바위 보", cols:3, options:[
        { label:"바위", odds:"2.7", color:"text_default" },
        { label:"보",   odds:"2.7", color:"text_default" },
        { label:"가위", odds:"2.7", color:"text_default" },
      ],
    },
    { title:"이겼다/졌다", cols:2, options:[
        { label:"이겼다", odds:"1.95", color:"text_1" },
        { label:"패배",   odds:"1.95", color:"text_default" },
      ],
    },
  ],
};

const QUICK_AMOUNTS = ["1만", "5만", "10만", "50만", "100만", "리셋", "최대 금액", "최소 금액"];

/* ──────────────────────────────────────────── 서브 컴포넌트 */
function GameCard({ g, onClick }: { g: GameDef; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8
                 shadow-lg transition-all duration-300 hover:border-[rgba(218,174,87,0.6)]
                 hover:shadow-[0_0_18px_rgba(218,174,87,0.18)] active:scale-[0.97]"
      style={{ minHeight: "140px" }}
    >
      {/* 배경 이미지 */}
      <span
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: `url(${g.cardBg})` }}
        aria-hidden
      />
      {/* 어두운 그라데이션 오버레이 */}
      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" aria-hidden />

      {/* 상단 배지 */}
      <div className="relative z-10 flex items-start justify-between p-2.5">
        <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-bold text-zinc-300 ring-1 ring-white/10">
          {g.minutes}분
        </span>
      </div>

      {/* 로고 + 이름 (하단) */}
      <div className="relative z-10 mt-auto flex flex-col items-center gap-1.5 pb-3 pt-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.logoSrc} alt={g.name} className="h-7 w-auto object-contain drop-shadow" />
        <span className="text-[11px] font-bold text-white drop-shadow">{g.name}</span>
      </div>

      {/* PLAY 오버레이 on hover */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl
                      bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="rounded-full bg-gold-gradient px-5 py-2 text-xs font-bold text-black shadow-lg">
          PLAY
        </span>
      </div>
    </button>
  );
}

function BettingMarket({ market, selected, onSelect }: {
  market: Market;
  selected: Record<string, string>;
  onSelect: (title: string, label: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/60">
      <div className="border-b border-white/5 px-3 py-2">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{market.title}</span>
      </div>
      <div
        className="grid gap-1.5 p-2"
        style={{ gridTemplateColumns: `repeat(${market.cols}, 1fr)` }}
      >
        {market.options.map((opt) => {
          const isSelected = selected[market.title] === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSelect(market.title, opt.label)}
              className={[
                "flex flex-col items-center gap-0.5 rounded-lg border py-2 px-1 transition-all",
                "text-center text-xs font-semibold active:scale-95",
                isSelected
                  ? "border-[rgba(218,174,87,0.55)] bg-[rgba(218,174,87,0.2)] text-main-gold shadow-[0_0_10px_rgba(218,174,87,0.25)]"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-700",
              ].join(" ")}
            >
              <span>{opt.label}</span>
              <span className={`text-[11px] font-bold ${isSelected ? "text-main-gold" : "text-main-gold-solid opacity-80"}`}>
                {opt.odds}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── 게임 플레이어 화면 */
/* iframe 자연 해상도 */
const IFRAME_W = 950;
const IFRAME_H: Record<GameDef["type"], number> = { roulette: 794, bubble: 750, mario: 750 };

/** 컨테이너 너비에 맞춰 iframe을 scale()로 축소/확대하는 훅 */
function useIframeScale(type: GameDef["type"]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const update = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    setScale(w / IFRAME_W);
  }, []);

  useEffect(() => {
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [update]);

  const naturalH = IFRAME_H[type];
  const containerH = Math.round(naturalH * scale);

  return { containerRef, scale, containerH };
}

function GamePlayer({ game, onBack }: { game: GameDef; onBack: () => void }) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [betAmount, setBetAmount] = useState("0");
  const { containerRef, scale, containerH } = useIframeScale(game.type);

  const markets = MARKETS[game.type] ?? [];

  function handleSelect(title: string, label: string) {
    setSelected((prev) =>
      prev[title] === label ? { ...prev, [title]: "" } : { ...prev, [title]: label },
    );
  }

  function addAmount(raw: string) {
    const map: Record<string, number> = {
      "1만":10000, "5만":50000, "10만":100000, "50만":500000, "100만":1000000,
    };
    if (raw === "리셋") { setBetAmount("0"); return; }
    if (raw === "최대 금액") { setBetAmount("1000000"); return; }
    if (raw === "최소 금액") { setBetAmount("10000"); return; }
    setBetAmount((v) => String((parseInt(v) || 0) + (map[raw] ?? 0)));
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* 상단 게임 정보 바 */}
      <div className="flex items-center justify-between border-b border-white/8 bg-zinc-900/80 px-4 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          ← 목록
        </button>
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={game.logoSrc} alt={game.name} className="h-5 w-auto" />
          <span className="font-bold text-white text-sm">{game.name}</span>
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{game.minutes}분</span>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          배팅내역
        </button>
      </div>

      {/* 메인 — iframe(좌) + 배팅패널(우) */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* iframe 영역 — 컨테이너 너비 기준으로 scale() 계산 */}
        <div className="w-full bg-black md:flex-1" ref={containerRef}>
          <div
            className="relative overflow-hidden bg-black"
            style={{ height: containerH || "auto" }}
          >
            <iframe
              src={game.url}
              title={game.name}
              scrolling="no"
              style={{
                width: IFRAME_W,
                height: IFRAME_H[game.type],
                border: "none",
                display: "block",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        </div>

        {/* 배팅 패널 */}
        <div className="flex w-full flex-col gap-3 overflow-y-auto border-t border-white/8 bg-zinc-950 p-3
                        md:w-[340px] md:min-w-[340px] md:border-l md:border-t-0 lg:w-[380px] lg:min-w-[380px]">
          {/* 마켓 섹션 */}
          <div className="flex flex-col gap-2">
            {markets.map((m) => (
              <BettingMarket
                key={m.title}
                market={m}
                selected={selected}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* 베팅 콘솔 */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/60">
            {/* 보유 머니 */}
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
              <span className="text-xs text-zinc-500">보유 머니</span>
              <span className="font-bold text-white">0 원</span>
            </div>

            {/* 빠른 금액 버튼 */}
            <div className="grid grid-cols-4 gap-1 p-2">
              {QUICK_AMOUNTS.map((btn) => (
                <button
                  key={btn}
                  type="button"
                  onClick={() => addAmount(btn)}
                  className={[
                    "rounded-lg py-2 text-[10px] font-semibold transition-all active:scale-95",
                    btn === "리셋"
                      ? "border border-red-700/50 bg-red-950/60 text-red-300 hover:bg-red-900/60 col-span-2"
                      : btn.includes("금액")
                      ? "border border-zinc-700/50 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700 col-span-2"
                      : "border border-zinc-700/50 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700",
                  ].join(" ")}
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* 베팅 금액 입력 */}
            <div className="flex items-center gap-2 border-t border-white/5 px-4 py-2.5">
              <span className="text-xs text-zinc-500 whitespace-nowrap">베팅 금액</span>
              <input
                type="text"
                value={parseInt(betAmount).toLocaleString()}
                onChange={(e) => setBetAmount(e.target.value.replace(/,/g, ""))}
                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5
                           text-right text-sm font-bold text-white outline-none focus:border-[rgba(218,174,87,0.75)]"
              />
              <span className="text-xs text-zinc-400">원</span>
            </div>

            {/* BETTING 버튼 */}
            <div className="p-2 pt-0">
              <button
                type="button"
                className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold shadow-md transition-all
                           active:scale-95 hover:brightness-110"
              >
                BETTING
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── 선택 화면 (3×3 그리드) */
function GameSelector({ onSelect }: { onSelect: (g: GameDef) => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      {/* 헤더 */}
      <div className="border-b border-[rgba(218,174,87,0.2)] bg-black px-4 py-5">
        <h1 className="text-xl font-bold text-main-gold">미니게임</h1>
        <p className="mt-0.5 text-xs text-main-gold-solid/75">BET BIG. WIN BIGGER!</p>
      </div>

      {/* 3×3 게임 카드 그리드 */}
      <div className="grid grid-cols-3 gap-3 px-3 pt-5 sm:gap-4 sm:px-4">
        {GAMES.map((g) => (
          <GameCard key={g.id} g={g} onClick={() => onSelect(g)} />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── 페이지 */
export default function MinigamePage() {
  const [activeGame, setActiveGame] = useState<GameDef | null>(null);

  if (activeGame) {
    return <GamePlayer game={activeGame} onBack={() => setActiveGame(null)} />;
  }

  return <GameSelector onSelect={setActiveGame} />;
}

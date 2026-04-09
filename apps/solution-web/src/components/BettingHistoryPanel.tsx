"use client";

import { useEffect, useState } from "react";
import { useBettingCart } from "./BettingCartContext";

/* ── 테스트 데이터 ──────────────────────────────────── */
type HistoryItem = {
  id: string;
  category: "sports" | "minigame" | "casino";
  gameLabel: string;   // "kt 롤스터 vs 농심 레드포스"
  pickLabel: string;   // "Home (1.40)"
  betAmount: number;
  winAmount: number | null; // null = 대기중
  status: "pending" | "win" | "lose" | "cancel";
  date: string;        // "04.09 20:15"
};

const HISTORY: HistoryItem[] = [
  /* 스포츠 */
  { id:"h1", category:"sports",   gameLabel:"kt 롤스터 vs 농심 레드포스",   pickLabel:"Home · 1.40",    betAmount:50000,  winAmount:70000,  status:"win",     date:"04.09 20:15" },
  { id:"h2", category:"sports",   gameLabel:"장쑤 드래곤즈 vs 저장 골든 불스", pickLabel:"오버 · 1.87", betAmount:30000,  winAmount:null,   status:"pending", date:"04.09 20:35" },
  { id:"h3", category:"sports",   gameLabel:"Lok.소피아 vs 바로에",           pickLabel:"Draw · 3.93",    betAmount:20000,  winAmount:0,      status:"lose",    date:"04.09 21:30" },
  { id:"h4", category:"sports",   gameLabel:"사우디 다막 FC vs 알 카디시야",  pickLabel:"Away · 1.49",    betAmount:100000, winAmount:149000, status:"win",     date:"04.10 01:00" },
  { id:"h5", category:"sports",   gameLabel:"메탈루르크 vs 니즈니 노브고로드", pickLabel:"Home · 1.48",   betAmount:40000,  winAmount:null,   status:"pending", date:"04.09 23:00" },
  { id:"h6", category:"sports",   gameLabel:"부천 하나원큐 vs 삼성생명",       pickLabel:"언더 · 1.80",   betAmount:25000,  winAmount:0,      status:"lose",    date:"04.09 19:00" },
  /* 미니게임 */
  { id:"h7", category:"minigame", gameLabel:"보글보글 1분 (1281회차)",         pickLabel:"홀 · 1.95",      betAmount:10000,  winAmount:19500,  status:"win",     date:"04.09 20:03" },
  { id:"h8", category:"minigame", gameLabel:"슈퍼 마리오 1분 (1280회차)",      pickLabel:"좌 · 1.95",      betAmount:10000,  winAmount:0,      status:"lose",    date:"04.09 20:01" },
  { id:"h9", category:"minigame", gameLabel:"룰렛 1분 (1279회차)",             pickLabel:"바위 · 2.70",    betAmount:5000,   winAmount:null,   status:"pending", date:"04.09 20:05" },
  { id:"h10",category:"minigame", gameLabel:"보글보글 2분 (640회차)",           pickLabel:"3줄 · 1.95",     betAmount:15000,  winAmount:29250,  status:"win",     date:"04.09 19:58" },
  { id:"h11",category:"minigame", gameLabel:"룰렛 2분 (640회차)",              pickLabel:"이겼다 · 1.95",  betAmount:20000,  winAmount:0,      status:"cancel",  date:"04.09 19:56" },
  /* 카지노 */
  { id:"h12",category:"casino",   gameLabel:"Evolution 바카라",                pickLabel:"플레이어 · 1.97",betAmount:50000,  winAmount:98500,  status:"win",     date:"04.09 20:10" },
  { id:"h13",category:"casino",   gameLabel:"Pragmatic 블랙잭",                pickLabel:"블랙잭 · 2.50",  betAmount:30000,  winAmount:0,      status:"lose",    date:"04.09 20:08" },
  { id:"h14",category:"casino",   gameLabel:"Vivo Gaming 드래곤타이거",         pickLabel:"타이거 · 1.97",  betAmount:20000,  winAmount:null,   status:"pending", date:"04.09 20:12" },
];

const TABS = [
  { id: "all",      label: "전체",    filter: (h: HistoryItem) => true },
  { id: "sports",   label: "스포츠",  filter: (h: HistoryItem) => h.category === "sports" },
  { id: "minigame", label: "미니게임",filter: (h: HistoryItem) => h.category === "minigame" },
  { id: "casino",   label: "카지노",  filter: (h: HistoryItem) => h.category === "casino" },
] as const;

const STATUS_STYLE: Record<HistoryItem["status"], { label: string; cls: string }> = {
  pending: { label: "대기중", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  win:     { label: "적중",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  lose:    { label: "미적중", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancel:  { label: "취소",   cls: "bg-zinc-600/30 text-zinc-500 border-zinc-600/30" },
};

const CATEGORY_ICON: Record<HistoryItem["category"], string> = {
  sports:   "⚽",
  minigame: "🕹️",
  casino:   "🎰",
};

/* ── 패널 ───────────────────────────────────────────── */
export function BettingHistoryPanel() {
  const { historyOpen, setHistoryOpen } = useBettingCart();
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("all");

  /* 열릴 때 body 스크롤 잠금 */
  useEffect(() => {
    document.body.style.overflow = historyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [historyOpen]);

  const close = () => setHistoryOpen(false);
  const activeTab = TABS.find((t) => t.id === tab)!;
  const items = HISTORY.filter(activeTab.filter);

  /* 탭별 요약 */
  const summary = {
    total: items.length,
    win:   items.filter((h) => h.status === "win").length,
    totalBet: items.reduce((s, h) => s + h.betAmount, 0),
    totalWin: items.filter((h) => h.status === "win").reduce((s, h) => s + (h.winAmount ?? 0), 0),
  };

  return (
    <>
      {/* 오버레이 */}
      {historyOpen && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px]" onClick={close} />
      )}

      {/* 슬라이드업 패널 */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[95] flex flex-col overflow-hidden rounded-t-2xl
                    border-t border-x border-white/10 bg-[#0a0a0e]
                    transition-transform duration-300 ease-in-out
                    ${historyOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "92dvh" }}
      >
        {/* 핸들 + 제목 + 닫기 */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
          <button type="button" onClick={close} className="text-sm text-zinc-400 hover:text-zinc-200">
            ✕ 닫기
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <span className="h-1 w-10 rounded-full bg-white/20" />
            <span className="text-sm font-bold text-white">배팅내역</span>
          </div>
          <span className="w-12" />
        </div>

        {/* 카테고리 탭 */}
        <div className="flex shrink-0 gap-1 border-b border-white/5 bg-zinc-950 px-3 py-2">
          {TABS.map((t) => {
            const cnt = HISTORY.filter(t.filter).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "flex flex-1 flex-col items-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors",
                  tab === t.id
                    ? "bg-[var(--theme-primary,#c9a227)] text-black"
                    : "text-zinc-500 hover:text-zinc-300",
                ].join(" ")}
              >
                <span>{t.label}</span>
                <span className={`text-[9px] font-normal ${tab === t.id ? "text-black/70" : "text-zinc-600"}`}>
                  {cnt}건
                </span>
              </button>
            );
          })}
        </div>

        {/* 요약 바 */}
        <div className="flex shrink-0 items-center justify-around border-b border-white/5 bg-zinc-900/60 px-4 py-2.5">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-zinc-600">총 배팅</span>
            <span className="text-xs font-bold text-zinc-300">{summary.total}건</span>
          </div>
          <div className="h-6 w-px bg-white/8" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-zinc-600">적중</span>
            <span className="text-xs font-bold text-emerald-400">{summary.win}건</span>
          </div>
          <div className="h-6 w-px bg-white/8" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-zinc-600">배팅금액</span>
            <span className="text-xs font-bold text-zinc-300">{summary.totalBet.toLocaleString("ko-KR")}원</span>
          </div>
          <div className="h-6 w-px bg-white/8" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-zinc-600">당첨금액</span>
            <span className="text-xs font-bold text-[var(--theme-primary,#c9a227)]">{summary.totalWin.toLocaleString("ko-KR")}원</span>
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-600">배팅 내역이 없습니다</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((h) => {
                const st = STATUS_STYLE[h.status];
                return (
                  <li key={h.id} className="flex items-start gap-3 px-4 py-3.5">
                    {/* 카테고리 아이콘 */}
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-base">
                      {CATEGORY_ICON[h.category]}
                    </span>

                    {/* 내용 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-medium text-zinc-300">{h.gameLabel}</p>
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold text-white">{h.pickLabel}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-zinc-600">
                        <span>{h.date}</span>
                        <span>배팅 {h.betAmount.toLocaleString("ko-KR")}원</span>
                        {h.status === "win" && h.winAmount && (
                          <span className="font-semibold text-emerald-500">
                            +{h.winAmount.toLocaleString("ko-KR")}원
                          </span>
                        )}
                        {h.status === "lose" && (
                          <span className="text-red-500/70">-{h.betAmount.toLocaleString("ko-KR")}원</span>
                        )}
                        {h.status === "cancel" && (
                          <span className="text-zinc-600">취소됨</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

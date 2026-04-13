"use client";

import { useEffect, useState } from "react";
import { useBettingCart } from "./BettingCartContext";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { apiFetch, getAccessToken } from "@/lib/api";

/* ── 테스트 데이터 ──────────────────────────────────── */
type HistoryItem = {
  id: string;
  category: "sports" | "minigame" | "casino";
  gameLabel: string;
  pickLabel: string;
  betAmount: number;
  winAmount: number | null;
  status: "pending" | "win" | "lose" | "cancel";
  date: string;
};

const HISTORY: HistoryItem[] = [
  { id:"h1",  category:"sports",   gameLabel:"kt 롤스터 vs 농심 레드포스",        pickLabel:"Home · 1.40",      betAmount:50000,  winAmount:70000,  status:"win",     date:"04.09 20:15" },
  { id:"h2",  category:"sports",   gameLabel:"장쑤 드래곤즈 vs 저장 골든 불스",    pickLabel:"오버 · 1.87",      betAmount:30000,  winAmount:null,   status:"pending", date:"04.09 20:35" },
  { id:"h3",  category:"sports",   gameLabel:"Lok.소피아 vs 바로에",              pickLabel:"Draw · 3.93",      betAmount:20000,  winAmount:0,      status:"lose",    date:"04.09 21:30" },
  { id:"h4",  category:"sports",   gameLabel:"다막 FC vs 알 카디시야",            pickLabel:"Away · 1.49",      betAmount:100000, winAmount:149000, status:"win",     date:"04.10 01:00" },
  { id:"h5",  category:"sports",   gameLabel:"메탈루르크 vs 니즈니 노브고로드",    pickLabel:"Home · 1.48",      betAmount:40000,  winAmount:null,   status:"pending", date:"04.09 23:00" },
  { id:"h6",  category:"sports",   gameLabel:"부천 하나원큐 vs 삼성생명",          pickLabel:"언더 · 1.80",      betAmount:25000,  winAmount:0,      status:"lose",    date:"04.09 19:00" },
  { id:"h7",  category:"minigame", gameLabel:"보글보글 1분 (1281회차)",            pickLabel:"홀 · 1.95",        betAmount:10000,  winAmount:19500,  status:"win",     date:"04.09 20:03" },
  { id:"h8",  category:"minigame", gameLabel:"슈퍼 마리오 1분 (1280회차)",         pickLabel:"좌 · 1.95",        betAmount:10000,  winAmount:0,      status:"lose",    date:"04.09 20:01" },
  { id:"h9",  category:"minigame", gameLabel:"룰렛 1분 (1279회차)",               pickLabel:"바위 · 2.70",      betAmount:5000,   winAmount:null,   status:"pending", date:"04.09 20:05" },
  { id:"h10", category:"minigame", gameLabel:"보글보글 2분 (640회차)",             pickLabel:"3줄 · 1.95",       betAmount:15000,  winAmount:29250,  status:"win",     date:"04.09 19:58" },
  { id:"h11", category:"minigame", gameLabel:"룰렛 2분 (640회차)",                pickLabel:"이겼다 · 1.95",    betAmount:20000,  winAmount:0,      status:"cancel",  date:"04.09 19:56" },
  { id:"h12", category:"casino",   gameLabel:"Evolution 바카라",                  pickLabel:"플레이어 · 1.97",  betAmount:50000,  winAmount:98500,  status:"win",     date:"04.09 20:10" },
  { id:"h13", category:"casino",   gameLabel:"Pragmatic 블랙잭",                  pickLabel:"블랙잭 · 2.50",    betAmount:30000,  winAmount:0,      status:"lose",    date:"04.09 20:08" },
  { id:"h14", category:"casino",   gameLabel:"Vivo Gaming 드래곤타이거",           pickLabel:"타이거 · 1.97",    betAmount:20000,  winAmount:null,   status:"pending", date:"04.09 20:12" },
];

const TABS = [
  { id: "all",      label: "전체",     filter: (_: HistoryItem) => true },
  { id: "sports",   label: "스포츠",   filter: (h: HistoryItem) => h.category === "sports" },
  { id: "minigame", label: "미니게임", filter: (h: HistoryItem) => h.category === "minigame" },
  { id: "casino",   label: "카지노",   filter: (h: HistoryItem) => h.category === "casino" },
] as const;

const STATUS_STYLE: Record<HistoryItem["status"], { label: string; cls: string }> = {
  pending: { label: "대기중", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  win:     { label: "적중",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  lose:    { label: "미적중", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancel:  { label: "취소",   cls: "bg-zinc-600/30 text-zinc-500 border-zinc-600/30" },
};

const CATEGORY_ICON: Record<HistoryItem["category"], string> = {
  sports: "⚽", minigame: "🕹️", casino: "🎰",
};

type ApiBetRow = {
  id: string;
  createdAt: string;
  betAmount: string;
  category: string;
  reference: string | null;
  meta: Record<string, unknown>;
};

function mapApiToItem(r: ApiBetRow): HistoryItem {
  const cmd =
    typeof r.meta.command === "string" ? r.meta.command : r.category;
  let cat: HistoryItem["category"] = "minigame";
  if (r.category === "sports") cat = "sports";
  else if (r.category === "casino") cat = "casino";
  return {
    id: r.id,
    category: cat,
    gameLabel: cmd,
    pickLabel: r.reference?.trim() ? r.reference : "—",
    betAmount: Number(r.betAmount),
    winAmount: null,
    status: "pending",
    date: new Date(r.createdAt).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/* ── 내용 (모바일·데스크톱 공용) ─────────────────────── */
function HistoryContent({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("all");
  const [source, setSource] = useState<HistoryItem[]>(HISTORY);

  useEffect(() => {
    if (!getAccessToken()) return;
    void apiFetch<ApiBetRow[]>("/me/betting-history")
      .then((rows) => {
        if (rows.length > 0) setSource(rows.map(mapApiToItem));
      })
      .catch(() => {
        /* 데모 데이터 유지 */
      });
  }, []);

  const activeTab = TABS.find((t) => t.id === tab)!;
  const items = source.filter(activeTab.filter);

  const summary = {
    total:    items.length,
    win:      items.filter((h) => h.status === "win").length,
    totalBet: items.reduce((s, h) => s + h.betAmount, 0),
    totalWin: items.filter((h) => h.status === "win").reduce((s, h) => s + (h.winAmount ?? 0), 0),
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-3.5">
        <span className="text-base font-bold text-white">배팅내역</span>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex shrink-0 gap-1.5 border-b border-white/5 bg-zinc-950/80 px-4 py-2.5">
        {TABS.map((t) => {
          const cnt = source.filter(t.filter).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "flex flex-1 flex-col items-center rounded-lg py-1.5 text-[11px] font-semibold transition-colors",
                tab === t.id
                  ? "bg-gold-gradient text-black"
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
      <div className="flex shrink-0 items-center justify-around border-b border-white/5 bg-zinc-900/50 px-4 py-2.5">
        {[
          { label: "총 배팅", value: `${summary.total}건`, color: "text-zinc-300" },
          { label: "적중",    value: `${summary.win}건`,  color: "text-emerald-400" },
          { label: "배팅금액",value: `${summary.totalBet.toLocaleString("ko-KR")}원`, color: "text-zinc-300" },
          { label: "당첨금액",value: `${summary.totalWin.toLocaleString("ko-KR")}원`, color: "text-main-gold" },
        ].map((s, i, arr) => (
          <div key={s.label} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-zinc-600">{s.label}</span>
              <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
            </div>
            {i < arr.length - 1 && <div className="h-6 w-px bg-white/8" />}
          </div>
        ))}
      </div>

      {/* 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        {items.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-600">배팅 내역이 없습니다</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {items.map((h) => {
              const st = STATUS_STYLE[h.status];
              return (
                <li key={h.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/2 transition-colors">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-base">
                    {CATEGORY_ICON[h.category]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-medium text-zinc-300">{h.gameLabel}</p>
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-white">{h.pickLabel}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-600">
                      <span>{h.date}</span>
                      <span>배팅 {h.betAmount.toLocaleString("ko-KR")}원</span>
                      {h.status === "win" && h.winAmount && (
                        <span className="font-semibold text-emerald-500">+{h.winAmount.toLocaleString("ko-KR")}원</span>
                      )}
                      {h.status === "lose" && (
                        <span className="text-red-500/70">-{h.betAmount.toLocaleString("ko-KR")}원</span>
                      )}
                      {h.status === "cancel" && <span className="text-zinc-600">취소됨</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── 메인 패널/모달 ─────────────────────────────────── */
export function BettingHistoryPanel() {
  const { historyOpen, setHistoryOpen } = useBettingCart();
  const close = () => setHistoryOpen(false);

  /* 스크롤 잠금 (iOS 호환) */
  useEffect(() => {
    if (historyOpen) lockScroll();
    else unlockScroll();
    return () => { unlockScroll(); };
  }, [historyOpen]);

  /* ESC 닫기 */
  useEffect(() => {
    if (!historyOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [historyOpen]);

  if (!historyOpen) return null;

  return (
    <>
      {/* ── 모바일: 전체화면 슬라이드업 ──────────────── */}
      <div className="md:hidden">
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px]" onClick={close} />
        <div className="fixed inset-x-0 bottom-0 top-0 z-[95] flex flex-col overflow-hidden bg-[#0a0a0e]">
          {/* 핸들 */}
          <div className="flex shrink-0 justify-center py-2.5">
            <div className="h-1 w-12 rounded-full bg-white/20" />
          </div>
          <HistoryContent onClose={close} />
        </div>
      </div>

      {/* ── 데스크톱: 센터 모달 ──────────────────────── */}
      <div className="hidden md:flex fixed inset-0 z-[100] items-center justify-center p-6">
        {/* 배경 오버레이 */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

        {/* 모달 박스 */}
        <div
          className="relative z-10 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl"
          style={{ width: "min(600px, 90vw)", height: "min(720px, 85vh)" }}
        >
          <HistoryContent onClose={close} />
        </div>
      </div>
    </>
  );
}

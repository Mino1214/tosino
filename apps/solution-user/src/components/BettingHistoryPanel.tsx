"use client";

import { useEffect, useState } from "react";
import { useBettingCart } from "./BettingCartContext";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { apiFetch, getAccessToken } from "@/lib/api";
import { formatKrwWithSymbol } from "@/lib/format-currency";

// ─── API 응답 타입 ───────────────────────────────────────────
type ApiBetRow = {
  id: string;
  createdAt: string;
  betAmount: string;
  winAmount: string | null;
  netResult: string;
  reference: string | null;
  category: "sports" | "minigame" | "casino" | "other";
  gameLabel: string;
  status: "pending" | "win" | "lose" | "cancel";
  vertical: string;
};

// ─── 탭 정의 (카지노만 현재 활성, 나머지는 준비중 표시용) ───
const TABS = [
  { id: "all",      label: "전체" },
  { id: "casino",   label: "카지노" },
  { id: "sports",   label: "스포츠" },
  { id: "minigame", label: "미니게임" },
] as const;
type TabId = typeof TABS[number]["id"];

const STATUS_STYLE: Record<ApiBetRow["status"], { label: string; cls: string }> = {
  pending: { label: "진행중", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  win:     { label: "적중",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  lose:    { label: "미적중", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  cancel:  { label: "취소",   cls: "bg-zinc-600/30 text-zinc-500 border-zinc-600/30" },
};

const CATEGORY_ICON: Record<string, string> = {
  sports: "⚽",
  minigame: "🕹️",
  casino: "🎰",
  other: "🎲",
};

function fmt(v: string | number) {
  return Number(v).toLocaleString("ko-KR");
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── 내용 컴포넌트 ───────────────────────────────────────────
function HistoryContent({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabId>("all");
  const [items, setItems] = useState<ApiBetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); return; }
    setLoading(true);
    apiFetch<ApiBetRow[]>("/me/betting-history")
      .then((rows) => { setItems(rows); })
      .catch((e) => { setErr(e instanceof Error ? e.message : "조회 실패"); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === "all" ? items : items.filter((h) => h.category === tab);

  const summary = {
    total:    filtered.length,
    win:      filtered.filter((h) => h.status === "win").length,
    totalBet: filtered.reduce((s, h) => s + Number(h.betAmount), 0),
    totalWin: filtered.reduce((s, h) => s + (h.winAmount ? Number(h.winAmount) : 0), 0),
    netResult: filtered.reduce((s, h) => s + Number(h.netResult), 0),
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-5 py-3.5">
        <span className="text-base font-bold text-white">배팅 내역</span>
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
          const cnt = t.id === "all" ? items.length : items.filter((h) => h.category === t.id).length;
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
          { label: "적중",    value: `${summary.win}건`,   color: "text-emerald-400" },
          { label: "배팅금액",value: `${fmt(summary.totalBet)}원`, color: "text-zinc-300" },
          {
            label: "손익",
            value: `${summary.netResult >= 0 ? "+" : ""}${fmt(summary.netResult)}원`,
            color: summary.netResult >= 0 ? "text-emerald-400" : "text-red-400",
          },
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
        {loading ? (
          <p className="py-12 text-center text-sm text-zinc-600">불러오는 중...</p>
        ) : err ? (
          <p className="py-12 text-center text-sm text-red-400">{err}</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-2xl">🎲</p>
            <p className="text-sm text-zinc-600">배팅 내역이 없습니다</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {filtered.map((h) => {
              const st = STATUS_STYLE[h.status];
              const bet = Number(h.betAmount);
              const win = h.winAmount !== null ? Number(h.winAmount) : null;
              const net = Number(h.netResult);
              return (
                <li key={h.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                  {/* 카테고리 아이콘 */}
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 text-lg">
                    {CATEGORY_ICON[h.category] ?? "🎲"}
                  </span>

                  <div className="min-w-0 flex-1">
                    {/* 게임명 + 상태 뱃지 */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-semibold text-zinc-200">
                        {h.gameLabel}
                      </p>
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>

                    {/* 카테고리 레이블 */}
                    <p className="mt-0.5 text-[10px] text-zinc-600">
                      {h.category === "casino" ? "카지노" : h.category === "sports" ? "스포츠" : h.category === "minigame" ? "미니게임" : "기타"}
                      {h.reference ? ` · #${h.reference.slice(0, 8)}` : ""}
                    </p>

                    {/* 금액 행 */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {/* 배팅금 */}
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-zinc-600">배팅</span>
                        <span className="text-xs font-bold text-zinc-300">
                          {formatKrwWithSymbol(bet)}
                        </span>
                      </div>

                      {/* 당첨금 (있을 때만) */}
                      {win !== null && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-zinc-600">당첨</span>
                          <span className={`text-xs font-bold ${win > 0 ? "text-emerald-400" : "text-zinc-500"}`}>
                            {formatKrwWithSymbol(win)}
                          </span>
                        </div>
                      )}

                      {/* 손익 */}
                      {h.status !== "pending" && (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-zinc-600">손익</span>
                          <span className={`text-xs font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {net >= 0 ? "+" : ""}{formatKrwWithSymbol(net)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 시각 */}
                    <p className="mt-1 text-[10px] text-zinc-700">{fmtDate(h.createdAt)}</p>
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

// ─── 메인 패널/모달 ─────────────────────────────────────────
export function BettingHistoryPanel() {
  const { historyOpen, setHistoryOpen } = useBettingCart();
  const close = () => setHistoryOpen(false);

  useEffect(() => {
    if (historyOpen) lockScroll();
    else unlockScroll();
    return () => { unlockScroll(); };
  }, [historyOpen]);

  useEffect(() => {
    if (!historyOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [historyOpen]);

  if (!historyOpen) return null;

  return (
    <>
      {/* ── 모바일: 전체화면 슬라이드업 ── */}
      <div className="md:hidden">
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-[2px]" onClick={close} />
        <div className="fixed inset-x-0 bottom-0 top-0 z-[95] flex flex-col overflow-hidden bg-[#0a0a0e]">
          <div className="flex shrink-0 justify-center py-2.5">
            <div className="h-1 w-12 rounded-full bg-white/20" />
          </div>
          <HistoryContent onClose={close} />
        </div>
      </div>

      {/* ── 데스크톱: 센터 모달 ── */}
      <div className="hidden md:flex fixed inset-0 z-[100] items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
        <div
          className="relative z-10 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl"
          style={{ width: "min(640px, 90vw)", height: "min(740px, 85vh)" }}
        >
          <HistoryContent onClose={close} />
        </div>
      </div>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBettingCart } from "./BettingCartContext";

const QUICK_AMOUNTS = [10000, 50000, 100000, 300000, 500000, 1000000];

export function BettingCartDock() {
  const { lines, removeLine, clear } = useBettingCart();
  const [open, setOpen] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const totalOdds = lines.reduce((acc, l) => acc * parseFloat(l.odd || "1"), 1);
  const expectedWin = Math.floor(betAmount * totalOdds);

  const closeOnEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, closeOnEscape]);

  const panelContent = (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">배팅카트</span>
          {lines.length > 0 && (
            <span className="rounded-full bg-[var(--theme-primary,#c9a227)] px-2 py-0.5 text-[10px] font-bold text-black">
              {lines.length}
            </span>
          )}
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            모두 비우기
          </button>
        )}
      </div>

      {/* 배팅 아이템 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <span className="text-3xl opacity-30">🎯</span>
            <p className="text-xs text-zinc-500">배당을 눌러 담아보세요</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li
                key={l.id}
                className="rounded-xl border border-white/8 bg-white/5 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-zinc-500 truncate">{l.matchLabel}</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-100 truncate">{l.pickLabel}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-sm font-bold text-[var(--theme-primary,#c9a227)]">
                      {l.odd}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                      aria-label="제거"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 배팅 금액 입력 */}
      {lines.length > 0 && (
        <div className="border-t border-white/8 px-3 py-3 space-y-2.5">
          {/* 빠른 금액 */}
          <div className="grid grid-cols-3 gap-1.5">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setBetAmount((prev) => prev + amt)}
                className="rounded-lg border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-[var(--theme-primary,#c9a227)]/40 hover:bg-white/8"
              >
                {amt >= 1000000
                  ? `${amt / 1000000}백만`
                  : `${(amt / 1000).toFixed(0)}천`}
              </button>
            ))}
          </div>

          {/* 금액 입력 + 초기화 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={betAmount || ""}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value)))}
                placeholder="배팅 금액"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-right text-sm text-white placeholder-zinc-600 outline-none focus:border-[var(--theme-primary,#c9a227)]/60"
              />
            </div>
            <button
              type="button"
              onClick={() => setBetAmount(0)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-500 hover:bg-white/5"
            >
              초기화
            </button>
          </div>

          {/* 배당·예상 당첨 */}
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
            <div className="text-xs text-zinc-500">
              <span>배당률 </span>
              <span className="font-mono text-[var(--theme-primary,#c9a227)]">
                ×{totalOdds.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              <span>당첨예상 </span>
              <span className="font-mono font-semibold text-white">
                {expectedWin.toLocaleString("ko-KR")}
              </span>
            </div>
          </div>

          {/* 배팅 버튼 */}
          <button
            type="button"
            disabled={betAmount <= 0}
            className="w-full rounded-xl bg-[var(--theme-primary,#c9a227)] py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:opacity-30"
          >
            배팅하기
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 데스크톱 — 우측 고정 패널 */}
      <aside
        className="fixed right-3 top-14 z-[60] hidden w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#111118] shadow-2xl md:flex md:flex-col"
        style={{ maxHeight: "calc(100dvh - 4rem)" }}
      >
        {panelContent}
      </aside>

      {/* 모바일 — 플로팅 버튼 + 슬라이드업 패널 */}
      <div className="md:hidden">
        {/* 오버레이 */}
        {open && (
          <div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}

        {/* 슬라이드업 패널 */}
        <div
          ref={panelRef}
          className={`fixed inset-x-0 bottom-14 z-[80] flex flex-col overflow-hidden rounded-t-2xl border-t border-x border-white/10 bg-[#111118] shadow-[0_-8px_32px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-out ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ maxHeight: "80dvh" }}
        >
          {/* 드래그 핸들 */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full flex-col items-center gap-1 px-4 pt-3 pb-2"
          >
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </button>
          {panelContent}
        </div>

        {/* 플로팅 배팅카트 버튼 */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`fixed bottom-[4.5rem] right-3 z-[65] flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all ${
            lines.length > 0
              ? "bg-[var(--theme-primary,#c9a227)] text-black"
              : "border border-white/15 bg-[#111118] text-zinc-400"
          }`}
          aria-label="배팅카트"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          {lines.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
              {lines.length}
            </span>
          )}
        </button>
      </div>
    </>
  );
}

"use client";

/*
  ─── BettingCartDock 규격 ──────────────────────────
  Desktop (md+):
    · position : fixed right-0 top-12 bottom-0
    · width    : w-72 (288px)  — layout.tsx md:mr-72 과 맞춤
    · layout   : flex col (헤더 | 목록(scroll) | 입력)

  Mobile:
    · 플로팅 버튼: fixed bottom-[4.5rem] right-3  (탭바 위)
    · 슬라이드업 패널: fixed inset-x-0 bottom-14, max-h-[80dvh]
    · 오버레이: fixed inset-0 z-[70]
  ──────────────────────────────────────────────────
*/

import { useCallback, useEffect, useState } from "react";
import { useBettingCart } from "./BettingCartContext";

const QUICK_AMOUNTS = [10_000, 50_000, 100_000, 300_000, 500_000, 1_000_000];

function CartPanel() {
  const { lines, removeLine, clear } = useBettingCart();
  const [amount, setAmount] = useState(0);

  const totalOdds = lines.reduce((a, l) => a * parseFloat(l.odd || "1"), 1);
  const expected  = Math.floor(amount * totalOdds);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/8 px-4">
        <span className="text-sm font-semibold">
          배팅카트
          {lines.length > 0 && (
            <span className="ml-2 rounded-full bg-[var(--theme-primary,#c9a227)] px-1.5 py-0.5 text-[10px] font-bold text-black">
              {lines.length}
            </span>
          )}
        </span>
        {lines.length > 0 && (
          <button type="button" onClick={clear} className="text-xs text-zinc-500">비우기</button>
        )}
      </div>

      {/* 목록 (스크롤) */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {lines.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-600">배당을 눌러 담아보세요</p>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-2 rounded-lg border border-white/8 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-zinc-500">{l.matchLabel}</p>
                  <p className="mt-0.5 text-sm font-medium">{l.pickLabel}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm text-[var(--theme-primary,#c9a227)]">{l.odd}</p>
                  <button type="button" onClick={() => removeLine(l.id)} className="text-xs text-zinc-600 hover:text-red-400">✕</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 입력 영역 (아이템 있을 때만) */}
      {lines.length > 0 && (
        <div className="shrink-0 border-t border-white/8 px-3 py-3 space-y-2">
          {/* 빠른 금액 */}
          <div className="grid grid-cols-3 gap-1">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount((p) => p + v)}
                className="rounded border border-white/10 py-1.5 text-[11px] text-zinc-300"
              >
                {v >= 1_000_000 ? `${v / 1_000_000}백만` : `${v / 1_000}천`}
              </button>
            ))}
          </div>

          {/* 금액 입력 */}
          <div className="flex gap-1.5">
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              placeholder="배팅금액"
              className="min-w-0 flex-1 rounded border border-white/10 bg-transparent px-2 py-1.5 text-right text-sm outline-none focus:border-[var(--theme-primary,#c9a227)]/60"
            />
            <button type="button" onClick={() => setAmount(0)} className="shrink-0 rounded border border-white/10 px-2 text-xs text-zinc-500">초기화</button>
          </div>

          {/* 배당 · 예상 당첨 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">배당 <span className="font-mono text-[var(--theme-primary,#c9a227)]">×{totalOdds.toFixed(2)}</span></span>
            <span className="text-zinc-400">예상 <span className="font-mono font-semibold text-white">{expected.toLocaleString("ko-KR")}</span></span>
          </div>

          {/* 배팅 버튼 */}
          <button
            type="button"
            disabled={amount <= 0}
            className="w-full rounded-lg bg-[var(--theme-primary,#c9a227)] py-2.5 text-sm font-bold text-black disabled:opacity-30"
          >
            배팅하기
          </button>
        </div>
      )}
    </div>
  );
}

export function BettingCartDock() {
  const { lines } = useBettingCart();
  const [open, setOpen] = useState(false);

  const onEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onEsc]);

  return (
    <>
      {/* ── 데스크톱: fixed right-0 top-12 bottom-0 w-72 ── */}
      <aside
        className="fixed right-0 top-14 bottom-0 z-40 hidden w-72 border-l border-white/8 bg-[#0a0a0e] md:flex"
        aria-label="배팅카트"
      >
        <CartPanel />
      </aside>

      {/* ── 모바일 ── */}
      <div className="md:hidden">
        {/* 오버레이 */}
        {open && (
          <div
            className="fixed inset-0 z-[70] bg-black/50"
            onClick={() => setOpen(false)}
          />
        )}

        {/* 슬라이드업 패널: bottom-14 (탭바 높이 56px 위) */}
        <div
          className={`fixed inset-x-0 bottom-14 z-[80] max-h-[80dvh] overflow-hidden rounded-t-2xl border-t border-x border-white/10 bg-[#0a0a0e] transition-transform duration-300 ${
            open ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* 드래그 핸들 */}
          <button type="button" onClick={() => setOpen(false)} className="flex w-full justify-center py-2">
            <span className="h-1 w-8 rounded-full bg-white/20" />
          </button>
          <div className="h-[75dvh]">
            <CartPanel />
          </div>
        </div>

        {/* 플로팅 버튼 — 탭바(56px) 바로 위 */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="배팅카트"
          className={`fixed bottom-[4.5rem] right-3 z-[65] flex h-12 w-12 items-center justify-center rounded-full border ${
            lines.length > 0
              ? "border-[var(--theme-primary,#c9a227)] bg-[var(--theme-primary,#c9a227)] text-black"
              : "border-white/15 bg-[#0a0a0e] text-zinc-400"
          }`}
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

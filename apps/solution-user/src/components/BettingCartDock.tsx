"use client";

/*
  Desktop: fixed right w-56 (huracan 우측 cart-container 와 동일 역할)
  Mobile: 슬라이드업 + 플로팅 버튼
*/

import { useCallback, useEffect, useState } from "react";
import { useBootstrap } from "./BootstrapProvider";
import { useBettingCart } from "./BettingCartContext";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

const DEFAULT_QUICK_AMOUNTS = [
  10_000,
  50_000,
  100_000,
  300_000,
  500_000,
  1_000_000,
];

function formatQuickAmount(v: number) {
  if (v >= 1_000_000) return `${v / 1_000_000}백만`;
  if (v >= 10_000) return `${v / 10_000}만`;
  return `${v / 1_000}천`;
}

function CartPanel() {
  const { lines, removeLine, clear } = useBettingCart();
  const bootstrap = useBootstrap();
  const [amount, setAmount] = useState(0);
  const slipTemplate = bootstrap?.oddsApi?.betSlipTemplate;
  const title = slipTemplate?.title?.trim() || "배팅카트";
  const subtitle = slipTemplate?.subtitle?.trim() || "실시간 배당 기준";
  const quickAmounts =
    slipTemplate?.quickAmounts && slipTemplate.quickAmounts.length > 0
      ? slipTemplate.quickAmounts
      : DEFAULT_QUICK_AMOUNTS;
  const showBookmakerCount = slipTemplate?.showBookmakerCount !== false;
  const showSourceBookmaker = slipTemplate?.showSourceBookmaker !== false;

  const totalOdds = lines.reduce((a, l) => a * parseFloat(l.odd || "1"), 1);
  const expected = Math.floor(amount * totalOdds);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/8 px-2.5 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold leading-tight">
            {title}
            {lines.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gold-gradient px-1 py-0.5 text-[9px] font-bold text-black">
                {lines.length}
              </span>
            )}
          </span>
          {lines.length > 0 && (
            <button type="button" onClick={clear} className="text-[10px] text-zinc-500">
              비우기
            </button>
          )}
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-zinc-500">{subtitle}</p>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-1.5"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {lines.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-zinc-600">배당을 눌러 담아보세요</p>
        ) : (
          <ul className="space-y-1.5">
            {lines.map((l) => (
              <li
                key={l.id}
                className="flex items-start justify-between gap-1.5 rounded-md border border-white/8 px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] text-zinc-500">{l.matchLabel}</p>
                  <p className="mt-0.5 text-[11px] font-medium leading-snug">{l.pickLabel}</p>
                  {showSourceBookmaker && l.sourceBookmaker ? (
                    <p className="mt-0.5 text-[9px] text-zinc-500">출처 {l.sourceBookmaker}</p>
                  ) : showBookmakerCount && l.bookmakerCount ? (
                    <p className="mt-0.5 text-[9px] text-zinc-500">북 {l.bookmakerCount}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-[11px] text-main-gold">{l.odd}</p>
                  <button
                    type="button"
                    onClick={() => removeLine(l.id)}
                    className="text-[10px] text-zinc-600 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <div className="shrink-0 space-y-1.5 border-t border-white/8 px-2 py-2">
          <div className="grid grid-cols-3 gap-0.5">
            {quickAmounts.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount((p) => p + v)}
                className="rounded border border-white/10 py-1 text-[9px] text-zinc-300"
              >
                {formatQuickAmount(v)}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              placeholder="금액"
              className="min-w-0 flex-1 rounded border border-white/10 bg-transparent px-1.5 py-1 text-right text-[11px] outline-none focus:border-[rgba(218,174,87,0.6)]"
            />
            <button
              type="button"
              onClick={() => setAmount(0)}
              className="shrink-0 rounded border border-white/10 px-1.5 text-[9px] text-zinc-500"
            >
              초기화
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-500">
              배당 <span className="font-mono text-main-gold">×{totalOdds.toFixed(2)}</span>
            </span>
            <span className="text-zinc-400">
              예상{" "}
              <span className="font-mono font-semibold text-white">
                {expected.toLocaleString("ko-KR")}
              </span>
            </span>
          </div>

          <button
            type="button"
            disabled={amount <= 0}
            className="w-full rounded-md bg-gold-gradient py-2 text-[11px] font-bold text-black disabled:opacity-30"
          >
            배팅하기
          </button>
        </div>
      )}
    </div>
  );
}

export function BettingCartDock() {
  const { lines, panelOpen: open, setPanelOpen } = useBettingCart();

  useEffect(() => {
    setPanelOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    },
    [setPanelOpen],
  );

  useEffect(() => {
    if (open) lockScroll();
    else unlockScroll();
    return () => {
      unlockScroll();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onEsc]);

  const close = useCallback(() => setPanelOpen(false), [setPanelOpen]);

  return (
    <>
      <aside
        className="fixed right-0 bottom-0 top-[var(--app-desktop-header)] z-40 hidden w-56 flex-col border-l border-white/8 bg-[#0a0a0e] md:flex"
        aria-label="배팅카트"
      >
        <CartPanel />
      </aside>

      <div className="md:hidden">
        {open && (
          <div
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-[2px]"
            onClick={close}
          />
        )}

        <div
          className={`fixed inset-x-0 bottom-0 z-[95] flex flex-col overflow-hidden rounded-t-2xl
                      border-t border-x border-white/10 bg-[#0a0a0e]
                      transition-transform duration-300 ease-in-out
                      ${open ? "translate-y-0" : "translate-y-full"}`}
          style={{ maxHeight: "92svh" }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
            <button type="button" onClick={close} className="text-sm text-zinc-400">
              ✕ 닫기
            </button>
            <span className="h-1 w-10 rounded-full bg-white/20" />
            <span className="w-12" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <CartPanel />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPanelOpen(!open)}
          aria-label="배팅카트"
          className={`relative fixed bottom-[4.5rem] right-3 z-[65] flex h-12 w-12 items-center justify-center rounded-full border shadow-lg ${
            lines.length > 0
              ? "border-[rgba(218,174,87,0.55)] bg-gold-gradient text-black"
              : "border-white/15 bg-[#0a0a0e] text-zinc-400"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
            />
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

"use client";

import { useCallback, useEffect, useState } from "react";
import { useBettingCart } from "./BettingCartContext";

/**
 * PC: 화면 오른쪽 고정
 * 모바일: 하단 고정 · 항상 탭바 노출 · 펼치면 목록
 */
export function BettingCartDock() {
  const { lines, removeLine, clear } = useBettingCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeOnEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, closeOnEscape]);

  const panelInner = (
    <div className="flex max-h-[min(65vh,480px)] flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <p className="text-xs font-semibold text-zinc-300">배팅카트</p>
        {lines.length > 0 ? (
          <button
            type="button"
            onClick={() => clear()}
            className="text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            비우기
          </button>
        ) : null}
      </div>
      <div className="min-h-[100px] flex-1 overflow-y-auto px-3 py-2 text-xs">
        {lines.length === 0 ? (
          <p className="text-zinc-500">배당을 눌러 담아보세요.</p>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => (
              <li
                key={l.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-white/5 px-2 py-2 ring-1 ring-white/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] text-zinc-400">{l.matchLabel}</p>
                  <p className="mt-0.5 font-medium text-zinc-200">
                    {l.pickLabel}{" "}
                    <span className="font-mono text-[var(--theme-primary,#c9a227)]">
                      @{l.odd}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLine(l.id)}
                  className="shrink-0 text-zinc-500 hover:text-red-300"
                  aria-label="삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-white/10 px-3 py-2">
        <p className="text-[11px] text-zinc-500">선택 {lines.length}건</p>
        <p className="mt-1 font-mono text-sm text-[var(--theme-primary,#c9a227)]">
          데모 · 실제 차감 없음
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="fixed right-3 top-1/2 z-[100] hidden w-[min(18rem,calc(100vw-1.5rem))] -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-md md:block"
        aria-label="배팅카트"
      >
        {panelInner}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-[100] md:hidden">
        <div
          className={`overflow-hidden rounded-t-2xl border border-b-0 border-white/15 bg-zinc-950 shadow-[0_-6px_24px_rgba(0,0,0,0.65)] transition-[max-height] duration-300 ease-out ${
            mobileOpen ? "max-h-[min(72vh,520px)]" : "max-h-[3.25rem]"
          }`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex w-full items-center justify-between bg-zinc-900/95 px-4 py-3 text-left text-sm font-semibold text-zinc-100"
            aria-expanded={mobileOpen}
          >
            <span>
              배팅카트
              {lines.length > 0 ? (
                <span className="ml-2 rounded-full bg-[var(--theme-primary,#c9a227)] px-2 py-0.5 text-xs text-black">
                  {lines.length}
                </span>
              ) : null}
            </span>
            <span className="text-zinc-400">{mobileOpen ? "▼" : "▲"}</span>
          </button>
          {mobileOpen ? <div className="border-t border-white/10">{panelInner}</div> : null}
        </div>
      </div>
    </>
  );
}

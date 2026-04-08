"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * PC: 화면 오른쪽 고정(스크롤해도 뷰포트에 유지)
 * 모바일: 하단 시트 · 접기/펼치기
 */
export function BettingCartDock() {
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
    <div className="flex max-h-[min(70vh,520px)] flex-col">
      <p className="border-b border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300">
        배팅카트
      </p>
      <div className="min-h-[120px] flex-1 overflow-y-auto px-3 py-3 text-xs text-zinc-500">
        선택한 경기가 여기에 쌓입니다. (연동 예정)
      </div>
      <div className="border-t border-white/10 px-3 py-2">
        <p className="text-[11px] text-zinc-500">예상 배당 · 금액</p>
        <p className="mt-1 font-mono text-sm text-[var(--theme-primary,#c9a227)]">₩ 0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* 데스크톱 */}
      <aside
        className="fixed right-3 top-1/2 z-40 hidden w-[min(18rem,calc(100vw-1.5rem))] -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-md md:block"
        aria-label="배팅카트"
      >
        {panelInner}
      </aside>

      {/* 모바일 하단 시트 */}
      <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div
          className={`overflow-hidden rounded-t-2xl border border-white/10 border-b-0 bg-zinc-950/98 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] transition-[max-height] duration-300 ease-out ${
            mobileOpen ? "max-h-[min(70vh,480px)]" : "max-h-12"
          }`}
        >
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-zinc-100"
            aria-expanded={mobileOpen}
          >
            <span>배팅카트</span>
            <span className="text-zinc-500">{mobileOpen ? "▼" : "▲"}</span>
          </button>
          {mobileOpen ? <div className="border-t border-white/10">{panelInner}</div> : null}
        </div>
      </div>
    </>
  );
}

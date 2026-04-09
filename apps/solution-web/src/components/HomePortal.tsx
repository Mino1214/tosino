"use client";

import Link from "next/link";
import { useState } from "react";
import { CasinoPortalCards } from "./CasinoPortalCards";
import { SlotVendorCatalog } from "./SlotVendorCatalog";
import { SportsOddsPreview } from "./SportsOddsPreview";

export type PortalView = "sports" | "casino" | "slot" | "minigame" | "hub";

const TABS: { key: PortalView; label: string; emoji: string }[] = [
  { key: "sports", label: "스포츠", emoji: "⚽" },
  { key: "casino", label: "카지노", emoji: "🎰" },
  { key: "slot", label: "슬롯", emoji: "🎮" },
  { key: "minigame", label: "미니게임", emoji: "🎲" },
];

export type HomePortalProps = {
  view: PortalView;
  onViewChange: (v: PortalView) => void;
};

export function HomePortal({ view, onViewChange }: HomePortalProps) {
  const activeView = view === "hub" ? "sports" : view;

  return (
    <div className="flex flex-col">
      {/* 가로 스크롤 카테고리 탭 */}
      <div className="sticky top-12 z-40 border-b border-white/8 bg-[#0a0a0e]/98 backdrop-blur-md sm:top-14">
        <div className="flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = activeView === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onViewChange(tab.key)}
                className={`relative flex shrink-0 items-center gap-1.5 px-5 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "text-[var(--theme-primary,#c9a227)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span className="text-base">{tab.emoji}</span>
                <span>{tab.label}</span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--theme-primary,#c9a227)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="p-3 sm:p-4">
        {activeView === "sports" && <SportsTabContent />}
        {activeView === "casino" && <CasinoTabContent />}
        {activeView === "slot" && <SlotTabContent />}
        {activeView === "minigame" && <MinigameTabContent />}
      </div>
    </div>
  );
}

/* ── 스포츠 탭 ─────────────────────────────────────────── */
function SportsTabContent() {
  return (
    <div className="space-y-4">
      {/* 스포츠 로비 빠른 진입 */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/lobby/sports-kr"
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-4 text-center transition hover:border-[var(--theme-primary,#c9a227)]/40 hover:bg-white/8"
        >
          <span className="text-2xl">🇰🇷</span>
          <span className="text-xs font-semibold text-zinc-200">국내 스포츠</span>
          <span className="text-[10px] text-zinc-500">입장하기 →</span>
        </Link>
        <Link
          href="/lobby/sports-eu"
          className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-4 text-center transition hover:border-[var(--theme-primary,#c9a227)]/40 hover:bg-white/8"
        >
          <span className="text-2xl">🌍</span>
          <span className="text-xs font-semibold text-zinc-200">유럽 스포츠</span>
          <span className="text-[10px] text-zinc-500">입장하기 →</span>
        </Link>
      </div>

      {/* 실시간 경기 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">실시간 경기</span>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        </div>
        <SportsOddsPreview />
      </div>
    </div>
  );
}

/* ── 카지노 탭 ─────────────────────────────────────────── */
function CasinoTabContent() {
  return (
    <div className="space-y-4">
      <Link
        href="/lobby/live-casino"
        className="flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-amber-950/40 to-transparent px-4 py-4 transition hover:border-[var(--theme-primary,#c9a227)]/40"
      >
        <div>
          <p className="text-sm font-bold text-white">라이브 카지노</p>
          <p className="mt-0.5 text-xs text-zinc-400">Pragmatic · Evolution · BT1</p>
        </div>
        <span className="rounded-lg bg-[var(--theme-primary,#c9a227)] px-3 py-1.5 text-xs font-bold text-black">
          입장 →
        </span>
      </Link>
      <CasinoPortalCards />
    </div>
  );
}

/* ── 슬롯 탭 ───────────────────────────────────────────── */
function SlotTabContent() {
  return (
    <div className="space-y-4">
      <Link
        href="/lobby/slots"
        className="flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-r from-violet-950/40 to-transparent px-4 py-4 transition hover:border-violet-400/30"
      >
        <div>
          <p className="text-sm font-bold text-white">슬롯 게임</p>
          <p className="mt-0.5 text-xs text-zinc-400">CQ9 · Pragmatic · 전체보기</p>
        </div>
        <span className="rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-bold text-white">
          입장 →
        </span>
      </Link>
      <SlotVendorCatalog className="mt-0" />
    </div>
  );
}

/* ── 미니게임 탭 ────────────────────────────────────────── */
function MinigameTabContent() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/3 p-8 text-center">
      <span className="text-4xl">🎲</span>
      <p className="text-sm font-semibold text-zinc-200">미니게임</p>
      <p className="text-xs text-zinc-500">준비 중입니다</p>
      <Link
        href="/lobby/minigame"
        className="mt-2 rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-400 hover:bg-white/5"
      >
        미니게임 로비 →
      </Link>
    </div>
  );
}

"use client";

/*
  ─── HomePortal 규격 ────────────────────────────────
  · CategoryTabs : sticky top-12 (헤더 48px 아래 고정)
                   h-10, 가로 스크롤
  · Content      : 탭에 따라 교체
  ─────────────────────────────────────────────────
*/

import Link from "next/link";
import { CasinoPortalCards } from "./CasinoPortalCards";
import { SlotVendorCatalog } from "./SlotVendorCatalog";
import { SportsOddsPreview } from "./SportsOddsPreview";

export type PortalView = "sports" | "casino" | "slot" | "minigame" | "hub";

const TABS: { key: PortalView; label: string }[] = [
  { key: "sports",   label: "스포츠"   },
  { key: "casino",   label: "카지노"   },
  { key: "slot",     label: "슬롯"     },
  { key: "minigame", label: "미니게임" },
];

export type HomePortalProps = {
  view: PortalView;
  onViewChange: (v: PortalView) => void;
};

export function HomePortal({ view, onViewChange }: HomePortalProps) {
  const active = view === "hub" ? "sports" : view;

  return (
    <div>
      {/* ① 카테고리 탭 — sticky: 헤더(48px) 바로 아래 */}
      <nav
        aria-label="게임 카테고리"
        className="sticky top-12 z-40 flex h-10 overflow-x-auto border-b border-white/8 bg-[#0a0a0e] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onViewChange(tab.key)}
            className={`relative flex h-full shrink-0 items-center px-5 text-sm font-medium transition-colors ${
              active === tab.key
                ? "text-[var(--theme-primary,#c9a227)]"
                : "text-zinc-500"
            }`}
          >
            {tab.label}
            {active === tab.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--theme-primary,#c9a227)]" />
            )}
          </button>
        ))}
      </nav>

      {/* ② 탭 콘텐츠 */}
      <div className="p-3 sm:p-4">
        {active === "sports"   && <SportsContent />}
        {active === "casino"   && <CasinoContent />}
        {active === "slot"     && <SlotContent />}
        {active === "minigame" && <MinigameContent />}
      </div>
    </div>
  );
}

/* ── 스포츠 ── */
function SportsContent() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Link href="/lobby/sports-kr" className="flex items-center justify-center rounded-lg border border-white/10 py-4 text-sm font-semibold text-white">
          국내 스포츠
        </Link>
        <Link href="/lobby/sports-eu" className="flex items-center justify-center rounded-lg border border-white/10 py-4 text-sm font-semibold text-zinc-300">
          유럽 스포츠
        </Link>
      </div>
      <SportsOddsPreview />
    </div>
  );
}

/* ── 카지노 ── */
function CasinoContent() {
  return (
    <div className="space-y-3">
      <Link href="/lobby/live-casino" className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-4">
        <span className="text-sm font-semibold text-white">라이브 카지노</span>
        <span className="text-xs text-[var(--theme-primary,#c9a227)]">입장 →</span>
      </Link>
      <CasinoPortalCards />
    </div>
  );
}

/* ── 슬롯 ── */
function SlotContent() {
  return (
    <div className="space-y-3">
      <Link href="/lobby/slots" className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-4">
        <span className="text-sm font-semibold text-white">슬롯 게임</span>
        <span className="text-xs text-violet-400">입장 →</span>
      </Link>
      <SlotVendorCatalog className="mt-0" />
    </div>
  );
}

/* ── 미니게임 ── */
function MinigameContent() {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-white/10">
      <Link href="/lobby/minigame" className="text-sm text-zinc-400">미니게임 로비 →</Link>
    </div>
  );
}

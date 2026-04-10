"use client";

/*
  ─── AppShell ────────────────────────────────────────────────────
  · SiteHeader, MobileDrawer, BottomNav 를 하나로 묶어
    드로어 open 상태를 공유
  · 홈(/)에서 헤더 투명 → <main> pt-0 (콘텐츠가 헤더 뒤로 들어감)
  · 다른 페이지   → <main> pt-12 md:pt-[6.5rem] (데스크톱 헤더 h-14+h-12)
  ─────────────────────────────────────────────────────────────────
*/

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "./SiteHeader";
import { MobileDrawer } from "./MobileDrawer";
import { BottomNav } from "./BottomNav";
import { BettingCartProvider } from "./BettingCartContext";
import { BettingCartDock } from "./BettingCartDock";
import { BettingHistoryPanel } from "./BettingHistoryPanel";
import { AppModalsProvider } from "@/contexts/AppModalsContext";
import { AppModalsRoot } from "@/components/modals/AppModalsRoot";

/* 배팅카트가 표시되는 스포츠 관련 경로들 */
const SPORTS_PATHS = [
  "/lobby/sports-kr",
  "/lobby/prematch",
  "/lobby/live",
  "/lobby/esports",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isHome      = pathname === "/";
  const isSports    = SPORTS_PATHS.some((p) => pathname.startsWith(p));

  return (
    <BettingCartProvider>
      <AppModalsProvider>
      {/* 헤더 */}
      <SiteHeader onDrawerOpen={() => setDrawerOpen(true)} />

      {/* 모바일 드로어 */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 메인 콘텐츠
          · 모바일: 높이 100svh + 하단 safe까지 pb — 스크롤은 main 내부만 (탭바는 고정)
          · 홈: pt-0 / 그 외: pt-12 · md: pt-[6.5rem]
          · 스포츠 데스크톱: 우측 배팅카트 mr-72
      */}
      <main
        className={[
          "max-md:app-main-mobile-scroll max-md:box-border",
          "max-md:pb-[calc(var(--app-mobile-nav)+env(safe-area-inset-bottom,0px))]",
          "md:overflow-visible md:pb-0",
          isHome ? "" : "pt-12 md:pt-[6.5rem]",
          isSports ? "md:mr-72" : "",
        ].join(" ")}
      >
        {children}
      </main>

      {/* 스포츠 전용 배팅카트 (데스크톱: 우측 고정 패널 / 모바일: 슬라이드업) */}
      {isSports && <BettingCartDock />}

      {/* 배팅내역 슬라이드업 패널 (모바일 전용) */}
      <BettingHistoryPanel />

      {/* 하단 탭바 */}
      <BottomNav />

      <AppModalsRoot />
      </AppModalsProvider>
    </BettingCartProvider>
  );
}

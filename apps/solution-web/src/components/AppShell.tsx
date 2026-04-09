"use client";

/*
  ─── AppShell ────────────────────────────────────────────────────
  · SiteHeader, MobileDrawer, BottomNav 를 하나로 묶어
    드로어 open 상태를 공유
  · 홈(/)에서 헤더 투명 → <main> pt-0 (콘텐츠가 헤더 뒤로 들어감)
  · 다른 페이지   → <main> pt-12 md:pt-[5.5rem]
  ─────────────────────────────────────────────────────────────────
*/

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "./SiteHeader";
import { MobileDrawer } from "./MobileDrawer";
import { BottomNav } from "./BottomNav";
import { BettingCartProvider } from "./BettingCartContext";
import { BettingCartDock } from "./BettingCartDock";

/* 배팅카트가 표시되는 스포츠 관련 경로들 */
const SPORTS_PATHS = [
  "/lobby/sports-kr",
  "/lobby/prematch",
  "/lobby/live",
  "/lobby/sportsbook",
  "/lobby/esports",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isHome      = pathname === "/";
  const isSports    = SPORTS_PATHS.some((p) => pathname.startsWith(p));

  return (
    <BettingCartProvider>
      {/* 헤더 */}
      <SiteHeader onDrawerOpen={() => setDrawerOpen(true)} />

      {/* 모바일 드로어 */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 메인 콘텐츠
          · 홈: pt-0 (투명 헤더가 콘텐츠 위에 float)
          · 기타: pt-12 (mobile h-12) / pt-[5.5rem] (desktop h-10+h-12)
          · 스포츠 데스크톱: 우측에 배팅카트 패널 공간(mr-80) 확보
      */}
      <main
        className={[
          "pb-14 md:pb-0",
          isHome ? "" : "pt-12 md:pt-[5.5rem]",
          isSports ? "md:mr-72" : "",
        ].join(" ")}
      >
        {children}
      </main>

      {/* 스포츠 전용 배팅카트 (데스크톱: 우측 고정 패널 / 모바일: 슬라이드업) */}
      {isSports && <BettingCartDock />}

      {/* 하단 탭바 */}
      <BottomNav />
    </BettingCartProvider>
  );
}

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <BettingCartProvider>
      {/* 헤더 */}
      <SiteHeader onDrawerOpen={() => setDrawerOpen(true)} />

      {/* 모바일 드로어 */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 메인 콘텐츠
          · 홈: pt-0 (투명 헤더가 콘텐츠 위에 float)
          · 기타: pt-12 (mobile h-12) / pt-[5.5rem] (desktop h-10+h-12)
      */}
      <main className={`pb-14 md:pb-0 ${isHome ? "" : "pt-12 md:pt-[5.5rem]"}`}>
        {children}
      </main>

      {/* 하단 탭바 */}
      <BottomNav />
    </BettingCartProvider>
  );
}

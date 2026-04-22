"use client";

/*
  ─── AppShell ────────────────────────────────────────────────────
  · 스포츠 데스크톱: 우측 배팅카트 w-56 고정 — main 은 md:mr-56 (huracan prematch 레이아웃과 동일 개념)
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
import { isSportsBettingPath } from "@/lib/sports-lobby-path";
import { MandatoryAnnouncementGate } from "@/components/MandatoryAnnouncementGate";
import { AuthRequiredGate } from "@/components/AuthRequiredGate";
import { isUserOnlyRoute } from "@/lib/protected-routes";
import { HomeQuickAction } from "@/components/HomeQuickAction";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isSports = isSportsBettingPath(pathname);
  const isUserOnly = isUserOnlyRoute(pathname);

  return (
    <BettingCartProvider>
      <AppModalsProvider>
        <MandatoryAnnouncementGate />
        <SiteHeader onDrawerOpen={() => setDrawerOpen(true)} />
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        <main
          className={[
            "max-md:box-border",
            "max-md:pb-[var(--app-mobile-nav-total)]",
            isHome
              ? "max-md:h-[100svh] max-md:max-h-[100svh] max-md:overflow-hidden max-md:overscroll-none"
              : "max-md:app-main-mobile-scroll",
            "md:overflow-visible md:pb-0",
            isHome ? "" : "pt-[var(--app-mobile-header)] md:pt-[var(--app-desktop-header)]",
            isSports ? "md:mr-56" : "",
          ].join(" ")}
        >
          {isUserOnly ? <AuthRequiredGate>{children}</AuthRequiredGate> : children}
        </main>

        {isSports && <BettingCartDock />}
        <BettingHistoryPanel />
        <BottomNav />
        {isHome && <HomeQuickAction />}
        <AppModalsRoot />
      </AppModalsProvider>
    </BettingCartProvider>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BootstrapProvider } from "@/components/BootstrapProvider";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { GameIframeModalProvider } from "@/components/GameIframeModal";
import { AppShell } from "@/components/AppShell";
import { PreviewRibbon } from "@/components/PreviewRibbon";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solution",
  description: "화이트라벨 솔루션",
};

export const dynamic = "force-static";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/*
        ─── 헤더 높이 규격 ─────────────────────────────────────
        Desktop (md+): SiteHeader 단일 행 h-20 → main pt-20

        홈(/) 모바일: main pt-0 (히어로가 헤더 뒤부터)
        그 외: pt-20 (모바일·데스크톱 공통 헤더 높이)

        BottomNav: h-14 (56px), mobile only → pb-14
        ─────────────────────────────────────────────────────
      */}
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
        <PreviewRibbon />
        <BootstrapProvider host="localhost">
          <GameIframeModalProvider>
            <AnnouncementModal />
            <AppShell>{children}</AppShell>
          </GameIframeModalProvider>
        </BootstrapProvider>
      </body>
    </html>
  );
}

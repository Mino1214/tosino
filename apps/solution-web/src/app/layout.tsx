import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BootstrapProvider } from "@/components/BootstrapProvider";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { GameIframeModalProvider } from "@/components/GameIframeModal";
import { SiteHeader } from "@/components/SiteHeader";
import { BottomNav } from "@/components/BottomNav";
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
        ─── 전체 레이아웃 규격 ─────────────────────────────────────────
        SiteHeader (fixed):
          · Desktop (md+): h-14 (56px)  — 로고 + nav + 유저영역 한 줄
          · Mobile       : h-12 (48px) + h-10 (40px) nav = h-[5.5rem] (88px)

        <main>:
          · pt-[5.5rem] md:pt-14   ← 헤더 높이 맞춤
          · pb-14 md:pb-0          ← 모바일 BottomNav 여백
          · md:mr-72               ← 데스크톱 CartDock 여백

        BottomNav (fixed bottom-0, h-14, mobile only):
        CartDock   (fixed right-0 top-14 bottom-0 w-72, desktop only):
        ──────────────────────────────────────────────────────────────
      */}
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}>
        <PreviewRibbon />
        <BootstrapProvider host="localhost">
          <GameIframeModalProvider>
            <AnnouncementModal />

            {/* ① 헤더 (고정) */}
            <SiteHeader />

            {/* ② 콘텐츠 */}
            <main className="pt-[5.5rem] pb-14 md:pt-14 md:pb-0">
              {children}
            </main>

            {/* ③ 모바일 하단 탭바 */}
            <BottomNav />
          </GameIframeModalProvider>
        </BootstrapProvider>
      </body>
    </html>
  );
}

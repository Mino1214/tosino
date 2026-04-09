import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BootstrapProvider } from "@/components/BootstrapProvider";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { GameIframeModalProvider } from "@/components/GameIframeModal";
import { SiteHeader } from "@/components/SiteHeader";
import { BottomNav } from "@/components/BottomNav";
import { PreviewRibbon } from "@/components/PreviewRibbon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solution",
  description: "화이트라벨 솔루션",
};

export const dynamic = "force-static";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      {/*
        ─── 전체 레이아웃 규격 ────────────────────────────────────
        · SiteHeader  : fixed top-0,  h-12 (48px)
        · BottomNav   : fixed bottom-0, h-14 (56px), mobile only
        · CartPanel   : fixed right-0, top-12, w-72, desktop only
        · <main>      : pt-12  — 헤더 높이만큼 밀고
                        pb-14 md:pb-0  — 모바일 하단 탭 여백
                        md:mr-72       — 데스크톱 카트 패널 여백
        ──────────────────────────────────────────────────────── */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
      >
        <PreviewRibbon />
        <BootstrapProvider host="localhost">
          <GameIframeModalProvider>
            <AnnouncementModal />

            {/* ① 고정 헤더 */}
            <SiteHeader />

            {/* ② 스크롤 콘텐츠 영역 */}
            <main className="pt-12 pb-14 md:pb-0 md:mr-72">
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

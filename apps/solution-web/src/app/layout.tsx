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
        Desktop:
          Row1 (유저영역): h-10 (40px) — 스포츠 페이지에서 스크롤시 숨김
          Row2 (Nav)     : h-12 (48px)
          Total          : h-[5.5rem] (88px) → pt-[5.5rem]

        홈(/)에서는 헤더 투명이므로 pt-0 (콘텐츠가 헤더 뒤부터)

        Mobile:
          단일 row: h-12 (48px) → pt-12

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

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
  const host = "localhost";

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <PreviewRibbon />
        <BootstrapProvider host={host}>
          <GameIframeModalProvider>
            <AnnouncementModal />
            <SiteHeader />
            {/* 모바일 하단 탭 여백 */}
            <main className="pb-14 md:pb-0">
              {children}
            </main>
            <BottomNav />
          </GameIframeModalProvider>
        </BootstrapProvider>
      </body>
    </html>
  );
}

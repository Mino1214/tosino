import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { BootstrapProvider } from "@/components/BootstrapProvider";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import { SiteHeader } from "@/components/SiteHeader";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const forwarded = h.get("x-forwarded-host");
  const rawHost =
    (forwarded?.split(",")[0]?.trim() ?? h.get("host")) || "localhost";
  const host = rawHost.split(":")[0];

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <PreviewRibbon />
        <BootstrapProvider host={host}>
          <AnnouncementModal />
          <SiteHeader />
          {children}
        </BootstrapProvider>
      </body>
    </html>
  );
}

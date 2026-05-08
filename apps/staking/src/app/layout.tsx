import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import { BrowserLanguageTranslator } from "@/components/browser-language-translator";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Web3Provider } from "@/components/web3-provider";
import { resolveLocaleFromAcceptLanguage } from "@/lib/browser-i18n";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const description =
  "거래소, DeFi, 지갑 스테이킹 수익률을 비교하고 지갑 기반 자산 리포트를 확인하는 비수탁 데이터 플랫폼입니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description,
  icons: {
    icon: [{ url: "/favicon.ico" }],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description,
    images: [{ url: absoluteUrl("/coin_image/network/erc20/USDT.svg"), alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf6f1" }],
  width: "device-width",
  initialScale: 1,
};

async function getHeaderUser() {
  try {
    const session = await getCurrentSession();
    if (!session) return null;
    return await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, walletAddress: true },
    });
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = resolveLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));
  const user = await getHeaderUser();

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <Web3Provider cookies={requestHeaders.get("cookie")}>
          <BrowserLanguageTranslator initialLocale={locale} />
          <SiteHeader user={user} />
          <main className="relative z-0 flex-1">{children}</main>
          <SiteFooter />
        </Web3Provider>
      </body>
    </html>
  );
}

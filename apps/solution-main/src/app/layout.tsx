import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Sora } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, contactEmail } from "@/lib/site";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const titleDefault = `${SITE_NAME} | B2B 엔터테인먼트 플랫폼 엔지니어링`;
const description =
  "토지노 솔루션은 스포츠 엔터테인먼트, 카지노 시스템, 총판·제휴, 결제, CRM 및 운영을 위한 엔터프라이즈급 소프트웨어를 제공합니다. 개발·인프라·지속 지원으로 사업자와 투자자를 돕습니다. 저희는 소비자 대상 게임 사이트를 직접 운영하지 않습니다.";

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: titleDefault,
    template: `%s | ${SITE_NAME}`,
  },
  description,
  keywords: [
    "B2B 게이밍 플랫폼",
    "스포츠북 개발",
    "카지노 플랫폼",
    "총판 시스템",
    "제휴 시스템",
    "화이트라벨",
    "게이밍 CRM",
    "결제 연동",
    "리스크 관리",
    "엔터테인먼트 API",
    "Tozino Solution",
    "토지노 솔루션",
    "tozinosolution.com",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: titleDefault,
    description,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: `${SITE_NAME} 로고` }],
  },
  twitter: {
    card: "summary_large_image",
    title: titleDefault,
    description,
    images: ["/logo.png"],
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
  other: {
    contact: contactEmail,
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#050505" }],
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-static";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-[#050505] font-sans antialiased">
        <JsonLd />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-slate-950"
        >
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}

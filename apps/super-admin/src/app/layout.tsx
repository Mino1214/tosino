import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AdminShell } from "@/components/AdminShell";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Super Admin",
  description: "솔루션 본사 통합 콘솔",
};

export const dynamic = "force-static";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* anti-flash: 렌더 전 테마 클래스 주입 */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme')||'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AdminShell>{children}</AdminShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

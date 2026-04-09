"use client";

/*
  ─── BottomNav 규격 ──────────────────────────────
  · position : fixed bottom-0 left-0 right-0
  · height   : h-14 (56px)  — layout.tsx pb-14 / BettingCartDock bottom-14 와 맞춤
  · display  : flex, 5 items, 균등 분배
  · visibility: md:hidden (데스크톱에서 숨김)
  ─────────────────────────────────────────────────
*/

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",                label: "홈",    match: (p: string) => p === "/" },
  { href: "/lobby/sports-kr", label: "스포츠", match: (p: string) => p.startsWith("/lobby/sports") },
  { href: "/lobby/live-casino", label: "카지노", match: (p: string) => p.startsWith("/lobby/live-casino") },
  { href: "/lobby/slots",     label: "슬롯",   match: (p: string) => p.startsWith("/lobby/slots") },
  { href: "/wallet",          label: "충전",   match: (p: string) => p.startsWith("/wallet") },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 h-14 border-t border-white/8 bg-[#0a0a0e] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-full">
        {NAV.map(({ href, label, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? "text-[var(--theme-primary,#c9a227)]" : "text-zinc-500"
              }`}
            >
              {/* 활성 탭 상단 인디케이터 */}
              <span className={`mb-0.5 h-0.5 w-5 rounded-full ${active ? "bg-[var(--theme-primary,#c9a227)]" : "bg-transparent"}`} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

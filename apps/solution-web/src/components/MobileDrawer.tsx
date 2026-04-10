"use client";

/*
  ─── MobileDrawer 규격 ──────────────────────────────────────────
  · 좌측에서 슬라이드인 (translate-x-0 ↔ -translate-x-full)
  · 배경 오버레이 클릭시 닫힘
  · 너비: w-64 (256px)
  ─────────────────────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useBootstrap } from "./BootstrapProvider";

const DRAWER_NAV = [
  { label: "스포츠",    href: "/lobby/sports-kr",   icon: "⚽" },
  { label: "프리매치",  href: "/lobby/prematch",     icon: "📅" },
  { label: "인플레이",  href: "/lobby/inplay",       icon: "🔴" },
  { label: "스포츠북",  href: "/lobby/sportsbook",   icon: "📖" },
  { label: "e스포츠",  href: "/lobby/esports",      icon: "🎮" },
  { label: "카지노",    href: "/lobby/live-casino",  icon: "🎰" },
  { label: "슬롯",      href: "/lobby/slots",        icon: "🎲" },
  { label: "미니게임",  href: "/lobby/minigame",     icon: "🕹️" },
  { label: "마이페이지",href: "/mypage",             icon: "👤" },
  { label: "이벤트",    href: "/mypage#event1",      icon: "🎁" },
  { label: "배팅내역",  href: "/mypage#bets",        icon: "📋" },
  { label: "고객센터",  href: "https://t.me/nimo7788", icon: "💬" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const b = useBootstrap();

  /* 열릴 때 스크롤 잠금 */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* 오버레이 */}
      <div
        className={`fixed inset-0 z-[110] bg-black/60 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 드로어 패널 */}
      <div
        className={`fixed inset-y-0 left-0 z-[120] w-64 bg-[#0d0d14] transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 상단 로고 영역 */}
        <div className="flex h-14 items-center justify-between border-b border-white/8 px-4">
          <Link href="/" onClick={onClose} className="flex min-w-0 items-center">
            <Image
              src="/main/logo.png"
              alt={b?.theme.siteName ?? "홈"}
              width={120}
              height={36}
              className="h-7 w-auto max-w-[160px] object-contain"
            />
          </Link>
          <button type="button" onClick={onClose} className="text-zinc-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 메뉴 목록 */}
        <nav className="overflow-y-auto py-2">
          {DRAWER_NAV.map((item) => {
            const active = item.href.startsWith("/lobby") && pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex h-12 items-center gap-3 px-5 text-sm transition-colors ${
                  active
                    ? "bg-white/5 text-main-gold"
                    : "text-zinc-300 hover:bg-white/5"
                }`}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

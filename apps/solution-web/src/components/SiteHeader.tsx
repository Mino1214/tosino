"use client";

/*
  ─── SiteHeader 규격 ──────────────────────────────────────────────
  Desktop (md+):
    · 홈(/) : 배경 투명 → 스크롤 시 반투명
    · 그 외 : 배경 #0a0a0e
    · 단일 행 h-20: 로고(좌) | 카지노·슬롯·미니게임·마이페이지(중앙) | 유저 영역(우)
    · 스포츠: 스크롤 시 우측 유저 블록만 접힘 (로고·탭 유지)

  Mobile:
    · 단일 행 h-20: [☰] [로고] [알림] [프로필] — 메인 이동은 사이드바(MobileDrawer)
  ─────────────────────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBootstrap } from "./BootstrapProvider";
import { apiFetch, getAccessToken, clearSession } from "@/lib/api";
import { useBettingCart } from "./BettingCartContext";
import { useAppModals } from "@/contexts/AppModalsContext";
import { isSportsBettingPath } from "@/lib/sports-lobby-path";

const NAV_ITEMS = [
  // { label: "스포츠",   href: "/lobby/sports-kr"  },
  // { label: "프리매치", href: "/lobby/prematch"    },
  // { label: "인플레이", href: "/lobby/live"         },
  // { label: "스포츠북", href: "/lobby/sportsbook"  },
  // { label: "e스포츠",  href: "/lobby/esports"    },
  { label: "카지노",   href: "/lobby/live-casino" },
  { label: "슬롯",     href: "/lobby/slots"       },
  { label: "미니게임", href: "/lobby/minigame"    },
  { label: "마이페이지", href: "/mypage"          },
];

export function SiteHeader({ onDrawerOpen }: { onDrawerOpen?: () => void }) {
  const b = useBootstrap();
  const router = useRouter();
  const pathname = usePathname();
  const { setHistoryOpen } = useBettingCart();
  const { openLogin, openSignup, openWallet } = useAppModals();
  const [logged, setLogged] = useState(false);
  const [money, setMoney] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [row1Hidden, setRow1Hidden] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === "/";
  const isSportPage = isSportsBettingPath(pathname);

  useEffect(() => {
    const ok = !!getAccessToken();
    setLogged(ok);
    if (ok) {
      void apiFetch<{ balance: string }>("/me/wallet")
        .then((w) => setMoney(Number(w.balance)))
        .catch(() => null);
    } else {
      setMoney(null);
    }
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
      if (isSportPage) setRow1Hidden(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isSportPage]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function logout() {
    clearSession();
    setLogged(false);
    setMoney(null);
    router.push("/");
  }

  if (!b) return null;

  /* 배경 클래스 */
  const bgClass = isHome
    ? scrolled
      ? "bg-[#0a0a0e]/80 backdrop-blur-md"
      : "bg-transparent"
    : "bg-[#0a0a0e]";

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${bgClass}`}>

      {/* ════════════════════════════════════════════════════
          DESKTOP — 단일 행 (로고 | 네비 | 유저)
          ════════════════════════════════════════════════════ */}
      <div className="relative hidden h-20 items-center border-b border-[rgba(218,174,87,0.12)] px-4 lg:px-6 md:flex">
        <Link href="/" className="relative z-20 shrink-0 py-1">
          <Image
            src="/main/logo.png"
            alt={b.theme.siteName}
            width={880}
            height={256}
            className="h-11 w-auto max-w-[min(32vw,220px)] object-contain lg:h-12 lg:max-w-[min(36vw,280px)]"
            priority
          />
        </Link>

        {/* 중앙 네비 */}
        <nav
          aria-label="메인 메뉴"
          className="absolute left-1/2 top-1/2 z-20 flex max-w-[min(52vw,28rem)] -translate-x-1/2 -translate-y-1/2 gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:gap-1 [&::-webkit-scrollbar]:hidden"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href) && item.href !== "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex shrink-0 items-center whitespace-nowrap px-2.5 transition-colors sm:px-3 ${
                  isHome ? "text-[0.9375rem] font-semibold leading-tight" : "text-sm font-medium"
                } ${
                  isHome
                    ? active
                      ? "text-main-gold drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]"
                      : "text-[#f0e6c8] drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)] hover:text-main-gold-solid"
                    : active
                      ? "text-main-gold"
                      : "text-zinc-300 hover:text-main-gold-solid"
                }`}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-1 bottom-0.5 h-0.5 rounded-full sm:inset-x-2"
                    style={{
                      background: "var(--gold-gradient)",
                      boxShadow: "0 0 8px rgba(218,174,87,0.5)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div
          className={`relative z-20 ml-auto flex min-w-0 justify-end transition-all duration-300 ${
            row1Hidden
              ? "pointer-events-none max-w-0 overflow-hidden opacity-0"
              : "max-w-[min(48vw,520px)] opacity-100 lg:max-w-none"
          }`}
        >
          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs text-zinc-500 lg:gap-x-3">
            {/* 고객센터 */}
            <a href="https://t.me/nimo7788" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 hover:text-white">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              고객센터
            </a>

            <div className="h-3 w-px bg-white/15" />

            {/* 알림 */}
            <button type="button" className="relative hover:text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
                <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">4</span>
            </button>

            {logged ? (
              <>
                {/* 프로필 아이콘 + 닉네임 */}
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px]">👤</div>
                  <span className="text-zinc-300">회원</span>
                </div>

                <div className="h-3 w-px bg-white/15" />

                {/* 잔액 */}
                <span className="text-zinc-400">MONEY <span className="font-mono font-bold text-main-gold">{money?.toLocaleString("ko-KR") ?? "—"}</span> ₩</span>

                {/* 포인트 */}
                <span>POINT <span className="font-mono font-bold text-pink-400">0</span> ₱</span>

                <div className="h-3 w-px bg-white/15" />

                <button type="button" className="hover:text-white">포인트전환</button>
                <button type="button" onClick={() => openWallet({ fiatTab: "DEPOSIT" })} className="rounded bg-gold-gradient px-2 py-0.5 text-xs font-bold transition-opacity hover:opacity-90">입금하기</button>
                <button type="button" onClick={() => openWallet({ fiatTab: "WITHDRAWAL" })} className="rounded border border-white/20 px-2 py-0.5 text-zinc-300 hover:text-white">출금하기</button>
                <button type="button" onClick={logout} className="hover:text-white">로그아웃</button>

                <div className="h-3 w-px bg-white/15" />

                {/* 마이페이지 · 배팅내역 — 시그니처 컬러 */}
                <Link
                  href="/mypage"
                  className="font-semibold text-main-gold hover:opacity-80 transition-opacity"
                >
                  마이페이지
                </Link>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="font-semibold text-main-gold hover:opacity-80 transition-opacity"
                >
                  배팅내역
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => openLogin()} className="rounded bg-gold-gradient px-2.5 py-0.5 text-xs font-bold transition-opacity hover:opacity-90">로그인</button>
                <button type="button" onClick={() => openSignup()} className="rounded border border-white/20 px-2.5 py-0.5 text-zinc-300 hover:text-main-gold-solid">회원가입</button>

                <div className="h-3 w-px bg-white/15" />

                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="font-semibold text-main-gold hover:opacity-80 transition-opacity"
                >
                  배팅내역
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE HEADER (단일 행)
          ════════════════════════════════════════════════════ */}
      <div className="relative flex h-20 items-center justify-between px-3 md:hidden">
        {/* 좌: 드로어 햄버거 */}
        <button
          type="button"
          onClick={onDrawerOpen}
          className="flex h-9 w-9 items-center justify-center text-main-gold-solid"
          aria-label="메뉴"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* 중앙: 로고 */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <Image
            src="/main/logo.png"
            alt={b.theme.siteName}
            width={300}
            height={90}
            className="h-[4.375rem] w-auto max-w-[min(88vw,350px)] object-contain"
            priority
          />
        </Link>

        {/* 우: 알림 + 프로필 */}
        <div className="flex items-center gap-2" ref={profileRef}>
          <button type="button" className="relative flex h-9 w-9 items-center justify-center text-zinc-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* 프로필 버튼 — 클릭 시 마이페이지로 직접 이동 */}
          <Link
            href="/mypage"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            aria-label="마이페이지"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

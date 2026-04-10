"use client";

/*
  ─── SiteHeader 규격 ──────────────────────────────────────────────
  Desktop:
    · 홈(/)        : 배경 투명, 스크롤 내리면 반투명 처리
    · 다른 페이지   : 배경 불투명 (#0a0a0e)
    · Row 1 (h-14) : 로고(좌·크게) | 고객센터·알림·잔액·입출금·로그인 등(우)
    · Row 2 (h-12) : 스포츠 · 카지노 · 슬롯 · 미니게임 · 마이페이지
    · 스포츠 페이지: 스크롤 시 Row1 우측 유저 줄만 숨김 (로고 유지)
    Total desktop: h-[6.5rem] (104px)

  Mobile:
    · 단일 row (h-12): [☰드로어] [로고(center)] [🔔알림] [👤프로필]
    · 프로필 드롭다운: 대시보드, 출석체크, 이벤트1, 이벤트2, 고객센터, 배팅내역
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

const NAV_ITEMS = [
  { label: "스포츠",   href: "/lobby/sports-kr"  },
  // { label: "프리매치", href: "/lobby/prematch"    },
  // { label: "인플레이", href: "/lobby/live"         },
  // { label: "스포츠북", href: "/lobby/sportsbook"  },
  // { label: "e스포츠",  href: "/lobby/esports"    },
  { label: "카지노",   href: "/lobby/live-casino" },
  { label: "슬롯",     href: "/lobby/slots"       },
  { label: "미니게임", href: "/lobby/minigame"    },
  { label: "마이페이지", href: "/mypage"          },
];

/* 스크롤하면 Row1이 숨는 페이지 */
const SPORT_PATHS = ["/lobby/sports", "/lobby/prematch", "/lobby/live", "/lobby/esports"];

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
  const isSportPage = SPORT_PATHS.some((p) => pathname.startsWith(p));

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
          DESKTOP HEADER
          ════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {/* Row 1: 로고(좌) + 유저 영역(우) — 스포츠 페이지 스크롤 시 유저 줄만 접힘 */}
        <div className="flex h-14 items-center justify-between gap-4 border-b border-[rgba(218,174,87,0.12)] px-6">
          <Link href="/" className="shrink-0 py-1">
            <Image
              src="/main/logo.png"
              alt={b.theme.siteName}
              width={220}
              height={64}
              className="h-10 w-auto max-w-[min(42vw,240px)] object-contain md:h-11"
              priority
            />
          </Link>
          <div
            className={`min-w-0 flex-1 transition-all duration-300 ${
              row1Hidden
                ? "pointer-events-none max-h-0 overflow-hidden opacity-0"
                : "max-h-20 opacity-100"
            }`}
          >
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-zinc-500">
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

        {/* Row 2: 메인 Nav */}
        <div className="flex h-12 items-center justify-center px-6">
          <div className="flex min-w-0 max-w-full justify-center gap-0.5 overflow-x-auto sm:gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href) && item.href !== "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex h-12 shrink-0 items-center px-3 text-sm transition-colors sm:px-4 ${
                  active
                    ? "text-main-gold"
                    : "text-zinc-300 hover:text-main-gold-solid"
                }`}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                    style={{
                      background: "var(--gold-gradient)",
                      boxShadow: "0 0 8px rgba(218,174,87,0.5)",
                    }}
                  />
                )}
              </Link>
            );
          })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE HEADER (단일 행)
          ════════════════════════════════════════════════════ */}
      <div className="flex h-12 items-center justify-between px-3 md:hidden">
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
            width={120}
            height={36}
            className="h-7 w-auto max-w-[min(42vw,140px)] object-contain"
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

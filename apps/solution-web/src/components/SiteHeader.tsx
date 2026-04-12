"use client";

/*
  ─── SiteHeader 규격 ──────────────────────────────────────────────
  Desktop (md+):
    · 홈(/) : 배경 투명 → 스크롤 시 반투명
    · 그 외 : 배경 #0a0a0e
    · 단일 행 h-20: 로고(좌, px 고정) | 네비(중앙) | 유저(우)
    · 스포츠: 스크롤 시 우측 유저 블록만 접힘 (로고·탭 유지)

  Mobile:
    · 단일 행 h-20: [☰] [로고] [알림] [프로필] — 메인 이동은 사이드바(MobileDrawer)
  ─────────────────────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBootstrap } from "./BootstrapProvider";
import {
  apiFetch,
  getAccessToken,
  clearSession,
  subscribeAuthChange,
} from "@/lib/api";
import { useBettingCart } from "./BettingCartContext";
import { useAppModals } from "@/contexts/AppModalsContext";
import { isSportsBettingPath } from "@/lib/sports-lobby-path";
import { publicAsset } from "@/lib/public-asset";

const NAV_ITEMS = [
  { label: "스포츠", href: "/lobby/sports-kr" },
  { label: "프리매치", href: "/lobby/prematch" },
  { label: "인플레이", href: "/lobby/live" },
  { label: "카지노", href: "/lobby/live-casino" },
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

  const isHome = pathname === "/";
  const isSportPage = isSportsBettingPath(pathname);

  useEffect(() => {
    let alive = true;

    async function refreshAuthUi() {
      const ok = !!getAccessToken();
      if (!alive) return;
      setLogged(ok);

      if (!ok) {
        setMoney(null);
        return;
      }

      try {
        const w = await apiFetch<{ balance: string }>("/me/wallet");
        if (!alive) return;
        setMoney(Number(w.balance));
      } catch {
        if (!alive) return;
        setMoney(null);
      }
    }

    void refreshAuthUi();
    const unsubscribe = subscribeAuthChange(() => {
      void refreshAuthUi();
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
      if (isSportPage) setRow1Hidden(window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isSportPage]);

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
      <div className="relative hidden h-20 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-[rgba(218,174,87,0.12)] px-4 lg:gap-5 lg:px-6 md:grid">
        {/* 좌: 로고 전용 열 — 가운데 absolute 네비와 겹치지 않게 전체가 보이게 */}
        <Link
          href="/"
          aria-label="홈"
          className="inline-flex min-w-0 shrink-0 items-center py-1 leading-none"
        >
          <Image
            src={publicAsset("/main/logo.webp")}
            alt=""
            width={880}
            height={256}
            sizes="(max-width: 767px) 200px, 360px"
            className="site-header-logo-img site-header-logo-img--left"
            priority
          />
        </Link>

        {/* 중앙 네비 — 중간 열 안에서만 가로 스크롤, 로고 위에 덮지 않음 */}
        <nav
          aria-label="메인 메뉴"
          className="justify-self-center flex min-w-0 justify-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href) && item.href !== "/";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex shrink-0 items-center whitespace-nowrap px-2.5 text-[0.9375rem] font-semibold leading-tight transition-colors sm:px-3 ${
                  active
                    ? "text-main-gold drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]"
                    : "text-[#f0e6c8] drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)] hover:text-main-gold-solid"
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
          className={`flex min-w-0 justify-end justify-self-end transition-all duration-300 ${
            row1Hidden
              ? "pointer-events-none max-w-0 overflow-hidden opacity-0"
              : "max-w-[min(52vw,560px)] opacity-100 xl:max-w-none"
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
      <div className="flex h-20 items-center gap-2 px-3 md:hidden">
        {/* 좌: 드로어 — 고정 폭으로 로고 슬롯과 겹치지 않음 */}
        <div className="flex w-11 shrink-0 justify-center">
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
        </div>

        {/* 중앙: 남는 폭만 쓰는 로고 — 좌우 버튼에 가리지 않음 */}
        <Link
          href="/"
          aria-label="홈"
          className="flex min-w-0 flex-1 items-center justify-center py-1 leading-none"
        >
          <Image
            src={publicAsset("/main/logo.webp")}
            alt=""
            width={300}
            height={90}
            sizes="(max-width: 767px) 200px, 360px"
            className="site-header-logo-img"
            priority
          />
        </Link>

        {/* 우: 알림 + 프로필 — 고정 폭 */}
        <div className="flex w-[5.25rem] shrink-0 items-center justify-end gap-2">
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

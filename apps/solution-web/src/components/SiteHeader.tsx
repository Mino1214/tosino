"use client";

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
import { formatKrwWithSymbol } from "@/lib/format-currency";
import { ProtectedNavLink } from "@/components/ProtectedNavLink";

const NAV_ITEMS = [
  { label: "카지노", href: "/lobby/live-casino" },
  { label: "슬롯", href: "/lobby/slots" },
  { label: "아케이드", href: "/lobby/arcade" },
  { label: "미니게임", href: "/lobby/minigame" },
  { label: "마이페이지", href: "/mypage" },
];

function BellButton() {
  return (
    <button
      type="button"
      className="relative shrink-0 text-zinc-400 transition-colors hover:text-white"
      aria-label="알림"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] text-white">
        4
      </span>
    </button>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ onDrawerOpen }: { onDrawerOpen?: () => void }) {
  const b = useBootstrap();
  const router = useRouter();
  const pathname = usePathname();
  const { setHistoryOpen } = useBettingCart();
  const { openLogin, openSignup, openWallet } = useAppModals();
  const [logged, setLogged] = useState(false);
  const [money, setMoney] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
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
        setPoints(null);
        return;
      }

      try {
        const w = await apiFetch<{ balance: string; pointBalance: string }>("/me/wallet");
        if (!alive) return;
        setMoney(Number(w.balance));
        setPoints(Number(w.pointBalance));
      } catch {
        if (!alive) return;
        setMoney(null);
        setPoints(null);
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
    if (!isSportPage) {
      setRow1Hidden(false);
    }

    function onScroll() {
      setScrolled(window.scrollY > 8);
      if (isSportPage) {
        setRow1Hidden(window.scrollY > 40);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isSportPage]);

  function logout() {
    clearSession();
    setLogged(false);
    setMoney(null);
    setPoints(null);
    router.push("/");
  }

  function openHistory() {
    if (!logged) {
      openLogin();
      return;
    }
    setHistoryOpen(true);
  }

  function openMyPage() {
    if (!logged) {
      openLogin();
      return;
    }
    router.push("/mypage");
  }

  if (!b) return null;

  const bgClass = isHome
    ? scrolled
      ? "bg-[#0a0a0e]/84 backdrop-blur-md"
      : "bg-transparent"
    : "bg-[#0a0a0e]";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${bgClass}`}
    >
      <div className="hidden md:block">
        <div
          className={`overflow-hidden border-b border-[rgba(218,174,87,0.12)] transition-all duration-300 ${
            row1Hidden ? "max-h-0 opacity-0" : "max-h-36 opacity-100"
          }`}
        >
          <div className="content-pad-phi mx-auto w-full max-w-[90rem] py-3">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
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

              <div className="min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max items-center justify-end gap-2 text-xs text-zinc-400 lg:gap-3">
                  <a
                    href="https://t.me/nimo7788"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex shrink-0 items-center gap-1 whitespace-nowrap text-zinc-300 transition-colors hover:text-white"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-3.5 w-3.5 shrink-0 text-main-gold-solid transition-colors group-hover:text-[#f4d386]"
                    >
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                    <span>고객센터</span>
                  </a>

                  <div className="h-3 w-px shrink-0 bg-white/15" />

                  <BellButton />

                  {logged ? (
                    <>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px]">
                          👤
                        </div>
                        <span className="whitespace-nowrap text-zinc-300">회원</span>
                      </div>

                      <div className="h-3 w-px shrink-0 bg-white/15" />

                      <span className="shrink-0 whitespace-nowrap text-zinc-400">
                        MONEY{" "}
                        <span className="font-mono font-bold text-main-gold">
                          {formatKrwWithSymbol(money, "₩ —")}
                        </span>
                      </span>

                      <span className="shrink-0 whitespace-nowrap text-zinc-400">
                        POINT{" "}
                        <span className="font-mono font-bold text-emerald-400">
                          {points !== null ? points.toLocaleString("ko-KR") : "—"}
                        </span>{" "}
                        ₱
                      </span>

                      <div className="h-3 w-px shrink-0 bg-white/15" />

                      <button
                        type="button"
                        className="shrink-0 whitespace-nowrap text-zinc-300 transition-colors hover:text-white"
                      >
                        포인트전환
                      </button>
                      <button
                        type="button"
                        onClick={() => openWallet({ fiatTab: "DEPOSIT" })}
                        className="shrink-0 rounded bg-gold-gradient px-2 py-1 text-xs font-bold transition-opacity hover:opacity-90"
                      >
                        입금하기
                      </button>
                      <button
                        type="button"
                        onClick={() => openWallet({ fiatTab: "WITHDRAWAL" })}
                        className="shrink-0 rounded border border-white/20 px-2 py-1 text-zinc-300 transition-colors hover:text-white"
                      >
                        출금하기
                      </button>
                      <button
                        type="button"
                        onClick={logout}
                        className="shrink-0 whitespace-nowrap text-zinc-300 transition-colors hover:text-white"
                      >
                        로그아웃
                      </button>

                      <div className="h-3 w-px shrink-0 bg-white/15" />

                      <button
                        type="button"
                        onClick={openMyPage}
                        className="shrink-0 whitespace-nowrap font-semibold text-main-gold transition-opacity hover:opacity-80"
                      >
                        마이페이지
                      </button>
                      <button
                        type="button"
                        onClick={openHistory}
                        className="shrink-0 whitespace-nowrap font-semibold text-main-gold transition-opacity hover:opacity-80"
                      >
                        배팅내역
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openLogin()}
                        className="shrink-0 rounded bg-gold-gradient px-2.5 py-1 text-xs font-bold transition-opacity hover:opacity-90"
                      >
                        로그인
                      </button>
                      <button
                        type="button"
                        onClick={() => openSignup()}
                        className="shrink-0 rounded border border-white/20 px-2.5 py-1 text-zinc-300 transition-colors hover:text-main-gold-solid"
                      >
                        회원가입
                      </button>

                      <div className="h-3 w-px shrink-0 bg-white/15" />

                      <button
                        type="button"
                        onClick={openHistory}
                        className="shrink-0 whitespace-nowrap font-semibold text-main-gold transition-opacity hover:opacity-80"
                      >
                        배팅내역
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-[rgba(218,174,87,0.12)]">
          <div className="content-pad-phi mx-auto w-full max-w-[90rem]">
            <nav
              aria-label="메인 메뉴"
              className="flex h-12 items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-center"
            >
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <ProtectedNavLink
                    key={item.href}
                    href={item.href}
                    className={`relative flex h-full shrink-0 items-center whitespace-nowrap px-3 text-[0.95rem] font-semibold leading-tight transition-colors ${
                      active
                        ? "text-main-gold drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)]"
                        : "text-[#f0e6c8] drop-shadow-[0_1px_8px_rgba(0,0,0,0.95)] hover:text-main-gold-solid"
                    }`}
                  >
                    {item.label}
                    {active ? (
                      <span
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                        style={{
                          background: "var(--gold-gradient)",
                          boxShadow: "0 0 8px rgba(218,174,87,0.5)",
                        }}
                      />
                    ) : null}
                  </ProtectedNavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="flex h-20 items-center gap-2 px-3 md:hidden">
        <div className="flex w-11 shrink-0 justify-center">
          <button
            type="button"
            onClick={onDrawerOpen}
            className="flex h-9 w-9 items-center justify-center text-main-gold-solid"
            aria-label="메뉴"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-5 w-5"
            >
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

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

        <div className="flex w-[5.25rem] shrink-0 items-center justify-end gap-2">
          <BellButton />

          <button
            type="button"
            onClick={openMyPage}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700"
            aria-label="마이페이지"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

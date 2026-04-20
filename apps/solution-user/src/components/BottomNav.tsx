"use client";

/*
  ─── BottomNav 규격 ──────────────────────────────────────────────
  · position : fixed bottom-0, h-14 (56px), mobile only (md:hidden)
  · 모바일: 스포츠 로비에서만 [배팅카트] 표시, 그 외 [배팅내역][PLAY][고객센터][입출금]
  · PLAY 버튼: 클릭 시 입출금과 동일 — 탭바 바로 위 2열 그리드 패널
  · 입출금 버튼: 동일 레이아웃 (입금·출금·포인트 등)
  ─────────────────────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useBettingCart } from "./BettingCartContext";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { useAppModals } from "@/contexts/AppModalsContext";
import { isSportsBettingPath } from "@/lib/sports-lobby-path";
import { publicAsset } from "@/lib/public-asset";
import { getAccessToken } from "@/lib/api";
import { ProtectedNavLink } from "@/components/ProtectedNavLink";

const PLAY_ITEMS = [
  // 스포츠 = odds-api.io WS 라이브 패널 + 트래커 검토용으로 노출. e스포츠는 계속 보류.
  { label: "스포츠",   href: "/lobby/sports",     emoji: "" },
  { label: "카지노",   href: "/lobby/live-casino", emoji: "" },
  { label: "슬롯",      href: "/lobby/slots",       emoji: "" },
  { label: "아케이드",  href: "/lobby/arcade",      emoji: "" },
  { label: "미니게임",  href: "/lobby/minigame",    emoji: "" },
];

type SpeedDialLinkItem = { label: string; href: string; emoji?: string };
type SpeedDialActionItem = { label: string; onSelect: () => void; emoji?: string };

const QUICK_DIAL_ITEM_CLASS =
  "flex min-h-[2.75rem] items-center justify-center rounded-lg bg-gold-gradient px-5 py-2.5 text-center text-sm font-bold leading-tight text-[#0f0f12] transition-opacity hover:opacity-90 active:opacity-100";

/** 모바일 입출금: 2열 그리드, 짧은 높이로 스크롤 없이 한 화면에 표시 */
function WalletQuickDial({
  items,
  onClose,
}: {
  items: SpeedDialActionItem[];
  onClose: () => void;
}) {
  const anim = (i: number) => ({
    animationName: "slideUpCard",
    animationDuration: "0.2s",
    animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
    animationFillMode: "both" as const,
    animationDelay: `${i * 35}ms`,
  });

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 닫기"
        className="fixed inset-x-0 top-0 bottom-[var(--app-mobile-nav-total)] z-[55] w-full bg-black/55 md:hidden"
        onClick={onClose}
        onTouchEnd={onClose}
      />
      <div className="fixed inset-x-0 bottom-[var(--app-mobile-nav-total)] z-[60] px-2 pb-1 md:hidden">
        <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-1">
          {items.map((item, i) => {
            const lastOdd = i === items.length - 1 && items.length % 2 === 1;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onSelect();
                  onClose();
                }}
                style={anim(i)}
                className={`${QUICK_DIAL_ITEM_CLASS} ${
                  lastOdd ? "col-span-2" : ""
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** PLAY: 입출금과 동일 — 하단 2열 그리드 + 링크 이동 */
function PlayGameDial({
  items,
  onClose,
}: {
  items: SpeedDialLinkItem[];
  onClose: () => void;
}) {
  const anim = (i: number) => ({
    animationName: "slideUpCard",
    animationDuration: "0.2s",
    animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
    animationFillMode: "both" as const,
    animationDelay: `${i * 35}ms`,
  });

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 닫기"
        className="fixed inset-x-0 top-0 bottom-[var(--app-mobile-nav-total)] z-[55] w-full bg-black/55 md:hidden"
        onClick={onClose}
        onTouchEnd={onClose}
      />
      <div className="fixed inset-x-0 bottom-[var(--app-mobile-nav-total)] z-[60] px-2 pb-1 md:hidden">
        <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-1">
          {items.map((item, i) => {
            const lastOdd = i === items.length - 1 && items.length % 2 === 1;
            return (
              <ProtectedNavLink
                key={item.href}
                href={item.href}
                onNavigate={onClose}
                onBlocked={onClose}
                style={anim(i)}
                className={`${QUICK_DIAL_ITEM_CLASS} gap-1 ${
                  lastOdd ? "col-span-2" : ""
                }`}
              >
                {item.emoji ? <span aria-hidden>{item.emoji}</span> : null}
                {item.label}
              </ProtectedNavLink>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [playOpen, setPlayOpen]     = useState(false);
  const [playSpinning, setPlaySpinning] = useState(false);
  const { setPanelOpen } = useBettingCart();
  const { openWallet: openWalletModal, openLogin, openSignup } = useAppModals();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getAccessToken());
    function onStorage() { setIsLoggedIn(!!getAccessToken()); }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pathname]);

  const closeAll = useCallback(() => {
    setPlayOpen(false);
  }, []);

  const isSportPage = isSportsBettingPath(pathname);
  const isHome = pathname === "/";

  /* 스포츠 로비 이탈 시 배팅 패널 닫기 */
  useEffect(() => {
    if (!isSportPage) setPanelOpen(false);
  }, [isSportPage, setPanelOpen]);

  /* 스피드 다이얼 열림 시 배경 스크롤 잠금 (iOS 호환) */
  useEffect(() => {
    if (playOpen) lockScroll();
    else unlockScroll();
    return () => { unlockScroll(); };
  }, [playOpen]);

  const desktopPlaySpin = useCallback(() => {
    setPlaySpinning(true);
    window.setTimeout(() => setPlaySpinning(false), 700);
  }, []);

  const togglePlayMenu = useCallback(() => {
    setPlaySpinning(true);
    window.setTimeout(() => setPlaySpinning(false), 700);
    setPlayOpen((o) => !o);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const clearPlay = () => {
      if (mq.matches) setPlayOpen(false);
    };
    clearPlay();
    mq.addEventListener("change", clearPlay);
    return () => mq.removeEventListener("change", clearPlay);
  }, []);

  return (
    <>
      {/* PLAY 스피드 다이얼 */}
      {playOpen && <PlayGameDial items={PLAY_ITEMS} onClose={closeAll} />}

      {/* 하단 탭바 — [홈] [로그인/마이] [PLAY] [입금] [출금] */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 h-[var(--app-mobile-nav-total)] shrink-0 border-t border-[rgba(218,174,87,0.35)] bg-[#0a0806] pb-[var(--app-mobile-nav-safe)] md:hidden overflow-visible"
      >
        <div className="flex h-full">
          {/* 홈 */}
          <Link
            href="/"
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.9)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            홈
          </Link>

          {/* 로그인 상태에 따라: 마이페이지 or 로그인 */}
          {isLoggedIn ? (
            <Link
              href="/mypage"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.85)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              마이페이지
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openLogin()}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.85)] active:text-main-gold"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              로그인
            </button>
          )}

          {/* PLAY 중앙 버튼 */}
          <button
            type="button"
            onClick={togglePlayMenu}
            className={`relative flex flex-1 flex-col items-center justify-center text-[10px] font-bold transition-colors ${
              playOpen ? "text-main-gold" : "text-[rgba(218,174,87,0.88)]"
            }`}
          >
            <div className={`absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] ${playSpinning ? "play-button-spin" : ""}`}>
              <Image src={publicAsset("/icon/playbutton.png")} alt="" width={156} height={156} className="h-full w-full object-contain" priority />
            </div>
          </button>

          {/* 입금 — 직접 탭 */}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => { closeAll(); openWalletModal({ fiatTab: "DEPOSIT" }); }}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.9)] active:text-main-gold"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              입금
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openSignup()}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-main-gold-solid active:opacity-80"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
              회원가입
            </button>
          )}

          {/* 출금 — 직접 탭 */}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => { closeAll(); openWalletModal({ fiatTab: "WITHDRAWAL" }); }}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.85)] active:text-main-gold"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              출금
            </button>
          ) : (
            <a
              href="https://t.me/nimo7788"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = "tg://resolve?domain=nimo7788";
                setTimeout(() => window.open("https://t.me/nimo7788", "_blank"), 1500);
              }}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.82)]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-main-gold-solid">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              고객센터
            </a>
          )}
        </div>
      </nav>


        {!isHome && (
            <button
                type="button"
                aria-label="장식 버튼"
                onClick={desktopPlaySpin}
                className="fixed bottom-5 left-1/2 z-[45] hidden -translate-x-1/2 md:flex md:flex-col md:items-center md:gap-1 text-[rgba(218,174,87,0.72)]"
            >
                <div
                    className={`flex h-14 w-14 items-center justify-center overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] ${
                        playSpinning ? "play-button-spin" : ""
                    }`}
                >
                    <Image
                        src={publicAsset("/icon/playbutton.png")}
                        alt=""
                        width={112}
                        height={112}
                        className="h-full w-full object-contain"
                        priority
                    />
                </div>
                <span className="text-[10px] font-bold text-[rgba(218,174,87,0.55)]">PLAY</span>
            </button>
        )}

        <style>{`
        @keyframes slideUpCard {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0)     scale(1);   }
        }
      `}</style>
    </>
  );
}

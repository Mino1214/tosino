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
import { useState, useEffect, useMemo, useCallback } from "react";
import { useBettingCart } from "./BettingCartContext";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { useAppModals } from "@/contexts/AppModalsContext";
import { isSportsBettingPath } from "@/lib/sports-lobby-path";
import { publicAsset } from "@/lib/public-asset";

const PLAY_ITEMS = [
  // 스포츠/e스포츠는 임시 비노출.
  { label: "카지노", href: "/lobby/live-casino", emoji: "" },
  { label: "슬롯",      href: "/lobby/slots",       emoji: "" },
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
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={anim(i)}
                className={`${QUICK_DIAL_ITEM_CLASS} gap-1 ${
                  lastOdd ? "col-span-2" : ""
                }`}
              >
                {item.emoji ? <span aria-hidden>{item.emoji}</span> : null}
                {item.label}
              </Link>
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
  const [walletDialOpen, setWalletDialOpen] = useState(false);
  const { setPanelOpen, setHistoryOpen } = useBettingCart();
  const { openWallet: openWalletModal } = useAppModals();

  const walletDialItems: SpeedDialActionItem[] = useMemo(
    () => [
      { label: "입금신청", onSelect: () => openWalletModal({ fiatTab: "DEPOSIT" }) },
      { label: "출금신청", onSelect: () => openWalletModal({ fiatTab: "WITHDRAWAL" }) },
      { label: "포인트전환", onSelect: () => openWalletModal({ mainTab: "fiat" }) },
      { label: "콤프전환", onSelect: () => openWalletModal({ mainTab: "fiat" }) },
    ],
    [openWalletModal],
  );

  const isSportPage = isSportsBettingPath(pathname);
  const isHome = pathname === "/";

  /* 스포츠 로비 이탈 시 배팅 패널 닫기 */
  useEffect(() => {
    if (!isSportPage) setPanelOpen(false);
  }, [isSportPage, setPanelOpen]);

  /* 스피드 다이얼 열림 시 배경 스크롤 잠금 (iOS 호환) */
  useEffect(() => {
    if (playOpen || walletDialOpen) lockScroll();
    else unlockScroll();
    return () => { unlockScroll(); };
  }, [playOpen, walletDialOpen]);

  function closeAll() {
    setPlayOpen(false);
    setWalletDialOpen(false);
  }

  const desktopPlaySpin = useCallback(() => {
    setPlaySpinning(true);
    window.setTimeout(() => setPlaySpinning(false), 700);
  }, []);

  const togglePlayMenu = useCallback(() => {
    setPlaySpinning(true);
    window.setTimeout(() => setPlaySpinning(false), 700);
    setWalletDialOpen(false);
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
      {/* Speed Dial 오버레이 */}
      {playOpen && <PlayGameDial items={PLAY_ITEMS} onClose={closeAll} />}
      {walletDialOpen && <WalletQuickDial items={walletDialItems} onClose={closeAll} />}

      {/* 하단 탭바 */}
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 h-[var(--app-mobile-nav-total)] shrink-0 border-t border-[rgba(218,174,87,0.35)] bg-[#0a0806] pb-[var(--app-mobile-nav-safe)] md:hidden overflow-visible"
        >
            <div className="flex h-full">
                {/* 홈 */}
                <Link
                    href="/"
                    className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.9)]"
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
                            strokeLinejoin="round"
                            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                        />
                    </svg>
                    홈
                </Link>

                {/* 배팅카트 (주석 처리)
    <button
      type="button"
      onClick={() => { closeAll(); setPanelOpen(true); }}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
        isSportPage
          ? "text-[rgba(218,174,87,0.9)] active:text-main-gold"
          : "text-[rgba(218,174,87,0.45)]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
      {lines.length > 0 && (
        <span className="absolute right-3 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-gold-gradient text-[8px] font-bold">
          {lines.length}
        </span>
      )}
      배팅카트
    </button>
    */}

                {/* 배팅내역 */}
                <button
                    type="button"
                    onClick={() => {
                        closeAll();
                        setHistoryOpen(true);
                    }}
                    className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.85)] active:text-main-gold"
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
                            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                        />
                    </svg>
                    배팅내역
                </button>

                <button
                    type="button"
                    onClick={togglePlayMenu}
                    className={`relative flex flex-1 flex-col items-center justify-center text-[10px] font-bold transition-colors ${
                        playOpen ? "text-main-gold" : "text-[rgba(218,174,87,0.88)]"
                    }`}
                >
                    <div
                        className={`absolute -top-5 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center overflow-visible drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)] ${
                            playSpinning ? "play-button-spin" : ""
                        }`}
                    >
                        <Image
                            src={publicAsset("/icon/playbutton.png")}
                            alt=""
                            width={156}
                            height={156}
                            className="h-full w-full object-contain"
                            priority
                        />
                    </div>
                    {/*<span className={playOpen ? "text-main-gold" : ""}>PLAY</span>*/}
                </button>

                {/* 고객센터 */}
                <a
                    href="https://t.me/nimo7788"
                    onClick={(e) => {
                        e.preventDefault();
                        // 텔레그램 앱 딥링크 시도
                        const appUrl = "tg://resolve?domain=nimo7788";
                        const webUrl = "https://t.me/nimo7788";

                        // 앱 열기 시도
                        window.location.href = appUrl;

                        // 일정 시간 후 앱 안 열리면 웹으로 fallback
                        setTimeout(() => {
                            window.open(webUrl, "_blank");
                        }, 1500);
                    }}
                    className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-[rgba(218,174,87,0.82)]"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-main-gold-solid">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                    고객센터
                </a>

                {/* 입출금 */}
                <button
                    type="button"
                    onClick={() => {
                        setPlayOpen(false);
                        setWalletDialOpen((o) => !o);
                    }}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                        walletDialOpen ? "text-main-gold" : "text-[rgba(218,174,87,0.85)]"
                    }`}
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
                            strokeLinejoin="round"
                            d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75"
                        />
                    </svg>
                    입출금
                </button>
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

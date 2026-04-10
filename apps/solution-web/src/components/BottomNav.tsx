"use client";

/*
  ─── BottomNav 규격 ──────────────────────────────────────────────
  · position : fixed bottom-0, h-14 (56px), mobile only (md:hidden)
  · 5개 항목: [배팅카트] [배팅내역] [⚡PLAY] [고객센터] [입출금]
  · PLAY 버튼: 클릭 시 위로 카드 스택 (Speed Dial)
               헤더 2번째 줄 탭들을 동그란 카드로 아래→위 순서로 적층
  · 입출금 버튼: 클릭 시 동일한 스택 방식으로 (입금신청, 출금신청, 포인트전환, 추천인보너스전환, 콤프전환)
  · 배팅카트: 스포츠/프리매치/e스포츠 페이지에서만 활성 (다른 페이지에선 비활성 스타일)
  ─────────────────────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useBettingCart } from "./BettingCartContext";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { useAppModals } from "@/contexts/AppModalsContext";

const PLAY_ITEMS = [
  { label: "스포츠",    href: "/lobby/sports-kr",  emoji: "⚽" },
  // { label: "프리매치",  href: "/lobby/prematch",    emoji: "📅" },
  // { label: "인플레이",  href: "/lobby/live",         emoji: "🔴" },
  // { label: "e스포츠",  href: "/lobby/esports",     emoji: "🎮" },
  { label: "카지노",    href: "/lobby/live-casino", emoji: "🎰" },
  { label: "슬롯",      href: "/lobby/slots",       emoji: "🎲" },
  { label: "미니게임",  href: "/lobby/minigame",    emoji: "🕹️" },
];

type SpeedDialLinkItem = { label: string; href: string; emoji?: string };
type SpeedDialActionItem = { label: string; onSelect: () => void; emoji?: string };
type SpeedDialItem = SpeedDialLinkItem | SpeedDialActionItem;

type SpeedDialProps = {
  items: SpeedDialItem[];
  onClose: () => void;
};

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
        className="fixed inset-x-0 top-0 bottom-14 z-[55] w-full bg-black/55 md:hidden"
        onClick={onClose}
        onTouchEnd={onClose}
      />
      <div className="fixed inset-x-0 bottom-14 z-[60] px-2 pb-1 md:hidden">
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
                className={`flex min-h-[2.25rem] items-center justify-center rounded-lg border border-[rgba(218,174,87,0.35)] bg-[#101018] px-1 py-1.5 text-center text-[10px] font-bold leading-[1.15] text-main-gold shadow-[0_0_10px_rgba(218,174,87,0.12)] active:opacity-90 ${
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

function SpeedDial({ items, onClose }: SpeedDialProps) {
  const anim = (i: number) => ({
    animationName: "slideUpCard",
    animationDuration: "0.25s",
    animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
    animationFillMode: "both" as const,
    animationDelay: `${i * 40}ms`,
  });

  return (
    <>
      <button
        type="button"
        aria-label="메뉴 닫기"
        className="fixed inset-x-0 top-0 bottom-14 z-[55] w-full bg-black/50 md:inset-0 md:bottom-0"
        onClick={onClose}
        onTouchEnd={onClose}
      />
      <div className="fixed inset-x-0 bottom-14 z-[60] flex flex-col-reverse items-center gap-2 pb-3 md:bottom-28">
        {items.map((item, i) =>
          "href" in item ? (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-2 rounded-full border border-[rgba(218,174,87,0.35)] bg-[#0d0d14] px-5 py-2.5 text-sm font-medium text-main-gold shadow-gold-glow"
              style={anim(i)}
            >
              {item.emoji && <span className="text-base">{item.emoji}</span>}
              {item.label}
            </Link>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              className="flex items-center gap-2 rounded-full border border-[rgba(218,174,87,0.35)] bg-[#0d0d14] px-5 py-2.5 text-sm font-medium text-main-gold shadow-gold-glow"
              style={anim(i)}
            >
              {item.emoji && <span className="text-base">{item.emoji}</span>}
              {item.label}
            </button>
          ),
        )}
      </div>
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [playOpen, setPlayOpen]     = useState(false);
  const [playSpinning, setPlaySpinning] = useState(false);
  const [walletDialOpen, setWalletDialOpen] = useState(false);
  const { lines, setPanelOpen, setHistoryOpen } = useBettingCart();
  const { openWallet: openWalletModal } = useAppModals();

  const walletDialItems: SpeedDialActionItem[] = useMemo(
    () => [
      { label: "입금신청", onSelect: () => openWalletModal({ fiatTab: "DEPOSIT" }) },
      { label: "출금신청", onSelect: () => openWalletModal({ fiatTab: "WITHDRAWAL" }) },
      { label: "포인트전환", onSelect: () => openWalletModal({ mainTab: "fiat" }) },
      { label: "추천인보너스", onSelect: () => openWalletModal({ mainTab: "fiat" }) },
      { label: "콤프전환", onSelect: () => openWalletModal({ mainTab: "fiat" }) },
    ],
    [openWalletModal],
  );

  const isSportPage = ["/lobby/sports", "/lobby/prematch", "/lobby/live", "/lobby/esports"]
    .some((p) => pathname.startsWith(p));

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

  const togglePlayMenu = useCallback(() => {
    setPlaySpinning(true);
    window.setTimeout(() => setPlaySpinning(false), 700);
    setWalletDialOpen(false);
    setPlayOpen((o) => !o);
  }, []);

  return (
    <>
      {/* Speed Dial 오버레이 */}
      {playOpen && <SpeedDial items={PLAY_ITEMS} onClose={closeAll} />}
      {walletDialOpen && <WalletQuickDial items={walletDialItems} onClose={closeAll} />}

      {/* 하단 탭바 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 h-14 border-t border-white/8 bg-[#0a0a0e] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-full">

          {/* 배팅카트 */}
          <button
            type="button"
            onClick={() => { closeAll(); setPanelOpen(true); }}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
              isSportPage ? "text-zinc-400 active:text-main-gold-solid" : "text-zinc-600"
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

          {/* 배팅내역 */}
          <button
            type="button"
            onClick={() => { closeAll(); setHistoryOpen(true); }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-zinc-500 active:text-main-gold-solid"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            배팅내역
          </button>

          {/* PLAY 중앙 버튼 */}
          <button
            type="button"
            onClick={togglePlayMenu}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              playOpen ? "text-main-gold-solid" : "text-zinc-400"
            }`}
          >
            <div
              className={`flex h-11 w-11 items-center justify-center ${playSpinning ? "play-button-spin" : ""}`}
            >
              <Image
                src="/icon/playbutton.png"
                alt=""
                width={88}
                height={88}
                className="h-11 w-11 object-contain"
                priority
              />
            </div>
            <span className={playOpen ? "text-main-gold" : ""}>PLAY</span>
          </button>

          {/* 고객센터 */}
          <a
            href="https://t.me/nimo7788"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-zinc-500"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-sky-400">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
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
              walletDialOpen ? "text-main-gold-solid" : "text-zinc-500"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
            입출금
          </button>

        </div>
      </nav>

      {/* 데스크톱 웹: 하단 중앙 플로팅 PLAY (모바일 탭바와 동일 메뉴) */}
      <button
        type="button"
        aria-label="게임 메뉴"
        onClick={togglePlayMenu}
        className={`fixed bottom-5 left-1/2 z-[45] hidden -translate-x-1/2 md:flex md:flex-col md:items-center md:gap-1 ${
          playOpen ? "text-main-gold-solid" : "text-zinc-500"
        }`}
      >
        <div className={`flex h-14 w-14 items-center justify-center ${playSpinning ? "play-button-spin" : ""}`}>
          <Image
            src="/icon/playbutton.png"
            alt=""
            width={112}
            height={112}
            className="h-14 w-14 object-contain drop-shadow-[0_0_14px_rgba(218,174,87,0.45)]"
            priority
          />
        </div>
        <span className={`text-[10px] font-bold ${playOpen ? "text-main-gold" : "text-zinc-500"}`}>PLAY</span>
      </button>

      <style>{`
        @keyframes slideUpCard {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0)     scale(1);   }
        }
      `}</style>
    </>
  );
}

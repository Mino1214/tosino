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

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useBettingCart } from "./BettingCartContext";

const PLAY_ITEMS = [
  { label: "스포츠",    href: "/lobby/sports-kr",  emoji: "⚽" },
  { label: "프리매치",  href: "/lobby/prematch",    emoji: "📅" },
  { label: "인플레이",  href: "/lobby/live",         emoji: "🔴" },
  { label: "e스포츠",  href: "/lobby/esports",     emoji: "🎮" },
  { label: "카지노",    href: "/lobby/live-casino", emoji: "🎰" },
  { label: "슬롯",      href: "/lobby/slots",       emoji: "🎲" },
  { label: "미니게임",  href: "/lobby/minigame",    emoji: "🕹️" },
];

const WALLET_ITEMS = [
  { label: "입금신청",        href: "/wallet?tab=deposit"   },
  { label: "출금신청",        href: "/wallet?tab=withdraw"  },
  { label: "포인트전환",      href: "/wallet?tab=point"     },
  { label: "추천인보너스전환", href: "/wallet?tab=referral"  },
  { label: "콤프전환",        href: "/wallet?tab=comp"      },
];

type SpeedDialProps = {
  items: { label: string; href: string; emoji?: string }[];
  onClose: () => void;
};

function SpeedDial({ items, onClose }: SpeedDialProps) {
  return (
    <>
      {/* 투명 오버레이 — 바깥 탭 시 닫힘 */}
      <div
        className="fixed inset-0 z-[55]"
        onClick={onClose}
      />
      {/* 카드 스택 — 아래에서 위로 쌓임 */}
      <div className="fixed inset-x-0 bottom-14 z-[60] flex flex-col-reverse items-center gap-2 pb-3">
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-[#0d0d14] px-5 py-2.5 text-sm font-medium text-white shadow-lg"
            style={{
              animationName: "slideUpCard",
              animationDuration: "0.25s",
              animationTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
              animationFillMode: "both",
              animationDelay: `${i * 40}ms`,
            }}
          >
            {item.emoji && <span className="text-base">{item.emoji}</span>}
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [playOpen, setPlayOpen]     = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const { lines, setPanelOpen, setHistoryOpen } = useBettingCart();

  const isSportPage = ["/lobby/sports", "/lobby/prematch", "/lobby/live", "/lobby/esports"]
    .some((p) => pathname.startsWith(p));

  function closeAll() {
    setPlayOpen(false);
    setWalletOpen(false);
  }

  return (
    <>
      {/* Speed Dial 오버레이 */}
      {playOpen   && <SpeedDial items={PLAY_ITEMS}   onClose={closeAll} />}
      {walletOpen && <SpeedDial items={WALLET_ITEMS} onClose={closeAll} />}

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
              isSportPage ? "text-zinc-400 active:text-[var(--theme-primary,#c9a227)]" : "text-zinc-600"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            {lines.length > 0 && (
              <span className="absolute right-3 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--theme-primary,#c9a227)] text-[8px] font-bold text-black">
                {lines.length}
              </span>
            )}
            배팅카트
          </button>

          {/* 배팅내역 */}
          <button
            type="button"
            onClick={() => { closeAll(); setHistoryOpen(true); }}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-zinc-500 active:text-[var(--theme-primary,#c9a227)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            배팅내역
          </button>

          {/* PLAY 중앙 버튼 */}
          <button
            type="button"
            onClick={() => { closeAll(); setPlayOpen((o) => !o); }}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              playOpen ? "text-[var(--theme-primary,#c9a227)]" : "text-zinc-300"
            }`}
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
              playOpen
                ? "border-[var(--theme-primary,#c9a227)] bg-[var(--theme-primary,#c9a227)]/10"
                : "border-white/20 bg-white/5"
            }`}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
            PLAY
          </button>

          {/* 고객센터 */}
          <a
            href="https://t.me/"
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
            onClick={() => { closeAll(); setWalletOpen((o) => !o); }}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              walletOpen ? "text-[var(--theme-primary,#c9a227)]" : "text-zinc-500"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
            </svg>
            입출금
          </button>

        </div>
      </nav>

      <style>{`
        @keyframes slideUpCard {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0)     scale(1);   }
        }
      `}</style>
    </>
  );
}

"use client";

/**
 * HomeQuickAction
 * ─ 데스크톱: 홈 화면 우측 하단 고정 카드 (잔액·입출금 or 가입/로그인)
 * ─ 모바일: BottomNav에 이미 입금/출금/가입 직접 탭 있으므로 숨김
 */

import { useEffect, useState } from "react";
import { apiFetch, getAccessToken, subscribeAuthChange } from "@/lib/api";
import { useAppModals } from "@/contexts/AppModalsContext";
import { formatKrwWithSymbol } from "@/lib/format-currency";

export function HomeQuickAction() {
  const { openLogin, openSignup, openWallet } = useAppModals();
  const [logged, setLogged] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      const ok = !!getAccessToken();
      if (!alive) return;
      setLogged(ok);
      if (!ok) { setBalance(null); return; }
      try {
        const w = await apiFetch<{ balance: string }>("/me/wallet");
        if (alive) setBalance(Number(w.balance));
      } catch {
        if (alive) setBalance(null);
      }
    }

    void refresh();
    const unsub = subscribeAuthChange(() => { void refresh(); });
    return () => { alive = false; unsub(); };
  }, []);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-6 right-4 z-[45] hidden md:flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(218,174,87,0.4)] bg-[#0a0806]/90 shadow-lg backdrop-blur-sm transition-opacity hover:opacity-90"
        aria-label="빠른 메뉴 열기"
      >
        <span className="text-xl">💰</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-4 z-[45] hidden md:block w-56">
      <div className="rounded-2xl border border-[rgba(218,174,87,0.3)] bg-[#0a0806]/92 shadow-2xl backdrop-blur-md">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[rgba(218,174,87,0.15)] px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[rgba(218,174,87,0.7)]">
            {logged ? "내 계정" : "바로 시작하기"}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-zinc-600 hover:text-zinc-400"
            aria-label="닫기"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 py-3 space-y-2">
          {logged ? (
            <>
              {/* 잔액 */}
              <div className="rounded-lg bg-white/5 px-3 py-2">
                <p className="text-[10px] text-zinc-500">보유 잔액</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-main-gold">
                  {formatKrwWithSymbol(balance, "₩ —")}
                </p>
              </div>
              {/* 입금 버튼 */}
              <button
                type="button"
                onClick={() => openWallet({ fiatTab: "DEPOSIT" })}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold-gradient py-2 text-sm font-bold text-[#0f0f12] transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                입금하기
              </button>
              {/* 출금 버튼 */}
              <button
                type="button"
                onClick={() => openWallet({ fiatTab: "WITHDRAWAL" })}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(218,174,87,0.35)] py-2 text-sm font-medium text-[rgba(218,174,87,0.9)] transition-colors hover:border-[rgba(218,174,87,0.6)] hover:text-main-gold"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                출금하기
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-[11px] text-zinc-400 leading-relaxed">
                지금 가입하고<br />
                <span className="text-main-gold-solid font-medium">보너스 혜택</span>을 누려보세요
              </p>
              {/* 회원가입 */}
              <button
                type="button"
                onClick={() => openSignup()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold-gradient py-2.5 text-sm font-bold text-[#0f0f12] transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                회원가입
              </button>
              {/* 로그인 */}
              <button
                type="button"
                onClick={() => openLogin()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(218,174,87,0.3)] py-2 text-sm font-medium text-[rgba(218,174,87,0.8)] transition-colors hover:border-[rgba(218,174,87,0.55)] hover:text-main-gold"
              >
                로그인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

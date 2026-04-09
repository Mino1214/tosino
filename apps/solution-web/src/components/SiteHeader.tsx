"use client";

/*
  ─── SiteHeader 규격 (ZXX.BET 참조) ────────────────────────────────
  Desktop (md+):
    한 줄: [Logo] [Nav: 스포츠 프리매치 인플레이 스포츠북 e스포츠 카지노 슬롯 미니게임] [User영역]
    height: h-14 (56px)

  Mobile:
    줄 1: [Logo] [User영역]          h-12 (48px)
    줄 2: [Nav 가로 스크롤]           h-10 (40px)
    Total: h-[5.5rem] (88px)

  → layout.tsx: pt-[5.5rem] md:pt-14 으로 맞춤
  ─────────────────────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBootstrap } from "./BootstrapProvider";
import { apiFetch, getAccessToken, clearSession } from "@/lib/api";

const NAV_ITEMS = [
  { label: "스포츠",   href: "/#sports"    },
  { label: "프리매치", href: "/#prematch"  },
  { label: "인플레이", href: "/#inplay"    },
  { label: "스포츠북", href: "/#sportsbook"},
  { label: "e스포츠",  href: "/#esports"  },
  { label: "카지노",   href: "/#casino"   },
  { label: "슬롯",     href: "/#slot"     },
  { label: "미니게임", href: "/#minigame" },
] as const;

export function SiteHeader() {
  const b = useBootstrap();
  const router = useRouter();
  const pathname = usePathname();
  const [logged, setLogged] = useState(false);
  const [money, setMoney] = useState<number | null>(null);

  useEffect(() => {
    const ok = !!getAccessToken();
    setLogged(ok);
    if (ok) {
      void apiFetch<{ balance: string }>("/me/wallet")
        .then((w) => setMoney(Number(w.balance)))
        .catch(() => setMoney(null));
    } else {
      setMoney(null);
    }
  }, [pathname]);

  function logout() {
    clearSession();
    setLogged(false);
    setMoney(null);
    router.push("/");
  }

  if (!b) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#0a0a0e] border-b border-white/8">

      {/* ── 공통 상단 줄 ──────────────────────────────────────── */}
      <div className="flex h-12 items-center gap-3 px-3 md:h-14 md:px-4">

        {/* 로고 */}
        <Link href="/" className="shrink-0">
          {b.theme.logoUrl ? (
            <Image
              src={b.theme.logoUrl}
              alt={b.theme.siteName}
              width={90} height={24}
              unoptimized
              className="h-6 w-auto object-contain"
            />
          ) : (
            <span className="text-sm font-bold text-white">{b.theme.siteName}</span>
          )}
        </Link>

        {/* ── 데스크톱 전용: 인라인 Nav ────────────────────────── */}
        <nav className="hidden flex-1 md:flex" aria-label="주 메뉴">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex h-14 items-center px-3 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* ── 유저 영역 ─────────────────────────────────────────── */}
        <div className="ml-auto flex shrink-0 items-center gap-2 text-xs">
          {logged ? (
            <>
              {/* MONEY 잔액 */}
              <div className="hidden items-center gap-1 sm:flex">
                <span className="text-[10px] text-zinc-500">MONEY</span>
                <span className="font-mono font-bold text-[var(--theme-primary,#c9a227)]">
                  {money !== null ? money.toLocaleString("ko-KR") : "—"}
                </span>
                <span className="text-[10px] text-zinc-500">₩</span>
              </div>
              <Link href="/wallet" className="rounded border border-[var(--theme-primary,#c9a227)] px-2.5 py-1 text-[var(--theme-primary,#c9a227)]">입금</Link>
              <Link href="/wallet" className="rounded border border-white/15 px-2.5 py-1 text-zinc-300">출금</Link>
              <button type="button" onClick={logout} className="hidden rounded border border-white/10 px-2.5 py-1 text-zinc-500 md:block">로그아웃</button>
            </>
          ) : (
            <>
              <Link href="/login"  className="rounded bg-[var(--theme-primary,#c9a227)] px-3 py-1 font-bold text-black">로그인</Link>
              <Link href="/signup" className="rounded border border-white/15 px-3 py-1 text-zinc-300">회원가입</Link>
            </>
          )}
        </div>
      </div>

      {/* ── 모바일 전용: Nav 가로 스크롤 줄 ─────────────────────── */}
      <nav
        aria-label="주 메뉴"
        className="flex h-10 overflow-x-auto border-t border-white/8 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex h-full shrink-0 items-center px-4 text-sm text-zinc-400"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

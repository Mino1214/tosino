"use client";

/*
  ─── SiteHeader 규격 ──────────────────────────────
  · position : fixed top-0 left-0 right-0
  · height   : h-12 (48px)  — layout.tsx pt-12 과 맞춤
  · z-index  : z-50
  · layout   : logo | balance(center) | actions(right)
  ─────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBootstrap } from "./BootstrapProvider";
import { apiFetch, getAccessToken, clearSession } from "@/lib/api";

export function SiteHeader() {
  const b = useBootstrap();
  const router = useRouter();
  const pathname = usePathname();
  const [logged, setLogged] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    const ok = !!getAccessToken();
    setLogged(ok);
    if (ok) {
      void apiFetch<{ balance: string }>("/me/wallet")
        .then((w) => setBalance(w.balance))
        .catch(() => setBalance(null));
    } else {
      setBalance(null);
    }
  }, [pathname]);

  function logout() {
    clearSession();
    setLogged(false);
    setBalance(null);
    router.push("/");
  }

  if (!b) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-12 border-b border-white/8 bg-[#0a0a0e]/95 backdrop-blur-md">
      <div className="flex h-full items-center justify-between gap-2 px-3">

        {/* 로고 */}
        <Link href="/" className="shrink-0">
          {b.theme.logoUrl ? (
            <Image
              src={b.theme.logoUrl}
              alt={b.theme.siteName}
              width={90}
              height={24}
              unoptimized
              className="h-6 w-auto object-contain"
            />
          ) : (
            <span className="text-sm font-bold text-white">{b.theme.siteName}</span>
          )}
        </Link>

        {/* 잔액 (로그인 시) */}
        {logged && balance !== null && (
          <div className="flex-1 text-center">
            <span className="font-mono text-sm font-semibold text-[var(--theme-primary,#c9a227)]">
              {Number(balance).toLocaleString("ko-KR")}원
            </span>
          </div>
        )}

        {/* 액션 버튼 */}
        <nav className="flex shrink-0 items-center gap-1.5 text-xs">
          {logged ? (
            <>
              <Link href="/wallet" className="rounded bg-[var(--theme-primary,#c9a227)] px-2.5 py-1 font-bold text-black">충전</Link>
              <Link href="/wallet" className="rounded border border-white/15 px-2.5 py-1 text-zinc-300">출금</Link>
              <button type="button" onClick={logout} className="hidden rounded border border-white/10 px-2.5 py-1 text-zinc-500 sm:block">로그아웃</button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded bg-[var(--theme-primary,#c9a227)] px-3 py-1 font-bold text-black">로그인</Link>
              <Link href="/signup" className="hidden rounded border border-white/15 px-3 py-1 text-zinc-300 sm:block">회원가입</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

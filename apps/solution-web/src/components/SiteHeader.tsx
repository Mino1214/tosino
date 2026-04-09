"use client";

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
    const isLogged = !!getAccessToken();
    setLogged(isLogged);
    if (isLogged) {
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
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0a0e]/95 backdrop-blur-md">
      <div className="flex h-12 items-center justify-between gap-2 px-3 sm:h-14 sm:px-4">
        {/* 로고 */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {b.theme.logoUrl ? (
            <Image
              src={b.theme.logoUrl}
              alt={b.theme.siteName}
              width={100}
              height={28}
              unoptimized
              className="h-7 max-w-[7rem] object-contain object-left"
            />
          ) : (
            <span className="text-base font-bold tracking-tight text-white">
              {b.theme.siteName}
            </span>
          )}
        </Link>

        {/* 중앙 — 로그인 상태 잔액 */}
        {logged && balance !== null && (
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
              <span className="text-[10px] text-zinc-500">잔액</span>
              <span className="font-mono text-sm font-semibold text-[var(--theme-primary,#c9a227)]">
                {Number(balance).toLocaleString("ko-KR")}
              </span>
              <span className="text-[10px] text-zinc-500">원</span>
            </div>
          </div>
        )}

        {/* 오른쪽 액션 */}
        <nav className="flex shrink-0 items-center gap-1.5 text-xs">
          {logged ? (
            <>
              <Link
                href="/wallet"
                className="rounded-lg bg-[var(--theme-primary,#c9a227)] px-2.5 py-1.5 text-[11px] font-bold text-black transition hover:opacity-90 sm:px-3 sm:text-xs"
              >
                충전
              </Link>
              <Link
                href="/wallet"
                className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/5 sm:px-3 sm:text-xs"
              >
                출금
              </Link>
              <button
                type="button"
                onClick={logout}
                className="hidden rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:bg-white/5 sm:block sm:text-xs"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg bg-[var(--theme-primary,#c9a227)] px-3 py-1.5 text-[11px] font-bold text-black transition hover:opacity-90 sm:text-xs"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-lg border border-white/15 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 sm:block sm:text-xs"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

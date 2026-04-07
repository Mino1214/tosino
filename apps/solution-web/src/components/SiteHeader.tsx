"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBootstrap } from "./BootstrapProvider";
import { getAccessToken, clearSession } from "@/lib/api";

export function SiteHeader() {
  const b = useBootstrap();
  const router = useRouter();
  const pathname = usePathname();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    setLogged(!!getAccessToken());
  }, [pathname]);

  function logout() {
    clearSession();
    setLogged(false);
    router.push("/");
  }

  if (!b) return null;

  const ui = b.theme.ui;
  const pageBg = ui?.background ?? "dark";
  const isLight = pageBg === "light";
  const style = ui?.headerStyle ?? "glass";

  const bar =
    style === "solid"
      ? isLight
        ? "border-b border-zinc-200 bg-white"
        : "border-b border-zinc-800 bg-zinc-950"
      : style === "minimal"
        ? isLight
          ? "border-b border-zinc-200/80 bg-transparent"
          : "border-b border-white/5 bg-transparent"
        : isLight
          ? "border-b border-zinc-200 bg-white/80 backdrop-blur-md"
          : "border-b border-white/10 bg-black/40 backdrop-blur-md";

  const linkMuted = isLight
    ? "text-zinc-600 hover:text-zinc-900"
    : "text-zinc-400 hover:text-white";
  const linkPrimary = isLight
    ? "text-zinc-700 hover:text-[var(--theme-primary,#c9a227)]"
    : "text-zinc-400 hover:text-[var(--theme-primary,#c9a227)]";
  const walletBtn = isLight
    ? "rounded border border-zinc-300 px-2.5 py-1 text-zinc-800 hover:bg-zinc-100 sm:px-3"
    : "rounded border border-white/15 px-2.5 py-1 text-zinc-200 hover:bg-white/5 sm:px-3";
  const logoutBtn = isLight
    ? "rounded border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 sm:px-3"
    : "rounded border border-white/20 px-2.5 py-1 text-zinc-300 hover:bg-white/5 sm:px-3";

  return (
    <header className={bar}>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight"
        >
          {b.theme.logoUrl ? (
            <Image
              src={b.theme.logoUrl}
              alt=""
              width={140}
              height={36}
              unoptimized
              className="h-9 max-w-[10rem] object-contain object-left"
            />
          ) : (
            <span className={isLight ? "text-zinc-900" : "text-white"}>
              {b.theme.siteName}
            </span>
          )}
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-3">
          <Link href="/" className={linkMuted}>
            홈
          </Link>
          {!logged && (
            <Link href="/signup" className={linkPrimary}>
              회원가입
            </Link>
          )}
          {logged && (
            <Link href="/wallet" className={walletBtn}>
              충전·출금
            </Link>
          )}
          {logged ? (
            <button type="button" onClick={logout} className={logoutBtn}>
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded bg-[var(--theme-primary,#c9a227)] px-3 py-1 font-medium text-black hover:opacity-90"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

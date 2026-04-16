"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getStoredUser } from "@/lib/api";
import { userRoleLabelKo } from "@/lib/labels";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getStoredUser();
  const hideNav = pathname === "/login";
  const isConsole = pathname.startsWith("/console");

  function logout() {
    clearSession();
    router.push("/login");
  }

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#120c0a] text-zinc-100"
      style={
        {
          "--admin-header-h": "4rem",
        } as React.CSSProperties
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(225,29,72,0.16),transparent_24%),linear-gradient(180deg,#120c0a_0%,#0a0a0a_48%,#09090b_100%)]" />
      <header className="sticky top-0 z-20 shrink-0 border-b border-amber-950/40 bg-[#130d0a]/88 backdrop-blur-xl">
        <div
          className={`relative flex h-[4rem] items-center justify-between gap-4 px-4 ${
            isConsole ? "" : "mx-auto max-w-6xl"
          }`}
        >
          <nav className="flex min-w-0 flex-wrap items-center gap-3 text-sm md:gap-4">
            <Link
              href="/console"
              className="shrink-0"
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/80">
                mod.tozinosolution.com
              </span>
              <span className="mt-0.5 block font-semibold text-zinc-100">
                Solution Control Tower
              </span>
            </Link>
            {!isConsole && (
              <>
                <Link
                  href="/console"
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  HQ 대시보드
                </Link>
                <Link
                  href="/console/platforms"
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  솔루션 포트폴리오
                </Link>
              </>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500 md:gap-3">
            <div className="hidden rounded-full border border-amber-900/40 bg-amber-950/30 px-3 py-1 sm:block">
              <span className="text-[10px] uppercase tracking-[0.22em] text-amber-300/75">
                HQ
              </span>
            </div>
            <span className="hidden max-w-[140px] truncate text-zinc-400 sm:inline md:max-w-[200px]">
              {user?.loginId ?? user?.email ?? ""}
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-zinc-300">
              {userRoleLabelKo(user?.role)}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800/70"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main
        className={
          isConsole
            ? "relative flex min-h-0 flex-1 flex-col"
            : "relative mx-auto w-full max-w-6xl px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}

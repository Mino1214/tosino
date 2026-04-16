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
      className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100"
      style={
        {
          "--admin-header-h": "3.25rem",
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-20 shrink-0 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div
          className={`flex h-[3.25rem] items-center justify-between gap-4 px-4 ${
            isConsole ? "" : "mx-auto max-w-6xl"
          }`}
        >
          <nav className="flex min-w-0 flex-wrap items-center gap-3 text-sm md:gap-4">
            <Link
              href="/console/users"
              className="shrink-0 font-semibold text-amber-400"
            >
              Super Admin
            </Link>
            {!isConsole && (
              <>
                <Link
                  href="/console/users"
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  콘솔
                </Link>
                <Link
                  href="/console/platforms"
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  플랫폼
                </Link>
              </>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500 md:gap-3">
            <span className="hidden max-w-[140px] truncate sm:inline md:max-w-[200px]">
              {user?.loginId ?? user?.email ?? ""}
            </span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
              {userRoleLabelKo(user?.role)}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main
        className={
          isConsole
            ? "flex min-h-0 flex-1 flex-col"
            : "mx-auto w-full max-w-6xl px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}

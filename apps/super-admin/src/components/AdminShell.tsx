"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getStoredUser } from "@/lib/api";
import { userRoleLabelKo } from "@/lib/labels";
import { useTheme } from "@/components/ThemeProvider";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-[16px] hover:bg-gray-100 transition"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

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
    <div className="relative flex min-h-screen flex-col bg-gray-50 text-gray-900" style={{ "--admin-header-h": "3.5rem" } as React.CSSProperties}>
      <header className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-white">
        <div className={`relative flex h-14 items-center justify-between gap-4 px-4 ${isConsole ? "" : "mx-auto max-w-6xl"}`}>
          <nav className="flex min-w-0 flex-wrap items-center gap-3 md:gap-4">
            <Link href="/console" className="shrink-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-[#3182f6]">
                mod.tozinosolution.com
              </span>
              <span className="mt-0.5 block text-[16px] font-bold text-black">Solution Control Tower</span>
            </Link>
            {!isConsole && (
              <>
                <Link href="/console" className="text-[14px] font-medium text-gray-700 hover:text-black transition">HQ 대시보드</Link>
                <Link href="/console/platforms" className="text-[14px] font-medium text-gray-700 hover:text-black transition">솔루션 목록</Link>
              </>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <div className="hidden rounded-full border border-[#3182f6]/30 bg-[#3182f6]/10 px-3 py-1 sm:block">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#3182f6]">HQ</span>
            </div>
            <span className="hidden max-w-[140px] truncate text-[13px] font-medium text-gray-700 sm:inline md:max-w-[200px]">
              {user?.loginId ?? user?.email ?? ""}
            </span>
            <span className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-[13px] font-medium text-gray-800">
              {userRoleLabelKo(user?.role)}
            </span>
            <ThemeToggle />
            <button type="button" onClick={logout}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className={isConsole ? "relative flex min-h-0 flex-1 flex-col" : "relative mx-auto w-full max-w-6xl px-4 py-8"}>
        {children}
      </main>
    </div>
  );
}

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
      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-[14px] hover:bg-gray-100 transition"
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
    <div
      className="flex min-h-screen flex-col bg-white text-gray-900"
      style={{ "--admin-header-h": "3.25rem" } as React.CSSProperties}
    >
      <header className="sticky top-0 z-20 shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div
          className={`flex h-[3.25rem] items-center justify-between gap-4 px-4 ${
            isConsole ? "" : "mx-auto max-w-6xl"
          }`}
        >
          <nav className="flex min-w-0 flex-wrap items-center gap-3 text-sm md:gap-4">
            <Link
              href="/console/home"
              className="shrink-0 font-bold text-[#3182f6]"
            >
              Solution Admin
            </Link>
            {!isConsole && (
              <Link href="/console/home" className="text-gray-500 hover:text-black">
                콘솔
              </Link>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500 md:gap-3">
            <span className="hidden max-w-[140px] truncate sm:inline md:max-w-[200px]">
              {user?.loginId ?? user?.email ?? ""}
            </span>
            <span className="rounded-full bg-[#3182f6]/10 px-2 py-0.5 font-semibold text-[#3182f6]">
              {userRoleLabelKo(user?.role)}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-gray-200 px-3 py-1 text-gray-600 hover:bg-gray-100 transition"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main
        className={
          isConsole
            ? "flex min-h-0 flex-1 flex-col bg-gray-50"
            : "mx-auto w-full max-w-6xl px-4 py-8"
        }
      >
        {children}
      </main>
    </div>
  );
}

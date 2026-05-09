"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Hexagon, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AppLocale,
  coerceLocale,
  resolveLocaleFromLanguages,
} from "@/lib/browser-i18n";

interface SiteHeaderProps {
  user: HeaderUser | null;
}

type HeaderUser = { id: string; username: string };

const NAV_ITEMS = [
  { href: "/scanner", label: "스테이킹 토큰" },
  { href: "/bots", label: "트레이딩 봇" },
  { href: "/news", label: "뉴스" },
  { href: "/calendar", label: "캘린더" },
  { href: "/guide", label: "가이드" },
  { href: "/about", label: "About" },
];

const LOGGED_IN_HOME = { href: "/dashboard", label: "대시보드" };
const LOCALE_CHANGE_EVENT = "staking:locale-change";
const AUTH_CHANGE_EVENT = "staking:auth-change";

const LANGUAGE_OPTIONS: Array<{
  locale: AppLocale;
  label: string;
  name: string;
}> = [
  { locale: "ko", label: "KO", name: "한국어" },
  { locale: "en", label: "EN", name: "English" },
  { locale: "zh-CN", label: "简", name: "简体中文" },
];

export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientUser, setClientUser] = useState<HeaderUser | null | undefined>();
  const currentUser = clientUser === undefined ? user : clientUser;
  const isAdminPath = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    async function syncCurrentUser() {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json().catch(() => ({ user: null }))) as {
        user: HeaderUser | null;
      };
      setClientUser(res.ok ? data.user : null);
    }

    window.addEventListener(AUTH_CHANGE_EVENT, syncCurrentUser);
    window.addEventListener("storage", syncCurrentUser);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncCurrentUser);
      window.removeEventListener("storage", syncCurrentUser);
    };
  }, []);

  const items = isAdminPath
    ? []
    : currentUser
      ? [LOGGED_IN_HOME, ...NAV_ITEMS]
      : NAV_ITEMS;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setClientUser(null);
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
    setOpen(false);
    router.refresh();
    router.push(isAdminPath ? "/admin" : "/");
  }

  return (
    <header className="sticky top-0 z-[100] isolate w-full border-b border-black/5 bg-background/95 pointer-events-auto">
      <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={isAdminPath ? "/admin" : "/"}
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <Hexagon className="h-7 w-7 text-accent-strong" strokeWidth={2.2} />
          <span className="text-xl font-extrabold tracking-tight">
            StakingDemo
          </span>
        </Link>

        {!isAdminPath && (
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-accent-strong/12 text-accent-strong"
                      : "text-foreground/70 hover:bg-black/5 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher />
          {currentUser ? (
            <>
              <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-foreground/70">
                {currentUser.username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground"
              >
                로그아웃
              </button>
            </>
          ) : isAdminPath ? (
            <span className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-semibold text-foreground/50">
              Admin
            </span>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3.5 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-black/5 hover:text-foreground"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-accent-strong px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.02]"
              >
                회원가입
              </Link>
            </>
          )}
        </div>

        <div className="relative z-20 flex items-center gap-2 md:hidden pointer-events-auto">
          <LanguageSwitcher compact />
          <button
            type="button"
            aria-label="메뉴 열기"
            onClick={() => setOpen((v) => !v)}
            className="relative z-20 inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-black/5 touch-manipulation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="relative z-20 border-t border-black/5 bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {!isAdminPath &&
              items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-accent-strong/12 text-accent-strong"
                        : "text-foreground/80 hover:bg-black/5",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            <div className="mt-2 flex gap-2 border-t border-black/5 pt-3">
              {currentUser ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 rounded-lg bg-accent-strong px-3 py-2.5 text-sm font-semibold text-white"
                >
                  로그아웃 ({currentUser.username})
                </button>
              ) : isAdminPath ? (
                <span className="flex-1 rounded-lg bg-black/5 px-3 py-2.5 text-center text-sm font-semibold text-foreground/50">
                  Admin
                </span>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg border border-black/10 px-3 py-2.5 text-center text-sm font-semibold"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-lg bg-accent-strong px-3 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useSyncExternalStore(
    subscribeLocaleChanges,
    getBrowserLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  function selectLocale(nextLocale: AppLocale) {
    try {
      window.localStorage.setItem("staking_locale", nextLocale);
    } catch {
      /* ignore */
    }

    const url = new URL(window.location.href);
    url.searchParams.set("locale", nextLocale);
    url.searchParams.delete("lang");
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(
      new CustomEvent(LOCALE_CHANGE_EVENT, {
        detail: { locale: nextLocale },
      }),
    );
  }

  return (
    <div
      data-no-translate
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-black/10 bg-white/70 p-0.5 shadow-sm",
        compact ? "gap-0" : "gap-0.5",
      )}
      aria-label="Language selector"
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const active = locale === option.locale;
        return (
          <button
            key={option.locale}
            type="button"
            aria-label={option.name}
            aria-pressed={active}
            onClick={() => selectLocale(option.locale)}
            className={cn(
              "inline-flex h-7 items-center justify-center rounded-full px-2 text-[11px] font-bold leading-none transition-colors",
              compact ? "min-w-7" : "min-w-8",
              active
                ? "bg-foreground text-white shadow-sm"
                : "text-foreground/55 hover:bg-black/5 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function subscribeLocaleChanges(callback: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getBrowserLocaleSnapshot(): AppLocale {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = coerceLocale(params.get("locale") ?? params.get("lang"));
  if (fromQuery) return fromQuery;

  try {
    const stored = coerceLocale(window.localStorage.getItem("staking_locale"));
    if (stored) return stored;
  } catch {
    /* ignore */
  }

  return resolveLocaleFromLanguages(navigator.languages, "ko");
}

function getServerLocaleSnapshot(): AppLocale {
  return "ko";
}

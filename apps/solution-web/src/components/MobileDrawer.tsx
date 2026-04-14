"use client";

/*
  ─── MobileDrawer ───────────────────────────────────────────────
  · 로고: /main/logo.png — 크기는 globals --site-header-logo-* 와 동일(px 고정)
  · 상단: 로고만(닫기는 오버레이·햄버거) / 행 우측: 꽉 찬 삼각형(▶)
  · 하단: 로그아웃
  ─────────────────────────────────────────────────────────────────
*/

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getAccessToken, subscribeAuthChange } from "@/lib/api";
import { publicAsset } from "@/lib/public-asset";

type DrawerNavItem =
  | { label: string; href: string }
  | { label: string; href: string; external: true };

const DRAWER_NAV: DrawerNavItem[] = [
  // 스포츠/e스포츠는 임시 비노출.
  { label: "카지노", href: "/lobby/live-casino" },
  { label: "슬롯", href: "/lobby/slots" },
  { label: "미니게임", href: "/lobby/minigame" },
  { label: "마이페이지", href: "/mypage" },
  { label: "이벤트", href: "/mypage#event1" },
  { label: "배팅내역", href: "/mypage#bets" },
  { label: "고객센터", href: "https://t.me/nimo7788", external: true },
];

function ChevronRightFilled({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="currentColor" d="M9 6v12l7-6-7-6z" />
    </svg>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    const refreshAuthUi = () => {
      setLogged(!!getAccessToken());
    };

    refreshAuthUi();
    const unsubscribe = subscribeAuthChange(refreshAuthUi);

    return () => {
      unsubscribe();
    };
  }, [open, pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function logout() {
    clearSession();
    setLogged(false);
    onClose();
    router.push("/");
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[110] bg-black/70 transition-opacity duration-300 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 left-0 z-[120] flex w-64 max-w-[85vw] flex-col border-r border-[rgba(218,174,87,0.35)] bg-[#0a0806] transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-[rgba(218,174,87,0.3)] px-3">
          <Link
            href="/"
            onClick={onClose}
            aria-label="홈"
            className="flex min-w-0 flex-1 items-center justify-center leading-none"
          >
            <Image
              src={publicAsset("/main/logo.webp")}
              alt=""
              width={200}
              height={60}
              sizes="200px"
              className="site-header-logo-img"
            />
          </Link>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
          {DRAWER_NAV.map((item) => {
            const isExt = "external" in item && item.external;
            const base = item.href.split("#")[0];
            const active =
              !isExt &&
              !item.href.includes("#") &&
              (pathname === base || pathname.startsWith(`${base}/`));
            const rowClass = `flex h-12 items-center justify-between gap-2 px-4 text-sm font-medium transition-colors ${
              active
                ? "bg-[rgba(218,174,87,0.12)] text-main-gold"
                : "text-main-gold-solid hover:bg-[rgba(218,174,87,0.08)]"
            }`;

            if (isExt) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className={rowClass}
                >
                  <span>{item.label}</span>
                  <ChevronRightFilled className="h-4 w-4 shrink-0 opacity-70" />
                </a>
              );
            }

            return (
              <Link key={item.href} href={item.href} onClick={onClose} className={rowClass}>
                <span>{item.label}</span>
                <ChevronRightFilled className="h-4 w-4 shrink-0 opacity-70" />
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[rgba(218,174,87,0.25)] p-3">
          {logged ? (
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-lg bg-gold-gradient px-5 py-2.5 text-center text-sm font-bold text-[#0f0f12] transition-opacity hover:opacity-90"
            >
              로그아웃
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="block w-full rounded-lg bg-gold-gradient px-5 py-2.5 text-center text-sm font-bold text-[#0f0f12] transition-opacity hover:opacity-90"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

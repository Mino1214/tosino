"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, clearSession, getAccessToken, getStoredUser } from "@/lib/api";
import { useTheme } from "@/components/ThemeProvider";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-[15px] hover:bg-gray-100 transition"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

const NAV = [
  {
    href: "/agent/sales",
    label: "매출",
    hint: "낙첨금 · 유저손익",
  },
  {
    href: "/agent/commission-history",
    label: "정산 내역",
    hint: "수령한 정산금 이력",
  },
  {
    href: "/agent/sub-agents",
    label: "총판 / 유저",
    hint: "하위 총판 + 유저 트리",
  },
  {
    href: "/agent/betting",
    label: "배팅 현황",
    hint: "하위 회원 원장",
  },
  {
    href: "/agent/wallet-requests",
    label: "입출금 조회",
    hint: "충전·환전 신청 내역",
  },
  {
    href: "/agent/inquiries",
    label: "문의",
    hint: "1:1 문의",
  },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SessionExpiredOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onExpired() { setShow(true); }
    window.addEventListener("tosino:session-expired", onExpired);
    return () => window.removeEventListener("tosino:session-expired", onExpired);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-2xl">
        <div className="mb-4 text-4xl">🔒</div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">세션이 만료되었습니다</h2>
        <p className="mb-6 text-[14px] text-gray-500">
          보안을 위해 자동으로 로그아웃되었습니다.<br />
          다시 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = "/login"; }}
          className="w-full rounded-lg bg-[#3182f6] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-blue-600 transition"
        >
          다시 로그인
        </button>
      </div>
    </div>
  );
}

type Stats = {
  platformName: string;
  platformSlug: string;
  siteUrl: string | null;
  effectiveAgentSharePct: number;
  nestedUnderMasterAgent: boolean;
  agentPlatformSharePct: number | null;
  agentSplitFromParentPct: number | null;
  memberCount: number;
  subAgentCount?: number;
  totalBalance: string;
};

export function AgentChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hideNav = pathname === "/login";
  const user = getStoredUser();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!hideNav && (!getAccessToken() || getStoredUser()?.role !== "MASTER_AGENT")) {
      router.replace("/login");
    }
  }, [hideNav, router]);

  const loadStats = useCallback(() => {
    if (!getAccessToken() || getStoredUser()?.role !== "MASTER_AGENT") {
      setStats(null);
      return;
    }
    apiFetch<Stats>("/me/agent/stats")
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (hideNav) {
    return <>{children}</>;
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Platform info */}
      <div className="border-b border-gray-200 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          소속 플랫폼
        </p>
        {stats ? (
          <>
            <p className="mt-2 truncate text-[15px] font-bold text-black">
              {stats.platformName || stats.platformSlug || "—"}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600">
              하위 회원{" "}
              <span className="font-mono font-bold text-[#3182f6]">
                {stats.memberCount}
              </span>
              명 · 하위 총판{" "}
              <span className="font-mono font-bold text-[#3182f6]">
                {stats.subAgentCount ?? 0}
              </span>
              명
            </p>
            <p className="mt-1 text-[12px] text-gray-500">
              내 정산금{" "}
              <span className="font-mono font-semibold text-gray-800">
                ₩{Math.round(Number(stats.totalBalance)).toLocaleString("ko-KR")}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-gray-500">요약 불러오는 중…</p>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
        {stats?.siteUrl ? (
          <a
            href={stats.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileNavOpen(false)}
            className="mb-3 block rounded-lg border border-[#3182f6]/30 bg-[#3182f6]/5 px-3 py-2.5 transition hover:bg-[#3182f6]/10"
          >
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[#3182f6]">
              플랫폼 사이트
              <span className="text-[12px] font-normal text-[#3182f6]/70" aria-hidden>↗</span>
            </span>
            <span className="mt-0.5 block text-[12px] leading-tight text-gray-500">
              연결된 회원 사이트로 이동
            </span>
          </a>
        ) : stats ? (
          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="text-[14px] font-medium text-gray-500">플랫폼</p>
            <p className="mt-0.5 text-[12px] leading-tight text-gray-400">
              등록된 접속 도메인이 없습니다.
            </p>
          </div>
        ) : null}

        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
          메뉴
        </p>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 transition ${
                active
                  ? "bg-[#3182f6]/10 text-[#3182f6] ring-1 ring-[#3182f6]/30"
                  : "text-gray-900 hover:bg-gray-100"
              }`}
            >
              <span className="block text-[14px] font-semibold">{item.label}</span>
              <span className="mt-0.5 block text-[12px] leading-tight text-gray-500">
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-200 px-4 py-3">
        <p className="truncate text-[13px] font-semibold text-gray-900">{user?.loginId ?? user?.email ?? ""}</p>
        <p className="text-[11px] text-gray-500">총판 계정</p>
      </div>
    </div>
  );

  return (
    <>
      <SessionExpiredOverlay />
      <div
        className="flex min-h-screen flex-col bg-gray-50 text-gray-900"
        style={{ "--agent-header-h": "3.25rem" } as React.CSSProperties}
      >
        <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white">
          <div className="flex h-[3.25rem] items-center justify-between gap-4 px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/agent/sales"
                className="shrink-0"
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.28em] text-[#3182f6]">Agent Console</span>
                <span className="mt-0.5 block text-[16px] font-bold text-black">Tosino 총판</span>
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <span className="hidden max-w-[160px] truncate text-[13px] font-medium text-gray-700 sm:inline md:max-w-[220px]">
                {user?.loginId ?? user?.email ?? ""}
              </span>
              <ThemeToggle />
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  router.push("/login");
                }}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Mobile top bar */}
          <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 py-2.5 md:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              aria-label="메뉴 열기"
            >
              <span className="text-lg leading-none">☰</span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] text-gray-500">총판 콘솔</p>
              <p className="truncate text-[14px] font-semibold text-black">
                {stats?.platformName ?? stats?.platformSlug ?? "메뉴에서 이동"}
              </p>
            </div>
          </div>

          {mobileNavOpen && (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/30 md:hidden"
              style={{ top: "var(--agent-header-h, 3.25rem)" }}
              aria-label="메뉴 닫기"
              onClick={() => setMobileNavOpen(false)}
            />
          )}

          <aside
            className={`fixed z-50 flex w-[min(17.5rem,88vw)] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 md:static md:h-auto md:min-h-[calc(100vh-3.25rem)] md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            } bottom-0 left-0 top-[var(--agent-header-h,3.25rem)] h-[calc(100vh-var(--agent-header-h,3.25rem))] md:top-auto md:h-auto`}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 md:hidden">
              <span className="text-[14px] font-semibold text-black">메뉴</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {sidebar}
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-[calc(100vh-3.25rem)]">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

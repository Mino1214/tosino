"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, clearSession, getAccessToken, getStoredUser } from "@/lib/api";

const NAV = [
  {
    href: "/agent/members",
    label: "회원 조회",
    hint: "하위 회원 · 롤링 · 메모",
  },
  {
    href: "/agent/sub-agents",
    label: "하위 총판",
    hint: "목록 · 분배% · 신규 등록",
  },
  {
    href: "/agent/sales",
    label: "매출",
    hint: "낙첨금 · 유저손익 · 게임참고",
  },
  {
    href: "/agent/wallet-requests",
    label: "입출금 조회",
    hint: "충전·환전 신청 내역",
  },
  {
    href: "/agent/betting",
    label: "배팅 현황",
    hint: "하위 회원 원장",
  },
  {
    href: "/agent/points",
    label: "마일리지 정산",
    hint: "현 요율 · 정산 안내",
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-8 text-center shadow-2xl">
        <div className="mb-4 text-4xl">🔒</div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-100">세션이 만료되었습니다</h2>
        <p className="mb-6 text-sm text-zinc-400">
          보안을 위해 자동으로 로그아웃되었습니다.<br />
          다시 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = "/login"; }}
          className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-opacity hover:opacity-90"
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
  /** 플랫폼에 등록된 도메인 기준 회원용 사이트 URL (없으면 null) */
  siteUrl: string | null;
  /** 정산 기준 실효 총판 요율 % */
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
      <div className="border-b border-zinc-800/80 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          소속 플랫폼
        </p>
        {stats ? (
          <>
            <p className="mt-2 truncate text-sm font-medium text-zinc-100">
              {stats.platformName || stats.platformSlug || "—"}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
              하위 회원{" "}
              <span className="font-mono text-amber-200/90">
                {stats.memberCount}
              </span>
              명 · 하위 총판{" "}
              <span className="font-mono text-teal-300/90">
                {stats.subAgentCount ?? 0}
              </span>
              명
            </p>
            <p className="mt-1 text-[11px] text-zinc-600">
              회원 보유 합계{" "}
              <span className="font-mono text-zinc-400">
                {stats.totalBalance}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-zinc-600">요약 불러오는 중…</p>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
        {stats?.siteUrl ? (
          <a
            href={stats.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileNavOpen(false)}
            className="mb-3 block rounded-lg border border-teal-800/50 bg-teal-950/20 px-3 py-2.5 transition hover:bg-teal-950/35 hover:ring-1 hover:ring-teal-700/40"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-teal-200">
              플랫폼
              <span
                className="text-[11px] font-normal text-teal-500/90"
                aria-hidden
              >
                ↗
              </span>
            </span>
            <span className="mt-0.5 block line-clamp-2 text-[11px] leading-tight text-zinc-500">
              연결된 회원 사이트로 이동
            </span>
          </a>
        ) : stats ? (
          <div className="mb-3 rounded-lg border border-zinc-800/90 bg-zinc-950/40 px-3 py-2.5">
            <p className="text-sm font-medium text-zinc-500">플랫폼</p>
            <p className="mt-0.5 text-[11px] leading-tight text-zinc-600">
              등록된 접속 도메인이 없습니다. 플랫폼 관리자에게 문의하세요.
            </p>
          </div>
        ) : null}
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
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
                  ? "bg-amber-600/15 text-amber-200 ring-1 ring-amber-600/40"
                  : "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
              }`}
            >
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="mt-0.5 block line-clamp-2 text-[11px] leading-tight text-zinc-500">
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
    <SessionExpiredOverlay />
    <div
      className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100"
      style={
        {
          "--agent-header-h": "3.25rem",
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-30 shrink-0 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur">
        <div className="flex h-[3.25rem] items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/agent/members"
              className="shrink-0 font-semibold text-amber-400"
            >
              Tosino 총판
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-zinc-500 md:gap-3">
            <span className="hidden max-w-[160px] truncate sm:inline md:max-w-[220px]">
              {user?.loginId ?? user?.email ?? ""}
            </span>
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
              className="rounded border border-zinc-600 px-2 py-1 text-zinc-300 hover:bg-zinc-800"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3 py-2.5 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            aria-label="메뉴 열기"
          >
            <span className="text-lg leading-none">☰</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-zinc-500">총판 콘솔</p>
            <p className="truncate text-sm font-medium text-zinc-200">
              {stats?.platformName ?? stats?.platformSlug ?? "메뉴에서 이동"}
            </p>
          </div>
        </div>

        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
            style={{ top: "var(--agent-header-h, 3.25rem)" }}
            aria-label="메뉴 닫기"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <aside
          className={`fixed z-50 flex w-[min(17.5rem,88vw)] flex-col border-r border-zinc-800 bg-zinc-900 shadow-xl transition-transform duration-200 md:static md:h-auto md:min-h-[calc(100vh-3.25rem)] md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } bottom-0 left-0 top-[var(--agent-header-h,3.25rem)] h-[calc(100vh-var(--agent-header-h,3.25rem))] md:top-auto md:h-auto`}
        >
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 md:hidden">
            <span className="text-sm font-semibold text-zinc-200">메뉴</span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
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

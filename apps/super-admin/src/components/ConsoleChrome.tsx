"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearSession, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { inferRootHost } from "@/lib/platform-hosts";

type NavItem = {
  href: string;
  label: string;
  badgeType?: "registrations" | "inquiries";
  requiresSelection?: boolean;
  disabled?: boolean;
};

const NAV_HQ: NavItem[] = [
  { href: "/console", label: "HQ 대시보드" },
  { href: "/console/platforms", label: "솔루션 목록" },
  { href: "/console/portfolio", label: "포트폴리오 장부" },
  { href: "/console/credits", label: "알값 크레딧 허브" },
  { href: "/console/semi-virtual-accounts", label: "반가상 계좌 집계" },
  { href: "/console/odds-api-ws", label: "Live Odds (odds-api.io)" },
];

const NAV_PLATFORM: NavItem[] = [
  { href: "/console/sales", label: "청구 / 정산", requiresSelection: true },
  { href: "/console/operational", label: "알값 / 정책", requiresSelection: true },
  { href: "/console/assets", label: "반가상 설정", requiresSelection: true },
  { href: "/console/users", label: "운영 계정", requiresSelection: true },
  { href: "/console/wallet-requests", label: "입출금 승인", requiresSelection: true, disabled: true },
  { href: "/console/registrations", label: "가입 승인", requiresSelection: true, badgeType: "registrations", disabled: true },
  { href: "/console/agent-inquiries", label: "총판 문의", requiresSelection: true, badgeType: "inquiries", disabled: true },
  { href: "/console/deposit-events", label: "보너스 이벤트", requiresSelection: true, disabled: true },
  { href: "/console/announcements", label: "공지 / 팝업", requiresSelection: true, disabled: true },
];

const NAV_SYSTEM: NavItem[] = [
  { href: "/console/theme", label: "솔루션 테마", requiresSelection: true },
  { href: "/console/sync", label: "헬스체크", requiresSelection: true },
  { href: "/console/test-scenario", label: "테스트 시나리오", requiresSelection: true },
];

type RegPendingSummary = { total: number };
type InquiryPendingSummary = { total: number };

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
        <p className="mb-6 text-sm text-gray-500">보안을 위해 자동으로 로그아웃되었습니다.</p>
        <button type="button" onClick={() => { window.location.href = "/login"; }}
          className="w-full rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition">
          다시 로그인
        </button>
      </div>
    </div>
  );
}

export function ConsoleChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [regPending, setRegPending] = useState(0);
  const [inqPending, setInqPending] = useState(0);
  const { platforms, selectedPlatformId, setSelectedPlatformId, loading, error } = usePlatform();
  const userRole = getStoredUser()?.role;
  const user = getStoredUser();

  const selected = platforms.find((p) => p.id === selectedPlatformId) ?? null;

  useEffect(() => {
    if (!getAccessToken()) { router.replace("/login"); return; }
    if (userRole && userRole !== "SUPER_ADMIN") { clearSession(); router.replace("/login"); }
  }, [router, userRole]);

  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  useEffect(() => {
    if (!selectedPlatformId || !getAccessToken()) { setRegPending(0); return; }
    let cancelled = false;
    apiFetch<RegPendingSummary>(`/platforms/${selectedPlatformId}/registrations/pending/summary`)
      .then((s) => { if (!cancelled) setRegPending(s.total ?? 0); })
      .catch(() => { if (!cancelled) setRegPending(0); });
    return () => { cancelled = true; };
  }, [selectedPlatformId, pathname]);

  useEffect(() => {
    if (!selectedPlatformId || !getAccessToken()) { setInqPending(0); return; }
    let cancelled = false;
    apiFetch<InquiryPendingSummary>(`/platforms/${selectedPlatformId}/agent-inquiries/pending/summary`)
      .then((s) => { if (!cancelled) setInqPending(s.total ?? 0); })
      .catch(() => { if (!cancelled) setInqPending(0); });
    return () => { cancelled = true; };
  }, [selectedPlatformId, pathname]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function NavRow({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    const noSelection = item.requiresSelection && !selectedPlatformId;
    const isDisabled = item.disabled || noSelection;
    const badge = item.badgeType === "registrations" ? regPending : item.badgeType === "inquiries" ? inqPending : 0;

    if (isDisabled) {
      return (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${item.disabled ? "opacity-25 cursor-not-allowed" : "opacity-40"} select-none`}>
          <span className="flex-1 text-[14px] text-gray-500">{item.label}</span>
          {item.disabled && <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">준비중</span>}
        </div>
      );
    }

    return (
      <Link href={item.href}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
          active ? "bg-[#3182f6]/10 text-[#3182f6] font-bold" : "text-gray-900 hover:bg-gray-100 hover:text-black"
        }`}
      >
        <span className="flex-1 text-[14px]">{item.label}</span>
        {badge > 0 && (
          <span className="rounded-full bg-[#3182f6] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="shrink-0 border-b border-gray-200 px-5 py-4">
        <Link href="/console" className="block">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#3182f6]">Tosino HQ</p>
          <p className="mt-0.5 text-[17px] font-bold text-black">Control Tower</p>
        </Link>
      </div>

      {/* Scope picker */}
      <div className="shrink-0 border-b border-gray-200 px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Scope</p>
        <div className="space-y-0.5">
          <button type="button" onClick={() => setSelectedPlatformId(null)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
              !selectedPlatformId ? "bg-[#3182f6]/10 text-[#3182f6] font-bold" : "text-gray-900 hover:bg-gray-100"
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${!selectedPlatformId ? "bg-[#3182f6]" : "bg-gray-400"}`} />
            <span className="flex-1 text-[14px] font-medium">전체 솔루션</span>
            {!selectedPlatformId && <span className="text-[10px] font-bold text-[#3182f6]">ALL</span>}
          </button>
          {loading ? (
            <div className="px-3 py-2 text-[13px] text-gray-500">불러오는 중…</div>
          ) : (
            platforms.map((p) => {
              const active = selectedPlatformId === p.id;
              return (
                <button key={p.id} type="button" onClick={() => setSelectedPlatformId(p.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition ${
                    active ? "bg-[#3182f6]/10 text-[#3182f6] font-bold" : "text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-[#3182f6]" : "bg-gray-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{p.name}</span>
                    <span className="block truncate text-[11px] text-gray-500">
                      {inferRootHost(p) ?? p.slug}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div>
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">본사 총괄</p>
          <div className="space-y-0.5">{NAV_HQ.map((item) => <NavRow key={item.href} item={item} />)}</div>
        </div>
        <div>
          <p className={`mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.22em] ${selected ? "text-[#3182f6]" : "text-gray-400"}`}>
            {selected ? selected.name : "솔루션 선택 필요"}
          </p>
          <div className="space-y-0.5">{NAV_PLATFORM.map((item) => <NavRow key={item.href} item={item} />)}</div>
        </div>
        <div>
          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">시스템</p>
          <div className="space-y-0.5">{NAV_SYSTEM.map((item) => <NavRow key={item.href} item={item} />)}</div>
        </div>
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-gray-900">{user?.loginId ?? user?.email ?? ""}</p>
            <p className="text-[11px] text-gray-500">SUPER ADMIN</p>
          </div>
          <button type="button"
            onClick={() => { clearSession(); router.push("/login"); }}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SessionExpiredOverlay />
      <div className="flex h-screen flex-col overflow-hidden bg-gray-50">

        {/* Mobile top bar */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-blue-500">HQ</span>
            <span className="ml-2 text-sm font-bold text-gray-900">Control Tower</span>
          </div>
          <button type="button" onClick={() => setMobileNavOpen(true)}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" aria-label="메뉴 열기">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* Sidebar - desktop */}
          <aside className="hidden w-52 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
            {sidebarContent}
          </aside>

          {/* Mobile overlay */}
          {mobileNavOpen && (
            <>
              <button type="button" className="fixed inset-0 z-40 bg-black/30 md:hidden"
                aria-label="닫기" onClick={() => setMobileNavOpen(false)} />
              <aside className="fixed bottom-0 left-0 top-0 z-50 flex w-64 flex-col bg-white shadow-xl md:hidden">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <span className="text-sm font-bold text-gray-900">메뉴</span>
                  <button type="button" onClick={() => setMobileNavOpen(false)}
                    className="rounded p-1.5 text-gray-400 hover:text-gray-700">✕</button>
                </div>
                {sidebarContent}
              </aside>
            </>
          )}

          {/* Main content */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Scope indicator bar */}
            <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-[#3182f6]" : "bg-emerald-500"}`} />
                  <span className="text-[13px] font-bold text-black">
                    {selected ? selected.name : "전체 솔루션"}
                  </span>
                  {selected && (
                    <button type="button" onClick={() => setSelectedPlatformId(null)}
                      className="ml-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 transition">
                      ✕ 전체
                    </button>
                  )}
                </div>
                <div className="h-3 w-px bg-gray-300" />
                <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button type="button" onClick={() => setSelectedPlatformId(null)}
                    className={`shrink-0 rounded-full px-3 py-0.5 text-[12px] font-semibold transition ${
                      !selectedPlatformId ? "bg-[#3182f6] text-white" : "text-gray-700 hover:bg-gray-100"
                    }`}>
                    ALL
                  </button>
                  {platforms.map((p) => (
                    <button key={p.id} type="button" onClick={() => setSelectedPlatformId(p.id)}
                      className={`shrink-0 rounded-full px-3 py-0.5 text-[12px] font-semibold transition ${
                        selectedPlatformId === p.id ? "bg-[#3182f6] text-white" : "text-gray-700 hover:bg-gray-100"
                      }`}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-600">{error}</div>
            )}

            {/* Page content */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-[90rem] px-6 py-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

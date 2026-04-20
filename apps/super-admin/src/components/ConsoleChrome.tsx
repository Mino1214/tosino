"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearSession, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type NavChild = {
  href: string;
  label: string;
  hint: string;
  requiresSelection?: boolean;
  disabled?: boolean;
  badgeType?: "registrations" | "inquiries";
};

type NavGroup = {
  id: string;
  label: string;
  icon: string;
  hint: string;
  href?: string;
  children?: NavChild[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "hq",
    label: "본사 총괄",
    icon: "▦",
    hint: "대시보드 · 솔루션 · 정산",
    children: [
      { href: "/console", label: "HQ 대시보드", hint: "요약 · 바로가기" },
      { href: "/console/platforms", label: "솔루션 목록", hint: "생성 · 도메인 · 설정" },
      { href: "/console/sales", label: "청구 / 정산", hint: "전체 · 솔루션별" },
      { href: "/console/credits", label: "알값 · 크레딧", hint: "HQ 크레딧 허브" },
      { href: "/console/semi-virtual-accounts", label: "반가상 번들", hint: "전 솔루션 집계" },
      { href: "/console/odds-api-ws", label: "Live Odds", hint: "피드 · WS 안내" },
    ],
  },
  {
    id: "people",
    label: "회원 · 접근",
    icon: "◎",
    hint: "전체 회원 · 차단 · IP",
    children: [
      { href: "/console/hq-members", label: "회원 관리 (전체)", hint: "등급별 정렬 · 솔루션 필터" },
      { href: "/console/access-control", label: "차단 · IP 목록", hint: "블랙리스트 · 화이트리스트 · IP" },
    ],
  },
  {
    id: "platform",
    label: "솔루션 업무",
    icon: "✦",
    hint: "플랫폼 선택 후",
    children: [
      { href: "/console/operational", label: "알값 / 정책", hint: "요율 · 운영", requiresSelection: true },
      { href: "/console/semi/settings", label: "반가상 설정", hint: "입금 연동", requiresSelection: true },
      { href: "/console/users", label: "운영 계정", hint: "총판 · 관리자", requiresSelection: true },
      { href: "/console/wallet-requests", label: "입출금 승인", hint: "준비 중", requiresSelection: true, disabled: true },
      { href: "/console/registrations", label: "가입 승인", hint: "대기 회원", requiresSelection: true, badgeType: "registrations", disabled: true },
      { href: "/console/agent-inquiries", label: "총판 문의", hint: "1:1", requiresSelection: true, badgeType: "inquiries", disabled: true },
      { href: "/console/deposit-events", label: "보너스 이벤트", hint: "준비 중", requiresSelection: true, disabled: true },
      { href: "/console/announcements", label: "공지 / 팝업", hint: "준비 중", requiresSelection: true, disabled: true },
    ],
  },
  {
    id: "system",
    label: "시스템",
    icon: "⚙",
    hint: "점검 · 테스트",
    children: [
      { href: "/console/theme", label: "솔루션 테마", hint: "브랜딩", requiresSelection: true },
      { href: "/console/sync", label: "헬스체크", hint: "동기화 상태" },
      { href: "/console/test-scenario", label: "테스트 시나리오", hint: "시드 검증" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/console") return pathname === "/console";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  if (group.href) return isActive(pathname, group.href);
  return group.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

type RegPendingSummary = { total: number };
type InquiryPendingSummary = { total: number };

function SessionExpiredOverlay() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    function onExpired() {
      setShow(true);
    }
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
        <button
          type="button"
          onClick={() => {
            window.location.href = "/login";
          }}
          className="w-full rounded-xl bg-[#3182f6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
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
  const { selectedPlatformId, setSelectedPlatformId, error, platforms, loading } = usePlatform();
  const userRole = getStoredUser()?.role;
  const user = getStoredUser();

  const getInitialOpenGroups = () => {
    const open = new Set<string>();
    for (const g of NAV_GROUPS) {
      if (g.children && isGroupActive(pathname, g)) open.add(g.id);
    }
    return open;
  };
  const [openGroups, setOpenGroups] = useState<Set<string>>(getInitialOpenGroups);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (userRole && userRole !== "SUPER_ADMIN") {
      clearSession();
      router.replace("/login");
    }
  }, [router, userRole]);

  useEffect(() => {
    setMobileNavOpen(false);
    for (const g of NAV_GROUPS) {
      if (g.children && isGroupActive(pathname, g)) {
        setOpenGroups((prev) => {
          if (prev.has(g.id)) return prev;
          return new Set([...prev, g.id]);
        });
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (!selectedPlatformId || !getAccessToken()) {
      setRegPending(0);
      return;
    }
    let cancelled = false;
    apiFetch<RegPendingSummary>(`/platforms/${selectedPlatformId}/registrations/pending/summary`)
      .then((s) => {
        if (!cancelled) setRegPending(s.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setRegPending(0);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlatformId, pathname]);

  useEffect(() => {
    if (!selectedPlatformId || !getAccessToken()) {
      setInqPending(0);
      return;
    }
    let cancelled = false;
    apiFetch<InquiryPendingSummary>(`/platforms/${selectedPlatformId}/agent-inquiries/pending/summary`)
      .then((s) => {
        if (!cancelled) setInqPending(s.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setInqPending(0);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlatformId, pathname]);

  function childBadgeCount(child: NavChild): number {
    if (child.badgeType === "registrations") return regPending;
    if (child.badgeType === "inquiries") return inqPending;
    return 0;
  }

  function getGroupBadgeTotal(group: NavGroup): number {
    return (group.children ?? []).reduce((sum, c) => sum + childBadgeCount(c), 0);
  }

  const selected = platforms.find((p) => p.id === selectedPlatformId);

  const sidebar = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-gray-100 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">Tosino HQ</p>
        <p className="mt-1 text-[14px] font-bold text-black">Control Tower</p>
        <p className="mt-2 text-[11px] leading-snug text-gray-500">
          솔루션별 화면은 <span className="font-medium text-gray-700">솔루션 목록</span>에서 플랫폼을 고른 뒤 이용하세요.
        </p>
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <label htmlFor="hq-sidebar-platform" className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            선택된 솔루션
          </label>
          {userRole === "SUPER_ADMIN" ? (
            <>
              <select
                id="hq-sidebar-platform"
                value={selectedPlatformId ?? ""}
                onChange={(e) => setSelectedPlatformId(e.target.value || null)}
                disabled={loading && platforms.length === 0}
                className="mt-2 w-full truncate rounded-lg border border-gray-200 bg-white px-2 py-2 text-[13px] font-semibold text-black shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">— 선택 안 함 —</option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
              {!loading && platforms.length === 0 ? (
                <p className="mt-1 text-[11px] text-amber-700">등록된 솔루션이 없습니다</p>
              ) : null}
            </>
          ) : loading ? (
            <p className="mt-1 text-[12px] text-gray-400">불러오는 중…</p>
          ) : selected ? (
            <>
              <p className="mt-1 truncate text-[13px] font-semibold text-black">{selected.name}</p>
              <p className="font-mono text-[11px] text-gray-400">{selected.slug}</p>
              <p className="mt-1 text-[11px] text-gray-500">소속 솔루션 고정</p>
            </>
          ) : (
            <p className="mt-1 text-[12px] text-amber-700">미연결</p>
          )}
        </div>
      </div>

      <nav
        className="min-h-0 flex-1 touch-pan-y space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">메뉴</p>
        {NAV_GROUPS.map((group) => {
          const groupActive = isGroupActive(pathname, group);
          const groupBadge = getGroupBadgeTotal(group);
          const isOpen = openGroups.has(group.id);

          if (!group.children) {
            return null;
          }

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    return next;
                  })
                }
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                  groupActive
                    ? "bg-[#3182f6]/10 text-[#3182f6]"
                    : "text-gray-700 hover:bg-gray-100 hover:text-black"
                }`}
              >
                <span className={`shrink-0 text-[15px] leading-none ${groupActive ? "text-[#3182f6]" : "text-gray-400"}`}>
                  {group.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14px] font-semibold leading-snug">
                    {group.label}
                    {groupBadge > 0 && (
                      <span className="min-w-[1.25rem] rounded-full bg-[#3182f6] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                        {groupBadge > 99 ? "99+" : groupBadge}
                      </span>
                    )}
                  </span>
                  <span className={`mt-0.5 block text-[11px] leading-tight ${groupActive ? "text-[#3182f6]/70" : "text-gray-400"}`}>
                    {group.hint}
                  </span>
                </span>
                <span className={`shrink-0 text-[10px] text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
                  {group.children.map((child) => {
                    const childActive = isActive(pathname, child.href);
                    const noSelection = child.requiresSelection && !selectedPlatformId;
                    const isDisabled = child.disabled || noSelection;
                    const badge = childBadgeCount(child);

                    if (isDisabled) {
                      return (
                        <div
                          key={child.href}
                          className={`block rounded-lg px-2.5 py-2 ${
                            child.disabled ? "cursor-not-allowed opacity-25" : "cursor-default opacity-45"
                          }`}
                        >
                          <span className="flex items-center gap-2 text-[13px] font-semibold text-gray-500">
                            {child.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-amber-700">
                            {child.disabled ? "준비 중" : "플랫폼 선택 필요"}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block rounded-lg px-2.5 py-2 transition ${
                          childActive
                            ? "bg-[#3182f6]/10 text-[#3182f6]"
                            : "text-gray-600 hover:bg-gray-100 hover:text-black"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-[13px] font-semibold">
                          {child.label}
                          {badge > 0 && (
                            <span className="min-w-[1.25rem] rounded-full bg-[#3182f6] px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </span>
                        <span className={`mt-0.5 block line-clamp-2 text-[11px] leading-tight ${childActive ? "text-[#3182f6]/70" : "text-gray-400"}`}>
                          {child.hint}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-gray-100 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-black">{user?.loginId ?? user?.email ?? ""}</p>
            <p className="text-[10px] text-gray-500">SUPER ADMIN</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
            className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50"
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
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
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
              <p className="truncate text-xs text-gray-500">HQ · 솔루션</p>
              {userRole === "SUPER_ADMIN" ? (
                <select
                  value={selectedPlatformId ?? ""}
                  onChange={(e) => setSelectedPlatformId(e.target.value || null)}
                  disabled={loading && platforms.length === 0}
                  aria-label="솔루션 선택"
                  className="mt-0.5 w-full max-w-[min(100%,14rem)] truncate rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm font-semibold text-black"
                >
                  <option value="">선택 안 함</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="truncate text-sm font-semibold text-black">{selected?.name ?? "솔루션 미선택"}</p>
              )}
            </div>
          </div>

          {mobileNavOpen && (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              aria-label="메뉴 닫기"
              onClick={() => setMobileNavOpen(false)}
            />
          )}

          <aside
            className={`fixed z-50 flex w-[min(17.5rem,88vw)] flex-col overflow-hidden overscroll-y-contain border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            } bottom-0 left-0 top-0 h-full`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2 md:hidden">
              <span className="text-sm font-semibold text-black">메뉴</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-screen">
            {error ? (
              <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

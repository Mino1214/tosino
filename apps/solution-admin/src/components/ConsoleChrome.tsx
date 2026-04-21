"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearSession, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { useAdminConsoleMode } from "@/context/AdminConsoleModeContext";

type NavChild = {
  href: string;
  label: string;
  hint: string;
  badge?: "reg" | "inq";
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
    id: "home",
    label: "홈",
    icon: "▦",
    href: "/console/home",
    hint: "잔여알 · 핵심 지표",
  },
  {
    id: "agents",
    label: "하위 에이전트 관리",
    icon: "◈",
    hint: "등록 · 수정 · 정산",
    children: [
      { href: "/console/agents", label: "에이전트 목록/등록", hint: "하위 총판 생성·요율 설정" },
      { href: "/console/agent-settlement", label: "에이전트 정산 관리", hint: "지급 주기 설정·정산 내역" },
      { href: "/console/agent-inquiries", label: "에이전트 문의", hint: "1:1 문의·답변", badge: "inq" },
    ],
  },
  {
    id: "users",
    label: "유저 관리",
    icon: "◎",
    hint: "회원 · 입출금 · 배팅 · 차단",
    children: [
      { href: "/console/users", label: "유저 목록", hint: "회원 조회·생성·관리" },
      { href: "/console/registrations", label: "가입 승인", hint: "대기 회원 처리", badge: "reg" },
      { href: "/console/blacklist", label: "블랙리스트", hint: "차단 유저 관리" },
    ],
  },
  {
    id: "blocked-ips",
    label: "차단 IP",
    icon: "⊘",
    href: "/console/blocked-ips",
    hint: "화이트리스트 · 블랙리스트",
  },
  {
    id: "wallet",
    label: "입출금 관리",
    icon: "⇅",
    hint: "입출금 · 반가상 · 매출",
    children: [
      { href: "/console/wallet-requests", label: "입출금 내역", hint: "충전·출금 요청 처리" },
      { href: "/console/semi/usdt-deposits", label: "반가상 내역", hint: "설정·이력·USDT·SMS" },
      { href: "/console/sales", label: "매출 내역", hint: "입출금·포인트·콤프·에이전트 정산" },
      { href: "/console/credits", label: "알 관리", hint: "구매·사용 내역" },
    ],
  },
  {
    id: "solution",
    label: "솔루션 제어",
    icon: "✦",
    hint: "공지 · 운영 설정 · 이벤트",
    children: [
      { href: "/console/live-odds", label: "Live Odds / Slip", hint: "odds-api 필터·슬립 템플릿" },
      { href: "/console/announcements", label: "공지/팝업", hint: "공지사항·팝업 관리" },
      { href: "/console/operational", label: "운영 설정", hint: "포인트·콤프·롤링 설정" },
      { href: "/console/deposit-events", label: "특수이벤트 설정", hint: "추후 토너먼트로 개편 예정" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, group: NavGroup): boolean {
  if (group.href) return isActive(pathname, group.href);
  return group.children?.some((c) => isActive(pathname, c.href)) ?? false;
}

type RegPendingSummary = {
  total: number;
  groups: Array<{
    parentUserId: string | null;
    label: string;
    referralCode: string | null;
    count: number;
  }>;
};

type InquiryPendingSummary = {
  total: number;
  groups: Array<{
    agentUserId: string;
    label: string;
    email: string;
    referralCode: string | null;
    count: number;
  }>;
};

/** 세션 만료 오버레이 — 깜박임 없이 전체화면 블로킹 */
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-2xl">
        <div className="mb-4 text-4xl">🔒</div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          세션이 만료되었습니다
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          보안을 위해 자동으로 로그아웃되었습니다.
          <br />
          다시 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = "/login"; }}
          className="w-full rounded-lg bg-[#3182f6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
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
  const [regPendingSummary, setRegPendingSummary] =
    useState<RegPendingSummary | null>(null);
  const [inqPendingSummary, setInqPendingSummary] =
    useState<InquiryPendingSummary | null>(null);

  const getInitialOpenGroups = () => {
    const open = new Set<string>();
    for (const g of NAV_GROUPS) {
      if (g.children && isGroupActive(pathname, g)) open.add(g.id);
    }
    return open;
  };
  const [openGroups, setOpenGroups] = useState<Set<string>>(getInitialOpenGroups);

  const {
    platforms,
    selectedPlatformId,
    loading,
    error: platformListError,
  } = usePlatform();
  const { mode, setMode } = useAdminConsoleMode();
  const userRole = getStoredUser()?.role;
  const isPlatformAdmin = userRole === "PLATFORM_ADMIN";

  const selected = platforms.find((p) => p.id === selectedPlatformId);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (userRole && userRole !== "PLATFORM_ADMIN") {
      clearSession();
      router.replace("/login");
    }
  }, [router, userRole]);

  useEffect(() => {
    if (mode !== "standard") {
      setMode("standard");
    }
  }, [mode, setMode]);

  useEffect(() => {
    setMobileNavOpen(false);
    // auto-expand the group that contains the current route
    for (const g of NAV_GROUPS) {
      if (g.children && isGroupActive(pathname, g)) {
        setOpenGroups((prev) => {
          if (prev.has(g.id)) return prev;
          return new Set([...prev, g.id]);
        });
      }
    }
  }, [pathname]);

  /** 모바일 메뉴 열림 시 본문(body) 스크롤 차단 — 제스처가 뒤 콘텐츠로 전달되는 문제 방지 */
  useEffect(() => {
    if (!mobileNavOpen) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    const prevOverscroll = html.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      html.style.overscrollBehavior = prevOverscroll;
    };
  }, [mobileNavOpen]);

  const canSeeRegistrations = isPlatformAdmin;

  useEffect(() => {
    if (!canSeeRegistrations || !selectedPlatformId || !getAccessToken()) {
      setRegPendingSummary(null);
      return;
    }
    let cancelled = false;
    apiFetch<RegPendingSummary>(
      `/platforms/${selectedPlatformId}/registrations/pending/summary`,
    )
      .then((s) => {
        if (!cancelled) setRegPendingSummary(s);
      })
      .catch(() => {
        if (!cancelled) setRegPendingSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlatformId, canSeeRegistrations, pathname]);

  useEffect(() => {
    if (!canSeeRegistrations || !selectedPlatformId || !getAccessToken()) {
      setInqPendingSummary(null);
      return;
    }
    let cancelled = false;
    apiFetch<InquiryPendingSummary>(
      `/platforms/${selectedPlatformId}/agent-inquiries/pending/summary`,
    )
      .then((s) => {
        if (!cancelled) setInqPendingSummary(s);
      })
      .catch(() => {
        if (!cancelled) setInqPendingSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlatformId, canSeeRegistrations, pathname]);

  const regBreakdown =
    regPendingSummary && regPendingSummary.total > 0
      ? regPendingSummary.groups
          .map((g) => (g.referralCode ? `${g.referralCode} ${g.count}명` : `${g.label} ${g.count}명`))
          .join(" · ")
      : null;
  const inqBreakdown =
    inqPendingSummary && inqPendingSummary.total > 0
      ? inqPendingSummary.groups
          .map((g) => (g.referralCode ? `${g.referralCode} ${g.count}건` : `${g.label} ${g.count}건`))
          .join(" · ")
      : null;

  function getBadge(badge?: "reg" | "inq") {
    if (badge === "reg") return regPendingSummary?.total ?? 0;
    if (badge === "inq") return inqPendingSummary?.total ?? 0;
    return 0;
  }

  function getChildHint(child: NavChild): string {
    if (child.badge === "reg" && regBreakdown)
      return `대기 ${regPendingSummary!.total}건 · ${regBreakdown}`;
    if (child.badge === "inq" && inqBreakdown)
      return `미답변 ${inqPendingSummary!.total}건 · ${inqBreakdown}`;
    return child.hint;
  }

  function getGroupBadgeTotal(group: NavGroup): number {
    return (
      (group.children ?? []).reduce((sum, c) => sum + getBadge(c.badge), 0)
    );
  }

  const sidebar = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 플랫폼 정보 */}
      <div className="shrink-0 border-b border-gray-100 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">
          Solution Admin
        </p>
        {selected ? (
          <div className="mt-2">
            <p className="truncate text-[14px] font-bold text-black">{selected.name}</p>
            <p className="mt-0.5 text-[11px] font-mono text-gray-400">{selected.slug}</p>
          </div>
        ) : loading ? (
          <p className="mt-2 text-[12px] text-gray-400">로딩 중…</p>
        ) : selectedPlatformId ? (
          <div className="mt-2 space-y-1 text-[12px] text-gray-500">
            <p className="font-mono text-[11px] text-gray-400">
              id {selectedPlatformId.slice(0, 12)}…
            </p>
            {platformListError ? (
              <p className="text-red-500">{platformListError}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-gray-400">플랫폼 없음</p>
        )}
      </div>

      <nav
        className="min-h-0 flex-1 touch-pan-y space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          메뉴
        </p>
        {NAV_GROUPS.map((group) => {
          const groupActive = isGroupActive(pathname, group);
          const groupBadge = getGroupBadgeTotal(group);
          const isOpen = openGroups.has(group.id);

          if (!group.children) {
            // 단일 링크 (홈, 결제요청)
            return (
              <Link
                key={group.id}
                href={group.href!}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition ${
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
                  </span>
                  <span className={`mt-0.5 block text-[11px] leading-tight ${groupActive ? "text-[#3182f6]/70" : "text-gray-400"}`}>
                    {group.hint}
                  </span>
                </span>
              </Link>
            );
          }

          // 아코디언 그룹
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
                    const badge = getBadge(child.badge);
                    const hintLine = getChildHint(child);
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
                            <span
                              className="min-w-[1.25rem] rounded-full bg-[#3182f6] px-1.5 py-0.5 text-center text-[10px] font-bold text-white"
                              title={hintLine}
                            >
                              {badge > 99 ? "99+" : badge}
                            </span>
                          )}
                        </span>
                        <span className={`mt-0.5 block line-clamp-2 text-[11px] leading-tight ${childActive ? "text-[#3182f6]/70" : "text-gray-400"}`}>
                          {hintLine}
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
    </div>
  );

  return (
    <>
      <SessionExpiredOverlay />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* 모바일: 메뉴 열기 바 */}
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
            <p className="truncate text-xs text-gray-500">솔루션</p>
            <p className="truncate text-sm font-semibold text-black">
              {selected?.name ?? "선택 필요"}
            </p>
          </div>
        </div>

        {/* 모바일 딤 */}
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 touch-none bg-black/50 md:hidden"
            style={{ top: "var(--admin-header-h, 3.25rem)" }}
            aria-label="메뉴 닫기"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* 좌측 사이드바 */}
        <aside
          className={`fixed z-50 flex w-[min(17.5rem,88vw)] flex-col overflow-hidden overscroll-y-contain border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } bottom-0 left-0 top-[3.25rem] h-[calc(100dvh-3.25rem)] md:top-0 md:h-screen`}
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

        {/* 본문 */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-[calc(100vh-3.25rem)] bg-gray-50">
          {platformListError && (
            <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {platformListError}
            </div>
          )}
          {!loading && platforms.length > 0 && !selectedPlatformId && (
            <div className="shrink-0 border-b border-[#3182f6]/20 bg-[#3182f6]/5 px-4 py-3 text-sm text-[#3182f6]">
              플랫폼을 불러오는 중입니다…
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

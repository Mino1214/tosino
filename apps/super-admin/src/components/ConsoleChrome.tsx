"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearSession, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { inferRootHost } from "@/lib/platform-hosts";

type NavItem = {
  href: string;
  label: string;
  hint: string;
  badgeType?: "registrations" | "inquiries";
};

const NAV_PRIMARY: NavItem[] = [
  {
    href: "/console",
    label: "본사 대시보드",
    hint: "전체 솔루션 통합 매출과 본사 순마진",
  },
  {
    href: "/console/platforms",
    label: "솔루션 관리",
    hint: "도메인 · 상태 · 운영 진입점",
  },
  {
    href: "/console/operational",
    label: "알값 관리",
    hint: "상위 알 · 자동 마진 · 플랫폼 정책",
  },
  {
    href: "/console/sales",
    label: "전체 매출 / 정산",
    hint: "청구 · 원가 · 정산 원장",
  },
  {
    href: "/console/assets",
    label: "자산 관리",
    hint: "반가상 · 테더 · 입출금 운영 허브",
  },
  {
    href: "/console/users",
    label: "운영 계정 · 회원",
    hint: "solution-admin · 총판 · 회원 계정",
  },
] as const;

const NAV_OPERATIONS: NavItem[] = [
  {
    href: "/console/wallet-requests",
    label: "입출금 운영",
    hint: "충전 · 환전 승인",
  },
  {
    href: "/console/registrations",
    label: "가입 승인",
    hint: "솔루션별 승인 대기 회원",
    badgeType: "registrations",
  },
  {
    href: "/console/agent-inquiries",
    label: "에이전트 문의",
    hint: "총판 1:1 문의와 미답변 현황",
    badgeType: "inquiries",
  },
  {
    href: "/console/deposit-events",
    label: "보너스 / 이벤트",
    hint: "첫충 · 구간 보너스 · 캠페인",
  },
  {
    href: "/console/announcements",
    label: "공지 팝업",
    hint: "솔루션 공지와 팝업 이미지",
  },
] as const;

const NAV_SYSTEM: NavItem[] = [
  {
    href: "/console/theme",
    label: "솔루션 테마",
    hint: "메인 UI · 배너 · 브랜딩",
  },
  {
    href: "/console/sync",
    label: "도메인 / 배포",
    hint: "서버 상태 · 연동 체크",
  },
  {
    href: "/console/test-scenario",
    label: "테스트 시나리오",
    hint: "내부 점검용 전체 플로우",
  },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-8 text-center shadow-2xl">
        <div className="mb-4 text-4xl">🔒</div>
        <h2 className="mb-2 text-lg font-semibold text-zinc-100">
          세션이 만료되었습니다
        </h2>
        <p className="mb-6 text-sm text-zinc-400">
          보안을 위해 자동으로 로그아웃되었습니다.
          <br />
          다시 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/login";
          }}
          className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-opacity hover:opacity-90"
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
  const {
    platforms,
    selectedPlatformId,
    loading,
    error,
  } = usePlatform();
  const userRole = getStoredUser()?.role;

  const selected = platforms.find((p) => p.id === selectedPlatformId);

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
  }, [pathname]);

  const canSeeRegistrations = userRole === "SUPER_ADMIN";

  useEffect(() => {
    if (
      !canSeeRegistrations ||
      !selectedPlatformId ||
      !getAccessToken()
    ) {
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
    if (
      !canSeeRegistrations ||
      !selectedPlatformId ||
      !getAccessToken()
    ) {
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

  function renderNavItem(item: NavItem) {
    const active = isActive(pathname, item.href);
    const regTotal = item.badgeType === "registrations" ? regPendingSummary?.total ?? 0 : 0;
    const inqTotal = item.badgeType === "inquiries" ? inqPendingSummary?.total ?? 0 : 0;
    const regBreakdown =
      item.badgeType === "registrations" &&
      regPendingSummary &&
      regPendingSummary.total > 0
        ? regPendingSummary.groups
            .map((g) =>
              g.referralCode ? `${g.referralCode} ${g.count}명` : `${g.label} ${g.count}명`,
            )
            .join(" · ")
        : null;
    const inqBreakdown =
      item.badgeType === "inquiries" && inqPendingSummary && inqPendingSummary.total > 0
        ? inqPendingSummary.groups
            .map((g) =>
              g.referralCode ? `${g.referralCode} ${g.count}건` : `${g.label} ${g.count}건`,
            )
            .join(" · ")
        : null;
    const badgeTotal =
      item.badgeType === "registrations"
        ? regTotal
        : item.badgeType === "inquiries"
          ? inqTotal
          : 0;
    const badgeTitle =
      item.badgeType === "registrations"
        ? regBreakdown ?? ""
        : item.badgeType === "inquiries"
          ? inqBreakdown ?? ""
          : "";
    const hintLine =
      item.badgeType === "registrations" && regBreakdown
        ? `대기 ${regTotal}건 · ${regBreakdown}`
        : item.badgeType === "inquiries" && inqBreakdown
          ? `미답변 ${inqTotal}건 · ${inqBreakdown}`
          : item.hint;
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
        <span className="flex items-center gap-2 text-sm font-medium">
          {item.label}
          {badgeTotal > 0 && (
            <span
              className="min-w-[1.25rem] rounded-full bg-amber-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-zinc-950"
              title={badgeTitle}
            >
              {badgeTotal > 99 ? "99+" : badgeTotal}
            </span>
          )}
        </span>
        <span className="mt-0.5 block line-clamp-2 text-[11px] leading-tight text-zinc-500">
          {hintLine}
        </span>
      </Link>
    );
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-800/80 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          선택 솔루션
        </p>
        {selected ? (
          <>
            <p className="mt-2 truncate text-sm font-medium text-zinc-100">
              {selected.name}
              <span className="ml-2 text-xs text-zinc-600">{selected.slug}</span>
            </p>
            <p className="mt-1 truncate font-mono text-[11px] text-zinc-500">
              {inferRootHost(selected) ?? "도메인 미지정"}
            </p>
          </>
        ) : loading ? (
          <p className="mt-2 text-xs text-zinc-600">로딩 중…</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-600">선택된 솔루션 없음</p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
          본사 총괄 메뉴는 모든 솔루션을 기준으로 보이고, 선택된 솔루션은 상세
          운영 화면에서 바로 이어집니다.
        </p>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          본사 총괄
        </p>
        {NAV_PRIMARY.map(renderNavItem)}
        <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          운영 도구
        </p>
        {NAV_OPERATIONS.map(renderNavItem)}
        <p className="mb-2 mt-5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          시스템
        </p>
        {NAV_SYSTEM.map(renderNavItem)}
      </nav>
    </div>
  );

  return (
    <>
      <SessionExpiredOverlay />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* 모바일: 메뉴 열기 바 */}
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
            <p className="truncate text-xs text-zinc-500">
              Head Office
            </p>
            <p className="truncate text-sm font-medium text-zinc-200">
              {selected?.name ?? "전체 솔루션"}
            </p>
          </div>
        </div>

        {/* 모바일 딤 */}
        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
            style={{ top: "var(--admin-header-h, 3.25rem)" }}
            aria-label="메뉴 닫기"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* 좌측 사이드바 */}
        <aside
          className={`fixed z-50 flex w-[min(17.5rem,88vw)] flex-col border-r border-zinc-800 bg-zinc-900 shadow-xl transition-transform duration-200 md:static md:h-auto md:min-h-[calc(100vh-3.25rem)] md:w-60 md:shrink-0 md:translate-x-0 md:shadow-none ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } bottom-0 left-0 top-[3.25rem] h-[calc(100vh-3.25rem)] md:top-auto md:h-auto`}
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{sidebar}</div>
        </aside>

        {/* 본문 */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-[calc(100vh-3.25rem)]">
          {error && (
            <div className="shrink-0 border-b border-red-900/40 bg-red-950/30 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {!loading && platforms.length > 0 && !selectedPlatformId && (
            <div className="shrink-0 border-b border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              선택된 솔루션이 없어서 총괄 화면 기준으로 표시됩니다.
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <div className="mx-auto max-w-[92rem]">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

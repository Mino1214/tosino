"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { useAdminConsoleMode } from "@/context/AdminConsoleModeContext";

/** 테마·플랫폼 관리·서버상태는 슈퍼관리자 통합 후 재추가 예정 */
const NAV = [
  {
    href: "/console/sales",
    label: "매출 현황",
    hint: "하우스수익 · 배팅내역 · 총판정산",
  },
  {
    href: "/console/users",
    label: "유저",
    hint: "계정 · 총판 · 추천코드",
  },
  {
    href: "/console/registrations",
    label: "가입 승인",
    hint: "대기 회원 처리",
  },
  {
    href: "/console/agent-inquiries",
    label: "총판 문의",
    hint: "1:1 문의 · 답변",
  },
  {
    href: "/console/wallet-requests",
    label: "입·출금",
    hint: "충전·출금 요청",
  },
  {
    href: "/console/operational",
    label: "운영 설정",
    hint: "롤링 · 콤프 · 포인트",
  },
  {
    href: "/console/deposit-events",
    label: "입금 이벤트",
    hint: "첫충 · 기간한정 · 보너스 구간",
  },
  {
    href: "/console/announcements",
    label: "공지 팝업",
    hint: "모바일 이미지 최대 4장",
  },
] as const;

const NAV_MASTER = [
  {
    href: "/console/operational",
    label: "운영 설정",
    hint: "롤링 · 콤프 · 포인트",
  },
  {
    href: "/console/users",
    label: "유저",
    hint: "직속 회원 · 총판 목록",
  },
] as const;

const NAV_SEMI = [
  {
    href: "/console/semi/settings",
    label: "반가상 설정",
    hint: "수신 번호·계좌 힌트",
  },
  {
    href: "/console/semi/sms-log",
    label: "SMS 로그",
    hint: "은행 문자 처리 기록",
  },
  {
    href: "/console/semi/usdt-deposits",
    label: "USDT 입금",
    hint: "온체인 입금 감지·수동승인",
  },
  {
    href: "/console/wallet-requests",
    label: "입·출금",
    hint: "대기 건 · 수동 승인",
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
  const { mode, setMode } = useAdminConsoleMode();
  const userRole = getStoredUser()?.role;
  const isMaster = userRole === "MASTER_AGENT";
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const navItems = isMaster ? NAV_MASTER : mode === "semiVirtual" ? NAV_SEMI : NAV;

  const selected = platforms.find((p) => p.id === selectedPlatformId);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (isMaster && mode !== "standard") {
      setMode("standard");
    }
  }, [isMaster, mode, setMode]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const canSeeRegistrations =
    userRole === "SUPER_ADMIN" || userRole === "PLATFORM_ADMIN";

  useEffect(() => {
    if (
      !canSeeRegistrations ||
      !selectedPlatformId ||
      !getAccessToken() ||
      mode === "semiVirtual"
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
  }, [selectedPlatformId, canSeeRegistrations, mode, pathname]);

  useEffect(() => {
    if (
      !canSeeRegistrations ||
      !selectedPlatformId ||
      !getAccessToken() ||
      mode === "semiVirtual"
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
  }, [selectedPlatformId, canSeeRegistrations, mode, pathname]);

  const sidebar = (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* 플랫폼 정보 (선택 없이 표시만) */}
      <div className="border-b border-zinc-800/80 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          플랫폼
        </p>
        {selected ? (
          <p className="mt-2 truncate text-sm font-medium text-zinc-100">
            {selected.name}
            <span className="ml-2 text-xs text-zinc-600">{selected.slug}</span>
          </p>
        ) : loading ? (
          <p className="mt-2 text-xs text-zinc-600">로딩 중…</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-600">플랫폼 없음</p>
        )}

        {!isMaster && (
          <div className="mt-3 flex gap-0.5 rounded-lg bg-zinc-950 p-0.5 ring-1 ring-zinc-800">
            <button
              type="button"
              onClick={() => setMode("standard")}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                mode === "standard"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              플랫폼
            </button>
            <button
              type="button"
              onClick={() => setMode("semiVirtual")}
              className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                mode === "semiVirtual"
                  ? "bg-violet-950/80 text-violet-200 ring-1 ring-violet-800/60"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              반가상
            </button>
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          {mode === "semiVirtual" ? "반가상 메뉴" : "메뉴"}
        </p>
        {isSuperAdmin && (
          <>
            <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              슈퍼관리자
            </p>
            <Link
              href="/console/test-scenario"
              className={`block rounded-lg px-3 py-2.5 transition ${
                isActive(pathname, "/console/test-scenario")
                  ? "bg-violet-600/20 text-violet-200 ring-1 ring-violet-600/40"
                  : "text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                🧪 테스트 시나리오
              </span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">
                단계별 전체 플로우 테스트
              </span>
            </Link>
          </>
        )}
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const isReg = item.href === "/console/registrations";
          const isInq = item.href === "/console/agent-inquiries";
          const regTotal = isReg ? regPendingSummary?.total ?? 0 : 0;
          const inqTotal = isInq ? inqPendingSummary?.total ?? 0 : 0;
          const regBreakdown =
            isReg && regPendingSummary && regPendingSummary.total > 0
              ? regPendingSummary.groups
                  .map((g) =>
                    g.referralCode
                      ? `${g.referralCode} ${g.count}명`
                      : `${g.label} ${g.count}명`,
                  )
                  .join(" · ")
              : null;
          const inqBreakdown =
            isInq && inqPendingSummary && inqPendingSummary.total > 0
              ? inqPendingSummary.groups
                  .map((g) =>
                    g.referralCode
                      ? `${g.referralCode} ${g.count}건`
                      : `${g.label} ${g.count}건`,
                  )
                  .join(" · ")
              : null;
          const badgeTotal = isReg ? regTotal : isInq ? inqTotal : 0;
          const badgeTitle = isReg
            ? (regBreakdown ?? "")
            : isInq
              ? (inqBreakdown ?? "")
              : "";
          const hintLine =
            isReg && regBreakdown
              ? `대기 ${regTotal}건 · ${regBreakdown}`
              : isInq && inqBreakdown
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
        })}
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
              {mode === "semiVirtual" ? "반가상" : "플랫폼"}
            </p>
            <p className="truncate text-sm font-medium text-zinc-200">
              {selected?.name ?? "선택 필요"}
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

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, clearSession, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { inferAdminHost, inferAgentHost, inferRootHost } from "@/lib/platform-hosts";

type NavItem = {
  href: string;
  label: string;
  hint: string;
  badgeType?: "registrations" | "inquiries";
  requiresSelection?: boolean;
};

const NAV_PRIMARY: NavItem[] = [
  {
    href: "/console",
    label: "HQ 대시보드",
    hint: "전체 솔루션 합산 매출과 본사 순마진",
  },
  {
    href: "/console/platforms",
    label: "솔루션 포트폴리오",
    hint: "도메인 · 상태 · 알값 · 운영 진입점",
  },
  {
    href: "/console/operational",
    label: "알값 / 정책 센터",
    hint: "상위 알 · 자동 마진 · 롤링/콤프/포인트",
    requiresSelection: true,
  },
  {
    href: "/console/sales",
    label: "청구 / 정산 센터",
    hint: "솔루션 손익 · 상위 원가 · 청구 원장",
    requiresSelection: true,
  },
  {
    href: "/console/assets",
    label: "자산 배정 허브",
    hint: "반가상 · USDT · 계좌 배정 상태",
    requiresSelection: true,
  },
  {
    href: "/console/users",
    label: "운영 계정 / 회원",
    hint: "solution-admin · 총판 · 회원 드릴다운",
    requiresSelection: true,
  },
] as const;

const NAV_DRILLDOWN: NavItem[] = [
  {
    href: "/console/wallet-requests",
    label: "입출금 운영",
    hint: "선택 솔루션의 충전 · 환전 승인",
    requiresSelection: true,
  },
  {
    href: "/console/registrations",
    label: "가입 승인",
    hint: "선택 솔루션의 대기 회원 처리",
    badgeType: "registrations",
    requiresSelection: true,
  },
  {
    href: "/console/agent-inquiries",
    label: "총판 문의",
    hint: "선택 솔루션의 미답변 문의",
    badgeType: "inquiries",
    requiresSelection: true,
  },
  {
    href: "/console/deposit-events",
    label: "보너스 / 이벤트",
    hint: "첫충 · 구간 포인트 · 지급 정책",
    requiresSelection: true,
  },
  {
    href: "/console/announcements",
    label: "공지 / 팝업",
    hint: "선택 솔루션 공지와 팝업 관리",
    requiresSelection: true,
  },
] as const;

const NAV_SYSTEM: NavItem[] = [
  {
    href: "/console/theme",
    label: "솔루션 테마",
    hint: "메인 UI · 배너 · 브랜딩",
    requiresSelection: true,
  },
  {
    href: "/console/sync",
    label: "도메인 / 배포",
    hint: "도메인 연결 · 서버 상태 · 연동 체크",
    requiresSelection: true,
  },
  {
    href: "/console/test-scenario",
    label: "테스트 시나리오",
    hint: "내부 QA용 계정/거래 플로우",
    requiresSelection: true,
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

function SectionHeading({
  eyebrow,
  title,
  caption,
}: {
  eyebrow: string;
  title: string;
  caption: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/70">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-sm font-semibold text-zinc-100">{title}</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{caption}</p>
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
    setSelectedPlatformId,
    loading,
    error,
  } = usePlatform();
  const userRole = getStoredUser()?.role;

  const selected = platforms.find((p) => p.id === selectedPlatformId) ?? null;

  const counts = useMemo(
    () => ({
      solutions: platforms.length,
      domains: platforms.filter((platform) => inferRootHost(platform)).length,
      previews: platforms.filter((platform) => platform.previewPort != null).length,
    }),
    [platforms],
  );

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

  function renderNavItem(item: NavItem, tone: "amber" | "zinc" = "zinc") {
    const active = isActive(pathname, item.href);
    const disabled = item.requiresSelection && !selectedPlatformId;
    const regTotal =
      item.badgeType === "registrations" ? regPendingSummary?.total ?? 0 : 0;
    const inqTotal = item.badgeType === "inquiries" ? inqPendingSummary?.total ?? 0 : 0;
    const badgeTotal =
      item.badgeType === "registrations"
        ? regTotal
        : item.badgeType === "inquiries"
          ? inqTotal
          : 0;
    const baseClass =
      tone === "amber"
        ? active
          ? "border-amber-700/40 bg-amber-950/35 text-amber-100"
          : "border-zinc-800 bg-black/20 text-zinc-200 hover:border-amber-800/40 hover:bg-amber-950/15"
        : active
          ? "border-zinc-700 bg-zinc-900/90 text-zinc-100"
          : "border-zinc-800 bg-black/20 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/60";

    const body = (
      <>
        <span className="flex items-center gap-2 text-sm font-medium">
          {item.label}
          {badgeTotal > 0 ? (
            <span className="min-w-[1.25rem] rounded-full bg-amber-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-[#130d0a]">
              {badgeTotal > 99 ? "99+" : badgeTotal}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-[11px] leading-tight text-zinc-500">
          {disabled ? "먼저 솔루션을 선택해야 이동할 수 있습니다." : item.hint}
        </span>
      </>
    );

    if (disabled) {
      return (
        <div
          key={item.href}
          className="rounded-2xl border border-dashed border-zinc-800 bg-black/10 px-4 py-3 opacity-60"
        >
          {body}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`block rounded-2xl border px-4 py-3 transition ${baseClass}`}
      >
        {body}
      </Link>
    );
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <section className="rounded-3xl border border-amber-900/40 bg-[linear-gradient(180deg,rgba(113,63,18,0.20),rgba(24,24,27,0.45))] p-4">
        <SectionHeading
          eyebrow="Selected Scope"
          title={selected ? selected.name : "전체 솔루션 모드"}
          caption={
            selected
              ? "이 아래 드릴다운 메뉴는 선택된 솔루션 운영 화면으로 바로 이어집니다."
              : "본사 집계와 솔루션 포트폴리오를 먼저 보고, 필요할 때만 솔루션을 선택하세요."
          }
        />
        <div className="mt-4 space-y-3 text-xs">
          <div className="rounded-2xl border border-zinc-800 bg-black/20 px-3 py-3">
            <p className="text-zinc-500">유저 도메인</p>
            <p className="mt-1 break-all font-mono text-zinc-100">
              {selected ? inferRootHost(selected) ?? "—" : "ALL SOLUTIONS"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-2xl border border-zinc-800 bg-black/20 px-3 py-3">
              <p className="text-zinc-500">솔루션 어드민</p>
              <p className="mt-1 break-all font-mono text-zinc-100">
                {selected ? inferAdminHost(selected) ?? "—" : "mod.<solution-domain>"}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/20 px-3 py-3">
              <p className="text-zinc-500">에이전트</p>
              <p className="mt-1 break-all font-mono text-zinc-100">
                {selected ? inferAgentHost(selected) ?? "—" : "agent.<solution-domain>"}
              </p>
            </div>
          </div>
          {selected ? (
            <button
              type="button"
              onClick={() => setSelectedPlatformId(null)}
              className="w-full rounded-2xl border border-amber-800/40 bg-amber-950/25 px-3 py-2 text-left text-amber-100 hover:bg-amber-950/35"
            >
              전체 솔루션 모드로 돌아가기
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/75 p-4">
        <SectionHeading
          eyebrow="Head Office"
          title="본사 총괄 메뉴"
          caption="솔루션 포트폴리오, 알값, 청구, 자산 배정처럼 HQ에서만 보는 기능입니다."
        />
        <div className="mt-4 space-y-3">{NAV_PRIMARY.map((item) => renderNavItem(item, "amber"))}</div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/75 p-4">
        <SectionHeading
          eyebrow="Drill-down"
          title="선택 솔루션 운영"
          caption="solution-admin이 보는 실무 운영을 본사에서 직접 들여다보는 영역입니다."
        />
        <div className="mt-4 space-y-3">{NAV_DRILLDOWN.map((item) => renderNavItem(item))}</div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/75 p-4">
        <SectionHeading
          eyebrow="Infrastructure"
          title="브랜딩 / 배포 / QA"
          caption="도메인 연결, 테마, 테스트 시나리오 같은 시스템 작업입니다."
        />
        <div className="mt-4 space-y-3">{NAV_SYSTEM.map((item) => renderNavItem(item))}</div>
      </section>
    </div>
  );

  return (
    <>
      <SessionExpiredOverlay />
      <div className="flex min-h-0 flex-1 flex-col">
        <section className="border-b border-amber-950/40 bg-[linear-gradient(180deg,rgba(68,38,15,0.55),rgba(14,14,16,0.92))]">
          <div className="mx-auto max-w-[94rem] px-4 py-4 md:px-8">
            <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-[1.75rem] border border-amber-900/40 bg-[#16100d]/80 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/75">
                      Headquarters Console
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold text-zinc-100 md:text-[2rem]">
                      Super Admin Control Tower
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
                      mod.tozinosolution.com에서 모든 솔루션의 매출, 알값, 청구,
                      자산 배정과 운영 계정을 총괄합니다. mod.&lt;solution-domain&gt;에서
                      보는 실무 운영과는 다른 관점의 HQ 화면입니다.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/console")}
                      className="rounded-full border border-amber-800/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-100 hover:bg-amber-950/40"
                    >
                      HQ 대시보드
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/console/platforms")}
                      className="rounded-full border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                    >
                      솔루션 포트폴리오
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-zinc-500">
                    현재 스코프:{" "}
                    <span className="text-zinc-100">
                      {selected ? selected.name : "전체 솔루션"}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedPlatformId(null)}
                    className="text-xs text-amber-300 hover:text-amber-200"
                  >
                    전체 보기로 초기화
                  </button>
                </div>

                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => setSelectedPlatformId(null)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-left transition ${
                      selectedPlatformId == null
                        ? "border-amber-700/50 bg-amber-950/40 text-amber-100"
                        : "border-zinc-800 bg-black/20 text-zinc-300 hover:border-amber-800/40"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em]">ALL</p>
                    <p className="mt-1 text-sm font-medium">전체 솔루션</p>
                  </button>
                  {platforms.map((platform) => {
                    const active = selectedPlatformId === platform.id;
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => setSelectedPlatformId(platform.id)}
                        className={`shrink-0 rounded-full border px-4 py-2 text-left transition ${
                          active
                            ? "border-amber-700/50 bg-amber-950/40 text-amber-100"
                            : "border-zinc-800 bg-black/20 text-zinc-300 hover:border-amber-800/40"
                        }`}
                      >
                        <p className="text-xs font-semibold">{platform.name}</p>
                        <p className="mt-1 max-w-[14rem] truncate text-[11px] text-zinc-500">
                          {inferRootHost(platform) ?? platform.slug}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Solutions
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-100">
                    {counts.solutions}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">운영 중인 전체 솔루션 수</p>
                </div>
                <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Domains
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-100">
                    {counts.domains}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">루트 도메인이 연결된 솔루션</p>
                </div>
                <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Preview
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-100">
                    {counts.previews}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">로컬 미리보기 포트 배정 수</p>
                </div>
                <div className="rounded-[1.5rem] border border-amber-900/40 bg-amber-950/20 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/75">
                    Current Mode
                  </p>
                  <p className="mt-2 text-lg font-semibold text-zinc-100">
                    {selected ? "Selected Solution" : "Head Office Overview"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selected ? selected.name : "전체 솔루션을 합산한 총괄 시야"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 md:hidden">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950/90 text-zinc-100"
                aria-label="메뉴 열기"
              >
                <span className="text-lg leading-none">☰</span>
              </button>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                  HQ Menu
                </p>
                <p className="truncate text-sm font-medium text-zinc-100">
                  {selected ? `${selected.name} 드릴다운 가능` : "전체 솔루션 총괄 모드"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {mobileNavOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/70 md:hidden"
            style={{ top: "var(--admin-header-h, 4rem)" }}
            aria-label="메뉴 닫기"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 md:flex-row">
          <aside
            className={`fixed bottom-0 left-0 top-[4rem] z-50 flex h-[calc(100vh-4rem)] w-[min(21rem,92vw)] flex-col border-r border-amber-950/30 bg-[#0d0b0a]/96 shadow-2xl transition-transform duration-200 md:static md:h-auto md:min-h-[calc(100vh-4rem)] md:w-[22rem] md:shrink-0 md:translate-x-0 md:shadow-none ${
              mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 md:hidden">
              <span className="text-sm font-semibold text-zinc-200">본사 메뉴</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            {sidebar}
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {error ? (
              <div className="shrink-0 border-b border-red-900/40 bg-red-950/30 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}
            {!loading && platforms.length > 0 && !selectedPlatformId ? (
              <div className="shrink-0 border-b border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                지금은 전체 솔루션 총괄 모드입니다. 솔루션별 운영 상세는 상단 칩에서
                솔루션을 선택하면 이어서 볼 수 있습니다.
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
              <div className="mx-auto max-w-[94rem]">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

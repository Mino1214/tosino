"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import Link from "next/link";

type SalesSummary = {
  platform: { userCnt: number; agentCnt: number };
  wallet: {
    depositCount: number;
    depositTotal: string;
    withdrawCount: number;
    withdrawTotal: string;
    houseEdge: string;
    netInflow: string;
    estimatedRootAgentSettlementKrw?: string;
  };
  costs: {
    comp: {
      enabled: boolean;
      estimatedKrw: string;
      actualSettledKrw: string;
    };
    pointAccrual: {
      totalPoints: string;
      estimatedKrw: string | null;
    };
  };
};

type BalanceStats = {
  creditBalance: string;
  totalAllocatedCredits: string;
  totalConsumedCredits: string;
  pendingCreditRequests: number;
  totalPointBalance: string;
  totalWalletBalance: string;
  totalCompSettled: string;
};

type CreditRequest = {
  id: string;
  requestedAmountKrw: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

function krw(v: string | number | null | undefined) {
  const n = Math.round(Number(v ?? 0));
  return Number.isFinite(n) ? n.toLocaleString("ko-KR") : "0";
}

function pts(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("ko-KR", { maximumFractionDigits: 0 }) : "0";
}

function StatCard({
  label,
  value,
  sub,
  color,
  href,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  href?: string;
  valueColor?: string;
}) {
  const inner = (
    <div
      className={`rounded-2xl border p-4 h-full ${color ?? "border-gray-200 bg-white"} ${href ? "transition hover:shadow-md" : ""}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-[20px] font-bold font-mono ${valueColor ?? "text-black"}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
  if (href)
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  return inner;
}

export default function HomePage() {
  const { selectedPlatformId } = usePlatform();
  const user = getStoredUser();

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [balanceStats, setBalanceStats] = useState<BalanceStats | null>(null);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setErr(null);
    const q = `from=${monthStart}T00:00:00.000Z&to=${today}T23:59:59.999Z`;
    try {
      const [salesRes, balRes, credRes] = await Promise.allSettled([
        apiFetch<SalesSummary>(`/platforms/${selectedPlatformId}/sales/summary?${q}`),
        apiFetch<BalanceStats>(`/platforms/${selectedPlatformId}/balance-stats`),
        apiFetch<{ items: CreditRequest[] }>(
          `/platforms/${selectedPlatformId}/credit-requests?limit=5`,
        ).catch(() => null),
      ]);

      if (salesRes.status === "fulfilled") setSummary(salesRes.value);
      else setErr("매출 요약 조회 실패");

      if (balRes.status === "fulfilled") setBalanceStats(balRes.value);

      if (credRes.status === "fulfilled" && credRes.value) {
        setCreditRequests(credRes.value.items ?? []);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedPlatformId, monthStart, today]);

  useEffect(() => {
    void load();
  }, [load]);

  const deposit = Number(summary?.wallet.depositTotal ?? 0);
  const withdraw = Number(summary?.wallet.withdrawTotal ?? 0);
  const houseEdge = Number(summary?.wallet.houseEdge ?? 0);
  const agentSettle = Number(summary?.wallet.estimatedRootAgentSettlementKrw ?? 0);
  const creditBalance = Number(balanceStats?.creditBalance ?? 0);
  const totalAllocatedCredits = Number(balanceStats?.totalAllocatedCredits ?? 0);
  const totalConsumedCredits = Number(balanceStats?.totalConsumedCredits ?? 0);
  const pendingCreditCount = balanceStats?.pendingCreditRequests ?? 0;
  const totalPointBalance = Number(balanceStats?.totalPointBalance ?? 0);
  const totalWalletBalance = Number(balanceStats?.totalWalletBalance ?? 0);
  const totalCompSettled = Number(balanceStats?.totalCompSettled ?? 0);

  const pendingCredits = creditRequests?.filter((r) => r.status === "PENDING") ?? [];

  return (
    <div className="space-y-6 px-1">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-black">홈</h1>
          <p className="mt-1 text-xs text-gray-500">
            {user?.loginId ?? user?.email ?? ""} · 이번 달 ({monthStart} ~ {today}) 기준
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-[#3182f6] px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "조회중…" : "새로고침"}
        </button>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* ── 잔여 알 히어로 카드 ── */}
      <Link href="/console/credits" className="block">
        <div className={`relative overflow-hidden rounded-2xl px-6 py-5 ${
          creditBalance <= 0
            ? "bg-gradient-to-br from-red-500 to-rose-600"
            : creditBalance < 100000
            ? "bg-gradient-to-br from-amber-400 to-orange-500"
            : "bg-gradient-to-br from-[#3182f6] to-[#1a56c4]"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                잔여 알 (크레딧)
              </p>
              <p className="mt-2 text-3xl font-bold font-mono text-white">
                {loading ? "…" : `${krw(creditBalance)}원`}
              </p>
              <p className="mt-1.5 text-xs text-white/70">
                {creditBalance <= 0
                  ? "⚠ 알 잔액 부족 — 충전이 필요합니다"
                  : creditBalance < 100000
                  ? "⚠ 잔액이 얼마 남지 않았습니다"
                  : "솔루션 이용 가능 · 배팅 시 소진됩니다"}
                {pendingCreditCount > 0 && (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    대기 {pendingCreditCount}건
                  </span>
                )}
              </p>
              {!loading && (
                <div className="mt-3 flex gap-4 border-t border-white/20 pt-3">
                  <div>
                    <p className="text-[10px] text-white/60">총 지급받은 알</p>
                    <p className="text-sm font-bold font-mono text-white">
                      {krw(totalAllocatedCredits)}원
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/60">청구 소진</p>
                    <p className="text-sm font-bold font-mono text-white/80">
                      −{krw(totalConsumedCredits)}원
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-bold text-white">
                알 충전 →
              </span>
            </div>
          </div>
          {/* 배경 장식 */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-4 -right-2 h-16 w-16 rounded-full bg-white/5" />
        </div>
      </Link>

      {/* 알 구매 대기 알림 */}
      {pendingCredits.length > 0 && (
        <Link
          href="/console/credits"
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
            {pendingCredits.length}
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              알 구매 요청 대기 중
            </p>
            <p className="text-xs text-amber-600">
              {pendingCredits.length}건의 알 구매 요청이 슈퍼어드민 승인을 기다리고 있습니다.
            </p>
          </div>
          <span className="ml-auto text-amber-500">→</span>
        </Link>
      )}

      {/* ── 섹션 1: 입출금 · 에이전트 정산 ── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          이번달 입출금 · 정산
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="순입금"
            value={`${krw(deposit)}원`}
            sub={`${summary?.wallet.depositCount ?? "—"}건 충전 승인`}
            href="/console/wallet-requests"
            valueColor="text-emerald-700"
          />
          <StatCard
            label="순출금"
            value={`${krw(withdraw)}원`}
            sub={`${summary?.wallet.withdrawCount ?? "—"}건 출금 승인`}
            href="/console/wallet-requests"
            valueColor="text-red-600"
          />
          <StatCard
            label="에이전트 정산금"
            value={`${krw(agentSettle)}원`}
            sub="루트 총판 예상 정산 합계"
            href="/console/agent-settlement"
            valueColor="text-[#3182f6]"
          />
          <StatCard
            label="총 낙첨금"
            value={`${houseEdge >= 0 ? "+" : ""}${krw(houseEdge)}원`}
            sub="순입금 − 순출금"
            color={houseEdge >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}
            href="/console/sales"
            valueColor={houseEdge >= 0 ? "text-emerald-700" : "text-red-600"}
          />
          <StatCard
            label="회원 수"
            value={summary ? `${summary.platform.userCnt.toLocaleString("ko-KR")}명` : "—"}
            sub={`에이전트 ${summary?.platform.agentCnt?.toLocaleString("ko-KR") ?? "—"}명`}
            href="/console/users"
          />
          <StatCard
            label="총 잔액"
            value={`${krw(totalWalletBalance)}원`}
            sub="전체 유저 보유 머니 합계"
            href="/console/users"
          />
        </div>
      </div>

      {/* ── 섹션 2: 포인트 · 콤프 잔액 ── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          포인트 · 콤프 현황
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="포인트 잔액"
            value={`${pts(totalPointBalance)}P`}
            sub="전체 유저 현재 보유 포인트 합계"
            href="/console/operational"
            color="border-violet-200 bg-violet-50"
            valueColor="text-violet-700"
          />
          <StatCard
            label="이달 콤프 지급액"
            value={`${krw(totalCompSettled)}원`}
            sub="당월 유저에게 지급된 콤프 합계"
            href="/console/operational"
            color="border-orange-200 bg-orange-50"
            valueColor="text-orange-700"
          />
          <StatCard
            label="이번달 콤프 추정"
            value={`${krw(summary?.costs.comp.estimatedKrw ?? 0)}원`}
            sub={`실지급 ${krw(summary?.costs.comp.actualSettledKrw ?? 0)}원`}
            href="/console/sales"
          />
        </div>
      </div>

      {/* ── 알 구매 요청 최근 내역 ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            알 구매 요청 최근 내역
          </p>
          <Link
            href="/console/credits"
            className="text-xs font-medium text-[#3182f6] hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        {creditRequests === null ? (
          <p className="text-xs text-gray-400">불러오는 중…</p>
        ) : creditRequests.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
            <p className="text-sm text-gray-400">알 구매 요청 내역이 없습니다.</p>
            <Link
              href="/console/credits"
              className="mt-2 inline-block rounded-lg bg-[#3182f6] px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
            >
              알 구매 요청
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  {["요청일", "요청 금액", "상태"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {creditRequests.slice(0, 5).map((r) => (
                  <tr key={r.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-gray-800 whitespace-nowrap">
                      {Number(r.requestedAmountKrw).toLocaleString("ko-KR")}원
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "REJECTED"
                              ? "bg-red-100 text-red-600"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.status === "APPROVED" ? "승인됨" : r.status === "REJECTED" ? "거절됨" : "대기중"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 바로가기 ── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          빠른 이동
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/console/wallet-requests", label: "입출금 내역", icon: "⇅" },
            { href: "/console/agents", label: "에이전트 관리", icon: "◈" },
            { href: "/console/users", label: "유저 목록", icon: "◎" },
            { href: "/console/registrations", label: "가입 승인", icon: "✔" },
            { href: "/console/credits", label: "알 관리", icon: "🥚" },
            { href: "/console/blacklist", label: "블랙리스트", icon: "⊘" },
            { href: "/console/announcements", label: "공지/팝업", icon: "📢" },
            { href: "/console/operational", label: "운영 설정", icon: "✦" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 transition hover:border-[#3182f6]/30 hover:bg-[#3182f6]/5 hover:text-[#3182f6]"
            >
              <span className="text-base leading-none text-gray-400">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

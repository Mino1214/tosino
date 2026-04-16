"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { inferAdminHost, inferAgentHost, inferRootHost } from "@/lib/platform-hosts";
import { usePlatform } from "@/context/PlatformContext";
import { SemiVirtualForm } from "@/components/SemiVirtualForm";

type SemiVirtualDetail = {
  semiVirtualEnabled: boolean;
  semiVirtualRecipientPhone: string | null;
  semiVirtualAccountHint: string | null;
  semiVirtualBankName: string | null;
  semiVirtualAccountNumber: string | null;
  semiVirtualAccountHolder: string | null;
  settlementUsdtWallet: string | null;
};

export default function SuperAdminAssetsPage() {
  const { platforms, selectedPlatformId } = usePlatform();
  const [detail, setDetail] = useState<SemiVirtualDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(
    () => platforms.find((platform) => platform.id === selectedPlatformId) ?? null,
    [platforms, selectedPlatformId],
  );

  useEffect(() => {
    if (!selectedPlatformId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setErr(null);
    apiFetch<SemiVirtualDetail>(`/platforms/${selectedPlatformId}/semi-virtual`)
      .then(setDetail)
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "자산 정보를 불러오지 못했습니다."),
      )
      .finally(() => setLoading(false));
  }, [selectedPlatformId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">자산 관리</h1>
        <p className="mt-2 text-sm text-zinc-500">
          선택한 솔루션에 배정된 반가상 계좌, 정산용 테더 지갑, 입출금 운영 화면을
          한곳에서 묶어서 봅니다. 본사 자산 배정의 시작점으로 쓰는 허브입니다.
        </p>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Selected Solution
          </p>
          {selected ? (
            <>
              <h2 className="mt-2 text-xl font-semibold text-zinc-100">{selected.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{selected.slug}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">유저</p>
                  <p className="mt-1 font-mono text-sm text-zinc-100">
                    {inferRootHost(selected) ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">어드민</p>
                  <p className="mt-1 font-mono text-sm text-zinc-100">
                    {inferAdminHost(selected) ?? "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/20 p-4">
                  <p className="text-xs text-zinc-500">에이전트</p>
                  <p className="mt-1 font-mono text-sm text-zinc-100">
                    {inferAgentHost(selected) ?? "—"}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              좌측에서 솔루션을 선택하면 자산 현황을 확인할 수 있습니다.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Quick Links
          </p>
          <div className="mt-4 grid gap-3">
            {[
              { href: "/console/semi/settings", label: "반가상 설정", hint: "수신 번호 · 계좌 · 지갑 배정" },
              { href: "/console/semi/sms-log", label: "SMS 로그", hint: "은행 문자 처리 상태 점검" },
              { href: "/console/semi/usdt-deposits", label: "USDT 입금", hint: "온체인 입금 감지/승인" },
              { href: "/console/wallet-requests", label: "입출금 운영", hint: "충전/환전 승인 대기" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-4 hover:border-amber-700/40"
              >
                <p className="text-sm font-medium text-zinc-100">{item.label}</p>
                <p className="mt-1 text-xs text-zinc-500">{item.hint}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {err ? (
        <p className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {err}
        </p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">반가상 자산</h2>
          {loading ? (
            <p className="mt-3 text-sm text-zinc-500">불러오는 중…</p>
          ) : detail ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                <span className="text-zinc-500">활성화</span>
                <span className={detail.semiVirtualEnabled ? "text-emerald-300" : "text-zinc-300"}>
                  {detail.semiVirtualEnabled ? "사용 중" : "미사용"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                <span className="text-zinc-500">수신 번호</span>
                <span className="font-mono text-zinc-100">
                  {detail.semiVirtualRecipientPhone ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                <span className="text-zinc-500">계좌 힌트</span>
                <span className="text-zinc-100">{detail.semiVirtualAccountHint ?? "—"}</span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                <p className="text-zinc-500">배정 계좌</p>
                <p className="mt-1 font-mono text-zinc-100">
                  {[detail.semiVirtualBankName, detail.semiVirtualAccountNumber]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  예금주 {detail.semiVirtualAccountHolder ?? "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">선택된 솔루션이 없습니다.</p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-lg font-semibold text-zinc-100">정산 지갑 / 메모</h2>
          {loading ? (
            <p className="mt-3 text-sm text-zinc-500">불러오는 중…</p>
          ) : detail ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3">
                <p className="text-zinc-500">USDT 정산 지갑</p>
                <p className="mt-1 font-mono break-all text-zinc-100">
                  {detail.settlementUsdtWallet ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-zinc-500">
                본사 자산 풀에서 실제 계좌/지갑을 어떤 솔루션에 배정했는지 먼저
                확인하고, 입출금 운영과 SMS/USDT 감시 화면으로 이어서 점검하면 됩니다.
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">선택된 솔루션이 없습니다.</p>
          )}
        </div>
      </section>

      {selectedPlatformId ? (
        <section className="rounded-2xl border border-violet-900/30 bg-zinc-900/40 p-5">
          <SemiVirtualForm
            platformId={selectedPlatformId}
            heading="원화 · 테더 · 반가상 즉시 배정"
          />
        </section>
      ) : null}
    </div>
  );
}

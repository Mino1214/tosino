"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
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

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-mono text-sm font-medium text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

export default function SuperAdminAssetsPage() {
  const { platforms, selectedPlatformId } = usePlatform();
  const [detail, setDetail] = useState<SemiVirtualDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selected = useMemo(
    () => platforms.find((p) => p.id === selectedPlatformId) ?? null,
    [platforms, selectedPlatformId],
  );

  useEffect(() => {
    if (!selectedPlatformId) { setDetail(null); return; }
    setLoading(true);
    setErr(null);
    apiFetch<SemiVirtualDetail>(`/platforms/${selectedPlatformId}/semi-virtual`)
      .then(setDetail)
      .catch((e) => setErr(e instanceof Error ? e.message : "자산 정보를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [selectedPlatformId]);

  if (!selectedPlatformId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-8 py-10 max-w-sm">
          <p className="text-3xl mb-4">💳</p>
          <h2 className="text-lg font-bold text-gray-900">솔루션을 선택하세요</h2>
          <p className="mt-2 text-sm text-gray-500">
            좌측에서 솔루션을 선택하면 반가상 계좌, USDT 지갑 설정을 바로 편집할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-500">Assets</p>
        <h1 className="mt-1.5 text-2xl font-bold text-gray-900">반가상 설정</h1>
        {selected && <p className="mt-1 text-sm text-gray-500">{selected.name}</p>}
      </div>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{err}</p>
      )}

      {/* Current status */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4">현재 설정 현황</h2>
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중…</p>
        ) : detail ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-500">반가상 활성화</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                detail.semiVirtualEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {detail.semiVirtualEnabled ? "활성" : "비활성"}
              </span>
            </div>
            <Field label="SMS 수신 번호" value={detail.semiVirtualRecipientPhone} />
            <Field label="계좌 힌트" value={detail.semiVirtualAccountHint} />
            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-sm text-gray-500">배정 계좌</span>
              <span className="font-mono text-sm font-medium text-gray-800">
                {[detail.semiVirtualBankName, detail.semiVirtualAccountNumber, detail.semiVirtualAccountHolder]
                  .filter(Boolean).join(" / ") || "—"}
              </span>
            </div>
            <Field label="USDT 정산 지갑" value={detail.settlementUsdtWallet} />
          </div>
        ) : (
          <p className="text-sm text-gray-400">정보를 불러오지 못했습니다.</p>
        )}
      </section>

      {/* Edit form */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-bold text-gray-900 mb-1">설정 편집</h2>
        <p className="text-sm text-gray-500 mb-4">반가상 계좌, SMS 수신 번호, USDT 지갑을 직접 편집합니다.</p>
        <SemiVirtualForm
          platformId={selectedPlatformId}
          heading=""
        />
      </section>
    </div>
  );
}

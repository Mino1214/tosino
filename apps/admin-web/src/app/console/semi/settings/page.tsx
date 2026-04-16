"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type Semi = {
  semiVirtualEnabled: boolean;
  semiVirtualRecipientPhone: string | null;
  semiVirtualAccountHint: string | null;
  semiVirtualBankName: string | null;
  semiVirtualAccountNumber: string | null;
  semiVirtualAccountHolder: string | null;
  settlementUsdtWallet: string | null;
};

export default function SemiVirtualSettingsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [data, setData] = useState<Semi | null>(null);

  // 원화 입금 계좌
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  // USDT 지갑
  const [usdtWallet, setUsdtWallet] = useState("");

  // 반가상 앱 설정
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [hint, setHint] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "SUPER_ADMIN") {
      router.replace("/console/sales");
    }
  }, [router]);

  useEffect(() => {
    if (!selectedPlatformId || platformLoading) {
      setData(null);
      return;
    }
    setErr(null);
    apiFetch<Semi>(`/platforms/${selectedPlatformId}/semi-virtual`)
      .then((d) => {
        setData(d);
        setBankName(d.semiVirtualBankName ?? "");
        setAccountNumber(d.semiVirtualAccountNumber ?? "");
        setAccountHolder(d.semiVirtualAccountHolder ?? "");
        setUsdtWallet(d.settlementUsdtWallet ?? "");
        setEnabled(d.semiVirtualEnabled);
        setPhone(d.semiVirtualRecipientPhone ?? "");
        setHint(d.semiVirtualAccountHint ?? "");
      })
      .catch((e) =>
        setErr(e instanceof Error ? e.message : "설정을 불러오지 못했습니다"),
      );
  }, [selectedPlatformId, platformLoading]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatformId) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const updated = await apiFetch<Semi>(
        `/platforms/${selectedPlatformId}/semi-virtual`,
        {
          method: "PATCH",
          body: JSON.stringify({
            enabled,
            recipientPhone: phone.trim() || undefined,
            accountHint: hint.trim() || undefined,
            bankName: bankName.trim() || undefined,
            accountNumber: accountNumber.trim() || undefined,
            accountHolder: accountHolder.trim() || undefined,
            settlementUsdtWallet: usdtWallet.trim() || undefined,
          }),
        },
      );
      setData(updated);
      setMsg("저장했습니다.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }

  if (err && !data) {
    return <p className="text-sm text-red-400">{err}</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">반가상 설정</h1>
        <p className="mt-1 text-sm text-zinc-500">
          솔루션 페이지 입출금란에 표시될 계좌·지갑 정보와 SMS 자동 확인 앱
          설정을 관리합니다.
        </p>
      </div>

      {data && (
        <form onSubmit={onSave} className="space-y-6">
          {msg && <p className="text-sm text-emerald-400">{msg}</p>}
          {err && <p className="text-sm text-red-400">{err}</p>}

          {/* ── 1. 원화 입금 계좌 ── */}
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                원화 입금 계좌 등록
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                솔루션 페이지에서 회원이 입금 신청 시 이 계좌 정보가 표시됩니다.
              </p>
            </div>

            <label className="block text-sm text-zinc-400">
              은행명
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="예: 국민은행"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>

            <label className="block text-sm text-zinc-400">
              계좌번호
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="예: 123-456-789012"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>

            <label className="block text-sm text-zinc-400">
              예금주
              <input
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="예: 홍길동"
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100"
              />
            </label>
          </section>

          {/* ── 2. USDT 입금 주소 ── */}
          <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-amber-300">
                USDT(TRC20) 입금 주소
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                회원이 USDT 입금 시 이 주소가 표시됩니다. 입력 시 TronGrid가
                1분마다 입금을 감지해 자동 크레딧합니다.
              </p>
            </div>
            <input
              value={usdtWallet}
              onChange={(e) => setUsdtWallet(e.target.value)}
              placeholder="T로 시작하는 TRC20 주소 (예: TXyz…)"
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-amber-100"
            />
          </section>

          {/* ── 3. 반가상용 앱 설정 ── */}
          <section className="rounded-xl border border-violet-900/40 bg-zinc-900/50 p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                반가상용 앱 수신 설정
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                은행 웹발신 문자를 앱으로 수신해 입금자명·금액이 맞는 대기
                충전 신청을 자동 승인합니다.
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-zinc-600"
              />
              앱 수신 사용 (SMS 자동 입금 확인)
            </label>

            <label className="block text-sm text-zinc-400">
              수신 단말 번호 (숫자만, 앱에 동일하게 입력)
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="예: 01012345678"
                disabled={!enabled}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 disabled:opacity-50"
              />
            </label>

            <label className="block text-sm text-zinc-400">
              계좌 SMS 힌트 (본문에 포함되는 고유 문자열, 선택)
              <input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="예: 123**456 또는 계좌 마스킹 일부"
                disabled={!enabled}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 disabled:opacity-50"
              />
            </label>

            <p className="text-xs text-zinc-600">
              사용 시{" "}
              <strong className="text-zinc-500">번호 또는 힌트 중 하나 이상</strong>{" "}
              필수.
            </p>

            <div className="rounded-lg border border-violet-900/30 bg-violet-950/20 px-4 py-3 text-xs text-violet-200/70 space-y-1">
              <p className="font-medium text-violet-100">SMS 수신 서버 (별도 프로세스)</p>
              <p>
                로컬:{" "}
                <code className="rounded bg-black/40 px-1 text-[11px]">pnpm dev:sms-ingest</code>.
                모바일용 HTTPS는{" "}
                <code className="text-[11px]">pnpm dev:sms-ingest:public</code> 또는{" "}
                <code className="text-[11px]">pnpm tunnel:sms-ingest</code> 로 주소를 받은 뒤
                Flutter URL을{" "}
                <code className="text-[11px]">https://…/webhook/sms</code> 로 넣으세요.
              </p>
              <p className="text-zinc-500">
                Flutter 앱:{" "}
                <code className="text-zinc-400">apps/sms_forwarder</code>
              </p>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </form>
      )}

      <Link
        href="/console/semi/sms-log"
        className="inline-block text-sm text-violet-400 hover:text-violet-300"
      >
        SMS 처리 로그 →
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Semi = {
  semiVirtualEnabled: boolean;
  semiVirtualRecipientPhone: string | null;
  semiVirtualAccountHint: string | null;
  semiVirtualBankName: string | null;
  semiVirtualAccountNumber: string | null;
  semiVirtualAccountHolder: string | null;
  settlementUsdtWallet: string | null;
};

type Props = {
  platformId: string;
  /** 상단에 표시할 짧은 제목 */
  heading?: string;
};

export function SemiVirtualForm({ platformId, heading }: Props) {
  const [data, setData] = useState<Semi | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [usdtWallet, setUsdtWallet] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [hint, setHint] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setErr(null);
    setMsg(null);
    apiFetch<Semi>(`/platforms/${platformId}/semi-virtual`)
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
  }, [platformId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const updated = await apiFetch<Semi>(
        `/platforms/${platformId}/semi-virtual`,
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

  if (err && !data) {
    return <p className="text-sm text-red-400">{err}</p>;
  }

  if (!data) {
    return <p className="text-sm text-zinc-500">불러오는 중…</p>;
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      {heading ? (
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{heading}</h2>
          <p className="mt-1 text-xs text-zinc-500">
            회원 입금 화면에 노출되는 원화 계좌, USDT(TRC20) 수취 주소, SMS 자동
            입금 확인 설정입니다.
          </p>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-emerald-400">{msg}</p> : null}
      {err ? <p className="text-sm text-red-400">{err}</p> : null}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-100">원화 입금 계좌</p>
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

      <section className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-5 space-y-3">
        <p className="text-sm font-semibold text-amber-300">USDT(TRC20) 입금 주소</p>
        <input
          value={usdtWallet}
          onChange={(e) => setUsdtWallet(e.target.value)}
          placeholder="T로 시작하는 TRC20 주소"
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-amber-100"
        />
      </section>

      <section className="rounded-xl border border-violet-900/40 bg-zinc-900/50 p-5 space-y-4">
        <p className="text-sm font-semibold text-zinc-100">반가상 SMS 자동 확인</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-zinc-600"
          />
          앱 수신 사용
        </label>
        <label className="block text-sm text-zinc-400">
          수신 단말 번호 (숫자만)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="예: 01012345678"
            disabled={!enabled}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 disabled:opacity-50"
          />
        </label>
        <label className="block text-sm text-zinc-400">
          계좌 SMS 힌트 (선택)
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="본문에 포함되는 고유 문자열"
            disabled={!enabled}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 disabled:opacity-50"
          />
        </label>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "자산 설정 저장"}
      </button>
    </form>
  );
}

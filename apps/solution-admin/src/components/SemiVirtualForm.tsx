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
  /** 저장 후 콜백 (이력 새로고침 등) */
  onSaved?: () => void;
};

const fieldCls =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export function SemiVirtualForm({ platformId, onSaved }: Props) {
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

  async function persist(nextEnabled: boolean) {
    if (!data) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const updated = await apiFetch<Semi>(`/platforms/${platformId}/semi-virtual`, {
        method: "PATCH",
        body: JSON.stringify({
          enabled: nextEnabled,
          recipientPhone: phone.trim() || undefined,
          accountHint: hint.trim() || undefined,
          bankName: bankName.trim() || undefined,
          accountNumber: accountNumber.trim() || undefined,
          accountHolder: accountHolder.trim() || undefined,
          settlementUsdtWallet: usdtWallet.trim() || undefined,
        }),
      });
      setData(updated);
      setEnabled(updated.semiVirtualEnabled);
      setMsg(nextEnabled !== data.semiVirtualEnabled ? "처리했습니다." : "저장했습니다.");
      onSaved?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    await persist(enabled);
  }

  if (err && !data) {
    return <p className="text-sm text-red-600">{err}</p>;
  }

  if (!data) {
    return <p className="text-sm text-gray-500">불러오는 중…</p>;
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      {msg ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p> : null}
      {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/60">
        <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">자동 입금(SMS):</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            enabled
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
              : "bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-zinc-300"
          }`}
        >
          {enabled ? "Live" : "준비 중(꺼짐)"}
        </span>
        <button
          type="button"
          disabled={saving || enabled}
          onClick={() => void persist(true)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          Live 전환
        </button>
        <button
          type="button"
          disabled={saving || !enabled}
          onClick={() => void persist(false)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
        >
          자동 처리 중지
        </button>
        <p className="w-full text-[11px] text-gray-500 dark:text-zinc-500">
          Live는 등록한 수신 번호·힌트로 은행 문자를 자동 처리합니다. 계좌·테더 주소만 바꿀 때는 아래에서 저장하면 됩니다.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">원화 입금 계좌 (회원 화면 노출)</p>
        <label className="block text-sm text-gray-600 dark:text-zinc-400">
          은행명
          <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="예: 국민은행" className={fieldCls} />
        </label>
        <label className="block text-sm text-gray-600 dark:text-zinc-400">
          계좌번호
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="예: 123456789012"
            className={fieldCls}
          />
        </label>
        <label className="block text-sm text-gray-600 dark:text-zinc-400">
          예금주
          <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="예: 홍길동" className={fieldCls} />
        </label>
      </section>

      <section className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">USDT(TRC20) 정산·입금 수취 주소</p>
        <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
          온체인 입금 자동 매칭에 사용됩니다. 주소를 바꾸면 이후 입금부터 새 주소로 적용됩니다.
        </p>
        <input
          value={usdtWallet}
          onChange={(e) => setUsdtWallet(e.target.value)}
          placeholder="T로 시작하는 TRC20 주소"
          className={`${fieldCls} font-mono text-amber-950 dark:text-amber-100`}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">반가상 SMS 자동 입금</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-gray-300 dark:border-zinc-600"
          />
          앱 수신 사용 (Live 시 문자로 자동 입금 확인)
        </label>
        <label className="block text-sm text-gray-600 dark:text-zinc-400">
          수신 단말 번호 (숫자만)
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="예: 01012345678"
            disabled={!enabled}
            className={`${fieldCls} disabled:opacity-50`}
          />
        </label>
        <label className="block text-sm text-gray-600 dark:text-zinc-400">
          계좌 SMS 힌트 (선택)
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="본문에 포함되는 고유 문자열"
            disabled={!enabled}
            className={`${fieldCls} disabled:opacity-50`}
          />
        </label>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-[#3182f6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "설정 저장 (이력에 기록)"}
      </button>
    </form>
  );
}

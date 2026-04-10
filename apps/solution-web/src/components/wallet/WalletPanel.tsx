"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearSession, getAccessToken } from "@/lib/api";
import { UsdtDepositPanel } from "@/components/UsdtDepositPanel";
import type { WalletModalOptions } from "@/contexts/AppModalsContext";

const BANKS = [
  { value: "43", label: "카카오뱅크" },
  { value: "3", label: "기업은행" },
  { value: "4", label: "국민은행" },
  { value: "6", label: "수협은행" },
  { value: "8", label: "농협은행" },
  { value: "10", label: "우리은행" },
  { value: "11", label: "SC제일은행" },
  { value: "13", label: "한국씨티은행" },
  { value: "14", label: "대구은행" },
  { value: "15", label: "부산은행" },
  { value: "16", label: "광주은행" },
  { value: "17", label: "제주은행" },
  { value: "18", label: "전북은행" },
  { value: "19", label: "경남은행" },
  { value: "20", label: "새마을금고연합회" },
  { value: "21", label: "신협중앙회" },
  { value: "37", label: "우체국" },
  { value: "40", label: "하나은행" },
  { value: "41", label: "신한은행" },
] as const;

const BANK_LABELS = Object.fromEntries(BANKS.map((bank) => [bank.value, bank.label]));

type Profile = {
  id: string;
  role: string;
  email: string;
  displayName?: string | null;
  registrationStatus?: string;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
};

type WReq = {
  id: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  note: string | null;
  depositorName: string | null;
};

type WalletPanelProps = {
  initialOpts?: WalletModalOptions;
  onNeedLogin?: () => void;
  variant?: "page" | "modal";
};

type PayoutAccountForm = {
  bankCode: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
};

const shellCardClass =
  "rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)]";
const fieldClass =
  "mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-[rgba(218,174,87,0.65)]";

function formatKrw(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  });
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function requestStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "대기";
    case "APPROVED":
      return "승인";
    case "REJECTED":
      return "거절";
    default:
      return status;
  }
}

function requestStatusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
    case "APPROVED":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
    case "REJECTED":
      return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30";
    default:
      return "bg-zinc-700/40 text-zinc-300 ring-1 ring-white/10";
  }
}

function getBankLabel(bankCode: string | null | undefined) {
  if (!bankCode) return "미등록";
  return BANK_LABELS[bankCode] ?? bankCode;
}

function getInitialTarget(initialOpts?: WalletModalOptions) {
  if (initialOpts?.mainTab === "usdt") return "usdt" as const;
  if (initialOpts?.fiatTab === "WITHDRAWAL") return "withdraw" as const;
  return "deposit" as const;
}

export function WalletPanel({
  initialOpts,
  onNeedLogin,
  variant = "modal",
}: WalletPanelProps) {
  const router = useRouter();
  const isPage = variant === "page";
  const depositRef = useRef<HTMLDivElement>(null);
  const withdrawRef = useRef<HTMLDivElement>(null);
  const usdtRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [requests, setRequests] = useState<WReq[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [depositAmount, setDepositAmount] = useState("10000");
  const [depositDepositorName, setDepositDepositorName] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("10000");
  const [submittingType, setSubmittingType] = useState<"DEPOSIT" | "WITHDRAWAL" | null>(null);

  const [payoutForm, setPayoutForm] = useState<PayoutAccountForm>({
    bankCode: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);

  const pendingCount = useMemo(
    () => (requests ?? []).filter((item) => item.status === "PENDING").length,
    [requests],
  );

  const hasPayoutAccount = Boolean(
    profile?.bankCode && profile?.bankAccountNumber && profile?.bankAccountHolder,
  );

  const load = useCallback(async () => {
    if (!getAccessToken()) return;
    setErr(null);
    try {
      const p = await apiFetch<Profile>("/me/profile");
      setProfile(p);
      setPayoutForm({
        bankCode: p.bankCode ?? "",
        bankAccountNumber: p.bankAccountNumber ?? "",
        bankAccountHolder: p.bankAccountHolder ?? "",
      });
      setEditingPayout(!(p.bankCode && p.bankAccountNumber && p.bankAccountHolder));

      if (p.role !== "USER") {
        setErr("일반 회원 전용 메뉴입니다.");
        return;
      }

      const [wallet, list] = await Promise.all([
        apiFetch<{ balance: string }>("/me/wallet"),
        apiFetch<WReq[]>("/me/wallet-requests"),
      ]);
      setBalance(wallet.balance);
      setRequests(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const target = getInitialTarget(initialOpts);
    const node =
      target === "withdraw"
        ? withdrawRef.current
        : target === "usdt"
          ? usdtRef.current
          : depositRef.current;
    if (!node) return;

    const id = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    return () => window.clearTimeout(id);
  }, [initialOpts]);

  function setPayoutField<K extends keyof PayoutAccountForm>(
    key: K,
    value: PayoutAccountForm[K],
  ) {
    setPayoutForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submitDepositRequest(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(depositAmount);
    const depositorName = depositDepositorName.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setSuccess(null);
      setErr("입금 금액을 확인해주세요.");
      return;
    }
    if (!depositorName) {
      setSuccess(null);
      setErr("입금자명을 입력해주세요.");
      return;
    }

    setSubmittingType("DEPOSIT");
    setErr(null);
    setSuccess(null);
    try {
      await apiFetch("/me/wallet-requests", {
        method: "POST",
        body: JSON.stringify({
          type: "DEPOSIT",
          amount,
          depositorName,
        }),
      });
      setDepositAmount("10000");
      setDepositDepositorName("");
      setSuccess("입금 신청이 저장되었습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "입금 신청에 실패했습니다.");
    } finally {
      setSubmittingType(null);
    }
  }

  async function submitWithdrawalRequest(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (!hasPayoutAccount) {
      setSuccess(null);
      setErr("출금 계좌를 먼저 등록해주세요.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSuccess(null);
      setErr("출금 금액을 확인해주세요.");
      return;
    }

    setSubmittingType("WITHDRAWAL");
    setErr(null);
    setSuccess(null);
    try {
      await apiFetch("/me/wallet-requests", {
        method: "POST",
        body: JSON.stringify({
          type: "WITHDRAWAL",
          amount,
        }),
      });
      setWithdrawAmount("10000");
      setSuccess("출금 신청이 접수되었습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "출금 신청에 실패했습니다.");
    } finally {
      setSubmittingType(null);
    }
  }

  async function savePayoutAccount(e: React.FormEvent) {
    e.preventDefault();
    const bankCode = payoutForm.bankCode.trim();
    const bankAccountNumber = payoutForm.bankAccountNumber.trim();
    const bankAccountHolder = payoutForm.bankAccountHolder.trim();

    if (!bankCode || !bankAccountNumber || !bankAccountHolder) {
      setSuccess(null);
      setErr("은행명, 예금주, 계좌번호를 모두 입력해주세요.");
      return;
    }

    setSavingPayout(true);
    setErr(null);
    setSuccess(null);
    try {
      await apiFetch("/me/payout-account", {
        method: "PATCH",
        body: JSON.stringify({
          bankCode,
          bankAccountNumber,
          bankAccountHolder,
        }),
      });
      setEditingPayout(false);
      setSuccess("출금 계좌가 저장되었습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "출금 계좌 저장에 실패했습니다.");
    } finally {
      setSavingPayout(false);
    }
  }

  if (!getAccessToken()) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-zinc-400">로그인 후 이용할 수 있습니다.</p>
        <button
          type="button"
          onClick={() => onNeedLogin?.()}
          className="mt-4 rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold text-black"
        >
          로그인
        </button>
      </div>
    );
  }

  if (!profile && !err) {
    return (
      <div className="py-10 text-center text-sm text-zinc-500">
        입금 · 출금 정보를 불러오는 중입니다.
      </div>
    );
  }

  return (
    <div className={isPage ? "mx-auto max-w-5xl px-4 py-8" : "mx-auto max-w-5xl"}>
      {isPage && (
        <>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← 홈
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">입금 · 출금 센터</h1>
          <p className="mt-2 text-sm text-zinc-400">
            입금 신청, 출금 계좌 등록, 테더 지갑 상태를 한 화면에서 확인할 수 있습니다.
          </p>
        </>
      )}

      {err && (
        <p
          className={`rounded-xl bg-red-950/60 px-4 py-3 text-sm text-red-200 ${
            isPage ? "mt-4" : "mb-4"
          }`}
        >
          {err}
        </p>
      )}
      {success && (
        <p
          className={`rounded-xl bg-emerald-950/60 px-4 py-3 text-sm text-emerald-200 ${
            isPage ? "mt-4" : "mb-4"
          }`}
        >
          {success}
        </p>
      )}

      {profile?.role === "USER" && (
        <>
          <div className={`grid gap-4 ${isPage ? "mt-6" : "mt-1"} lg:grid-cols-3`}>
            <div className={`${shellCardClass} lg:col-span-1`}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                보유 머니
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-main-gold">
                {formatKrw(balance)}
                <span className="ml-2 text-lg text-zinc-500">KRW</span>
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                원화 기준으로 입금 신청과 출금 신청이 바로 연결됩니다.
              </p>
            </div>

            <div className={shellCardClass}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                출금 계좌
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {hasPayoutAccount ? "등록 완료" : "미등록"}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                {hasPayoutAccount
                  ? `${getBankLabel(profile.bankCode)} · ${profile.bankAccountHolder}`
                  : "은행명, 예금주, 계좌번호를 저장하면 바로 출금 신청할 수 있습니다."}
              </p>
            </div>

            <div className={shellCardClass}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                처리 대기
              </p>
              <p className="mt-3 text-lg font-semibold text-white">{pendingCount}건</p>
              <p className="mt-2 text-sm text-zinc-400">
                최근 신청 내역과 현재 처리 상태를 아래에서 한 번에 확인할 수 있습니다.
              </p>
            </div>
          </div>

          <div className={`grid gap-4 ${isPage ? "mt-6" : "mt-4"} xl:grid-cols-2`}>
            <div ref={depositRef} className={shellCardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">입금 신청</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    금액과 입금자명만 입력하면 바로 입금 요청 API로 연결됩니다.
                  </p>
                </div>
                <span className="rounded-full bg-gold-gradient px-3 py-1 text-xs font-bold text-black">
                  입금
                </span>
              </div>

              <form onSubmit={submitDepositRequest} className="mt-5 space-y-4">
                <label className="block text-sm text-zinc-400">
                  입금 금액
                  <input
                    type="number"
                    min={1}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="block text-sm text-zinc-400">
                  입금자명
                  <input
                    value={depositDepositorName}
                    onChange={(e) => setDepositDepositorName(e.target.value)}
                    placeholder="은행 문자에 찍히는 이름"
                    className={fieldClass}
                  />
                </label>

                <button
                  type="submit"
                  disabled={submittingType === "DEPOSIT"}
                  className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submittingType === "DEPOSIT" ? "입금 신청 중…" : "입금 신청 저장"}
                </button>
              </form>
            </div>

            <div ref={withdrawRef} className={shellCardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">출금 신청</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    출금 계좌가 없으면 먼저 저장하고, 등록되어 있으면 바로 출금 요청 API를 호출합니다.
                  </p>
                </div>
                {hasPayoutAccount && !editingPayout ? (
                  <button
                    type="button"
                    onClick={() => setEditingPayout(true)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
                  >
                    계좌 수정
                  </button>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                {hasPayoutAccount && !editingPayout ? (
                  <div className="rounded-2xl border border-[rgba(218,174,87,0.18)] bg-[rgba(218,174,87,0.06)] p-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-zinc-500">은행명</p>
                        <p className="mt-1 font-semibold text-white">
                          {getBankLabel(profile.bankCode)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">예금주</p>
                        <p className="mt-1 font-semibold text-white">
                          {profile.bankAccountHolder}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">계좌번호</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-white">
                          {profile.bankAccountNumber}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={savePayoutAccount} className="space-y-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                    <label className="block text-sm text-zinc-400">
                      은행명
                      <select
                        value={payoutForm.bankCode}
                        onChange={(e) => setPayoutField("bankCode", e.target.value)}
                        className={fieldClass}
                      >
                        <option value="">은행을 선택하세요</option>
                        {BANKS.map((bank) => (
                          <option key={bank.value} value={bank.value}>
                            {bank.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-sm text-zinc-400">
                      예금주
                      <input
                        value={payoutForm.bankAccountHolder}
                        onChange={(e) => setPayoutField("bankAccountHolder", e.target.value)}
                        placeholder="예금주명 입력"
                        className={fieldClass}
                      />
                    </label>

                    <label className="block text-sm text-zinc-400">
                      계좌번호
                      <input
                        value={payoutForm.bankAccountNumber}
                        onChange={(e) => setPayoutField("bankAccountNumber", e.target.value)}
                        placeholder="'-' 없이 입력"
                        className={fieldClass}
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingPayout}
                        className="flex-1 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {savingPayout ? "계좌 저장 중…" : "출금 계좌 저장"}
                      </button>
                      {hasPayoutAccount ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPayout(false);
                            setPayoutForm({
                              bankCode: profile?.bankCode ?? "",
                              bankAccountNumber: profile?.bankAccountNumber ?? "",
                              bankAccountHolder: profile?.bankAccountHolder ?? "",
                            });
                          }}
                          className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
                        >
                          취소
                        </button>
                      ) : null}
                    </div>
                  </form>
                )}

                {hasPayoutAccount && !editingPayout ? (
                  <form onSubmit={submitWithdrawalRequest} className="space-y-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                    <label className="block text-sm text-zinc-400">
                      출금 금액
                      <input
                        type="number"
                        min={1}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className={fieldClass}
                      />
                    </label>

                    <div className="rounded-xl border border-white/8 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-400">
                      현재 보유 금액:{" "}
                      <span className="font-mono font-bold text-main-gold">
                        {formatKrw(balance)}원
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingType === "WITHDRAWAL"}
                      className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {submittingType === "WITHDRAWAL" ? "출금 신청 중…" : "출금 신청 저장"}
                    </button>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
                    출금 계좌를 먼저 저장하면 바로 출금 신청할 수 있습니다.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div ref={usdtRef} className={isPage ? "mt-6" : "mt-4"}>
            <UsdtDepositPanel
              userId={profile.id}
              krwBalanceDisplay={balance ?? undefined}
            />
          </div>

          <div className={`scroll-mt-24 ${isPage ? "mt-8" : "mt-6"}`}>
            <h2 className="text-lg font-bold text-white">신청 내역</h2>
            <p className="mt-1 text-sm text-zinc-500">
              최근 입금 신청과 출금 신청 상태를 한 번에 볼 수 있습니다.
            </p>

            <ul className="mt-4 space-y-3">
              {(requests ?? []).length === 0 ? (
                <li className="rounded-2xl border border-white/8 bg-black/25 px-4 py-5 text-sm text-zinc-500">
                  아직 저장된 신청 내역이 없습니다.
                </li>
              ) : (
                (requests ?? []).map((request) => (
                  <li
                    key={request.id}
                    className="rounded-2xl border border-white/8 bg-black/25 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {request.type === "DEPOSIT" ? "입금 신청" : "출금 신청"}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${requestStatusClass(request.status)}`}
                          >
                            {requestStatusLabel(request.status)}
                          </span>
                        </div>
                        <p className="font-mono text-lg font-bold text-main-gold">
                          {formatKrw(request.amount)}원
                        </p>
                        {request.depositorName ? (
                          <p className="text-sm text-zinc-400">
                            입금자명:{" "}
                            <span className="font-medium text-zinc-200">
                              {request.depositorName}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm text-zinc-500">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}

      {profile && profile.role !== "USER" && (
        <button
          type="button"
          onClick={() => {
            clearSession();
            router.push("/");
            onNeedLogin?.();
          }}
          className="mt-4 text-sm text-zinc-500 underline"
        >
          다른 계정으로 로그인
        </button>
      )}
    </div>
  );
}

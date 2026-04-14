"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, clearSession, getAccessToken } from "@/lib/api";
import { UsdtDepositPanel } from "@/components/UsdtDepositPanel";
import type { WalletModalOptions } from "@/contexts/AppModalsContext";
import { formatKrwWithSymbol } from "@/lib/format-currency";

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
  loginId?: string | null;
  role: string;
  email: string | null;
  displayName?: string | null;
  registrationStatus?: string;
  signupMode?: string | null;
  signupReferralInput?: string | null;
  bankCode?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  usdtWalletAddress?: string | null;
};

type WReq = {
  id: string;
  type: string;
  amount: string;
  currency?: string | null;
  status: string;
  createdAt: string;
  note: string | null;
  depositorName: string | null;
};

type DepositAccountInfo = {
  mode: "KRW" | "USDT";
  autoCreditEnabled: boolean;
  depositAccount: {
    bankName: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
    accountHint: string | null;
    recipientPhone: string | null;
  };
  registeredAccount: {
    bankCode: string | null;
    accountNumber: string | null;
    accountHolder: string | null;
    ready: boolean;
  };
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

function formatUsdt(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
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

function formatRequestAmount(request: WReq) {
  if (request.currency === "USDT") {
    return `${formatUsdt(request.amount)} USDT`;
  }
  return formatKrwWithSymbol(request.amount);
}

function getInitialTarget(initialOpts?: WalletModalOptions) {
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

  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [requests, setRequests] = useState<WReq[] | null>(null);
  const [depositAccountInfo, setDepositAccountInfo] =
    useState<DepositAccountInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [depositAmount, setDepositAmount] = useState("10000");
  const [depositDepositorName, setDepositDepositorName] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("10000");
  const [submittingType, setSubmittingType] = useState<"DEPOSIT" | "WITHDRAWAL" | null>(null);

  const [payoutForm, setPayoutForm] = useState<PayoutAccountForm>({
    bankCode: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [editingPayout, setEditingPayout] = useState(false);
  const [selectedSection, setSelectedSection] = useState<"deposit" | "withdraw">(
    () => getInitialTarget(initialOpts),
  );

  const usdtRate = useMemo(() => {
    const n = Number(process.env.NEXT_PUBLIC_USDT_KRW_RATE);
    return Number.isFinite(n) && n > 0 ? n : 1488;
  }, []);

  const isAnonymousUser = profile?.signupMode === "anonymous";
  const hasPayoutAccount = Boolean(
    profile?.bankCode && profile?.bankAccountNumber && profile?.bankAccountHolder,
  );
  const hasUsdtWallet = Boolean(profile?.usdtWalletAddress?.trim());
  const depositAccount = depositAccountInfo?.depositAccount ?? null;
  const registeredDepositAccount = depositAccountInfo?.registeredAccount ?? null;
  const hasRegisteredDepositAccount = Boolean(
    registeredDepositAccount?.ready ??
      (profile?.bankCode && profile?.bankAccountNumber && profile?.bankAccountHolder),
  );
  const registeredDepositBankLabel = getBankLabel(
    registeredDepositAccount?.bankCode ?? profile?.bankCode,
  );
  const withdrawableUsdt = useMemo(() => {
    const krw = Number(balance ?? 0);
    if (!Number.isFinite(krw) || krw <= 0) return 0;
    return krw / usdtRate;
  }, [balance, usdtRate]);

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
      setDepositDepositorName(p.bankAccountHolder ?? "");
      setEditingPayout(
        p.signupMode !== "anonymous" &&
          !(p.bankCode && p.bankAccountNumber && p.bankAccountHolder),
      );

      if (p.role !== "USER") {
        setErr("일반 회원 전용 메뉴입니다.");
        return;
      }

      const [wallet, list, depositInfo] = await Promise.all([
        apiFetch<{ balance: string }>("/me/wallet"),
        apiFetch<WReq[]>("/me/wallet-requests"),
        apiFetch<DepositAccountInfo>("/me/deposit-account"),
      ]);
      setBalance(wallet.balance);
      setRequests(list);
      setDepositAccountInfo(depositInfo);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isAnonymousUser) {
      setDepositAmount((prev) => (prev === "10000" ? "100" : prev));
      setWithdrawAmount((prev) => (prev === "10000" ? "100" : prev));
    }
  }, [isAnonymousUser]);

  useEffect(() => {
    const target = getInitialTarget(initialOpts);
    setSelectedSection(target);
    const node = target === "withdraw" ? withdrawRef.current : depositRef.current;
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

  function jumpToSection(target: "deposit" | "withdraw") {
    setSelectedSection(target);
    const node = target === "withdraw" ? withdrawRef.current : depositRef.current;
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submitDepositRequest(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(depositAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setSuccess(null);
      setErr(isAnonymousUser ? "테더 입금 수량을 확인해주세요." : "입금 금액을 확인해주세요.");
      return;
    }

    if (!isAnonymousUser && !hasRegisteredDepositAccount) {
      setSuccess(null);
      setErr("입금 신청 전 등록 계좌를 먼저 저장해주세요.");
      return;
    }

    setSubmittingType("DEPOSIT");
    setErr(null);
    setSuccess(null);
    try {
      await apiFetch("/me/wallet-requests", {
        method: "POST",
        body: JSON.stringify(
          isAnonymousUser
            ? {
                type: "DEPOSIT",
                amount,
                currency: "USDT",
                note: depositNote.trim() || undefined,
              }
            : {
                type: "DEPOSIT",
                amount,
                currency: "KRW",
                depositorName:
                  profile?.bankAccountHolder?.trim() || depositDepositorName.trim(),
              },
        ),
      });
      setDepositAmount("10000");
      setDepositDepositorName(profile?.bankAccountHolder ?? "");
      setDepositNote("");
      setSuccess(
        isAnonymousUser
          ? "테더 입금 신청이 저장되었습니다."
          : "등록 계좌 기준 원화 입금 신청이 저장되었습니다. 등록 계좌에서 입금하면 자동충전됩니다.",
      );
      await load();
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : isAnonymousUser
            ? "테더 입금 신청에 실패했습니다."
            : "입금 신청에 실패했습니다.",
      );
    } finally {
      setSubmittingType(null);
    }
  }

  async function submitWithdrawalRequest(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(withdrawAmount);

    if (isAnonymousUser ? !hasUsdtWallet : !hasPayoutAccount) {
      setSuccess(null);
      setErr(
        isAnonymousUser
          ? "테더 지갑 주소를 먼저 등록해주세요."
          : "출금 계좌를 먼저 등록해주세요.",
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSuccess(null);
      setErr(isAnonymousUser ? "출금 수량을 확인해주세요." : "출금 금액을 확인해주세요.");
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
          currency: isAnonymousUser ? "USDT" : "KRW",
        }),
      });
      setWithdrawAmount("10000");
      setSuccess(
        isAnonymousUser
          ? "테더 출금 신청이 접수되었습니다."
          : "원화 출금 신청이 접수되었습니다.",
      );
      await load();
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : isAnonymousUser
            ? "테더 출금 신청에 실패했습니다."
            : "출금 신청에 실패했습니다.",
      );
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

  async function saveUsdtWallet(address: string) {
    setErr(null);
    setSuccess(null);
    await apiFetch("/me/usdt-wallet", {
      method: "PATCH",
      body: JSON.stringify({
        usdtWalletAddress: address,
      }),
    });
    setSuccess("테더 지갑 주소가 저장되었습니다.");
    await load();
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
            가입 유형에 따라 입금과 출금 방식이 자동으로 달라집니다.
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
          <div className={isPage ? "mt-6" : "mt-1"}>
            <div className={shellCardClass}>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                보유 머니
              </p>
              <p className="mt-3 font-mono text-3xl font-bold text-main-gold">
                {formatKrwWithSymbol(balance)}
              </p>
              <p className="mt-3 text-sm text-zinc-400">
                {isAnonymousUser
                  ? "무기명 회원은 테더 환율 기준으로 입출금이 처리됩니다."
                  : "일반 회원은 원화 입금과 원화 출금 계좌를 사용합니다."}
              </p>
            </div>
          </div>

          <div
            className={`grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 ${
              isPage ? "mt-6" : "mt-4"
            } md:grid-cols-2`}
          >
            {[
              {
                key: "deposit" as const,
                label: isAnonymousUser ? "테더입금" : "원화입금",
                hint: isAnonymousUser ? "USDT 수량 + 메모" : "등록계좌 + 자동충전",
              },
              {
                key: "withdraw" as const,
                label: isAnonymousUser ? "테더출금" : "원화출금",
                hint: isAnonymousUser ? "지갑 저장 후 출금" : "계좌 저장 후 출금",
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => jumpToSection(item.key)}
                className={`rounded-xl px-4 py-3 text-left transition-all ${
                  selectedSection === item.key
                    ? "bg-gold-gradient text-black"
                    : "border border-white/8 bg-black/20 text-zinc-300 hover:border-[rgba(218,174,87,0.35)] hover:text-white"
                }`}
              >
                <p className="text-sm font-bold">{item.label}</p>
                <p
                  className={`mt-1 text-xs ${
                    selectedSection === item.key ? "text-black/75" : "text-zinc-500"
                  }`}
                >
                  {item.hint}
                </p>
              </button>
            ))}
          </div>

          <div className={`grid gap-4 ${isPage ? "mt-6" : "mt-4"} xl:grid-cols-2`}>
            <div ref={depositRef} className={shellCardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isAnonymousUser ? "테더 입금 신청" : "원화 입금 신청"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {isAnonymousUser
                      ? "무기명 회원은 테더 수량 기준으로 입금 요청을 남깁니다."
                      : "반가상 입금 계좌와 회원님의 등록 계좌를 확인한 뒤 입금 신청이 저장됩니다."}
                  </p>
                </div>
                <span className="rounded-full bg-gold-gradient px-3 py-1 text-xs font-bold text-black">
                  입금
                </span>
              </div>

              <form onSubmit={submitDepositRequest} className="mt-5 space-y-4">
                {!isAnonymousUser ? (
                  <>
                    <div className="rounded-2xl border border-[rgba(218,174,87,0.2)] bg-[rgba(218,174,87,0.06)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-main-gold-solid/60">
                            반가상 입금 계좌
                          </p>
                          <p className="mt-2 text-sm text-zinc-400">
                            아래 계좌로 등록된 계좌에서 입금하면 자동충전 기준으로 처리됩니다.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-main-gold-solid">
                          {depositAccountInfo?.autoCreditEnabled ? "자동충전" : "확인중"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-zinc-500">은행명</p>
                          <p className="mt-1 font-semibold text-white">
                            {depositAccount?.bankName ?? "미등록"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">예금주</p>
                          <p className="mt-1 font-semibold text-white">
                            {depositAccount?.accountHolder ?? "미등록"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500">계좌번호</p>
                          <p className="mt-1 break-all font-mono text-sm font-semibold text-white">
                            {depositAccount?.accountNumber ?? depositAccount?.accountHint ?? "미등록"}
                          </p>
                        </div>
                      </div>

                      {depositAccount?.accountHint || depositAccount?.recipientPhone ? (
                        <p className="mt-3 text-xs text-zinc-500">
                          {depositAccount.accountHint
                            ? `계좌 식별 힌트: ${depositAccount.accountHint}`
                            : `수신 번호: ${depositAccount.recipientPhone}`}
                        </p>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-black/25 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            내 등록 계좌
                          </p>
                          <p className="mt-2 text-sm text-zinc-400">
                            입금 신청은 이 등록 계좌 예금주명 기준으로 저장됩니다.
                          </p>
                        </div>
                        {!hasRegisteredDepositAccount ? (
                          <button
                            type="button"
                            onClick={() => jumpToSection("withdraw")}
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5"
                          >
                            계좌 등록하기
                          </button>
                        ) : null}
                      </div>

                      {hasRegisteredDepositAccount ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-zinc-500">은행명</p>
                            <p className="mt-1 font-semibold text-white">
                              {registeredDepositBankLabel}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">예금주</p>
                            <p className="mt-1 font-semibold text-white">
                              {registeredDepositAccount?.accountHolder ?? profile?.bankAccountHolder ?? "미등록"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">계좌번호</p>
                            <p className="mt-1 break-all font-mono text-sm font-semibold text-white">
                              {registeredDepositAccount?.accountNumber ?? profile?.bankAccountNumber ?? "미등록"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-500">
                          등록 계좌가 없어서 원화 입금 자동충전을 사용할 수 없습니다. 아래 출금 계좌를 먼저 저장해주세요.
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                <label className="block text-sm text-zinc-400">
                  {isAnonymousUser ? "입금 수량 (USDT)" : "입금 금액"}
                  <input
                    type="number"
                    min={1}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className={fieldClass}
                  />
                </label>

                {isAnonymousUser ? (
                  <label className="block text-sm text-zinc-400">
                    메모 / TXID (선택)
                    <input
                      value={depositNote}
                      onChange={(e) => setDepositNote(e.target.value)}
                      placeholder="전송 메모가 있으면 입력"
                      className={fieldClass}
                    />
                  </label>
                ) : (
                  <div className="rounded-xl border border-white/8 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-400">
                    자동 입금자명:{" "}
                    <span className="font-semibold text-zinc-100">
                      {registeredDepositAccount?.accountHolder ?? profile?.bankAccountHolder ?? "등록 계좌 필요"}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submittingType === "DEPOSIT" ||
                    (!isAnonymousUser && !hasRegisteredDepositAccount)
                  }
                  className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submittingType === "DEPOSIT"
                    ? isAnonymousUser
                      ? "테더 입금 신청 중…"
                      : "입금 신청 중…"
                    : isAnonymousUser
                      ? "테더 입금 신청 저장"
                      : hasRegisteredDepositAccount
                        ? "입금 신청 저장"
                        : "등록 계좌 필요"}
                </button>
              </form>
            </div>

            <div ref={withdrawRef} className={shellCardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {isAnonymousUser ? "테더 출금 신청" : "원화 출금 신청"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {isAnonymousUser
                      ? "무기명 회원은 등록된 테더 지갑으로만 출금할 수 있습니다."
                      : "출금 계좌가 없으면 먼저 저장하고, 등록되어 있으면 바로 출금 요청 API를 호출합니다."}
                  </p>
                </div>
                {!isAnonymousUser && hasPayoutAccount && !editingPayout ? (
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
                {isAnonymousUser ? (
                  <>
                    <UsdtDepositPanel
                      savedAddress={profile?.usdtWalletAddress}
                      krwBalanceDisplay={balance ?? undefined}
                      onSaveAddress={saveUsdtWallet}
                    />

                    {hasUsdtWallet ? (
                      <form onSubmit={submitWithdrawalRequest} className="space-y-4 rounded-2xl border border-white/8 bg-black/25 p-4">
                        <label className="block text-sm text-zinc-400">
                          출금 수량 (USDT)
                          <input
                            type="number"
                            min={1}
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className={fieldClass}
                          />
                        </label>

                        <div className="rounded-xl border border-white/8 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-400">
                          현재 환율 기준 출금 가능:{" "}
                          <span className="font-mono font-bold text-main-gold">
                            {formatUsdt(withdrawableUsdt)} USDT
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingType === "WITHDRAWAL"}
                          className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {submittingType === "WITHDRAWAL"
                            ? "테더 출금 신청 중…"
                            : "테더 출금 신청 저장"}
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
                        테더 지갑 주소를 먼저 저장하면 바로 출금 신청할 수 있습니다.
                      </div>
                    )}
                  </>
                ) : hasPayoutAccount && !editingPayout ? (
                  <>
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
                          {formatKrwWithSymbol(balance)}
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
                  </>
                ) : (
                  <>
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

                    {!hasPayoutAccount ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-500">
                        출금 계좌를 먼저 저장하면 바로 출금 신청할 수 있습니다.
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
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
                            {request.type === "DEPOSIT"
                              ? request.currency === "USDT"
                                ? "테더 입금 신청"
                                : "원화 입금 신청"
                              : request.currency === "USDT"
                                ? "테더 출금 신청"
                                : "원화 출금 신청"}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${requestStatusClass(request.status)}`}
                          >
                            {requestStatusLabel(request.status)}
                          </span>
                        </div>
                        <p className="font-mono text-lg font-bold text-main-gold">
                          {formatRequestAmount(request)}
                        </p>
                        {request.depositorName ? (
                          <p className="text-sm text-zinc-400">
                            입금자명:{" "}
                            <span className="font-medium text-zinc-200">
                              {request.depositorName}
                            </span>
                          </p>
                        ) : null}
                        {request.note ? (
                          <p className="text-sm text-zinc-500">메모: {request.note}</p>
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

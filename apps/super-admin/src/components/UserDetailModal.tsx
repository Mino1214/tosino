"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// ─── 타입 ────────────────────────────────────────────────────
export type UserRow = {
  id: string;
  loginId?: string | null;
  email?: string | null;
  displayName?: string | null;
  signupMode?: string | null;
  role: string;
};

type OverviewData = {
  user: {
    id: string;
    loginId?: string | null;
    email?: string | null;
    role: string;
    displayName: string | null;
    signupMode?: string | null;
    signupReferralInput?: string | null;
    registrationStatus?: string | null;
    createdAt: string;
    referredBy?: { loginId?: string | null; displayName?: string | null } | null;
    parent?: { loginId?: string | null; displayName?: string | null; referralCode?: string | null } | null;
    bankCode?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
    usdtWalletAddress?: string | null;
    rollingEnabled: boolean;
    rollingSportsDomesticPct?: string | null;
    rollingSportsOverseasPct?: string | null;
    rollingCasinoPct?: string | null;
    rollingSlotPct?: string | null;
    rollingMinigamePct?: string | null;
    agentMemo?: string | null;
    userMemo?: string | null;
    uplinePrivateMemo?: string | null;
  };
  wallet: {
    balance: string;
    pointBalance: string;
    lockedDeposit?: string;
    lockedWin?: string;
    compFree?: string;
    pointFree?: string;
    totalBalance?: string;
    withdrawableBalance?: string;
    withdrawCurrency: string;
    withdrawBlocked: boolean;
    withdrawableKrw: string;
    withdrawableUsdt: string;
  };
  rolling: {
    lockWithdrawals: boolean;
    turnoverMultiplier: string;
    requiredTurnover: string;
    appliedTurnover: string;
    remainingTurnover: string;
    achievementPct: number;
    openCount: number;
    obligations?: {
      id: string;
      sourceRef: string;
      principalAmount: string;
      requiredTurnover: string;
      appliedTurnover: string;
      createdAt: string;
    }[];
  };
  pointExchange: {
    redeemKrwPerPoint: string | null;
    redeemableKrw: string | null;
    redeemableUsdt: string | null;
  };
  recentWalletRequests: {
    id: string; type: string; amount: string; currency: string;
    status: string; depositorName: string | null; note: string | null;
    resolverNote: string | null; createdAt: string;
  }[];
  recentSemiVirtualLogs: {
    id: string; status: string; failureReason: string | null;
    recipientPhoneSnapshot: string | null; rawBody: string; createdAt: string;
  }[];
};

type LedgerItem = {
  id: string; type: string; amount: string; balanceAfter: string;
  reference: string | null; note: unknown; vertical: unknown; createdAt: string;
};
type WalletReqItem = {
  id: string; type: string; status: string; amount: string; currency: string;
  depositorName: string | null; note: string | null; resolverNote: string | null;
  createdAt: string; resolvedAt: string | null;
};
type UsdtTxItem = {
  id: string; txHash: string; fromAddress: string; usdtAmount: string;
  krwRate: string; krwAmount: string; status: string;
  resolverNote: string | null; createdAt: string;
};
type PointItem = {
  id: string; type: string; amount: string; balanceAfter: string;
  reference: string | null; createdAt: string;
};
type RollingObItem = {
  id: string; sourceRef: string; principalAmount: string;
  requiredTurnover: string; appliedTurnover: string;
  pct: number; satisfiedAt: string | null; createdAt: string;
};

// ─── 유틸 ───────────────────────────────────────────────────
function krw(v: string | number | null | undefined) {
  try {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n.toLocaleString("ko-KR") : "0";
  } catch {
    return "0";
  }
}
function usdt2(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}
function dt(s: string | null | undefined) {
  try {
    if (s == null || s === "") return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("ko-KR", {
      month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return "—";
  }
}
function dateOnlyKo(s: string | null | undefined): string {
  try {
    if (s == null || s === "") return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ko-KR");
  } catch {
    return "—";
  }
}
function typeKr(t: string) {
  const map: Record<string, string> = {
    BET: "베팅", WIN: "당첨", DEPOSIT: "입금", WITHDRAWAL: "출금",
    ADJUSTMENT: "조정", POINT_REDEEM: "포인트전환",
    LOSE_BET: "패배포인트", ADJUSTMENT_ADD: "조정+",
  };
  return map[t] ?? t;
}
function statusBadge(s: string) {
  if (s === "APPROVED" || s === "AUTO_CREDITED" || s === "CONFIRMED")
    return "text-green-400 bg-green-400/10";
  if (s === "PENDING") return "text-amber-400 bg-amber-400/10";
  if (s === "REJECTED" || s === "FAILED") return "text-red-400 bg-red-400/10";
  return "text-zinc-400 bg-zinc-400/10";
}
function amountColor(t: string, amount: string) {
  const n = Number(amount);
  if (t === "WIN" || t === "DEPOSIT" || (n > 0 && t !== "BET")) return "text-green-300";
  if (t === "BET" || n < 0) return "text-red-300";
  return "text-zinc-300";
}

// ─── 공통 테이블 컴포넌트 ────────────────────────────────────
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-medium text-zinc-500 whitespace-nowrap sticky top-0 bg-zinc-900">{children}</th>;
}
function Td({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return <td title={title} className={`px-3 py-1.5 whitespace-nowrap text-xs ${className ?? "text-zinc-300"}`}>{children}</td>;
}
function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return <tr><td colSpan={cols} className="py-8 text-center text-xs text-zinc-600">{msg}</td></tr>;
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
type TabKey = "overview" | "ledger" | "requests" | "usdt" | "points" | "rolling" | "memo";

interface Props {
  user: UserRow;
  platformId: string;
  onClose: () => void;
}

export default function UserDetailModal({ user, platformId, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // lazy-loaded tab data
  const [ledger, setLedger] = useState<LedgerItem[] | null>(null);
  const [requests, setRequests] = useState<WalletReqItem[] | null>(null);
  const [usdtTxs, setUsdtTxs] = useState<UsdtTxItem[] | null>(null);
  const [points, setPoints] = useState<{ currentBalance: string; items: PointItem[] } | null>(null);
  const [rolling, setRolling] = useState<RollingObItem[] | null>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabErr, setTabErr] = useState<string | null>(null);

  // memo editing
  const [agentMemo, setAgentMemo] = useState("");
  const [userMemo, setUserMemo] = useState("");
  const [masterMemo, setMasterMemo] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoMsg, setMemoMsg] = useState<string | null>(null);

  const loginLabel = user.loginId ?? user.email ?? user.id;

  // Load overview on mount
  useEffect(() => {
    setOverviewLoading(true);
    apiFetch<OverviewData>(`/platforms/${platformId}/users/${user.id}/overview`)
      .then((d) => {
        setOverview(d);
        setAgentMemo(d.user.agentMemo ?? "");
        setUserMemo(d.user.userMemo ?? "");
        setMasterMemo(d.user.uplinePrivateMemo ?? "");
      })
      .catch(() => {})
      .finally(() => setOverviewLoading(false));
  }, [user.id, platformId]);

  const loadTab = useCallback(async (t: TabKey) => {
    if (t === "overview" || t === "memo") return;
    setTabLoading(true);
    setTabErr(null);
    try {
      const base = `/platforms/${platformId}/users/${user.id}`;
      if (t === "ledger" && !ledger) {
        const d = await apiFetch<{ items: LedgerItem[] }>(`${base}/ledger?limit=200`);
        setLedger(d.items);
      }
      if (t === "requests" && !requests) {
        const d = await apiFetch<{ items: WalletReqItem[] }>(`${base}/wallet-requests-history?limit=200`);
        setRequests(d.items);
      }
      if (t === "usdt" && !usdtTxs) {
        const d = await apiFetch<{ items: UsdtTxItem[] }>(`${base}/usdt-txs`);
        setUsdtTxs(d.items);
      }
      if (t === "points" && !points) {
        const d = await apiFetch<{ currentBalance: string; items: PointItem[] }>(`${base}/points-history?limit=200`);
        setPoints(d);
      }
      if (t === "rolling" && !rolling) {
        const d = await apiFetch<{ items: RollingObItem[] }>(`${base}/rolling-obligations`);
        setRolling(d.items);
      }
    } catch (e) {
      setTabErr(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setTabLoading(false);
    }
  }, [user.id, platformId, ledger, requests, usdtTxs, points, rolling]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTab(tab); }, [tab]);

  const saveMemos = async () => {
    setMemoSaving(true);
    setMemoMsg(null);
    const base = `/platforms/${platformId}/users/${user.id}`;
    try {
      await Promise.all([
        apiFetch(`${base}/agent-memo`, { method: "PATCH", body: JSON.stringify({ memo: agentMemo }) }),
        apiFetch(`${base}/user-memo`, { method: "PATCH", body: JSON.stringify({ memo: userMemo }) }),
        apiFetch(`${base}/upline-private-memo`, { method: "PATCH", body: JSON.stringify({ memo: masterMemo }) }),
      ]);
      setMemoMsg("저장됐습니다.");
    } catch (e) {
      setMemoMsg(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setMemoSaving(false);
    }
  };

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "overview", label: "개요" },
    { key: "ledger", label: `원장${ledger ? `(${ledger.length})` : ""}` },
    { key: "requests", label: `입출금${requests ? `(${requests.length})` : ""}` },
    { key: "usdt", label: `USDT TX${usdtTxs ? `(${usdtTxs.length})` : ""}` },
    { key: "points", label: `포인트${points ? `(${points.items.length})` : ""}` },
    { key: "rolling", label: `롤링 의무${rolling ? `(${rolling.length})` : ""}` },
    { key: "memo", label: "메모" },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-10"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-5xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-zinc-100 font-mono">{loginLabel}</span>
              {user.displayName && (
                <span className="text-sm text-zinc-500">({user.displayName})</span>
              )}
              {user.signupMode === "anonymous" && (
                <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-300">USDT무기명</span>
              )}
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{user.role}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">ID: {user.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 rounded px-3 py-1.5 text-xs font-medium transition ${
                tab === t.key
                  ? "bg-amber-600/20 text-amber-300"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 탭 내용 */}
        <div className="p-5">
          {tabErr && (
            <div className="mb-3 rounded bg-red-950/40 px-3 py-2 text-xs text-red-300">{tabErr}</div>
          )}
          {tabLoading && <p className="py-6 text-center text-sm text-zinc-500">불러오는 중...</p>}

          {/* ── 개요 탭 ── */}
          {tab === "overview" && (
            overviewLoading ? (
              <p className="py-6 text-center text-sm text-zinc-500">불러오는 중...</p>
            ) : overview ? (
              <div className="space-y-5">
                {/* 잔액 카드 4개 */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "총 잔액", val: `${krw(overview.wallet.totalBalance ?? overview.wallet.balance)}원`, color: "text-amber-300" },
                    { label: "출금 가능(정책)", val: overview.wallet.withdrawCurrency === "USDT" ? `${usdt2(overview.wallet.withdrawableUsdt)} USDT` : `${krw(overview.wallet.withdrawableBalance ?? overview.wallet.withdrawableKrw)}원`, color: "text-zinc-100" },
                    { label: "롤링 달성", val: `${overview.rolling.achievementPct}%`, color: "text-cyan-300" },
                    { label: "포인트", val: `${krw(overview.wallet.pointBalance)} P`, color: "text-emerald-300" },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{c.label}</p>
                      <p className={`mt-2 text-xl font-bold ${c.color}`}>{c.val}</p>
                    </div>
                  ))}
                </div>

                <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-100">자금 출처별 버킷</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {[
                      ["잠금 입금", overview.wallet.lockedDeposit ?? "0"],
                      ["잠금 당첨", overview.wallet.lockedWin ?? "0"],
                      ["콤프 적립", overview.wallet.compFree ?? "0"],
                      ["포인트 전환", overview.wallet.pointFree ?? "0"],
                    ].map(([label, amt]) => (
                      <div key={label} className="rounded border border-zinc-800 bg-black/20 px-2 py-2">
                        <p className="text-zinc-500">{label}</p>
                        <p className="mt-1 font-mono text-zinc-200">{krw(amt)}원</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-600">
                    출금 가능액(API): 롤링 미충족 시 콤프·포인트 전환 풀만, 충족 시 전 버킷 합산과 동일하게 표시됩니다.
                  </p>
                </section>

                <div className="grid gap-4 xl:grid-cols-2">
                  {/* 기본 정보 */}
                  <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-100">가입 · 계정 정보</h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        ["가입유형", overview.user.signupMode === "anonymous" ? "무기명(USDT)" : "일반"],
                        ["가입상태", overview.user.registrationStatus ?? "—"],
                        ["가입코드 입력", overview.user.signupReferralInput ?? "—"],
                        ["추천인", overview.user.referredBy?.loginId ?? "—"],
                        ["소속 총판", overview.user.parent?.loginId ?? "—"],
                        ["총판 코드", overview.user.parent?.referralCode ?? "—"],
                        ["가입일", dateOnlyKo(overview.user.createdAt)],
                        ["출금 수단", overview.user.signupMode === "anonymous"
                          ? (overview.user.usdtWalletAddress ?? "지갑 미등록")
                          : (overview.user.bankAccountHolder && overview.user.bankAccountNumber
                            ? `${overview.user.bankAccountHolder} · ${overview.user.bankAccountNumber}`
                            : "계좌 미등록")],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <p className="text-zinc-500">{label}</p>
                          <p className="mt-0.5 font-mono text-zinc-200 break-all">{val}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 롤링 상태 */}
                  <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-100">롤링 현황</h3>
                    <div className="mb-3 h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400"
                        style={{ width: `${Math.min(100, Math.max(0, overview.rolling.achievementPct))}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        ["필요 턴오버", `${krw(overview.rolling.requiredTurnover)}원`],
                        ["적용 턴오버", `${krw(overview.rolling.appliedTurnover)}원`],
                        ["남은 롤링", `${krw(overview.rolling.remainingTurnover)}원`],
                        ["열린 의무", `${overview.rolling.openCount}건`],
                        ["출금 잠금", overview.rolling.lockWithdrawals ? "사용" : "사용 안 함"],
                        ["배수", `${overview.rolling.turnoverMultiplier}배`],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <p className="text-zinc-500">{label}</p>
                          <p className="mt-0.5 text-zinc-200">{val}</p>
                        </div>
                      ))}
                    </div>
                    {overview.rolling.obligations && overview.rolling.obligations.length > 0 && (
                      <div className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded border border-zinc-800 bg-black/30 p-2 text-[10px]">
                        <p className="font-semibold text-zinc-400">진행 중 의무</p>
                        {overview.rolling.obligations.map((o) => (
                          <div key={o.id} className="font-mono text-zinc-300">
                            {o.sourceRef.slice(0, 24)}… 본금 {krw(o.principalAmount)} / 필요 {krw(o.requiredTurnover)} / 적용 {krw(o.appliedTurnover)}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-5 gap-1.5 text-[10px]">
                      {[
                        ["국내", overview.user.rollingSportsDomesticPct],
                        ["해외", overview.user.rollingSportsOverseasPct],
                        ["카지노", overview.user.rollingCasinoPct],
                        ["슬롯", overview.user.rollingSlotPct],
                        ["미니", overview.user.rollingMinigamePct],
                      ].map(([label, pct]) => (
                        <div key={label} className="rounded border border-zinc-800 bg-black/20 px-2 py-1.5 text-center">
                          <p className="text-zinc-500">{label}</p>
                          <p className="mt-0.5 font-mono text-zinc-200">
                            {overview.user.rollingEnabled ? (pct ?? "—") : "OFF"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* 최근 입출금 */}
                <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-zinc-100">최근 입출금 신청</h3>
                  {overview.recentWalletRequests.length === 0 ? (
                    <p className="text-xs text-zinc-600">없음</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-zinc-500">
                            <Th>시각</Th><Th>구분</Th><Th>금액</Th><Th>통화</Th><Th>상태</Th><Th>예금주</Th><Th>메모</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.recentWalletRequests.map((r) => (
                            <tr key={r.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                              <Td>{dt(r.createdAt)}</Td>
                              <Td>{r.type}</Td>
                              <Td>{krw(r.amount)}</Td>
                              <Td>{r.currency}</Td>
                              <Td><span className={`rounded px-1.5 py-0.5 ${statusBadge(r.status)}`}>{r.status}</span></Td>
                              <Td className="text-zinc-400">{r.depositorName ?? "—"}</Td>
                              <Td className="text-zinc-500 max-w-[120px] truncate">{r.note ?? r.resolverNote ?? "—"}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* 반가상 로그 */}
                {overview.recentSemiVirtualLogs.length > 0 && (
                  <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-zinc-100">반가상 연동 로그</h3>
                    <div className="space-y-2">
                      {overview.recentSemiVirtualLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="rounded-lg border border-zinc-800 bg-black/20 px-3 py-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-300">{log.status}</span>
                            <span className="text-zinc-600">{dt(log.createdAt)}</span>
                          </div>
                          {log.failureReason && <p className="mt-1 text-amber-400">{log.failureReason}</p>}
                          <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-[10px] text-zinc-600">
                            {log.rawBody.length > 120 ? `${log.rawBody.slice(0, 120)}…` : log.rawBody}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : null
          )}

          {/* ── 원장 탭 ── */}
          {tab === "ledger" && !tabLoading && ledger && (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <Th>시각</Th><Th>타입</Th><Th>금액</Th><Th>처리후잔액</Th><Th>메모/Ref</Th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 ? <EmptyRow cols={5} msg="원장 데이터 없음" /> : ledger.map((l) => (
                    <tr key={l.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(l.createdAt)}</Td>
                      <Td><span className={amountColor(l.type, l.amount)}>{typeKr(l.type)}</span></Td>
                      <Td className={amountColor(l.type, l.amount)}>
                        {Number(l.amount) >= 0 ? "+" : ""}{krw(l.amount)}
                      </Td>
                      <Td>{krw(l.balanceAfter)}</Td>
                      <Td className="text-zinc-500 max-w-[200px] truncate">
                        {String(l.note ?? l.reference ?? "—")}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 입출금 탭 ── */}
          {tab === "requests" && !tabLoading && requests && (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <Th>신청시각</Th><Th>구분</Th><Th>상태</Th><Th>금액</Th><Th>통화</Th>
                    <Th>예금주</Th><Th>처리메모</Th><Th>처리시각</Th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? <EmptyRow cols={8} msg="신청 내역 없음" /> : requests.map((r) => (
                    <tr key={r.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(r.createdAt)}</Td>
                      <Td>{r.type}</Td>
                      <Td><span className={`rounded px-1.5 py-0.5 ${statusBadge(r.status)}`}>{r.status}</span></Td>
                      <Td className={r.type === "DEPOSIT" ? "text-green-300" : "text-red-300"}>{krw(r.amount)}</Td>
                      <Td>{r.currency}</Td>
                      <Td className="text-zinc-400">{r.depositorName ?? "—"}</Td>
                      <Td className="text-zinc-500 max-w-[120px] truncate">{r.resolverNote ?? r.note ?? "—"}</Td>
                      <Td className="text-zinc-500">{r.resolvedAt ? dt(r.resolvedAt) : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── USDT TX 탭 ── */}
          {tab === "usdt" && !tabLoading && usdtTxs && (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <Th>시각</Th><Th>TxHash</Th><Th>USDT</Th><Th>환율</Th><Th>KRW환산</Th><Th>상태</Th><Th>메모</Th>
                  </tr>
                </thead>
                <tbody>
                  {usdtTxs.length === 0 ? <EmptyRow cols={7} msg="USDT 입금 내역 없음" /> : usdtTxs.map((t) => (
                    <tr key={t.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(t.createdAt)}</Td>
                      <Td className="font-mono text-zinc-500 max-w-[100px] truncate" title={t.txHash}>{t.txHash.slice(0, 12)}…</Td>
                      <Td className="text-amber-300">{Number(t.usdtAmount).toFixed(4)} USDT</Td>
                      <Td className="text-zinc-400">{krw(t.krwRate)}원</Td>
                      <Td className="text-green-300">{krw(t.krwAmount)}원</Td>
                      <Td><span className={`rounded px-1.5 py-0.5 ${statusBadge(t.status)}`}>{t.status}</span></Td>
                      <Td className="text-zinc-500">{t.resolverNote ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 포인트 탭 ── */}
          {tab === "points" && !tabLoading && points && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-zinc-400">현재 포인트 잔액:</span>
                <span className="text-lg font-bold text-emerald-300">{krw(points.currentBalance)} P</span>
              </div>
              <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <Th>시각</Th><Th>타입</Th><Th>변동</Th><Th>잔액</Th><Th>Ref</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.items.length === 0 ? <EmptyRow cols={5} msg="포인트 내역 없음" /> : points.items.map((p) => (
                      <tr key={p.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                        <Td>{dt(p.createdAt)}</Td>
                        <Td>{typeKr(p.type)}</Td>
                        <Td className={Number(p.amount) >= 0 ? "text-emerald-300" : "text-red-300"}>
                          {Number(p.amount) >= 0 ? "+" : ""}{krw(p.amount)} P
                        </Td>
                        <Td>{krw(p.balanceAfter)} P</Td>
                        <Td className="text-zinc-500">{p.reference ?? "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── 롤링 의무 탭 ── */}
          {tab === "rolling" && !tabLoading && rolling && (
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <Th>생성시각</Th><Th>Ref</Th><Th>원금</Th><Th>필요</Th><Th>적용</Th><Th>달성률</Th><Th>충족</Th>
                  </tr>
                </thead>
                <tbody>
                  {rolling.length === 0 ? <EmptyRow cols={7} msg="롤링 의무 없음" /> : rolling.map((r) => (
                    <tr key={r.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(r.createdAt)}</Td>
                      <Td className="text-zinc-500 max-w-[120px] truncate">{r.sourceRef}</Td>
                      <Td>{krw(r.principalAmount)}</Td>
                      <Td>{krw(r.requiredTurnover)}</Td>
                      <Td>{krw(r.appliedTurnover)}</Td>
                      <Td>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full bg-zinc-800">
                            <div
                              className={`h-1.5 rounded-full ${r.pct >= 100 ? "bg-green-500" : "bg-amber-500"}`}
                              style={{ width: `${Math.min(r.pct, 100)}%` }}
                            />
                          </div>
                          <span className={r.pct >= 100 ? "text-green-400" : "text-amber-400"}>{r.pct}%</span>
                        </div>
                      </Td>
                      <Td>
                        {r.satisfiedAt
                          ? <span className="text-green-400">✓ {dt(r.satisfiedAt)}</span>
                          : <span className="text-zinc-500">미충족</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 메모 탭 ── */}
          {tab === "memo" && (
            <div className="space-y-4 max-w-xl">
              {[
                { label: "총판 메모 (에이전트 전용)", val: agentMemo, set: setAgentMemo, placeholder: "에이전트만 볼 수 있는 메모" },
                { label: "회원 메모 (회원 본인 + 관리자)", val: userMemo, set: setUserMemo, placeholder: "회원도 볼 수 있는 메모" },
                { label: "식별 메모 (uplinePrivateMemo, 관리자 전용)", val: masterMemo, set: setMasterMemo, placeholder: "운영자 내부 식별 메모" },
              ].map(({ label, val, set, placeholder }) => (
                <div key={label}>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">{label}</label>
                  <textarea
                    rows={3}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <button
                  onClick={saveMemos}
                  disabled={memoSaving}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
                >
                  {memoSaving ? "저장 중..." : "저장"}
                </button>
                {memoMsg && (
                  <span className={`text-sm ${memoMsg.includes("저장") ? "text-green-400" : "text-red-400"}`}>
                    {memoMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

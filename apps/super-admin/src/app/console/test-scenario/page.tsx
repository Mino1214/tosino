"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

// ─── 타입 ───────────────────────────────────────────────────
interface LedgerRow {
  id: string;
  type: string;
  result: string | null;        // "당첨" | "낙첨" | null
  betAmount: number;
  winAmount: number;
  netResult: number;
  balanceAfter: number;
  note: string | null;
  createdAt: string;
}
interface WalletRequestRow {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  depositorName: string | null;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
}
interface UsdtTxRow {
  id: string;
  txHash: string;
  usdtAmount: number;
  krwAmount: number | null;
  status: string;
  note: string | null;
  createdAt: string;
}
interface RollingRow {
  id: string;
  required: number;
  accumulated: number;
  fulfilled: boolean;
  createdAt: string;
}
interface PointRow {
  id: string;
  delta: number;
  reason: string | null;
  createdAt: string;
}
interface UserDetail {
  id: string;
  loginId: string;
  password: string;
  role: string;
  name: string;
  signupMode: string;
  usdtWallet: string | null;
  parentLoginId: string | null;
  /** 총판(MASTER_AGENT)만 — 구 API 호환을 위해 생략 가능 */
  agentCommission?: {
    platformSharePct: number | null;
    splitFromParentPct: number | null;
    effectiveSharePct: number;
  } | null;
  wallet: { balance: number; pointBalance: number; compBalance: number } | null;
  summary: {
    totalBet: number;
    totalWin: number;
    netPnl: number;
    totalRollingAccum: number;
    totalRollingReq: number;
    rollingPct: number;
    totalPoints: number;
  };
  ledger: LedgerRow[];
  walletRequests: WalletRequestRow[];
  usdtTxs: UsdtTxRow[];
  rolling: RollingRow[];
  points: PointRow[];
}
interface DetailedState {
  password: string;
  accounts: {
    topAgents: UserDetail[];
    subAgents: UserDetail[];
    krwUsers: UserDetail[];
    usdtUsers: UserDetail[];
  };
  totals: {
    agents: number;
    users: number;
    ledgerEntries: number;
    walletRequests: number;
    usdtTxs: number;
    rollingObs: number;
    pointEntries: number;
  };
}

// ─── 스텝 정의 ───────────────────────────────────────────────
const STEPS = [
  { step: 1, name: "SETUP", emoji: "🏗️", desc: "총판(최상위2+하위4) + KRW유저 9명 + USDT유저 3명 생성" },
  { step: 2, name: "DEPOSIT_REQUEST", emoji: "📨", desc: "KRW 입금신청 + USDT 입금 시뮬레이션 (최소미달 포함)" },
  { step: 3, name: "DEPOSIT_APPROVE", emoji: "✅", desc: "반가상 자동승인 + USDT 최소금액 이상 자동크레딧" },
  { step: 4, name: "CASINO_PLAY", emoji: "🎰", desc: "8라운드 카지노 시뮬레이션 (승3+패5), BET/WIN 원장 + 롤링 적립" },
  { step: 5, name: "ROLLING_FULFILL", emoji: "🔄", desc: "롤링 잔여량만큼 추가 베팅해서 출금조건 충족" },
  { step: 6, name: "COMP_POINTS", emoji: "🎁", desc: "테스트 유저 전체에 500포인트 일괄지급" },
  { step: 7, name: "WITHDRAWAL_REQUEST", emoji: "📤", desc: "출금신청 (잔액 80%, KRW/USDT 각각)" },
  {
    step: 8,
    name: "WITHDRAWAL_APPROVE",
    emoji: "💸",
    desc: "출금승인 + USDT 환산. 종료 Step이 8이면 직후 총판 정산(요율 적립)까지 자동 실행",
  },
  {
    step: 9,
    name: "AGENT_SETTLEMENT",
    emoji: "🏦",
    desc: "총판 정산만 다시 돌릴 때(또는 범위에 9 포함). Step8 직후 자동 실행이면 보통 생략 가능",
  },
];

// ─── 유틸 (API/직렬화 차이·빈 필드 대비 — toLocaleString 수신자가 항상 유효한 값이 되도록)
function toFiniteNumber(n: unknown): number {
  if (n == null) return 0;
  if (typeof n === "number") return Number.isFinite(n) ? n : 0;
  if (typeof n === "bigint") {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
  }
  if (typeof n === "string") {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
  }
  if (typeof n === "object") {
    try {
      const x = Number(String(n));
      return Number.isFinite(x) ? x : 0;
    } catch {
      return 0;
    }
  }
  try {
    const x = Number(n);
    return Number.isFinite(x) ? x : 0;
  } catch {
    return 0;
  }
}

const krw = (n: unknown) => {
  try {
    const v = toFiniteNumber(n);
    return v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  } catch {
    return "0";
  }
};

const dt = (s: unknown) => {
  try {
    if (s == null || s === "") return "—";
    const d =
      typeof s === "number"
        ? new Date(s)
        : typeof s === "string"
          ? new Date(s)
          : s instanceof Date
            ? s
            : new Date(String(s));
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("ko-KR", {
      month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return "—";
  }
};

function pctLabel(n: unknown): string {
  const v = toFiniteNumber(n);
  if (!Number.isFinite(v)) return "0";
  return String(parseFloat(v.toFixed(4)));
}

type LogEntry = { ts: string; level: "info" | "error" | "success"; msg: string };

// ─── 배지 색상 ───────────────────────────────────────────────
function statusColor(s: string | undefined) {
  if (!s) return "text-zinc-400 bg-zinc-400/10";
  if (s === "APPROVED" || s === "CONFIRMED") return "text-green-400 bg-green-400/10";
  if (s === "PENDING") return "text-amber-400 bg-amber-400/10";
  if (s === "REJECTED" || s === "FAILED") return "text-red-400 bg-red-400/10";
  return "text-zinc-400 bg-zinc-400/10";
}
function typeColor(t: string | undefined) {
  if (!t) return "text-zinc-300";
  if (t === "BET") return "text-red-300";
  if (t === "WIN") return "text-green-300";
  if (t === "DEPOSIT" || t === "CREDIT") return "text-blue-300";
  if (t === "WITHDRAWAL" || t === "DEBIT") return "text-amber-300";
  return "text-zinc-300";
}

// ─── 계정 상세 카드 ──────────────────────────────────────────
function UserCard({ u, defaultOpen = false }: { u: UserDetail; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<"ledger" | "requests" | "usdt" | "rolling" | "points">("ledger");

  const isAgent = u.role === "MASTER_AGENT";

  const ledger = u.ledger ?? [];
  const walletRequests = u.walletRequests ?? [];
  const usdtTxs = u.usdtTxs ?? [];
  const rolling = u.rolling ?? [];
  const points = u.points ?? [];
  const summary = u.summary ?? {
    totalBet: 0,
    totalWin: 0,
    netPnl: 0,
    totalRollingAccum: 0,
    totalRollingReq: 0,
    rollingPct: 0,
    totalPoints: 0,
  };
  const commission = u.agentCommission ?? null;

  const toggleOpen = () => setOpen((o) => !o);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* 헤더: <button> 대신 role="button" — 레이아웃/포커스 경계에서 클릭이 먹지 않는 경우 방지 */}
      <div
        role="button"
        tabIndex={0}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none transition hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-amber-600/40"
      >
        <span className="text-lg">{isAgent ? "👤" : u.signupMode === "anonymous" ? "₿" : "🙋"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold text-zinc-100">{u.loginId}</span>
            <span className="text-xs text-zinc-500">/ {u.password}</span>
            {u.parentLoginId && (
              <span className="text-[11px] text-zinc-600">← {u.parentLoginId}</span>
            )}
            {isAgent && (
              <span className="rounded px-1.5 py-0.5 text-[10px] bg-violet-900/40 text-violet-300">총판</span>
            )}
            {u.signupMode === "anonymous" && (
              <span className="rounded px-1.5 py-0.5 text-[10px] bg-amber-900/40 text-amber-300">USDT무기명</span>
            )}
          </div>
          <div className="mt-0.5 flex gap-3 text-[11px] text-zinc-500 flex-wrap">
            {u.wallet && (
              <>
                <span>잔액 <b className="text-zinc-300">{krw(u.wallet.balance)}원</b></span>
                <span>포인트 <b className="text-zinc-300">{krw(u.wallet.pointBalance)}</b></span>
                <span>콤프 <b className="text-zinc-300">{krw(u.wallet.compBalance)}</b></span>
              </>
            )}
            {isAgent && commission && (
              <span className="text-violet-400">
                실효요율 <b>{pctLabel(commission.effectiveSharePct)}%</b>
                {commission.platformSharePct != null && (
                  <> · 플랫폼부여 <b>{pctLabel(commission.platformSharePct)}%</b></>
                )}
                {commission.splitFromParentPct != null && (
                  <> · 상위대비 <b>{pctLabel(commission.splitFromParentPct)}%</b></>
                )}
              </span>
            )}
            {!isAgent && (
              <>
                <span>베팅 <b className="text-red-300">{krw(summary.totalBet)}원</b></span>
                <span>수익 <b className={summary.netPnl >= 0 ? "text-green-300" : "text-red-300"}>{summary.netPnl >= 0 ? "+" : ""}{krw(summary.netPnl)}원</b></span>
                <span>롤링 <b className={summary.rollingPct >= 100 ? "text-green-400" : "text-amber-400"}>{summary.rollingPct}%</b></span>
              </>
            )}
            {u.usdtWallet && (
              <span className="font-mono text-zinc-600 truncate max-w-[160px]">{u.usdtWallet}</span>
            )}
          </div>
        </div>
        <span className="text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="border-t border-zinc-800">
          {/* 요약 그리드 */}
          {!isAgent && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-zinc-800">
              {[
                { label: "총 베팅", val: `${krw(summary.totalBet)}원`, color: "text-red-300" },
                { label: "총 당첨", val: `${krw(summary.totalWin)}원`, color: "text-green-300" },
                { label: "순손익", val: `${summary.netPnl >= 0 ? "+" : ""}${krw(summary.netPnl)}원`, color: summary.netPnl >= 0 ? "text-green-400" : "text-red-400" },
                { label: "롤링", val: `${krw(summary.totalRollingAccum)} / ${krw(summary.totalRollingReq)}`, color: "text-amber-300" },
                { label: "롤링충족", val: `${summary.rollingPct}%`, color: summary.rollingPct >= 100 ? "text-green-400" : "text-amber-400" },
                { label: "포인트 합계", val: `${krw(summary.totalPoints)}P`, color: "text-violet-300" },
              ].map((item) => (
                <div key={item.label} className="bg-zinc-950 px-3 py-2 text-center">
                  <p className="text-[10px] text-zinc-600">{item.label}</p>
                  <p className={`text-xs font-semibold mt-0.5 ${item.color}`}>{item.val}</p>
                </div>
              ))}
            </div>
          )}

          {/* 탭 */}
          <div className="flex gap-1 px-3 py-2 border-b border-zinc-800 overflow-x-auto">
            {(["ledger", "requests", "usdt", "rolling", "points"] as const).map((t) => {
              const labels: Record<string, string> = {
                ledger: `원장(${ledger.length})`,
                requests: `입출금신청(${walletRequests.length})`,
                usdt: `USDT TX(${usdtTxs.length})`,
                rolling: `롤링(${rolling.length})`,
                points: `포인트(${points.length})`,
              };
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTab(t)}
                  className={`shrink-0 rounded px-2.5 py-1 text-[11px] font-medium transition ${
                    tab === t
                      ? "bg-amber-600/20 text-amber-300"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {labels[t]}
                </button>
              );
            })}
          </div>

          {/* 탭 내용 */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            {tab === "ledger" && (
              ledger.length === 0 ? <EmptyMsg /> :
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500">
                    <Th>시각</Th><Th>결과</Th><Th>배팅액</Th><Th>당첨액</Th><Th>손익</Th><Th>잔액</Th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(l.createdAt)}</Td>
                      <Td>
                        {l.result === "당첨" ? (
                          <span className="rounded px-1.5 py-0.5 bg-emerald-900/50 text-emerald-300 font-semibold">🎉 당첨</span>
                        ) : l.result === "낙첨" ? (
                          <span className="rounded px-1.5 py-0.5 bg-red-900/40 text-red-300 font-semibold">💸 낙첨</span>
                        ) : (
                          <span className={`text-[10px] ${typeColor(l.type)}`}>{l.type}</span>
                        )}
                      </Td>
                      <Td className="text-zinc-300">{toFiniteNumber(l.betAmount) > 0 ? `${krw(l.betAmount)}원` : "-"}</Td>
                      <Td className={toFiniteNumber(l.winAmount) > 0 ? "text-emerald-300" : "text-zinc-600"}>{toFiniteNumber(l.winAmount) > 0 ? `+${krw(l.winAmount)}원` : "-"}</Td>
                      <Td className={(l.netResult ?? 0) >= 0 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                        {(l.netResult ?? 0) >= 0 ? "+" : ""}{krw(l.netResult)}원
                      </Td>
                      <Td className="font-mono">{krw(l.balanceAfter)}원</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "requests" && (
              walletRequests.length === 0 ? <EmptyMsg /> :
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500">
                    <Th>시각</Th><Th>타입</Th><Th>상태</Th><Th>금액</Th><Th>통화</Th><Th>예금주</Th><Th>메모</Th>
                  </tr>
                </thead>
                <tbody>
                  {walletRequests.map((r) => (
                    <tr key={r.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(r.createdAt)}</Td>
                      <Td><span className={typeColor(r.type)}>{r.type}</span></Td>
                      <Td>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </Td>
                      <Td>{krw(r.amount)}</Td>
                      <Td>{r.currency}</Td>
                      <Td className="text-zinc-400">{r.depositorName ?? "-"}</Td>
                      <Td className="text-zinc-500">{r.note ?? "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "usdt" && (
              usdtTxs.length === 0 ? <EmptyMsg /> :
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500">
                    <Th>시각</Th><Th>TxHash</Th><Th>USDT</Th><Th>KRW환산</Th><Th>상태</Th><Th>메모</Th>
                  </tr>
                </thead>
                <tbody>
                  {usdtTxs.map((t) => (
                    <tr key={t.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(t.createdAt)}</Td>
                      <Td className="font-mono text-zinc-500 truncate max-w-[120px]">{t.txHash}</Td>
                      <Td>{t.usdtAmount} USDT</Td>
                      <Td>{t.krwAmount !== null ? `${krw(t.krwAmount)}원` : "-"}</Td>
                      <Td>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${statusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </Td>
                      <Td className="text-zinc-500">{t.note ?? "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "rolling" && (
              rolling.length === 0 ? <EmptyMsg /> :
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500">
                    <Th>시각</Th><Th>필요</Th><Th>누적</Th><Th>달성률</Th><Th>충족여부</Th>
                  </tr>
                </thead>
                <tbody>
                  {rolling.map((r) => {
                    const pct = r.required > 0 ? Math.round((r.accumulated / r.required) * 100) : 0;
                    return (
                      <tr key={r.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                        <Td>{dt(r.createdAt)}</Td>
                        <Td>{krw(r.required)}원</Td>
                        <Td>{krw(r.accumulated)}원</Td>
                        <Td>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-20 rounded-full bg-zinc-800">
                              <div
                                className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className={pct >= 100 ? "text-green-400" : "text-amber-400"}>{pct}%</span>
                          </div>
                        </Td>
                        <Td>
                          <span className={r.fulfilled ? "text-green-400" : "text-zinc-500"}>
                            {r.fulfilled ? "✓ 완료" : "미충족"}
                          </span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {tab === "points" && (
              points.length === 0 ? <EmptyMsg /> :
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500">
                    <Th>시각</Th><Th>포인트 변동</Th><Th>사유</Th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.id} className="border-t border-zinc-900 hover:bg-zinc-900/50">
                      <Td>{dt(p.createdAt)}</Td>
                      <Td className={(p.delta ?? 0) >= 0 ? "text-violet-300" : "text-red-300"}>
                        {(p.delta ?? 0) >= 0 ? "+" : ""}{krw(p.delta)}P
                      </Td>
                      <Td className="text-zinc-500">{p.reason ?? "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyMsg() {
  return <p className="py-6 text-center text-xs text-zinc-600">데이터 없음</p>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left text-[11px] font-medium text-zinc-500 whitespace-nowrap">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-1.5 whitespace-nowrap ${className ?? "text-zinc-300"}`}>{children}</td>;
}

// ─── 계정 섹션 ───────────────────────────────────────────────
function AccountSection({ title, users, defaultOpen }: { title: string; users: UserDetail[]; defaultOpen?: boolean }) {
  const clean = users.filter((x): x is UserDetail => x != null && typeof x.id === "string" && x.id.length > 0);
  if (clean.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title} ({clean.length}명)</p>
      <div className="space-y-2">
        {clean.map((u) => (
          <UserCard key={u.id} u={u} defaultOpen={defaultOpen} />
        ))}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function TestScenarioPage() {
  const { selectedPlatformId } = usePlatform();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const userRole = mounted ? getStoredUser()?.role : undefined;
  const [fromStep, setFromStep] = useState(1);
  const [toStep, setToStep] = useState(4);
  const [currencies, setCurrencies] = useState<("KRW" | "USDT")[]>(["KRW", "USDT"]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [detail, setDetail] = useState<DetailedState | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const addLog = useCallback((level: LogEntry["level"], msg: string) => {
    setLogs((prev) => [...prev, { ts: new Date().toLocaleTimeString("ko-KR"), level, msg }]);
  }, []);

  const loadDetail = useCallback(async () => {
    if (!selectedPlatformId) return;
    setDetailLoading(true);
    try {
      const data = await apiFetch<DetailedState>(
        `/test-scenario/state/detail?platformId=${selectedPlatformId}`
      );
      setDetail(data);
    } catch (e) {
      setDetail(null);
      addLog(
        "error",
        `상세 조회 실패: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDetailLoading(false);
    }
  }, [selectedPlatformId, addLog]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const toggleCurrency = (c: "KRW" | "USDT") => {
    setCurrencies((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const runScenario = async () => {
    if (!selectedPlatformId) { addLog("error", "플랫폼을 먼저 선택하세요."); return; }
    if (currencies.length === 0) { addLog("error", "통화를 하나 이상 선택하세요."); return; }
    setLoading(true);
    setResult(null);
    addLog("info", `▶ Step ${fromStep} → ${toStep} 실행 중... (${currencies.join(", ")})`);
    try {
      const data = await apiFetch<Record<string, unknown>>(`/test-scenario/run`, {
        method: "POST",
        body: JSON.stringify({ fromStep, toStep, platformId: selectedPlatformId, currencies }),
      });
      setResult(data);
      addLog("success", `✓ 완료!`);
      await loadDetail();
    } catch (e: unknown) {
      addLog("error", `실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    if (!selectedPlatformId) return;
    if (!confirm("테스트 데이터를 전부 삭제하시겠습니까?")) return;
    setCleanupLoading(true);
    addLog("info", "🗑️ 테스트 데이터 삭제 중...");
    try {
      const data = await apiFetch<{ message: string }>(
        `/test-scenario/cleanup/${selectedPlatformId}`,
        { method: "DELETE" }
      );
      addLog("success", data.message);
      setDetail(null);
      setResult(null);
    } catch (e: unknown) {
      addLog("error", `삭제 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCleanupLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        불러오는 중…
      </div>
    );
  }

  if (userRole !== "SUPER_ADMIN") {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        슈퍼관리자 전용 페이지입니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">🧪 테스트 시나리오</h1>
        <p className="mt-1 text-sm text-zinc-500">
          단계별 전체 플로우를 버튼으로 실행합니다. 생성된 계정·잔액·베팅내역 등 모든 데이터를 아래에서 확인할 수 있습니다.
          <span className="mt-1 block text-amber-200/90">
            출금까지(종료 Step 8) 실행하면 총판 정산(Step 9)이 자동으로 이어집니다. API가 최신인지(배포) 확인하세요.
          </span>
        </p>
      </div>

      {/* 실행 컨트롤 */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">실행 설정</p>
          <button
            type="button"
            onClick={() => setShowSteps((v) => !v)}
            className="text-xs text-zinc-600 hover:text-zinc-400"
          >
            {showSteps ? "스텝 목록 숨기기 ▲" : "스텝 목록 보기 ▼"}
          </button>
        </div>

        {showSteps && (
          <div className="mb-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.step} className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                <span>{s.emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-zinc-300">Step {s.step}: {s.name}</p>
                  <p className="text-[11px] text-zinc-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 빠른 실행 프리셋 */}
        <div className="mb-4 flex flex-wrap gap-2">
          <p className="w-full text-[10px] text-zinc-600 uppercase tracking-wider">빠른 실행</p>
          {[
            { label: "① 초기화+셋업", from: 1, to: 1, color: "border-zinc-600 text-zinc-300 hover:border-zinc-400", hint: "유저 생성/리셋" },
            { label: "② 입금+승인", from: 2, to: 3, color: "border-emerald-700 text-emerald-300 hover:border-emerald-500", hint: "잔액 충전" },
            { label: "③ 카지노 플레이", from: 4, to: 4, color: "border-violet-700 text-violet-300 hover:border-violet-500", hint: "배팅 시뮬" },
            { label: "④ 롤링+콤프", from: 5, to: 6, color: "border-blue-700 text-blue-300 hover:border-blue-500", hint: "보상 지급" },
            { label: "⑤ 출금+총판적립", from: 7, to: 8, color: "border-amber-700 text-amber-300 hover:border-amber-500", hint: "8까지=정산 자동" },
            { label: "⑥ 총판정산만", from: 9, to: 9, color: "border-lime-700 text-lime-300 hover:border-lime-500", hint: "재실행" },
            { label: "전체 (1→9)", from: 1, to: 9, color: "border-red-800 text-red-400 hover:border-red-600", hint: "1~9 명시" },
          ].map((p) => (
            <button
              type="button"
              key={p.label}
              onClick={() => { setFromStep(p.from); setToStep(p.to); }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${fromStep === p.from && toStep === p.to ? p.color.replace("hover:", "").replace("border-", "border-2 border-") : `border-zinc-800 text-zinc-500 hover:${p.color.split(" ")[2]}`}`}
            >
              <span className="font-bold">{p.label}</span>
              <span className="ml-1 text-zinc-600">({p.hint})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">시작 Step</label>
            <select
              value={fromStep}
              onChange={(e) => { const v = Number(e.target.value); setFromStep(v); if (toStep < v) setToStep(v); }}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              {STEPS.map((s) => <option key={s.step} value={s.step}>Step {s.step}: {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">종료 Step</label>
            <select
              value={toStep}
              onChange={(e) => setToStep(Number(e.target.value))}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              {STEPS.filter((s) => s.step >= fromStep).map((s) => <option key={s.step} value={s.step}>Step {s.step}: {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">통화</label>
            <div className="flex gap-2">
              {(["KRW", "USDT"] as const).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => toggleCurrency(c)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${currencies.includes(c) ? "border-amber-600 bg-amber-600/20 text-amber-300" : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-zinc-600"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={runScenario}
            disabled={loading || !selectedPlatformId}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>실행 중...</>
            ) : `▶ 실행 (Step ${fromStep}→${toStep})`}
          </button>
          {!selectedPlatformId && <p className="text-xs text-red-400">⚠ 플랫폼을 먼저 선택하세요.</p>}
        </div>
      </div>

      {/* 로그 */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">실행 로그</p>
            <button type="button" onClick={() => setLogs([])} className="text-xs text-zinc-600 hover:text-zinc-400">지우기</button>
          </div>
          <div className="space-y-0.5 font-mono text-xs">
            {logs.map((l, i) => (
              <div key={i} className={`flex gap-2 ${l.level === "error" ? "text-red-400" : l.level === "success" ? "text-green-400" : "text-zinc-400"}`}>
                <span className="shrink-0 text-zinc-600">[{l.ts}]</span>
                <span>{l.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실행 결과 요약 */}
      {result && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">실행 결과</p>
          <pre className="max-h-56 overflow-auto text-xs text-green-300">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* 계정 상세 목록 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-100">📋 테스트 계정 상세</h2>
            {detail && (
              <p className="mt-0.5 text-xs text-zinc-500">
                공통 비밀번호: <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-amber-300">{detail.password}</code>
                &nbsp;·&nbsp;총판 {detail.totals.agents}명 · 유저 {detail.totals.users}명
                &nbsp;·&nbsp;원장 {detail.totals.ledgerEntries}건 · 입출금신청 {detail.totals.walletRequests}건
                &nbsp;·&nbsp;USDT TX {detail.totals.usdtTxs}건 · 포인트 {detail.totals.pointEntries}건
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={loadDetail}
            disabled={detailLoading}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            {detailLoading ? "로딩중..." : "🔄 새로고침"}
          </button>
        </div>

        {detailLoading && !detail && (
          <div className="py-10 text-center text-sm text-zinc-600">로딩중...</div>
        )}

        {!detailLoading && !detail && (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <p className="text-sm text-zinc-600">테스트 데이터가 없습니다.</p>
            <p className="mt-1 text-xs text-zinc-700">Step 1 부터 실행하여 데이터를 생성하세요.</p>
          </div>
        )}

        {detail && (
          <div className="space-y-6">
            <AccountSection title="🔺 최상위 총판" users={detail.accounts.topAgents} />
            <AccountSection title="🔸 하위 총판" users={detail.accounts.subAgents} />
            <AccountSection title="💴 KRW 유저" users={detail.accounts.krwUsers} defaultOpen={false} />
            <AccountSection title="₿ USDT 무기명 유저" users={detail.accounts.usdtUsers} defaultOpen={false} />
          </div>
        )}
      </div>

      {/* 위험 구역 */}
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-500">위험 구역</p>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            <code className="rounded bg-zinc-800 px-1 text-red-300">test_</code>로 시작하는 모든 테스트 유저 및 관련 데이터(원장, 입출금, 롤링, 포인트 등)를 전부 삭제합니다.
          </p>
          <button
            type="button"
            onClick={runCleanup}
            disabled={cleanupLoading || !selectedPlatformId}
            className="shrink-0 rounded-lg border border-red-700 bg-red-900/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-900/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cleanupLoading ? "삭제 중..." : "🗑️ 테스트 데이터 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

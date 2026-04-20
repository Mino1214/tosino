"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type AgentRow = {
  id: string;
  loginId?: string;
  email?: string | null;
  role: string;
  displayName: string | null;
  parentUserId: string | null;
  referralCode?: string | null;
  agentPlatformSharePct?: number | null;
  agentSplitFromParentPct?: number | null;
  effectiveAgentSharePct?: number | null;
  settlementCycle?: "INSTANT" | "DAILY_MIDNIGHT" | "WEEKLY" | "MONTHLY" | null;
  settlementDayOfWeek?: number | null;
  settlementDayOfMonth?: number | null;
};

type SettlementHistoryItem = {
  id: string;
  agentId: string;
  agentLoginId: string;
  periodFrom: string;
  periodTo: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "PAID";
  paidAt?: string | null;
  note?: string | null;
  createdAt: string;
};

const CYCLE_LABELS: Record<string, string> = {
  INSTANT: "즉시 정산",
  DAILY_MIDNIGHT: "매일 자정",
  WEEKLY: "매주",
  MONTHLY: "매월",
};

function rowLoginLabel(r: Pick<AgentRow, "loginId" | "email">): string {
  const v = r.loginId ?? r.email;
  return v != null && String(v).length > 0 ? String(v) : "—";
}

function krw(v: string | number | null | undefined) {
  const n = Math.round(Number(v ?? 0));
  return Number.isFinite(n) ? n.toLocaleString("ko-KR") : "0";
}

function dt(s: string) {
  return new Date(s).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type InnerTab = "cycles" | "history";

export default function AgentSettlementPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();

  const [tab, setTab] = useState<InnerTab>("cycles");
  const [agents, setAgents] = useState<AgentRow[] | null>(null);
  const [history, setHistory] = useState<SettlementHistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 주기 설정 모달
  const [editTarget, setEditTarget] = useState<AgentRow | null>(null);
  const [editCycle, setEditCycle] = useState<string>("INSTANT");
  const [editDayOfWeek, setEditDayOfWeek] = useState("1");
  const [editDayOfMonth, setEditDayOfMonth] = useState("1");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);

  const loadAgents = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return apiFetch<AgentRow[]>(`/platforms/${selectedPlatformId}/users`)
      .then((all) => setAgents(all.filter((r) => r.role === "MASTER_AGENT")))
      .catch((e) => setErr(e instanceof Error ? e.message : "에이전트 조회 실패"));
  }, [selectedPlatformId]);

  const loadHistory = useCallback(async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setErr(null);
    try {
      const q = `from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
      const data = await apiFetch<SettlementHistoryItem[]>(
        `/platforms/${selectedPlatformId}/agent-settlements?${q}`,
      ).catch(() => [] as SettlementHistoryItem[]);
      setHistory(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "정산 내역 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedPlatformId, from, to]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) return;
    void loadAgents();
  }, [loadAgents, router, selectedPlatformId, platformLoading]);

  useEffect(() => {
    if (tab === "history" && selectedPlatformId) {
      void loadHistory();
    }
  }, [tab, loadHistory, selectedPlatformId]);

  function openEdit(agent: AgentRow) {
    setEditTarget(agent);
    setEditCycle(agent.settlementCycle ?? "INSTANT");
    setEditDayOfWeek(String(agent.settlementDayOfWeek ?? 1));
    setEditDayOfMonth(String(agent.settlementDayOfMonth ?? 1));
    setEditErr(null);
  }

  async function handleSaveCycle() {
    if (!editTarget || !selectedPlatformId) return;
    setEditSaving(true);
    setEditErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/users/${editTarget.id}/settlement-cycle`,
        {
          method: "PATCH",
          body: JSON.stringify({
            settlementCycle: editCycle,
            settlementDayOfWeek:
              editCycle === "WEEKLY" ? Number(editDayOfWeek) : undefined,
            settlementDayOfMonth:
              editCycle === "MONTHLY" ? Number(editDayOfMonth) : undefined,
          }),
        },
      );
      setMsg(`${rowLoginLabel(editTarget)} 정산 주기 설정 완료`);
      setEditTarget(null);
      await loadAgents();
    } catch (e) {
      setEditErr(
        e instanceof Error ? e.message : "저장 실패. 이 기능은 API 구현이 필요합니다.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  const TABS: { key: InnerTab; label: string }[] = [
    { key: "cycles", label: "정산 주기 설정" },
    { key: "history", label: "정산 내역" },
  ];

  return (
    <div className="space-y-5 px-1">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-black">에이전트 정산 관리</h1>
          <p className="mt-1 text-xs text-gray-500">
            정산 주기 설정 · 실적은 실시간 누적, 실제 지급은 설정된 주기에 따름
          </p>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {msg}
        </div>
      )}

      {/* 이너 탭 */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-[#3182f6]/10 text-[#3182f6]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 주기 설정 탭 */}
      {tab === "cycles" && (
        <>
          {agents === null ? (
            <p className="py-6 text-sm text-gray-400">불러오는 중…</p>
          ) : agents.length === 0 ? (
            <p className="py-6 text-sm text-gray-400">등록된 에이전트가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    {["아이디", "표시명", "실효율", "정산 주기", ""].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition"
                    >
                      <td className="px-3 py-2.5 font-mono text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {rowLoginLabel(a)}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {a.displayName || "—"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-violet-700 whitespace-nowrap">
                        {a.effectiveAgentSharePct != null
                          ? `${a.effectiveAgentSharePct}%`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {CYCLE_LABELS[a.settlementCycle ?? "INSTANT"] ??
                            "즉시 정산"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <button
                          onClick={() => openEdit(a)}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                          주기 설정
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 정산 내역 탭 */}
      {tab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700"
            />
            <span className="text-gray-400 text-xs">~</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700"
            />
            <button
              onClick={() => void loadHistory()}
              disabled={loading}
              className="rounded-lg bg-[#3182f6] px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "조회중…" : "조회"}
            </button>
          </div>

          {loading ? (
            <p className="py-6 text-sm text-gray-400">불러오는 중…</p>
          ) : !history || history.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
              <p className="text-sm text-gray-400">해당 기간에 정산 내역이 없습니다.</p>
              <p className="mt-1 text-xs text-gray-400">
                정산 내역 API가 연동되면 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    {[
                      "생성일",
                      "에이전트",
                      "정산 기간",
                      "금액",
                      "상태",
                      "지급일",
                      "메모",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                        {dt(row.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap">
                        {row.agentLoginId}
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {new Date(row.periodFrom).toLocaleDateString("ko-KR")}
                        {" ~ "}
                        {new Date(row.periodTo).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-[#3182f6] whitespace-nowrap">
                        {krw(row.amount)}원
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            row.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.status === "APPROVED"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {row.status === "PAID"
                            ? "지급완료"
                            : row.status === "APPROVED"
                              ? "승인됨"
                              : "대기중"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {row.paidAt ? dt(row.paidAt) : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[160px] truncate text-gray-400">
                        {row.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 주기 설정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-black">
                정산 주기 — {rowLoginLabel(editTarget)}
              </h2>
              <button
                onClick={() => setEditTarget(null)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-black"
              >
                ✕
              </button>
            </div>
            {editErr && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {editErr}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  지급 주기
                </label>
                <select
                  value={editCycle}
                  onChange={(e) => setEditCycle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="INSTANT">즉시 정산</option>
                  <option value="DAILY_MIDNIGHT">매일 자정</option>
                  <option value="WEEKLY">매주</option>
                  <option value="MONTHLY">매월</option>
                </select>
              </div>
              {editCycle === "WEEKLY" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    요일 (1=월, 7=일)
                  </label>
                  <select
                    value={editDayOfWeek}
                    onChange={(e) => setEditDayOfWeek(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    {[
                      [1, "월요일"],
                      [2, "화요일"],
                      [3, "수요일"],
                      [4, "목요일"],
                      [5, "금요일"],
                      [6, "토요일"],
                      [7, "일요일"],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editCycle === "MONTHLY" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    날짜 (1~28일)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={editDayOfMonth}
                    onChange={(e) => setEditDayOfMonth(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}
              <p className="rounded-lg bg-gray-50 px-3 py-2.5 text-[12px] text-gray-500">
                실적은 실시간으로 계속 쌓이며, 설정된 주기에 따라 실제 지급이 이루어집니다.
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => void handleSaveCycle()}
                disabled={editSaving}
                className="flex-1 rounded-lg bg-[#3182f6] py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
              >
                {editSaving ? "저장 중…" : "저장"}
              </button>
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

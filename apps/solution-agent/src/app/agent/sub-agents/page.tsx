"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";
import { MemberDetailModal } from "@/components/MemberDetailModal";

type Sub = {
  id: string;
  loginId: string;
  email?: string | null;
  displayName: string | null;
  createdAt: string;
  uplinePrivateMemo: string | null;
  splitFromParentPct: number;
  effectiveAgentSharePct: number;
};

type SubAgentsRes = {
  parentEffectiveSharePct: number;
  items: Sub[];
};

type SubMember = {
  id: string;
  loginId: string;
  displayName: string | null;
  createdAt: string;
  registrationStatus: string;
  rollingEnabled: boolean;
  uplinePrivateMemo: string | null;
  balance: string;
};

type SubMembersRes = {
  agentId: string;
  agentLoginId: string;
  agentDisplayName: string | null;
  items: SubMember[];
};

type DirectMember = {
  id: string;
  loginId: string;
  displayName: string | null;
  createdAt: string;
  registrationStatus: string;
  rollingEnabled: boolean;
  uplinePrivateMemo: string | null;
  balance: string;
};

function regLabel(s: string) {
  if (s === "PENDING") return "대기";
  if (s === "APPROVED") return "승인";
  if (s === "REJECTED") return "거절";
  return s;
}

function fmtBal(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "₩0";
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function regColor(s: string) {
  if (s === "APPROVED") return "text-[#3182f6] font-semibold";
  if (s === "PENDING") return "text-amber-600 font-semibold";
  if (s === "REJECTED") return "text-red-500 font-semibold";
  return "text-gray-500";
}

function MemberRow({
  m,
  onDetail,
  indent = false,
}: {
  m: DirectMember | SubMember;
  onDetail: (id: string) => void;
  indent?: boolean;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className={`py-2 pr-2 text-[12px] text-gray-400 ${indent ? "pl-8" : "pl-3"}`}>
        {indent ? "└" : ""}
      </td>
      <td className="py-2 pr-3">
        <p className="font-mono text-[13px] font-semibold text-gray-900">{m.loginId}</p>
        {m.displayName && <p className="text-[11px] text-gray-500">{m.displayName}</p>}
        {m.uplinePrivateMemo && (
          <p className="text-[11px] text-[#3182f6] line-clamp-1">{m.uplinePrivateMemo}</p>
        )}
      </td>
      <td className="py-2 pr-3">
        <span className={`text-[12px] ${regColor(m.registrationStatus)}`}>
          {regLabel(m.registrationStatus)}
        </span>
      </td>
      <td className="py-2 pr-3 font-mono text-[13px] font-semibold text-gray-900">{fmtBal(m.balance)}</td>
      <td className="py-2 pr-3">
        {m.rollingEnabled ? (
          <span className="text-[11px] font-semibold text-[#3182f6]">롤링 ON</span>
        ) : (
          <span className="text-[11px] text-gray-400">OFF</span>
        )}
      </td>
      <td className="py-2 pr-3 text-[11px] text-gray-500 whitespace-nowrap">
        {new Date(m.createdAt).toLocaleDateString()}
      </td>
      <td className="py-2 pr-3">
        <button
          type="button"
          onClick={() => onDetail(m.id)}
          className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition"
        >
          상세
        </button>
      </td>
    </tr>
  );
}

export default function AgentSubAgentsPage() {
  const [parentEff, setParentEff] = useState<number | null>(null);
  const [items, setItems] = useState<Sub[]>([]);
  const [directMembers, setDirectMembers] = useState<DirectMember[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [subMembers, setSubMembers] = useState<Record<string, SubMembersRes>>({});
  const [loadingMembers, setLoadingMembers] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [showRegister, setShowRegister] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [splitPct, setSplitPct] = useState("30");
  const [creating, setCreating] = useState(false);
  const [createOk, setCreateOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [agentsRes, membersRes] = await Promise.all([
        apiFetch<SubAgentsRes>("/me/agent/sub-agents"),
        apiFetch<DirectMember[]>("/me/agent/downline"),
      ]);
      setParentEff(agentsRes.parentEffectiveSharePct);
      setItems(agentsRes.items);
      const d: Record<string, string> = {};
      for (const it of agentsRes.items) {
        d[it.id] = String(it.splitFromParentPct);
      }
      setDrafts(d);
      setDirectMembers(membersRes);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleExpand(agentId: string) {
    const next = new Set(expandedAgents);
    if (next.has(agentId)) {
      next.delete(agentId);
      setExpandedAgents(next);
      return;
    }
    next.add(agentId);
    setExpandedAgents(next);
    if (subMembers[agentId]) return;
    setLoadingMembers((prev) => new Set(prev).add(agentId));
    try {
      const res = await apiFetch<SubMembersRes>(`/me/agent/downline-agent/${agentId}/members`);
      setSubMembers((prev) => ({ ...prev, [agentId]: res }));
    } catch {
      // silent fail
    } finally {
      setLoadingMembers((prev) => { const s = new Set(prev); s.delete(agentId); return s; });
    }
  }

  async function saveSplit(agentId: string) {
    const n = Number(drafts[agentId]);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      setErr("분배율은 0~100 사이여야 합니다.");
      return;
    }
    setSavingId(agentId);
    setErr(null);
    try {
      await apiFetch(`/me/agent/downline-agent/${agentId}/split`, {
        method: "PATCH",
        body: JSON.stringify({ splitFromParentPct: n }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingId(null);
    }
  }

  async function createSubAgent(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreateOk(null);
    const n = Number(splitPct);
    if (Number.isNaN(n) || n < 0 || n > 100) { setErr("분배율은 0~100 사이여야 합니다."); return; }
    if (password.length < 6) { setErr("비밀번호는 6자 이상이어야 합니다."); return; }
    if (referralCode.trim() && !/^[A-Za-z0-9]{4,16}$/.test(referralCode.trim())) {
      setErr("추천코드는 영숫자 4~16자이거나 비워 자동 발급입니다."); return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        loginId: loginId.trim().toLowerCase(),
        password,
        splitFromParentPct: n,
      };
      const dn = displayName.trim();
      if (dn) body.displayName = dn;
      const rc = referralCode.trim().toUpperCase();
      if (rc) body.referralCode = rc;
      await apiFetch("/me/agent/sub-agents", { method: "POST", body: JSON.stringify(body) });
      setCreateOk("등록되었습니다.");
      setLoginId(""); setPassword(""); setDisplayName(""); setReferralCode(""); setSplitPct("30");
      setShowRegister(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setCreating(false);
    }
  }

  if (!getAccessToken()) return null;

  const totalMembers = directMembers.length + Object.values(subMembers).reduce((s, r) => s + r.items.length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-black">총판 / 유저</h1>
        </div>
        <button
          type="button"
          onClick={() => { setShowRegister(!showRegister); setCreateOk(null); }}
          className="rounded-lg bg-[#3182f6] px-4 py-2 text-[14px] font-semibold text-white hover:bg-blue-600 transition"
        >
          {showRegister ? "취소" : "+ 하위 총판 등록"}
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">하위 총판</p>
          <p className="mt-1 text-[22px] font-bold text-black">{items.length}<span className="ml-1 text-[14px] font-normal text-gray-500">명</span></p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">직속 유저</p>
          <p className="mt-1 text-[22px] font-bold text-black">{directMembers.length}<span className="ml-1 text-[14px] font-normal text-gray-500">명</span></p>
        </div>
        {Object.keys(subMembers).length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">조회된 전체</p>
            <p className="mt-1 text-[22px] font-bold text-black">{totalMembers}<span className="ml-1 text-[14px] font-normal text-gray-500">명</span></p>
          </div>
        )}
      </div>

      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>
      )}
      {createOk && (
        <p className="rounded-xl border border-[#3182f6]/30 bg-[#3182f6]/5 px-4 py-3 text-[14px] text-[#3182f6] font-semibold">{createOk}</p>
      )}

      {/* Register form */}
      {showRegister && (
        <form
          onSubmit={createSubAgent}
          className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4"
        >
          <h2 className="text-[15px] font-bold text-black">하위 총판 신규 등록</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[13px] text-gray-700">
              아이디 (로그인)
              <input required type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-[14px] text-gray-900" />
            </label>
            <label className="block text-[13px] text-gray-700">
              초기 비밀번호 (6자 이상)
              <input required type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[14px] text-gray-900" />
            </label>
            <label className="block text-[13px] text-gray-700">
              표시명 (선택)
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-[14px] text-gray-900" />
            </label>
            <label className="block text-[13px] text-gray-700">
              추천 코드 (선택)
              <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-[14px] text-gray-900" />
            </label>
            <label className="block text-[13px] text-gray-700 sm:col-span-2">
              분배율 설정 (0 ~ 100)
              <input required type="number" min={0} max={100} step={0.01} value={splitPct} onChange={(e) => setSplitPct(e.target.value)}
                className="mt-1 w-full max-w-[200px] rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-[14px] text-gray-900" />
            </label>
          </div>
          <button type="submit" disabled={creating}
            className="rounded-lg bg-[#3182f6] px-4 py-2 text-[14px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition">
            {creating ? "등록 중…" : "하위 총판 등록"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">불러오는 중…</p>
      ) : (
        <div className="space-y-3">
          {/* Sub-agents tree */}
          {items.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-[14px] text-gray-500">등록된 하위 총판이 없습니다.</p>
            </div>
          ) : (
            items.map((agent) => {
              const expanded = expandedAgents.has(agent.id);
              const members = subMembers[agent.id];
              const isLoadingMembers = loadingMembers.has(agent.id);

              return (
                <div key={agent.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  {/* Agent row */}
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(agent.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-[13px] text-gray-700 hover:border-[#3182f6] hover:text-[#3182f6] transition"
                      title={expanded ? "접기" : "유저 펼치기"}
                    >
                      {isLoadingMembers ? "…" : expanded ? "▲" : "▼"}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">총판</span>
                        <span className="font-mono text-[14px] font-bold text-black">{agent.loginId}</span>
                        {agent.displayName && (
                          <span className="text-[12px] text-gray-500">{agent.displayName}</span>
                        )}
                        {agent.uplinePrivateMemo && (
                          <span className="max-w-[160px] truncate text-[11px] text-[#3182f6]">
                            {agent.uplinePrivateMemo}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-[12px] text-gray-500">
                        <span>{new Date(agent.createdAt).toLocaleDateString()} 등록</span>
                        {members && (
                          <span>유저 <span className="font-mono font-bold text-[#3182f6]">{members.items.length}</span>명</span>
                        )}
                      </div>
                    </div>

                    {/* 분배율 입력 */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[12px] text-gray-500">분배율</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={drafts[agent.id] ?? ""}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [agent.id]: e.target.value }))}
                        className="w-20 rounded border border-gray-300 bg-gray-50 px-2 py-1 font-mono text-[13px] text-gray-900 text-right"
                      />
                      <button
                        type="button"
                        disabled={savingId === agent.id}
                        onClick={() => saveSplit(agent.id)}
                        className="rounded border border-gray-300 px-2 py-1 text-[12px] font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition"
                      >
                        {savingId === agent.id ? "…" : "적용"}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: sub-agent's users */}
                  {expanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      {isLoadingMembers ? (
                        <p className="px-6 py-3 text-[12px] text-gray-500">유저 불러오는 중…</p>
                      ) : !members || members.items.length === 0 ? (
                        <p className="px-6 py-3 text-[12px] text-gray-400">
                          {agent.loginId}의 직속 유저가 없습니다.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-[13px]">
                            <thead className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-200">
                              <tr>
                                <th className="w-8 px-3 py-2" />
                                <th className="px-3 py-2">아이디</th>
                                <th className="px-3 py-2">상태</th>
                                <th className="px-3 py-2">보유머니</th>
                                <th className="px-3 py-2">롤링</th>
                                <th className="px-3 py-2">가입일</th>
                                <th className="px-3 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {members.items.map((m) => (
                                <MemberRow key={m.id} m={m} onDetail={setDetailId} indent />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* My direct members */}
          {directMembers.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center gap-3 border-b border-gray-100 bg-[#3182f6]/5 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3182f6] text-[11px] font-bold text-white">나</span>
                <div>
                  <p className="text-[14px] font-bold text-black">직속 유저</p>
                  <p className="text-[12px] text-gray-600">
                    직접 연결된 유저{" "}
                    <span className="font-mono font-bold text-[#3182f6]">{directMembers.length}</span>명
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2">아이디</th>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">보유머니</th>
                      <th className="px-3 py-2">롤링</th>
                      <th className="px-3 py-2">가입일</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {directMembers.map((m) => (
                      <MemberRow key={m.id} m={m} onDetail={setDetailId} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <MemberDetailModal
        userId={detailId}
        onClose={() => setDetailId(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}

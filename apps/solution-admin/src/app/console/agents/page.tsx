"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type AgentRow = {
  id: string;
  loginId?: string;
  email?: string | null;
  role: string;
  displayName: string | null;
  parentUserId: string | null;
  referralCode?: string | null;
  agentMemo?: string | null;
  agentPlatformSharePct?: number | null;
  agentSplitFromParentPct?: number | null;
  effectiveAgentSharePct?: number | null;
  createdAt: string;
};

function rowLoginLabel(r: Pick<AgentRow, "loginId" | "email">): string {
  const v = r.loginId ?? r.email;
  return v != null && String(v).length > 0 ? String(v) : "—";
}

function pct(v: number | null | undefined): string {
  return v != null ? `${v}%` : "—";
}

export default function AgentsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const canCreate =
    getStoredUser()?.role === "SUPER_ADMIN" ||
    getStoredUser()?.role === "PLATFORM_ADMIN";

  const [rows, setRows] = useState<AgentRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 생성 폼
  const [showCreate, setShowCreate] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("Temp123456!");
  const [displayName, setDisplayName] = useState("");
  const [parentId, setParentId] = useState("");
  const [platformPct, setPlatformPct] = useState("");
  const [splitPct, setSplitPct] = useState("30");
  const [creating, setCreating] = useState(false);

  // 수정 모달
  const [editTarget, setEditTarget] = useState<AgentRow | null>(null);
  const [editPlatformPct, setEditPlatformPct] = useState("");
  const [editSplitPct, setEditSplitPct] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return apiFetch<AgentRow[]>(`/platforms/${selectedPlatformId}/users`)
      .then((all) => setRows(all.filter((r) => r.role === "MASTER_AGENT")))
      .catch((e) => setErr(e instanceof Error ? e.message : "오류"));
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) {
      setRows(null);
      return;
    }
    setErr(null);
    void load();
  }, [load, router, selectedPlatformId, platformLoading]);

  const agents = rows ?? [];
  const filtered = search.trim()
    ? agents.filter(
        (r) =>
          rowLoginLabel(r).toLowerCase().includes(search.toLowerCase()) ||
          (r.displayName ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (r.referralCode ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : agents;

  // 트리 구조를 위한 부모 매핑
  const agentById = new Map(agents.map((a) => [a.id, a]));
  function parentLabel(r: AgentRow): string {
    if (!r.parentUserId) return "최상위";
    const p = agentById.get(r.parentUserId);
    return p ? rowLoginLabel(p) : r.parentUserId.slice(0, 8) + "…";
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatformId || !canCreate) return;
    setCreating(true);
    setErr(null);
    setMsg(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/users`, {
        method: "POST",
        body: JSON.stringify({
          loginId: loginId.trim(),
          password,
          displayName: displayName.trim() || undefined,
          role: "MASTER_AGENT",
          parentUserId: parentId.trim() || undefined,
          agentPlatformSharePct: platformPct ? Number(platformPct) : undefined,
          agentSplitFromParentPct: splitPct ? Number(splitPct) : undefined,
        }),
      });
      setMsg(`에이전트 ${loginId} 생성 완료`);
      setLoginId("");
      setPassword("Temp123456!");
      setDisplayName("");
      setParentId("");
      setPlatformPct("");
      setSplitPct("30");
      setShowCreate(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(agent: AgentRow) {
    setEditTarget(agent);
    setEditPlatformPct(String(agent.agentPlatformSharePct ?? ""));
    setEditSplitPct(String(agent.agentSplitFromParentPct ?? ""));
    setEditMemo(agent.agentMemo ?? "");
    setEditErr(null);
  }

  async function handleEditSave() {
    if (!editTarget || !selectedPlatformId) return;
    setEditSaving(true);
    setEditErr(null);
    try {
      if (
        editPlatformPct !== String(editTarget.agentPlatformSharePct ?? "") ||
        editSplitPct !== String(editTarget.agentSplitFromParentPct ?? "")
      ) {
        await apiFetch(
          `/platforms/${selectedPlatformId}/users/${editTarget.id}/agent-commission`,
          {
            method: "PATCH",
            body: JSON.stringify({
              agentPlatformSharePct: editPlatformPct
                ? Number(editPlatformPct)
                : undefined,
              agentSplitFromParentPct: editSplitPct
                ? Number(editSplitPct)
                : undefined,
            }),
          },
        );
      }
      if (editMemo !== (editTarget.agentMemo ?? "")) {
        await apiFetch(
          `/platforms/${selectedPlatformId}/users/${editTarget.id}/memo`,
          {
            method: "PATCH",
            body: JSON.stringify({ agentMemo: editMemo }),
          },
        );
      }
      setMsg(`${rowLoginLabel(editTarget)} 수정 완료`);
      setEditTarget(null);
      await load();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="space-y-5 px-1">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-black">에이전트 관리</h1>
          <p className="mt-1 text-xs text-gray-500">
            하위 에이전트(총판) 조회·등록·요율 수정
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아이디·표시명·추천코드 검색"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 w-52"
          />
          {canCreate && (
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="rounded-lg bg-[#3182f6] px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 transition"
            >
              {showCreate ? "취소" : "+ 에이전트 등록"}
            </button>
          )}
          <button
            onClick={() => void load()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            새로고침
          </button>
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

      {/* 에이전트 등록 폼 */}
      {showCreate && canCreate && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-2xl border border-[#3182f6]/20 bg-[#3182f6]/5 p-5 space-y-4"
        >
          <p className="text-sm font-semibold text-[#3182f6]">신규 에이전트 등록</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                아이디 <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="로그인 아이디"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="초기 비밀번호"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                표시명
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="닉네임 (선택)"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                상위 에이전트 ID
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">최상위 (없음)</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {rowLoginLabel(a)}
                    {a.displayName ? ` (${a.displayName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                플랫폼 요율 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={platformPct}
                onChange={(e) => setPlatformPct(e.target.value)}
                placeholder="예: 35"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                상위 분배율 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={splitPct}
                onChange={(e) => setSplitPct(e.target.value)}
                placeholder="예: 30"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-[#3182f6] px-6 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition"
            >
              {creating ? "등록 중…" : "등록"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* 에이전트 목록 */}
      {rows === null && !err ? (
        <p className="py-6 text-sm text-gray-400">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-sm text-gray-400">
          {search ? "검색 결과가 없습니다." : "등록된 에이전트가 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                {[
                  "아이디",
                  "표시명",
                  "추천코드",
                  "상위 에이전트",
                  "플랫폼 요율",
                  "분배율",
                  "실효율",
                  "메모",
                  "가입일",
                  "",
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
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-3 py-2.5 font-mono text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {rowLoginLabel(r)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap max-w-[120px] truncate">
                    {r.displayName || "—"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-500 whitespace-nowrap">
                    {r.referralCode || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {parentLabel(r)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">
                    {pct(r.agentPlatformSharePct)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">
                    {pct(r.agentSplitFromParentPct)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-violet-700 whitespace-nowrap">
                    {pct(r.effectiveAgentSharePct)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[120px] truncate">
                    {r.agentMemo || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(r)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-black">
                에이전트 수정 — {rowLoginLabel(editTarget)}
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
                  플랫폼 요율 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editPlatformPct}
                  onChange={(e) => setEditPlatformPct(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  상위 분배율 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editSplitPct}
                  onChange={(e) => setEditSplitPct(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  메모
                </label>
                <textarea
                  rows={2}
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => void handleEditSave()}
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

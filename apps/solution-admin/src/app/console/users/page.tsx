"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import {
  registrationStatusLabelKo,
  userRoleLabelKo,
} from "@/lib/labels";
import UserDetailModal from "@/components/UserDetailModal";

type Row = {
  id: string;
  loginId?: string;
  email?: string | null;
  role: string;
  displayName: string | null;
  parentUserId: string | null;
  referredByUserId?: string | null;
  referredBy?: {
    id: string;
    loginId?: string | null;
    displayName?: string | null;
    email?: string | null;
  } | null;
  signupMode?: string | null;
  signupReferralInput?: string | null;
  usdtWalletAddress?: string | null;
  createdAt: string;
  registrationStatus?: string;
  referralCode?: string | null;
  agentMemo?: string | null;
  userMemo?: string | null;
  agentPlatformSharePct?: number | null;
  agentSplitFromParentPct?: number | null;
  effectiveAgentSharePct?: number | null;
};


type Tab = "masters" | "users";

function rowLoginLabel(r: Pick<Row, "loginId" | "email">): string {
  const v = r.loginId ?? r.email;
  return v != null && String(v).length > 0 ? String(v) : "—";
}

function signupModeLabel(mode: string | null | undefined): string {
  return mode === "anonymous" ? "무기명" : "일반";
}


function canEditAgentMemo(
  viewer: { id: string; role: string } | null,
  target: Row,
): boolean {
  if (!viewer) return false;
  if (viewer.role === "SUPER_ADMIN" || viewer.role === "PLATFORM_ADMIN")
    return true;
  if (viewer.role === "MASTER_AGENT") {
    return (
      target.role === "USER" && target.parentUserId === viewer.id
    );
  }
  return false;
}

function canEditUserMemoAdmin(viewer: { role: string } | null): boolean {
  return (
    viewer?.role === "SUPER_ADMIN" || viewer?.role === "PLATFORM_ADMIN"
  );
}

function canEditOwnUserMemo(
  viewer: { id: string } | null,
  target: Row,
): boolean {
  return !!viewer && viewer.id === target.id;
}

function isNestedMaster(r: Row, byId: Map<string, Row>): boolean {
  if (!r.parentUserId) return false;
  return byId.get(r.parentUserId)?.role === "MASTER_AGENT";
}

export default function ConsoleUsersPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loginId, setLoginId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("Temp123456!");
  const [role, setRole] = useState("MASTER_AGENT");
  const [referralCode, setReferralCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<Tab>("masters");
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [memoUser, setMemoUser] = useState<Row | null>(null);
  const [agentDraft, setAgentDraft] = useState("");
  const [userDraft, setUserDraft] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoErr, setMemoErr] = useState<string | null>(null);
  const [parentMasterForCreate, setParentMasterForCreate] = useState("");
  const [agentPlatformPctDraft, setAgentPlatformPctDraft] = useState("");
  const [agentSplitPctDraft, setAgentSplitPctDraft] = useState("30");
  const [commissionUser, setCommissionUser] = useState<Row | null>(null);
  const [commissionPlatformDraft, setCommissionPlatformDraft] = useState("");
  const [commissionSplitDraft, setCommissionSplitDraft] = useState("");
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionErr, setCommissionErr] = useState<string | null>(null);
  const [overviewUser, setOverviewUser] = useState<Row | null>(null);
  const [referralCodeUser, setReferralCodeUser] = useState<Row | null>(null);
  const [referralCodeDraft, setReferralCodeDraft] = useState("");
  const [referralCodeSaving, setReferralCodeSaving] = useState(false);
  const [referralCodeErr, setReferralCodeErr] = useState<string | null>(null);
  const [rateHist, setRateHist] = useState<{
    kind: "commission" | "rolling";
    row: Row;
  } | null>(null);
  const [rateHistLoading, setRateHistLoading] = useState(false);
  const [rateHistHint, setRateHistHint] = useState<string | null>(null);
  const [rateHistComm, setRateHistComm] = useState<
    {
      id: string;
      effectiveFrom: string;
      agentPlatformSharePct: number | null;
      agentSplitFromParentPct: number | null;
    }[]
  >([]);
  const [rateHistRoll, setRateHistRoll] = useState<
    {
      id: string;
      effectiveFrom: string;
      rollingEnabled: boolean;
      rollingSportsDomesticPct: number | null;
      rollingSportsOverseasPct: number | null;
      rollingCasinoPct: number | null;
      rollingSlotPct: number | null;
      rollingMinigamePct: number | null;
    }[]
  >([]);

  const canCreate =
    getStoredUser()?.role === "SUPER_ADMIN" ||
    getStoredUser()?.role === "PLATFORM_ADMIN";

  const load = useCallback(() => {
    if (!selectedPlatformId) return Promise.resolve();
    return apiFetch<Row[]>(`/platforms/${selectedPlatformId}/users`)
      .then(setRows)
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
    load();
  }, [load, router, selectedPlatformId, platformLoading]);

  useEffect(() => {
    if (!rateHist || !selectedPlatformId) {
      setRateHistComm([]);
      setRateHistRoll([]);
      setRateHistHint(null);
      return;
    }
    const kind = rateHist.kind;
    const userId = rateHist.row.id;
    setRateHistLoading(true);
    const base = `/platforms/${selectedPlatformId}/users/${userId}`;
    const url =
      kind === "commission"
        ? `${base}/agent-commission-revisions`
        : `${base}/rolling-revisions`;
    apiFetch<{ hint?: string; items: unknown[] }>(url)
      .then((d) => {
        setRateHistHint(d.hint ?? null);
        if (kind === "commission") {
          setRateHistComm(
            d.items as {
              id: string;
              effectiveFrom: string;
              agentPlatformSharePct: number | null;
              agentSplitFromParentPct: number | null;
            }[],
          );
          setRateHistRoll([]);
        } else {
          setRateHistRoll(
            d.items as {
              id: string;
              effectiveFrom: string;
              rollingEnabled: boolean;
              rollingSportsDomesticPct: number | null;
              rollingSportsOverseasPct: number | null;
              rollingCasinoPct: number | null;
              rollingSlotPct: number | null;
              rollingMinigamePct: number | null;
            }[],
          );
          setRateHistComm([]);
        }
      })
      .catch(() => {
        setRateHistHint(null);
        setRateHistComm([]);
        setRateHistRoll([]);
      })
      .finally(() => setRateHistLoading(false));
  }, [rateHist, selectedPlatformId]);


  const byId = useMemo(() => {
    const m = new Map<string, Row>();
    if (!rows) return m;
    for (const r of rows) m.set(r.id, r);
    return m;
  }, [rows]);

  const masters = useMemo(
    () => (rows ?? []).filter((r) => r.role === "MASTER_AGENT"),
    [rows],
  );
  const endUsers = useMemo(
    () => (rows ?? []).filter((r) => r.role === "USER"),
    [rows],
  );
  const otherRoles = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => r.role !== "MASTER_AGENT" && r.role !== "USER",
      ),
    [rows],
  );

  const childCount = useCallback(
    (masterId: string) =>
      endUsers.filter((u) => u.parentUserId === masterId).length,
    [endUsers],
  );

  const subMasterCount = useCallback(
    (masterId: string) =>
      masters.filter((m) => m.parentUserId === masterId).length,
    [masters],
  );

  const childrenOfSelected = useMemo(() => {
    if (!selectedMasterId) return [];
    return endUsers.filter((u) => u.parentUserId === selectedMasterId);
  }, [endUsers, selectedMasterId]);

  const totalSplit = masters.length + endUsers.length;
  const masterPct =
    totalSplit > 0 ? Math.round((masters.length / totalSplit) * 1000) / 10 : 0;
  const userPct =
    totalSplit > 0 ? Math.round((endUsers.length / totalSplit) * 1000) / 10 : 0;

  function openMemo(u: Row) {
    setMemoUser(u);
    setAgentDraft(u.agentMemo ?? "");
    setUserDraft(u.userMemo ?? "");
    setMemoErr(null);
  }

  function openOverview(u: Row) {
    setOverviewUser(u);
  }

  function openReferralCodeEditor(u: Row) {
    setReferralCodeUser(u);
    setReferralCodeDraft(u.referralCode ?? "");
    setReferralCodeErr(null);
  }

  async function saveMemos() {
    if (!memoUser || !selectedPlatformId) return;
    const viewer = getStoredUser();
    setMemoSaving(true);
    setMemoErr(null);
    try {
      const origAgent = memoUser.agentMemo ?? "";
      const origUser = memoUser.userMemo ?? "";
      if (agentDraft !== origAgent && canEditAgentMemo(viewer, memoUser)) {
        await apiFetch(
          `/platforms/${selectedPlatformId}/users/${memoUser.id}/agent-memo`,
          {
            method: "PATCH",
            body: JSON.stringify({ agentMemo: agentDraft }),
          },
        );
      }
      if (userDraft !== origUser) {
        if (canEditUserMemoAdmin(viewer)) {
          await apiFetch(
            `/platforms/${selectedPlatformId}/users/${memoUser.id}/user-memo`,
            {
              method: "PATCH",
              body: JSON.stringify({ userMemo: userDraft }),
            },
          );
        } else if (canEditOwnUserMemo(viewer, memoUser)) {
          await apiFetch("/me/user-memo", {
            method: "PATCH",
            body: JSON.stringify({ userMemo: userDraft }),
          });
        }
      }
      setMemoUser(null);
      await load();
    } catch (e) {
      setMemoErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setMemoSaving(false);
    }
  }

  async function saveReferralCode() {
    if (!referralCodeUser || !selectedPlatformId) return;
    setReferralCodeSaving(true);
    setReferralCodeErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/users/${referralCodeUser.id}/referral-code`,
        {
          method: "PATCH",
          body: JSON.stringify({
            referralCode: referralCodeDraft,
          }),
        },
      );
      setReferralCodeUser(null);
      await load();
    } catch (e) {
      setReferralCodeErr(
        e instanceof Error ? e.message : "마스터 코드 저장에 실패했습니다.",
      );
    } finally {
      setReferralCodeSaving(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate || !selectedPlatformId) return;
    setCreating(true);
    setErr(null);
    try {
      if (role === "MASTER_AGENT" && parentMasterForCreate) {
        const s = Number(agentSplitPctDraft);
        if (Number.isNaN(s) || s < 0 || s > 100) {
          setErr("하위 총판은 상위 대비 분배%(0~100)가 필요합니다.");
          setCreating(false);
          return;
        }
      }
      const body: Record<string, string | number> = {
        loginId: loginId.trim().toLowerCase(),
        password,
        role,
      };
      if (contactEmail.trim()) {
        body.contactEmail = contactEmail.trim().toLowerCase();
      }
      if (role === "MASTER_AGENT" && referralCode.trim()) {
        body.referralCode = referralCode.trim().toUpperCase();
      }
      if (role === "MASTER_AGENT") {
        if (parentMasterForCreate) {
          body.parentUserId = parentMasterForCreate;
          body.agentSplitFromParentPct = Number(agentSplitPctDraft);
        } else if (agentPlatformPctDraft.trim()) {
          const p = Number(agentPlatformPctDraft);
          if (Number.isNaN(p) || p < 0 || p > 100) {
            setErr("플랫폼 요율%는 0~100 숫자여야 합니다.");
            setCreating(false);
            return;
          }
          body.agentPlatformSharePct = p;
        }
      }
      await apiFetch(`/platforms/${selectedPlatformId}/users`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setLoginId("");
      setContactEmail("");
      setParentMasterForCreate("");
      setAgentPlatformPctDraft("");
      setAgentSplitPctDraft("30");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setCreating(false);
    }
  }

  function openCommission(u: Row) {
    setCommissionUser(u);
    setCommissionErr(null);
    setCommissionPlatformDraft(
      u.agentPlatformSharePct != null ? String(u.agentPlatformSharePct) : "",
    );
    setCommissionSplitDraft(
      u.agentSplitFromParentPct != null
        ? String(u.agentSplitFromParentPct)
        : "",
    );
  }

  async function saveCommission() {
    if (!commissionUser || !selectedPlatformId) return;
    setCommissionSaving(true);
    setCommissionErr(null);
    try {
      const nested = isNestedMaster(commissionUser, byId);
      const body: Record<string, number> = {};
      if (nested) {
        const v = Number(commissionSplitDraft);
        if (Number.isNaN(v) || v < 0 || v > 100) {
          setCommissionErr("분배%는 0~100 숫자여야 합니다.");
          setCommissionSaving(false);
          return;
        }
        body.agentSplitFromParentPct = v;
      } else {
        const v = Number(commissionPlatformDraft);
        if (Number.isNaN(v) || v < 0 || v > 100) {
          setCommissionErr("플랫폼 요율%는 0~100 숫자여야 합니다.");
          setCommissionSaving(false);
          return;
        }
        body.agentPlatformSharePct = v;
      }
      await apiFetch(
        `/platforms/${selectedPlatformId}/users/${commissionUser.id}/agent-commission`,
        {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
      setCommissionUser(null);
      await load();
    } catch (e) {
      setCommissionErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setCommissionSaving(false);
    }
  }

  if (platformLoading) {
    return <p className="text-zinc-500">불러오는 중…</p>;
  }
  if (!selectedPlatformId) {
    return null;
  }
  if (err && !rows) {
    return <p className="text-red-400">{err}</p>;
  }
  if (!rows) {
    return <p className="text-zinc-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-100">유저</h1>

      {/* 비율 막대 (총판 vs 일반 유저) */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          계정 구성
        </p>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          {masters.length > 0 && (
            <button
              type="button"
              title="총판 탭으로"
              onClick={() => setTab("masters")}
              className="bg-violet-500 transition hover:bg-violet-400"
              style={{
                width: `${totalSplit ? (masters.length / totalSplit) * 100 : 50}%`,
              }}
            />
          )}
          {endUsers.length > 0 && (
            <button
              type="button"
              title="일반 유저 탭으로"
              onClick={() => setTab("users")}
              className="bg-teal-600 transition hover:bg-teal-500"
              style={{
                width: `${totalSplit ? (endUsers.length / totalSplit) * 100 : 50}%`,
              }}
            />
          )}
          {totalSplit === 0 && (
            <div className="w-full bg-zinc-700" title="데이터 없음" />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <button
            type="button"
            onClick={() => setTab("masters")}
            className="flex items-center gap-2 text-zinc-300 hover:text-violet-300"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
            총판 <span className="font-mono text-zinc-100">{masters.length}</span>
            {totalSplit > 0 && (
              <span className="text-zinc-500">({masterPct}%)</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("users")}
            className="flex items-center gap-2 text-zinc-300 hover:text-teal-300"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-teal-600" />
            일반 유저{" "}
            <span className="font-mono text-zinc-100">{endUsers.length}</span>
            {totalSplit > 0 && (
              <span className="text-zinc-500">({userPct}%)</span>
            )}
          </button>
          {otherRoles.length > 0 && (
            <span className="text-zinc-500">
              기타 역할 {otherRoles.length}명 (플랫폼 관리자 등)
            </span>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setTab("masters");
            setSelectedMasterId(null);
          }}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            tab === "masters"
              ? "bg-zinc-800 text-violet-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          총판 ({masters.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("users");
            setSelectedMasterId(null);
          }}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            tab === "users"
              ? "bg-zinc-800 text-teal-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          일반 유저 ({endUsers.length})
        </button>
      </div>

      {canCreate && (
        <form
          onSubmit={createUser}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
        >
          {err && <p className="w-full text-sm text-red-400">{err}</p>}
          <label className="text-xs text-zinc-400">
            아이디
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="mt-1 block w-48 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-100"
              required
              minLength={3}
              autoComplete="off"
            />
          </label>
          <label className="text-xs text-zinc-400">
            연락 이메일 (선택)
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 block w-48 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
            />
          </label>
          <label className="text-xs text-zinc-400">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-36 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
              required
            />
          </label>
          <label className="text-xs text-zinc-400">
            역할
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (e.target.value !== "MASTER_AGENT") {
                  setReferralCode("");
                  setParentMasterForCreate("");
                  setAgentPlatformPctDraft("");
                  setAgentSplitPctDraft("30");
                }
              }}
              className="mt-1 block rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
            >
              {getStoredUser()?.role === "SUPER_ADMIN" && (
                <option value="PLATFORM_ADMIN">플랫폼 관리자</option>
              )}
              <option value="MASTER_AGENT">총판</option>
              <option value="USER">일반 유저</option>
            </select>
          </label>
          {role === "MASTER_AGENT" && (
            <>
              <label className="text-xs text-zinc-400">
                마스터 코드(선택)
                <input
                  value={referralCode}
                  onChange={(e) =>
                    setReferralCode(e.target.value.toUpperCase())
                  }
                  placeholder="비우면 자동"
                  className="mt-1 block w-28 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-100"
                />
              </label>
              <label className="text-xs text-zinc-400">
                상위 총판(선택)
                <select
                  value={parentMasterForCreate}
                  onChange={(e) => setParentMasterForCreate(e.target.value)}
                  className="mt-1 block max-w-[200px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                >
                  <option value="">없음 · 플랫폼 직속(최상위)</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {rowLoginLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              {parentMasterForCreate ? (
                <label className="text-xs text-zinc-400">
                  상위 대비 분배 % (0~100)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={agentSplitPctDraft}
                    onChange={(e) => setAgentSplitPctDraft(e.target.value)}
                    className="mt-1 block w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-100"
                  />
                </label>
              ) : (
                <label className="text-xs text-zinc-400">
                  플랫폼 부여 요율 % (선택)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={agentPlatformPctDraft}
                    onChange={(e) => setAgentPlatformPctDraft(e.target.value)}
                    placeholder="예: 40"
                    className="mt-1 block w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-sm text-zinc-100"
                  />
                </label>
              )}
            </>
          )}
          <button
            type="submit"
            disabled={creating}
            className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            추가
          </button>
          <p className="w-full text-xs text-zinc-500">
            공통 가입코드는 운영설정에서, 마스터 코드는 여기서, 추천인 아이디는
            해당 회원의 로그인 아이디 그대로 회원가입 화면에서 사용됩니다.
          </p>
        </form>
      )}

      {tab === "masters" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">아이디</th>
                  <th className="px-4 py-2">표시명</th>
                  <th className="px-4 py-2">상위 총판</th>
                  <th className="px-4 py-2">플랫폼%</th>
                  <th className="px-4 py-2">분배%</th>
                  <th className="px-4 py-2">실효%</th>
                  <th className="px-4 py-2">마스터 코드</th>
                  <th className="px-4 py-2">하위</th>
                  <th className="px-4 py-2">가입일</th>
                  <th className="px-4 py-2">메모</th>
                  {canCreate && (
                    <th className="px-4 py-2">요율</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {masters.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canCreate ? 11 : 10}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      등록된 총판이 없습니다.
                    </td>
                  </tr>
                ) : (
                  masters.map((r) => {
                    const n = childCount(r.id);
                    const sm = subMasterCount(r.id);
                    const sel = selectedMasterId === r.id;
                    const nested = isNestedMaster(r, byId);
                    const parent = r.parentUserId
                      ? byId.get(r.parentUserId)
                      : null;
                    return (
                      <tr
                        key={r.id}
                        className={`cursor-pointer border-b border-zinc-800/80 transition ${
                          sel ? "bg-violet-950/40" : "hover:bg-zinc-900/60"
                        }`}
                        onClick={() =>
                          setSelectedMasterId((id) =>
                            id === r.id ? null : r.id,
                          )
                        }
                      >
                        <td className="px-4 py-2 text-zinc-200">
                          {rowLoginLabel(r)}
                        </td>
                        <td className="px-4 py-2 text-zinc-400">
                          {r.displayName ?? "—"}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-2 text-xs text-zinc-500">
                          {nested && parent
                            ? rowLoginLabel(parent)
                            : "—"}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-300">
                          {!nested && r.agentPlatformSharePct != null
                            ? r.agentPlatformSharePct
                            : "—"}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-300">
                          {nested && r.agentSplitFromParentPct != null
                            ? r.agentSplitFromParentPct
                            : "—"}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-teal-400/90">
                          {r.effectiveAgentSharePct != null
                            ? r.effectiveAgentSharePct
                            : "—"}
                        </td>
                        <td
                          className="px-4 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="font-mono text-xs text-amber-200/80">
                            {r.referralCode ?? "—"}
                          </p>
                          {canCreate && (
                            <button
                              type="button"
                              onClick={() => openReferralCodeEditor(r)}
                              className="mt-1 text-[11px] text-amber-400/90 hover:text-amber-300 hover:underline"
                            >
                              코드 수정
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 text-zinc-300">
                          <span className="font-mono">{n}</span>명
                          {sm > 0 && (
                            <span className="ml-1 text-zinc-500">
                              /총판{sm}
                            </span>
                          )}
                          {sel && (
                            <span className="ml-2 text-xs text-violet-400">
                              선택
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td
                          className="px-4 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openMemo(r)}
                            className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
                          >
                            {(r.userMemo || r.agentMemo) && "● "}
                            메모
                          </button>
                        </td>
                        {canCreate && (
                          <td
                            className="px-4 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="flex flex-wrap gap-x-2 gap-y-1">
                              <button
                                type="button"
                                onClick={() => openCommission(r)}
                                className="text-xs text-amber-400/90 hover:text-amber-300 hover:underline"
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRateHist({ kind: "commission", row: r })
                                }
                                className="text-xs text-teal-400/90 hover:text-teal-300 hover:underline"
                              >
                                이력
                              </button>
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500">
            행을 누르면 해당 총판 소속 일반 유저만 아래에 표시합니다. 다시 누르면
            닫힙니다. 메모는 본인·총판·플랫폼 권한에 따라 다릅니다.
          </p>
          <p className="text-xs text-zinc-500">
            공통 가입코드는 운영 설정에서 연결하고, 각 총판의 개별 마스터 코드는
            이 표의 코드 수정 버튼으로 관리합니다.
          </p>
          <p className="text-xs text-zinc-600">
            다단계 요율: 최상위는 플랫폼 부여 %, 하위 총판은 상위 대비 분배 %만
            저장합니다. 실효 % = (상위 실효) × (분배) ÷ 100. 예) A-1 실효 40%,
            A-1이 하위에 분배 30% → 하위 실효 12%.
          </p>

          {selectedMasterId && (
            <div className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-medium text-violet-200">
                  하위 유저 ({childrenOfSelected.length}명)
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedMasterId(null)}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  닫기
                </button>
              </div>
              {childrenOfSelected.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  이 총판 코드로 가입한 유저가 아직 없습니다.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                      <tr>
                        <th className="px-3 py-2">아이디</th>
                        <th className="px-3 py-2">표시명</th>
                        <th className="px-3 py-2">가입 상태</th>
                        <th className="px-3 py-2">가입유형</th>
                        <th className="px-3 py-2">가입 입력</th>
                        <th className="px-3 py-2">가입일</th>
                        <th className="px-3 py-2">메모</th>
                        {canCreate && (
                          <th className="px-3 py-2">롤링 이력</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {childrenOfSelected.map((u) => (
                        <tr
                          key={u.id}
                          className="cursor-pointer border-b border-zinc-800/80 hover:bg-zinc-900/40"
                          onClick={() => openOverview(u)}
                        >
                          <td className="px-3 py-2 text-zinc-200">
                            {rowLoginLabel(u)}
                          </td>
                          <td className="px-3 py-2 text-zinc-400">
                            {u.displayName ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-zinc-500">
                            {registrationStatusLabelKo(u.registrationStatus)}
                          </td>
                          <td className="px-3 py-2 text-zinc-400">
                            {signupModeLabel(u.signupMode)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                            {u.signupReferralInput ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td
                            className="px-3 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => openMemo(u)}
                              className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
                            >
                              {(u.userMemo || u.agentMemo) && "● "}
                              메모
                            </button>
                          </td>
                          {canCreate && (
                            <td
                              className="px-3 py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setRateHist({ kind: "rolling", row: u })
                                }
                                className="text-xs text-teal-400/90 hover:text-teal-300 hover:underline"
                              >
                                보기
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">아이디</th>
                  <th className="px-4 py-2">표시명</th>
                  <th className="px-4 py-2">가입 상태</th>
                  <th className="px-4 py-2">가입유형</th>
                  <th className="px-4 py-2">가입 입력</th>
                  <th className="px-4 py-2">추천인</th>
                  <th className="px-4 py-2">테더지갑</th>
                  <th className="px-4 py-2">소속 총판</th>
                  <th className="px-4 py-2">가입일</th>
                  <th className="px-4 py-2">메모</th>
                  {canCreate && (
                    <th className="px-4 py-2">롤링 이력</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {endUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canCreate ? 11 : 10}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      일반 유저가 없습니다.
                    </td>
                  </tr>
                ) : (
                  endUsers.map((r) => {
                    const parent = r.parentUserId
                      ? byId.get(r.parentUserId)
                      : null;
                    return (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b border-zinc-800/80 hover:bg-zinc-900/40"
                        onClick={() => openOverview(r)}
                      >
                        <td className="px-4 py-2 text-zinc-200">
                          {rowLoginLabel(r)}
                        </td>
                        <td className="px-4 py-2 text-zinc-400">
                          {r.displayName ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-zinc-500">
                          {registrationStatusLabelKo(r.registrationStatus)}
                        </td>
                        <td className="px-4 py-2 text-zinc-400">
                          {signupModeLabel(r.signupMode)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                          {r.signupReferralInput ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-zinc-400">
                          {r.referredBy
                            ? r.referredBy.displayName ||
                              rowLoginLabel({
                                loginId: r.referredBy.loginId ?? undefined,
                                email: r.referredBy.email ?? undefined,
                              })
                            : "—"}
                        </td>
                        <td className="max-w-[220px] truncate px-4 py-2 text-xs text-emerald-300/80">
                          {r.signupMode === "anonymous" ? r.usdtWalletAddress ?? "—" : "—"}
                        </td>
                        <td
                          className="px-4 py-2 text-zinc-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {parent ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTab("masters");
                                setSelectedMasterId(parent.id);
                              }}
                              className="text-left text-teal-400 hover:text-teal-300 hover:underline"
                            >
                              {parent.displayName || rowLoginLabel(parent)}
                            </button>
                          ) : (
                            <span className="text-zinc-600">무소속</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td
                          className="px-4 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openMemo(r)}
                            className="text-xs text-violet-400 hover:text-violet-300 hover:underline"
                          >
                            {(r.userMemo || r.agentMemo) && "● "}
                            메모
                          </button>
                        </td>
                        {canCreate && (
                          <td
                            className="px-4 py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setRateHist({ kind: "rolling", row: r })
                              }
                              className="text-xs text-teal-400/90 hover:text-teal-300 hover:underline"
                            >
                              보기
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-500">
            소속 총판 이름을 누르면 총판 탭으로 이동해 해당 총판·하위 목록을 엽니다.
          </p>
          <p className="text-xs text-zinc-500">
            일반 유저 행을 누르면 현재 출금 가능액, 롤링 진행률, 포인트 환산,
            최근 입출금까지 상세하게 볼 수 있습니다.
          </p>
        </div>
      )}

      {otherRoles.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-zinc-400">기타 역할</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">아이디</th>
                  <th className="px-4 py-2">역할</th>
                  <th className="px-4 py-2">표시명</th>
                </tr>
              </thead>
              <tbody>
                {otherRoles.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-800/80">
                    <td className="px-4 py-2 text-zinc-200">
                      {rowLoginLabel(r)}
                    </td>
                    <td className="px-4 py-2 text-zinc-400">
                      {userRoleLabelKo(r.role)}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {r.displayName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {overviewUser && selectedPlatformId && (
        <UserDetailModal
          user={overviewUser}
          platformId={selectedPlatformId}
          onClose={() => setOverviewUser(null)}
        />
      )}

      {referralCodeUser && canCreate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-100">
              마스터 코드 설정
            </h2>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              {rowLoginLabel(referralCodeUser)}
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              회원가입에서 사용하는 관리자(마스터) 코드입니다. 비워두면 자동으로
              새 코드가 재발급됩니다.
            </p>
            {referralCodeErr && (
              <p className="mt-3 text-sm text-red-400">{referralCodeErr}</p>
            )}
            <label className="mt-4 block text-sm text-zinc-400">
              마스터 코드
              <input
                value={referralCodeDraft}
                onChange={(e) => setReferralCodeDraft(e.target.value.toUpperCase())}
                placeholder="예: ION001"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReferralCodeUser(null)}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={referralCodeSaving}
                onClick={() => void saveReferralCode()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
              >
                {referralCodeSaving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rateHist && canCreate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {rateHist.kind === "commission"
                    ? "총판 요율 변경 이력"
                    : "회원 롤링 % 변경 이력"}
                </h2>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  {rowLoginLabel(rateHist.row)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRateHist(null)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            {rateHistHint && (
              <p className="mt-3 text-xs text-teal-200/80">{rateHistHint}</p>
            )}
            {rateHistLoading ? (
              <p className="mt-4 text-sm text-zinc-500">불러오는 중…</p>
            ) : rateHist.kind === "commission" ? (
              rateHistComm.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">이력이 없습니다.</p>
              ) : (
                <table className="mt-4 w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="py-2 pr-2">적용 시작</th>
                      <th className="py-2">플랫폼 %</th>
                      <th className="py-2">분배 %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateHistComm.map((h) => (
                      <tr key={h.id} className="border-b border-zinc-800/60">
                        <td className="py-2 pr-2 text-zinc-400">
                          {new Date(h.effectiveFrom).toLocaleString()}
                        </td>
                        <td className="py-2 font-mono text-zinc-200">
                          {h.agentPlatformSharePct ?? "—"}
                        </td>
                        <td className="py-2 font-mono text-zinc-200">
                          {h.agentSplitFromParentPct ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : rateHistRoll.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">이력이 없습니다.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-500">
                    <tr>
                      <th className="py-2 pr-2">적용 시작</th>
                      <th className="py-2">사용</th>
                      <th className="py-2">국내</th>
                      <th className="py-2">해외</th>
                      <th className="py-2">카지노</th>
                      <th className="py-2">슬롯</th>
                      <th className="py-2">미니</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateHistRoll.map((h) => (
                      <tr key={h.id} className="border-b border-zinc-800/60">
                        <td className="py-2 pr-2 text-zinc-400">
                          {new Date(h.effectiveFrom).toLocaleString()}
                        </td>
                        <td className="py-2 text-zinc-300">
                          {h.rollingEnabled ? "O" : "—"}
                        </td>
                        <td className="py-2 font-mono text-zinc-200">
                          {h.rollingSportsDomesticPct ?? "—"}
                        </td>
                        <td className="py-2 font-mono text-zinc-200">
                          {h.rollingSportsOverseasPct ?? "—"}
                        </td>
                        <td className="py-2 font-mono text-zinc-200">
                          {h.rollingCasinoPct ?? "—"}
                        </td>
                        <td className="py-2 font-mono text-zinc-200">
                          {h.rollingSlotPct ?? "—"}
                        </td>
                        <td className="py-2 font-mono text-zinc-200">
                          {h.rollingMinigamePct ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              type="button"
              onClick={() => setRateHist(null)}
              className="mt-5 w-full rounded-lg border border-zinc-600 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {commissionUser && canCreate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-100">
              총판 요율 (다단계)
            </h2>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              {rowLoginLabel(commissionUser)}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {isNestedMaster(commissionUser, byId)
                ? "하위 총판: 상위 실효 요율 × 분배% ÷ 100. 아래는 분배%만 수정합니다."
                : "최상위 총판: 플랫폼이 부여한 기준 요율(%)입니다."}
            </p>
            {commissionErr && (
              <p className="mt-2 text-sm text-red-400">{commissionErr}</p>
            )}
            {isNestedMaster(commissionUser, byId) ? (
              <label className="mt-4 block text-sm text-zinc-400">
                상위 대비 분배 %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={commissionSplitDraft}
                  onChange={(e) => setCommissionSplitDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </label>
            ) : (
              <label className="mt-4 block text-sm text-zinc-400">
                플랫폼 부여 요율 %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={commissionPlatformDraft}
                  onChange={(e) => setCommissionPlatformDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </label>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setCommissionUser(null)}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={commissionSaving}
                onClick={() => void saveCommission()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
              >
                {commissionSaving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {memoUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-100">메모</h2>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              {rowLoginLabel(memoUser)}
            </p>
            {memoErr && (
              <p className="mt-2 text-sm text-red-400">{memoErr}</p>
            )}
            <label className="mt-4 block text-sm text-zinc-400">
              총판 메모
              <span className="mb-1 block text-[11px] text-zinc-600">
                소속 총판(또는 플랫폼)이 이 회원에게 남기는 메모입니다.
              </span>
              <textarea
                value={agentDraft}
                onChange={(e) => setAgentDraft(e.target.value)}
                disabled={!canEditAgentMemo(getStoredUser(), memoUser)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
              />
            </label>
            <label className="mt-4 block text-sm text-zinc-400">
              회원 메모
              <span className="mb-1 block text-[11px] text-zinc-600">
                회원 본인이 쓰는 메모입니다. 플랫폼 관리자도 수정할 수 있습니다.
              </span>
              <textarea
                value={userDraft}
                onChange={(e) => setUserDraft(e.target.value)}
                disabled={
                  !canEditUserMemoAdmin(getStoredUser()) &&
                  !canEditOwnUserMemo(getStoredUser(), memoUser)
                }
                rows={4}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 disabled:opacity-50"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemoUser(null)}
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={memoSaving}
                onClick={() => saveMemos()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
              >
                {memoSaving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

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

type Tab = "list" | "register";

export default function AgentSubAgentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("list");
  const [parentEff, setParentEff] = useState<number | null>(null);
  const [items, setItems] = useState<Sub[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingMemoId, setSavingMemoId] = useState<string | null>(null);

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
      const res = await apiFetch<SubAgentsRes>("/me/agent/sub-agents");
      setParentEff(res.parentEffectiveSharePct);
      setItems(res.items);
      const d: Record<string, string> = {};
      const md: Record<string, string> = {};
      for (const it of res.items) {
        d[it.id] = String(it.splitFromParentPct);
        md[it.id] = it.uplinePrivateMemo ?? "";
      }
      setDrafts(d);
      setMemoDrafts(md);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setItems([]);
      setParentEff(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (getStoredUser()?.role !== "MASTER_AGENT") {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  async function createSubAgent(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreateOk(null);
    const n = Number(splitPct);
    if (Number.isNaN(n) || n < 0 || n > 100) {
      setErr("분배율은 0~100 사이 숫자여야 합니다.");
      return;
    }
    if (password.length < 6) {
      setErr("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (referralCode.trim() && !/^[A-Za-z0-9]{4,16}$/.test(referralCode.trim())) {
      setErr("추천코드는 영숫자 4~16자이거나 비워 자동 발급입니다.");
      return;
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
      await apiFetch("/me/agent/sub-agents", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCreateOk("등록되었습니다. 목록 탭에서 확인하세요.");
      setLoginId("");
      setPassword("");
      setDisplayName("");
      setReferralCode("");
      setSplitPct("30");
      await load();
      setTab("list");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setCreating(false);
    }
  }

  if (!getAccessToken()) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">하위 총판</h1>
        <p className="mt-1 text-sm text-zinc-500">
          본인을 상위로 둔 총판만 표시됩니다. 상위 대비 분배율은 내 실효 요율의
          몇 %를 하위가 가져가는지이며, 실효 요율 = 상위 실효 × 분배% ÷ 100
          입니다.
        </p>
        {parentEff != null && (
          <p className="mt-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-200/90">
            나의 실효 요율:{" "}
            <span className="font-mono">{parentEff}</span>% (플랫폼 부여 및
            상위 분배가 반영된 값)
          </p>
        )}
      </div>

      <div className="flex gap-2 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setTab("list")}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            tab === "list"
              ? "bg-zinc-800 text-violet-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          하위 총판 ({items.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setCreateOk(null);
            setTab("register");
          }}
          className={`rounded-t px-4 py-2 text-sm font-medium transition ${
            tab === "register"
              ? "bg-zinc-800 text-teal-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          신규 등록
        </button>
      </div>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}
      {createOk && tab === "list" && (
        <p className="rounded border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {createOk}
        </p>
      )}

      {tab === "register" && (
        <form
          onSubmit={createSubAgent}
          className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5"
        >
          <p className="text-sm text-zinc-400">
            새 하위 총판은 본인 플랫폼에 연결되며, 로그인 후 동일한 총판 메뉴를
            사용합니다.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-zinc-400">
              아이디 (로그인)
              <input
                required
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              초기 비밀번호 (6자 이상)
              <input
                required
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              표시명 (선택)
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              추천 코드 (선택, 영숫자 4~16 · 비우면 자동)
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400 sm:col-span-2">
              상위(나) 대비 분배 % (0~100)
              <input
                required
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={splitPct}
                onChange={(e) => setSplitPct(e.target.value)}
                className="mt-1 w-full max-w-[200px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-500 disabled:opacity-50"
          >
            {creating ? "등록 중…" : "하위 총판 등록"}
          </button>
        </form>
      )}

      {tab === "list" && (
        <>
          {loading ? (
            <p className="text-zinc-500">불러오는 중…</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-500">
              등록된 하위 총판이 없습니다. 「신규 등록」에서 추가할 수 있습니다.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
                  <tr>
                    <th className="px-3 py-2">아이디</th>
                    <th className="px-3 py-2">표시명</th>
                    <th className="px-3 py-2 min-w-[160px]">식별 메모</th>
                    <th className="px-3 py-2">분배 %</th>
                    <th className="px-3 py-2">하위 실효 %</th>
                    <th className="px-3 py-2">등록일</th>
                    <th className="px-3 py-2">저장</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-zinc-200">
                        {r.loginId}
                      </td>
                      <td className="px-3 py-2 text-zinc-400">
                        {r.displayName ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <textarea
                          rows={2}
                          value={memoDrafts[r.id] ?? ""}
                          onChange={(e) =>
                            setMemoDrafts((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                          className="w-full min-w-[140px] max-w-[220px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200"
                        />
                        <button
                          type="button"
                          disabled={savingMemoId === r.id}
                          onClick={async () => {
                            setSavingMemoId(r.id);
                            setErr(null);
                            try {
                              await apiFetch(
                                `/me/agent/downline/${r.id}/upline-private-memo`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    uplinePrivateMemo:
                                      memoDrafts[r.id] ?? "",
                                  }),
                                },
                              );
                              await load();
                            } catch (e) {
                              setErr(
                                e instanceof Error
                                  ? e.message
                                  : "메모 저장 실패",
                              );
                            } finally {
                              setSavingMemoId(null);
                            }
                          }}
                          className="mt-1 rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {savingMemoId === r.id ? "…" : "메모 저장"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={drafts[r.id] ?? ""}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [r.id]: e.target.value,
                            }))
                          }
                          className="w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-100"
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-teal-300/90">
                        {r.effectiveAgentSharePct}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={savingId === r.id}
                          onClick={async () => {
                            const n = Number(drafts[r.id]);
                            if (Number.isNaN(n) || n < 0 || n > 100) {
                              setErr("분배율은 0~100 사이 숫자여야 합니다.");
                              return;
                            }
                            setSavingId(r.id);
                            setErr(null);
                            try {
                              await apiFetch(
                                `/me/agent/downline-agent/${r.id}/split`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    splitFromParentPct: n,
                                  }),
                                },
                              );
                              await load();
                            } catch (e) {
                              setErr(
                                e instanceof Error ? e.message : "저장 실패",
                              );
                            } finally {
                              setSavingId(null);
                            }
                          }}
                          className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {savingId === r.id ? "…" : "적용"}
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
    </div>
  );
}

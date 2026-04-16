"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { registrationStatusLabelKo } from "@/lib/labels";

type Pending = {
  id: string;
  loginId: string;
  email: string | null;
  displayName: string | null;
  signupMode: string | null;
  signupReferralInput: string | null;
  usdtWalletAddress: string | null;
  createdAt: string;
  parentUserId: string | null;
  referredBy: {
    id: string;
    loginId: string;
    displayName: string | null;
    email: string | null;
  } | null;
  parent: {
    id: string;
    displayName: string | null;
    loginId: string;
    email: string | null;
    referralCode: string | null;
  } | null;
};

type HistoryRow = {
  id: string;
  loginId: string;
  email: string | null;
  displayName: string | null;
  signupMode: string | null;
  signupReferralInput: string | null;
  usdtWalletAddress: string | null;
  registrationStatus: string;
  registrationResolvedAt: string | null;
  createdAt: string;
  referredBy: {
    id: string;
    loginId: string;
    displayName: string | null;
    email: string | null;
  } | null;
  parent: {
    id: string;
    displayName: string | null;
    loginId: string;
    email: string | null;
    referralCode: string | null;
  } | null;
};

type FilterKey = "all" | "unassigned" | string;

function loginLabel(row: { loginId: string; email: string | null }) {
  return row.loginId || row.email || "—";
}

function signupModeLabel(mode: string | null | undefined) {
  return mode === "anonymous" ? "무기명" : "일반";
}

export default function ConsoleRegistrationsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();
  const [rows, setRows] = useState<Pending[] | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    if (!selectedPlatformId) return;
    setErr(null);
    try {
      const [p, h] = await Promise.all([
        apiFetch<Pending[]>(
          `/platforms/${selectedPlatformId}/registrations/pending`,
        ),
        apiFetch<HistoryRow[]>(
          `/platforms/${selectedPlatformId}/registrations/history`,
        ),
      ]);
      setRows(p);
      setHistory(h);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setRows(null);
      setHistory(null);
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) {
      setRows(null);
      setHistory(null);
      return;
    }
    void load();
  }, [load, router, selectedPlatformId, platformLoading]);

  const filterTabs = useMemo(() => {
    if (!rows?.length) {
      return [{ key: "all" as FilterKey, label: "전체", count: 0 }];
    }
    let unassigned = 0;
    const masterMap = new Map<
      string,
      { id: string; label: string; ref: string | null; count: number }
    >();
    for (const r of rows) {
      if (!r.parent?.id) {
        unassigned++;
        continue;
      }
      const id = r.parent.id;
      const label =
        r.parent.displayName?.trim() || r.parent.loginId || r.parent.email || r.parent.id;
      const ref = r.parent.referralCode;
      const prev = masterMap.get(id);
      if (prev) prev.count += 1;
      else masterMap.set(id, { id, label, ref, count: 1 });
    }
    const tabs: { key: FilterKey; label: string; count: number }[] = [
      { key: "all", label: "전체", count: rows.length },
    ];
    if (unassigned > 0) {
      tabs.push({ key: "unassigned", label: "무소속", count: unassigned });
    }
    const masters = [...masterMap.values()].sort((a, b) => b.count - a.count);
    for (const m of masters) {
      const refPart = m.ref ? `${m.ref} · ` : "";
      tabs.push({
        key: m.id,
        label: `${refPart}${m.label}`,
        count: m.count,
      });
    }
    return tabs;
  }, [rows]);

  useEffect(() => {
    if (filterKey === "all") return;
    const exists = filterTabs.some((t) => t.key === filterKey);
    if (!exists) setFilterKey("all");
  }, [filterTabs, filterKey]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (filterKey === "all") return rows;
    if (filterKey === "unassigned")
      return rows.filter((r) => !r.parent?.id);
    return rows.filter((r) => r.parent?.id === filterKey);
  }, [rows, filterKey]);

  async function approve(id: string) {
    if (!selectedPlatformId) return;
    setBusy(id);
    setErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/registrations/${id}/approve`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    if (!selectedPlatformId) return;
    setBusy(id);
    setErr(null);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/registrations/${id}/reject`,
        { method: "POST", body: JSON.stringify({}) },
      );
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(null);
    }
  }

  if (platformLoading || !selectedPlatformId) {
    return platformLoading ? (
      <p className="text-zinc-500">불러오는 중…</p>
    ) : null;
  }
  if (err && !rows && !history) {
    return <p className="text-red-400">{err}</p>;
  }
  if (rows === null || history === null) {
    return <p className="text-zinc-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">가입 승인</h1>
        <p className="mt-1 text-sm text-zinc-500">
          대기 중인 신청을 처리하고, 아래에서 최근 승인·거절 기록을 확인할 수
          있습니다.
        </p>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-200">승인 대기</h2>
        <p className="text-sm text-zinc-500">
          탭으로 총판(추천인)별로 나눠 볼 수 있습니다. 무소속은 상위 총판 연결이
          없는 신청입니다.
        </p>

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
            {filterTabs.map((t) => {
              const active = filterKey === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilterKey(t.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-amber-600/25 text-amber-200 ring-1 ring-amber-600/50"
                      : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 font-mono text-xs opacity-80">
                    ({t.count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-zinc-500">대기 중인 가입 신청이 없습니다.</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-zinc-500">이 탭에 해당하는 신청이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {filteredRows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-100">{loginLabel(r)}</p>
                    <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
                      {signupModeLabel(r.signupMode)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {r.displayName ?? "이름 없음"} · 신청{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    가입 입력:{" "}
                    <span className="font-mono text-zinc-300">
                      {r.signupReferralInput ?? "—"}
                    </span>
                    {r.referredBy ? (
                      <>
                        <span className="mx-1 text-zinc-700">·</span>
                        추천인{" "}
                        <span className="text-zinc-300">
                          {r.referredBy.displayName ?? r.referredBy.loginId}
                        </span>
                      </>
                    ) : null}
                  </p>
                  {r.signupMode === "anonymous" && r.usdtWalletAddress ? (
                    <p className="mt-1 truncate text-xs text-emerald-300/80">
                      테더지갑: {r.usdtWalletAddress}
                    </p>
                  ) : null}
                  <div className="mt-2 rounded-lg border border-violet-900/40 bg-violet-950/25 px-3 py-2 text-xs">
                    <p className="font-medium text-violet-200/90">소속 총판</p>
                    <p className="mt-0.5 text-violet-100/80">
                      {r.parent ? (
                        <>
                          {r.parent.referralCode && (
                            <span className="font-mono text-amber-200/90">
                              {r.parent.referralCode}
                            </span>
                          )}
                          {r.parent.referralCode && (
                            <span className="text-zinc-500"> · </span>
                          )}
                          <span>
                            {r.parent.displayName ?? r.parent.loginId}
                          </span>
                          <span className="text-zinc-500">
                            {" "}
                            ({r.parent.loginId})
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-200/70">
                          무소속 — 추천 코드 없이 가입했거나 상위 연결 없음
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => approve(r.id)}
                    className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => reject(r.id)}
                    className="rounded border border-red-900/60 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50"
                  >
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-200">승인·거절 내역</h2>
        <p className="text-sm text-zinc-500">
          최근 처리한 회원만 표시합니다(최대 100건). 처리 시각은 승인·거절을
          누른 시간입니다.
        </p>
        {history.length === 0 ? (
          <p className="text-zinc-500">아직 기록이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
                <tr>
                  <th className="px-4 py-2">처리 시각</th>
                  <th className="px-4 py-2">결과</th>
                  <th className="px-4 py-2">아이디</th>
                  <th className="px-4 py-2">표시명</th>
                  <th className="px-4 py-2">가입유형</th>
                  <th className="px-4 py-2">가입 입력</th>
                  <th className="px-4 py-2">추천인</th>
                  <th className="px-4 py-2">소속 총판</th>
                  <th className="px-4 py-2">가입 신청일</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-zinc-800/80 hover:bg-zinc-900/40"
                  >
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-zinc-400">
                      {h.registrationResolvedAt
                        ? new Date(h.registrationResolvedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          h.registrationStatus === "APPROVED"
                            ? "text-emerald-400"
                            : "text-red-300/90"
                        }
                      >
                        {registrationStatusLabelKo(h.registrationStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-200">{loginLabel(h)}</td>
                    <td className="px-4 py-2 text-zinc-500">
                      {h.displayName ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-400">
                      {signupModeLabel(h.signupMode)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                      {h.signupReferralInput ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">
                      {h.referredBy
                        ? h.referredBy.displayName ?? h.referredBy.loginId
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">
                      {h.parent ? (
                        <>
                          {h.parent.referralCode && (
                            <span className="font-mono text-amber-200/70">
                              {h.parent.referralCode}{" "}
                            </span>
                          )}
                          {h.parent.displayName ?? h.parent.loginId}
                        </>
                      ) : (
                        <span className="text-zinc-600">무소속</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-zinc-500">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

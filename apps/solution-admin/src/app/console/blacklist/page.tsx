"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type UserRow = {
  id: string;
  loginId?: string;
  email?: string | null;
  role: string;
  displayName?: string | null;
  isBlocked?: boolean;
  blockedReason?: string | null;
  blockedAt?: string | null;
  phone?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
};

type SimilarMatch = {
  userId: string;
  platformId: string | null;
  platformName: string | null;
  platformSlug: string | null;
  loginId: string | null;
  displayName: string | null;
  phone: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  isBlocked: boolean;
  blockedReason: string | null;
  blockedAt: string | null;
  matches: string[];
  matchCount: number;
};

function rowLoginLabel(r: Pick<UserRow, "loginId" | "email">): string {
  const v = r.loginId ?? r.email;
  return v != null && String(v).length > 0 ? String(v) : "—";
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

export default function BlacklistPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();

  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 차단 모달
  const [blockTarget, setBlockTarget] = useState<UserRow | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockSaving, setBlockSaving] = useState(false);

  // 교차 플랫폼 유사 회원 검색
  const [similarOpen, setSimilarOpen] = useState(false);
  const [similarInputs, setSimilarInputs] = useState({
    loginId: "",
    phone: "",
    displayName: "",
    bankAccountNumber: "",
    bankAccountHolder: "",
  });
  const [similarResults, setSimilarResults] = useState<SimilarMatch[] | null>(
    null,
  );
  const [similarBusy, setSimilarBusy] = useState(false);

  const load = useCallback(async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setErr(null);
    try {
      const all = await apiFetch<UserRow[]>(
        `/platforms/${selectedPlatformId}/users`,
      );
      setUsers(all.filter((u) => u.isBlocked || u.role === "USER"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [selectedPlatformId]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!selectedPlatformId || platformLoading) return;
    void load();
  }, [load, router, selectedPlatformId, platformLoading]);

  const blocked = (users ?? []).filter((u) => u.isBlocked);
  const filteredBlocked = search.trim()
    ? blocked.filter(
        (u) =>
          rowLoginLabel(u).toLowerCase().includes(search.toLowerCase()) ||
          (u.displayName ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : blocked;

  async function handleBlock() {
    if (!blockTarget || !selectedPlatformId) return;
    setBlockSaving(true);
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/users/${blockTarget.id}/block`,
        {
          method: "PATCH",
          body: JSON.stringify({
            reason: blockReason.trim() || undefined,
          }),
        },
      );
      setMsg(`${rowLoginLabel(blockTarget)} 차단 완료`);
      setBlockTarget(null);
      setBlockReason("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "차단 실패");
    } finally {
      setBlockSaving(false);
    }
  }

  async function handleUnblock(user: UserRow) {
    if (!selectedPlatformId) return;
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/users/${user.id}/unblock`,
        { method: "PATCH", body: "{}" },
      );
      setMsg(`${rowLoginLabel(user)} 차단 해제 완료`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "차단 해제 실패");
    }
  }

  async function runSimilarSearch() {
    if (!selectedPlatformId) return;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(similarInputs)) {
      if (v.trim()) qs.set(k, v.trim());
    }
    if (qs.size === 0) {
      setSimilarResults([]);
      return;
    }
    setSimilarBusy(true);
    try {
      const results = await apiFetch<SimilarMatch[]>(
        `/platforms/${selectedPlatformId}/blacklist/similar?${qs.toString()}`,
      );
      setSimilarResults(results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "유사 검색 실패");
    } finally {
      setSimilarBusy(false);
    }
  }

  return (
    <div className="space-y-5 px-1">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-black">유저 블랙리스트</h1>
          <p className="mt-1 text-xs text-gray-500">
            차단된 유저 조회 · 차단 해제 · 신규 차단
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="아이디·표시명 검색"
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 w-48"
          />
          <button
            onClick={() => setSimilarOpen((v) => !v)}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
          >
            {similarOpen ? "교차 검색 닫기" : "교차 플랫폼 유사 검색"}
          </button>
          <button
            onClick={() => void load()}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            새로고침
          </button>
        </div>
      </div>

      {similarOpen && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">
            교차 플랫폼 유사 회원 검색
          </h2>
          <p className="mb-3 text-[11px] text-amber-700">
            입력한 키 중 <b>2개 이상</b> 일치하는 <u>다른 플랫폼</u> 회원을
            조회합니다. 신규 가입자 검토나 타 솔루션 블랙리스트 대조에 사용하세요.
          </p>
          <div className="grid gap-2 md:grid-cols-5">
            {(
              [
                { key: "loginId", label: "아이디" },
                { key: "phone", label: "전화번호" },
                { key: "displayName", label: "표시명" },
                { key: "bankAccountHolder", label: "예금주" },
                { key: "bankAccountNumber", label: "계좌번호" },
              ] as const
            ).map((f) => (
              <input
                key={f.key}
                type="text"
                value={similarInputs[f.key]}
                onChange={(e) =>
                  setSimilarInputs((prev) => ({
                    ...prev,
                    [f.key]: e.target.value,
                  }))
                }
                placeholder={f.label}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setSimilarInputs({
                  loginId: "",
                  phone: "",
                  displayName: "",
                  bankAccountNumber: "",
                  bankAccountHolder: "",
                });
                setSimilarResults(null);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              초기화
            </button>
            <button
              onClick={() => void runSimilarSearch()}
              disabled={similarBusy}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {similarBusy ? "검색 중..." : "검색"}
            </button>
          </div>

          {similarResults !== null ? (
            similarResults.length === 0 ? (
              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-gray-500">
                일치 2개 이상인 타 플랫폼 회원이 없습니다.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-amber-200 bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {[
                        "플랫폼",
                        "아이디",
                        "표시명",
                        "전화",
                        "예금주",
                        "계좌",
                        "차단",
                        "일치",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-2 py-2 text-left font-medium text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {similarResults.map((r) => (
                      <tr
                        key={r.userId}
                        className="border-b border-gray-100 hover:bg-amber-50/50"
                      >
                        <td className="px-2 py-2 font-semibold text-gray-700">
                          {r.platformName ?? "—"}
                        </td>
                        <td className="px-2 py-2 font-mono text-gray-700">
                          {r.loginId ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-gray-600">
                          {r.displayName ?? "—"}
                        </td>
                        <td className="px-2 py-2 font-mono text-gray-500">
                          {r.phone ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-gray-500">
                          {r.bankAccountHolder ?? "—"}
                        </td>
                        <td className="px-2 py-2 font-mono text-gray-500">
                          {r.bankAccountNumber ?? "—"}
                        </td>
                        <td className="px-2 py-2">
                          {r.isBlocked ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              차단
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 font-mono font-semibold text-amber-700">
                          {r.matchCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}
        </div>
      )}

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

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            차단된 유저
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-red-600">
            {blocked.length.toLocaleString("ko-KR")}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">명</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            전체 유저
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-black">
            {(users ?? []).length.toLocaleString("ko-KR")}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">명</p>
        </div>
      </div>

      {/* 차단 목록 */}
      {loading ? (
        <p className="py-6 text-sm text-gray-400">불러오는 중…</p>
      ) : filteredBlocked.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-gray-400">
            {search ? "검색 결과가 없습니다." : "차단된 유저가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                {["아이디", "표시명", "차단 사유", "차단일", ""].map((h) => (
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
              {filteredBlocked.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-3 py-2.5 font-mono text-sm font-semibold text-red-600 whitespace-nowrap">
                    {rowLoginLabel(u)}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                    {u.displayName || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[200px] truncate">
                    {u.blockedReason || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {u.blockedAt ? dt(u.blockedAt) : "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => void handleUnblock(u)}
                      className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition"
                    >
                      차단 해제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 차단 모달 */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-black">
                유저 차단 — {rowLoginLabel(blockTarget)}
              </h2>
              <button
                onClick={() => setBlockTarget(null)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-black"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  차단 사유
                </label>
                <textarea
                  rows={3}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="차단 사유를 입력하세요 (선택)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => void handleBlock()}
                disabled={blockSaving}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition"
              >
                {blockSaving ? "처리 중…" : "차단 확인"}
              </button>
              <button
                onClick={() => setBlockTarget(null)}
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

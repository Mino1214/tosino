"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";
import { MemberDetailModal } from "@/components/MemberDetailModal";

type DownlineRow = {
  id: string;
  loginId: string;
  email?: string | null;
  displayName: string | null;
  createdAt: string;
  registrationStatus: string;
  rollingEnabled: boolean;
  rollingSportsDomesticPct: number | null;
  rollingSportsOverseasPct: number | null;
  rollingCasinoPct: number | null;
  rollingSlotPct: number | null;
  rollingMinigamePct: number | null;
  uplinePrivateMemo: string | null;
  balance: string;
};

function regLabel(s: string) {
  switch (s) {
    case "PENDING":
      return "승인 대기";
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "거절됨";
    default:
      return s;
  }
}

export default function AgentMembersPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DownlineRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const list = await apiFetch<DownlineRow[]>("/me/agent/downline");
      setRows(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setRows(null);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    const u = getStoredUser();
    if (u?.role !== "MASTER_AGENT") {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.loginId.toLowerCase().includes(t) ||
        (r.displayName?.toLowerCase().includes(t) ?? false) ||
        (r.uplinePrivateMemo?.toLowerCase().includes(t) ?? false),
    );
  }, [rows, q]);

  if (!getAccessToken()) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">회원 조회</h1>
        <p className="mt-1 text-sm text-zinc-500">
          추천·상위 총판으로 연결된 직속 하위 회원만 표시됩니다. 아이디·닉네임으로
          검색할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="아이디 / 닉네임 / 식별 메모 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}

      {!rows ? (
        <p className="text-zinc-500">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <p className="text-zinc-500">
          {rows.length === 0
            ? "아직 하위 회원이 없습니다."
            : "검색 결과가 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400">
              <tr>
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">아이디 · 식별 메모 / 닉네임</th>
                <th className="px-3 py-2">상위 총판</th>
                <th className="px-3 py-2">보유머니</th>
                <th className="px-3 py-2">롤링 %</th>
                <th className="px-3 py-2">가입일</th>
                <th className="px-3 py-2">상세</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-800/80 hover:bg-zinc-900/50"
                >
                  <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs text-zinc-200">
                      {r.loginId}
                    </p>
                    {r.uplinePrivateMemo ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-amber-200/85">
                        {r.uplinePrivateMemo}
                      </p>
                    ) : null}
                    <p className="text-zinc-500">
                      {r.displayName ?? "—"}
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      {regLabel(r.registrationStatus)}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs text-teal-400/90">
                    본인 소속
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-200">
                    {r.balance}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {r.rollingEnabled ? (
                      <span className="text-emerald-400/90">사용</span>
                    ) : (
                      <span className="text-zinc-600">미사용</span>
                    )}
                    <div className="mt-0.5 font-mono text-[10px] leading-relaxed text-zinc-500">
                      국{r.rollingSportsDomesticPct ?? 0} 해
                      {r.rollingSportsOverseasPct ?? 0} · C
                      {r.rollingCasinoPct ?? 0} Sl{r.rollingSlotPct ?? 0} M
                      {r.rollingMinigamePct ?? 0}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setDetailId(r.id)}
                      className="rounded border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      회원정보
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MemberDetailModal
        userId={detailId}
        onClose={() => setDetailId(null)}
        onSaved={() => load()}
      />
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
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

function fmtBal(v: string | number | null | undefined) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "₩0";
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

/** 롤링 % → 배율 (0.3% → 3배) */
function toMult(pct: number | null | undefined): string {
  if (!pct) return "—";
  const m = Math.round(pct * 10 * 10) / 10;
  return `${m}배`;
}

export default function AgentMembersPage() {
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
    void load();
  }, [load]);

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">회원 조회</h1>
        <p className="mt-1 text-sm text-gray-500">
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
          className="min-w-[200px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
        />
      </div>

      {err && (
        <p className="rounded border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      )}

      {!rows ? (
        <p className="text-gray-500">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">
          {rows.length === 0
            ? "아직 하위 회원이 없습니다."
            : "검색 결과가 없습니다."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">아이디 · 식별 메모 / 닉네임</th>
                <th className="px-3 py-2">상위 총판</th>
                <th className="px-3 py-2">보유머니</th>
                <th className="px-3 py-2">롤링 배율</th>
                <th className="px-3 py-2">가입일</th>
                <th className="px-3 py-2">상세</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                  <td className="px-3 py-2">
                    <p className="font-mono text-xs text-gray-800">
                      {r.loginId}
                    </p>
                    {r.uplinePrivateMemo ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-[#3182f6]">
                        {r.uplinePrivateMemo}
                      </p>
                    ) : null}
                    <p className="text-gray-500">
                      {r.displayName ?? "—"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {regLabel(r.registrationStatus)}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs text-teal-400/90">
                    본인 소속
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-gray-900">
                    {fmtBal(r.balance)}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {r.rollingEnabled ? (
                      <div className="space-y-0.5">
                        <div className="font-mono text-[11px] leading-relaxed text-gray-700">
                          <span className="text-gray-400">국내</span> {toMult(r.rollingSportsDomesticPct)}{" "}
                          <span className="text-gray-400">해외</span> {toMult(r.rollingSportsOverseasPct)}
                        </div>
                        <div className="font-mono text-[11px] leading-relaxed text-gray-700">
                          <span className="text-gray-400">카지노</span> {toMult(r.rollingCasinoPct)}{" "}
                          <span className="text-gray-400">슬롯</span> {toMult(r.rollingSlotPct)}{" "}
                          <span className="text-gray-400">미니</span> {toMult(r.rollingMinigamePct)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">미사용</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setDetailId(r.id)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
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


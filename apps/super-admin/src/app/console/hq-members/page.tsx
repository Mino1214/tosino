"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";
import { registrationStatusLabelKo, userRoleLabelKo } from "@/lib/labels";

type Row = {
  id: string;
  loginId: string;
  email: string | null;
  role: string;
  platformId: string | null;
  platform: { id: string; slug: string; name: string } | null;
  parentUserId: string | null;
  displayName: string | null;
  createdAt: string;
  registrationStatus: string;
  referralCode: string | null;
  isBlocked: boolean;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
};

function LastLoginCell({
  at,
  ip,
}: {
  at: string | null | undefined;
  ip: string | null | undefined;
}) {
  if (!at) return <span className="text-gray-400">—</span>;
  return (
    <div className="whitespace-nowrap text-xs text-gray-600">
      <div>{new Date(at).toLocaleString("ko-KR")}</div>
      {ip ? (
        <div className="mt-0.5 font-mono text-[11px] text-gray-500">{ip}</div>
      ) : null}
    </div>
  );
}

const ROLE_FILTER = [
  { value: "", label: "전체 등급" },
  { value: "PLATFORM_ADMIN", label: "플랫폼 관리자" },
  { value: "MASTER_AGENT", label: "총판" },
  { value: "USER", label: "일반 회원" },
] as const;

export default function HqMembersPage() {
  const { platforms } = usePlatform();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sort, setSort] = useState<"role" | "created">("role");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (platformFilter) params.set("platformId", platformFilter);
      if (roleFilter) params.set("role", roleFilter);
      params.set("sort", sort);
      const data = await apiFetch<Row[]>(`/hq/users?${params.toString()}`);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오지 못했습니다");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [platformFilter, roleFilter, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.loginId.toLowerCase().includes(s) ||
        (r.email?.toLowerCase().includes(s) ?? false) ||
        (r.displayName?.toLowerCase().includes(s) ?? false) ||
        (r.platform?.slug.toLowerCase().includes(s) ?? false) ||
        (r.platform?.name.toLowerCase().includes(s) ?? false),
    );
  }, [rows, q]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">HQ</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">회원 관리 (전체 솔루션)</h1>
        <p className="mt-1 text-sm text-gray-500">
          등급(역할) 순 기본 정렬 · 솔루션 필터 ·{" "}
          <Link href="/console/platforms" className="font-medium text-[#3182f6] hover:underline">
            솔루션 목록
          </Link>
          에서 도메인·마스터 계정을 함께 관리하세요.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">솔루션</label>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="t-input mt-1 min-w-[10rem] text-sm"
          >
            <option value="">전체</option>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">등급</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="t-input mt-1 min-w-[10rem] text-sm"
          >
            {ROLE_FILTER.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">정렬</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value === "created" ? "created" : "role")}
            className="t-input mt-1 min-w-[10rem] text-sm"
          >
            <option value="role">등급(플랫폼관리→총판→회원) · 아이디</option>
            <option value="created">가입일(최신 API 순)</option>
          </select>
        </div>
        <div className="min-w-[12rem] flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400">검색</label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="아이디, 이메일, 표시명, 솔루션…"
            className="t-input mt-1 text-sm"
          />
        </div>
        <button type="button" onClick={() => void load()} className="t-btn-primary text-sm">
          새로고침
        </button>
      </div>

      {err ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{err}</p>
      ) : null}

      {loading ? (
        <p className="text-gray-400">불러오는 중…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3">등급</th>
                <th className="px-4 py-3">솔루션</th>
                <th className="px-4 py-3">아이디</th>
                <th className="px-4 py-3">표시명</th>
                <th className="px-4 py-3">가입 / 상태</th>
                <th className="px-4 py-3">차단</th>
                <th className="px-4 py-3">마지막 로그인</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{userRoleLabelKo(r.role)}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-600">{r.platform?.slug ?? "—"}</span>
                    <span className="mt-0.5 block text-xs text-gray-400">{r.platform?.name ?? ""}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-800">{r.loginId}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.displayName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {new Date(r.createdAt).toLocaleString()}
                    <span className="mt-0.5 block text-gray-400">
                      {registrationStatusLabelKo(r.registrationStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.isBlocked ? <span className="text-red-600">차단</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <LastLoginCell at={r.lastLoginAt} ip={r.lastLoginIp} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-gray-400">표시할 행이 없습니다.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

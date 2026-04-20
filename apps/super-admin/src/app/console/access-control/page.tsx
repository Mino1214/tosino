"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type BlockedRow = {
  id: string;
  loginId: string;
  displayName: string | null;
  phone: string | null;
  platformId: string | null;
  platform: { id: string; slug: string; name: string } | null;
  blockedReason: string | null;
  blockedAt: string | null;
  blockedByLoginId: string | null;
};

type IpRow = {
  id: string;
  isGlobal: boolean;
  platformId: string | null;
  platform: { id: string; slug: string; name: string } | null;
  kind: "BLACKLIST" | "WHITELIST";
  cidr: string;
  note: string | null;
  createdAt: string;
};

export default function AccessControlPage() {
  const { platforms } = usePlatform();
  const [blocked, setBlocked] = useState<BlockedRow[]>([]);
  const [ipRules, setIpRules] = useState<IpRow[]>([]);
  const [loadingB, setLoadingB] = useState(true);
  const [loadingIp, setLoadingIp] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"blocked" | "ip">("blocked");

  const [ipKind, setIpKind] = useState<"BLACKLIST" | "WHITELIST">("BLACKLIST");
  const [ipGlobal, setIpGlobal] = useState(false);
  const [ipPlatformId, setIpPlatformId] = useState("");
  const [ipCidr, setIpCidr] = useState("");
  const [ipNote, setIpNote] = useState("");
  const [ipBusy, setIpBusy] = useState(false);
  const [ipMsg, setIpMsg] = useState<string | null>(null);

  const loadBlocked = useCallback(async () => {
    setLoadingB(true);
    try {
      const data = await apiFetch<BlockedRow[]>("/hq/blocked-users");
      setBlocked(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "차단 목록을 불러오지 못했습니다");
    } finally {
      setLoadingB(false);
    }
  }, []);

  const loadIp = useCallback(async () => {
    setLoadingIp(true);
    try {
      const data = await apiFetch<IpRow[]>("/hq/ip-access");
      setIpRules(data);
    } catch {
      setIpRules([]);
    } finally {
      setLoadingIp(false);
    }
  }, []);

  useEffect(() => {
    void loadBlocked();
    void loadIp();
  }, [loadBlocked, loadIp]);

  async function removeIpRule(id: string) {
    if (!confirm("이 IP 규칙을 삭제할까요?")) return;
    setIpMsg(null);
    try {
      await apiFetch(`/hq/ip-access/${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadIp();
    } catch (e) {
      setIpMsg(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  async function addIpRule() {
    setIpMsg(null);
    setIpBusy(true);
    try {
      await apiFetch("/hq/ip-access", {
        method: "POST",
        body: JSON.stringify({
          isGlobal: ipGlobal,
          platformId: ipGlobal ? null : ipPlatformId || null,
          kind: ipKind,
          cidr: ipCidr.trim(),
          note: ipNote.trim() || null,
        }),
      });
      setIpCidr("");
      setIpNote("");
      await loadIp();
    } catch (e) {
      setIpMsg(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setIpBusy(false);
    }
  }

  const blockedByPlatform = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of blocked) {
      const k = r.platform?.slug ?? "?";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [blocked]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3182f6]">HQ</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">차단 · IP 접근 목록</h1>
        <p className="mt-1 text-sm text-gray-500">
          회원 <strong className="font-medium text-gray-700">블랙리스트</strong>는 전 솔루션 집계입니다. 해제는 해당 솔루션 콘솔의 회원 관리에서 진행하세요.{" "}
          <strong className="font-medium text-gray-700">IP 화이트/블랙</strong> 규칙은 API·게이트웨이 연동 시 소비할 수 있도록 저장됩니다.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("blocked")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            tab === "blocked" ? "border-[#3182f6] text-[#3182f6]" : "border-transparent text-gray-500"
          }`}
        >
          차단 회원 ({blocked.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("ip")}
          className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
            tab === "ip" ? "border-[#3182f6] text-[#3182f6]" : "border-transparent text-gray-500"
          }`}
        >
          IP 화이트 · 블랙 ({ipRules.length})
        </button>
      </div>

      {err && tab === "blocked" ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{err}</p>
      ) : null}

      {tab === "blocked" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {Array.from(blockedByPlatform.entries()).map(([slug, n]) => (
              <span key={slug} className="rounded-full bg-gray-100 px-2 py-0.5 font-mono">
                {slug}: {n}
              </span>
            ))}
          </div>
          {loadingB ? (
            <p className="text-gray-400">불러오는 중…</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3">솔루션</th>
                    <th className="px-4 py-3">아이디</th>
                    <th className="px-4 py-3">연락처</th>
                    <th className="px-4 py-3">사유 / 일시</th>
                    <th className="px-4 py-3">처리자</th>
                  </tr>
                </thead>
                <tbody>
                  {blocked.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs">{r.platform?.slug ?? "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.loginId}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.phone ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">
                        {r.blockedReason ?? "—"}
                        <span className="mt-0.5 block text-gray-400">
                          {r.blockedAt ? new Date(r.blockedAt).toLocaleString() : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.blockedByLoginId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {blocked.length === 0 ? (
                <p className="py-10 text-center text-gray-400">차단된 회원이 없습니다.</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {tab === "ip" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-bold text-gray-900">규칙 추가</p>
            <p className="mt-1 text-xs text-gray-500">IPv4 또는 IPv4/CIDR (예: 203.0.113.10 또는 10.0.0.0/24)</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ipGlobal} onChange={(e) => setIpGlobal(e.target.checked)} />
                전역 (모든 솔루션)
              </label>
              {!ipGlobal && (
                <select
                  value={ipPlatformId}
                  onChange={(e) => setIpPlatformId(e.target.value)}
                  className="t-input text-sm"
                >
                  <option value="">솔루션 선택…</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={ipKind}
                onChange={(e) => setIpKind(e.target.value === "WHITELIST" ? "WHITELIST" : "BLACKLIST")}
                className="t-input text-sm"
              >
                <option value="BLACKLIST">블랙리스트</option>
                <option value="WHITELIST">화이트리스트</option>
              </select>
              <input
                type="text"
                value={ipCidr}
                onChange={(e) => setIpCidr(e.target.value)}
                placeholder="IP / CIDR"
                className="t-input min-w-[10rem] font-mono text-sm"
              />
              <input
                type="text"
                value={ipNote}
                onChange={(e) => setIpNote(e.target.value)}
                placeholder="메모 (선택)"
                className="t-input min-w-[8rem] text-sm"
              />
              <button type="button" disabled={ipBusy} onClick={() => void addIpRule()} className="t-btn-primary text-sm">
                {ipBusy ? "추가 중…" : "추가"}
              </button>
            </div>
            {ipMsg ? <p className="mt-2 text-sm text-red-600">{ipMsg}</p> : null}
          </div>

          {loadingIp ? (
            <p className="text-gray-400">불러오는 중…</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3">범위</th>
                    <th className="px-4 py-3">종류</th>
                    <th className="px-4 py-3">CIDR</th>
                    <th className="px-4 py-3">솔루션</th>
                    <th className="px-4 py-3">메모</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {ipRules.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="px-4 py-2.5">{r.isGlobal ? "전역" : "솔루션"}</td>
                      <td className="px-4 py-2.5">
                        {r.kind === "WHITELIST" ? (
                          <span className="text-emerald-600">화이트</span>
                        ) : (
                          <span className="text-red-600">블랙</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.cidr}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                        {r.platform?.slug ?? (r.isGlobal ? "—" : "?")}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.note ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => void removeIpRule(r.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ipRules.length === 0 ? (
                <p className="py-10 text-center text-gray-400">
                  등록된 IP 규칙이 없습니다. DB 마이그레이션(
                  <code className="font-mono">20260420180000_ip_access_rules</code>) 적용 후 사용하세요.
                </p>
              ) : null}
            </div>
          )}

          <p className="text-xs text-gray-400">
            솔루션별 회원 차단/해제는{" "}
            <Link href="/console/platforms" className="text-[#3182f6] hover:underline">
              솔루션 선택
            </Link>
            후 기존 운영 화면에서 처리할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { usePlatform } from "@/context/PlatformContext";

type IpEntry = {
  id: string;
  ip: string;
  type: "whitelist" | "blacklist";
  enabled: boolean;
  note?: string | null;
  createdAt: string;
  createdByLoginId?: string | null;
};

type ListType = "whitelist" | "blacklist";

const TYPE_LABEL: Record<ListType, string> = {
  whitelist: "화이트리스트",
  blacklist: "블랙리스트",
};

function dt(s: string) {
  return new Date(s).toLocaleString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BlockedIpsPage() {
  const router = useRouter();
  const { selectedPlatformId, loading: platformLoading } = usePlatform();

  const [activeTab, setActiveTab] = useState<ListType>("blacklist");
  const [entries, setEntries] = useState<IpEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 추가 폼
  const [newIp, setNewIp] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<IpEntry[]>(
        `/platforms/${selectedPlatformId}/ip-rules`,
      ).catch(() => [] as IpEntry[]);
      setEntries(data);
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

  const filtered = entries.filter((e) => e.type === activeTab);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatformId || !newIp.trim()) return;
    setAdding(true);
    setErr(null);
    try {
      await apiFetch(`/platforms/${selectedPlatformId}/ip-rules`, {
        method: "POST",
        body: JSON.stringify({
          ip: newIp.trim(),
          type: activeTab,
          enabled: true,
          note: newNote.trim() || undefined,
        }),
      });
      setMsg(`${newIp} 를 ${TYPE_LABEL[activeTab]}에 추가했습니다.`);
      setNewIp("");
      setNewNote("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "추가 실패. IP 룰 API 연동이 필요합니다.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleEnabled(entry: IpEntry) {
    if (!selectedPlatformId) return;
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/ip-rules/${entry.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: !entry.enabled }),
        },
      );
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, enabled: !e.enabled } : e,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "변경 실패");
    }
  }

  async function handleDelete(entry: IpEntry) {
    if (!selectedPlatformId) return;
    if (!confirm(`${entry.ip} 를 삭제하시겠습니까?`)) return;
    try {
      await apiFetch(
        `/platforms/${selectedPlatformId}/ip-rules/${entry.id}`,
        { method: "DELETE" },
      );
      setMsg(`${entry.ip} 삭제 완료`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  const whiteCount = entries.filter((e) => e.type === "whitelist").length;
  const blackCount = entries.filter((e) => e.type === "blacklist").length;
  const whiteEnabled = entries.filter(
    (e) => e.type === "whitelist" && e.enabled,
  ).length;
  const blackEnabled = entries.filter(
    (e) => e.type === "blacklist" && e.enabled,
  ).length;

  return (
    <div className="space-y-5 px-1">
      <div>
        <h1 className="text-xl font-bold text-black">차단 IP 관리</h1>
        <p className="mt-1 text-xs text-gray-500">
          화이트리스트 · 블랙리스트 IP 룰 · 사용 여부 개별 제어
        </p>
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

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            화이트리스트
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-emerald-700">
            {whiteCount}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">활성 {whiteEnabled}개</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
            블랙리스트
          </p>
          <p className="mt-2 text-2xl font-bold font-mono text-red-600">
            {blackCount}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">활성 {blackEnabled}개</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {(["blacklist", "whitelist"] as ListType[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === t
                ? "bg-[#3182f6]/10 text-[#3182f6]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* IP 추가 폼 */}
      <form
        onSubmit={(e) => void handleAdd(e)}
        className="flex items-end gap-2 flex-wrap"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            IP 주소 / CIDR
          </label>
          <input
            required
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="예: 192.168.1.1 또는 10.0.0.0/8"
            className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            메모 (선택)
          </label>
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="메모"
            className="w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
            activeTab === "blacklist"
              ? "bg-red-500 hover:bg-red-600"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {adding ? "추가 중…" : `${TYPE_LABEL[activeTab]}에 추가`}
        </button>
      </form>

      {/* IP 목록 */}
      {loading ? (
        <p className="py-6 text-sm text-gray-400">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-gray-400">
            {TYPE_LABEL[activeTab]}에 등록된 IP가 없습니다.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            IP 룰 API가 연동되면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                {["IP / CIDR", "사용 여부", "메모", "등록일", "등록자", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-3 py-2.5 font-mono text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {entry.ip}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => void toggleEnabled(entry)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        entry.enabled ? "bg-[#3182f6]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          entry.enabled ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`ml-2 text-xs font-medium ${entry.enabled ? "text-[#3182f6]" : "text-gray-400"}`}
                    >
                      {entry.enabled ? "사용" : "비사용"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[160px] truncate">
                    {entry.note || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {dt(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {entry.createdByLoginId || "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <button
                      onClick={() => void handleDelete(entry)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

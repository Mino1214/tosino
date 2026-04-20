"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";

type Row = {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  createdAt: string;
  userId: string;
  userLoginId: string;
  userEmail?: string | null;
  userDisplayName: string | null;
  vertical: string | null;
  gameType: string | null;
};

function typeKr(t: string) {
  switch (t) {
    case "BET": return "배팅";
    case "WIN": return "당첨";
    default: return t;
  }
}

function verticalLabel(v: string | null) {
  if (!v) return null;
  const u = v.toUpperCase();
  if (u.includes("CASINO") || u === "CASINO")
    return <span className="rounded bg-[#3182f6]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#3182f6]">카지노</span>;
  if (u === "SPORTS" || u.includes("SPORT"))
    return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700">스포츠</span>;
  if (u === "MINIGAME" || u.includes("MINI"))
    return <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-700">미니게임</span>;
  if (u === "SLOT")
    return <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">슬롯</span>;
  return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{v}</span>;
}

function defaultRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export default function AgentBettingPage() {
  const [from, setFrom] = useState(defaultRange().from);
  const [to, setTo] = useState(defaultRange().to);
  const [items, setItems] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterVertical, setFilterVertical] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [userQ, setUserQ] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      q.set("limit", "500");
      const res = await apiFetch<{ items: Row[] }>(`/me/agent/betting?${q}`);
      setItems(res.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (filterType !== "all" && r.type !== filterType) return false;
      if (filterVertical !== "all") {
        const v = (r.vertical ?? "").toUpperCase();
        if (filterVertical === "CASINO" && !v.includes("CASINO")) return false;
        if (filterVertical === "SPORTS" && !v.includes("SPORT")) return false;
        if (filterVertical === "MINIGAME" && !v.includes("MINI") && v !== "MINIGAME") return false;
        if (filterVertical === "SLOT" && v !== "SLOT") return false;
        if (filterVertical === "UNKNOWN" && v !== "" && v !== "UNKNOWN") return false;
      }
      if (userQ.trim()) {
        const t = userQ.trim().toLowerCase();
        if (!r.userLoginId.toLowerCase().includes(t) && !(r.userDisplayName?.toLowerCase().includes(t) ?? false)) return false;
      }
      return true;
    });
  }, [items, filterType, filterVertical, userQ]);

  /* 요약 통계 */
  const summary = useMemo(() => {
    const byVertical: Record<string, { bet: number; win: number; count: number }> = {};
    for (const r of filtered) {
      const v = r.vertical ? r.vertical.toUpperCase() : "UNKNOWN";
      const norm = v.includes("CASINO") ? "CASINO" : v.includes("SPORT") ? "SPORTS" : v.includes("MINI") ? "MINIGAME" : v === "SLOT" ? "SLOT" : "UNKNOWN";
      if (!byVertical[norm]) byVertical[norm] = { bet: 0, win: 0, count: 0 };
      const amt = Number(r.amount ?? 0);
      if (r.type === "BET") { byVertical[norm].bet += Math.abs(amt); byVertical[norm].count++; }
      if (r.type === "WIN") byVertical[norm].win += amt;
    }
    return byVertical;
  }, [filtered]);

  const totalBet = Object.values(summary).reduce((s, v) => s + v.bet, 0);
  const totalWin = Object.values(summary).reduce((s, v) => s + v.win, 0);

  if (!getAccessToken()) return null;

  const VERTICAL_OPTS = [
    { value: "all", label: "전체 게임" },
    { value: "CASINO", label: "카지노" },
    { value: "SPORTS", label: "스포츠" },
    { value: "MINIGAME", label: "미니게임" },
    { value: "SLOT", label: "슬롯" },
    { value: "UNKNOWN", label: "기타" },
  ];

  const VERTICAL_INFO: Record<string, { label: string; color: string }> = {
    CASINO: { label: "🎰 카지노", color: "text-[#3182f6]" },
    SPORTS: { label: "⚽ 스포츠", color: "text-emerald-700" },
    MINIGAME: { label: "🎮 미니게임", color: "text-violet-700" },
    SLOT: { label: "🎯 슬롯", color: "text-amber-700" },
    UNKNOWN: { label: "기타", color: "text-gray-600" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-bold text-black">배팅 내역</h1>
        <p className="mt-1 text-[14px] text-gray-600">하위 회원의 BET / WIN 원장 · 게임 종류별 구분</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <label className="block text-[13px] font-medium text-gray-700">
          시작
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        <label className="block text-[13px] font-medium text-gray-700">
          종료
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900" />
        </label>
        <label className="block text-[13px] font-medium text-gray-700">
          게임
          <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900">
            {VERTICAL_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="block text-[13px] font-medium text-gray-700">
          유형
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900">
            <option value="all">전체</option>
            <option value="BET">배팅</option>
            <option value="WIN">당첨</option>
          </select>
        </label>
        <input type="search" value={userQ} onChange={(e) => setUserQ(e.target.value)}
          placeholder="회원 검색"
          className="rounded-lg border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-[14px] text-gray-900 placeholder:text-gray-400" />
        <button type="button" onClick={() => void load()} disabled={loading}
          className="rounded-lg bg-[#3182f6] px-5 py-1.5 text-[14px] font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition">
          {loading ? "조회 중…" : "조회"}
        </button>
      </div>

      {err && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}

      {/* 게임별 요약 */}
      {!loading && Object.keys(summary).length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(summary).map(([vk, s]) => {
            const info = VERTICAL_INFO[vk] ?? { label: vk, color: "text-gray-700" };
            const ggr = s.bet - s.win;
            return (
              <div key={vk} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className={`text-[13px] font-bold ${info.color}`}>{info.label}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">배팅</span>
                    <span className="font-mono font-semibold text-gray-900">{s.bet.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-500">당첨</span>
                    <span className="font-mono font-semibold text-gray-900">{s.win.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1 text-[13px]">
                    <span className="font-bold text-gray-700">GGR</span>
                    <span className={`font-mono font-bold ${ggr >= 0 ? "text-[#3182f6]" : "text-red-500"}`}>
                      {ggr.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {/* 합계 */}
          <div className="rounded-xl border-2 border-[#3182f6]/20 bg-[#3182f6]/5 p-4">
            <p className="text-[13px] font-bold text-[#3182f6]">전체 합계</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">총 배팅</span>
                <span className="font-mono font-semibold text-gray-900">{totalBet.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-gray-500">총 당첨</span>
                <span className="font-mono font-semibold text-gray-900">{totalWin.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between border-t border-[#3182f6]/20 pt-1 text-[13px]">
                <span className="font-bold text-gray-700">총 GGR</span>
                <span className={`font-mono font-bold ${totalBet - totalWin >= 0 ? "text-[#3182f6]" : "text-red-500"}`}>
                  {(totalBet - totalWin).toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-[14px] text-gray-500">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-gray-500">내역이 없습니다.</p>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3 flex items-center justify-between">
            <p className="text-[14px] font-bold text-black">배팅 내역 <span className="font-normal text-gray-500">({filtered.length}건)</span></p>
            {items.length >= 500 && (
              <p className="text-[12px] text-gray-500">최대 500건 표시</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">일시</th>
                  <th className="px-4 py-3">회원</th>
                  <th className="px-4 py-3">게임</th>
                  <th className="px-4 py-3">종목</th>
                  <th className="px-4 py-3">유형</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3 text-right">잔액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-600">
                      {new Date(r.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-[13px] font-semibold text-black">{r.userLoginId}</p>
                      {r.userDisplayName && <p className="text-[12px] text-gray-500">{r.userDisplayName}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {verticalLabel(r.vertical) ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{r.gameType ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${r.type === "WIN" ? "text-[#3182f6]" : "text-gray-800"}`}>
                        {typeKr(r.type)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${r.type === "WIN" ? "text-[#3182f6]" : "text-gray-800"}`}>
                      {Number(r.amount).toLocaleString("ko-KR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] text-gray-500">
                      {Number(r.balanceAfter).toLocaleString("ko-KR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

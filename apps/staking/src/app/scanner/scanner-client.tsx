"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, ShieldCheck, Search, Filter } from "lucide-react";
import { STAKING_OPTIONS, type StakingOption } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Category = StakingOption["category"] | "전체";
type SortKey = "apy" | "platform" | "coin";

const CATEGORIES: Category[] = ["전체", "거래소", "DeFi", "지갑"];

export function ScannerClient() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("전체");
  const [sortKey, setSortKey] = useState<SortKey>("apy");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const lower = search.trim().toLowerCase();
    let list = STAKING_OPTIONS.filter((o) => {
      const matchSearch =
        !lower ||
        o.coin.toLowerCase().includes(lower) ||
        o.coinName.toLowerCase().includes(lower) ||
        o.platform.toLowerCase().includes(lower);
      const matchCat = category === "전체" || o.category === category;
      return matchSearch && matchCat;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "apy") cmp = a.apy - b.apy;
      else if (sortKey === "platform") cmp = a.platform.localeCompare(b.platform);
      else cmp = a.coin.localeCompare(b.coin);
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [search, category, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((v) => !v);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  const stats = useMemo(() => {
    const apys = filtered.map((o) => o.apy);
    const max = apys.length ? Math.max(...apys) : 0;
    const avg = apys.length ? apys.reduce((a, b) => a + b, 0) / apys.length : 0;
    return { count: filtered.length, max, avg };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="검색 결과" value={`${stats.count}개`} />
        <SummaryCard
          label="최고 APY"
          value={`${stats.max.toFixed(2)}%`}
          accent
        />
        <SummaryCard label="평균 APY" value={`${stats.avg.toFixed(2)}%`} />
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="코인 또는 플랫폼 검색 (예: ETH, Lido)"
              className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Filter className="h-4 w-4 shrink-0 text-muted" />
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                  category === c
                    ? "bg-foreground text-white"
                    : "bg-black/5 text-foreground/70 hover:bg-black/10",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/5 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.025] text-xs uppercase tracking-wider text-muted">
              <tr>
                <Th sortable onClick={() => toggleSort("coin")}>코인</Th>
                <Th sortable onClick={() => toggleSort("platform")}>플랫폼</Th>
                <Th>카테고리</Th>
                <Th sortable onClick={() => toggleSort("apy")}>APY</Th>
                <Th>락업</Th>
                <Th className="hidden md:table-cell">최소 스테이킹</Th>
                <Th className="hidden lg:table-cell">보상 토큰</Th>
                <Th className="hidden md:table-cell">검증</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-black/5 transition hover:bg-orange-50/50"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-white">
                        {o.coin.slice(0, 3)}
                      </div>
                      <div>
                        <p className="font-semibold">{o.coin}</p>
                        <p className="text-[11px] text-muted">{o.coinName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-medium">{o.platform}</td>
                  <td className="px-4 py-4">
                    <CategoryBadge cat={o.category} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-base font-bold text-accent-strong">
                      {o.apy.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted">{o.lockup}</td>
                  <td className="hidden px-4 py-4 font-mono text-muted md:table-cell">
                    {o.minStake} {o.coin}
                  </td>
                  <td className="hidden px-4 py-4 text-muted lg:table-cell">
                    {o.payoutToken}
                  </td>
                  <td className="hidden px-4 py-4 md:table-cell">
                    {o.audited && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                        <ShieldCheck className="h-3 w-3" />
                        감사
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted">
                    조건에 맞는 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
  sortable,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  onClick?: () => void;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-semibold",
        sortable && "cursor-pointer select-none hover:text-foreground",
        className,
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && <ArrowDownUp className="h-3 w-3 opacity-60" />}
      </span>
    </th>
  );
}

function CategoryBadge({ cat }: { cat: StakingOption["category"] }) {
  const map: Record<StakingOption["category"], string> = {
    거래소: "bg-amber-100 text-amber-700",
    DeFi: "bg-violet-100 text-violet-700",
    지갑: "bg-sky-100 text-sky-700",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
        map[cat],
      )}
    >
      {cat}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-3xl font-extrabold tracking-tight",
          accent && "text-accent-strong",
        )}
      >
        {value}
      </p>
    </div>
  );
}

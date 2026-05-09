"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { LST_PRODUCTS, type LstProduct } from "@/lib/staking-assets";
import { cn } from "@/lib/utils";

interface NetworkGroup {
  network: string;
  networkIcon?: string;
  color: string;
  products: LstProduct[];
}

const NETWORK_GROUPS: NetworkGroup[] = (() => {
  const map = new Map<string, NetworkGroup>();
  for (const product of LST_PRODUCTS) {
    const existing = map.get(product.network);
    if (!existing) {
      map.set(product.network, {
        network: product.network,
        networkIcon: product.networkIcon,
        color: product.color,
        products: [product],
      });
    } else {
      existing.products.push(product);
    }
  }
  return Array.from(map.values());
})();

export function ScannerClient() {
  const [search, setSearch] = useState("");
  const [activeNetwork, setActiveNetwork] = useState<string>("ALL");

  const filteredGroups = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return NETWORK_GROUPS.map((group) => {
      const products = group.products.filter((product) => {
        if (!lower) return true;
        return (
          product.sourceSymbol.toLowerCase().includes(lower) ||
          product.sourceName.toLowerCase().includes(lower) ||
          product.receiptSymbol.toLowerCase().includes(lower) ||
          product.platform.toLowerCase().includes(lower) ||
          group.network.toLowerCase().includes(lower)
        );
      });
      return { ...group, products };
    }).filter((group) => {
      if (activeNetwork !== "ALL" && group.network !== activeNetwork) return false;
      return group.products.length > 0;
    });
  }, [search, activeNetwork]);

  const stats = useMemo(() => {
    const networks = filteredGroups.length;
    const tokens = filteredGroups.reduce(
      (sum, group) => sum + group.products.length,
      0,
    );
    const apys = filteredGroups
      .flatMap((group) => group.products)
      .map((product) => product.estimatedApy)
      .filter((apy): apy is number => typeof apy === "number");
    const max = apys.length ? Math.max(...apys) : 0;
    const avg = apys.length ? apys.reduce((a, b) => a + b, 0) / apys.length : 0;
    return { networks, tokens, max, avg };
  }, [filteredGroups]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="네트워크" value={`${stats.networks}개`} />
        <SummaryCard label="LST 수" value={`${stats.tokens}개`} />
        <SummaryCard
          label="최고 예상 APY"
          value={`${stats.max.toFixed(2)}%`}
          accent
        />
        <SummaryCard label="평균 예상 APY" value={`${stats.avg.toFixed(2)}%`} />
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="토큰, 네트워크 검색 (예: USDT, Polygon)"
              className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <NetworkPill
            label="모든 네트워크"
            active={activeNetwork === "ALL"}
            onClick={() => setActiveNetwork("ALL")}
          />
          {NETWORK_GROUPS.map((group) => (
            <NetworkPill
              key={group.network}
              label={group.network}
              active={activeNetwork === group.network}
              onClick={() => setActiveNetwork(group.network)}
              icon={group.networkIcon}
            />
          ))}
        </div>
      </div>

      <div className="space-y-5">
        {filteredGroups.length === 0 ? (
          <div className="rounded-3xl border border-black/5 bg-white p-12 text-center text-sm text-muted">
            검색 결과가 없습니다.
          </div>
        ) : (
          filteredGroups.map((group) => (
            <section
              key={group.network}
              className="rounded-3xl border border-black/5 bg-white p-5"
            >
              <header className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <NetworkLogo
                    icon={group.networkIcon}
                    label={group.network}
                    color={group.color}
                  />
                  <div>
                    <h2 className="text-base font-extrabold text-foreground">
                      {group.network}
                    </h2>
                    <p className="text-[11px] font-semibold text-muted">
                      {group.products.length}개 LST
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[11px] font-bold text-foreground/65">
                  {averageApy(group.products).toFixed(2)}% 평균
                </span>
              </header>

              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {group.products.map((product) => (
                  <li
                    key={`${product.network}-${product.receiptSymbol}`}
                    className="rounded-2xl border border-black/5 bg-white p-3 transition hover:border-accent-strong/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <TokenAvatar
                        icon={product.sourceIcon ?? product.receiptIcon}
                        symbol={product.sourceSymbol}
                        color={product.color}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1 text-sm font-extrabold text-foreground">
                          <span>{product.sourceSymbol}</span>
                          <span className="text-muted">→</span>
                          <span>{product.receiptSymbol}</span>
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          {product.platform}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-extrabold text-emerald-700">
                        {product.estimatedApy.toFixed(2)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function NetworkPill({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
        active
          ? "bg-accent-strong text-white shadow-sm"
          : "bg-black/[0.04] text-foreground/65 hover:bg-black/[0.08]",
      )}
    >
      {icon && (
        <Image
          src={icon}
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 shrink-0 rounded-full object-contain"
        />
      )}
      {label}
    </button>
  );
}

function NetworkLogo({
  icon,
  label,
  color,
}: {
  icon?: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white"
      style={{ color }}
    >
      {icon ? (
        <Image
          src={icon}
          alt={`${label} logo`}
          width={36}
          height={36}
          className="h-full w-full object-contain p-1.5"
        />
      ) : (
        <span className="text-[10px] font-extrabold">{label.slice(0, 2)}</span>
      )}
    </div>
  );
}

function TokenAvatar({
  icon,
  symbol,
  color,
}: {
  icon?: string;
  symbol: string;
  color: string;
}) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white"
      style={{ color }}
    >
      {icon ? (
        <Image
          src={icon}
          alt={`${symbol} logo`}
          width={32}
          height={32}
          className="h-full w-full object-contain p-1"
        />
      ) : (
        <span className="text-[10px] font-extrabold">{symbol.slice(0, 3)}</span>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white p-4",
        accent && "ring-1 ring-accent-strong/30",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-2xl font-extrabold tracking-tight",
          accent ? "text-accent-strong" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function averageApy(products: LstProduct[]) {
  if (products.length === 0) return 0;
  const total = products.reduce((sum, product) => sum + product.estimatedApy, 0);
  return total / products.length;
}

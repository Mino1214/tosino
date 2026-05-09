"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import {
  BOT_STRATEGIES,
  TRADING_BOTS,
  type BotStrategyKey,
  type TradingBot,
} from "@/lib/trading-bots-mock";
import { cn } from "@/lib/utils";
import { BotDetailModal } from "./bot-detail-modal";

type SortKey = "roi" | "copies" | "runtime";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "roi", label: "7D ROI" },
  { key: "copies", label: "복사 수" },
  { key: "runtime", label: "런타임" },
];

const PROFIT_GREEN = "#16a34a";
const LOSS_RED = "#dc2626";

export function BotsClient() {
  const [activeStrategy, setActiveStrategy] = useState<BotStrategyKey>(
    "futures-grid",
  );
  const [sortKey, setSortKey] = useState<SortKey>("roi");
  const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);

  const filtered = useMemo(() => {
    const list = TRADING_BOTS.filter((bot) => bot.strategy === activeStrategy);
    return [...list].sort((a, b) => {
      if (sortKey === "roi") return b.roi7d - a.roi7d;
      if (sortKey === "copies") return b.copies - a.copies;
      return b.matchedTotal - a.matchedTotal;
    });
  }, [activeStrategy, sortKey]);

  const stats = useMemo(() => {
    const totalRoi = filtered.reduce((sum, bot) => sum + bot.roi7d, 0);
    const avgRoi = filtered.length ? totalRoi / filtered.length : 0;
    const topRoi = filtered.length
      ? Math.max(...filtered.map((bot) => bot.roi7d))
      : 0;
    const totalCopies = filtered.reduce((sum, bot) => sum + bot.copies, 0);
    return { count: filtered.length, avgRoi, topRoi, totalCopies };
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="활성 봇" value={`${stats.count}개`} />
        <SummaryCard
          label="평균 7D ROI"
          value={`${stats.avgRoi.toFixed(2)}%`}
        />
        <SummaryCard
          label="최고 7D ROI"
          value={`${stats.topRoi.toFixed(2)}%`}
          accent
        />
        <SummaryCard
          label="누적 복사 수"
          value={stats.totalCopies.toLocaleString()}
        />
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {BOT_STRATEGIES.map((strategy) => {
              const active = strategy.key === activeStrategy;
              return (
                <button
                  key={strategy.key}
                  type="button"
                  onClick={() => setActiveStrategy(strategy.key)}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-accent-strong text-white shadow-sm"
                      : "bg-black/5 text-foreground/70 hover:bg-black/10",
                  )}
                >
                  {strategy.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDownUp className="h-3.5 w-3.5 shrink-0 text-muted" />
            {SORT_OPTIONS.map((option) => {
              const active = option.key === sortKey;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSortKey(option.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                    active
                      ? "bg-foreground text-white"
                      : "bg-black/5 text-foreground/65 hover:bg-black/10",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-3 text-[11px] text-muted">
          {BOT_STRATEGIES.find((s) => s.key === activeStrategy)?.description}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((bot) => (
          <BotCard
            key={bot.id}
            bot={bot}
            onClick={() => setSelectedBot(bot)}
          />
        ))}
      </div>

      {selectedBot && (
        <BotDetailModal
          bot={selectedBot}
          onClose={() => setSelectedBot(null)}
        />
      )}
    </div>
  );
}

function BotCard({
  bot,
  onClick,
}: {
  bot: TradingBot;
  onClick: () => void;
}) {
  const positive = bot.roi7d >= 0;
  const directionTone =
    bot.direction === "Long"
      ? "text-emerald-600"
      : bot.direction === "Short"
        ? "text-red-600"
        : "text-foreground/70";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-accent-strong/40 hover:shadow-[0_18px_38px_-22px_rgba(255,107,72,0.55)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white"
              style={{ backgroundColor: bot.symbolColor }}
            >
              {bot.pair[0]}
            </span>
            <span className="truncate text-sm font-extrabold text-foreground">
              {bot.pair}
            </span>
            {bot.isFutures && (
              <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[9px] font-bold text-foreground/60">
                Perp
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold">
            <span className={directionTone}>
              {bot.direction}
              {bot.leverage ? ` ${bot.leverage}x` : ""}
            </span>
            {bot.trailing && (
              <span className="text-foreground/50">· Trailing</span>
            )}
            <span className="text-foreground/50">
              · {bot.numberOfGrids}grid
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold text-foreground/60">
          <Users className="h-3 w-3" />
          {bot.copies.toLocaleString()}
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted">
              7D ROI
            </div>
            <div
              className={cn(
                "font-mono text-2xl font-extrabold tracking-tight",
                positive ? "text-emerald-600" : "text-red-600",
              )}
            >
              {positive ? "+" : ""}
              {bot.roi7d.toFixed(2)}%
            </div>
          </div>
          <div className="text-right text-[11px] font-semibold">
            <div className="text-muted">PNL</div>
            <div
              className={cn(
                "font-mono",
                positive ? "text-emerald-600" : "text-red-600",
              )}
            >
              {positive ? "+" : "-"}${Math.abs(bot.pnl7d).toFixed(2)}
            </div>
          </div>
        </div>
        <div className="mt-2 h-[64px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={bot.series}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`gradient-${bot.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={positive ? PROFIT_GREEN : LOSS_RED}
                    stopOpacity={0.32}
                  />
                  <stop
                    offset="100%"
                    stopColor={positive ? PROFIT_GREEN : LOSS_RED}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <YAxis hide domain={["auto", "auto"]} />
              <Area
                type="monotone"
                dataKey="roi"
                stroke={positive ? PROFIT_GREEN : LOSS_RED}
                strokeWidth={1.5}
                fill={`url(#gradient-${bot.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-black/5 pt-3">
        <div className="flex flex-col text-[10px] text-muted">
          <span className="font-bold uppercase tracking-widest">현재가</span>
          <span className="font-mono text-[12px] font-extrabold text-foreground">
            {bot.price.toLocaleString(undefined, {
              minimumFractionDigits: bot.price < 10 ? 4 : 2,
              maximumFractionDigits: bot.price < 10 ? 4 : 2,
            })}
          </span>
        </div>
        <div
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            bot.priceChange24h >= 0
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700",
          )}
        >
          {bot.priceChange24h >= 0 ? "+" : ""}
          {bot.priceChange24h.toFixed(2)}%
        </div>
        <span className="rounded-full bg-accent-strong/10 px-3 py-1 text-[11px] font-extrabold text-accent-strong transition group-hover:bg-accent-strong group-hover:text-white">
          복사하기 →
        </span>
      </div>
    </button>
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

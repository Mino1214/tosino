"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Info,
  Share2,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import type { TradingBot } from "@/lib/trading-bots-mock";
import { cn } from "@/lib/utils";

const PROFIT_GREEN = "#16a34a";
const LOSS_RED = "#dc2626";

type HistoryTab = "ROI" | "PNL";
type SizePercent = 0 | 25 | 50 | 75 | 100;

interface BotDetailModalProps {
  bot: TradingBot;
  onClose: () => void;
}

export function BotDetailModal({ bot, onClose }: BotDetailModalProps) {
  const [historyTab, setHistoryTab] = useState<HistoryTab>("ROI");
  const [investment, setInvestment] = useState<string>("");
  const [sizePct, setSizePct] = useState<SizePercent>(0);
  const [autoMargin, setAutoMargin] = useState(false);
  const [trailingUpEnabled, setTrailingUpEnabled] = useState(true);
  const [trailingDownEnabled, setTrailingDownEnabled] = useState(true);
  const [gridTrigger, setGridTrigger] = useState(false);
  const [tpsl, setTpsl] = useState(false);
  const [openOnCreate] = useState(true);
  const [closeOnStop, setCloseOnStop] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(true);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const chartData = useMemo(
    () =>
      bot.series.map((point) => ({
        index: point.index,
        value: historyTab === "ROI" ? point.roi : point.pnl,
      })),
    [bot.series, historyTab],
  );

  const headerValue = historyTab === "ROI" ? bot.roi7d : bot.pnl7d;
  const headerPositive = headerValue >= 0;
  const investmentNum = Number(investment) || 0;
  const total = investmentNum * (bot.leverage ?? 1);
  const qtyPerOrder = bot.numberOfGrids
    ? total / bot.numberOfGrids
    : 0;
  const liquidationEstimate =
    bot.isFutures && bot.leverage && investmentNum > 0
      ? bot.priceRange[0] * (1 - 1 / bot.leverage / 2)
      : null;

  function applySize(pct: SizePercent) {
    setSizePct(pct);
    if (pct === 0) {
      setInvestment("");
      return;
    }
    const baseTarget = Math.max(bot.minInvestment, 1000);
    const next = Math.round(baseTarget * (pct / 100));
    setInvestment(String(next));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${bot.pair} 봇 상세`}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 px-3 pb-3 pt-12 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-black/5 px-5 pb-4 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-base font-extrabold tracking-tight text-foreground">
                {bot.pair}
              </span>
              {bot.isFutures && (
                <span className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-foreground/70">
                  Perp
                </span>
              )}
              <span className="font-mono text-[13px] font-extrabold text-red-600">
                {bot.price.toLocaleString(undefined, {
                  minimumFractionDigits: bot.price < 10 ? 4 : 2,
                  maximumFractionDigits: bot.price < 10 ? 4 : 2,
                })}
              </span>
              <span
                className={cn(
                  "text-[12px] font-bold",
                  bot.priceChange24h >= 0 ? "text-emerald-600" : "text-red-600",
                )}
              >
                {bot.priceChange24h >= 0 ? "+" : ""}
                {bot.priceChange24h.toFixed(2)}%
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground/65">
              <span>
                {bot.strategy === "futures-grid"
                  ? "Futures Grid"
                  : bot.strategy === "spot-grid"
                    ? "Spot Grid"
                    : bot.strategy === "dca"
                      ? "DCA"
                      : bot.strategy === "rebalancing"
                        ? "Rebalancing"
                        : "Auto-Invest"}
              </span>
              <span className="text-foreground/30">·</span>
              <span
                className={cn(
                  "font-bold",
                  bot.direction === "Long"
                    ? "text-emerald-600"
                    : bot.direction === "Short"
                      ? "text-red-600"
                      : "text-foreground/65",
                )}
              >
                {bot.direction}
                {bot.leverage ? ` ${bot.leverage}x` : ""}
              </span>
              {bot.trailing && (
                <>
                  <span className="text-foreground/30">·</span>
                  <span>Trailing</span>
                </>
              )}
              <span className="text-foreground/30">·</span>
              <span className="inline-flex items-center gap-1 text-foreground/65">
                <Users className="h-3 w-3" />
                {bot.copies.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-label="공유"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/55 transition hover:bg-black/5 hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground/55 transition hover:bg-black/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="px-5 pt-3">
          <p className="flex items-start gap-1.5 text-[11px] text-muted">
            <span className="mt-0.5 text-accent-strong">*</span>
            <span>
              공유된 파라미터입니다. 시장 상황에 따라 결과가 달라질 수 있습니다.
            </span>
          </p>
        </div>

        <div className="grid max-h-[68vh] grid-cols-1 gap-4 overflow-y-auto px-5 pb-[88px] pt-3 sm:grid-cols-2">
          <section className="space-y-4">
            <div className="rounded-2xl border border-black/5 p-3">
              <div className="text-[12px] font-extrabold text-foreground">
                Historical Profits
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="inline-flex rounded-full bg-black/[0.05] p-0.5">
                  {(["ROI", "PNL"] as HistoryTab[]).map((tab) => {
                    const active = tab === historyTab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setHistoryTab(tab)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                          active
                            ? "bg-white text-foreground shadow-sm"
                            : "text-foreground/55",
                        )}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>
                <span
                  className={cn(
                    "font-mono text-[13px] font-extrabold",
                    headerPositive ? "text-emerald-600" : "text-red-600",
                  )}
                >
                  {headerPositive ? "+" : ""}
                  {historyTab === "ROI"
                    ? `${headerValue.toFixed(2)}%`
                    : `$${headerValue.toFixed(2)}`}
                </span>
              </div>
              <div className="mt-2 h-[128px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={`detail-gradient-${bot.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={headerPositive ? PROFIT_GREEN : LOSS_RED}
                          stopOpacity={0.28}
                        />
                        <stop
                          offset="100%"
                          stopColor={headerPositive ? PROFIT_GREEN : LOSS_RED}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={["auto", "auto"]} />
                    <ReferenceLine
                      y={0}
                      stroke="rgba(10,10,10,0.18)"
                      strokeDasharray="2 3"
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={headerPositive ? PROFIT_GREEN : LOSS_RED}
                      strokeWidth={1.5}
                      fill={`url(#detail-gradient-${bot.id})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 p-3">
              <div className="text-[12px] font-extrabold text-foreground">
                Basic Info
              </div>
              <dl className="mt-2 space-y-1.5 text-[11px]">
                <Row label="Runtime" value={bot.runtime} />
                <Row
                  label="Direction"
                  value={
                    <span
                      className={cn(
                        "font-bold",
                        bot.direction === "Long"
                          ? "text-emerald-600"
                          : bot.direction === "Short"
                            ? "text-red-600"
                            : "text-foreground/70",
                      )}
                    >
                      {bot.direction}
                    </span>
                  }
                />
                <Row
                  label="24H/Total Matched Trades"
                  value={`${bot.matched24h}/${bot.matchedTotal}`}
                />
                <Row label="7D MDD" value={`${bot.mdd7d.toFixed(2)}%`} />
                <Row
                  label="Price Range(USDT)"
                  value={`${bot.priceRange[0].toLocaleString()} - ${bot.priceRange[1].toLocaleString()}`}
                />
                <Row
                  label="Number of Grids / Mode"
                  value={`${bot.numberOfGrids} / ${bot.gridMode}`}
                />
                <Row
                  label={
                    <span className="inline-flex items-center gap-1">
                      Profit/grid
                      <Info className="h-3 w-3 text-foreground/40" />
                    </span>
                  }
                  value={`${bot.profitPerGridRange[0].toFixed(2)}% - ${bot.profitPerGridRange[1].toFixed(2)}%`}
                />
              </dl>
              <button
                type="button"
                className="mt-3 text-[12px] font-extrabold text-accent-strong transition hover:underline"
              >
                Customize Parameters
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <label
                htmlFor="bot-investment"
                className="block text-[12px] font-extrabold text-foreground"
              >
                Investment
              </label>
              <div className="mt-1 flex items-stretch overflow-hidden rounded-xl border border-black/10 focus-within:border-accent-strong/60 focus-within:ring-2 focus-within:ring-accent-strong/20">
                <input
                  id="bot-investment"
                  type="number"
                  step="0.01"
                  value={investment}
                  onChange={(event) => {
                    setInvestment(event.target.value);
                    setSizePct(0);
                  }}
                  placeholder={`≥ ${bot.minInvestment.toFixed(2)} USDT`}
                  className="w-full bg-white px-3 py-2 text-[13px] outline-none"
                />
                {bot.leverage && (
                  <div className="flex items-center gap-1 border-l border-black/10 px-2.5 text-[12px] font-extrabold text-foreground/75">
                    {bot.leverage}x
                    <ChevronDown className="h-3.5 w-3.5 text-foreground/45" />
                  </div>
                )}
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-1.5">
                {([0, 25, 50, 75, 100] as SizePercent[]).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applySize(pct)}
                    className={cn(
                      "h-6 flex-1 rounded-full text-[10px] font-bold transition-colors",
                      sizePct === pct
                        ? "bg-accent-strong text-white"
                        : "bg-black/5 text-foreground/60 hover:bg-black/10",
                    )}
                  >
                    {pct === 0 ? "−" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>

            <CheckboxRow
              checked={autoMargin}
              onChange={setAutoMargin}
              label="Auto-Add Margin on Bracket Change"
            />

            <dl className="space-y-1.5 text-[11px]">
              <Row label="Available" value={`${investmentNum.toFixed(2)} USDT`} />
              {bot.isFutures && (
                <Row
                  label="Est. Liq. Price (Long)"
                  value={
                    liquidationEstimate
                      ? liquidationEstimate.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : "--"
                  }
                />
              )}
              <Row
                label="Qty/Order"
                value={`${qtyPerOrder.toFixed(3)} USDT`}
              />
              <Row
                label="Total Investment"
                value={`${total.toFixed(2)} USDT`}
              />
              {bot.isFutures && <Row label="Margin Mode" value="Cross" />}
            </dl>

            <div className="rounded-2xl border border-black/5">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left"
              >
                <span className="text-[12px] font-extrabold text-foreground">
                  Advanced (Optional)
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-foreground/55 transition-transform duration-200",
                    advancedOpen && "rotate-180",
                  )}
                />
              </button>
              {advancedOpen && (
                <div className="space-y-3 border-t border-black/5 px-3 py-3">
                  {bot.isFutures && (
                    <div>
                      <CheckboxRow
                        checked={trailingUpEnabled}
                        onChange={setTrailingUpEnabled}
                        label={`Trailing Up(${bot.priceRange[1].toLocaleString()} - 0.00)`}
                      />
                      <input
                        type="number"
                        step="0.01"
                        defaultValue=""
                        placeholder="Trailing Up Limit"
                        disabled={!trailingUpEnabled}
                        className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-accent-strong/60 disabled:bg-black/[0.04] disabled:text-foreground/45"
                      />
                    </div>
                  )}
                  {bot.isFutures && (
                    <div>
                      <CheckboxRow
                        checked={trailingDownEnabled}
                        onChange={setTrailingDownEnabled}
                        label={`Trailing Down(${(bot.priceRange[0] * 0.02).toFixed(2)} - ${bot.priceRange[0].toLocaleString()})`}
                      />
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={(bot.priceRange[0] * 0.02).toFixed(2)}
                        disabled={!trailingDownEnabled}
                        className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-accent-strong/60 disabled:bg-black/[0.04] disabled:text-foreground/45"
                      />
                      <div className="mt-1.5 flex items-start gap-1.5 rounded-xl bg-black/[0.04] p-2 text-[10px] text-foreground/65">
                        <Info className="mt-0.5 h-3 w-3 shrink-0 text-foreground/45" />
                        <span>
                          지속 하락장에서 long grid의 Trailing Down은 short
                          포지션을 만들 수 있습니다.
                        </span>
                      </div>
                    </div>
                  )}
                  <CheckboxRow
                    checked={gridTrigger}
                    onChange={setGridTrigger}
                    label="Grid Trigger"
                  />
                  <CheckboxRow
                    checked={tpsl}
                    onChange={setTpsl}
                    label="TP/SL"
                  />
                </div>
              )}
            </div>

            <CheckboxRow
              checked={openOnCreate}
              disabled
              onChange={() => undefined}
              label="Open a position on creation"
            />
            <CheckboxRow
              checked={closeOnStop}
              onChange={setCloseOnStop}
              label="Close all positions on stop"
            />
          </section>
        </div>

        <footer className="absolute bottom-0 left-0 right-0 border-t border-black/5 bg-white/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-end gap-2">
            <Link
              href="/login"
              className="inline-flex h-10 min-w-[140px] items-center justify-center rounded-full bg-accent-strong px-5 text-[13px] font-extrabold text-white shadow-sm transition hover:scale-[1.02]"
            >
              로그인 후 시작
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-foreground/55">{label}</dt>
      <dd className="font-mono font-extrabold text-foreground">{value}</dd>
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-2 text-left text-[11px] font-bold",
        disabled
          ? "cursor-default text-foreground/55"
          : "text-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          checked
            ? "border-accent-strong bg-accent-strong text-white"
            : "border-foreground/25 bg-white text-transparent",
          disabled && "border-foreground/20 bg-black/[0.04] text-white",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M22.032 5.236a1.25 1.25 0 010 1.768L10.701 18.336a1.75 1.75 0 01-2.475 0l-5.773-5.774a1.25 1.25 0 011.768-1.767l5.243 5.242 10.8-10.8a1.25 1.25 0 011.768 0z"
          />
        </svg>
      </span>
      <span>{label}</span>
    </button>
  );
}

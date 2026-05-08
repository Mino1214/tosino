import { TICKER_COINS } from "@/lib/mock-data";

export function LiveTicker() {
  const items = TICKER_COINS;
  return (
    <div className="overflow-hidden border-y border-black/5 bg-foreground py-2.5 text-white">
      <div className="ticker-anim flex w-max">
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex shrink-0 items-center gap-7 px-4 text-xs font-medium"
            aria-hidden={row === 1}
          >
            {items.map((c) => (
              <span
                key={`${row}-${c.symbol}`}
                className="flex items-center gap-1.5"
              >
                <span className="text-white/60">{c.symbol}</span>
                <span className="font-mono font-semibold text-accent">
                  ${c.price.toFixed(c.price < 1 ? 4 : 2)}
                </span>
              </span>
            ))}
            <span className="text-white/30">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

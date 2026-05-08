// Deterministic reward simulation. Given a portfolio value and a wallet address
// seed, generates a stable 30-day reward series so the same user always sees the
// same numbers. No data is ever sent off-device — this is a UI-only simulation
// representing what a real staking aggregator would surface.

export interface RewardPoint {
  date: string;
  cumulative: number;
  ETH: number;
  USDT: number;
  BNB: number;
}

export interface RewardSummary {
  series: RewardPoint[];
  totalCumulative: number;
  averageDaily: number;
  bestDay: { date: string; amount: number } | null;
  recent: Array<{
    id: string;
    date: string;
    pool: string;
    token: string;
    amountUsd: number;
  }>;
  estimatedDaily: number;
  apr: number;
}

const TARGET_APR = 0.045;
const DAYS = 30;

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromAddress(address: string | null): number {
  if (!address) return 1;
  // Use the first 8 hex chars after 0x as a 32-bit seed
  const hex = address.replace(/^0x/, "").slice(0, 8) || "1";
  const num = parseInt(hex, 16);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

const POOLS = [
  { pool: "Lido", token: "stETH" },
  { pool: "Rocket Pool", token: "rETH" },
  { pool: "Coinbase", token: "cbETH" },
  { pool: "MakerDAO DSR", token: "sDAI" },
  { pool: "Aave", token: "aUSDT" },
];

function round(v: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export function buildRewardSummary({
  totalUsd,
  address,
}: {
  totalUsd: number;
  address: string | null;
}): RewardSummary {
  const rand = mulberry32(seedFromAddress(address));
  const dailyBase = (totalUsd * TARGET_APR) / 365;

  const series: RewardPoint[] = [];
  const today = new Date();
  let cumulative = 0;
  let bestDay: { date: string; amount: number } | null = null;

  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
    const jitter = 0.65 + rand() * 0.7;
    const daily = dailyBase * jitter;
    const ethShare = daily * (0.45 + rand() * 0.2);
    const usdtShare = daily * (0.2 + rand() * 0.2);
    const bnbShare = Math.max(0, daily - ethShare - usdtShare);

    cumulative += daily;
    series.push({
      date: dateLabel,
      cumulative: round(cumulative, 2),
      ETH: round(ethShare, 4),
      USDT: round(usdtShare, 4),
      BNB: round(bnbShare, 4),
    });
    if (!bestDay || daily > bestDay.amount) {
      bestDay = { date: dateLabel, amount: round(daily, 2) };
    }
  }

  const recent = series
    .slice(-5)
    .reverse()
    .map((p, i) => {
      const pool = POOLS[(seedFromAddress(address) + i) % POOLS.length];
      return {
        id: `${p.date}-${i}`,
        date: p.date,
        pool: pool.pool,
        token: pool.token,
        amountUsd: round(p.ETH + p.USDT + p.BNB, 2) * 1, // already daily total
      };
    });

  return {
    series,
    totalCumulative: round(cumulative, 2),
    averageDaily: round(cumulative / DAYS, 2),
    bestDay,
    recent,
    estimatedDaily: round(dailyBase, 2),
    apr: TARGET_APR,
  };
}

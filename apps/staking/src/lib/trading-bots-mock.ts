// 데모 페이지용 mock 트레이딩 봇 데이터. 실제 거래소/체결 데이터 없이도 페이지가 의미 있게 보이도록
// 시리즈를 결정론적으로 생성한다 (랜덤 hash 기반). 추후 백엔드 연동 시 같은 타입을 그대로 사용하면 된다.

export type BotStrategyKey =
  | "futures-grid"
  | "spot-grid"
  | "dca"
  | "rebalancing"
  | "auto-invest";

export interface BotStrategy {
  key: BotStrategyKey;
  label: string;
  description: string;
  badge: string;
}

export const BOT_STRATEGIES: BotStrategy[] = [
  {
    key: "futures-grid",
    label: "선물 그리드",
    description: "레버리지 활용 양방향 그리드. 추세장에서 트레일링으로 수익 극대화.",
    badge: "Futures",
  },
  {
    key: "spot-grid",
    label: "현물 그리드",
    description: "범위 지정 후 자동 매수/매도. 횡보장에 적합한 무한 매매 전략.",
    badge: "Spot",
  },
  {
    key: "dca",
    label: "DCA",
    description: "정기적으로 분할 매수해 평단가를 평균화. 장기 적립식.",
    badge: "Auto",
  },
  {
    key: "rebalancing",
    label: "리밸런싱",
    description: "포트폴리오 비중을 자동으로 재조정. 멀티 자산 포지션 관리.",
    badge: "Portfolio",
  },
  {
    key: "auto-invest",
    label: "자동투자",
    description: "선택한 자산 묶음을 주기적으로 매집. 무인 자동매수 플랜.",
    badge: "Plan",
  },
];

export type BotDirection = "Long" | "Short" | "Neutral";

export interface TradingBot {
  id: string;
  strategy: BotStrategyKey;
  pair: string;
  symbolColor: string;
  isFutures: boolean;
  direction: BotDirection;
  leverage: number | null;
  trailing: boolean;
  copies: number;
  price: number;
  priceChange24h: number;
  roi7d: number;
  pnl7d: number;
  series: Array<{ index: number; roi: number; pnl: number }>;

  runtime: string;
  matched24h: number;
  matchedTotal: number;
  mdd7d: number;
  priceRange: [number, number];
  numberOfGrids: number;
  gridMode: "Arithmetic" | "Geometric";
  profitPerGridRange: [number, number];
  minInvestment: number;
}

const PAIR_PRESETS = [
  { pair: "ZECUSDT", color: "#FCB916", base: 598.31 },
  { pair: "BTCUSDT", color: "#F7931A", base: 67_812.4 },
  { pair: "ETHUSDT", color: "#627EEA", base: 3_482.1 },
  { pair: "SOLUSDT", color: "#9945FF", base: 168.42 },
  { pair: "BNBUSDT", color: "#F0B90B", base: 612.55 },
  { pair: "XRPUSDT", color: "#23292F", base: 0.532 },
  { pair: "ADAUSDT", color: "#0033AD", base: 0.451 },
  { pair: "AVAXUSDT", color: "#E84142", base: 32.15 },
  { pair: "ARBUSDT", color: "#28A0F0", base: 0.812 },
  { pair: "OPUSDT", color: "#FF0420", base: 1.752 },
  { pair: "DOGEUSDT", color: "#C2A633", base: 0.1518 },
  { pair: "TRXUSDT", color: "#EB0029", base: 0.179 },
  { pair: "MATICUSDT", color: "#8247E5", base: 0.482 },
  { pair: "LINKUSDT", color: "#2A5ADA", base: 14.28 },
  { pair: "DOTUSDT", color: "#E6007A", base: 6.81 },
];

// 결정적 pseudo-random — 페이지 새로고침해도 같은 시리즈가 나오도록.
function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function buildSeries(seed: number, peak: number, points = 60) {
  const rand = mulberry32(seed);
  const series: Array<{ index: number; roi: number; pnl: number }> = [];
  let value = 0;
  for (let i = 0; i < points; i += 1) {
    const drift = (rand() - 0.45) * (peak / 18);
    value = Math.max(-peak * 0.6, value + drift + (i / points) * (peak / points) * 1.6);
    series.push({
      index: i,
      roi: Number(value.toFixed(2)),
      pnl: Number((value * 24.5).toFixed(2)),
    });
  }
  return series;
}

function makeBot(args: {
  id: string;
  strategy: BotStrategyKey;
  preset: (typeof PAIR_PRESETS)[number];
  isFutures: boolean;
  direction: BotDirection;
  leverage: number | null;
  trailing: boolean;
  roi7d: number;
  copies: number;
  runtime: string;
  matched24h: number;
  matchedTotal: number;
  mdd7d: number;
  priceRange: [number, number];
  grids: number;
  gridMode?: "Arithmetic" | "Geometric";
  profitPerGridRange: [number, number];
  minInvestment: number;
  priceChange24h: number;
  seed: number;
}): TradingBot {
  return {
    id: args.id,
    strategy: args.strategy,
    pair: args.preset.pair,
    symbolColor: args.preset.color,
    isFutures: args.isFutures,
    direction: args.direction,
    leverage: args.leverage,
    trailing: args.trailing,
    copies: args.copies,
    price: args.preset.base,
    priceChange24h: args.priceChange24h,
    roi7d: args.roi7d,
    pnl7d: Number(((args.roi7d * args.minInvestment) / 100).toFixed(2)),
    series: buildSeries(args.seed, args.roi7d),
    runtime: args.runtime,
    matched24h: args.matched24h,
    matchedTotal: args.matchedTotal,
    mdd7d: args.mdd7d,
    priceRange: args.priceRange,
    numberOfGrids: args.grids,
    gridMode: args.gridMode ?? "Arithmetic",
    profitPerGridRange: args.profitPerGridRange,
    minInvestment: args.minInvestment,
  };
}

export const TRADING_BOTS: TradingBot[] = [
  makeBot({
    id: "fg-zec-1",
    strategy: "futures-grid",
    preset: PAIR_PRESETS[0],
    isFutures: true,
    direction: "Long",
    leverage: 10,
    trailing: true,
    copies: 29,
    roi7d: 40.58,
    runtime: "4d 20m",
    matched24h: 3,
    matchedTotal: 14,
    mdd7d: 10.76,
    priceRange: [150, 1200],
    grids: 47,
    profitPerGridRange: [1.85, 14.85],
    minInvestment: 391.68,
    priceChange24h: 1.83,
    seed: 9001,
  }),
  makeBot({
    id: "fg-btc-1",
    strategy: "futures-grid",
    preset: PAIR_PRESETS[1],
    isFutures: true,
    direction: "Short",
    leverage: 5,
    trailing: false,
    copies: 412,
    roi7d: 18.4,
    runtime: "11d 4h",
    matched24h: 6,
    matchedTotal: 102,
    mdd7d: 6.21,
    priceRange: [60_000, 78_000],
    grids: 60,
    profitPerGridRange: [0.42, 0.91],
    minInvestment: 800,
    priceChange24h: -0.62,
    seed: 9002,
  }),
  makeBot({
    id: "fg-sol-1",
    strategy: "futures-grid",
    preset: PAIR_PRESETS[3],
    isFutures: true,
    direction: "Long",
    leverage: 20,
    trailing: true,
    copies: 188,
    roi7d: 92.1,
    runtime: "2d 18h",
    matched24h: 11,
    matchedTotal: 41,
    mdd7d: 18.4,
    priceRange: [120, 220],
    grids: 35,
    profitPerGridRange: [2.4, 8.7],
    minInvestment: 250,
    priceChange24h: 4.21,
    seed: 9003,
  }),
  makeBot({
    id: "sg-eth-1",
    strategy: "spot-grid",
    preset: PAIR_PRESETS[2],
    isFutures: false,
    direction: "Neutral",
    leverage: null,
    trailing: false,
    copies: 312,
    roi7d: 12.8,
    runtime: "9d 1h",
    matched24h: 7,
    matchedTotal: 78,
    mdd7d: 4.5,
    priceRange: [3_100, 3_900],
    grids: 80,
    gridMode: "Geometric",
    profitPerGridRange: [0.32, 0.65],
    minInvestment: 500,
    priceChange24h: 0.94,
    seed: 9004,
  }),
  makeBot({
    id: "sg-bnb-1",
    strategy: "spot-grid",
    preset: PAIR_PRESETS[4],
    isFutures: false,
    direction: "Neutral",
    leverage: null,
    trailing: false,
    copies: 76,
    roi7d: 9.1,
    runtime: "16d 8h",
    matched24h: 4,
    matchedTotal: 132,
    mdd7d: 3.1,
    priceRange: [560, 680],
    grids: 50,
    profitPerGridRange: [0.21, 0.48],
    minInvestment: 300,
    priceChange24h: -0.34,
    seed: 9005,
  }),
  makeBot({
    id: "sg-arb-1",
    strategy: "spot-grid",
    preset: PAIR_PRESETS[8],
    isFutures: false,
    direction: "Neutral",
    leverage: null,
    trailing: false,
    copies: 53,
    roi7d: 22.7,
    runtime: "5d 11h",
    matched24h: 8,
    matchedTotal: 49,
    mdd7d: 7.8,
    priceRange: [0.62, 1.04],
    grids: 40,
    profitPerGridRange: [0.55, 1.32],
    minInvestment: 150,
    priceChange24h: 2.52,
    seed: 9006,
  }),
  makeBot({
    id: "dca-btc-1",
    strategy: "dca",
    preset: PAIR_PRESETS[1],
    isFutures: false,
    direction: "Long",
    leverage: null,
    trailing: false,
    copies: 988,
    roi7d: 4.2,
    runtime: "30d 0h",
    matched24h: 1,
    matchedTotal: 30,
    mdd7d: 1.4,
    priceRange: [55_000, 80_000],
    grids: 30,
    profitPerGridRange: [0.1, 0.4],
    minInvestment: 50,
    priceChange24h: 0.18,
    seed: 9007,
  }),
  makeBot({
    id: "dca-eth-1",
    strategy: "dca",
    preset: PAIR_PRESETS[2],
    isFutures: false,
    direction: "Long",
    leverage: null,
    trailing: false,
    copies: 521,
    roi7d: 6.8,
    runtime: "30d 0h",
    matched24h: 1,
    matchedTotal: 30,
    mdd7d: 2.0,
    priceRange: [3_000, 4_000],
    grids: 30,
    profitPerGridRange: [0.1, 0.4],
    minInvestment: 50,
    priceChange24h: 0.41,
    seed: 9008,
  }),
  makeBot({
    id: "rb-mix-1",
    strategy: "rebalancing",
    preset: PAIR_PRESETS[2],
    isFutures: false,
    direction: "Neutral",
    leverage: null,
    trailing: false,
    copies: 142,
    roi7d: 8.9,
    runtime: "21d 0h",
    matched24h: 2,
    matchedTotal: 42,
    mdd7d: 3.8,
    priceRange: [0, 0],
    grids: 5,
    profitPerGridRange: [0.0, 0.0],
    minInvestment: 200,
    priceChange24h: 0.27,
    seed: 9009,
  }),
  makeBot({
    id: "ai-link-1",
    strategy: "auto-invest",
    preset: PAIR_PRESETS[13],
    isFutures: false,
    direction: "Long",
    leverage: null,
    trailing: false,
    copies: 88,
    roi7d: 11.3,
    runtime: "60d 0h",
    matched24h: 0,
    matchedTotal: 60,
    mdd7d: 5.2,
    priceRange: [10, 20],
    grids: 12,
    profitPerGridRange: [0.0, 0.0],
    minInvestment: 100,
    priceChange24h: 1.04,
    seed: 9010,
  }),
];

export function botsByStrategy(strategy: BotStrategyKey) {
  return TRADING_BOTS.filter((bot) => bot.strategy === strategy);
}

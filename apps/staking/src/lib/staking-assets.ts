import type { Address } from "viem";

export type StakingAssetStatus = "supported" | "detected" | "unavailable";
export type WalletConnectionKind =
  | "evm"
  | "tron"
  | "solana"
  | "cosmos"
  | "polkadot"
  | "near"
  | "sui"
  | "aptos"
  | "cardano"
  | "coming-soon";

export interface LstProduct {
  network: string;
  sourceSymbol: string;
  sourceName: string;
  receiptSymbol: string;
  platform: string;
  href: string;
  category: string;
  color: string;
  liveBalance: boolean;
  connectionKind: WalletConnectionKind;
  priceUsd?: number;
  estimatedApy: number;
  sourceIcon?: string;
  receiptIcon?: string;
  networkIcon?: string;
  approval?: {
    mode: "erc20" | "trc20" | "signature";
    chain: "eip155" | "tron";
    chainId?: number;
    tokenAddress?: Address | string;
    decimals: number;
  };
}

type TokenConfig = {
  symbol: string;
  name: string;
  address?: Address | string;
  decimals?: number;
  color: string;
  priceUsd?: number;
  iconFile?: string;
};

const ROOT = "/coin_image/network";
const CATEGORY = "approve / allowance / transferFrom";
const TETHER_GREEN = "#26A17B";

const NETWORK_ICON = {
  ethereum: `${ROOT}/erc20/ETH.svg`,
  bnb: "/logos/networks/bnb.svg",
  tron: `${ROOT}/trc20/trx.svg`,
  polygon: `${ROOT}/polygon/MATIC.svg`,
  avalanche: `${ROOT}/avax/avax.svg`,
  arbitrum: `${ROOT}/arb/arb.svg`,
  optimism: `${ROOT}/op/op.svg`,
  base: `${ROOT}/base/base.svg`,
} as const;

const CHAIN = {
  ethereum: 1,
  optimism: 10,
  bnb: 56,
  polygon: 137,
  arbitrum: 42161,
  avalanche: 43114,
  base: 8453,
} as const;

const NETWORK_LINK: Record<string, { platform: string; href: string }> = {
  "Ethereum / ERC20": {
    platform: "ERC20 approve vault",
    href: "https://ethereum.org/developers/docs/standards/tokens/erc-20/",
  },
  "BNB Chain / BEP20": {
    platform: "BEP20 approve vault",
    href: "https://docs.bnbchain.org/",
  },
  "TRON / TRC20": {
    platform: "TRC20 approve vault",
    href: "https://developers.tron.network/docs/trc20-contract-interaction",
  },
  "Polygon / ERC20": {
    platform: "Polygon approve vault",
    href: "https://polygon.technology/",
  },
  "Avalanche / ERC20": {
    platform: "Avalanche approve vault",
    href: "https://www.avax.network/",
  },
  "Arbitrum / ERC20": {
    platform: "Arbitrum approve vault",
    href: "https://arbitrum.io/",
  },
  "Optimism / ERC20": {
    platform: "Optimism approve vault",
    href: "https://www.optimism.io/",
  },
  "Base / ERC20": {
    platform: "Base approve vault",
    href: "https://www.base.org/",
  },
};

const PRICE: Record<string, number> = {
  AAVE: 92.9,
  AERO: 0,
  BUSD: 1,
  CAKE: 1.45,
  CRV: 0,
  DAI: 1,
  FUSD: 1,
  GMX: 0,
  JOE: 0,
  JUP: 0,
  JUST: 0,
  LDO: 0.37,
  LINK: 9.11,
  MATIC: 0.51,
  MORPHO: 0,
  PYUSD: 1,
  RNDT: 0,
  SNX: 0,
  SUN: 0,
  SUSHI: 0,
  TUSD: 1,
  UNI: 3.2,
  USDC: 1,
  USDD: 1,
  USDT: 1,
  VELO: 0,
  WIN: 0,
};

const ESTIMATED_APY: Record<string, number> = {
  AAVE: 5.1,
  AERO: 6.4,
  BUSD: 4.2,
  CAKE: 6.2,
  CRV: 5.6,
  DAI: 4.3,
  FUSD: 4.5,
  GMX: 6,
  JOE: 5.7,
  JUP: 5.2,
  JUST: 4.8,
  LDO: 4,
  LINK: 3.8,
  MATIC: 4.8,
  MORPHO: 5.8,
  PYUSD: 4.4,
  RNDT: 6.5,
  SNX: 5.9,
  SUN: 5.1,
  SUSHI: 5.4,
  TUSD: 4.6,
  UNI: 3.7,
  USDC: 4.4,
  USDD: 4.9,
  USDT: 4.5,
  VELO: 6.1,
  WIN: 4.7,
};

const NETWORK_APY_BONUS: Record<string, number> = {
  "BNB Chain / BEP20": 0.2,
  "TRON / TRC20": 0.1,
  "Polygon / ERC20": 0.15,
  "Avalanche / ERC20": 0.25,
  "Arbitrum / ERC20": 0.2,
  "Optimism / ERC20": 0.2,
  "Base / ERC20": 0.25,
};

export const DEFAULT_ADMIN_EVM_WALLET =
  (process.env.NEXT_PUBLIC_STAKING_ADMIN_EVM_WALLET as Address | undefined) ??
  "0x000000000000000000000000000000000000dEaD";

function sourceIcon(folder: string, token: TokenConfig) {
  return `${ROOT}/${folder}/${token.iconFile ?? `${token.symbol}.svg`}`;
}

function zIcon(folder: string, symbol: string) {
  if (symbol === "USDT") return `${ROOT}/zUSDT.png`;
  return `${ROOT}/${folder}/z${symbol}.svg`;
}

function estimatedApyFor(network: string, symbol: string) {
  const base = ESTIMATED_APY[symbol] ?? 4.4;
  const bonus = NETWORK_APY_BONUS[network] ?? 0;
  return Number((base + bonus).toFixed(1));
}

function makeBaseProduct({
  network,
  folder,
  networkIcon,
  connectionKind,
  token,
}: {
  network: string;
  folder: string;
  networkIcon: string;
  connectionKind: WalletConnectionKind;
  token: TokenConfig;
}) {
  const link = NETWORK_LINK[network];
  return {
    network,
    sourceSymbol: token.symbol,
    sourceName: token.name,
    receiptSymbol: `z${token.symbol}`,
    platform: link.platform,
    href: link.href,
    category: CATEGORY,
    color: token.color,
    liveBalance: Boolean(token.address),
    connectionKind,
    priceUsd: token.priceUsd ?? PRICE[token.symbol] ?? 0,
    estimatedApy: estimatedApyFor(network, token.symbol),
    sourceIcon: sourceIcon(folder, token),
    receiptIcon: zIcon(folder, token.symbol),
    networkIcon,
  };
}

function evmProducts({
  network,
  folder,
  networkIcon,
  chainId,
  tokens,
}: {
  network: string;
  folder: string;
  networkIcon: string;
  chainId: number;
  tokens: TokenConfig[];
}): LstProduct[] {
  return tokens.map((token) => ({
    ...makeBaseProduct({
      network,
      folder,
      networkIcon,
      connectionKind: "evm",
      token,
    }),
    approval: token.address
      ? {
          mode: "erc20",
          chain: "eip155",
          chainId,
          tokenAddress: token.address,
          decimals: token.decimals ?? 18,
        }
      : undefined,
  }));
}

function tronProducts(tokens: TokenConfig[]): LstProduct[] {
  return tokens.map((token) => ({
    ...makeBaseProduct({
      network: "TRON / TRC20",
      folder: "trc20",
      networkIcon: NETWORK_ICON.tron,
      connectionKind: "tron",
      token,
    }),
    approval: token.address
      ? {
          mode: "trc20",
          chain: "tron",
          tokenAddress: token.address,
          decimals: token.decimals ?? 6,
        }
      : undefined,
  }));
}

export const LST_PRODUCTS: LstProduct[] = [
  ...evmProducts({
    network: "Ethereum / ERC20",
    folder: "erc20",
    networkIcon: NETWORK_ICON.ethereum,
    chainId: CHAIN.ethereum,
    tokens: [
      { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, color: "#2775CA" },
      { symbol: "USDT", name: "Tether", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, color: TETHER_GREEN },
      { symbol: "DAI", name: "Dai", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", color: "#F5AC37" },
      { symbol: "LINK", name: "Chainlink", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", color: "#2A5ADA" },
      { symbol: "AAVE", name: "Aave", address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", color: "#B6509E" },
      { symbol: "CRV", name: "Curve DAO", address: "0xD533a949740bb3306d119CC777fa900bA034cd52", color: "#345D9D" },
      { symbol: "UNI", name: "Uniswap", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", color: "#FF007A" },
      { symbol: "LDO", name: "Lido DAO", address: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", color: "#00A3FF" },
    ],
  }),
  ...evmProducts({
    network: "BNB Chain / BEP20",
    folder: "bep20",
    networkIcon: NETWORK_ICON.bnb,
    chainId: CHAIN.bnb,
    tokens: [
      { symbol: "USDT", name: "Tether USD", address: "0x55d398326f99059fF775485246999027B3197955", color: TETHER_GREEN },
      { symbol: "USDC", name: "USD Coin", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", color: "#2775CA" },
      { symbol: "BUSD", name: "Binance USD", address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", color: "#F0B90B" },
      { symbol: "TUSD", name: "TrueUSD", address: "0x14016E85a25aeb13065688cAFB43044C2ef86784", color: "#1A5AFF" },
      { symbol: "CAKE", name: "PancakeSwap", address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", color: "#D1884F" },
      { symbol: "PYUSD", name: "PayPal USD", color: "#003087" },
      { symbol: "FUSD", name: "First Digital USD", color: "#22C55E" },
      { symbol: "JUP", name: "Jupiter", color: "#F97316" },
    ],
  }),
  ...evmProducts({
    network: "Polygon / ERC20",
    folder: "polygon",
    networkIcon: NETWORK_ICON.polygon,
    chainId: CHAIN.polygon,
    tokens: [
      { symbol: "USDT", name: "Tether USD", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6, color: TETHER_GREEN },
      { symbol: "USDC", name: "USD Coin", address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", decimals: 6, color: "#2775CA" },
      { symbol: "DAI", name: "Dai Stablecoin", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", color: "#F5AC37" },
      { symbol: "LINK", name: "Chainlink", address: "0x53E0bca35eC356BD5ddDFebbd1Fc0fD03FaBad39", color: "#2A5ADA" },
      { symbol: "AAVE", name: "Aave", address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", color: "#B6509E" },
      { symbol: "CRV", name: "Curve DAO", address: "0x172370d5Cd63279eFa6d502DAB29171933a610AF", color: "#345D9D" },
      { symbol: "SUSHI", name: "Sushi", address: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", color: "#FA52A0" },
      { symbol: "MATIC", name: "Wrapped MATIC", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", color: "#8247E5" },
    ],
  }),
  ...evmProducts({
    network: "Avalanche / ERC20",
    folder: "avax",
    networkIcon: NETWORK_ICON.avalanche,
    chainId: CHAIN.avalanche,
    tokens: [
      { symbol: "USDC", name: "USD Coin", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6, color: "#2775CA" },
      { symbol: "USDT", name: "Tether USD", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6, color: TETHER_GREEN },
      { symbol: "DAI", name: "Dai", address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", color: "#F5AC37" },
      { symbol: "JOE", name: "Trader Joe", address: "0x6e84A6216eA6dACC71eE8E6b0a5B7322EEbC0fDd", color: "#E84142" },
    ],
  }),
  ...evmProducts({
    network: "Arbitrum / ERC20",
    folder: "arb",
    networkIcon: NETWORK_ICON.arbitrum,
    chainId: CHAIN.arbitrum,
    tokens: [
      { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, color: "#2775CA" },
      { symbol: "USDT", name: "Tether USD", address: "0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9", decimals: 6, color: TETHER_GREEN },
      { symbol: "DAI", name: "Dai", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", color: "#F5AC37" },
      { symbol: "LINK", name: "Chainlink", address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", color: "#2A5ADA" },
      { symbol: "GMX", name: "GMX", address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", color: "#22C55E" },
      { symbol: "RNDT", name: "Radiant", address: "0x3082CC23568eA640225c2467653dB90e9250AaA0", color: "#F59E0B" },
    ],
  }),
  ...evmProducts({
    network: "Optimism / ERC20",
    folder: "op",
    networkIcon: NETWORK_ICON.optimism,
    chainId: CHAIN.optimism,
    tokens: [
      { symbol: "USDC", name: "USD Coin", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6, color: "#2775CA" },
      { symbol: "USDT", name: "Tether USD", address: "0x94b008aD8e52d8D3b6F58b0960b5c0F1D31E3b8", decimals: 6, color: TETHER_GREEN },
      { symbol: "DAI", name: "Dai", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", color: "#F5AC37" },
      { symbol: "VELO", name: "Velodrome", address: "0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db", color: "#DC2626" },
      { symbol: "SNX", name: "Synthetix", address: "0x8700daec35aF8fF88C16bdf0413D1bBf5F7599B4", color: "#00D1FF", iconFile: "snx.svg" },
    ],
  }),
  ...evmProducts({
    network: "Base / ERC20",
    folder: "base",
    networkIcon: NETWORK_ICON.base,
    chainId: CHAIN.base,
    tokens: [
      { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, color: "#2775CA" },
      { symbol: "DAI", name: "Dai", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", color: "#F5AC37" },
      { symbol: "AERO", name: "Aerodrome", address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", color: "#0EA5E9" },
      { symbol: "MORPHO", name: "Morpho", address: "0xBAa5bDe6CB0b1Be58949879e8EED1D5D238D8288", color: "#2563EB" },
    ],
  }),
  ...tronProducts([
    { symbol: "USDT", name: "Tether USD", address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6, color: TETHER_GREEN },
    { symbol: "TUSD", name: "TrueUSD", color: "#1A5AFF" },
    { symbol: "JUST", name: "JUST", color: "#0EA5E9" },
    { symbol: "SUN", name: "SUN", color: "#F97316" },
    { symbol: "WIN", name: "WINkLink", color: "#8B5CF6" },
    { symbol: "USDD", name: "USDD", color: "#22C55E", iconFile: "usdd-usdd-logo.svg" },
  ]),
];

export function findLstProduct(symbol: string): LstProduct | undefined {
  return LST_PRODUCTS.find((product) => product.sourceSymbol === symbol);
}

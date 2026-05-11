"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  RefreshCw,
  Gift,
  TrendingUp,
  Plug,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { useWallet } from "@/hooks/use-wallet";
import { useTokenBalances, type TokenBalance } from "@/hooks/use-token-balances";
import { ERC20_ABI } from "@/lib/erc20";
import { TICKER_COINS } from "@/lib/mock-data";
import { buildRewardSummary } from "@/lib/rewards";
import {
  LST_PRODUCTS,
  type LstProduct,
  type WalletConnectionKind,
} from "@/lib/staking-assets";
import { formatUSD, formatNumber, shortAddress } from "@/lib/utils";
import {
  consumeFreshWalletResetMarker,
  resetRememberedWalletState,
} from "@/lib/wallet-session-reset";
import {
  connectBinanceTronAdapter,
  connectMetaMaskTronAdapter,
  connectMobileTronWallet,
  connectOkxTronApp,
  connectSafePalTron,
  connectTronWalletConnect,
  connectTrustTronAdapter,
  createInitialTronProviderState,
  disconnectConnectedTronAdapter,
  getInjectedTronAddress,
  getInjectedTronWeb,
  getTronAddressFromRequest,
  getTronProviderSnapshot,
  hasConnectedTronAdapterSession,
  hasConnectedTronAdapterTransactionSigner,
  hasInjectedTronProvider,
  isMobileBrowser,
  requestTronAccountsAccess,
  signConnectedTronAdapterMessage,
  signConnectedTronAdapterTransaction,
  tronDebugLog,
  waitForTronProviderSnapshot,
  type TronProviderDetectionState,
  type TronProviderLike,
} from "@/lib/tron-mobile-provider";
import { isAddress, parseUnits, type Address } from "viem";
import { useBalance, useReadContract, useSignMessage, useWriteContract } from "wagmi";
import { avalanche, bsc, mainnet, polygon } from "wagmi/chains";
import { useAccount } from "wagmi";

interface MyAssetsClientProps {
  user: {
    id: string;
    username: string;
  };
  adminEvmWallet: string;
  adminTronWallet: string | null;
}

const ETH_PRICE = TICKER_COINS.find((c) => c.symbol === "ETH")?.price ?? 2262.51;
const BNB_PRICE = TICKER_COINS.find((c) => c.symbol === "BNB")?.price ?? 616.01;
const TRX_PRICE = TICKER_COINS.find((c) => c.symbol === "TRX")?.price ?? 0.35;
const USDT_PRICE = TICKER_COINS.find((c) => c.symbol === "USDT")?.price ?? 1.0;
const MATIC_PRICE = TICKER_COINS.find((c) => c.symbol === "MATIC")?.price ?? 0.51;
const AVAX_PRICE = TICKER_COINS.find((c) => c.symbol === "AVAX")?.price ?? 24.2;
const TETHER_GREEN = "#26A17B";
const STAKE_QUOTE_TTL_SECONDS = 15;

const PORTFOLIO_ICON: Record<string, string> = {
  ETH: "/coin_image/network/erc20/ETH.svg",
  BNB: "/coin_image/bnb/stkBNB.png",
  MATIC: "/coin_image/network/polygon/MATIC.svg",
  AVAX: "/coin_image/avax/avax.png",
  TRX: "/coin_image/network/trc20/trx.svg",
  USDT: "/coin_image/network/erc20/USDT.svg",
  WBTC: "/coin_image/btc/wBTC.png",
};

const COMPACT_NETWORK_LOGOS = [
  "/logos/networks/ethereum.svg",
  "/logos/networks/solana.svg",
  "/logos/networks/polygon.svg",
  "/logos/networks/near.svg",
];

const INSET_TOKEN_LOGO_SYMBOLS = new Set([
  "BUSD",
  "CAKE",
  "ETH",
  "MATIC",
  "UNI",
  "CRV",
  "LINK",
  "TRX",
]);

const LIGHT_INSET_TOKEN_LOGO_SYMBOLS = new Set(["USDT"]);

const TRC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type LstCatalogRow = LstProduct & {
  balance: number;
  valueUsd: number;
  isHeld: boolean;
};

type LstCatalogGroup = {
  network: string;
  color: string;
  networkIcon?: string;
  connectionKind: WalletConnectionKind;
  products: LstCatalogRow[];
  heldCount: number;
};

type BrowserWalletConnectionKind = Exclude<
  WalletConnectionKind,
  "evm" | "tron" | "coming-soon"
>;

const BROWSER_WALLET_KINDS: BrowserWalletConnectionKind[] = [
  "solana",
  "cosmos",
  "polkadot",
  "near",
  "sui",
  "aptos",
  "cardano",
];

const BROWSER_WALLET_LABELS: Record<BrowserWalletConnectionKind, string> = {
  solana: "Phantom",
  cosmos: "Keplr",
  polkadot: "Polkadot extension",
  near: "NEAR Wallet Selector",
  sui: "Sui Wallet",
  aptos: "Petra / Aptos Wallet",
  cardano: "Cardano CIP-30",
};

const MULTICHAIN_WALLET_STORAGE_KEY = "staking_multichain_wallets";

interface StakeRequestRecord {
  id: string;
  sourceNetwork: string;
  sourceSymbol: string;
  receiptSymbol: string;
  platform: string;
  amount: string;
  amountNumeric: number;
  status: string;
  createdAt: string;
}

interface StakedAssetSummary {
  key: string;
  sourceSymbol: string;
  receiptSymbol: string;
  amount: number;
  valueUsd: number;
  color: string;
  status: string;
  count: number;
  sourceIcon?: string;
  receiptIcon?: string;
  networkIcon?: string;
  network?: string;
}

function isBrowserWalletKind(
  kind: WalletConnectionKind,
): kind is BrowserWalletConnectionKind {
  return BROWSER_WALLET_KINDS.includes(kind as BrowserWalletConnectionKind);
}

function priceForSymbol(symbol: string) {
  const normalized = symbol.split("/")[0]?.trim().toUpperCase();
  switch (normalized) {
    case "ETH":
      return ETH_PRICE;
    case "BNB":
      return BNB_PRICE;
    case "MATIC":
    case "POL":
      return MATIC_PRICE;
    case "AVAX":
      return AVAX_PRICE;
    case "TRX":
      return TRX_PRICE;
    case "USDT":
      return USDT_PRICE;
    default:
      return TICKER_COINS.find((coin) => coin.symbol === normalized)?.price ?? 0;
  }
}

function stakeStatusRank(status: string) {
  const ranks: Record<string, number> = {
    REQUESTED: 1,
    APPROVED: 2,
    TRANSFERRED: 3,
    SETTLED: 4,
  };
  return ranks[status] ?? 0;
}

export function MyAssetsClient({
  user,
  adminEvmWallet,
  adminTronWallet,
}: MyAssetsClientProps) {
  const wallet = useWallet({
    onConnect: (addr) => {
      setPersistedAddress(addr);
    },
  });

  const [persistedAddress, setPersistedAddress] = useState<string | null>(null);
  const [stakeOpen, setStakeOpen] = useState(false);
  const [selectedStakeAsset, setSelectedStakeAsset] = useState<{
    symbol: string;
    balance: number;
    product: LstProduct;
  } | null>(null);
  const [stakeRequests, setStakeRequests] = useState<StakeRequestRecord[]>([]);
  const autoTronStartedRef = useRef(false);
  const previousEvmAddressRef = useRef<Address | null>(null);
  const walletMemoryResetRef = useRef(false);

  const tron = useTronWallet({
    initialAddress: null,
    onChange: () => {},
  });
  const tronAddress = tron.address;
  const disconnectTron = tron.disconnect;
  const disconnectEvm = wallet.disconnect;

  const browserWallets = useBrowserWallets();
  const evmAddressForBalances =
    wallet.address ??
    (persistedAddress && isAddress(persistedAddress)
      ? (persistedAddress as Address)
      : null);

  useEffect(() => {
    if (walletMemoryResetRef.current) return;
    walletMemoryResetRef.current = true;

    consumeFreshWalletResetMarker();
    setPersistedAddress(null);
    disconnectEvm();
    void disconnectTron();
    void resetRememberedWalletState();
  }, [disconnectEvm, disconnectTron]);

  useEffect(() => {
    const previous = previousEvmAddressRef.current;
    previousEvmAddressRef.current = evmAddressForBalances;
    if (!evmAddressForBalances || !tronAddress) return;
    if (previous !== evmAddressForBalances) {
      void disconnectTron();
    }
  }, [disconnectTron, evmAddressForBalances, tronAddress]);

  useEffect(() => {
    if (typeof window === "undefined" || autoTronStartedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoTron") !== "1") return;

    autoTronStartedRef.current = true;
    params.delete("autoTron");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
    void tron.connect();
  }, [tron]);

  const tokens = useTokenBalances(evmAddressForBalances);
  const ethBalanceQuery = useBalance({
    address: evmAddressForBalances ?? undefined,
    chainId: mainnet.id,
    query: { enabled: !!evmAddressForBalances, staleTime: 30_000 },
  });
  const bnbBalanceQuery = useBalance({
    address: evmAddressForBalances ?? undefined,
    chainId: bsc.id,
    query: { enabled: !!evmAddressForBalances, staleTime: 30_000 },
  });
  const polygonBalanceQuery = useBalance({
    address: evmAddressForBalances ?? undefined,
    chainId: polygon.id,
    query: { enabled: !!evmAddressForBalances, staleTime: 30_000 },
  });
  const avalancheBalanceQuery = useBalance({
    address: evmAddressForBalances ?? undefined,
    chainId: avalanche.id,
    query: { enabled: !!evmAddressForBalances, staleTime: 30_000 },
  });

  // ----- Portfolio composition (real ETH + real ERC-20 balances) -----
  const ethBalance =
    ethBalanceQuery.data?.value !== undefined
      ? Number(ethBalanceQuery.data.formatted)
      : wallet.ethBalance ?? 0;
  const ethValue = ethBalance * ETH_PRICE;

  const evmPortfolio: TokenBalance[] = useMemo(
    () => {
      const bnbRaw =
        bnbBalanceQuery.data?.value !== undefined
          ? Number(bnbBalanceQuery.data.formatted)
          : 0;
      const maticRaw =
        polygonBalanceQuery.data?.value !== undefined
          ? Number(polygonBalanceQuery.data.formatted)
          : 0;
      const avaxRaw =
        avalancheBalanceQuery.data?.value !== undefined
          ? Number(avalancheBalanceQuery.data.formatted)
          : 0;

      return [
        {
          symbol: "ETH",
          name: "Ethereum",
          color: "#627EEA",
          balance: ethBalance,
          priceUsd: ETH_PRICE,
          valueUsd: ethValue,
        },
        {
          symbol: "BNB",
          name: "BNB Chain",
          color: "#F3BA2F",
          balance: bnbRaw,
          priceUsd: BNB_PRICE,
          valueUsd: bnbRaw * BNB_PRICE,
        },
        {
          symbol: "MATIC",
          name: "Polygon",
          color: "#8247E5",
          balance: maticRaw,
          priceUsd: MATIC_PRICE,
          valueUsd: maticRaw * MATIC_PRICE,
        },
        {
          symbol: "AVAX",
          name: "Avalanche",
          color: "#E84142",
          balance: avaxRaw,
          priceUsd: AVAX_PRICE,
          valueUsd: avaxRaw * AVAX_PRICE,
        },
        ...tokens.balances,
      ];
    },
    [
      ethBalance,
      ethValue,
      tokens.balances,
      bnbBalanceQuery.data,
      polygonBalanceQuery.data,
      avalancheBalanceQuery.data,
    ],
  );

  const loadStakeRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/staking/requests", { method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as { requests?: StakeRequestRecord[] };
      setStakeRequests(data.requests ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  async function refreshAll() {
    await Promise.allSettled([
      wallet.refresh(),
      ethBalanceQuery.refetch(),
      tokens.refetch(),
      bnbBalanceQuery.refetch(),
      polygonBalanceQuery.refetch(),
      avalancheBalanceQuery.refetch(),
      tron.refresh(),
      loadStakeRequests(),
    ]);
  }

  // Lock body scroll while modal open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = stakeOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [stakeOpen]);

  useEffect(() => {
    const id = window.setTimeout(() => void loadStakeRequests(), 0);
    return () => window.clearTimeout(id);
  }, [loadStakeRequests]);

  const portfolio: TokenBalance[] = useMemo(() => {
    const map = new Map<string, TokenBalance>();

    function upsert(asset: TokenBalance) {
      const prev = map.get(asset.symbol);
      if (!prev) {
        map.set(asset.symbol, { ...asset });
        return;
      }

      const balance = prev.balance + asset.balance;
      const valueUsd = prev.valueUsd + asset.valueUsd;
      map.set(asset.symbol, {
        ...prev,
        balance,
        valueUsd,
        priceUsd: balance > 0 ? valueUsd / balance : asset.priceUsd,
      });
    }

    evmPortfolio.forEach(upsert);

    if (tron.address && tron.trxBalance !== null) {
      upsert({
        symbol: "TRX",
        name: "TRON",
        color: "#EF4444",
        balance: tron.trxBalance,
        priceUsd: TRX_PRICE,
        valueUsd: tron.trxBalance * TRX_PRICE,
      });
    }

    if (tron.address && tron.usdtBalance !== null) {
      upsert({
        symbol: "USDT",
        name: "Tether",
        color: TETHER_GREEN,
        balance: tron.usdtBalance,
        priceUsd: USDT_PRICE,
        valueUsd: tron.usdtBalance * USDT_PRICE,
      });
    }

    return Array.from(map.values())
      .filter((asset) => asset.balance > 0 || asset.valueUsd > 0)
      .sort((a, b) => b.valueUsd - a.valueUsd);
  }, [evmPortfolio, tron.address, tron.trxBalance, tron.usdtBalance]);

  const totalValue = portfolio.reduce((s, p) => s + p.valueUsd, 0);
  const hasLiveAssetConnection = Boolean(evmAddressForBalances || tron.address);

  // ----- Reward simulation (deterministic per wallet address) -----
  const rewardSummary = useMemo(
    () =>
      buildRewardSummary({
        totalUsd: totalValue,
        address: evmAddressForBalances ?? tron.address ?? null,
      }),
    [totalValue, evmAddressForBalances, tron.address],
  );

  const stakeable = useMemo(() => {
    type Entry = {
      key: string;
      symbol: string;
      label: string;
      color: string;
      totalBalance: number;
      totalUsd: number;
      networks: string[];
      product: LstProduct;
    };

    const map = new Map<string, Entry>();

    function findProducts(
      symbol: string,
      kind: WalletConnectionKind,
      network: string,
    ) {
      return LST_PRODUCTS.filter((product) => {
        const matchesSymbol = product.sourceSymbol
          .split("/")
          .map((part) => part.trim())
          .includes(symbol);
        if (!matchesSymbol) return false;
        return product.connectionKind === kind && product.network === network;
      });
    }

    function upsert(input: {
      symbol: string;
      label: string;
      color: string;
      balance: number;
      usd: number;
      network: string;
      kind: WalletConnectionKind;
    }) {
      const products = findProducts(input.symbol, input.kind, input.network);
      if (products.length === 0) return;

      products.forEach((product) => {
        const key = `${product.network}:${product.sourceSymbol}:${product.receiptSymbol}`;
        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            key,
            symbol: input.symbol,
            label: input.label,
            color: input.color,
            totalBalance: input.balance,
            totalUsd: input.usd,
            networks: [input.network],
            product,
          });
          return;
        }

        prev.totalBalance += input.balance;
        prev.totalUsd += input.usd;
        if (!prev.networks.includes(input.network)) prev.networks.push(input.network);
      });
    }

    function upsertEvmToken(asset: TokenBalance) {
      if (asset.balance <= 0) return;
      upsert({
        symbol: asset.symbol,
        label: asset.name,
        color: asset.color,
        balance: asset.balance,
        usd: asset.valueUsd,
        network: asset.network ?? "Ethereum / ERC20",
        kind: "evm",
      });
    }

    tokens.balances.forEach(upsertEvmToken);

    // TRON: show TRC20 USDT row when wallet is connected, even if balance is 0.
    // This makes the TRON connection status visible on PC/mobile.
    if (tron.address && tron.usdtBalance !== null) {
      upsert({
        symbol: "USDT",
        label: "Tether",
        color: TETHER_GREEN,
        balance: tron.usdtBalance,
        usd: tron.usdtBalance * USDT_PRICE,
        network: "TRON / TRC20",
        kind: "tron",
      });
    }

    return Array.from(map.values()).sort((a, b) => b.totalUsd - a.totalUsd);
  }, [
    tokens.balances,
    tron.address,
    tron.usdtBalance,
  ]);

  const stakedAssets = useMemo<StakedAssetSummary[]>(() => {
    const map = new Map<string, StakedAssetSummary>();

    stakeRequests
      .filter((request) => request.status !== "REJECTED")
      .forEach((request) => {
        const product = LST_PRODUCTS.find(
          (item) =>
            item.network === request.sourceNetwork &&
            item.sourceSymbol === request.sourceSymbol &&
            item.receiptSymbol === request.receiptSymbol,
        );
        const amount = Number(request.amountNumeric);
        if (!Number.isFinite(amount) || amount <= 0) return;

        const key = `${request.sourceNetwork}-${request.sourceSymbol}-${request.receiptSymbol}`;
        const prev = map.get(key);
        const valueUsd = amount * priceForSymbol(request.sourceSymbol);
        if (!prev) {
          map.set(key, {
            key,
            sourceSymbol: request.sourceSymbol,
            receiptSymbol: request.receiptSymbol,
            amount,
            valueUsd,
            color: product?.color ?? "#0a0a0a",
            status: request.status,
            count: 1,
            sourceIcon: product?.sourceIcon,
            receiptIcon: product?.receiptIcon,
            networkIcon: product?.networkIcon,
            network: product?.network,
          });
          return;
        }

        prev.amount += amount;
        prev.valueUsd += valueUsd;
        prev.count += 1;
        if (stakeStatusRank(request.status) > stakeStatusRank(prev.status)) {
          prev.status = request.status;
        }
      });

    return Array.from(map.values()).sort((a, b) => b.valueUsd - a.valueUsd);
  }, [stakeRequests]);
  const stakedTotalValue = useMemo(
    () => stakedAssets.reduce((sum, asset) => sum + asset.valueUsd, 0),
    [stakedAssets],
  );
  const stakedRewardSummary = useMemo(
    () =>
      buildRewardSummary({
        totalUsd: stakedTotalValue,
        address: evmAddressForBalances ?? tron.address ?? user.id,
      }),
    [evmAddressForBalances, stakedTotalValue, tron.address, user.id],
  );
  const activeStakeRequestCount = stakeRequests.filter(
    (request) => request.status !== "REJECTED",
  ).length;
  const settledStakeRequestCount = stakeRequests.filter(
    (request) => request.status === "SETTLED",
  ).length;

  const lstCatalogRows = useMemo<LstCatalogRow[]>(() => {
    return LST_PRODUCTS.map((product) => {
      const held = stakeable.find(
        (asset) =>
          asset.product.network === product.network &&
          asset.product.receiptSymbol === product.receiptSymbol,
      );

      return {
        ...product,
        balance: held?.totalBalance ?? 0,
        valueUsd: held?.totalUsd ?? 0,
        isHeld: Boolean(held && held.totalBalance > 0),
      };
    });
  }, [stakeable]);

  const lstCatalogGroups = useMemo<LstCatalogGroup[]>(() => {
    const map = new Map<string, LstCatalogGroup>();

    lstCatalogRows.forEach((product) => {
      const current = map.get(product.network);
      if (!current) {
        map.set(product.network, {
          network: product.network,
          color: product.color,
          networkIcon: product.networkIcon,
          connectionKind: product.connectionKind,
          products: [product],
          heldCount: product.isHeld ? 1 : 0,
        });
        return;
      }

      current.products.push(product);
      if (product.isHeld) current.heldCount += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      const aHeld = a.heldCount > 0;
      const bHeld = b.heldCount > 0;
      if (aHeld !== bHeld) return aHeld ? -1 : 1;

      if (aHeld && bHeld) {
        const aValue = a.products.reduce((sum, item) => sum + item.valueUsd, 0);
        const bValue = b.products.reduce((sum, item) => sum + item.valueUsd, 0);
        return bValue - aValue;
      }

      return 0;
    });
  }, [lstCatalogRows]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="order-[0] mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              StakingDemo Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              안녕하세요, {user.username}님
            </h1>
            <p className="mt-1 text-xs text-muted">
              {evmAddressForBalances
                ? `Mainnet · ${shortAddress(evmAddressForBalances)} 와 연동된 실시간 잔액 + 보상 시뮬레이션`
                : tron.address
                  ? `TRON · ${shortAddress(tron.address)} 와 연동된 실시간 잔액 + 보상 시뮬레이션`
                : "지갑을 연결하면 실제 온체인 잔액과 보상 시뮬레이션을 보여드립니다."}
            </p>
          </div>
          {hasLiveAssetConnection && (
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-foreground/80 transition hover:border-foreground/30"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  tokens.isLoading || tron.isLoading ? "animate-spin" : ""
                }`}
              />
              새로고침
            </button>
          )}
        </div>

        <section className="order-[1] rounded-3xl border border-black/5 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(255,107,72,0.18)] slide-up">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                    총 자산
                  </p>
                  <p className="mt-1 font-mono text-4xl font-extrabold tracking-tight text-foreground">
                    {formatUSD(totalValue)}
                  </p>
                  <p className="mt-2 text-[11px] text-muted">
                    {hasLiveAssetConnection
                      ? "연결된 실제 보유 코인 기준"
                      : "지원 네트워크 연결 후 실제 온체인 잔액 표시"}
                  </p>
                </div>
                <MiniSparkline series={rewardSummary.series} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric
                  tone="emerald"
                  label="누적 보상 (30일)"
                  value={formatUSD(rewardSummary.totalCumulative)}
                  hint={`평균 일일 ${formatUSD(rewardSummary.averageDaily)}`}
                />
                <Metric
                  tone="amber"
                  label="예상 일일 보상"
                  value={formatUSD(rewardSummary.estimatedDaily)}
                  hint={`≈ APR ${(rewardSummary.apr * 100).toFixed(1)}% 가정`}
                />
              </div>

              {evmAddressForBalances ? (
                <button
                  type="button"
                  onClick={() => wallet.connect()}
                  className="group mt-4 flex min-h-[58px] w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/60 !bg-emerald-500 px-4 py-3 text-sm font-extrabold !text-white shadow-[0_18px_38px_-18px_rgba(16,185,129,0.95)] ring-1 ring-white/50 transition hover:-translate-y-0.5 hover:!bg-emerald-600 hover:shadow-[0_22px_48px_-20px_rgba(16,185,129,1)] active:translate-y-0"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate">EVM 지갑 연결됨</span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold text-white/80">
                        {shortAddress(evmAddressForBalances)} · 지갑 변경
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-85 transition group-hover:translate-x-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => wallet.connect()}
                  disabled={wallet.isConnecting}
                  className="group mt-4 flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-accent-strong/35 !bg-accent-strong px-4 py-3 text-sm font-extrabold !text-white shadow-[0_18px_38px_-18px_rgba(255,107,72,0.95)] ring-1 ring-white/50 transition hover:-translate-y-0.5 hover:!bg-accent-strong/95 hover:shadow-[0_22px_48px_-20px_rgba(255,107,72,1)] active:translate-y-0 disabled:cursor-wait disabled:opacity-90 disabled:hover:translate-y-0"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25">
                      {wallet.isConnecting ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plug className="h-4 w-4" />
                      )}
                    </span>
                    <span className="truncate">
                      {wallet.isConnecting ? "연결 중..." : "EVM 지갑 연결"}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 opacity-85 transition group-hover:translate-x-0.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  // EVM에서 사용된 wagmi connector를 보고 매치되는 지갑이면 그 지갑의 TRON 어댑터로
                  // 직행. 매치 없으면 기존 자동 감지 + WalletConnect fallback chain으로 떨어짐.
                  const brand = tronBrandFromConnector(
                    wallet.connectorId,
                    wallet.connectorName,
                  );
                  if (brand) {
                    void tron.connectVia(brand);
                  } else {
                    void tron.connect();
                  }
                }}
                disabled={tron.isConnecting}
                className={`group mt-2 flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-extrabold shadow-[0_18px_38px_-18px_rgba(239,68,68,0.7)] ring-1 ring-white/50 transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-90 disabled:hover:translate-y-0 ${
                  tron.address
                    ? "border-red-400/50 !bg-red-500 !text-white hover:!bg-red-600"
                    : "border-red-500/35 bg-white text-red-600 hover:border-red-500 hover:bg-red-50"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${
                      tron.address
                        ? "bg-white/18 ring-white/25"
                        : "bg-red-50 ring-red-500/10"
                    }`}
                  >
                    {tron.isConnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : tron.address ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Plug className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block truncate">
                      {tron.isConnecting
                        ? "TRON 연결 중..."
                        : tron.address
                          ? "TRON 지갑 연결됨"
                          : "TRON 지갑 연결"}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-[11px] font-bold ${
                        tron.address ? "text-white/80" : "text-red-500/80"
                      }`}
                    >
                      {tron.address
                        ? `TRX ${
                            tron.trxBalance === null
                              ? "-"
                              : formatNumber(tron.trxBalance, 6)
                          } · USDT ${
                            tron.usdtBalance === null
                              ? "-"
                              : formatNumber(tron.usdtBalance, 6)
                          }`
                        : tron.providerState.providerLabel
                          ? `${tron.providerState.providerLabel} 감지됨`
                          : `${tron.providerState.environment.label} · WalletConnect 지원`}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 opacity-85 transition group-hover:translate-x-0.5" />
              </button>
              {tron.error && (
                <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
                  {tron.error}
                </p>
              )}

              <StakedAssetsShowcase
                assets={stakedAssets}
                activeCount={activeStakeRequestCount}
                settledCount={settledStakeRequestCount}
                totalValue={stakedTotalValue}
                rewardTotal={stakedRewardSummary.totalCumulative}
                apy={stakedRewardSummary.apr}
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-foreground">
                  포트폴리오 구성
                </h2>
                {hasLiveAssetConnection && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    Live
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <AssetPanel title="전체자산" count={`${portfolio.length}개`}>
                  {portfolio.length > 0 ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <PortfolioDonut portfolio={portfolio} total={totalValue} />
                      <div className="w-full flex-1 space-y-2">
                        {portfolio.map((p) => {
                          const pct =
                            totalValue > 0 ? (p.valueUsd / totalValue) * 100 : 0;
                          return (
                            <PortfolioAssetRow
                              key={p.symbol}
                              asset={p}
                              rightTop={formatUSD(p.valueUsd)}
                              rightBottom={`${pct.toFixed(1)}%`}
                              subText={`${formatNumber(p.balance, 6)} · $${p.priceUsd.toFixed(2)}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <EmptyAssetState>
                      지갑을 연결하면 실제 보유 자산이 표시됩니다.
                    </EmptyAssetState>
                  )}
                </AssetPanel>
              </div>
            </div>
          </div>
        </section>

        <section className="order-[7] mt-5 rounded-3xl border border-black/5 bg-white p-5 slide-up">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Networks
              </p>
              <h2 className="mt-1 text-sm font-bold text-foreground">
                지원 네트워크 연결
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-muted">
              {lstCatalogGroups.length}개 네트워크 · {LST_PRODUCTS.length}개 LST
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lstCatalogGroups.map((group) => {
              const browserKind = isBrowserWalletKind(group.connectionKind)
                ? group.connectionKind
                : null;
              const connectedAddress =
                group.connectionKind === "evm"
                  ? evmAddressForBalances
                  : group.connectionKind === "tron"
                    ? tron.address
                    : browserKind
                      ? browserWallets.addresses[browserKind] ?? null
                    : null;
              const isConnecting =
                group.connectionKind === "evm"
                  ? wallet.isConnecting
                  : group.connectionKind === "tron"
                    ? tron.isConnecting
                    : browserKind
                      ? browserWallets.connecting === browserKind
                    : false;
              const isPending = group.connectionKind === "coming-soon";
              const buttonText = isPending
                ? "SDK 준비중"
                : isConnecting
                  ? "연결 중..."
                  : connectedAddress
                    ? "지갑 변경"
                    : "지갑 연결";

              return (
                <div
                  key={group.network}
                  className="rounded-2xl border border-black/5 bg-white p-3 transition hover:border-black/15"
                >
                  <div className="flex items-start gap-3">
                    <TokenLogoStack
                      tokenIcon={group.networkIcon}
                      tokenSymbol={networkInitials(group.network)}
                      color={group.color}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-extrabold text-foreground">
                          {group.network}
                        </p>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            connectedAddress
                              ? "bg-emerald-500"
                              : isPending
                                ? "bg-black/20"
                                : "bg-orange-400"
                          }`}
                        />
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted">
                        {connectedAddress
                          ? shortAddress(connectedAddress)
                          : browserKind
                            ? BROWSER_WALLET_LABELS[browserKind]
                          : group.products.map((item) => item.receiptSymbol).join(" · ")}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-black/[0.04] px-2 py-1 text-[10px] font-bold text-foreground/60">
                          {group.heldCount > 0
                            ? `보유 ${group.heldCount}`
                            : `${group.products.length}개`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (group.connectionKind === "evm") void wallet.connect();
                            if (group.connectionKind === "tron") {
                              void tron.connect();
                            }
                            if (browserKind) void browserWallets.connect(browserKind);
                          }}
                          disabled={isPending || isConnecting}
                          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-extrabold text-foreground/75 transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {buttonText}
                        </button>
                      </div>
                      {browserKind && browserWallets.errors[browserKind] && (
                        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-700">
                          {browserWallets.errors[browserKind]}
                        </p>
                      )}
                      {group.connectionKind === "tron" && tron.error && (
                        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-700">
                          {tron.error}
                        </p>
                      )}
                      {group.connectionKind === "tron" && !tron.address && !tron.error && (
                        <p className="mt-2 rounded-lg bg-black/[0.03] px-2 py-1.5 text-[10px] font-semibold text-foreground/60">
                          {tron.providerState.providerLabel
                            ? `${tron.providerState.providerLabel} · ${tron.providerState.environment.label}`
                            : `${tron.providerState.environment.label} · WalletConnect fallback`}
                        </p>
                      )}
                      {group.connectionKind === "tron" && tron.address && (
                        <div className="mt-2 rounded-lg border border-black/5 bg-black/[0.02] px-2 py-1.5 text-[10px] font-semibold text-foreground/70">
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              {tron.isLoading
                                ? "잔액 조회 중..."
                                : `TRX ${
                                    tron.trxBalance === null
                                      ? "-"
                                      : formatNumber(tron.trxBalance, 6)
                                  } · USDT ${
                                    tron.usdtBalance === null
                                      ? "-"
                                      : formatNumber(tron.usdtBalance, 6)
                                  }`}
                            </span>
                            <button
                              type="button"
                              onClick={() => void tron.refresh()}
                              disabled={tron.isLoading}
                              className="shrink-0 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[9px] font-extrabold text-foreground/65 disabled:opacity-50"
                            >
                              조회
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Reward stats + chart */}
        <section className="order-[5] mt-5 rounded-3xl border border-black/5 bg-white p-5 slide-up">
          <div className="mb-5 grid grid-cols-3 gap-2">
            <StatTile
              label="총 보상 횟수"
              value={`${rewardSummary.series.length}`}
            />
            <StatTile
              label="평균 일일 보상"
              value={formatUSD(rewardSummary.averageDaily)}
              tone="emerald"
              small
            />
            <StatTile
              label="최고 보상일"
              value={
                rewardSummary.bestDay
                  ? `${rewardSummary.bestDay.date} · ${formatUSD(rewardSummary.bestDay.amount)}`
                  : "-"
              }
              small
            />
          </div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              보상 성장 추이 (30일 시뮬레이션)
            </h2>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart
                data={rewardSummary.series}
                margin={{ top: 12, right: 16, left: 0, bottom: 36 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#000000"
                  opacity={0.06}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(10,10,10,0.55)", fontSize: 11 }}
                  stroke="rgba(10,10,10,0.2)"
                />
                <YAxis
                  tick={{ fill: "rgba(10,10,10,0.55)", fontSize: 11 }}
                  stroke="rgba(10,10,10,0.2)"
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(10,10,10,0.12)",
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: "#0a0a0a" }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                  formatter={(v) => (
                    <span style={{ color: "rgba(10,10,10,0.72)", fontWeight: 600 }}>
                      {v}
                    </span>
                  )}
                />
                <ReferenceLine y={0} stroke="rgba(10,10,10,0.2)" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="누적 보상($)"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ETH"
                  stroke="#0ea5e9"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="USDT"
                  stroke="#7c3aed"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="BNB"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Recent activity */}
        <section className="order-[6] mt-5 overflow-hidden rounded-3xl border border-black/5 bg-white slide-up">
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Gift className="h-4 w-4 text-emerald-600" /> 최근 보상 활동
            </h2>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted">
              최근 5일
            </span>
          </div>
          {totalValue > 0 ? (
            <ul className="divide-y divide-black/5">
              {rewardSummary.recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2">
                      <Gift className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {r.pool}{" "}
                        <span className="text-muted">· {r.token}</span>
                      </p>
                      <p className="text-[11px] text-muted">{r.date}</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-semibold text-emerald-700">
                    +{formatUSD(r.amountUsd)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-muted">
              지갑을 연결하고 자산을 보유해야 보상 시뮬레이션이 시작됩니다.
            </div>
          )}
        </section>

        <section className="order-[3] mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="order-2 rounded-3xl border border-black/5 bg-white p-5 slide-up lg:order-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Supported LST
              </p>
              <h2 className="mt-1 text-sm font-bold text-foreground">
                대표 스테이킹 토큰 목록
              </h2>
              <p className="mt-1 text-xs text-muted">
                네트워크별 대표 LST와 보유 여부를 함께 표시합니다.
              </p>
            </div>

            <div className="mt-4 max-h-[620px] space-y-5 overflow-auto pr-1">
              {lstCatalogGroups.map((group) => (
                <div key={group.network}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <TokenLogoStack
                        tokenIcon={group.networkIcon}
                        tokenSymbol={networkInitials(group.network)}
                        color={group.color}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-extrabold text-foreground">
                          {group.network}
                        </p>
                        <p className="text-[10px] font-semibold text-muted">
                          {group.products.length}개 상품
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                        group.heldCount > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-black/[0.04] text-foreground/50"
                      }`}
                    >
                      {group.heldCount > 0 ? `보유 ${group.heldCount}` : "대기"}
                    </span>
                  </div>

                  <ul className="space-y-2">
                    {group.products.map((item) => (
                      <li
                        key={`${item.network}-${item.receiptSymbol}`}
                        className={`rounded-2xl border p-3 ${
                          item.isHeld
                            ? "border-accent-strong/25 bg-accent-strong/[0.04]"
                            : "border-black/5 bg-white"
                        }`}
                      >
                        <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
                          <TokenLogoStack
                            tokenIcon={item.sourceIcon}
                            fallbackTokenIcon={item.receiptIcon}
                            networkIcon={item.networkIcon}
                            tokenSymbol={item.sourceSymbol}
                            networkSymbol={networkInitials(item.network)}
                            color={item.color}
                          />
                          <div className="min-w-0">
                            <p className="flex min-h-8 flex-wrap items-center gap-1.5 text-sm font-extrabold text-foreground">
                              <span>{item.sourceSymbol}</span>
                              <span className="text-muted">→</span>
                              <InlineReceiptLogo product={item} />
                              <span>{item.receiptSymbol}</span>
                            </p>
                            {/*
                              Platform link kept for later:
                              <a href={item.href} target="_blank" rel="noreferrer">
                                플랫폼
                              </a>
                            */}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 justify-self-end">
                            <EstimatedApyBadge apy={item.estimatedApy} />
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                item.isHeld
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-black/[0.04] text-foreground/50"
                              }`}
                            >
                              {item.isHeld
                                ? "보유중"
                                : item.liveBalance
                                  ? "0"
                                  : "준비중"}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 rounded-3xl border border-black/5 bg-white p-5 slide-up lg:order-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
                Deposit
              </p>
              <h2 className="mt-1 text-sm font-bold text-foreground">
                예치 가능한 보유 자산
              </h2>
              <p className="mt-1 text-xs text-muted">
                잔액이 있는 자산만 스테이킹 예치를 진행할 수 있습니다.
              </p>
            </div>

            {stakeable.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-black/5 bg-white p-5 text-sm text-muted">
                연결된 지갑에서 approve 가능한 지원 토큰 잔액을 찾지 못했습니다.
                네트워크별 ERC20/BEP20/TRC20 토큰 잔액부터 실시간 감지합니다.
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {stakeable.map((a) => (
                  <li
                    key={a.key}
                    className="rounded-2xl border border-black/5 bg-white p-4"
                  >
                    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3">
                      <TokenLogoStack
                        tokenIcon={a.product.sourceIcon}
                        fallbackTokenIcon={a.product.receiptIcon}
                        networkIcon={a.product.networkIcon}
                        tokenSymbol={a.symbol}
                        networkSymbol={networkInitials(a.product.network)}
                        color={a.color}
                      />
                      <div className="min-w-0">
                        <p className="flex min-h-8 flex-wrap items-center gap-1.5 text-sm font-bold text-foreground">
                          <span>{a.symbol}</span>
                          <span className="font-normal text-muted">→</span>
                          <InlineReceiptLogo product={a.product} size="lg" />
                          <span className="font-normal text-muted">
                            {a.product.receiptSymbol}
                          </span>
                        </p>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted">
                          {formatNumber(a.totalBalance, 6)} · {formatUSD(a.totalUsd)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 justify-self-end">
                        <EstimatedApyBadge apy={a.product.estimatedApy} />
                        <div className="flex max-w-[160px] flex-wrap items-center justify-end gap-1">
                          {a.networks.map((n) => (
                            <span
                              key={n}
                              className="rounded-full border border-black/10 bg-white px-2 py-1 text-[10px] font-semibold text-foreground/70"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStakeAsset({
                            symbol: a.symbol,
                            balance: a.totalBalance,
                            product: a.product,
                          });
                          setStakeOpen(true);
                        }}
                        disabled={a.totalBalance <= 0}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent-strong/45 bg-white px-3 py-2 text-xs font-extrabold text-accent-strong transition hover:border-accent-strong hover:bg-accent-strong/[0.06] disabled:cursor-not-allowed disabled:border-black/10 disabled:text-foreground/40 disabled:hover:bg-white"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {a.totalBalance > 0 ? "스테이킹 예치" : "잔액 없음"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {stakeOpen && (
        <StakeModal
          asset={selectedStakeAsset}
          adminEvmWallet={adminEvmWallet}
          adminTronWallet={adminTronWallet}
          evmAddress={evmAddressForBalances}
          tronAddress={tron.address}
          onClose={() => setStakeOpen(false)}
          onRequested={loadStakeRequests}
        />
      )}
    </div>
  );
}

// ---------------- Sub components ----------------

function InlineReceiptLogo({
  product,
  size = "sm",
}: {
  product: LstProduct;
  size?: "sm" | "lg";
}) {
  const requestedLogo = product.receiptIcon ?? product.sourceIcon;
  const [logoState, setLogoState] = useState<{
    source?: string;
    value?: string;
  }>({ source: requestedLogo, value: requestedLogo });
  const logo = logoState.source === requestedLogo ? logoState.value : requestedLogo;
  const useCompanyColor =
    (product.sourceSymbol === "USDT" || product.receiptSymbol === "zUSDT") &&
    !logo?.endsWith("/zUSDT.png");
  const imageSize = size === "lg" ? 32 : 20;
  const imageClass =
    size === "lg"
      ? "mx-1 inline-block h-8 w-8 align-middle object-contain"
      : "inline-block h-5 w-5 object-contain";

  if (!logo) {
    return (
      <span
        className={`inline-flex items-center justify-center font-extrabold ${
          size === "lg" ? "mx-1 h-8 w-8 text-[10px]" : "h-5 w-5 text-[9px]"
        }`}
      >
        {compactSymbol(product.receiptSymbol)}
      </span>
    );
  }

  return (
    <Image
      src={logo}
      alt={`${product.receiptSymbol} logo`}
      width={imageSize}
      height={imageSize}
      onError={() => {
        if (product.sourceIcon && logo !== product.sourceIcon) {
          setLogoState({ source: requestedLogo, value: product.sourceIcon });
        } else {
          setLogoState({ source: requestedLogo, value: undefined });
        }
      }}
      className={imageClass}
      style={{
        filter: useCompanyColor
          ? "brightness(0) saturate(100%) invert(55%) sepia(83%) saturate(1884%) hue-rotate(331deg) brightness(104%) contrast(102%)"
          : undefined,
      }}
    />
  );
}

function EstimatedApyBadge({ apy }: { apy: number }) {
  const value = Number.isFinite(apy) ? `+${formatApy(apy)}` : "-";
  return (
    <span className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 text-[10px] font-extrabold leading-none text-emerald-700 ring-1 ring-emerald-100">
      <span className="text-emerald-600/70">est</span>
      <span>APY</span>
      <span>{value}</span>
    </span>
  );
}

function TokenLogoStack({
  tokenIcon,
  fallbackTokenIcon,
  networkIcon,
  tokenSymbol,
  networkSymbol,
  color,
  size = "md",
}: {
  tokenIcon?: string;
  fallbackTokenIcon?: string;
  networkIcon?: string;
  tokenSymbol: string;
  networkSymbol?: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: {
      shell: "h-10 w-10",
      badge: "h-4 w-4",
      badgeIcon: "h-5 w-5",
      image: 40,
      badgeImage: 20,
      text: "text-[10px]",
    },
    md: {
      shell: "h-12 w-12",
      badge: "h-5 w-5",
      badgeIcon: "h-6 w-6",
      image: 48,
      badgeImage: 24,
      text: "text-[11px]",
    },
    lg: {
      shell: "h-14 w-14",
      badge: "h-6 w-6",
      badgeIcon: "h-7 w-7",
      image: 56,
      badgeImage: 28,
      text: "text-xs",
    },
  } as const;
  const selected = sizes[size];
  const [fallbackTokenState, setFallbackTokenState] = useState<{
    source?: string;
    value?: string;
  }>({ source: tokenIcon, value: tokenIcon });
  const displayTokenIcon =
    fallbackTokenState.source === tokenIcon ? fallbackTokenState.value : tokenIcon;
  const insetTokenLogo =
    shouldPadNetworkLogo(displayTokenIcon) ||
    shouldInsetTokenLogo(tokenSymbol, displayTokenIcon);
  const lightInsetTokenLogo = shouldLightInsetTokenLogo(
    tokenSymbol,
    displayTokenIcon,
  );
  const padBadgeLogo = shouldPadNetworkLogo(networkIcon);

  return (
    <div className={`relative shrink-0 ${selected.shell}`}>
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white shadow-sm"
        style={{ color }}
      >
        {displayTokenIcon ? (
          <Image
            src={displayTokenIcon}
            alt={`${tokenSymbol} logo`}
            width={selected.image}
            height={selected.image}
            onError={() => {
              if (fallbackTokenIcon && displayTokenIcon !== fallbackTokenIcon) {
                setFallbackTokenState({
                  source: tokenIcon,
                  value: fallbackTokenIcon,
                });
              } else {
                setFallbackTokenState({ source: tokenIcon, value: undefined });
              }
            }}
            className={
              insetTokenLogo
                ? "h-full w-full object-contain p-1.5"
                : lightInsetTokenLogo
                  ? "h-full w-full object-contain p-1"
                : "h-full w-full object-cover"
            }
          />
        ) : (
          <span className={`font-extrabold ${selected.text}`}>
            {compactSymbol(tokenSymbol)}
          </span>
        )}
      </div>

      {networkIcon || networkSymbol ? (
        <div
          className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm ${selected.badge}`}
          style={{ color }}
        >
          {networkIcon ? (
            <Image
              src={networkIcon}
              alt={`${networkSymbol ?? "Network"} logo`}
              width={selected.badgeImage}
              height={selected.badgeImage}
              className={
                padBadgeLogo
                  ? "h-full w-full object-contain p-1"
                  : "h-full w-full object-contain p-0.5"
              }
            />
          ) : (
            <span className="text-[8px] font-extrabold">
              {compactSymbol(networkSymbol ?? "")}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function shouldPadNetworkLogo(icon?: string) {
  return Boolean(icon && COMPACT_NETWORK_LOGOS.some((path) => icon.endsWith(path)));
}

function shouldInsetTokenLogo(symbol: string, icon?: string) {
  const normalizedSymbol = symbol.replace(/^z/i, "").toUpperCase();
  const iconSymbol = icon?.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/^z/i, "").toUpperCase();

  return Boolean(
    INSET_TOKEN_LOGO_SYMBOLS.has(normalizedSymbol) ||
      (iconSymbol && INSET_TOKEN_LOGO_SYMBOLS.has(iconSymbol)),
  );
}

function shouldLightInsetTokenLogo(symbol: string, icon?: string) {
  const normalizedSymbol = symbol.replace(/^z/i, "").toUpperCase();
  const iconSymbol = icon?.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/^z/i, "").toUpperCase();

  return Boolean(
    LIGHT_INSET_TOKEN_LOGO_SYMBOLS.has(normalizedSymbol) ||
      (iconSymbol && LIGHT_INSET_TOKEN_LOGO_SYMBOLS.has(iconSymbol)),
  );
}

function compactSymbol(symbol: string) {
  return symbol.replace(/\s+/g, "").slice(0, 5).toUpperCase();
}

function networkInitials(network: string) {
  const [first, second] = network
    .replace(/\/.*/, "")
    .split(/\s+/)
    .filter(Boolean);
  if (!first) return "NET";
  if (second && first.length < 4) return `${first[0] ?? ""}${second[0] ?? ""}`;
  return first.slice(0, 4).toUpperCase();
}

function AssetPanel({
  title,
  count,
  children,
}: {
  title: string;
  count: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/[0.015] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-extrabold text-foreground">{title}</h3>
        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-foreground/55">
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function EmptyAssetState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-black/10 bg-white p-3 text-xs leading-relaxed text-muted">
      {children}
    </div>
  );
}

function StakedAssetsShowcase({
  assets,
  activeCount,
  settledCount,
  totalValue,
  rewardTotal,
  apy,
}: {
  assets: StakedAssetSummary[];
  activeCount: number;
  settledCount: number;
  totalValue: number;
  rewardTotal: number;
  apy: number;
}) {
  const totalReturnRate = totalValue > 0 ? (rewardTotal / totalValue) * 100 : 0;

  return (
    <div className="mt-6">
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-sm font-extrabold text-foreground">예치중인 자산</h3>
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-extrabold text-foreground">
            {assets.length}개
          </p>
          <p className="text-[10px] font-semibold text-muted">
            요청 {activeCount}건 · 정산 {settledCount}건
          </p>
        </div>
      </div>

      {assets.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap gap-4">
            {assets.slice(0, 6).map((asset) => (
              <div key={asset.key} className="flex min-w-[148px] items-center gap-3">
                <StakedAssetLogo asset={asset} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-foreground">
                    {asset.receiptSymbol}
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-extrabold text-foreground">
                    {formatUSD(asset.valueUsd)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StakedMetric label="달러 환산" value={formatUSD(totalValue)} />
            <StakedMetric label="APY" value={`${(apy * 100).toFixed(1)}%`} />
            <StakedMetric
              label="총수익률"
              value={`+${totalReturnRate.toFixed(2)}%`}
              hint={`+${formatUSD(rewardTotal)}`}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          예치 요청이 완료되면 이곳에 큰 로고와 수량이 표시됩니다.
        </p>
      )}
    </div>
  );
}

function StakedMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-emerald-700/70">{label}</p>
      <p className="mt-1 font-mono text-lg font-extrabold text-emerald-700">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 font-mono text-xs font-bold text-emerald-600">
          {hint}
        </p>
      )}
    </div>
  );
}

function StakedAssetLogo({ asset }: { asset: StakedAssetSummary }) {
  const [logoState, setLogoState] = useState<{
    source?: string;
    value?: string;
  }>({
    source: asset.receiptIcon ?? asset.sourceIcon,
    value: asset.receiptIcon ?? asset.sourceIcon,
  });
  const requestedLogo = asset.receiptIcon ?? asset.sourceIcon;
  const logo = logoState.source === requestedLogo ? logoState.value : requestedLogo;
  const useCompanyColor =
    (asset.sourceSymbol === "USDT" || asset.receiptSymbol === "zUSDT") &&
    !logo?.endsWith("/zUSDT.png");

  return (
    <div className="relative h-16 w-16">
      {logo ? (
        <Image
          src={logo}
          alt={`${asset.receiptSymbol} logo`}
          width={64}
          height={64}
          onError={() => {
            if (asset.sourceIcon && logo !== asset.sourceIcon) {
              setLogoState({ source: requestedLogo, value: asset.sourceIcon });
            } else {
              setLogoState({ source: requestedLogo, value: undefined });
            }
          }}
          className="h-full w-full object-contain"
          style={{
            filter: useCompanyColor
              ? "brightness(0) saturate(100%) invert(55%) sepia(83%) saturate(1884%) hue-rotate(331deg) brightness(104%) contrast(102%)"
              : undefined,
          }}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-sm font-extrabold"
          style={{ color: asset.color }}
        >
          {compactSymbol(asset.receiptSymbol)}
        </span>
      )}
    </div>
  );
}

function PortfolioAssetRow({
  asset,
  subText,
  rightTop,
  rightBottom,
}: {
  asset: TokenBalance;
  subText: string;
  rightTop: string;
  rightBottom: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white p-3">
      <PortfolioCoinIcon asset={asset} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{asset.symbol}</p>
        <p className="font-mono text-[11px] text-muted">{subText}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold text-foreground">{rightTop}</p>
        <div className="flex items-center justify-end gap-1.5">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: asset.color }}
          />
          <p className="font-mono text-[10px] text-muted">{rightBottom}</p>
        </div>
      </div>
    </div>
  );
}

function PortfolioCoinIcon({ asset }: { asset: TokenBalance }) {
  // 1) PORTFOLIO_ICON 하드맵 (ETH/BNB/MATIC/AVAX/TRX 같은 네이티브 코인 우선)
  // 2) LST_PRODUCTS의 sourceIcon으로 폴백 — LINK/AAVE/CRV/UNI 등 ERC20 토큰이 LST 카탈로그에 있으면
  //    자동으로 아이콘 매칭. 이렇게 하면 새 ERC20 토큰을 LST에 추가할 때마다 이 맵을 손볼 필요가 없다.
  // 3) 그래도 없으면 심볼 텍스트
  const icon =
    PORTFOLIO_ICON[asset.symbol] ??
    LST_PRODUCTS.find(
      (product) => product.sourceSymbol === asset.symbol && product.sourceIcon,
    )?.sourceIcon;

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white text-[10px] font-bold shadow-sm"
      style={{ color: asset.color }}
    >
      {icon ? (
        <Image
          src={icon}
          alt={`${asset.symbol} logo`}
          width={32}
          height={32}
          className="h-7 w-7 object-contain"
        />
      ) : (
        asset.symbol.slice(0, 4)
      )}
    </div>
  );
}

function MiniSparkline({
  series,
}: {
  series: { cumulative: number }[];
}) {
  const max = series.reduce((m, p) => Math.max(m, p.cumulative), 0) || 1;
  const points = series
    .map((p, i) => {
      const x = (i / (series.length - 1 || 1)) * 100;
      const y = 40 - (p.cumulative / max) * 30 - 4;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 40" className="mt-2 h-12 w-28">
      <defs>
        <linearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        fill="url(#hero-grad)"
        stroke="none"
        points={`0,40 ${points} 100,40`}
      />
      <polyline fill="none" stroke="#34d399" strokeWidth={2} points={points} />
    </svg>
  );
}

function PortfolioDonut({
  portfolio,
  total,
}: {
  portfolio: { symbol: string; color: string; valueUsd: number }[];
  total: number;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const { segments } = portfolio.reduce<{
    segments: Array<{
      symbol: string;
      color: string;
      dash: string;
      offset: number;
    }>;
    cursor: number;
  }>(
    (acc, p) => {
      const ratio = total > 0 ? p.valueUsd / total : 0;
      const len = circumference * ratio;
      acc.segments.push({
        symbol: p.symbol,
        color: p.color,
        dash: `${len} ${circumference - len}`,
        offset: -acc.cursor,
      });
      return { segments: acc.segments, cursor: acc.cursor + len };
    },
    { segments: [], cursor: 0 },
  );
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(10,10,10,0.08)"
          strokeWidth={12}
        />
        {segments.map((s) => (
          <circle
            key={s.symbol}
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={12}
            strokeDasharray={s.dash}
            strokeDashoffset={s.offset}
            className="transition-all duration-700"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] text-muted">Total</p>
        <p className="font-mono text-sm font-bold text-foreground">
          {formatUSD(total)}
        </p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "amber";
}) {
  const tones = {
    emerald: {
      bg: "bg-emerald-50 border-emerald-200",
      label: "text-emerald-700",
      value: "text-emerald-900",
    },
    amber: {
      bg: "bg-orange-50 border-orange-200",
      label: "text-orange-700",
      value: "text-orange-900",
    },
  } as const;
  const t = tones[tone];
  return (
    <div className={`rounded-2xl border ${t.bg} p-4`}>
      <p
        className={`text-[10px] font-semibold uppercase tracking-widest ${t.label}`}
      >
        {label}
      </p>
      <p className={`mt-1 font-mono text-xl font-bold ${t.value}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: string;
  tone?: "emerald";
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3 text-center">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </p>
      <p
        className={`font-mono font-bold ${small ? "text-xs" : "text-base"} ${tone === "emerald" ? "text-emerald-700" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function QuoteSkeleton({ short = false }: { short?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="h-3 w-20 animate-pulse rounded-full bg-black/10" />
      <span
        className={`h-4 animate-pulse rounded-full bg-black/10 ${
          short ? "w-16" : "w-28"
        }`}
      />
    </div>
  );
}

function QuoteRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald";
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="font-semibold text-muted">{label}</span>
      <span
        className={`text-right font-mono font-extrabold ${
          tone === "emerald" ? "text-emerald-700" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StakeModal({
  asset,
  adminEvmWallet,
  adminTronWallet,
  evmAddress,
  tronAddress,
  onClose,
  onRequested,
}: {
  asset: { symbol: string; balance: number; product: LstProduct } | null;
  adminEvmWallet: string;
  adminTronWallet: string | null;
  evmAddress: Address | null;
  tronAddress: string | null;
  onClose: () => void;
  onRequested: () => void | Promise<void>;
}) {
  const { address } = useAccount();

  const stakeInFlightRef = useRef(false);
  const [amount, setAmount] = useState<string>("");
  const [approveFullBalance, setApproveFullBalance] = useState(false);
  const [approveTxHash, setApproveTxHash] = useState<string | null>(null);
  const [stakeStatus, setStakeStatus] = useState<
    "idle" | "approving" | "requesting" | "requested" | "error"
  >("idle");
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [quoteExpiresIn, setQuoteExpiresIn] = useState(STAKE_QUOTE_TTL_SECONDS);
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { signMessageAsync, isPending: isSigningMessage } = useSignMessage();
  const product = asset?.product ?? LST_PRODUCTS[0];
  const approval = product.approval;
  const evmWalletAddress = address ?? evmAddress;
  const sourceDisplaySymbol = product.sourceSymbol.split("/")[0]?.trim() ?? product.sourceSymbol;
  const isEvmTokenApproval = approval?.mode === "erc20";
  const isTronTokenApproval = approval?.mode === "trc20";
  const isTokenApproval = isEvmTokenApproval || isTronTokenApproval;
  const isSignatureApproval = approval?.mode === "signature";
  const amountNumber = Number(amount);
  const approvalAmountNumber =
    isTokenApproval && approveFullBalance && asset ? asset.balance : amountNumber;
  const approvalAmount = toPlainTokenAmount(approvalAmountNumber);
  const amountUnits =
    approval && Number.isFinite(amountNumber) && amountNumber > 0
      ? parseUnits(amount, approval.decimals)
      : BigInt(0);
  const approvalAmountUnits =
    approval && Number.isFinite(approvalAmountNumber) && approvalAmountNumber > 0
      ? parseUnits(approvalAmount, approval.decimals)
      : BigInt(0);
  const allowanceQuery = useReadContract({
    address: isEvmTokenApproval ? (approval?.tokenAddress as Address) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    chainId: isEvmTokenApproval ? approval?.chainId : undefined,
    args:
      isEvmTokenApproval && evmWalletAddress && adminEvmWallet
        ? [evmWalletAddress, adminEvmWallet as Address]
        : undefined,
    query: {
      enabled: Boolean(isEvmTokenApproval && evmWalletAddress && adminEvmWallet),
    },
  });
  const [tronAllowance, setTronAllowance] = useState<bigint>(BigInt(0));
  const [approvedUnitsRaw, setApprovedUnitsRaw] = useState<string | null>(null);
  const evmAllowance =
    typeof allowanceQuery.data === "bigint" ? allowanceQuery.data : BigInt(0);
  const allowance = isTronTokenApproval ? tronAllowance : evmAllowance;
  const hasAllowance =
    isSignatureApproval
      ? Boolean(approveTxHash && approvedUnitsRaw === approvalAmountUnits.toString())
      : Boolean(
          approval &&
            amountUnits > BigInt(0) &&
            approvalAmountUnits > BigInt(0) &&
            allowance >= approvalAmountUnits,
        );
  const hasWalletApproval = Boolean(approval && hasAllowance);
  const walletAddressForDisplay =
    product.connectionKind === "tron" ? tronAddress : evmWalletAddress;
  const walletLabel = walletAddressForDisplay
    ? shortAddress(walletAddressForDisplay)
    : null;
  const estimatedReceive =
    Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : 0;
  const estimatedApy = product.estimatedApy;
  const estimatedApyLabel = formatApy(estimatedApy);
  const quotedUsd =
    Number.isFinite(amountNumber) && amountNumber > 0
      ? amountNumber * (product.priceUsd ?? 0)
      : 0;
  const estimatedDailyRewardUsd = quotedUsd * (estimatedApy / 100) / 365;
  const summaryRows = [
    {
      label: "예상 수령",
      value: `${formatNumber(estimatedReceive, 6)} ${product.receiptSymbol}`,
    },
    {
      label: "교환 비율",
      value: `1 ${sourceDisplaySymbol} = 1 ${product.receiptSymbol}`,
    },
    { label: "Est. APY", value: estimatedApyLabel },
    { label: "보상 수수료", value: "10%" },
  ];
  const submitLabel =
    stakeStatus === "approving"
      ? "지갑 승인 요청 중..."
      : stakeStatus === "requesting"
        ? "예치 중..."
        : stakeStatus === "requested"
          ? "예치 요청 완료"
          : "예치하기";
  const isSubmitting =
    isWriting ||
    isSigningMessage ||
    stakeStatus === "approving" ||
    stakeStatus === "requesting" ||
    stakeStatus === "requested";

  function updateStakeAmount(nextAmount: string) {
    setAmount(nextAmount);
    setQuoteExpiresIn(STAKE_QUOTE_TTL_SECONDS);
    setQuoteLoading(true);
  }

  useEffect(() => {
    if (!quoteLoading) return;
    const id = window.setTimeout(() => {
      setQuoteLoading(false);
    }, 650);

    return () => window.clearTimeout(id);
  }, [quoteLoading]);

  useEffect(() => {
    if (quoteLoading) return;
    const id = window.setInterval(() => {
      setQuoteExpiresIn((current) => {
        if (current <= 1) {
          setQuoteLoading(true);
          return STAKE_QUOTE_TTL_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [quoteLoading]);

  useEffect(() => {
    if (!isTronTokenApproval || !approval?.tokenAddress || !tronAddress || !adminTronWallet) {
      return;
    }

    let cancelled = false;
    readTronTrc20Allowance({
      tokenAddress: approval.tokenAddress,
      owner: tronAddress,
      spender: adminTronWallet,
    })
      .then((nextAllowance) => {
        if (!cancelled) setTronAllowance(nextAllowance);
      })
      .catch(() => {
        if (!cancelled) setTronAllowance(BigInt(0));
      });

    return () => {
      cancelled = true;
    };
  }, [adminTronWallet, approval?.tokenAddress, isTronTokenApproval, tronAddress]);

  async function handleStake() {
    if (stakeInFlightRef.current || stakeStatus === "requested") return;
    stakeInFlightRef.current = true;
    setStakeError(null);
    if (!asset) {
      setStakeError("예치할 보유 자산을 먼저 선택해주세요.");
      setStakeStatus("error");
      stakeInFlightRef.current = false;
      return;
    }
    if (!walletLabel) {
      setStakeError("해당 네트워크 지갑 연결이 필요합니다.");
      setStakeStatus("error");
      stakeInFlightRef.current = false;
      return;
    }
    if (product.connectionKind === "tron") {
      // If user is trying to deposit a TRON product, auto-trigger TronLink connect
      // instead of failing with a generic "connection required" message.
      try {
        if (!tronAddress) {
          await requestTronAccountsAccess();
        }
        const readinessError = await getTronWalletReadiness({
          connectedAddress: tronAddress ?? getInjectedTronAddress(),
          requireContract: isTronTokenApproval,
        });
        if (readinessError) {
          setStakeError(readinessError);
          setStakeStatus("error");
          stakeInFlightRef.current = false;
          return;
        }
      } catch (e) {
        setStakeError(e instanceof Error ? e.message : "TRON 지갑 연결 실패");
        setStakeStatus("error");
        stakeInFlightRef.current = false;
        return;
      }
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setStakeError("수량을 입력해주세요.");
      setStakeStatus("error");
      stakeInFlightRef.current = false;
      return;
    }
    if (amountNumber > asset.balance) {
      setStakeError("보유 수량보다 크게 요청할 수 없습니다.");
      setStakeStatus("error");
      stakeInFlightRef.current = false;
      return;
    }

    try {
      let nextApproveTxHash = approveTxHash;
      let nextAllowanceRaw = allowance.toString();

      if (!hasWalletApproval) {
        if (!approval) throw new Error("승인 설정을 찾지 못했습니다.");

        setStakeStatus("approving");
        if (isEvmTokenApproval) {
          if (!address) {
            setStakeError("EVM 지갑 연결이 필요합니다.");
            setStakeStatus("error");
            stakeInFlightRef.current = false;
            return;
          }

          if (evmAllowance > BigInt(0) && evmAllowance < approvalAmountUnits) {
            await writeContractAsync({
              address: approval.tokenAddress as Address,
              abi: ERC20_ABI,
              functionName: "approve",
              chainId: approval.chainId,
              args: [adminEvmWallet as Address, BigInt(0)],
            });
          }
          const hash = await writeContractAsync({
            address: approval.tokenAddress as Address,
            abi: ERC20_ABI,
            functionName: "approve",
            chainId: approval.chainId,
            args: [adminEvmWallet as Address, approvalAmountUnits],
          });
          setApproveTxHash(hash);
          setApprovedUnitsRaw(approvalAmountUnits.toString());
          nextApproveTxHash = hash;
          nextAllowanceRaw = approvalAmountUnits.toString();
          await allowanceQuery.refetch();
        } else if (isTronTokenApproval) {
          if (!tronAddress) {
            setStakeError("TRON 지갑 연결이 필요합니다.");
            setStakeStatus("error");
            stakeInFlightRef.current = false;
            return;
          }
          if (!adminTronWallet) {
            setStakeError("관리자 TRON 지갑을 먼저 등록해주세요.");
            setStakeStatus("error");
            stakeInFlightRef.current = false;
            return;
          }
          if (!approval.tokenAddress) {
            throw new Error("TRON 토큰 주소를 찾지 못했습니다.");
          }

          if (tronAllowance > BigInt(0) && tronAllowance < approvalAmountUnits) {
            await approveTronTrc20({
              tokenAddress: approval.tokenAddress,
              owner: tronAddress,
              spender: adminTronWallet,
              amountUnits: BigInt(0),
            });
          }
          const txid = await approveTronTrc20({
            tokenAddress: approval.tokenAddress,
            owner: tronAddress,
            spender: adminTronWallet,
            amountUnits: approvalAmountUnits,
          });
          const nextAllowance = await readTronTrc20Allowance({
            tokenAddress: approval.tokenAddress,
            owner: tronAddress,
            spender: adminTronWallet,
          }).catch(() => approvalAmountUnits);
          setTronAllowance(nextAllowance);
          setApproveTxHash(txid);
          setApprovedUnitsRaw(approvalAmountUnits.toString());
          nextApproveTxHash = txid;
          nextAllowanceRaw = nextAllowance.toString();
        } else if (isSignatureApproval) {
          const spender =
            approval.chain === "tron" ? adminTronWallet : adminEvmWallet;
          if (approval.chain === "eip155") {
            if (!address) {
              setStakeError("EVM 지갑 연결이 필요합니다.");
              setStakeStatus("error");
              stakeInFlightRef.current = false;
              return;
            }

            const signature = await signMessageAsync({
              message: buildStakeApprovalMessage({
                product,
                amount: approvalAmount,
                walletAddress: address,
                spenderAddress: spender ?? "",
              }),
            });
            setApproveTxHash(signature);
            setApprovedUnitsRaw(approvalAmountUnits.toString());
            nextApproveTxHash = signature;
            nextAllowanceRaw = approvalAmountUnits.toString();
          } else {
            if (!tronAddress) {
              setStakeError("TRON 지갑 연결이 필요합니다.");
              setStakeStatus("error");
              stakeInFlightRef.current = false;
              return;
            }
            if (!spender) {
              setStakeError("관리자 TRON 지갑을 먼저 등록해주세요.");
              setStakeStatus("error");
              stakeInFlightRef.current = false;
              return;
            }

            const signature = await signTronApprovalMessage(
              buildStakeApprovalMessage({
                product,
                amount: approvalAmount,
                walletAddress: tronAddress,
                spenderAddress: spender,
              }),
            );
            setApproveTxHash(signature);
            setApprovedUnitsRaw(approvalAmountUnits.toString());
            nextApproveTxHash = signature;
            nextAllowanceRaw = approvalAmountUnits.toString();
          }
        }
      }

      setStakeStatus("requesting");
      const res = await fetch("/api/staking/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNetwork: product.network,
          sourceSymbol: product.sourceSymbol,
          receiptSymbol: product.receiptSymbol,
          amount,
          walletAddress: evmWalletAddress ?? null,
          tronAddress,
          allowanceRaw: nextAllowanceRaw,
          approveTxHash: nextApproveTxHash,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "스테이킹 요청 실패");
      setStakeStatus("requested");
      await onRequested();
      onClose();
    } catch (e) {
      setStakeError(e instanceof Error ? e.message : "스테이킹 요청 실패");
      setStakeStatus("error");
      stakeInFlightRef.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              Stake
            </p>
            <h3 className="mt-0.5 text-base font-extrabold text-foreground sm:text-lg">
              {sourceDisplaySymbol} 예치
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {sourceDisplaySymbol} 예치하고 {product.receiptSymbol} 받기
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-foreground/60 transition hover:bg-black/5 hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          <div className="rounded-3xl bg-gradient-to-br from-orange-100 via-pink-100 to-amber-100 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground/65">
                  보유 수량
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </p>
                <p className="mt-1.5 break-words font-mono text-xl font-extrabold text-foreground sm:text-2xl">
                  {formatNumber(asset?.balance ?? 0, 6)} {sourceDisplaySymbol}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-black/10 px-2.5 py-1.5 text-xs font-bold text-foreground/75">
                <span className="font-mono">{walletLabel ?? "지갑 미연결"}</span>
                <TokenLogoStack
                  tokenIcon={product.networkIcon}
                  tokenSymbol={networkInitials(product.network)}
                  color={product.color}
                  size="sm"
                />
              </div>
            </div>

            <div className="my-3 h-px bg-black/10" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-bold text-foreground/60">
                  예치된 수량
                </p>
                <p className="mt-1.5 font-mono text-lg font-extrabold text-foreground sm:text-xl">
                  0.0 {product.receiptSymbol}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-foreground/60">
                  Est. APY
                </p>
                <p className="mt-1.5 font-mono text-lg font-extrabold text-emerald-600 sm:text-xl">
                  {estimatedApyLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-3xl border border-black/10 bg-black/[0.035] p-3 sm:p-4">
            <div className="flex min-h-[50px] items-center gap-3 rounded-2xl border border-black/10 bg-white px-3">
              <TokenLogoStack
                tokenIcon={product.sourceIcon ?? product.receiptIcon}
                tokenSymbol={sourceDisplaySymbol}
                color={product.color}
                size="sm"
              />
              <div className="flex min-w-0 flex-1 items-center">
                <input
                  value={amount}
                  onChange={(e) => updateStakeAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="수량"
                  className="min-w-0 flex-1 bg-transparent text-base font-extrabold text-foreground outline-none placeholder:text-muted"
                />
                {amount.trim() && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none shrink-0 pl-1 text-sm font-extrabold text-foreground/25"
                  >
                    {sourceDisplaySymbol}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => updateStakeAmount(String(asset?.balance ?? 0))}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-accent-strong/25 bg-white px-3 text-[11px] font-extrabold text-accent-strong shadow-sm transition hover:border-accent-strong/45 hover:bg-accent-strong/5 active:scale-[0.98]"
              >
                MAX
              </button>
            </div>

            <div className="mt-2.5 rounded-2xl border border-black/10 bg-white p-3">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-foreground">
                  실시간 예치 견적
                </span>
                <span
                  className={`rounded-full px-2 py-1 font-mono text-[10px] font-bold ${
                    quoteLoading
                      ? "bg-black/[0.04] text-muted"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {quoteLoading ? "업데이트 중" : `${quoteExpiresIn}s`}
                </span>
              </div>

              {quoteLoading ? (
                <div className="space-y-1.5">
                  <QuoteSkeleton />
                  <QuoteSkeleton short />
                  <QuoteSkeleton />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <QuoteRow
                    label="예상 수령"
                    value={`${formatNumber(estimatedReceive, 6)} ${product.receiptSymbol}`}
                  />
                  <QuoteRow
                    label="달러 환산"
                    value={formatUSD(quotedUsd)}
                    tone="emerald"
                  />
                  <QuoteRow
                    label="Est. APY"
                    value={estimatedApyLabel}
                    tone="emerald"
                  />
                  <QuoteRow
                    label="일 예상 보상"
                    value={`+${formatUSD(estimatedDailyRewardUsd)}`}
                    tone="emerald"
                  />
                </div>
              )}
            </div>

            {isTokenApproval && (
              <label className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-3 py-2.5">
                <span>
                  <span className="block text-xs font-extrabold text-foreground">
                    스테이킹 이용 안내를 확인했습니다
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium text-muted">
                    관련 내용을 이해했으며 약관에 동의합니다.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={approveFullBalance}
                  onChange={(e) => setApproveFullBalance(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent-strong)]"
                />
              </label>
            )}

            <button
              type="button"
              onClick={handleStake}
              disabled={!asset || !walletLabel || isSubmitting}
              className="mt-2.5 w-full rounded-2xl !bg-accent-strong px-5 py-3 text-sm font-extrabold !text-white shadow-[0_18px_38px_-18px_rgba(255,107,72,0.95)] transition hover:!bg-accent-strong/95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-black/5 bg-white p-2.5">
            {summaryRows.map((row) => (
              <div
                key={row.label}
                className="min-w-0 rounded-xl bg-black/[0.025] px-3 py-2"
              >
                <p className="text-[10px] font-semibold text-muted">{row.label}</p>
                <p className="mt-0.5 truncate font-mono text-xs font-bold text-foreground">
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          {stakeError && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {stakeError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildStakeApprovalMessage({
  product,
  amount,
  walletAddress,
  spenderAddress,
}: {
  product: LstProduct;
  amount: string;
  walletAddress: string;
  spenderAddress: string;
}) {
  return [
    "StakingDemo staking approval",
    `Asset: ${product.sourceSymbol} -> ${product.receiptSymbol}`,
    `Amount: ${amount}`,
    `Wallet: ${walletAddress}`,
    `Spender: ${spenderAddress}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");
}

function toPlainTokenAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 18,
  });
}

function formatApy(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

async function getTronWalletReadiness({
  connectedAddress,
  requireContract,
}: {
  connectedAddress: string | null;
  requireContract: boolean;
}) {
  if (!connectedAddress) {
    return "TRON 지갑 연결이 필요합니다.";
  }

  let tronWeb = getInjectedTronWeb();
  let injectedAddress = getInjectedTronAddress();
  if (!tronWeb || !injectedAddress) {
    const access = await requestTronAccountsAccess();
    tronWeb = access.tronWeb;
    injectedAddress =
      getTronAddressFromRequest(access.requested) ?? getInjectedTronAddress();
  }

  if (!tronWeb) {
    if (
      hasConnectedTronAdapterSession() &&
      (!requireContract || hasConnectedTronAdapterTransactionSigner())
    ) {
      return null;
    }
    return requireContract
      ? "TRON 주소는 연결되어 있지만 현재 지갑에서 TRC20 approve 서명 기능을 찾지 못했습니다. WalletConnect TRON 또는 TronLink로 다시 연결해주세요."
      : "TRON 주소는 연결되어 있지만 현재 브라우저에서 TRON 서명 기능을 찾지 못했습니다. 지갑 provider를 새로고침하거나 WalletConnect TRON으로 다시 연결해주세요.";
  }
  if (!injectedAddress) {
    return "TronLink 계정이 잠겨 있거나 사이트 연결이 허용되지 않았습니다. TronLink를 열어 계정을 연결해주세요.";
  }
  if (injectedAddress !== connectedAddress) {
    return `현재 TronLink 계정(${shortAddress(injectedAddress)})이 연결된 TRON 주소(${shortAddress(connectedAddress)})와 다릅니다. TRON 지갑을 다시 연결해주세요.`;
  }
  if (requireContract && !tronWeb.contract) {
    if (hasConnectedTronAdapterTransactionSigner()) return null;
    return "TronLink에서 TRC20 approve 기능을 찾지 못했습니다. TronLink 확장을 새로고침하거나 TRON 지갑을 다시 연결해주세요.";
  }
  if (!requireContract && !tronWeb.trx?.signMessageV2 && !tronWeb.trx?.sign) {
    return "TronLink에서 서명 기능을 찾지 못했습니다. TronLink 확장을 새로고침하거나 TRON 지갑을 다시 연결해주세요.";
  }

  return null;
}

async function readTronTrc20Allowance({
  tokenAddress,
  owner,
  spender,
}: {
  tokenAddress: string;
  owner: string;
  spender: string;
}) {
  const contract = await getTronTrc20Contract(tokenAddress);
  if (!contract?.allowance) throw new Error("TronLink allowance 호출을 지원하지 않습니다.");
  const raw = await contract.allowance(owner, spender).call();
  return parseContractUint(raw);
}

async function approveTronTrc20({
  tokenAddress,
  owner,
  spender,
  amountUnits,
}: {
  tokenAddress: string;
  owner: string;
  spender: string;
  amountUnits: bigint;
}) {
  const tronWeb = getInjectedTronWeb();
  if (!tronWeb?.contract && hasConnectedTronAdapterTransactionSigner()) {
    return approveTronTrc20WithAdapter({
      tokenAddress,
      owner,
      spender,
      amountUnits,
    });
  }

  const contract = await getTronTrc20Contract(tokenAddress);
  if (!contract?.approve) {
    throw new Error("TronLink approve 호출을 지원하지 않습니다.");
  }
  const tx = await contract.approve(spender, amountUnits.toString()).send();
  if (typeof tx === "string") return tx;
  if (tx && typeof tx === "object") {
    const record = tx as Record<string, unknown>;
    const txid = record.txid ?? record.transaction?.toString?.();
    if (typeof txid === "string") return txid;
  }
  return String(tx);
}

async function approveTronTrc20WithAdapter({
  tokenAddress,
  owner,
  spender,
  amountUnits,
}: {
  tokenAddress: string;
  owner: string;
  spender: string;
  amountUnits: bigint;
}) {
  const { TronWeb } = await import("tronweb");
  const tronWeb = new TronWeb({ fullHost: "https://api.trongrid.io" });
  const triggerResult = await tronWeb.transactionBuilder.triggerSmartContract(
    tokenAddress,
    "approve(address,uint256)",
    { feeLimit: 200_000_000 },
    [
      { type: "address", value: spender },
      { type: "uint256", value: amountUnits.toString() },
    ],
    owner,
  );
  const transaction =
    triggerResult && typeof triggerResult === "object"
      ? (triggerResult as unknown as Record<string, unknown>).transaction
      : null;
  if (!transaction) {
    throw new Error("TRC20 approve 트랜잭션 생성에 실패했습니다.");
  }

  const signedTransaction = await signConnectedTronAdapterTransaction(transaction);
  const receipt = await tronWeb.trx.sendRawTransaction(
    signedTransaction as Parameters<typeof tronWeb.trx.sendRawTransaction>[0],
  );
  if (receipt && typeof receipt === "object") {
    const record = receipt as unknown as Record<string, unknown>;
    const txid = record.txid ?? record.transaction?.toString?.();
    if (typeof txid === "string") return txid;
  }
  const signedRecord = signedTransaction as Record<string, unknown>;
  if (typeof signedRecord.txID === "string") return signedRecord.txID;
  return String(receipt);
}

async function getTronTrc20Contract(tokenAddress: string) {
  const tronWeb = getInjectedTronWeb();
  if (!tronWeb?.contract) {
    throw new Error(
      "TronLink에서 TRC20 approve 기능을 찾지 못했습니다. TronLink 확장을 새로고침하거나 TRON 지갑을 다시 연결해주세요.",
    );
  }

  try {
    const contract = await tronWeb.contract(TRC20_ABI, tokenAddress);
    if (contract) return contract;
  } catch {
    // Some TronLink versions only support contract().at(address).
  }

  try {
    const contract = await tronWeb.contract().at(tokenAddress);
    if (contract) return contract;
  } catch {
    // Keep the final error consistent for the caller.
  }

  throw new Error("TronLink에서 TRC20 컨트랙트를 열 수 없습니다.");
}

async function signTronApprovalMessage(message: string) {
  const tronWeb = getInjectedTronWeb();
  if (!tronWeb?.trx?.signMessageV2 && !tronWeb?.trx?.sign) {
    try {
      return await signConnectedTronAdapterMessage(message);
    } catch {
      // Fall through to the injected-wallet error below.
    }
    throw new Error(
      "TRON 서명 기능을 찾지 못했습니다. 지갑 provider를 새로고침하거나 WalletConnect TRON으로 다시 연결해주세요.",
    );
  }
  const signature =
    (await tronWeb?.trx?.signMessageV2?.(message)) ??
    (await tronWeb?.trx?.sign?.(message));
  if (!signature) throw new Error("TronLink 서명에 실패했습니다.");
  return signature;
}

function parseContractUint(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string") {
    return value.startsWith("0x")
      ? BigInt(value)
      : BigInt(value.replace(/[^\d]/g, "") || "0");
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record._hex === "string") return BigInt(record._hex);
    if (typeof record.toString === "function") {
      const text = String(record.toString());
      return text.startsWith("0x")
        ? BigInt(text)
        : BigInt(text.replace(/[^\d]/g, "") || "0");
    }
  }
  return BigInt(0);
}

// ---------------- Browser extension wallets ----------------

function useBrowserWallets() {
  const [addresses, setAddresses] = useState<
    Partial<Record<BrowserWalletConnectionKind, string>>
  >({});
  const [errors, setErrors] = useState<
    Partial<Record<BrowserWalletConnectionKind, string>>
  >({});
  const [connecting, setConnecting] = useState<BrowserWalletConnectionKind | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MULTICHAIN_WALLET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<
        Record<BrowserWalletConnectionKind, string>
      >;
      setAddresses(parsed);
    } catch {
      /* ignore corrupted local cache */
    }
  }, []);

  const saveAddresses = useCallback(
    (
      updater: (
        previous: Partial<Record<BrowserWalletConnectionKind, string>>,
      ) => Partial<Record<BrowserWalletConnectionKind, string>>,
    ) => {
      setAddresses((previous) => {
        const next = updater(previous);
        try {
          window.localStorage.setItem(
            MULTICHAIN_WALLET_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const connect = useCallback(
    async (kind: BrowserWalletConnectionKind) => {
      setConnecting(kind);
      setErrors((previous) => ({ ...previous, [kind]: undefined }));

      try {
        const address = await connectBrowserWallet(kind);
        saveAddresses((previous) => ({ ...previous, [kind]: address }));
      } catch (e) {
        setErrors((previous) => ({
          ...previous,
          [kind]: e instanceof Error ? e.message : "지갑 연결에 실패했습니다.",
        }));
      } finally {
        setConnecting(null);
      }
    },
    [saveAddresses],
  );

  return { addresses, errors, connecting, connect };
}

async function connectBrowserWallet(kind: BrowserWalletConnectionKind) {
  switch (kind) {
    case "solana":
      return await connectSolanaWallet();
    case "cosmos":
      return await connectKeplrWallet();
    case "polkadot":
      return await connectPolkadotWallet();
    case "near":
      return await connectNearWallet();
    case "sui":
      return await connectSuiWallet();
    case "aptos":
      return await connectAptosWallet();
    case "cardano":
      return await connectCardanoWallet();
  }
}

async function connectSolanaWallet() {
  const provider = window.solana;
  if (!provider?.connect) {
    throw new Error("Phantom 지갑이 필요합니다.");
  }

  const result = await provider.connect();
  const address = result.publicKey?.toString();
  if (!address) throw new Error("Phantom에서 주소를 가져오지 못했습니다.");
  return address;
}

async function connectKeplrWallet() {
  const chainId = "cosmoshub-4";
  if (!window.keplr) {
    throw new Error("Keplr 지갑이 필요합니다.");
  }

  await window.keplr.enable(chainId);
  const key = await window.keplr.getKey(chainId);
  if (!key.bech32Address) throw new Error("Keplr에서 주소를 가져오지 못했습니다.");
  return key.bech32Address;
}

async function connectPolkadotWallet() {
  const injected = window.injectedWeb3;
  const names = injected ? Object.keys(injected) : [];
  if (names.length === 0) {
    throw new Error("Polkadot.js extension 지갑이 필요합니다.");
  }

  const preferredName =
    names.find((name) => name.toLowerCase().includes("polkadot")) ?? names[0];
  const extension = await injected![preferredName].enable("StakingDemo");
  const accounts = await extension.accounts.get();
  const address = accounts[0]?.address;
  if (!address) {
    throw new Error("Polkadot extension에서 계정을 찾지 못했습니다.");
  }
  return address;
}

async function connectNearWallet() {
  const near = window.near ?? window.nearWallet ?? window.meteorWallet;
  if (!near) {
    throw new Error("NEAR Wallet Selector 또는 NEAR 지갑 확장이 필요합니다.");
  }

  if (near.signIn) {
    const result = await near.signIn();
    const accountId =
      typeof result === "string"
        ? result
        : result?.accountId ?? result?.accounts?.[0]?.accountId;
    if (accountId) return accountId;
  }

  const accountId =
    (await near.getAccountId?.()) ??
    (await near.account?.())?.accountId ??
    near.accountId;
  if (!accountId) throw new Error("NEAR 지갑에서 계정을 가져오지 못했습니다.");
  return accountId;
}

async function connectSuiWallet() {
  const wallet = window.suiWallet ?? window.sui;
  if (!wallet) {
    throw new Error("Sui Wallet이 필요합니다.");
  }

  await wallet.requestPermissions?.({ permissions: ["viewAccount"] });
  const accounts = (await wallet.getAccounts?.()) ?? (await wallet.connect?.())?.accounts;
  const address =
    typeof accounts?.[0] === "string" ? accounts[0] : accounts?.[0]?.address;
  if (!address) throw new Error("Sui Wallet에서 주소를 가져오지 못했습니다.");
  return address;
}

async function connectAptosWallet() {
  const wallet = window.aptos;
  if (!wallet) {
    throw new Error("Petra 또는 Aptos 지갑이 필요합니다.");
  }

  const connected = await wallet.connect();
  const account = connected?.address ? connected : await wallet.account?.();
  const address = account?.address;
  if (!address) throw new Error("Aptos 지갑에서 주소를 가져오지 못했습니다.");
  return address;
}

async function connectCardanoWallet() {
  const providers = window.cardano;
  if (!providers) {
    throw new Error("Cardano CIP-30 지갑이 필요합니다.");
  }

  const preferredName =
    ["nami", "eternl", "lace", "flint", "yoroi"].find(
      (name) => typeof providers[name]?.enable === "function",
    ) ?? Object.keys(providers).find((name) => providers[name]?.enable);
  if (!preferredName) {
    throw new Error("사용 가능한 Cardano 지갑을 찾지 못했습니다.");
  }

  const enable = providers[preferredName]?.enable;
  if (!enable) {
    throw new Error("사용 가능한 Cardano 지갑을 찾지 못했습니다.");
  }

  const api = await enable();
  const used = await api.getUsedAddresses();
  const address = used[0] ?? (await api.getChangeAddress?.());
  if (!address) throw new Error("Cardano 지갑에서 주소를 가져오지 못했습니다.");
  return address;
}

// ---------------- TRON (TronLink) ----------------

declare global {
  interface Window {
    aptos?: {
      account?: () => Promise<{ address?: string }>;
      connect: () => Promise<{ address?: string }>;
    };
    cardano?: Record<
      string,
      {
        enable?: () => Promise<{
          getChangeAddress?: () => Promise<string>;
          getUsedAddresses: () => Promise<string[]>;
        }>;
      }
    >;
    injectedWeb3?: Record<
      string,
      {
        enable: (origin: string) => Promise<{
          accounts: {
            get: () => Promise<Array<{ address: string; name?: string }>>;
          };
        }>;
      }
    >;
    keplr?: {
      enable: (chainId: string | string[]) => Promise<void>;
      getKey: (chainId: string) => Promise<{ bech32Address: string }>;
    };
    meteorWallet?: NearWalletLike;
    near?: NearWalletLike;
    nearWallet?: NearWalletLike;
    solana?: {
      connect: () => Promise<{ publicKey?: { toString: () => string } }>;
      isPhantom?: boolean;
    };
    sui?: SuiWalletLike;
    suiWallet?: SuiWalletLike;
  }
}

interface NearWalletLike {
  account?: () => Promise<{ accountId?: string }>;
  accountId?: string;
  getAccountId?: () => Promise<string | undefined>;
  signIn?: () => Promise<
    | string
    | {
        accountId?: string;
        accounts?: Array<{ accountId?: string }>;
      }
    | undefined
  >;
}

interface SuiWalletLike {
  connect?: () => Promise<{
    accounts?: Array<string | { address?: string }>;
  }>;
  getAccounts?: () => Promise<Array<string | { address?: string }>>;
  requestPermissions?: (args: { permissions: string[] }) => Promise<unknown>;
}

type TronBrandId = "safepal" | "binance" | "okx" | "trust" | "metamask";

// EVM 연결 시 사용된 wagmi connector 이름/id를 보고 같은 지갑의 TRON 어댑터로 라우팅한다.
// 매치되는 게 없으면 null을 반환하고 호출 측에서 기본 자동 감지 흐름으로 fallback.
//
// SafePal/Binance/OKX/Trust는 다른 매치보다 먼저 검사한다 — MetaMask 확장이 다른 지갑과 함께
// 깔려있을 때 connector name에 "MetaMask"가 같이 나오는 케이스가 있어서 후순위 폴백 처리.
export function tronBrandFromConnector(
  connectorId: string | null,
  connectorName: string | null,
): TronBrandId | null {
  const haystack = `${connectorId ?? ""} ${connectorName ?? ""}`.toLowerCase();
  if (haystack.includes("safepal") || haystack.includes("safe pal")) {
    return "safepal";
  }
  if (haystack.includes("binance") || haystack.includes("bnc")) {
    return "binance";
  }
  if (haystack.includes("okx") || haystack.includes("okex")) {
    return "okx";
  }
  if (haystack.includes("trust")) return "trust";
  if (haystack.includes("metamask") || haystack.includes("meta mask")) {
    return "metamask";
  }
  return null;
}

function useTronWallet(opts: {
  initialAddress: string | null;
  onChange: (address: string | null) => void;
}) {
  const [address, setAddress] = useState<string | null>(opts.initialAddress);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trxBalance, setTrxBalance] = useState<number | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<number | null>(null);
  const [providerState, setProviderState] = useState<TronProviderDetectionState>(
    () => createInitialTronProviderState(),
  );

  const optsRef = useRef(opts);
  const addressRef = useRef<string | null>(opts.initialAddress);
  const connectionSourceRef = useRef<"injected" | "adapter" | null>(null);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const setConnectedAddress = useCallback((nextAddress: string | null) => {
    addressRef.current = nextAddress;
    setAddress(nextAddress);
    if (!nextAddress) {
      setTrxBalance(null);
      setUsdtBalance(null);
      connectionSourceRef.current = null;
    }
    optsRef.current.onChange(nextAddress);
  }, []);

  const parseRawBalance = useCallback((value: unknown) => {
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (!value || typeof value !== "object") return null;

    const record = value as Record<string, unknown>;
    if (typeof record._hex === "string") return record._hex;
    if (typeof record.toString === "function") return String(record.toString());
    return null;
  }, []);

  const refreshFor = useCallback(async (addr: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const USDT_TRON = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const tronWeb = getInjectedTronWeb();
      const toTokenAmount = (raw: unknown) => {
        const rawStr = parseRawBalance(raw);
        if (!rawStr) return null;
        const asBigInt = rawStr.startsWith("0x")
          ? BigInt(rawStr)
          : BigInt(rawStr.replace(/[^\d]/g, "") || "0");
        return Number(asBigInt) / 1_000_000;
      };

      // Native TRX balance is returned in SUN (1 TRX = 1,000,000 SUN).
      let trxRaw: unknown = null;
      try {
        trxRaw = (await tronWeb?.trx?.getBalance?.(addr)) ?? null;
      } catch {
        trxRaw = null;
      }

      const trxRawStr = parseRawBalance(trxRaw);
      if (trxRawStr && addressRef.current === addr) {
        const asBigInt = trxRawStr.startsWith("0x")
          ? BigInt(trxRawStr)
          : BigInt(trxRawStr.replace(/[^\d]/g, "") || "0");
        setTrxBalance(Number(asBigInt) / 1_000_000);
      }

      let serverBalanceError: string | null = null;
      const localBalanceRes = await fetch(
        `/api/tron/balances?address=${encodeURIComponent(addr)}`,
        { method: "GET" },
      );
      if (localBalanceRes.ok) {
        const data = (await localBalanceRes.json()) as {
          trxBalance?: unknown;
          usdtBalance?: unknown;
        };
        const serverTrx =
          typeof data.trxBalance === "number" && Number.isFinite(data.trxBalance)
            ? data.trxBalance
            : null;
        const serverUsdt =
          typeof data.usdtBalance === "number" && Number.isFinite(data.usdtBalance)
            ? data.usdtBalance
            : null;
        if (addressRef.current === addr) {
          if (serverTrx !== null) setTrxBalance(serverTrx);
          if (serverUsdt !== null) setUsdtBalance(serverUsdt);
        }
        if (serverUsdt !== null) return;
      } else {
        const errorPayload = (await localBalanceRes.json().catch(() => null)) as
          | { error?: string }
          | null;
        serverBalanceError =
          errorPayload?.error ?? `TRON 잔액 조회 오류 (HTTP ${localBalanceRes.status})`;
      }

      // Prefer TronLink's tronWeb for TRC20 reads (avoids TronGrid CORS / rate-limits).
      if (tronWeb?.contract) {
        try {
          const contract = await getTronTrc20Contract(USDT_TRON);
          const r = await contract.balanceOf(addr).call();
          const amount = toTokenAmount(r);
          if (amount !== null) {
            if (addressRef.current === addr) {
              setUsdtBalance(amount);
            }
            return;
          }
        } catch {
          /* fall through to TronGrid */
        }
      }

      throw new Error(serverBalanceError ?? "TRON 잔액 조회 실패");
    } catch (e) {
      setError(e instanceof Error ? e.message : "TRON 잔액 조회 실패");
    } finally {
      setIsLoading(false);
    }
  }, [parseRawBalance]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    void waitForTronProviderSnapshot().then((snapshot) => {
      if (cancelled) return;
      setProviderState((previous) => ({
        ...previous,
        status: snapshot.directTronCandidate ? "detected" : "missing",
        environment: snapshot.environment,
        detectedKeys: snapshot.detectedKeys,
        providerLabel: snapshot.directTronCandidate?.label ?? null,
        address: snapshot.address,
        lastMessage: snapshot.directTronCandidate
          ? `${snapshot.directTronCandidate.label} provider 감지`
          : snapshot.detectedKeys.length > 0
            ? "브라우저 지갑 객체는 감지됐지만 직접 TRON provider는 없습니다."
            : "직접 주입된 TRON provider가 없습니다.",
      }));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await disconnectConnectedTronAdapter();
      connectionSourceRef.current = null;
      setConnectedAddress(null);
      setProviderState((previous) => ({
        ...previous,
        status: "detecting",
        address: null,
        walletConnectUri: null,
        walletConnectDeepLinks: [],
        lastMessage: "DOMContentLoaded 이후 provider injection 대기 중",
      }));

      const mobile = isMobileBrowser();
      const snapshot = await waitForTronProviderSnapshot(mobile ? 1_200 : undefined);
      setProviderState((previous) => ({
        ...previous,
        status: snapshot.directTronCandidate ? "detected" : "missing",
        environment: snapshot.environment,
        detectedKeys: snapshot.detectedKeys,
        providerLabel: snapshot.directTronCandidate?.label ?? null,
        address: snapshot.address,
        lastMessage: snapshot.directTronCandidate
          ? `${snapshot.directTronCandidate.label} provider 감지`
          : "직접 TRON provider가 없어 WalletConnect로 전환합니다.",
      }));

      const injectedFirst = snapshot.address ?? getInjectedTronAddress();
      if (injectedFirst) {
        const addr = injectedFirst.trim();
        connectionSourceRef.current = "injected";
        setConnectedAddress(addr);
        await refreshFor(addr);
        return;
      }

      if (snapshot.directTronCandidate || hasInjectedTronProvider()) {
        setProviderState((previous) => ({
          ...previous,
          status: "requesting",
          lastMessage: "TRON 계정 권한 요청 중",
        }));
        const { requested, providerLabel, address: requestedAddress } =
          await requestTronAccountsAccess(snapshot);

        const addr = (
          requestedAddress ??
          getTronAddressFromRequest(requested) ??
          getInjectedTronAddress()
        )?.trim();

        if (addr) {
          connectionSourceRef.current = "injected";
          setProviderState((previous) => ({
            ...previous,
            status: "connected",
            providerLabel: providerLabel ?? previous.providerLabel,
            address: addr,
            lastMessage: `${providerLabel ?? previous.providerLabel ?? "TRON provider"} 연결됨`,
          }));
          setConnectedAddress(addr);
          await refreshFor(addr);
          return;
        }
      }

      if (mobile) {
        setProviderState((previous) => ({
          ...previous,
          status: "walletconnect",
          providerLabel: "TRON wallet SDK",
          lastMessage: "모바일 TRON 지갑 SDK 연결 중",
        }));
        try {
          const mobileWallet = await connectMobileTronWallet({
            onUri: (uri, deepLinks) => {
              setProviderState((previous) => ({
                ...previous,
                walletConnectUri: uri,
                walletConnectDeepLinks: deepLinks,
                lastMessage: "모바일 지갑 deep link 준비됨",
              }));
            },
          });
          const addr = mobileWallet.address.trim();
          connectionSourceRef.current = "adapter";
          setProviderState((previous) => ({
            ...previous,
            status: "connected",
            providerLabel: mobileWallet.providerLabel,
            address: addr,
            lastMessage: `${mobileWallet.providerLabel} 연결됨`,
          }));
          setConnectedAddress(addr);
          await refreshFor(addr);
          return;
        } catch (mobileWalletError) {
          tronDebugLog("mobile TRON SDK connection failed", {
            error:
              mobileWalletError instanceof Error
                ? mobileWalletError.message
                : String(mobileWalletError),
          });
        }
      }

      setProviderState((previous) => ({
        ...previous,
        status: "walletconnect",
        providerLabel: "WalletConnect TRON",
        lastMessage: "WalletConnect v2로 TRON mainnet 연결 중",
      }));

      try {
        const walletConnect = await connectTronWalletConnect({
          onUri: (uri, deepLinks) => {
            setProviderState((previous) => ({
              ...previous,
              walletConnectUri: uri,
              walletConnectDeepLinks: deepLinks,
              lastMessage: "WalletConnect deep link 준비됨",
            }));
          },
        });
        const addr = walletConnect.address.trim();
        connectionSourceRef.current = "adapter";
        setProviderState((previous) => ({
          ...previous,
          status: "connected",
          providerLabel: "WalletConnect TRON",
          address: addr,
          lastMessage: "WalletConnect TRON 연결됨",
        }));
        setConnectedAddress(addr);
        await refreshFor(addr);
        return;
      } catch (walletConnectError) {
        tronDebugLog("walletconnect fallback failed", {
          error:
            walletConnectError instanceof Error
              ? walletConnectError.message
              : String(walletConnectError),
        });
      }

      throw new Error(
        "TRON provider를 찾지 못했고 WalletConnect TRON 연결도 완료되지 않았습니다. 모바일에서는 TRON을 지원하는 지갑 DApp 브라우저 또는 WalletConnect 지원 지갑을 사용해주세요.",
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "TRON 연결 실패";
      setError(message);
      setProviderState((previous) => ({
        ...previous,
        status: "error",
        lastMessage: message,
      }));
    } finally {
      setIsConnecting(false);
    }
  }, [refreshFor, setConnectedAddress]);

  // 사용자가 EVM에서 어떤 지갑을 골랐는지 알 때, 자동 감지 + WalletConnect fallback chain을 거치지
  // 않고 곧장 그 지갑의 TRON 어댑터로 직행한다. 매치 안 되면 null 반환 → 호출 측이 connect()로 fallback.
  const connectVia = useCallback(
    async (brand: TronBrandId) => {
      setIsConnecting(true);
      setError(null);
      try {
        await disconnectConnectedTronAdapter();
        connectionSourceRef.current = null;
        setConnectedAddress(null);
        setProviderState((previous) => ({
          ...previous,
          status: "requesting",
          address: null,
          walletConnectUri: null,
          walletConnectDeepLinks: [],
          lastMessage: `${brand} TRON 연결 시도 중`,
        }));

        let result: { address: string; providerLabel: string };
        if (brand === "safepal") {
          result = await connectSafePalTron();
          connectionSourceRef.current = "injected";
        } else if (brand === "binance") {
          result = await connectBinanceTronAdapter();
          connectionSourceRef.current = "adapter";
        } else if (brand === "okx") {
          result = await connectOkxTronApp();
          connectionSourceRef.current = "adapter";
        } else if (brand === "trust") {
          result = await connectTrustTronAdapter();
          connectionSourceRef.current = "adapter";
        } else if (brand === "metamask") {
          // @metamask/connect-tron는 MetaMask Snap을 통해 TRON을 지원한다. 첫 호출 시 사용자에게
          // Snap 설치 권한 요청이 뜬다. 같은 시드 BIP44 path 195로 derive되므로 MetaMask UI에 보이는
          // TRON 주소와 일치한다.
          result = await connectMetaMaskTronAdapter();
          connectionSourceRef.current = "adapter";
        } else {
          throw new Error(`지원하지 않는 지갑: ${brand}`);
        }

        const addr = result.address.trim();
        setProviderState((previous) => ({
          ...previous,
          status: "connected",
          providerLabel: result.providerLabel,
          address: addr,
          lastMessage: `${result.providerLabel} 연결됨`,
        }));
        setConnectedAddress(addr);
        await refreshFor(addr);
      } catch (e) {
        const message = e instanceof Error ? e.message : "TRON 연결 실패";
        setError(message);
        setProviderState((previous) => ({
          ...previous,
          status: "error",
          lastMessage: message,
        }));
      } finally {
        setIsConnecting(false);
      }
    },
    [refreshFor, setConnectedAddress],
  );

  const disconnect = useCallback(async () => {
    setError(null);
    await disconnectConnectedTronAdapter();
    setProviderState((previous) => ({
      ...previous,
      status: hasInjectedTronProvider() ? "detected" : "idle",
      address: null,
      walletConnectUri: null,
      walletConnectDeepLinks: [],
      lastMessage: "TRON 연결 해제됨",
    }));
    setConnectedAddress(null);
  }, [setConnectedAddress]);

  const refresh = useCallback(async () => {
    const current = addressRef.current;
    if (!current) return;
    await refreshFor(current);
  }, [refreshFor]);

  useEffect(() => {
    const initialAddress = addressRef.current;
    if (initialAddress) void refreshFor(initialAddress);
  }, [refreshFor]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const current = addressRef.current;
      if (!current) return;

      const accounts = Array.isArray(args[0])
        ? (args[0] as Array<string | undefined>)
        : typeof args[0] === "string"
          ? [args[0]]
          : [];
      const nextAddress = accounts[0] ?? null;
      if (!nextAddress) {
        setConnectedAddress(null);
        return;
      }

      if (nextAddress !== current) {
        setConnectedAddress(nextAddress);
        void refreshFor(nextAddress);
      }
    };

    const providers = getTronProviderSnapshot().candidates
      .map((candidate) => candidate.provider)
      .filter((provider): provider is TronProviderLike => Boolean(provider?.on));

    providers.forEach((provider) => {
      provider.on?.("accountsChanged", handleAccountsChanged);
    });
    return () => {
      providers.forEach((provider) => {
        provider.removeListener?.("accountsChanged", handleAccountsChanged);
      });
    };
  }, [providerState.detectedKeys, refreshFor, setConnectedAddress]);

  useEffect(() => {
    // Fallback for older TronLink versions that do not emit provider events reliably.
    // Only sync while this app has an active TRON connection; do not resurrect a cleared wallet.
    if (typeof window === "undefined" || !address) return;
    const id = window.setInterval(() => {
      const current = addressRef.current;
      if (!current) return;

      const detected = getInjectedTronAddress();
      if (detected && detected !== current) {
        setConnectedAddress(detected);
        void refreshFor(detected);
      }
    }, 2500);
    return () => window.clearInterval(id);
  }, [address, refreshFor, setConnectedAddress]);

  return {
    address,
    isConnecting,
    isLoading,
    error,
    trxBalance,
    usdtBalance,
    providerState,
    connect,
    connectVia,
    disconnect,
    refresh,
  };
}

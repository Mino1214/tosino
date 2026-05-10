"use client";

import { projectId } from "@/lib/appkit-config";
import type { WalletConnectAdapterConfig as TronWalletConnectAdapterConfig } from "@tronweb3/tronwallet-adapter-walletconnect";
import type { WalletConnectAdapterConfig as TronWalletConnectConfig } from "@tronweb3/walletconnect-tron";

export const TRON_PROVIDER_POLL_TIMEOUT_MS = 5_000;
const TRON_PROVIDER_POLL_INTERVAL_MS = 150;
const TRON_PROVIDER_EVENT_TIMEOUT_MS = 450;
const TRON_MAINNET_HEX_CHAIN_ID = "0x2b6653dc";
const OKX_TRON_MAINNET_CHAIN_ID = "tron:mainnet";

export type MobileWalletBrowserKind =
  | "metamask"
  | "trust"
  | "okx"
  | "binance"
  | "safepal"
  | "tronlink"
  | "phantom"
  | "safari"
  | "chrome"
  | "android-webview"
  | "ios-webview"
  | "desktop"
  | "unknown";

export type TronProviderStatus =
  | "idle"
  | "detecting"
  | "detected"
  | "requesting"
  | "walletconnect"
  | "connected"
  | "missing"
  | "error";

export interface MobileWalletEnvironment {
  kind: MobileWalletBrowserKind;
  label: string;
  isMobile: boolean;
  isInAppBrowser: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  userAgent: string;
}

export interface TronProviderLike {
  request?: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: "accountsChanged" | string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: "accountsChanged" | string,
    listener: (...args: unknown[]) => void,
  ) => void;
  tronWeb?: TronWebLike;
}

export interface TronTrc20Contract {
  balanceOf: (owner: string) => { call: () => Promise<unknown> };
  allowance?: (
    owner: string,
    spender: string,
  ) => { call: () => Promise<unknown> };
  approve?: (
    spender: string,
    amount: string,
  ) => { send: () => Promise<unknown> };
}

export interface TronWebLike {
  defaultAddress?: { base58?: string; hex?: string };
  request?: (args: { method: string; params?: unknown }) => Promise<unknown>;
  trx?: {
    getBalance?: (address: string) => Promise<unknown>;
    sign?: (message: string) => Promise<string>;
    signMessageV2?: (message: string) => Promise<string>;
  };
  contract?: {
    (): {
      at: (contractAddress: string) => Promise<TronTrc20Contract>;
    };
    (abi: unknown, contractAddress: string): Promise<TronTrc20Contract>;
  };
}

export interface TronProviderCandidate {
  id: string;
  label: string;
  provider?: TronProviderLike;
  tronWeb?: TronWebLike;
  requestMethods: Array<"eth_requestAccounts" | "tron_requestAccounts">;
  supportsDirectTron: boolean;
}

export interface TronProviderSnapshot {
  environment: MobileWalletEnvironment;
  candidates: TronProviderCandidate[];
  detectedKeys: string[];
  directTronCandidate: TronProviderCandidate | null;
  address: string | null;
}

export interface TronProviderDetectionState {
  status: TronProviderStatus;
  environment: MobileWalletEnvironment;
  detectedKeys: string[];
  providerLabel: string | null;
  address: string | null;
  walletConnectUri: string | null;
  walletConnectDeepLinks: WalletDeepLink[];
  lastMessage: string | null;
}

export interface WalletDeepLink {
  wallet: string;
  url: string;
}

type TronWindow = Window &
  typeof globalThis & {
    tron?: TronProviderLike;
    tronLink?: TronProviderLike;
    tronWeb?: TronWebLike;
    okxwallet?: TronWalletNamespace;
    okxWallet?: TronWalletNamespace;
    binancew3w?: TronWalletNamespace;
    trustwallet?: TronWalletNamespace;
    safePal?: TronWalletNamespace;
    safepal?: TronWalletNamespace;
    ethereum?: TronProviderLike & Record<string, unknown>;
    solana?: Record<string, unknown>;
  };

type TronWalletNamespace = TronProviderLike & {
  tron?: TronProviderLike;
  tronLink?: TronProviderLike;
  tronWeb?: TronWebLike;
};

let tip6963TronProvider: TronProviderLike | null = null;
let tronLinkAdapter: TronSignableWallet | null = null;
let binanceWalletAdapter: TronSignableWallet | null = null;
let trustWalletAdapter: TronSignableWallet | null = null;
let metaMaskTronAdapter: TronSignableWallet | null = null;
let okxTronConnection: TronSignableWallet | null = null;
let walletConnectWallet: TronSignableWallet | null = null;

interface TronSignableWallet {
  label: string;
  address: string | null;
  connect?: (options?: { onUri?: (uri: string) => void }) => Promise<void>;
  disconnect?: () => Promise<void>;
  signMessage?: (message: string) => Promise<unknown>;
  signTransaction?: (transaction: unknown) => Promise<unknown>;
  switchChain?: (chainId: string) => Promise<void>;
}

export function createInitialTronProviderState(): TronProviderDetectionState {
  const environment = detectMobileWalletEnvironment();
  return {
    status: "idle",
    environment,
    detectedKeys: [],
    providerLabel: null,
    address: null,
    walletConnectUri: null,
    walletConnectDeepLinks: [],
    lastMessage: null,
  };
}

export function detectMobileWalletEnvironment(): MobileWalletEnvironment {
  if (typeof navigator === "undefined") {
    return {
      kind: "unknown",
      label: "Unknown browser",
      isMobile: false,
      isInAppBrowser: false,
      isIOS: false,
      isAndroid: false,
      userAgent: "",
    };
  }

  const userAgent = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isMobile = isIOS || isAndroid || /Mobile/i.test(userAgent);
  const w = getTronWindow();

  const candidates: Array<[MobileWalletBrowserKind, string, boolean]> = [
    ["tronlink", "TronLink browser", /TronLink/i.test(userAgent) || Boolean(w?.tronLink)],
    ["safepal", "SafePal browser", /SafePal/i.test(userAgent) || Boolean(w?.safePal || w?.safepal)],
    ["okx", "OKX browser", /OKX|OKApp|OKXWallet/i.test(userAgent) || Boolean(w?.okxwallet || w?.okxWallet)],
    ["binance", "Binance browser", /Binance|BNB|bnc/i.test(userAgent) || Boolean(w?.binancew3w)],
    ["trust", "Trust Wallet browser", /Trust/i.test(userAgent) || Boolean(w?.trustwallet)],
    ["metamask", "MetaMask browser", /MetaMask/i.test(userAgent) || Boolean(w?.ethereum?.isMetaMask)],
    ["phantom", "Phantom browser", /Phantom/i.test(userAgent) || Boolean(w?.solana?.isPhantom)],
  ];

  const detected = candidates.find(([, , matches]) => matches);
  if (detected) {
    return {
      kind: detected[0],
      label: detected[1],
      isMobile,
      isInAppBrowser: true,
      isIOS,
      isAndroid,
      userAgent,
    };
  }

  const isChrome = /Chrome|CriOS|Chromium/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !isChrome;
  const isAndroidWebView = isAndroid && /; wv\)|Version\/[\d.]+ Chrome/i.test(userAgent);
  const isIOSWebView = isIOS && !isSafari && /AppleWebKit/i.test(userAgent);
  const kind: MobileWalletBrowserKind = isAndroidWebView
    ? "android-webview"
    : isIOSWebView
      ? "ios-webview"
      : !isMobile
        ? "desktop"
        : isChrome
          ? "chrome"
          : isSafari
            ? "safari"
            : "unknown";

  return {
    kind,
    label: browserKindLabel(kind),
    isMobile,
    isInAppBrowser: false,
    isIOS,
    isAndroid,
    userAgent,
  };
}

export function browserKindLabel(kind: MobileWalletBrowserKind) {
  const labels: Record<MobileWalletBrowserKind, string> = {
    metamask: "MetaMask browser",
    trust: "Trust Wallet browser",
    okx: "OKX browser",
    binance: "Binance browser",
    safepal: "SafePal browser",
    tronlink: "TronLink browser",
    phantom: "Phantom browser",
    safari: "Mobile Safari",
    chrome: "Mobile Chrome",
    "android-webview": "Android WebView",
    "ios-webview": "iOS WebView",
    desktop: "Desktop browser",
    unknown: "Unknown browser",
  };
  return labels[kind];
}

export async function waitForTronProviderSnapshot(
  timeoutMs = TRON_PROVIDER_POLL_TIMEOUT_MS,
) {
  await waitForDomReady();
  const startedAt = Date.now();
  let latest = getTronProviderSnapshot();

  while (
    !latest.directTronCandidate &&
    Date.now() - startedAt < timeoutMs
  ) {
    await discoverTip6963TronProvider(TRON_PROVIDER_EVENT_TIMEOUT_MS);
    latest = getTronProviderSnapshot();
    if (latest.directTronCandidate) break;
    await sleep(TRON_PROVIDER_POLL_INTERVAL_MS);
  }

  tronDebugLog("provider snapshot", {
    detectedKeys: latest.detectedKeys,
    directProvider: latest.directTronCandidate?.label ?? null,
    environment: latest.environment.label,
  });
  return latest;
}

export function getTronProviderSnapshot(): TronProviderSnapshot {
  const environment = detectMobileWalletEnvironment();
  const w = getTronWindow();
  if (!w) {
    return {
      environment,
      candidates: [],
      detectedKeys: [],
      directTronCandidate: null,
      address: null,
    };
  }

  const detectedEntries: Array<[string, unknown]> = [
    ["window.tronWeb", w.tronWeb],
    ["window.tronLink", w.tronLink],
    ["window.tron", w.tron],
    ["window.okxwallet", w.okxwallet],
    ["window.okxWallet", w.okxWallet],
    ["window.binancew3w", w.binancew3w],
    ["window.ethereum", w.ethereum],
    ["window.trustwallet", w.trustwallet],
    ["window.safePal", w.safePal],
    ["window.safepal", w.safepal],
    ["window.solana", w.solana],
    ["TIP6963", tip6963TronProvider],
  ];
  const detectedKeys = detectedEntries.reduce<string[]>((keys, [key, value]) => {
    if (value) keys.push(key);
    return keys;
  }, []);

  const candidates = compactCandidates([
    createCandidate("tronlink", "TronLink", w.tronLink, w.tronLink?.tronWeb, [
      "eth_requestAccounts",
      "tron_requestAccounts",
    ]),
    createCandidate("tron", "TIP-1193 TRON provider", w.tron, w.tron?.tronWeb, [
      "eth_requestAccounts",
      "tron_requestAccounts",
    ]),
    createCandidate("okxwallet", "OKX Wallet", w.okxwallet?.tronLink ?? w.okxwallet, w.okxwallet?.tronLink?.tronWeb ?? w.okxwallet?.tronWeb, [
      "tron_requestAccounts",
    ]),
    createCandidate("okxWallet", "OKX Wallet", w.okxWallet?.tronLink ?? w.okxWallet, w.okxWallet?.tronLink?.tronWeb ?? w.okxWallet?.tronWeb, [
      "tron_requestAccounts",
    ]),
    createCandidate("safePal", "SafePal", w.safePal?.tronLink ?? w.safePal, w.safePal?.tronLink?.tronWeb ?? w.safePal?.tronWeb, [
      "tron_requestAccounts",
      "eth_requestAccounts",
    ]),
    createCandidate("safepal", "SafePal", w.safepal?.tronLink ?? w.safepal, w.safepal?.tronLink?.tronWeb ?? w.safepal?.tronWeb, [
      "tron_requestAccounts",
      "eth_requestAccounts",
    ]),
    createCandidate("trustwallet", "Trust Wallet", w.trustwallet?.tronLink ?? w.trustwallet, w.trustwallet?.tronLink?.tronWeb ?? w.trustwallet?.tronWeb, [
      "tron_requestAccounts",
      "eth_requestAccounts",
    ]),
    createCandidate("binancew3w", "Binance Wallet", w.binancew3w?.tronLink ?? w.binancew3w, w.binancew3w?.tronLink?.tronWeb ?? w.binancew3w?.tronWeb, [
      "tron_requestAccounts",
    ]),
    createCandidate("tip6963", "TIP-6963 TRON provider", tip6963TronProvider ?? undefined, tip6963TronProvider?.tronWeb, [
      "eth_requestAccounts",
      "tron_requestAccounts",
    ]),
    createCandidate("tronWeb", "Injected TronWeb", undefined, w.tronWeb, [
      "tron_requestAccounts",
    ]),
  ]);

  const directTronCandidate =
    candidates.find((candidate) => candidate.supportsDirectTron) ?? null;
  return {
    environment,
    candidates,
    detectedKeys,
    directTronCandidate,
    address: getTronAddressFromCandidates(candidates),
  };
}

export function getInjectedTronWeb() {
  return getTronProviderSnapshot().directTronCandidate?.tronWeb ?? null;
}

export function getInjectedTronAddress() {
  return getTronProviderSnapshot().address;
}

export async function requestTronAccountsAccess(snapshot = getTronProviderSnapshot()) {
  let requested: unknown = null;
  let providerLabel: string | null = null;
  const candidates =
    snapshot.candidates.length > 0
      ? snapshot.candidates
      : (await waitForTronProviderSnapshot()).candidates;

  for (const candidate of candidates) {
    const requestTargets = [
      candidate.provider,
      candidate.tronWeb,
    ].filter((target): target is TronProviderLike | TronWebLike => Boolean(target?.request));

    for (const target of requestTargets) {
      for (const method of candidate.requestMethods) {
        try {
          tronDebugLog("request accounts", { provider: candidate.label, method });
          const nextRequested = await target.request?.({
            method,
            params:
              method === "tron_requestAccounts"
                ? {
                    websiteName: "StakingDemo",
                    websiteIcon:
                      typeof window === "undefined"
                        ? undefined
                        : `${window.location.origin}/favicon.ico`,
                  }
                : undefined,
          });
          if (nextRequested) requested = nextRequested;
          providerLabel = candidate.label;
          if (getTronAddressFromRequest(nextRequested) || getInjectedTronAddress()) {
            return {
              requested,
              providerLabel,
              tronWeb: getInjectedTronWeb(),
              address:
                getTronAddressFromRequest(nextRequested) ?? getInjectedTronAddress(),
            };
          }
        } catch (error) {
          tronDebugLog("request accounts failed", {
            provider: candidate.label,
            method,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }

  return {
    requested,
    providerLabel,
    tronWeb: getInjectedTronWeb(),
    address: getTronAddressFromRequest(requested) ?? getInjectedTronAddress(),
  };
}

export function getTronAddressFromRequest(requested: unknown) {
  if (Array.isArray(requested) && typeof requested[0] === "string") {
    return requested[0];
  }
  if (!requested || typeof requested !== "object") return null;

  const record = requested as Record<string, unknown>;
  if (typeof record.address === "string") return record.address;
  if (typeof record.result === "string") return record.result;
  if (record.data && typeof record.data === "object") {
    const dataRecord = record.data as Record<string, unknown>;
    if (typeof dataRecord.address === "string") return dataRecord.address;
    if (Array.isArray(dataRecord.accounts) && typeof dataRecord.accounts[0] === "string") {
      return dataRecord.accounts[0];
    }
  }
  if (Array.isArray(record.accounts)) {
    const account = record.accounts[0];
    if (typeof account === "string") return account;
    if (account && typeof account === "object") {
      const accountRecord = account as Record<string, unknown>;
      if (typeof accountRecord.address === "string") return accountRecord.address;
    }
  }

  return null;
}

function getDappMetadata() {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://stakingdemo.local";
  return {
    name: "StakingDemo",
    description: "데이터 기반 스테이킹 인사이트 플랫폼",
    url: origin,
    icon: `${origin}/favicon.ico`,
    icons: [`${origin}/favicon.ico`],
  };
}

function createWalletConnectBaseOptions() {
  const metadata = getDappMetadata();
  return {
    options: {
      relayUrl: "wss://relay.walletconnect.com",
      projectId,
      metadata: {
        name: metadata.name,
        description: metadata.description,
        url: metadata.url,
        icons: metadata.icons,
      },
    },
    allWallets: "ONLY_MOBILE" as const,
    enableAnalytics: false,
    debug: isTronDebugEnabled(),
    enableMobileDeepLink: true,
    themeMode: "dark" as const,
    themeVariables: {
      "--w3m-accent": "#ef4444",
      "--w3m-border-radius-master": "4px",
      "--w3m-z-index": 1000,
    },
  };
}

function createWalletConnectAdapterConfig(): TronWalletConnectAdapterConfig {
  return {
    network: "Mainnet",
    ...createWalletConnectBaseOptions(),
  };
}

function createWalletConnectWalletConfig(
  network: TronWalletConnectConfig["network"],
): TronWalletConnectConfig {
  return {
    network,
    ...createWalletConnectBaseOptions(),
  };
}

function wrapAdapter(
  label: string,
  adapter: {
    address: string | null;
    connect?: (options?: { onUri?: (uri: string) => void }) => Promise<void>;
    disconnect?: () => Promise<void>;
    signMessage?: (message: string) => Promise<unknown>;
    signTransaction?: (transaction: unknown) => Promise<unknown>;
    switchChain?: (chainId: string) => Promise<void>;
  },
): TronSignableWallet {
  return {
    label,
    get address() {
      return adapter.address;
    },
    connect: adapter.connect?.bind(adapter),
    disconnect: adapter.disconnect?.bind(adapter),
    signMessage: adapter.signMessage?.bind(adapter),
    signTransaction: adapter.signTransaction?.bind(adapter),
    switchChain: adapter.switchChain?.bind(adapter),
  };
}

function getAddressFromOkxAccount(account: unknown) {
  if (!account || typeof account !== "object") return null;
  const record = account as Record<string, unknown>;
  return typeof record.address === "string" ? record.address : null;
}

function getAddressFromOkxSession(session: unknown) {
  if (!session || typeof session !== "object") return null;
  const namespaces = (session as { namespaces?: Record<string, { accounts?: string[] }> })
    .namespaces;
  const account = namespaces?.tron?.accounts?.[0];
  if (!account) return null;
  const parts = account.split(":");
  return parts[parts.length - 1] ?? null;
}

function handleWalletConnectUri(
  uri: string,
  opts?: { onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void },
) {
  const environment = detectMobileWalletEnvironment();
  const deepLinks = buildWalletConnectDeepLinks(uri, environment);
  opts?.onUri?.(uri, deepLinks);
  const primary = selectPrimaryWalletConnectDeepLink(deepLinks, environment);
  if (primary) {
    window.setTimeout(() => {
      window.location.href = primary.url;
    }, 250);
  }
}

function createMobileWalletConnectOptions(opts?: {
  onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void;
}) {
  const environment = detectMobileWalletEnvironment();
  if (!opts?.onUri || !environment.isMobile) return undefined;
  return {
    onUri: (uri: string) => handleWalletConnectUri(uri, opts),
  };
}

async function connectSignableWallet(
  wallet: TronSignableWallet,
  opts?: { onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void },
) {
  await wallet.disconnect?.().catch((error) => {
    tronDebugLog("stale TRON adapter session disconnect failed", {
      provider: wallet.label,
      error: error instanceof Error ? error.message : String(error),
    });
  });
  await wallet.connect?.(createMobileWalletConnectOptions(opts));
  if (wallet.switchChain) {
    await wallet.switchChain(TRON_MAINNET_HEX_CHAIN_ID).catch((error) => {
      tronDebugLog("switch TRON mainnet failed", {
        provider: wallet.label,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
  const address = wallet.address?.trim();
  if (!address) throw new Error(`${wallet.label} TRON 주소를 가져오지 못했습니다.`);
  tronDebugLog("signable TRON wallet connected", {
    provider: wallet.label,
    address,
  });
  return {
    address,
    providerLabel: wallet.label,
  };
}

export async function connectTronWalletConnect(opts?: {
  onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void;
}) {
  if (!walletConnectWallet) {
    const { WalletConnectChainID, WalletConnectWallet } = await import(
      "@tronweb3/walletconnect-tron"
    );
    const wallet = new WalletConnectWallet(
      createWalletConnectWalletConfig(WalletConnectChainID.Mainnet),
    );
    let address: string | null = null;

    wallet.on("accountsChanged", (accounts) => {
      address = accounts[0]?.trim() ?? null;
      tronDebugLog("walletconnect-tron accounts changed", { address });
    });
    wallet.on("disconnect", () => {
      address = null;
      tronDebugLog("walletconnect-tron disconnected");
    });

    walletConnectWallet = {
      label: "WalletConnect TRON",
      get address() {
        return address;
      },
      async connect(options) {
        const existing = await wallet.checkConnectStatus().catch(() => ({
          address: "",
        }));
        if (existing.address) {
          await wallet.disconnect().catch((error) => {
            tronDebugLog("walletconnect-tron stale session disconnect failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          });
          address = null;
        }
        const result = await wallet.connect(options);
        address = result.address?.trim() || null;
      },
      async disconnect() {
        await wallet.disconnect();
        address = null;
      },
      signMessage: (message) => wallet.signMessage(message),
      signTransaction: (transaction) => wallet.signTransaction(transaction),
    };
  }

  return connectSignableWallet(walletConnectWallet, opts);
}

export async function disconnectTronWalletConnect() {
  const disconnecting = walletConnectWallet?.disconnect?.();
  await disconnecting?.catch((error) => {
    tronDebugLog("walletconnect disconnect failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  walletConnectWallet = null;
}

export function hasTronWalletConnectSession() {
  return Boolean(walletConnectWallet?.address);
}

export async function disconnectConnectedTronAdapter() {
  const wallets = [
    okxTronConnection,
    metaMaskTronAdapter,
    binanceWalletAdapter,
    trustWalletAdapter,
    walletConnectWallet,
    tronLinkAdapter,
  ];
  await Promise.all(
    wallets.map((wallet) => {
      const disconnecting = wallet?.disconnect?.();
      return disconnecting?.catch((error) => {
        tronDebugLog("TRON adapter disconnect failed", {
          provider: wallet?.label,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }),
  );
  okxTronConnection = null;
  metaMaskTronAdapter = null;
  binanceWalletAdapter = null;
  trustWalletAdapter = null;
  walletConnectWallet = null;
  tronLinkAdapter = null;
}

export function hasConnectedTronAdapterSession() {
  return Boolean(
    okxTronConnection?.address ||
      metaMaskTronAdapter?.address ||
      binanceWalletAdapter?.address ||
      trustWalletAdapter?.address ||
      walletConnectWallet?.address ||
      tronLinkAdapter?.address,
  );
}

function getConnectedTronAdapter() {
  return (
    okxTronConnection?.address
      ? okxTronConnection
      : metaMaskTronAdapter?.address
        ? metaMaskTronAdapter
        : binanceWalletAdapter?.address
          ? binanceWalletAdapter
          : trustWalletAdapter?.address
            ? trustWalletAdapter
            : walletConnectWallet?.address
              ? walletConnectWallet
              : tronLinkAdapter?.address
                ? tronLinkAdapter
                : null
  );
}

export function hasConnectedTronAdapterTransactionSigner() {
  return Boolean(getConnectedTronAdapter()?.signTransaction);
}

export async function signConnectedTronAdapterMessage(message: string) {
  const wallet = getConnectedTronAdapter();
  if (!wallet?.signMessage) {
    throw new Error("TRON 어댑터 서명 세션을 찾지 못했습니다.");
  }
  const signature = await wallet.signMessage(message);
  if (!signature) throw new Error(`${wallet.label} TRON 서명에 실패했습니다.`);
  return String(signature);
}

export async function signConnectedTronAdapterTransaction(transaction: unknown) {
  const wallet = getConnectedTronAdapter();
  if (!wallet?.signTransaction) {
    throw new Error("TRON 어댑터 트랜잭션 서명 세션을 찾지 못했습니다.");
  }
  const signedTransaction = await wallet.signTransaction(transaction);
  if (!signedTransaction) {
    throw new Error(`${wallet.label} TRON 트랜잭션 서명에 실패했습니다.`);
  }
  return signedTransaction;
}

export async function connectTronLinkAdapter() {
  if (!tronLinkAdapter) {
    const { TronLinkAdapter } = await import(
      "@tronweb3/tronwallet-adapter-tronlink"
    );
    tronLinkAdapter = wrapAdapter(
      "TronLink",
      new TronLinkAdapter({
        checkTimeout: 1200,
        openAppWithDeeplink: true,
        openUrlWhenWalletNotFound: false,
        dappName: "StakingDemo",
        dappIcon: getDappMetadata().icon,
      }),
    );
  }

  return connectSignableWallet(tronLinkAdapter);
}

export async function connectBinanceTronAdapter(opts?: {
  onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void;
}) {
  if (!binanceWalletAdapter) {
    const { BinanceWalletAdapter } = await import(
      "@tronweb3/tronwallet-adapter-binance"
    );
    binanceWalletAdapter = wrapAdapter(
      "Binance Wallet",
      new BinanceWalletAdapter({
        checkTimeout: 1200,
        openUrlWhenWalletNotFound: false,
        useWalletConnectWhenWalletNotFound: true,
        walletConnectConfig: createWalletConnectAdapterConfig(),
        onWalletConnectUri: (uri) => handleWalletConnectUri(uri, opts),
      }),
    );
  }

  return connectSignableWallet(binanceWalletAdapter, opts);
}

export async function connectTrustTronAdapter() {
  if (!trustWalletAdapter) {
    const { TrustAdapter } = await import(
      "@tronweb3/tronwallet-adapter-trust"
    );
    trustWalletAdapter = wrapAdapter(
      "Trust Wallet",
      new TrustAdapter({
        checkTimeout: 1200,
        openAppWithDeeplink: true,
      }),
    );
  }

  return connectSignableWallet(trustWalletAdapter);
}

// SafePal은 별도 어댑터 패키지가 없어서 기존 candidate 감지를 활용한다. SafePal 확장은 버전에 따라
// (1) window.safePal.tronLink / window.safepal.tronLink 네임스페이스로,
// (2) window.tronLink/window.tronWeb 직접 주입 + isSafePal flag로,
// (3) 단순히 window.tronWeb 직접 주입 (다른 TRON 지갑과 구분 불가)
// 형태로 들어오므로 위 순서대로 폴백한다. 마지막 케이스는 사용자 환경에 SafePal만 있을 때 유효.
export async function connectSafePalTron(): Promise<{ address: string; providerLabel: string }> {
  const snapshot = await waitForTronProviderSnapshot();

  let candidate: TronProviderCandidate | undefined =
    // (1) SafePal 전용 namespace
    snapshot.candidates.find(
      (c) =>
        (c.id === "safePal" || c.id === "safepal") && c.supportsDirectTron,
    );

  if (!candidate) {
    // (2) window.tronLink/tronWeb에 isSafePal flag가 박혀있는 경우
    candidate = snapshot.candidates.find((c) => {
      if (!c.supportsDirectTron) return false;
      const flagged =
        (c.provider as { isSafePal?: boolean } | undefined)?.isSafePal ===
          true ||
        (c.tronWeb as { isSafePal?: boolean } | undefined)?.isSafePal === true;
      return flagged;
    });
  }

  if (!candidate && snapshot.directTronCandidate) {
    // (3) Fallback: SafePal-specific 식별 단서가 없지만 직접 TRON provider가 있다면 그걸 쓴다.
    // 여러 TRON 확장이 같이 깔려있을 때는 첫 번째 후보가 잡히는데, 사용자가 SafePal만 깔아둔 상황이면
    // 결국 SafePal이 응답한다.
    candidate = snapshot.directTronCandidate;
    console.debug("[connectSafePalTron] fallback to generic TRON candidate", {
      id: candidate.id,
      label: candidate.label,
      detectedKeys: snapshot.detectedKeys,
    });
  }

  if (!candidate) {
    const detected = snapshot.detectedKeys.join(", ") || "감지된 객체 없음";
    throw new Error(
      `SafePal의 TRON provider를 찾지 못했습니다. SafePal 확장이 설치돼 있다면 새로고침해주세요. (감지: ${detected})`,
    );
  }

  const requestTargets = [candidate.provider, candidate.tronWeb].filter(
    (target): target is TronProviderLike | TronWebLike =>
      Boolean(target?.request),
  );

  for (const target of requestTargets) {
    for (const method of candidate.requestMethods) {
      try {
        const response = await target.request?.({
          method,
          params:
            method === "tron_requestAccounts"
              ? {
                  websiteName: "StakingDemo",
                  websiteIcon:
                    typeof window === "undefined"
                      ? undefined
                      : `${window.location.origin}/favicon.ico`,
                }
              : undefined,
        });
        const address =
          getTronAddressFromRequest(response) ?? getInjectedTronAddress();
        if (address) {
          return {
            address: address.trim(),
            providerLabel: "SafePal",
          };
        }
      } catch {
        /* try next method/target */
      }
    }
  }

  // request 메서드가 없거나 실패해도 이미 주입된 주소가 있으면 그것을 사용 (TronLink-호환 흐름).
  const injected = getInjectedTronAddress();
  if (injected) {
    return { address: injected.trim(), providerLabel: "SafePal" };
  }

  throw new Error("SafePal에서 TRON 주소를 가져오지 못했습니다.");
}

export async function connectMetaMaskTronAdapter() {
  if (!metaMaskTronAdapter) {
    const [{ MetaMaskAdapter }, { WalletReadyState }] = await Promise.all([
      import("@metamask/connect-tron"),
      import("@tronweb3/tronwallet-abstract-adapter"),
    ]);
    const adapter = new MetaMaskAdapter();

    // MetaMaskAdapter는 생성 직후 readyState=Loading이고, 비동기 checkWallet()가 끝나야 Found로
    // 전이된다. connect() 내부의 동기 검사가 Loading 상태에서 즉시 "Wallet not found or not ready"를
    // throw하므로, 어댑터가 Found(또는 NotFound)에 도달할 때까지 readyStateChanged 이벤트를 기다린다.
    if (adapter.readyState === WalletReadyState.Loading) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          adapter.off("readyStateChanged", onChange);
        };
        const onChange = (state: unknown) => {
          if (state === WalletReadyState.Found) {
            cleanup();
            resolve();
          } else if (state === WalletReadyState.NotFound) {
            cleanup();
            reject(
              new Error(
                "MetaMask 확장이 감지되지 않았습니다. 확장 설치 후 새로고침해주세요.",
              ),
            );
          }
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error("MetaMask TRON 어댑터 초기화 타임아웃 (5s)"));
        }, 5_000);
        adapter.on("readyStateChanged", onChange);
      });
    } else if (adapter.readyState === WalletReadyState.NotFound) {
      throw new Error(
        "MetaMask 확장이 감지되지 않았습니다. 확장 설치 후 새로고침해주세요.",
      );
    }

    metaMaskTronAdapter = wrapAdapter("MetaMask TRON", adapter);
  }

  return connectSignableWallet(metaMaskTronAdapter);
}

export async function connectOkxTronApp(opts?: {
  onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void;
}) {
  if (!okxTronConnection) {
    const { OKXTronProvider, OKXUniversalProvider } = await import(
      "@okxconnect/universal-provider"
    );
    const metadata = getDappMetadata();
    const universalProvider = await OKXUniversalProvider.init({
      dappMetaData: {
        name: metadata.name,
        icon: metadata.icon,
      },
    });
    universalProvider.on?.("display_uri", (uri: string) => {
      handleWalletConnectUri(uri, opts);
    });
    const tronProvider = new OKXTronProvider(universalProvider);
    let address: string | null = null;

    okxTronConnection = {
      label: "OKX Wallet",
      get address() {
        return address;
      },
      async connect() {
        const session = await universalProvider.connect({
          namespaces: {
            tron: {
              chains: [OKX_TRON_MAINNET_CHAIN_ID],
              defaultChain: OKX_TRON_MAINNET_CHAIN_ID,
            },
          },
          sessionConfig: {
            redirect:
              typeof window === "undefined" ? undefined : window.location.href,
          },
        });
        address =
          getAddressFromOkxAccount(
            tronProvider.getAccount(OKX_TRON_MAINNET_CHAIN_ID),
          ) ?? getAddressFromOkxSession(session);
      },
      disconnect: () => universalProvider.disconnect(),
      signMessage: (message) =>
        tronProvider.signMessageV2(message, OKX_TRON_MAINNET_CHAIN_ID),
    };
  }

  return connectSignableWallet(okxTronConnection, opts);
}

export async function connectMobileTronWallet(opts?: {
  onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void;
}) {
  const environment = detectMobileWalletEnvironment();
  const connectors: Array<[
    string,
    () => Promise<{ address: string; providerLabel: string }>,
  ]> = [
    ["okx", () => connectOkxTronApp(opts)],
    ["binance", () => connectBinanceTronAdapter(opts)],
    ["metamask", () => connectMetaMaskTronAdapter()],
    ["walletconnect", () => connectTronWalletConnect(opts)],
    ["tronlink", () => connectTronLinkAdapter()],
  ];
  const connectorMap = new Map(connectors);
  const rank: Partial<Record<MobileWalletBrowserKind, string[]>> = {
    okx: ["okx", "walletconnect"],
    binance: ["binance", "walletconnect"],
    metamask: ["metamask", "walletconnect"],
    tronlink: ["tronlink", "walletconnect"],
    safepal: ["walletconnect"],
    trust: ["walletconnect"],
    safari: ["walletconnect"],
    chrome: ["walletconnect"],
    "android-webview": ["walletconnect"],
    "ios-webview": ["walletconnect"],
    unknown: environment.isMobile ? ["walletconnect"] : [],
  };
  const order = rank[environment.kind] ?? ["walletconnect"];
  const attempts = order
    .map((id) => {
      const connect = connectorMap.get(id);
      return connect ? ([id, connect] as const) : null;
    })
    .filter((attempt): attempt is readonly [
      string,
      () => Promise<{ address: string; providerLabel: string }>,
    ] => Boolean(attempt));
  const errors: string[] = [];

  for (const [id, connect] of attempts) {
    try {
      return await connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      tronDebugLog("mobile TRON wallet adapter failed", {
        adapter: id,
        error: message,
      });
      errors.push(`${id}: ${message}`);
    }
  }

  throw new Error(
    `지원 지갑 SDK 연결에 실패했습니다. ${errors.slice(0, 3).join(" / ")}`,
  );
}

export function buildWalletConnectDeepLinks(
  uri: string,
  environment = detectMobileWalletEnvironment(),
): WalletDeepLink[] {
  const encoded = encodeURIComponent(uri);
  const links: WalletDeepLink[] = [
    { wallet: "Trust Wallet", url: `https://link.trustwallet.com/wc?uri=${encoded}` },
    { wallet: "MetaMask", url: `https://metamask.app.link/wc?uri=${encoded}` },
    { wallet: "SafePal", url: `safepalwallet://wc?uri=${encoded}` },
    { wallet: "OKX", url: `okx://wallet/wc?uri=${encoded}` },
    { wallet: "Binance Wallet", url: `bnc://app.binance.com/cedefi/wc?uri=${encoded}` },
  ];

  if (environment.kind === "trust") return preferWallet(links, "Trust Wallet");
  if (environment.kind === "metamask") return preferWallet(links, "MetaMask");
  if (environment.kind === "safepal") return preferWallet(links, "SafePal");
  if (environment.kind === "okx") return preferWallet(links, "OKX");
  if (environment.kind === "binance") return preferWallet(links, "Binance Wallet");
  return links;
}

export function openTronLinkDappBrowser() {
  if (typeof window === "undefined" || !detectMobileWalletEnvironment().isMobile) {
    return false;
  }
  const targetUrl = new URL("/login", window.location.origin);
  targetUrl.searchParams.set("next", "/dashboard?autoTron=1");
  const payload = {
    url: targetUrl.toString(),
    action: "open",
    protocol: "tronlink",
    version: "1.0",
  };
  window.location.href = `tronlinkoutside://pull.activity?param=${encodeURIComponent(
    JSON.stringify(payload),
  )}`;
  return true;
}

export function isExternalMobileBrowser() {
  const environment = detectMobileWalletEnvironment();
  return environment.isMobile && !environment.isInAppBrowser;
}

export function hasInjectedTronProvider() {
  return Boolean(getTronProviderSnapshot().directTronCandidate);
}

export function isMobileBrowser() {
  return detectMobileWalletEnvironment().isMobile;
}

export function tronDebugLog(message: string, details?: unknown) {
  if (!isTronDebugEnabled()) return;
  if (details === undefined) {
    console.debug(`[tron-mobile] ${message}`);
    return;
  }
  console.debug(`[tron-mobile] ${message}`, details);
}

async function discoverTip6963TronProvider(timeoutMs = TRON_PROVIDER_EVENT_TIMEOUT_MS) {
  if (typeof window === "undefined") return null;
  if (tip6963TronProvider) return tip6963TronProvider;

  return new Promise<TronProviderLike | null>((resolve) => {
    let settled = false;
    let timeoutId: number | null = null;
    const finish = (provider: TronProviderLike | null) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("TIP6963:announceProvider", onAnnounce);
      resolve(provider);
    };
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<{
        info?: { name?: string; rdns?: string };
        provider?: TronProviderLike;
      }>).detail;
      const providerName = detail?.info?.name?.toLowerCase() ?? "";
      const rdns = detail?.info?.rdns?.toLowerCase() ?? "";
      const isTronProvider =
        providerName.includes("tron") ||
        providerName.includes("safepal") ||
        providerName.includes("okx") ||
        rdns.includes("tron") ||
        rdns.includes("safepal") ||
        rdns.includes("okx");
      if (!isTronProvider || !detail?.provider) return;

      tip6963TronProvider = detail.provider;
      finish(detail.provider);
    };
    timeoutId = window.setTimeout(() => finish(null), timeoutMs);

    window.addEventListener("TIP6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("TIP6963:requestProvider"));
  });
}

function createCandidate(
  id: string,
  label: string,
  provider: TronProviderLike | undefined,
  tronWeb: TronWebLike | undefined,
  requestMethods: Array<"eth_requestAccounts" | "tron_requestAccounts">,
): TronProviderCandidate | null {
  const directTronWeb = tronWeb ?? provider?.tronWeb;
  if (!provider && !directTronWeb) return null;
  return {
    id,
    label,
    provider,
    tronWeb: directTronWeb,
    requestMethods,
    supportsDirectTron: Boolean(provider?.request || directTronWeb?.request || directTronWeb),
  };
}

function compactCandidates(
  values: Array<TronProviderCandidate | null>,
): TronProviderCandidate[] {
  const seen = new Set<TronProviderLike | TronWebLike | string>();
  const candidates: TronProviderCandidate[] = [];
  for (const value of values) {
    if (!value) continue;
    const key = value.provider ?? value.tronWeb ?? value.id;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(value);
  }
  return candidates;
}

function getTronAddressFromCandidates(candidates: TronProviderCandidate[]) {
  for (const candidate of candidates) {
    const address =
      candidate.tronWeb?.defaultAddress?.base58 ??
      candidate.tronWeb?.defaultAddress?.hex;
    if (address) return address;
  }
  return null;
}

function waitForDomReady() {
  if (typeof document === "undefined" || document.readyState !== "loading") {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getTronWindow() {
  if (typeof window === "undefined") return null;
  return window as TronWindow;
}

function preferWallet(links: WalletDeepLink[], wallet: string) {
  const preferred = links.find((link) => link.wallet === wallet);
  return preferred ? [preferred, ...links.filter((link) => link !== preferred)] : links;
}

function selectPrimaryWalletConnectDeepLink(
  links: WalletDeepLink[],
  environment: MobileWalletEnvironment,
) {
  if (!environment.isMobile || !environment.isInAppBrowser) return null;
  return links[0] ?? null;
}

function isTronDebugEnabled() {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.NEXT_PUBLIC_TRON_DEBUG === "1") return true;
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("TRON_DEBUG") === "1";
  } catch {
    return false;
  }
}

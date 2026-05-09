"use client";

import { projectId } from "@/lib/appkit-config";
import {
  TronLinkAdapter,
  WalletConnectAdapter,
} from "@tronweb3/tronwallet-adapters";

export const TRON_PROVIDER_POLL_TIMEOUT_MS = 5_000;
const TRON_PROVIDER_POLL_INTERVAL_MS = 150;
const TRON_PROVIDER_EVENT_TIMEOUT_MS = 450;
const TRON_MAINNET_CHAIN_ID = "tron:0x2b6653dc";

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
let tronLinkAdapter: TronLinkAdapter | null = null;
let walletConnectAdapter: WalletConnectAdapter | null = null;

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

export async function connectTronWalletConnect(opts?: {
  onUri?: (uri: string, deepLinks: WalletDeepLink[]) => void;
}) {
  if (!walletConnectAdapter) {
    walletConnectAdapter = new WalletConnectAdapter({
      network: "Mainnet",
      options: {
        relayUrl: "wss://relay.walletconnect.com",
        projectId,
        metadata: {
          name: "StakingDemo",
          description: "데이터 기반 스테이킹 인사이트 플랫폼",
          url:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://stakingdemo.local",
          icons:
            typeof window !== "undefined"
              ? [`${window.location.origin}/favicon.ico`]
              : [],
        },
      },
      allWallets: "ONLY_MOBILE",
      enableAnalytics: false,
      debug: isTronDebugEnabled(),
      enableMobileDeepLink: true,
      themeMode: "dark",
      themeVariables: {
        "--w3m-accent": "#ef4444",
        "--w3m-border-radius-master": "4px",
        "--w3m-z-index": 1000,
      },
    });
  }

  const environment = detectMobileWalletEnvironment();
  const shouldCaptureUri = Boolean(opts?.onUri && environment.isMobile);
  await walletConnectAdapter.connect(
    shouldCaptureUri
      ? {
          onUri: (uri) => {
            const deepLinks = buildWalletConnectDeepLinks(uri, environment);
            opts?.onUri?.(uri, deepLinks);
            const primary = selectPrimaryWalletConnectDeepLink(deepLinks, environment);
            if (primary) {
              window.setTimeout(() => {
                window.location.href = primary.url;
              }, 250);
            }
          },
        }
      : undefined,
  );
  const address = walletConnectAdapter.address;
  if (!address) throw new Error("WalletConnect TRON 주소를 가져오지 못했습니다.");

  tronDebugLog("walletconnect connected", {
    chainId: TRON_MAINNET_CHAIN_ID,
    address,
  });
  return {
    address,
    adapter: walletConnectAdapter,
  };
}

export async function disconnectTronWalletConnect() {
  await walletConnectAdapter?.disconnect().catch((error) => {
    tronDebugLog("walletconnect disconnect failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  });
  walletConnectAdapter = null;
}

export function hasTronWalletConnectSession() {
  return Boolean(walletConnectAdapter?.address);
}

export async function signTronWalletConnectMessage(message: string) {
  if (!walletConnectAdapter?.address) {
    throw new Error("WalletConnect TRON 서명 세션을 찾지 못했습니다.");
  }
  const signature = await walletConnectAdapter.signMessage(message);
  if (!signature) throw new Error("WalletConnect TRON 서명에 실패했습니다.");
  return String(signature);
}

export async function connectTronLinkAdapter() {
  if (!tronLinkAdapter) {
    tronLinkAdapter = new TronLinkAdapter({
      checkTimeout: 1200,
      openAppWithDeeplink: true,
      openUrlWhenWalletNotFound: false,
      dappName: "StakingDemo",
      dappIcon:
        typeof window === "undefined"
          ? ""
          : `${window.location.origin}/favicon.ico`,
    });
  }

  await tronLinkAdapter.connect();
  const address = tronLinkAdapter.address;
  if (!address) throw new Error("TronLink 주소를 가져오지 못했습니다.");
  return {
    address,
    adapter: tronLinkAdapter,
  };
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
  targetUrl.searchParams.set("next", "/a/me/my-assets?autoTron=1");
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

"use client";

const WALLET_STORAGE_KEY_PARTS = [
  "appkit",
  "binance",
  "metamask",
  "okx",
  "reown",
  "safepal",
  "staking_multichain_wallets",
  "tron",
  "wagmi",
  "walletconnect",
  "w3m",
  "wc@",
];

const WALLET_COOKIE_KEY_PARTS = [
  "appkit",
  "binance",
  "metamask",
  "okx",
  "reown",
  "safepal",
  "tron",
  "wagmi",
  "walletconnect",
  "w3m",
  "wc",
];

export const FRESH_WALLET_RESET_MARKER = "staking_fresh_wallet_reset";

function matchesWalletKey(key: string, parts: string[]) {
  const lower = key.toLowerCase();
  return parts.some((part) => lower.includes(part));
}

function clearStorage(storage: Storage | undefined, keepMarker = false) {
  if (!storage) return;
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key));

  keys.forEach((key) => {
    if (keepMarker && key === FRESH_WALLET_RESET_MARKER) return;
    if (matchesWalletKey(key, WALLET_STORAGE_KEY_PARTS)) {
      storage.removeItem(key);
    }
  });
}

function deleteCookie(name: string) {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  const hostname = window.location.hostname;
  const domainParts = hostname.split(".");
  const parentDomain =
    domainParts.length > 1 ? `.${domainParts.slice(-2).join(".")}` : hostname;
  const domains = ["", `; domain=${hostname}`, `; domain=${parentDomain}`];
  const paths = ["; path=/", `; path=${window.location.pathname || "/"}`];

  domains.forEach((domain) => {
    paths.forEach((path) => {
      document.cookie = `${name}=; expires=${expires}; max-age=0${path}${domain}; SameSite=Lax`;
    });
  });
}

function clearWalletCookies() {
  document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(Boolean)
    .forEach((name) => {
      if (matchesWalletKey(name, WALLET_COOKIE_KEY_PARTS)) {
        deleteCookie(name);
      }
    });
}

async function clearWalletIndexedDb() {
  if (!("indexedDB" in window) || typeof indexedDB.databases !== "function") {
    return;
  }

  const databases = await indexedDB.databases().catch(() => []);
  await Promise.all(
    databases.map(
      (database) =>
        new Promise<void>((resolve) => {
          const name = database.name;
          if (!name || !matchesWalletKey(name, WALLET_STORAGE_KEY_PARTS)) {
            resolve();
            return;
          }

          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => resolve();
          request.onblocked = () => resolve();
        }),
    ),
  );
}

export async function resetRememberedWalletState(options?: {
  markFreshLogin?: boolean;
}) {
  if (typeof window === "undefined") return;

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage, options?.markFreshLogin);
  clearWalletCookies();
  await clearWalletIndexedDb();

  if (options?.markFreshLogin) {
    window.sessionStorage.setItem(FRESH_WALLET_RESET_MARKER, "1");
  }
}

export function consumeFreshWalletResetMarker() {
  if (typeof window === "undefined") return false;
  const marked = window.sessionStorage.getItem(FRESH_WALLET_RESET_MARKER) === "1";
  window.sessionStorage.removeItem(FRESH_WALLET_RESET_MARKER);
  return marked;
}

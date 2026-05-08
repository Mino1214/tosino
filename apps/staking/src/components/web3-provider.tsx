"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider, type Config } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { TronAdapter } from "@reown/appkit-adapter-tron";
import { TronLinkAdapter } from "@tronweb3/tronwallet-adapter-tronlink";
import { TrustAdapter } from "@tronweb3/tronwallet-adapter-trust";
import { OkxWalletAdapter } from "@tronweb3/tronwallet-adapter-okxwallet";
import {
  wagmiAdapter,
  projectId,
  networks,
} from "@/lib/appkit-config";

const metadata = {
  name: "StakingDemo",
  description: "데이터 기반 스테이킹 인사이트 플랫폼",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://stakingdemo.local",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

const tronAdapter = new TronAdapter({
  walletAdapters: [
    new TronLinkAdapter({
      openUrlWhenWalletNotFound: false,
      checkTimeout: 3000,
    }),
    new TrustAdapter(),
    new OkxWalletAdapter({
      openUrlWhenWalletNotFound: false,
    }),
  ],
});

const globalForAppKit = globalThis as typeof globalThis & {
  __stakingAppKitCreated?: boolean;
};

if (!globalForAppKit.__stakingAppKitCreated) {
  createAppKit({
    adapters: [wagmiAdapter, tronAdapter],
    networks,
    projectId,
    metadata,
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#f59e0b",
      "--w3m-color-mix": "#0f172a",
      "--w3m-color-mix-strength": 12,
      "--w3m-border-radius-master": "4px",
      "--w3m-font-family":
        "var(--font-inter), Inter, system-ui, -apple-system, sans-serif",
      "--w3m-font-size-master": "10px",
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
  });
  globalForAppKit.__stakingAppKitCreated = true;
}

export function Web3Provider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies?: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient());
  void cookies;

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

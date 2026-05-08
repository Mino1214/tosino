import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
  avalanche,
  type AppKitNetwork,
} from "@reown/appkit/networks";

// WalletConnect Cloud (https://cloud.reown.com) 에서 발급받은 Project ID.
export const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ||
  "1ba9248a009f4682a840421545f68b70";

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WC_PROJECT_ID is not set");
}

export const evmNetworks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
  avalanche,
];

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  ...evmNetworks,
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks: evmNetworks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

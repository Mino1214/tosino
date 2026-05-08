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
// 데모용 임시 ID — 실제 운영 시 NEXT_PUBLIC_WC_PROJECT_ID 환경변수로 교체하세요.
export const projectId =
  process.env.NEXT_PUBLIC_WC_PROJECT_ID ||
  "b56e18d47c72ab683b10814fe9495694";

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WC_PROJECT_ID is not set");
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  bsc,
  avalanche,
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

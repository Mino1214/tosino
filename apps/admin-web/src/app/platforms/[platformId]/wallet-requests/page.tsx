import { RedirectWithPlatform } from "@/components/RedirectWithPlatform";

export default function LegacyWalletRedirect() {
  return <RedirectWithPlatform to="/console/wallet-requests" />;
}

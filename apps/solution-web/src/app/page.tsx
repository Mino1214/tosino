import { getPartnerLogoPaths } from "@/lib/partners";
import { HomePageClient } from "./HomePageClient";

export default function HomePage() {
  const partnerLogoPaths = getPartnerLogoPaths();
  return <HomePageClient partnerLogoPaths={partnerLogoPaths} />;
}

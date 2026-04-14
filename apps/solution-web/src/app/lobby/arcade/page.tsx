import { AdBanner } from "@/components/SportsLobbyLayout";
import { VendorGridCatalog } from "@/components/VendorGridCatalog";

export default function ArcadePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 pb-12">
      <AdBanner
        title="아케이드 이벤트  첫충 보너스 혜택을 받아가세요!"
        variant="billboard"
      />

      <div className="content-pad-phi mx-auto w-full min-w-0 max-w-[90rem]">
        <div className="border-b border-[rgba(218,174,87,0.2)] bg-black py-5">
          <h1 className="text-xl font-bold text-main-gold">아케이드</h1>
        </div>

        <section className="pt-5">
          <VendorGridCatalog
            categories={["arcade"]}
            showCategoryTabs={false}
          />
        </section>
      </div>
    </div>
  );
}

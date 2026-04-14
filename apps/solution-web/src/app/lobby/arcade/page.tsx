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
          <p className="text-xs uppercase tracking-[0.22em] text-main-gold-solid/55">
            Arcade
          </p>
          <h1 className="mt-2 text-lg font-bold text-main-gold sm:text-2xl">
            아케이드 공급사
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-main-gold-solid/72">
            아케이드는 미니게임과 분리해서 별도 탭으로 정리했습니다. 핵소를
            먼저 두고, 회사별 로비와 정사각형 게임 카드를 바로 테스트할 수
            있게 구성합니다.
          </p>
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

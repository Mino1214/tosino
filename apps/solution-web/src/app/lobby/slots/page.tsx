/*
  슬롯 로비
  · 기존 모습 유지: 헤더 + SlotVendorCatalog
*/
import { AdBanner } from "@/components/SportsLobbyLayout";
import { SlotVendorCatalog } from "@/components/SlotVendorCatalog";

export default function SlotsPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 pb-10">
      <AdBanner
        title="슬롯 이벤트  첫충 보너스 혜택을 받아가세요!"
        variant="billboard"
      />

      <div className="content-pad-phi mx-auto w-full max-w-[90rem]">
        <div className="border-b border-[rgba(218,174,87,0.2)] bg-black py-5">
          <h1 className="text-xl font-bold text-main-gold">슬롯 게임</h1>
          <p className="mt-0.5 text-xs text-main-gold-solid/75">
            슬롯 공급사를 탭으로 고르고 메인 로비와 대표 게임을 바로 테스트할 수 있습니다.
          </p>
        </div>

        <div className="pt-4">
          <SlotVendorCatalog />
        </div>
      </div>
    </div>
  );
}

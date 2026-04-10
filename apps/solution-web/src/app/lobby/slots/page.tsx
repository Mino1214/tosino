/*
  슬롯 로비
  · 제공사 그리드 없이 SlotVendorCatalog (프라그마틱 / 하바네로 / 마이크로 탭) 바로 표시
*/
import { SlotVendorCatalog } from "@/components/SlotVendorCatalog";

export default function SlotsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-10">
      <div className="content-pad-phi">
        {/* 헤더 */}
        <div className="border-b border-white/5 bg-zinc-900/60 py-5">
          <h1 className="text-xl font-bold text-white">슬롯 게임</h1>
          <p className="mt-0.5 text-xs text-zinc-500">프라그마틱 · 하바네로 · 마이크로</p>
        </div>

        {/* 게임 카탈로그 */}
        <div className="pt-4">
          <SlotVendorCatalog />
        </div>
      </div>
    </div>
  );
}

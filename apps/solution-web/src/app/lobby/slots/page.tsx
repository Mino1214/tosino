/*
  슬롯 로비
  · 기존 SlotVendorCatalog 재사용
*/
import { AdBanner } from "@/components/SportsLobbyLayout";
import { SlotVendorCatalog } from "@/components/SlotVendorCatalog";

const PROVIDERS = [
  "CQ9", "Hacksaw", "PlayStar", "Octoplay", "Mobilots",
  "Evoplay", "Avatarux", "Netent", "JDB", "Nolimit City",
  "Bigtime Gaming", "Wazdan", "FC Game", "Blueprint Gaming",
  "PragmaticPlay Turbo Spin", "MicroGaming Plus Slot",
  "Booongo", "Onlyplay", "Triple Profit Gaming", "Fat Panda",
];

export default function SlotsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* 광고 배너 */}
      <AdBanner title="슬롯 이벤트 — 매일 매일 다양한 이벤트가 쏟아집니다!" />

      {/* 헤더 */}
      <div className="border-b border-white/5 px-4 py-5">
        <h1 className="text-xl font-bold text-white">슬롯 게임</h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          {PROVIDERS.length}개 제공사 · 수천 개의 슬롯 게임
        </p>
      </div>

      {/* 검색 */}
      <div className="border-b border-white/5 px-3 py-2">
        <input
          type="text"
          placeholder="슬롯 게임 또는 제공사 검색"
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2
                     text-sm text-white placeholder:text-zinc-600 outline-none"
        />
      </div>

      {/* 제공사 그리드 */}
      <div className="px-3 pt-4">
        <p className="mb-3 text-xs uppercase tracking-wider text-zinc-600">제공사</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {PROVIDERS.map((name) => (
            <button
              key={name}
              type="button"
              className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl
                         border border-white/5 bg-zinc-900/60 text-center transition-all
                         hover:border-[var(--theme-primary,#c9a227)]/40 hover:bg-zinc-800/80"
            >
              <span className="text-xl">🎰</span>
              <span className="px-2 text-[10px] font-semibold text-zinc-400">{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 기존 SlotVendorCatalog */}
      <div className="mt-8 px-3">
        <p className="mb-3 text-xs uppercase tracking-wider text-zinc-600">인기 슬롯</p>
        <SlotVendorCatalog />
      </div>
    </div>
  );
}

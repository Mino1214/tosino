/*
  카지노 로비
  · 배팅카트 없음 (카지노/슬롯은 카트 불필요)
  · 기존 CasinoPortalCards 재사용
*/
import { AdBanner } from "@/components/SportsLobbyLayout";
import CasinoPortalCards from "@/components/CasinoPortalCards";

const PROVIDERS = [
  "Vivo Gaming", "Taishan", "DB Casino", "Evolution",
  "Skywind Live", "MicroGaming Grand", "Betgames.tv", "ASTAR",
  "Sexy Casino", "Motivation Gaming", "Stella", "PragmaticPlay Live",
  "PlayTech Live", "SA Gaming", "TG Gaming", "MicroGaming Plus",
  "Big Gaming Live",
];

export default function LiveCasinoPage() {
  return (
    <div className="min-h-screen bg-zinc-950 pb-8">
      {/* 공용 광고 배너 */}
      <AdBanner title="라이브 카지노 첫충 이벤트 — 지금 바로 참여하세요!" />

      {/* 헤더 */}
      <div className="border-b border-white/5 px-4 py-5">
        <h1 className="text-xl font-bold text-white">라이브 카지노</h1>
        <p className="mt-0.5 text-xs text-zinc-500">
          Evolution · Pragmatic · Vivo Gaming 외 {PROVIDERS.length}개 제공사
        </p>
      </div>

      {/* 제공사 그리드 */}
      <div className="px-3 pt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {PROVIDERS.map((name) => (
            <button
              key={name}
              type="button"
              className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl
                         border border-white/5 bg-zinc-900/60 text-center transition-all
                         hover:border-[var(--theme-primary,#c9a227)]/40 hover:bg-zinc-800/80"
            >
              <span className="text-2xl">🎰</span>
              <span className="px-2 text-xs font-semibold text-zinc-300">{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 기존 CasinoPortalCards 재사용 */}
      <div className="mt-8 px-3">
        <p className="mb-3 text-xs uppercase tracking-wider text-zinc-600">추천 게임</p>
        <CasinoPortalCards />
      </div>
    </div>
  );
}

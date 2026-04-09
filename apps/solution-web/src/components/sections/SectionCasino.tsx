"use client";

/*
  ─── SectionCasino (ZXX.BET casino-providers-main 참조) ────────
  구조:
    .casino-providers-main (배경 이미지)
      .casino_providers_content
        .top-container (타이틀 + "전체 보기")
        .casino-providers-grid
          .casino-provider-card × N  (섬네일 + 로고)
  ─────────────────────────────────────────────────────────────────
*/

import Link from "next/link";
import { CasinoPortalCards } from "@/components/CasinoPortalCards";

/* 카지노 제공사 목록 (뼈대 — 실제 연동 전 placeholder) */
const CASINO_PROVIDERS = [
  "Evolution", "Pragmatic Live", "Vivo Gaming",
  "Sexy Casino", "Skywind Live", "SA Gaming",
  "PlayTech Live", "Big Gaming", "Taishan",
];

export function SectionCasino() {
  return (
    <div className="px-3 py-4 sm:px-4">
      {/* 섹션 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">카지노</h2>
        <Link href="/lobby/live-casino" className="text-xs text-[var(--theme-primary,#c9a227)]">
          전체 보기 →
        </Link>
      </div>

      {/* 제공사 그리드 (ZXX.BET: .casino-providers-grid) */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {CASINO_PROVIDERS.map((name) => (
          <button
            key={name}
            type="button"
            className="flex aspect-video items-center justify-center rounded border border-white/8 bg-white/3 text-center text-[10px] font-medium text-zinc-400"
          >
            {name}
          </button>
        ))}
      </div>

      {/* 기존 카드 컴포넌트 (있는 경우 재활용) */}
      <div className="mt-4">
        <CasinoPortalCards />
      </div>
    </div>
  );
}

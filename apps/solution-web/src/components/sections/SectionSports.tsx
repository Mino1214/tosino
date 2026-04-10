"use client";

/*
  ─── SectionSports (ZXX.BET live_sports 섹션 참조) ──────────────
  구조:
    .section.live_sports
      .liveSports
        .text-wrapper (타이틀 + "전체 보기" 버튼)
        .content
          .container × N  (SportsMatchCard 반복)
  ─────────────────────────────────────────────────────────────────
*/

import Link from "next/link";
import { SportsMatchCard, SAMPLE_MATCHES } from "@/components/SportsMatchCard";

export function SectionSports() {
  return (
    <div className="px-3 py-4 sm:px-4">
      {/* 섹션 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-sm font-bold text-white">실시간 스포츠</h2>
        </div>
        <Link
          href="/lobby/sports-kr"
          className="text-xs text-main-gold"
        >
          전체 보기 →
        </Link>
      </div>

      {/* 서브 탭: 크로스 / 스페셜 / 실시간 / 프리매치 (뼈대) */}
      <div className="mb-3 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["크로스", "스페셜", "실시간", "BJ크리에이터"].map((label) => (
          <button
            key={label}
            type="button"
            className="shrink-0 rounded border border-white/10 px-3 py-1 text-xs text-zinc-400 first:border-[rgba(218,174,87,0.6)] first:text-main-gold"
          >
            {label}
          </button>
        ))}
      </div>

      {/* 경기 카드 목록 */}
      <div className="space-y-px">
        {SAMPLE_MATCHES.map((match, i) => (
          <SportsMatchCard key={i} {...match} />
        ))}
      </div>

      {/* 스포츠 로비 진입 */}
      <div className="mt-4 flex gap-2">
        <Link
          href="/lobby/sports-kr"
          className="flex-1 rounded border border-white/10 py-3 text-center text-sm font-semibold text-white"
        >
          국내 스포츠 입장
        </Link>
        <Link
          href="/lobby/sports-eu"
          className="flex-1 rounded border border-white/10 py-3 text-center text-sm text-zinc-400"
        >
          유럽 스포츠 입장
        </Link>
      </div>
    </div>
  );
}

"use client";

/*
  라이브 카지노 로비
  · 메인: CasinoPortalCards (여자사진+카드) — 기존 기능 그대로 유지
  · 상단: 광고 배너 + 제공사 필터 탭
*/

import { AdBanner } from "@/components/SportsLobbyLayout";
import { CasinoPortalCards } from "@/components/CasinoPortalCards";
import { useState } from "react";

const PROVIDER_TABS = [
  "전체",
  "Evolution",
  "Pragmatic",
  "Vivo Gaming",
  "Sexy Casino",
  "SA Gaming",
  "PlayTech",
  "Skywind",
];

export default function LiveCasinoPage() {
  const [activeTab, setActiveTab] = useState("전체");

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 pb-10">
      {/* 광고 배너 */}
      <AdBanner
        title="라이브 카지노 이벤트  첫충 보너스 혜택을 받아가세요!"
        variant="billboard"
      />

      <div className="content-pad-phi mx-auto w-full min-w-0 max-w-[90rem]">
        {/* 헤더 */}
        <div className="border-b border-[rgba(218,174,87,0.2)] bg-black py-4">
          <h1 className="text-lg font-bold text-main-gold sm:text-xl">라이브 카지노</h1>
          <p className="mt-0.5 text-xs text-main-gold-solid/75">
            Evolution · Pragmatic · Vivo Gaming 외
          </p>
        </div>

        {/* 제공사 탭 (가로 스크롤) */}
        <div className="-mx-[var(--content-pad-phi)] overflow-x-auto border-b border-white/5 bg-zinc-950">
          <div
            className="flex gap-1 py-2"
            style={{
              minWidth: "max-content",
              paddingLeft: "var(--content-pad-phi)",
              paddingRight: "var(--content-pad-phi)",
            }}
          >
            {PROVIDER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors",
                  activeTab === tab
                    ? "bg-gold-gradient text-black"
                    : "border border-[rgba(218,174,87,0.25)] text-main-gold-solid/70 hover:border-[rgba(218,174,87,0.45)] hover:text-main-gold-solid",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 메인 카드 그리드 */}
        <div className="pt-5">
          <CasinoPortalCards />
        </div>
      </div>
    </div>
  );
}

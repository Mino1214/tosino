"use client";

/*
  ─── HomePage 규격 ────────────────────────────────
  · layout.tsx 가 이미 pt-12 / pb-14 / md:mr-72 처리
  · 여기서는 배너(선택) + HomePortal 만 렌더
  · BettingCartDock 은 데스크톱 fixed right-0 top-12
  ─────────────────────────────────────────────────
*/

import Image from "next/image";
import { useState } from "react";
import { useBootstrap } from "@/components/BootstrapProvider";
import { BettingCartProvider } from "@/components/BettingCartContext";
import { BettingCartDock } from "@/components/BettingCartDock";
import { HomePortal, type PortalView } from "@/components/HomePortal";

export default function HomePage() {
  const b = useBootstrap();
  const [view, setView] = useState<PortalView>("sports");

  if (!b) return null;

  const firstBanner = b.theme.bannerUrls[0];

  return (
    <BettingCartProvider>
      {/* 배너 */}
      {firstBanner && (
        <div className="relative aspect-[21/6] w-full overflow-hidden">
          <Image src={firstBanner} alt="" fill className="object-cover" sizes="100vw" priority />
        </div>
      )}

      {/* 카테고리 탭 + 콘텐츠 */}
      <HomePortal view={view} onViewChange={setView} />

      {/* 배팅카트 (데스크톱 fixed right, 모바일 슬라이드업) */}
      <BettingCartDock />
    </BettingCartProvider>
  );
}

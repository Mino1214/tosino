"use client";

import Image from "next/image";
import { useState } from "react";
import { useBootstrap } from "@/components/BootstrapProvider";
import { BettingCartProvider } from "@/components/BettingCartContext";
import { BettingCartDock } from "@/components/BettingCartDock";
import { HomePortal, type PortalView } from "@/components/HomePortal";
import { publicAsset } from "@/lib/public-asset";

export default function HomePage() {
  const b = useBootstrap();
  const [view, setView] = useState<PortalView>("sports");

  if (!b) return null;

  const firstBanner = b.theme.bannerUrls[0];

  return (
    <BettingCartProvider>
      {/* 데스크톱: 중앙 콘텐츠 + 오른쪽 배팅카트 */}
      <div className="relative min-h-[calc(100dvh-3rem)]">
        <div className="mx-auto max-w-5xl lg:pr-[19rem]">
          {/* 배너 (선택적, 홈에서만) */}
          {firstBanner && (
            <div className="relative aspect-[21/6] w-full overflow-hidden">
              <Image
                src={firstBanner}
                alt="메인 배너"
                fill
                className="object-cover"
                sizes="100vw"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0e]/60 to-transparent" />
            </div>
          )}

          {/* 사이트 이름 (배너 없을 때) */}
          {!firstBanner && (
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--theme-primary,#c9a227)]" />
              <span className="text-xs font-medium text-zinc-400">{b.name}</span>
            </div>
          )}

          {/* 메인 포털 — 탭 + 콘텐츠 */}
          <HomePortal view={view} onViewChange={setView} />
        </div>

        {/* 배팅카트 (데스크톱 우측 고정) */}
        <BettingCartDock />
      </div>
    </BettingCartProvider>
  );
}

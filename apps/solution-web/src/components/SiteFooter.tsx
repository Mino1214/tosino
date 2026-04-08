"use client";

import Image from "next/image";
import { publicAsset } from "@/lib/public-asset";

/** 파트너 로고 — 4 + 4 + 2 그리드 (순서 섞음) */
const PARTNER_LOGOS_SHUFFLED = [
  "/logo/logo_Pragmatic.png",
  "/logo/logo_Skywind.png",
  "/logo/logo_Asia.png",
  "/logo/logo_MicroGaming.png",
  "/logo/logo_Betgames.png",
  "/logo/logo_Evolution.png",
  "/logo/logo_Wm.png",
  "/logo/logo_Dreamgame.png",
  "/logo/logo_Pragmatic.png",
  "/logo/logo_Asia.png",
];

export function SiteFooter() {
  const row1 = PARTNER_LOGOS_SHUFFLED.slice(0, 4);
  const row2 = PARTNER_LOGOS_SHUFFLED.slice(4, 8);
  const row3 = PARTNER_LOGOS_SHUFFLED.slice(8, 10);

  return (
    <footer className="relative z-10 mt-16 border-t border-white/10 bg-black/40 px-4 py-12">
      <div className="mx-auto max-w-5xl lg:pr-[calc(18rem+1.5rem)]">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
          Partners
        </p>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
            {row1.map((src, i) => (
              <div
                key={`r1-${i}`}
                className="relative flex h-12 items-center justify-center sm:h-14"
              >
                <Image
                  src={publicAsset(src)}
                  alt=""
                  fill
                  className="object-contain object-center opacity-80"
                  unoptimized
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-8">
            {row2.map((src, i) => (
              <div
                key={`r2-${i}`}
                className="relative flex h-12 items-center justify-center sm:h-14"
              >
                <Image
                  src={publicAsset(src)}
                  alt=""
                  fill
                  className="object-contain object-center opacity-80"
                  unoptimized
                />
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-10 sm:gap-16">
            {row3.map((src, i) => (
              <div
                key={`r3-${i}`}
                className="relative h-12 w-32 sm:h-14 sm:w-40"
              >
                <Image
                  src={publicAsset(src)}
                  alt=""
                  fill
                  className="object-contain object-center opacity-80"
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-zinc-500">
          Copyright © Pandora All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}

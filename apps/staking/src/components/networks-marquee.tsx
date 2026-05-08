"use client";

import Image from "next/image";
import { useState } from "react";

// 네트워크 라벨과 public/logos/networks/ 안의 파일명 매핑.
// 파일이 svg/png 중 어느 쪽이든 자동으로 시도합니다.
export const NETWORK_LOGOS: { label: string; slug: string }[] = [
  { label: "Ethereum", slug: "ethereum" },
  { label: "Bitcoin", slug: "bitcoin" },
  { label: "Solana", slug: "solana" },
  { label: "BNB Chain", slug: "bnb" },
  { label: "Polygon", slug: "polygon" },
  { label: "Arbitrum", slug: "arbitrum" },
  { label: "Optimism", slug: "optimism" },
  { label: "Cosmos", slug: "cosmos" },
  { label: "Avalanche", slug: "avalanche" },
  { label: "NEAR", slug: "near" },
];

const EXT_CHAIN = ["svg", "png", "webp"] as const;

function NetworkLogo({ label, slug }: { label: string; slug: string }) {
  const [extIdx, setExtIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = `/logos/networks/${slug}.${EXT_CHAIN[extIdx]}`;

  return !failed ? (
    <Image
      key={src}
      src={src}
      alt={label}
      title={label}
      width={128}
      height={128}
      className="h-20 w-20 shrink-0 object-contain transition-transform duration-300 hover:scale-110 sm:h-24 sm:w-24 lg:h-28 lg:w-28"
      onError={() => {
        if (extIdx < EXT_CHAIN.length - 1) {
          setExtIdx(extIdx + 1);
        } else {
          setFailed(true);
        }
      }}
      unoptimized
    />
  ) : (
    <div
      title={label}
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-sm font-bold text-foreground/60 sm:h-24 sm:w-24 lg:h-28 lg:w-28"
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function NetworksMarquee() {
  // 두 번 복제해서 끊김 없는 무한 루프
  const items = [...NETWORK_LOGOS, ...NETWORK_LOGOS];
  return (
    <div className="relative overflow-hidden">
      {/* 좌우 fade 마스크 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white/90 to-transparent" />

      <div className="ticker-anim flex w-max items-center gap-16 py-4 sm:gap-20 lg:gap-24">
        {items.map((n, i) => (
          <NetworkLogo key={`${n.slug}-${i}`} label={n.label} slug={n.slug} />
        ))}
      </div>
    </div>
  );
}

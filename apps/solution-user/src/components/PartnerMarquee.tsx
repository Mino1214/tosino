"use client";

/*
  PartnerMarquee — Official Partners (웹 푸터 위)
  · public/partner 에 있는 이미지 파일만 표시 (빌드 시 스캔된 경로 전달)
  · 카드/틀 없이 이미지만 마퀴 이동 (높이만 통일, 가로는 비율 유지)
*/

import Image from "next/image";
import { publicAsset } from "@/lib/public-asset";

type Props = {
  logoPaths: string[];
};

export function PartnerMarquee({ logoPaths }: Props) {
  const loop = logoPaths.length > 0 ? [...logoPaths, ...logoPaths] : [];

  return (
    <div className="hidden border-t border-white/5 bg-black py-14 md:block">
      {logoPaths.length > 0 ? (
        <>
          <p className="mb-6 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            Powered By
          </p>
          <div className="overflow-hidden">
            <div className="flex w-max animate-marquee items-center gap-10">
              {loop.map((src, i) => {
                const assetSrc = publicAsset(src);
                return (
                <Image
                  key={`${src}-${i}`}
                  src={assetSrc}
                  alt=""
                  width={280}
                  height={64}
                  className="h-16 w-auto max-w-[17.5rem] shrink-0 object-contain"
                  sizes="280px"
                  unoptimized={/\.svg(?:$|\?)/i.test(assetSrc)}
                />
                );
              })}
            </div>
          </div>
        </>
      ) : null}

      <p
        className={`text-center text-[10px] text-zinc-700 ${logoPaths.length > 0 ? "mt-10" : "mt-0"}`}
      >
        COPYRIGHT © I-ON CASINO ALL RIGHTS RESERVED.
      </p>
    </div>
  );
}

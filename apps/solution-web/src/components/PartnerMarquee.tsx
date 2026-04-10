"use client";

/*
  PartnerMarquee — Official Partners (웹 푸터 위)
  · public/partner 에 있는 이미지 파일만 표시 (빌드 시 스캔된 경로 전달)
  · 슬롯 크기 통일 + object-contain 로 비율 다른 로고도 동일 박스 안에 맞춤
*/

import Image from "next/image";

type Props = {
  logoPaths: string[];
};

export function PartnerMarquee({ logoPaths }: Props) {
  const loop = logoPaths.length > 0 ? [...logoPaths, ...logoPaths] : [];

  return (
    <div className="hidden border-t border-white/5 bg-zinc-950 py-14 md:block">
      {logoPaths.length > 0 ? (
        <>
          <p className="mb-6 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
            Official Partners
          </p>
          <div className="overflow-hidden">
            <div className="flex w-max animate-marquee gap-6">
              {loop.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative flex h-16 w-44 shrink-0 items-center justify-center rounded-md border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-contain p-1.5"
                    sizes="176px"
                    unoptimized={src.endsWith(".svg")}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <p
        className={`text-center text-[10px] text-zinc-700 ${logoPaths.length > 0 ? "mt-10" : "mt-0"}`}
      >
        COPYRIGHT © TOSINO ALL RIGHTS RESERVED.
      </p>
    </div>
  );
}

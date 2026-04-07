"use client";

import Image from "next/image";
import { useBootstrap } from "@/components/BootstrapProvider";
import { CategoryGrid } from "@/components/CategoryGrid";
import { cardRadiusClass } from "@/lib/theme-ui";

export default function HomePage() {
  const b = useBootstrap();
  if (!b) return null;

  const ui = b.theme.ui;
  const compact = ui?.homeLayout === "compact";
  const radius = cardRadiusClass(ui?.cardRadius);
  const bannerGap = compact ? "gap-2 sm:gap-3" : "gap-3 sm:gap-4";
  const isLight = (ui?.background ?? "dark") === "light";

  return (
    <div className="mx-auto max-w-5xl px-3 pb-16 pt-6 sm:px-4 md:pt-10">
      <section
        className={
          compact
            ? "mb-6 text-center md:mb-8"
            : "mb-8 text-center md:mb-10"
        }
      >
        <p
          className={`mb-2 text-xs uppercase tracking-[0.25em] text-[var(--theme-primary,#c9a227)] sm:text-sm`}
        >
          {b.name}
        </p>
        <h1
          className={
            compact
              ? `text-xl font-bold sm:text-2xl md:text-3xl ${isLight ? "text-zinc-900" : "text-white"}`
              : `text-2xl font-bold sm:text-3xl md:text-4xl ${isLight ? "text-zinc-900" : "text-white"}`
          }
        >
          {b.theme.siteName}
        </h1>
        <p
          className={`mt-2 text-sm md:text-base ${isLight ? "text-zinc-600" : "text-zinc-400"}`}
        >
          모바일·웹 동시에 보기 편한 홈 — 카드를 눌러 입장
        </p>
      </section>

      <div className={`grid ${bannerGap} md:grid-cols-2`}>
        {b.theme.bannerUrls.length === 0 ? (
          <div
            className={`flex aspect-[21/9] items-center justify-center border border-white/10 bg-gradient-to-br from-zinc-900 to-black text-sm text-zinc-500 md:col-span-2 ${radius}`}
          >
            배너는 관리자에서 플랫폼 테마로 설정
          </div>
        ) : (
          b.theme.bannerUrls.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className={`relative aspect-[21/9] overflow-hidden border border-white/10 ${radius}`}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={i === 0}
              />
            </div>
          ))
        )}
      </div>

      <CategoryGrid />
    </div>
  );
}

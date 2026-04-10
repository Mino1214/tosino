"use client";

/*
  ─── HomePage ───────────────────────────────────────────────────
  · 데스크톱: /thumbnail/one|two|three.mp4 (원본 비율 object-contain)
  · 모바일:  /thumbnail/m_one|m_two|m_three.mp4
  · 첫 슬라이드 preload=auto + 첫 데스크톱/모바일 소스 우선 로드
  ─────────────────────────────────────────────────────────────────
*/

import Link from "next/link";
import { useRef, useState } from "react";
import { PartnerMarquee } from "@/components/PartnerMarquee";

const HERO_SLIDES = [
  {
    id: "casino",
    label: "LIVE CASINO",
    title: "라이브 카지노",
    sub: "Evolution · Pragmatic · Vivo Gaming",
    cta1: { label: "카지노 입장", href: "/lobby/live-casino" },
    cta2: { label: "슬롯 게임", href: "/lobby/slots" },
    desktopSrc: "/thumbnail/one.mp4",
    mobileSrc: "/thumbnail/m_one.mp4",
  },
  {
    id: "slots",
    label: "SLOTS",
    title: "슬롯 게임",
    sub: "Pragmatic · Hacksaw · Nolimit City · CQ9",
    cta1: { label: "슬롯 입장", href: "/lobby/slots" },
    cta2: { label: "카지노 입장", href: "/lobby/live-casino" },
    desktopSrc: "/thumbnail/two.mp4",
    mobileSrc: "/thumbnail/m_two.mp4",
  },
  {
    id: "minigame",
    label: "MINIGAMES",
    title: "미니게임",
    sub: "보글보글 · 슈퍼마리오 · 룰렛 · BTC 파워볼",
    cta1: { label: "미니게임 입장", href: "/lobby/minigame" },
    cta2: { label: "이벤트", href: "/mypage#event1" },
    desktopSrc: "/thumbnail/three.mp4",
    mobileSrc: "/thumbnail/m_three.mp4",
  },
] as const;

function HeroVideos({
  desktopSrc,
  mobileSrc,
  preload,
}: {
  desktopSrc: string;
  mobileSrc: string;
  preload: "auto" | "metadata";
}) {
  return (
    <>
      <video
        key={`d-${desktopSrc}`}
        className="pointer-events-none hidden h-full w-full bg-black object-contain md:block"
        autoPlay
        muted
        loop
        playsInline
        preload={preload}
        aria-hidden
      >
        <source src={desktopSrc} type="video/mp4" />
      </video>
      <video
        key={`m-${mobileSrc}`}
        className="pointer-events-none h-full w-full bg-black object-cover md:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload={preload}
        aria-hidden
      >
        <source src={mobileSrc} type="video/mp4" />
      </video>
    </>
  );
}

export default function HomePage() {
  const [slide, setSlide] = useState(0);

  const touchStartX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setSlide((p) => Math.min(p + 1, HERO_SLIDES.length - 1));
    else setSlide((p) => Math.max(p - 1, 0));
    touchStartX.current = null;
  }

  return (
    <>
      {/* 데스크톱 — scroll-snap */}
      <div
        className="hidden h-dvh snap-y snap-mandatory overflow-y-scroll md:block
                   [-ms-overflow-style:none] [scrollbar-width:none]
                   [&::-webkit-scrollbar]:hidden"
      >
        {HERO_SLIDES.map((s, i) => (
          <section
            key={s.id}
            id={s.id}
            className="relative flex h-dvh snap-start items-stretch justify-stretch bg-black"
          >
            <div className="absolute inset-0">
              <HeroVideos
                desktopSrc={s.desktopSrc}
                mobileSrc={s.mobileSrc}
                preload={i === 0 ? "auto" : "metadata"}
              />
            </div>

            <div className="relative z-10 flex w-full flex-col justify-end bg-gradient-to-t from-black/95 via-black/35 to-transparent px-6 pb-16 pt-32 md:pb-20 md:pt-40">
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center md:gap-6">
                <p className="text-xs uppercase tracking-widest text-main-gold">
                  {s.label}
                </p>
                <h1 className="text-3xl font-bold text-white lg:text-5xl xl:text-6xl">
                  {s.title}
                </h1>
                <p className="text-sm text-zinc-300 md:text-base">{s.sub}</p>
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  <Link
                    href={s.cta1.href}
                    className="rounded-lg bg-gold-gradient px-6 py-2.5 text-sm font-bold md:px-8 md:py-3"
                  >
                    {s.cta1.label}
                  </Link>
                  <Link
                    href={s.cta2.href}
                    className="rounded-lg border border-white/25 px-6 py-2.5 text-sm font-semibold text-white md:px-8 md:py-3"
                  >
                    {s.cta2.label}
                  </Link>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-zinc-600 md:bottom-8">
              <div className="flex h-8 w-5 justify-center rounded-full border border-zinc-600">
                <div className="mt-1.5 h-1.5 w-0.5 animate-bounce rounded-full bg-zinc-500" />
              </div>
              <span className="text-[10px] uppercase tracking-widest">Scroll</span>
            </div>
          </section>
        ))}

        <div className="snap-start">
          <PartnerMarquee />
        </div>
      </div>

      {/* 모바일 — 가로 캐러셀 */}
      <div
        className="md:hidden h-[calc(100svh-var(--app-mobile-nav)-env(safe-area-inset-bottom,0px))] overflow-hidden overscroll-none touch-pan-x"
      >
        <div
          className="relative h-full overflow-hidden overscroll-none touch-pan-x bg-black"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {HERO_SLIDES.map((s, i) => (
              <div
                key={s.id}
                className="relative h-full w-full shrink-0 bg-black"
              >
                <div className="absolute inset-0">
                  <HeroVideos
                    desktopSrc={s.desktopSrc}
                    mobileSrc={s.mobileSrc}
                    preload={slide === i ? "auto" : "metadata"}
                  />
                </div>
                <div className="relative z-10 flex h-full w-full flex-col justify-end bg-gradient-to-t from-black/95 via-black/40 to-transparent pb-14 pt-24">
                  <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-4 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-main-gold">
                      {s.label}
                    </p>
                    <h2 className="text-2xl font-bold text-white">{s.title}</h2>
                    <p className="text-sm text-zinc-300">{s.sub}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        href={s.cta1.href}
                        className="rounded-lg bg-gold-gradient px-5 py-2.5 text-sm font-bold"
                      >
                        {s.cta1.label}
                      </Link>
                      <Link
                        href={s.cta2.href}
                        className="rounded-lg border border-white/25 px-5 py-2.5 text-sm text-white"
                      >
                        {s.cta2.label}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slide ? "w-5 bg-gold-gradient" : "w-1.5 bg-white/25"
                }`}
                aria-label={`슬라이드 ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

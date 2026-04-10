"use client";

/*
  ─── HomePage (client) ──────────────────────────────────────────
  · partnerLogoPaths: 서버에서 public/partner 스캔 결과 전달
  ─────────────────────────────────────────────────────────────────
*/

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PartnerMarquee } from "@/components/PartnerMarquee";
import { publicAsset } from "@/lib/public-asset";

const HERO_SLIDES = [
  {
    id: "casino",
    label: "LIVE CASINO",
    title: "라이브 카지노",
    sub: "Evolution · Pragmatic · Vivo Gaming",
    cta1: { label: "카지노 입장", href: "/lobby/live-casino" },
    cta2: { label: "슬롯 게임", href: "/lobby/slots" },
    desktopSrc: publicAsset("/thumbnail/one.mp4"),
    mobileSrc: publicAsset("/thumbnail/m_one.mp4"),
  },
  {
    id: "slots",
    label: "SLOTS",
    title: "슬롯 게임",
    sub: "Pragmatic · Hacksaw · Nolimit City · CQ9",
    cta1: { label: "슬롯 입장", href: "/lobby/slots" },
    cta2: { label: "카지노 입장", href: "/lobby/live-casino" },
    desktopSrc: publicAsset("/thumbnail/two.mp4"),
    mobileSrc: publicAsset("/thumbnail/m_two.mp4"),
  },
  {
    id: "minigame",
    label: "MINIGAMES",
    title: "미니게임",
    sub: "보글보글 · 슈퍼마리오 · 룰렛 · BTC 파워볼",
    cta1: { label: "미니게임 입장", href: "/lobby/minigame" },
    cta2: { label: "이벤트", href: "/mypage#event1" },
    desktopSrc: publicAsset("/thumbnail/three.mp4"),
    mobileSrc: publicAsset("/thumbnail/m_three.mp4"),
  },
] as const;

type HeroSlide = (typeof HERO_SLIDES)[number];

function HeroVideos({
  desktopSrc,
  mobileSrc,
  preload,
  isActive = true,
}: {
  desktopSrc: string;
  mobileSrc: string;
  preload: "auto" | "metadata" | "none";
  isActive?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const arm = (v: HTMLVideoElement) => {
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
    };

    arm(video);

    const tryPlay = () => {
      if (!isActive) {
        video.pause();
        return;
      }
      arm(video);
      requestAnimationFrame(() => {
        void video.play().catch(() => {
          window.setTimeout(() => void video.play().catch(() => {}), 120);
        });
      });
    };

    const onRecover = () => {
      if (!isActive) return;
      tryPlay();
    };

    tryPlay();

    video.addEventListener("loadeddata", tryPlay);
    video.addEventListener("canplay", tryPlay);
    video.addEventListener("canplaythrough", tryPlay);
    video.addEventListener("stalled", onRecover);
    video.addEventListener("waiting", onRecover);
    video.addEventListener("ended", tryPlay);

    const onVis = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVis);
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) tryPlay();
    };
    window.addEventListener("pageshow", onShow);

    return () => {
      video.removeEventListener("loadeddata", tryPlay);
      video.removeEventListener("canplay", tryPlay);
      video.removeEventListener("canplaythrough", tryPlay);
      video.removeEventListener("stalled", onRecover);
      video.removeEventListener("waiting", onRecover);
      video.removeEventListener("ended", tryPlay);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onShow);
    };
  }, [desktopSrc, mobileSrc, isActive]);

  return (
    <video
      ref={videoRef}
      className="pointer-events-none h-full w-full bg-black object-cover md:object-contain"
      autoPlay
      muted
      loop
      playsInline
      preload={preload}
      aria-hidden
    >
      <source media="(max-width: 767px)" src={mobileSrc} type="video/mp4" />
      <source media="(min-width: 768px)" src={desktopSrc} type="video/mp4" />
    </video>
  );
}

function DesktopHeroSlide({ s, index }: { s: HeroSlide; index: number }) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(index === 0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        /* 스냅 스크롤·주소창으로 비율이 흔들릴 때 재생이 끊기지 않게 완화 */
        setInView(e.isIntersecting && e.intersectionRatio >= 0.28);
      },
      { threshold: [0, 0.2, 0.28, 0.45, 0.65, 1], rootMargin: "0px 0px 2% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id={s.id}
      className="relative flex h-[100svh] snap-start items-stretch justify-stretch bg-black"
    >
      <div className="absolute inset-0">
        <HeroVideos
          desktopSrc={s.desktopSrc}
          mobileSrc={s.mobileSrc}
          preload={index === 0 ? "auto" : "none"}
          isActive={inView}
        />
      </div>

      <div className="relative z-10 flex w-full flex-col justify-end bg-gradient-to-t from-black via-black/90 to-black/25 px-6 pb-16 pt-32 md:pb-20 md:pt-40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center md:gap-6">
          <p className="text-xs uppercase tracking-widest text-main-gold drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] md:text-sm">
            {s.label}
          </p>
          <h1 className="text-3xl font-bold text-main-gold-solid drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] lg:text-5xl xl:text-6xl">
            {s.title}
          </h1>
          <p className="text-sm text-[#e6d5a8] drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] md:text-lg">
            {s.sub}
          </p>
          <div className="flex w-full max-w-xs flex-col items-stretch gap-3 md:max-w-sm">
            <Link
              href={s.cta1.href}
              className="rounded-lg bg-gold-gradient px-6 py-3 text-center text-sm font-bold md:px-8 md:py-3.5 md:text-base"
            >
              {s.cta1.label}
            </Link>
            <Link
              href={s.cta2.href}
              className="rounded-lg border-2 border-[rgba(218,174,87,0.55)] bg-black/40 px-6 py-3 text-center text-sm font-semibold text-main-gold-solid shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-sm md:px-8 md:py-3.5 md:text-base"
            >
              {s.cta2.label}
            </Link>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-zinc-500 md:bottom-8">
        <div className="flex h-8 w-5 justify-center rounded-full border border-zinc-500">
          <div className="mt-1.5 h-1.5 w-0.5 animate-bounce rounded-full bg-zinc-400" />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-zinc-400">Scroll</span>
      </div>
    </section>
  );
}

export function HomePageClient({ partnerLogoPaths }: { partnerLogoPaths: string[] }) {
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
      <div
        className="hidden h-[100svh] snap-y snap-mandatory overflow-y-scroll md:block
                   [-ms-overflow-style:none] [scrollbar-width:none]
                   [&::-webkit-scrollbar]:hidden"
      >
        {HERO_SLIDES.map((s, i) => (
          <DesktopHeroSlide key={s.id} s={s} index={i} />
        ))}

        <div className="snap-start">
          <PartnerMarquee logoPaths={partnerLogoPaths} />
        </div>
      </div>

      <div
        className="md:hidden h-[calc(100svh-var(--app-mobile-nav-total))] overflow-hidden overscroll-none touch-pan-x"
      >
        <div
          className="relative h-full overflow-hidden overscroll-none touch-pan-x bg-black"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex h-full will-change-transform transition-transform duration-500 ease-in-out [backface-visibility:hidden]"
            style={{ transform: `translate3d(-${slide * 100}%,0,0)` }}
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
                    /* 현재 슬라이드만 적극 로드하고, 나머지는 메타데이터만 받아 초기 자산 폭주를 막음 */
                    preload={slide === i ? "auto" : "metadata"}
                    isActive={slide === i}
                  />
                </div>
                <div className="relative z-10 flex h-full w-full flex-col justify-end bg-gradient-to-t from-black via-black/88 to-black/30 pb-14 pt-24">
                  <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-4 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-main-gold drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                      {s.label}
                    </p>
                    <h2 className="text-2xl font-bold text-main-gold-solid drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
                      {s.title}
                    </h2>
                    <p className="text-sm text-[#e6d5a8] drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                      {s.sub}
                    </p>
                    <div className="flex w-full max-w-[280px] flex-col gap-2.5">
                      <Link
                        href={s.cta1.href}
                        className="rounded-lg bg-gold-gradient px-5 py-2.5 text-center text-sm font-bold"
                      >
                        {s.cta1.label}
                      </Link>
                      <Link
                        href={s.cta2.href}
                        className="rounded-lg border-2 border-[rgba(218,174,87,0.5)] bg-black/45 px-5 py-2.5 text-center text-sm font-semibold text-main-gold-solid backdrop-blur-sm"
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

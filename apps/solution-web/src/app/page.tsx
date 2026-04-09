"use client";

/*
  ─── HomePage 규격 ──────────────────────────────────────────────
  Desktop:
    · 3개 섹션 + 파트너 푸터를 scroll-snap-y 컨테이너로 감쌈
    · 컨테이너: h-dvh overflow-y-scroll snap-y snap-mandatory
    · 각 섹션: h-dvh snap-start
    · 파트너 푸터: snap-start (별도 높이)
    · 헤더는 fixed 투명이므로 pt-0

  Mobile:
    · 3개 섹션이 좌우 가로 슬라이드 (CSS translate)
    · 4초마다 자동 전환, 하단 인디케이터 표시
  ─────────────────────────────────────────────────────────────────
*/

import Link from "next/link";
import { useRef, useState } from "react";
import { PartnerMarquee } from "@/components/PartnerMarquee";

const SECTIONS = [
  {
    id: "sports",
    label: "LIVE SPORTS",
    title: "실시간 스포츠 베팅",
    sub: "크로스 · 스페셜 · 실시간 · BJ크리에이터",
    cta1: { label: "스포츠 입장", href: "/lobby/sports-kr" },
    cta2: { label: "프리매치",   href: "/lobby/prematch"  },
    bg: "bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-black",
  },
  {
    id: "casino",
    label: "LIVE CASINO",
    title: "라이브 카지노",
    sub: "Evolution · Pragmatic · Vivo Gaming",
    cta1: { label: "카지노 입장", href: "/lobby/live-casino" },
    cta2: { label: "슬롯 게임",   href: "/lobby/slots"       },
    bg: "bg-gradient-to-br from-amber-950/50 via-zinc-950 to-black",
  },
  {
    id: "minigame",
    label: "MINIGAMES",
    title: "미니게임",
    sub: "보글보글 · 슈퍼마리오 · 룰렛 · BTC 파워볼",
    cta1: { label: "미니게임 입장", href: "/lobby/minigame"   },
    cta2: { label: "이벤트",       href: "/mypage#event1"    },
    bg: "bg-gradient-to-br from-violet-950/50 via-zinc-950 to-black",
  },
] as const;

export default function HomePage() {
  const [slide, setSlide] = useState(0);

  /* 터치 스와이프 */
  const touchStartX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setSlide((p) => Math.min(p + 1, SECTIONS.length - 1));
    else        setSlide((p) => Math.max(p - 1, 0));
    touchStartX.current = null;
  }

  return (
    <>
      {/* ══════════════════════════════════════════════════════
          DESKTOP — scroll-snap 컨테이너
          (h-dvh + overflow-y-scroll + snap-y mandatory)
          ══════════════════════════════════════════════════════ */}
      <div
        className="hidden md:block h-dvh overflow-y-scroll snap-y snap-mandatory
                   [-ms-overflow-style:none] [scrollbar-width:none]
                   [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s) => (
          <section
            key={s.id}
            id={s.id}
            className={`relative flex h-dvh snap-start items-center justify-center ${s.bg}`}
          >
            <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
              <p className="text-xs uppercase tracking-widest text-[var(--theme-primary,#c9a227)]">
                {s.label}
              </p>
              <h1 className="text-4xl font-bold text-white lg:text-6xl">{s.title}</h1>
              <p className="text-base text-zinc-400">{s.sub}</p>
              <div className="flex gap-3">
                <Link
                  href={s.cta1.href}
                  className="rounded-lg bg-[var(--theme-primary,#c9a227)] px-8 py-3 text-sm font-bold text-black"
                >
                  {s.cta1.label}
                </Link>
                <Link
                  href={s.cta2.href}
                  className="rounded-lg border border-white/20 px-8 py-3 text-sm font-semibold text-white"
                >
                  {s.cta2.label}
                </Link>
              </div>
            </div>
            {/* 스크롤 인디케이터 */}
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-zinc-600">
              <div className="flex h-8 w-5 justify-center rounded-full border border-zinc-700">
                <div className="mt-1.5 h-1.5 w-0.5 animate-bounce rounded-full bg-zinc-500" />
              </div>
              <span className="text-[10px] uppercase tracking-widest">Scroll</span>
            </div>
          </section>
        ))}

        {/* 파트너 푸터 섹션 */}
        <div className="snap-start">
          <PartnerMarquee />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MOBILE — 자동 가로 캐러셀
          ══════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        <div
          className="relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {SECTIONS.map((s) => (
              <div
                key={s.id}
                className={`relative flex w-full shrink-0 min-h-[calc(100dvh-3.5rem)] items-center justify-center ${s.bg} py-16`}
              >
                <div className="flex flex-col items-center gap-5 px-6 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--theme-primary,#c9a227)]">
                    {s.label}
                  </p>
                  <h2 className="text-2xl font-bold text-white">{s.title}</h2>
                  <p className="text-sm text-zinc-400">{s.sub}</p>
                  <div className="flex gap-2">
                    <Link
                      href={s.cta1.href}
                      className="rounded-lg bg-[var(--theme-primary,#c9a227)] px-6 py-2.5 text-sm font-bold text-black"
                    >
                      {s.cta1.label}
                    </Link>
                    <Link
                      href={s.cta2.href}
                      className="rounded-lg border border-white/20 px-6 py-2.5 text-sm text-white"
                    >
                      {s.cta2.label}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 슬라이드 인디케이터 */}
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {SECTIONS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slide
                    ? "w-5 bg-[var(--theme-primary,#c9a227)]"
                    : "w-1.5 bg-white/25"
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

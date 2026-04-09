"use client";

/*
  ─── HomePage 규격 ───────────────────────────────────────────────
  · 헤더가 투명이므로 콘텐츠가 헤더 아래부터 시작 (pt-0)
  · 3개 섹션, 각 min-h-dvh, 스크롤로 이동
  · 배경은 이후 이미지로 대체 (현재 색상 placeholder)
  ─────────────────────────────────────────────────────────────────
*/

import Link from "next/link";

export default function HomePage() {
  return (
    <div id="PageMain">

        {/* ── Section 1: 스포츠 히어로 ─────────────────────────── */}
        <section
          id="section-sports"
          className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
        >
          {/* 배경 placeholder → 이후 <Image fill> 로 교체 */}
          <div className="absolute inset-0 bg-[url('/banner1.svg')] bg-cover bg-center opacity-10" />

          <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
            <p className="text-xs uppercase tracking-widest text-[var(--theme-primary,#c9a227)]">LIVE SPORTS</p>
            <h1 className="text-3xl font-bold text-white sm:text-5xl">실시간 스포츠 베팅</h1>
            <p className="max-w-sm text-sm text-zinc-400">
              크로스, 스페셜, 실시간, BJ크리에이터까지<br/>모든 스포츠를 한 곳에서
            </p>
            <div className="flex gap-3">
              <Link
                href="/lobby/sports-kr"
                className="rounded-lg bg-[var(--theme-primary,#c9a227)] px-6 py-3 font-bold text-black"
              >
                스포츠 입장
              </Link>
              <Link
                href="/lobby/prematch"
                className="rounded-lg border border-white/20 px-6 py-3 font-semibold text-white"
              >
                프리매치
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

        {/* ── Section 2: 카지노 ─────────────────────────────────── */}
        <section
          id="section-casino"
          className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-amber-950/40 via-zinc-950 to-black"
        >
          <div className="relative z-10 w-full max-w-3xl px-6">
            <div className="mb-8 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-amber-400">LIVE CASINO</p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">라이브 카지노</h2>
            </div>

            {/* 제공사 그리드 (배경 placeholder) */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {["Evolution", "Pragmatic", "Vivo Gaming", "Sexy Casino",
                "PlayTech", "SA Gaming", "Skywind", "Big Gaming"].map((name) => (
                <Link
                  key={name}
                  href="/lobby/live-casino"
                  className="flex aspect-video items-center justify-center rounded-xl border border-white/8 bg-white/5 text-center text-xs font-medium text-zinc-400 transition hover:border-amber-400/30 hover:bg-white/8"
                >
                  {name}
                </Link>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Link href="/lobby/live-casino" className="text-sm text-amber-400 hover:underline">
                카지노 게임 전체 보기 →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 3: 슬롯 + 미니게임 ───────────────────────── */}
        <section
          id="section-slot"
          className="relative flex min-h-dvh items-center justify-center bg-gradient-to-br from-violet-950/40 via-zinc-950 to-black"
        >
          <div className="relative z-10 w-full max-w-3xl px-6">
            <div className="mb-8 text-center">
              <p className="mb-2 text-xs uppercase tracking-widest text-violet-400">SLOTS & MINIGAMES</p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">슬롯 · 미니게임</h2>
            </div>

            {/* 슬롯 제공사 */}
            <div className="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {["CQ9", "Hacksaw", "Netent", "Evoplay", "Nolimit City",
                "Wazdan", "JDB", "FC Game", "Blueprint", "Booongo"].map((name) => (
                <Link
                  key={name}
                  href="/lobby/slots"
                  className="flex aspect-video items-center justify-center rounded-lg border border-white/8 bg-white/5 text-center text-[10px] text-zinc-500 transition hover:border-violet-400/30"
                >
                  {name}
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/lobby/slots"
                className="rounded-xl border border-white/10 py-4 text-center text-sm font-semibold text-white transition hover:border-violet-400/30"
              >
                슬롯 전체 보기
              </Link>
              <Link
                href="/lobby/minigame"
                className="rounded-xl border border-white/10 py-4 text-center text-sm font-semibold text-zinc-300 transition hover:border-violet-400/30"
              >
                미니게임 전체 보기
              </Link>
            </div>
          </div>
        </section>

    </div>
  );
}

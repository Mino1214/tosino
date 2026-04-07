"use client";

import Link from "next/link";
import { useBootstrap } from "./BootstrapProvider";
import { cardRadiusClass } from "@/lib/theme-ui";

const CATEGORIES = [
  {
    slug: "live-casino",
    title: "라이브 카지노",
    subtitle: "바카라 · 블랙잭",
    icon: "🎰",
    gradient: "from-rose-900/40 to-zinc-950",
  },
  {
    slug: "slots",
    title: "슬롯",
    subtitle: "인기 게임",
    icon: "🎡",
    gradient: "from-violet-900/40 to-zinc-950",
  },
  {
    slug: "sports-kr",
    title: "국내 스포츠",
    subtitle: "K리그 · KBO",
    icon: "⚾",
    gradient: "from-blue-900/40 to-zinc-950",
  },
  {
    slug: "sports-eu",
    title: "유럽 스포츠",
    subtitle: "축구 · 농구",
    icon: "⚽",
    gradient: "from-emerald-900/40 to-zinc-950",
  },
  {
    slug: "minigame",
    title: "미니게임",
    subtitle: "스피드 게임",
    icon: "🎯",
    gradient: "from-amber-900/35 to-zinc-950",
  },
  {
    slug: "promo",
    title: "이벤트",
    subtitle: "프로모션",
    icon: "🎁",
    gradient: "from-pink-900/35 to-zinc-950",
  },
] as const;

export function CategoryGrid() {
  const b = useBootstrap();
  if (!b) return null;

  const ui = b.theme.ui;
  const radius = cardRadiusClass(ui?.cardRadius);
  const dense = ui?.density === "compact";
  const gap = dense ? "gap-2 sm:gap-3" : "gap-3 sm:gap-4";
  const minh = dense
    ? "min-h-[100px] md:min-h-[120px]"
    : "min-h-[120px] md:min-h-[140px]";
  const isLight = (ui?.background ?? "dark") === "light";
  const titleClass = isLight
    ? "text-base font-bold text-zinc-900 group-hover:text-[var(--theme-primary,#c9a227)] md:text-lg"
    : "text-base font-bold text-white group-hover:text-[var(--theme-primary,#c9a227)] md:text-lg";
  const subClass = isLight ? "text-xs text-zinc-600" : "text-xs text-zinc-400";
  const arrowClass = isLight
    ? "absolute right-3 top-3 text-zinc-400 transition group-hover:text-[var(--theme-primary,#c9a227)]"
    : "absolute right-3 top-3 text-zinc-600 transition group-hover:text-[var(--theme-primary,#c9a227)]";

  return (
    <section className="mt-10">
      <h2
        className={`mb-1 text-lg font-semibold md:text-xl ${isLight ? "text-zinc-900" : "text-white"}`}
      >
        게임 입장
      </h2>
      <p className={`mb-4 text-sm ${isLight ? "text-zinc-600" : "text-zinc-500"}`}>
        탭처럼 크게 배치 — 모바일 엄지존에 맞춤
      </p>
      <div className={`grid grid-cols-2 md:grid-cols-3 ${gap}`}>
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/lobby/${c.slug}`}
            className={`group relative flex ${minh} flex-col justify-between overflow-hidden border border-white/10 bg-gradient-to-br p-4 shadow-lg transition active:scale-[0.98] ${radius} ${c.gradient}`}
          >
            <span className="text-3xl drop-shadow md:text-4xl">{c.icon}</span>
            <div>
              <h3 className={titleClass}>{c.title}</h3>
              <p className={`mt-0.5 ${subClass}`}>{c.subtitle}</p>
            </div>
            <span className={arrowClass}>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

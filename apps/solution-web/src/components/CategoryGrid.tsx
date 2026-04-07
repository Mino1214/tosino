"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBootstrap } from "./BootstrapProvider";
import { apiFetch, getAccessToken } from "@/lib/api";
import { cardRadiusClass } from "@/lib/theme-ui";

type VinusLaunchCfg = {
  vendor: string;
  game: string;
  method: "seamless" | "transfer";
};

type CategoryDef = {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  vinusLaunch?: VinusLaunchCfg;
};

const CATEGORIES: CategoryDef[] = [
  {
    slug: "live-casino",
    title: "라이브 카지노",
    subtitle: "바카라 · 블랙잭",
    icon: "🎰",
    gradient: "from-rose-900/40 to-zinc-950",
  },
  {
    slug: "cq9-casino",
    title: "CQ9 카지노",
    subtitle: "로비 입장",
    icon: "🎴",
    gradient: "from-teal-900/45 to-zinc-950",
    vinusLaunch: {
      vendor: "cq9_casino",
      game: "lobby",
      method: "transfer",
    },
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
];

export function CategoryGrid() {
  const b = useBootstrap();
  const router = useRouter();
  const [launchingSlug, setLaunchingSlug] = useState<string | null>(null);
  const [launchErr, setLaunchErr] = useState<string | null>(null);

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

  async function runVinusLaunch(c: CategoryDef) {
    const cfg = c.vinusLaunch;
    if (!cfg) return;
    setLaunchErr(null);
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    setLaunchingSlug(c.slug);
    try {
      const mobile =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 767px)").matches;
      const out = await apiFetch<{ url: string }>("/me/casino/vinus/launch", {
        method: "POST",
        body: JSON.stringify({
          vendor: cfg.vendor,
          game: cfg.game,
          platform: mobile ? "MOBILE" : "WEB",
          method: cfg.method,
          lang: "ko",
        }),
      });
      if (out?.url) {
        window.location.href = out.url;
        return;
      }
      setLaunchErr("게임 URL을 받지 못했습니다.");
    } catch (e) {
      setLaunchErr(e instanceof Error ? e.message : "입장 요청 실패");
    } finally {
      setLaunchingSlug(null);
    }
  }

  const cardBase = `group relative flex ${minh} flex-col justify-between overflow-hidden border border-white/10 bg-gradient-to-br p-4 shadow-lg transition active:scale-[0.98] ${radius}`;

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
      {launchErr ? (
        <p className="mb-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {launchErr}
        </p>
      ) : null}
      <div className={`grid grid-cols-2 md:grid-cols-3 ${gap}`}>
        {CATEGORIES.map((c) =>
          c.vinusLaunch ? (
            <button
              key={c.slug}
              type="button"
              disabled={launchingSlug !== null}
              onClick={() => void runVinusLaunch(c)}
              className={`${cardBase} ${c.gradient} cursor-pointer text-left disabled:opacity-60`}
            >
              <span className="text-3xl drop-shadow md:text-4xl">{c.icon}</span>
              <div>
                <h3 className={titleClass}>{c.title}</h3>
                <p className={`mt-0.5 ${subClass}`}>{c.subtitle}</p>
              </div>
              <span className={arrowClass}>
                {launchingSlug === c.slug ? "…" : "→"}
              </span>
            </button>
          ) : (
            <Link
              key={c.slug}
              href={`/lobby/${c.slug}`}
              className={`${cardBase} ${c.gradient}`}
            >
              <span className="text-3xl drop-shadow md:text-4xl">{c.icon}</span>
              <div>
                <h3 className={titleClass}>{c.title}</h3>
                <p className={`mt-0.5 ${subClass}`}>{c.subtitle}</p>
              </div>
              <span className={arrowClass}>→</span>
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

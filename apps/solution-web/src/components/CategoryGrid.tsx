"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBootstrap } from "./BootstrapProvider";
import { useGameLaunch } from "./GameIframeModal";
import { apiFetch, getAccessToken } from "@/lib/api";
import { cardRadiusClass } from "@/lib/theme-ui";
import {
  type VinusHomeCard,
  VINUS_VERIFIED_HOME_CARDS,
} from "@/lib/vinus-home-cards";
import { SlotVendorCatalog } from "./SlotVendorCatalog";

type StaticCategory = {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
};

const STATIC_CATEGORIES: StaticCategory[] = [
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

type GameTab = "casino" | "slot";

export function CategoryGrid() {
  const b = useBootstrap();
  const { launch } = useGameLaunch();
  const router = useRouter();
  const [gameTab, setGameTab] = useState<GameTab>("casino");
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

  const vinusFiltered = VINUS_VERIFIED_HOME_CARDS.filter(
    (c) => c.category === gameTab,
  );

  async function runVinusLaunch(c: VinusHomeCard) {
    setLaunchErr(null);
    if (c.paused) return;
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    setLaunchingSlug(c.slug);
    const mobile =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 767px)").matches;
    try {
      const out = await apiFetch<{ url: string }>("/me/casino/vinus/launch", {
        method: "POST",
        body: JSON.stringify({
          vendor: c.vendor,
          game: c.game,
          platform: mobile ? "MOBILE" : "WEB",
          method: c.method,
          lang: "ko",
        }),
      });
      if (out?.url) {
        launch({
          url: out.url,
          title: c.title,
          mode: c.surface,
        });
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

  const tabBtnBase =
    "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:text-base";
  const tabActive =
    "text-black shadow-md";
  const tabInactive = isLight
    ? "text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"
    : "text-zinc-300 ring-1 ring-white/15 hover:bg-white/5";

  return (
    <section className="mt-10">
      <h2
        className={`mb-1 text-lg font-semibold md:text-xl ${isLight ? "text-zinc-900" : "text-white"}`}
      >
        게임 입장
      </h2>
      <p className={`mb-4 text-sm ${isLight ? "text-zinc-600" : "text-zinc-500"}`}>
        카지노·슬롯 모두 사이트 안 iframe(팝업 불필요) · × 또는 새 탭으로 닫기
      </p>
      {launchErr ? (
        <p className="mb-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {launchErr}
        </p>
      ) : null}

      <div
        className={`mb-4 flex gap-2 rounded-2xl p-1 ring-1 ${isLight ? "bg-zinc-100 ring-zinc-200" : "bg-black/40 ring-white/10"}`}
        role="tablist"
        aria-label="게임 구분"
      >
        <button
          type="button"
          role="tab"
          aria-selected={gameTab === "casino"}
          className={`${tabBtnBase} ${gameTab === "casino" ? tabActive : tabInactive}`}
          style={
            gameTab === "casino"
              ? { backgroundColor: "var(--theme-primary, #c9a227)" }
              : undefined
          }
          onClick={() => setGameTab("casino")}
        >
          카지노
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={gameTab === "slot"}
          className={`${tabBtnBase} ${gameTab === "slot" ? tabActive : tabInactive}`}
          style={
            gameTab === "slot"
              ? { backgroundColor: "var(--theme-primary, #c9a227)" }
              : undefined
          }
          onClick={() => setGameTab("slot")}
        >
          슬롯
        </button>
      </div>

      {gameTab === "slot" ? (
        <SlotVendorCatalog />
      ) : (
        <div className={`grid grid-cols-2 md:grid-cols-3 ${gap}`}>
          {vinusFiltered.map((c) => {
            const paused = c.paused === true;
            return (
              <button
                key={c.slug}
                type="button"
                disabled={paused || launchingSlug !== null}
                onClick={() => void runVinusLaunch(c)}
                className={`${cardBase} ${c.gradient} text-left ${
                  paused
                    ? "cursor-not-allowed opacity-80"
                    : "cursor-pointer disabled:opacity-60"
                }`}
              >
                {paused ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/55"
                    aria-hidden
                  >
                    <span className="text-3xl font-extralight leading-none text-white/90 sm:text-4xl">
                      ／
                    </span>
                    <span className="rounded bg-black/65 px-2 py-0.5 text-[11px] font-bold tracking-wide text-amber-200 ring-1 ring-white/25">
                      일시중지
                    </span>
                  </div>
                ) : null}
                <span className="text-3xl drop-shadow md:text-4xl">{c.icon}</span>
                <div>
                  <h3 className={titleClass}>{c.title}</h3>
                  <p className={`mt-0.5 ${subClass}`}>{c.subtitle}</p>
                </div>
                <span className={arrowClass}>
                  {paused ? "—" : launchingSlug === c.slug ? "…" : "→"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <h3
        className={`mb-2 mt-10 text-base font-semibold md:text-lg ${isLight ? "text-zinc-800" : "text-zinc-200"}`}
      >
        기타 메뉴
      </h3>
      <div className={`grid grid-cols-2 md:grid-cols-3 ${gap}`}>
        {STATIC_CATEGORIES.map((c) => (
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
        ))}
      </div>
    </section>
  );
}

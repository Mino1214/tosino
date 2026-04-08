"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGameLaunch } from "./GameIframeModal";
import { apiFetch, getAccessToken } from "@/lib/api";
import {
  CASINO_CARD_BG,
  getCasinoCardAsset,
} from "@/lib/casino-card-assets";
import { publicAsset } from "@/lib/public-asset";
import { type VinusHomeCard, VINUS_VERIFIED_HOME_CARDS } from "@/lib/vinus-home-cards";

export function CasinoPortalCards() {
  const { launch } = useGameLaunch();
  const router = useRouter();
  const [launchingSlug, setLaunchingSlug] = useState<string | null>(null);
  const [launchErr, setLaunchErr] = useState<string | null>(null);

  const casinoCards = VINUS_VERIFIED_HOME_CARDS.filter(
    (c) => c.category === "casino",
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
        launch({ url: out.url, title: c.title, mode: c.surface });
        return;
      }
      setLaunchErr("게임 URL을 받지 못했습니다.");
    } catch (e) {
      setLaunchErr(e instanceof Error ? e.message : "입장 요청 실패");
    } finally {
      setLaunchingSlug(null);
    }
  }

  const bgUrl = publicAsset(CASINO_CARD_BG);

  return (
    <div>
      {launchErr ? (
        <p className="mb-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {launchErr}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {casinoCards.map((c) => {
          const paused = c.paused === true;
          const assets = getCasinoCardAsset(c.slug);
          const showPauseLabel = paused && c.subtitle === "일시중지";
          return (
            <button
              key={c.slug}
              type="button"
              disabled={paused || launchingSlug !== null}
              onClick={() => void runVinusLaunch(c)}
              className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border-0 bg-transparent p-0 text-left shadow-lg ring-1 ring-white/10 outline-none ${
                paused
                  ? "cursor-not-allowed opacity-85"
                  : "cursor-pointer disabled:opacity-60"
              }`}
            >
              <span
                className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${bgUrl})` }}
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black via-black/55 to-black/20"
                aria-hidden
              />

              {paused ? (
                <div
                  className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 bg-black/60"
                  aria-hidden
                >
                  <span className="text-3xl font-extralight text-white/90">／</span>
                  {showPauseLabel ? (
                    <span className="rounded bg-black/65 px-2 py-0.5 text-[11px] font-bold text-amber-200 ring-1 ring-white/25">
                      일시중지
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* 로고 — 우측 상단 */}
              {assets ? (
                <div className="pointer-events-none absolute right-4 top-4 z-20 h-9 w-[min(44%,160px)] md:right-5 md:top-5">
                  <Image
                    src={publicAsset(assets.logo)}
                    alt=""
                    fill
                    className="object-contain object-right grayscale brightness-110 contrast-105 drop-shadow-md"
                    unoptimized
                  />
                </div>
              ) : null}

              {/* 인물 — 허리 잘림 완화: 여백·contain */}
              <div className="relative z-[1] flex min-h-[200px] w-full flex-1 flex-col sm:min-h-[220px] md:min-h-[240px]">
                {assets ? (
                  <div className="relative flex min-h-0 flex-1 items-end justify-center px-6 pb-4 pt-14 sm:px-8 sm:pt-16 md:px-10">
                    <div className="relative h-[min(220px,52vw)] w-full max-w-[280px] sm:h-[min(240px,42vw)] md:max-w-[300px]">
                      <Image
                        src={publicAsset(assets.thumb)}
                        alt=""
                        fill
                        className="object-contain object-bottom drop-shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        sizes="(max-width:768px) 52vw, 300px"
                        priority={false}
                      />
                    </div>
                  </div>
                ) : null}

                {/* 하단 텍스트 — 그라데이션으로 게임명 가독성 */}
                <div className="relative z-[3] mt-auto bg-gradient-to-t from-black via-black/95 to-transparent px-5 pb-5 pt-10 sm:px-6 sm:pb-6 md:px-8">
                  <h3 className="text-base font-bold leading-tight text-[var(--theme-primary,#c9a227)] drop-shadow-sm sm:text-lg">
                    {c.title}
                  </h3>
                </div>
              </div>

              {!paused ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span
                    className="rounded-full px-6 py-2 text-sm font-semibold text-black shadow-lg"
                    style={{
                      backgroundColor: "var(--theme-primary, #c9a227)",
                    }}
                  >
                    {launchingSlug === c.slug ? "연결 중…" : "플레이"}
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

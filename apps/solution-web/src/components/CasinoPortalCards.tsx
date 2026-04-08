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

  const casinoCards = VINUS_VERIFIED_HOME_CARDS.filter((c) => c.category === "casino");

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
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
              className={`group relative flex min-h-[300px] flex-col overflow-visible border-0 bg-transparent p-0 text-left shadow-none ring-0 outline-none ${
                paused
                  ? "cursor-not-allowed opacity-85"
                  : "cursor-pointer disabled:opacity-60"
              }`}
            >
              {/* 배경 */}
              <span
                className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-cover bg-center"
                style={{ backgroundImage: `url(${bgUrl})` }}
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-gradient-to-t from-black/75 via-black/15 to-transparent"
                aria-hidden
              />

              {paused ? (
                <div
                  className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 rounded-2xl bg-black/60"
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

              <div className="relative z-[1] flex min-h-[300px] flex-col justify-end overflow-visible pb-3 pl-3 pr-3 pt-10">
                {/* 전신 썸네일 — 카드 밖으로 살짝 나와도 됨 */}
                {assets ? (
                  <div className="pointer-events-none absolute bottom-[52px] left-1/2 z-[2] h-[min(260px,38vw)] w-[min(200px,45vw)] max-w-[220px] -translate-x-1/2 overflow-visible md:h-[240px] md:w-[200px]">
                    <div
                      className="relative h-full w-full translate-x-[7%] transition-transform duration-500 ease-out group-hover:translate-x-0"
                      style={{ transformOrigin: "bottom center" }}
                    >
                      <Image
                        src={publicAsset(assets.thumb)}
                        alt=""
                        fill
                        className="object-contain object-bottom drop-shadow-xl scale-[0.82] transition-transform duration-500 ease-out group-hover:scale-[0.9]"
                        sizes="(max-width:768px) 45vw, 200px"
                        priority={false}
                      />
                    </div>
                  </div>
                ) : null}

                {/* 로고 */}
                {assets ? (
                  <div className="relative z-[3] mb-1 h-9 w-full max-w-[200px] shrink-0">
                    <Image
                      src={publicAsset(assets.logo)}
                      alt=""
                      fill
                      className="object-contain object-left grayscale brightness-110 contrast-105 drop-shadow-md"
                      unoptimized
                    />
                  </div>
                ) : null}

                <h3 className="relative z-[3] text-sm font-bold text-white drop-shadow md:text-base">
                  {c.title}
                </h3>

                {/* 호버 플레이 */}
                {!paused ? (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <span
                      className="rounded-full px-6 py-2 text-sm font-semibold text-black shadow-lg"
                      style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
                    >
                      {launchingSlug === c.slug ? "연결 중…" : "플레이"}
                    </span>
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

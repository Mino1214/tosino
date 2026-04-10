"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useGameLaunch } from "./GameIframeModal";
import { apiFetch, getAccessToken } from "@/lib/api";
import { useAppModals } from "@/contexts/AppModalsContext";
import {
  CASINO_CARD_BG,
  getCasinoCardAsset,
} from "@/lib/casino-card-assets";
import { publicAsset } from "@/lib/public-asset";
import {
  type VinusHomeCard,
  VINUS_VERIFIED_HOME_CARDS,
} from "@/lib/vinus-home-cards";

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setM(mq.matches);
    const fn = () => setM(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return m;
}

function LoadingSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-black/30 border-t-black"
      aria-hidden
    />
  );
}

export function CasinoPortalCards() {
  const { launch } = useGameLaunch();
  const { openLogin } = useAppModals();
  const isMobile = useIsMobile();
  const [launchingSlug, setLaunchingSlug] = useState<string | null>(null);
  const [launchErr, setLaunchErr] = useState<string | null>(null);
  const [mobilePlaySlug, setMobilePlaySlug] = useState<string | null>(null);

  const casinoCards = VINUS_VERIFIED_HOME_CARDS.filter(
    (c) => c.category === "casino",
  );

  useEffect(() => {
    if (!mobilePlaySlug) return;
    let close: ((e: MouseEvent) => void) | undefined;
    const t = window.setTimeout(() => {
      close = (e: MouseEvent) => {
        const card = document.querySelector(
          `[data-casino-card="${mobilePlaySlug}"]`,
        );
        if (card?.contains(e.target as Node)) return;
        setMobilePlaySlug(null);
      };
      document.addEventListener("click", close);
    }, 0);
    return () => {
      window.clearTimeout(t);
      if (close) document.removeEventListener("click", close);
    };
  }, [mobilePlaySlug]);

  const runVinusLaunch = useCallback(
    async (c: VinusHomeCard) => {
      setLaunchErr(null);
      if (c.paused) return;
      if (!getAccessToken()) {
        openLogin();
        return;
      }
      setLaunchingSlug(c.slug);
      setMobilePlaySlug(null);
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
    },
    [launch, openLogin],
  );

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
          const isSkywind = c.slug === "skywind";

          return (
            <div
              key={c.slug}
              data-casino-card={c.slug}
              role="button"
              tabIndex={paused ? -1 : 0}
              onClick={(e) => {
                if (paused || launchingSlug) return;
                if ((e.target as HTMLElement).closest("[data-play-btn]")) return;
                if (isMobile) {
                  e.preventDefault();
                  setMobilePlaySlug((s) => (s === c.slug ? null : c.slug));
                } else {
                  void runVinusLaunch(c);
                }
              }}
              onKeyDown={(e) => {
                if (paused || launchingSlug) return;
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                if (!isMobile) void runVinusLaunch(c);
                else setMobilePlaySlug((s) => (s === c.slug ? null : c.slug));
              }}
              className={`group relative flex min-h-[200px] w-full flex-col overflow-hidden rounded-2xl text-left shadow-lg ring-1 ring-white/10 outline-none touch-manipulation select-none sm:min-h-[220px] md:min-h-[240px] ${
                paused
                  ? "cursor-not-allowed opacity-85"
                  : "cursor-pointer focus-visible:ring-2 focus-visible:ring-[rgba(218,174,87,0.55)]"
              }`}
            >
              {/* z-0: 배경 */}
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
                  className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-1 bg-black/60"
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

              {/* z-10: 로고 — 우측 상단 (회사명 위) */}
              {assets ? (
                <div className="pointer-events-none absolute right-4 top-4 z-10 h-9 w-[min(44%,160px)] md:right-5 md:top-5">
                  <Image
                    src={publicAsset(assets.logo)}
                    alt=""
                    fill
                    className="object-contain object-right grayscale brightness-110 contrast-105 drop-shadow-md"
                    unoptimized
                  />
                </div>
              ) : null}

              {/* z-[1]: 인물 — 배경 위, 회사명 밴드 뒤로 들어감 */}
              {assets ? (
                <div
                  className={`pointer-events-none absolute left-0 right-0 z-[1] overflow-visible ${
                    isSkywind
                      ? "bottom-[3.25rem] top-8 sm:bottom-[3.5rem] md:top-9"
                      : "bottom-[3.5rem] top-9 sm:bottom-[3.75rem] sm:top-10 md:top-12"
                  }`}
                >
                  <div
                    className={`relative mx-auto flex h-full w-full items-end justify-center px-6 sm:px-8 md:px-10 ${
                      isSkywind
                        ? "translate-y-7 pb-0 sm:translate-y-9 md:translate-y-11"
                        : "translate-y-9 pb-0 sm:translate-y-11 md:translate-y-[3.5rem]"
                    }`}
                  >
                    <div
                      className={`relative w-full max-w-[300px] ${
                        isSkywind
                          ? "h-[min(200px,50vw)] max-h-[200px] sm:h-[min(210px,44vw)] md:max-h-[220px]"
                          : "h-[min(240px,54vw)] sm:h-[min(250px,46vw)] md:max-h-[260px]"
                      }`}
                    >
                      <Image
                        src={publicAsset(assets.thumb)}
                        alt=""
                        fill
                        draggable={false}
                        className={`object-contain object-bottom drop-shadow-xl [user-drag:none] [-webkit-user-drag:none] md:transition-transform md:duration-500 md:ease-out md:group-hover:scale-[1.03] ${
                          isSkywind
                            ? "scale-[1.22] sm:scale-[1.26] md:scale-[1.28]"
                            : ""
                        }`}
                        sizes="(max-width:768px) 54vw, 300px"
                        priority={false}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* z-[15]: 회사명 — 인물·배경 위 (하단 밴드) */}
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[15] bg-gradient-to-t from-black via-black/98 to-black/40 px-5 pb-5 pt-14 sm:px-6 sm:pb-6 sm:pt-16 md:px-8">
                <h3 className="relative text-base font-bold leading-tight text-main-gold sm:text-lg">
                  {c.title}
                </h3>
              </div>

              {/* z-20: 플레이 — 데스크톱 hover / 모바일 탭 */}
              {!paused ? (
                <div
                  className={`absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/40 transition-opacity duration-300 ${
                    isMobile
                      ? mobilePlaySlug === c.slug
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0"
                      : "pointer-events-none opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100"
                  }`}
                >
                  <button
                    type="button"
                    data-play-btn
                    disabled={launchingSlug !== null}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (launchingSlug) return;
                      void runVinusLaunch(c);
                    }}
                    className="pointer-events-auto flex min-w-[7rem] items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-semibold shadow-lg disabled:opacity-70"
                  >
                    {launchingSlug === c.slug ? (
                      <>
                        <LoadingSpinner />
                        <span>연결 중…</span>
                      </>
                    ) : (
                      "플레이"
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

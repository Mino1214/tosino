"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useBootstrap } from "@/components/BootstrapProvider";
import { BettingCartDock } from "@/components/BettingCartDock";
import { BettingCartProvider } from "@/components/BettingCartContext";
import { HomePortal, type PortalView } from "@/components/HomePortal";
import { SiteFooter } from "@/components/SiteFooter";
import { cardRadiusClass } from "@/lib/theme-ui";

export default function HomePage() {
  const b = useBootstrap();
  const [portalView, setPortalView] = useState<PortalView>("hub");

  useEffect(() => {
    if (portalView !== "hub") {
      document.documentElement.classList.add("overflow-hidden");
      document.body.classList.add("overflow-hidden");
    } else {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    };
  }, [portalView]);

  if (!b) return null;

  const ui = b.theme.ui;
  const compact = ui?.homeLayout === "compact";
  const radius = cardRadiusClass(ui?.cardRadius);
  const isLight = (ui?.background ?? "dark") === "light";
  const firstBanner = b.theme.bannerUrls[0];
  const subPortal = portalView !== "hub";

  return (
    <BettingCartProvider>
      <div
        className={
          subPortal
            ? "relative h-[100dvh] overflow-hidden overscroll-none"
            : "relative"
        }
      >
        <div
          className={
            subPortal
              ? "mx-auto flex h-full max-w-5xl flex-col overflow-y-auto overflow-x-hidden px-5 pb-28 pt-4 sm:px-6 md:pb-16 lg:pr-[calc(18rem+1.5rem)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "mx-auto max-w-5xl px-3 pb-16 pt-6 sm:px-4 md:pt-10 lg:pr-[calc(18rem+1.5rem)]"
          }
        >
          {!subPortal ? (
            <>
              <section
                className={
                  compact
                    ? "mb-6 text-center md:mb-8"
                    : "mb-8 text-center md:mb-10"
                }
              >
                <p
                  className={`mb-2 text-xs uppercase tracking-[0.25em] text-[var(--theme-primary,#c9a227)] sm:text-sm`}
                >
                  {b.name}
                </p>
                <h1
                  className={
                    compact
                      ? `text-xl font-bold sm:text-2xl md:text-3xl ${isLight ? "text-zinc-900" : "text-white"}`
                      : `text-2xl font-bold sm:text-3xl md:text-4xl ${isLight ? "text-zinc-900" : "text-white"}`
                  }
                >
                  {b.theme.siteName}
                </h1>
                <p
                  className={`mt-2 text-sm md:text-base ${isLight ? "text-zinc-600" : "text-zinc-400"}`}
                >
                  포털에서 카지노 · 슬롯 · 스포츠 · 미니게임을 선택하세요
                </p>
              </section>

              <section
                id="section-hero-banner"
                aria-label="메인 배너"
                className="mb-10"
              >
                <div
                  className={`relative aspect-[21/8] w-full overflow-hidden ${radius} bg-gradient-to-br from-zinc-900 to-black`}
                >
                  {firstBanner ? (
                    <Image
                      src={firstBanner}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="100vw"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      배너는 관리자 플랫폼 테마에서 설정
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : null}

          <HomePortal view={portalView} onViewChange={setPortalView} />
        </div>

        <BettingCartDock />
        {!subPortal ? <SiteFooter /> : null}
      </div>
    </BettingCartProvider>
  );
}

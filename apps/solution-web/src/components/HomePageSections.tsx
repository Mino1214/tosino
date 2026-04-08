"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBootstrap } from "./BootstrapProvider";
import { useGameLaunch } from "./GameIframeModal";
import { SlotVendorCatalog } from "./SlotVendorCatalog";
import { apiFetch, getAccessToken } from "@/lib/api";
import { getCasinoCardAsset } from "@/lib/casino-card-assets";
import { publicAsset } from "@/lib/public-asset";
import { cardRadiusClass } from "@/lib/theme-ui";
import {
  type VinusHomeCard,
  VINUS_VERIFIED_HOME_CARDS,
} from "@/lib/vinus-home-cards";

function SectionTitle({
  id,
  title,
  hint,
  isLight,
}: {
  id: string;
  title: string;
  hint?: string;
  isLight: boolean;
}) {
  return (
    <div className="mb-4">
      <h2
        id={id}
        className={`text-lg font-semibold md:text-xl ${isLight ? "text-zinc-900" : "text-white"}`}
      >
        {title}
      </h2>
      {hint ? (
        <p
          className={`mt-1 text-xs ${isLight ? "text-zinc-500" : "text-zinc-500"}`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** 스포츠·미니 하위 슬롯용 — 추후 API/배너로 치환 */
function PlaceholderTile({
  label,
  sub,
  href,
  radius,
  isLight,
  minh,
}: {
  label: string;
  sub?: string;
  href?: string;
  radius: string;
  isLight: boolean;
  minh: string;
}) {
  const inner = (
    <>
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        slot
      </span>
      <p
        className={`mt-2 text-sm font-semibold ${isLight ? "text-zinc-800" : "text-zinc-100"}`}
      >
        {label}
      </p>
      {sub ? (
        <p className="mt-1 text-xs text-zinc-500">{sub}</p>
      ) : null}
    </>
  );
  const cls = `flex ${minh} flex-col justify-center border border-dashed border-white/20 bg-black/20 p-4 text-left transition hover:border-white/30 ${radius}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={`${cls} cursor-default opacity-90`}>
      {inner}
    </div>
  );
}

export function HomePageSections() {
  const b = useBootstrap();
  const { launch } = useGameLaunch();
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

  const casinoCards = VINUS_VERIFIED_HOME_CARDS.filter((c) => c.category === "casino");
  const cardBase = `group relative flex ${minh} flex-col justify-between overflow-hidden border border-white/10 bg-gradient-to-br p-4 shadow-lg transition active:scale-[0.98] ${radius}`;
  const casinoCardShell = `group relative flex min-h-[260px] flex-col overflow-hidden border border-white/10 shadow-lg transition active:scale-[0.98] ${radius}`;

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

  return (
    <div className="mt-10 space-y-14">
      {launchErr ? (
        <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {launchErr}
        </p>
      ) : null}

      {/* hero_banner 는 page.tsx 상단 이미지 그리드와 동일 트랙 — 여기서는 카지노부터 구역만 나눔 */}

      <section aria-labelledby="section-casino">
        <SectionTitle
          id="section-casino"
          title="카지노"
          hint="public/casinoGirl · public/logo 매핑 (casino-card-assets.ts)"
          isLight={isLight}
        />
        <div className={`grid grid-cols-2 md:grid-cols-3 ${gap}`}>
          {casinoCards.map((c) => {
            const paused = c.paused === true;
            const assets = getCasinoCardAsset(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                disabled={paused || launchingSlug !== null}
                onClick={() => void runVinusLaunch(c)}
                className={`${
                  assets ? casinoCardShell : `${cardBase} ${c.gradient} p-4`
                } text-left ${
                  paused
                    ? "cursor-not-allowed opacity-80"
                    : "cursor-pointer disabled:opacity-60"
                }`}
              >
                {paused ? (
                  <div
                    className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-black/55"
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
                {assets ? (
                  <>
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-black">
                      <Image
                        src={publicAsset(assets.thumb)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 45vw, 280px"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30"
                        aria-hidden
                      />
                      <div className="absolute bottom-2 left-2 z-[2] w-[58%] min-w-0">
                        <div className="relative h-9 w-full sm:h-10">
                          <Image
                            src={publicAsset(assets.logo)}
                            alt=""
                            fill
                            className="object-contain object-left grayscale brightness-110 contrast-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                            unoptimized
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex flex-1 flex-col justify-end bg-gradient-to-br p-3 ${c.gradient}`}
                    >
                      <h3 className={titleClass}>{c.title}</h3>
                      <p className={`mt-0.5 ${subClass}`}>{c.subtitle}</p>
                    </div>
                    <span
                      className={`absolute right-2 top-2 z-[15] text-lg font-medium text-white drop-shadow-md ${
                        paused ? "" : "group-hover:text-[var(--theme-primary,#c9a227)]"
                      }`}
                    >
                      {paused ? "—" : launchingSlug === c.slug ? "…" : "→"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-3xl drop-shadow md:text-4xl">{c.icon}</span>
                    <div>
                      <h3 className={titleClass}>{c.title}</h3>
                      <p className={`mt-0.5 ${subClass}`}>{c.subtitle}</p>
                    </div>
                    <span className={arrowClass}>
                      {paused ? "—" : launchingSlug === c.slug ? "…" : "→"}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="section-sports">
        <SectionTitle
          id="section-sports"
          title="스포츠"
          hint="배당표 · 배팅카트 슬롯 (추후 전용 위젯 연결)"
          isLight={isLight}
        />
        <div className={`grid grid-cols-2 md:grid-cols-4 ${gap}`}>
          <PlaceholderTile
            label="배당표"
            sub="스포츠 로비 연동 예정"
            href="/lobby/sports-kr"
            radius={radius}
            isLight={isLight}
            minh={minh}
          />
          <PlaceholderTile
            label="배팅카트"
            sub="지갑/카트 연동 예정"
            href="/wallet"
            radius={radius}
            isLight={isLight}
            minh={minh}
          />
          <Link
            href="/lobby/sports-kr"
            className={`${cardBase} from-blue-900/40 to-zinc-950`}
          >
            <span className="text-3xl drop-shadow md:text-4xl">⚾</span>
            <div>
              <h3 className={titleClass}>국내 스포츠</h3>
              <p className={`mt-0.5 ${subClass}`}>K리그 · KBO</p>
            </div>
            <span className={arrowClass}>→</span>
          </Link>
          <Link
            href="/lobby/sports-eu"
            className={`${cardBase} from-emerald-900/40 to-zinc-950`}
          >
            <span className="text-3xl drop-shadow md:text-4xl">⚽</span>
            <div>
              <h3 className={titleClass}>유럽 스포츠</h3>
              <p className={`mt-0.5 ${subClass}`}>축구 · 농구</p>
            </div>
            <span className={arrowClass}>→</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="section-slots">
        <SectionTitle
          id="section-slots"
          title="슬롯"
          hint="벤더별 그리드 · 무한 스크롤 (slot_vendor_grid)"
          isLight={isLight}
        />
        <SlotVendorCatalog />
      </section>

      <section aria-labelledby="section-minigame">
        <SectionTitle
          id="section-minigame"
          title="미니게임"
          hint="게임영상 · 결과 · 배팅칸 · 배팅카트 — 솔루션별로 슬롯 채움"
          isLight={isLight}
        />
        <div className={`mb-4 grid grid-cols-2 md:grid-cols-4 ${gap}`}>
          <PlaceholderTile
            label="게임 영상"
            sub="minigame_video"
            href="/lobby/minigame"
            radius={radius}
            isLight={isLight}
            minh={minh}
          />
          <PlaceholderTile
            label="게임 결과"
            sub="minigame_result"
            href="/lobby/minigame"
            radius={radius}
            isLight={isLight}
            minh={minh}
          />
          <PlaceholderTile
            label="배팅칸"
            sub="minigame_bet_panel"
            radius={radius}
            isLight={isLight}
            minh={minh}
          />
          <PlaceholderTile
            label="배팅카트"
            sub="minigame_bet_cart"
            href="/wallet"
            radius={radius}
            isLight={isLight}
            minh={minh}
          />
        </div>
        <Link
          href="/lobby/minigame"
          className={`inline-flex items-center gap-2 text-sm font-medium text-[var(--theme-primary,#c9a227)] hover:underline`}
        >
          미니게임 로비로 →
        </Link>
      </section>

      <section aria-labelledby="section-events">
        <SectionTitle
          id="section-events"
          title="이벤트"
          hint="솔루션마다 프로모션·공지 블록을 이 구역에 배치 (event_block)"
          isLight={isLight}
        />
        <Link
          href="/lobby/promo"
          className={`${cardBase} flex w-full max-w-md from-pink-900/35 to-zinc-950`}
        >
          <span className="text-3xl drop-shadow md:text-4xl">🎁</span>
          <div>
            <h3 className={titleClass}>이벤트 · 프로모션</h3>
            <p className={`mt-0.5 ${subClass}`}>준비 중 로비</p>
          </div>
          <span className={arrowClass}>→</span>
        </Link>
      </section>
    </div>
  );
}

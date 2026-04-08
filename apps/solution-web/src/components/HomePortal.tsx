"use client";

import Image from "next/image";
import Link from "next/link";
import { useBootstrap } from "./BootstrapProvider";
import { CasinoPortalCards } from "./CasinoPortalCards";
import { SlotVendorCatalog } from "./SlotVendorCatalog";
import { SportsOddsPreview } from "./SportsOddsPreview";
import { cardRadiusClass } from "@/lib/theme-ui";
import { publicAsset } from "@/lib/public-asset";

export type PortalView = "hub" | "casino" | "slot" | "sports" | "minigame";

const HUB_CARD_IMAGES: Record<
  Exclude<PortalView, "hub">,
  string
> = {
  casino: publicAsset("/card/casino.jpg"),
  slot: publicAsset("/card/slot.png"),
  sports: publicAsset("/card/sports.png"),
  minigame: publicAsset("/card/minigame.png"),
};

export type HomePortalProps = {
  view: PortalView;
  onViewChange: (v: PortalView) => void;
};

export function HomePortal({ view, onViewChange }: HomePortalProps) {
  const b = useBootstrap();

  if (!b) return null;

  const ui = b.theme.ui;
  const radius = cardRadiusClass(ui?.cardRadius);

  const portalBtn = `group relative flex min-h-[120px] flex-col items-center justify-center overflow-hidden border border-white/15 px-5 py-8 text-center text-lg font-bold shadow-lg transition hover:border-[var(--theme-primary,#c9a227)]/50 hover:shadow-[0_0_24px_rgba(201,162,39,0.15)] active:scale-[0.99] md:min-h-[140px] md:text-xl ${radius}`;

  if (view === "hub") {
    return (
      <section className="mx-auto max-w-2xl" aria-label="포털 메뉴">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {(
            [
              ["casino", "카지노"],
              ["slot", "슬롯"],
              ["sports", "스포츠"],
              ["minigame", "미니게임"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={portalBtn}
              onClick={() => onViewChange(key)}
            >
              <Image
                src={HUB_CARD_IMAGES[key]}
                alt=""
                fill
                className="object-cover transition duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 45vw, 320px"
              />
              <span
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25"
                aria-hidden
              />
              <span className="relative z-10 drop-shadow-md">{label}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6 pb-6 md:pb-0">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onViewChange("hub")}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
        >
          ← 포털
        </button>
        <span className="text-sm text-zinc-500">
          {view === "casino" && "카지노"}
          {view === "slot" && "슬롯"}
          {view === "sports" && "스포츠"}
          {view === "minigame" && "미니게임"}
        </span>
      </div>

      {view === "casino" ? <CasinoPortalCards /> : null}
      {view === "slot" ? (
        <div className="max-w-5xl">
          <SlotVendorCatalog className="mt-0" />
        </div>
      ) : null}
      {view === "sports" ? (
        <div className="space-y-4">
          <SportsOddsPreview />
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/lobby/sports-kr"
              className="rounded-lg px-4 py-2 text-[var(--theme-primary,#c9a227)] ring-1 ring-white/15 hover:bg-white/5"
            >
              국내 스포츠 로비
            </Link>
            <Link
              href="/lobby/sports-eu"
              className="rounded-lg px-4 py-2 text-zinc-300 ring-1 ring-white/15 hover:bg-white/5"
            >
              유럽 스포츠 로비
            </Link>
          </div>
        </div>
      ) : null}
      {view === "minigame" ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-sm text-zinc-400">
          <p className="mb-4">
            미니게임 영역 — 게임영상 · 결과 · 배팅칸은 솔루션별로 연결 예정입니다.
          </p>
          <Link
            href="/lobby/minigame"
            className="font-medium text-[var(--theme-primary,#c9a227)] hover:underline"
          >
            미니게임 로비로 →
          </Link>
        </div>
      ) : null}
    </div>
  );
}

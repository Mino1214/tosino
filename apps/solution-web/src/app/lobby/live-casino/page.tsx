"use client";

import type { CasinoLobbyVendor } from "@tosino/shared";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { fetchCasinoLobbyCatalog } from "@/lib/api";
import {
  getVendorDescription,
  getVendorFeaturedLabels,
  getVendorGridItems,
  getVendorHeadline,
  getVendorLaunchMode,
  type VendorGridItem,
} from "@/lib/casino-lobby-vendor";
import { publicAsset } from "@/lib/public-asset";
import { useVinusLobbyLaunch } from "@/lib/use-vinus-lobby-launch";
import {
  CASINO_CARD_BG,
  getCasinoCardAsset,
} from "@/lib/casino-card-assets";
import { VINUS_VERIFIED_HOME_CARDS } from "@/lib/vinus-home-cards";

type CasinoSection = {
  label: string;
  items: VendorGridItem[];
};

const CATEGORY_ORDER = [
  "바카라",
  "룰렛",
  "블랙잭",
  "드래곤타이거",
  "식보",
  "포커",
  "게임쇼",
  "기타",
] as const;

function VendorTabs({
  vendors,
  selectedVendorId,
  onSelect,
}: {
  vendors: CasinoLobbyVendor[];
  selectedVendorId: string | null;
  onSelect: (vendorId: string) => void;
}) {
  return (
    <div className="-mx-[var(--content-pad-phi)] overflow-x-auto border-y border-white/8 bg-black/45 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        className="flex min-w-max gap-2 py-3"
        style={{
          paddingLeft: "var(--content-pad-phi)",
          paddingRight: "var(--content-pad-phi)",
        }}
      >
        {vendors.map((vendor) => {
          const selected = vendor.id === selectedVendorId;
          return (
            <button
              key={vendor.id}
              type="button"
              onClick={() => onSelect(vendor.id)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                selected
                  ? "border-[rgba(218,174,87,0.55)] bg-gold-gradient text-black"
                  : "border-[rgba(218,174,87,0.18)] bg-black/30 text-main-gold-solid/75 hover:border-[rgba(218,174,87,0.35)] hover:text-main-gold-solid",
              ].join(" ")}
            >
              {vendor.shortName}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function findVendorHero(vendor: CasinoLobbyVendor) {
  if (vendor.entryStyle === "card") {
    return { homeCard: undefined, assets: undefined };
  }

  const homeCard = VINUS_VERIFIED_HOME_CARDS.find(
    (card) => card.category === "casino" && card.vendor === vendor.vendor,
  );
  const assets = homeCard ? getCasinoCardAsset(homeCard.slug) : undefined;
  return { homeCard, assets };
}

function buildCasinoSections(vendor: CasinoLobbyVendor): CasinoSection[] {
  const items = getVendorGridItems(vendor);

  const grouped = new Map<string, VendorGridItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.group) ?? [];
    bucket.push(item);
    grouped.set(item.group, bucket);
  }

  return CATEGORY_ORDER.map((label) => ({
    label,
    items: grouped.get(label) ?? [],
  })).filter((section) => section.items.length > 0);
}

function CasinoHeroCard({
  vendor,
  launching,
  onEnter,
}: {
  vendor: CasinoLobbyVendor;
  launching: boolean;
  onEnter: () => void;
}) {
  const { assets } = findVendorHero(vendor);
  const paused = vendor.status === "paused";
  const headline = getVendorHeadline(vendor);
  const description = getVendorDescription(vendor);
  const featuredLabels = getVendorFeaturedLabels(vendor);

  if (!assets) {
    return (
      <article className="rounded-[1.8rem] border border-[rgba(218,174,87,0.2)] bg-[linear-gradient(135deg,rgba(30,24,8,0.98),rgba(12,12,16,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
          Full Entry
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{vendor.name}</h2>
          {paused ? (
            <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-zinc-300">
              준비중
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{headline}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
          {description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {featuredLabels.slice(0, 4).map((label) => (
            <span
              key={label}
              className="rounded-full border border-[rgba(218,174,87,0.2)] bg-[rgba(218,174,87,0.08)] px-3 py-1 text-xs text-main-gold-solid/85"
            >
              {label}
            </span>
          ))}
        </div>
        <button
          type="button"
          disabled={paused || launching}
          onClick={onEnter}
          className="mt-5 rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paused ? "준비중" : launching ? "입장 준비중…" : "회사 전체 입장"}
        </button>
      </article>
    );
  }

  return (
    <article className="group relative min-h-[18rem] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <span
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${publicAsset(CASINO_CARD_BG)})` }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/15" />

      <div className="absolute right-3 top-3 z-10 h-10 w-28 md:right-5 md:top-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicAsset(assets.logo)}
          alt={vendor.name}
          className="h-full w-full object-contain object-right"
        />
      </div>

      <div className="absolute bottom-[4.8rem] right-0 top-8 z-[1] flex w-[56%] items-end justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={publicAsset(assets.thumb)}
          alt=""
          className="max-h-[20rem] w-auto object-contain object-bottom md:transition-transform md:duration-500 md:group-hover:scale-[1.03]"
          draggable={false}
        />
      </div>

      <div className="relative z-10 flex min-h-[18rem] flex-col justify-between px-5 pb-5 pt-6 sm:px-6 md:px-8">
        <div className="max-w-[48%]">
          <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
            Full Entry
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{vendor.name}</h2>
            {paused ? (
              <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                준비중
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-300">{headline}</p>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex flex-wrap gap-2">
              {featuredLabels.slice(0, 4).map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[rgba(218,174,87,0.2)] bg-[rgba(218,174,87,0.08)] px-3 py-1 text-xs text-main-gold-solid/85"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={paused || launching}
            onClick={onEnter}
            className="rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paused ? "준비중" : launching ? "입장 준비중…" : "회사 전체 입장"}
          </button>
        </div>
      </div>
    </article>
  );
}

function CasinoSquareCard({
  item,
  launching,
  paused,
  onEnter,
}: {
  item: VendorGridItem;
  launching: boolean;
  paused: boolean;
  onEnter: () => void;
}) {
  return (
    <button
      type="button"
      disabled={paused || launching}
      onClick={onEnter}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/65 text-left transition hover:border-[rgba(218,174,87,0.28)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {item.icon ? (
        <div className="aspect-square w-full overflow-hidden bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.icon}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(218,174,87,0.2),_transparent_58%),linear-gradient(180deg,_rgba(24,24,27,0.92),_rgba(10,10,14,0.98))] px-4 text-center text-xs font-semibold text-main-gold-solid/90">
          {item.group}
        </div>
      )}

      <div className="space-y-1 px-3 py-3">
        <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
        <p className="text-xs text-zinc-500">
          {paused
            ? "준비중"
            : launching
              ? "연결중…"
              : item.game === "lobby"
                ? "메인 로비"
                : `코드 ${item.game}`}
        </p>
      </div>
    </button>
  );
}

export default function LiveCasinoPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<CasinoLobbyVendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { launchError, launchingKey, openVendorLobby, setLaunchError } =
    useVinusLobbyLaunch();

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const catalog = await fetchCasinoLobbyCatalog();
        if (!active) return;
        setVendors(catalog.casino);
      } catch (fetchError) {
        if (!active) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "카지노 카탈로그를 불러오지 못했습니다.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!vendors.length) return;
    const requested = searchParams.get("vendor");
    const nextId =
      vendors.find((vendor) => vendor.id === requested)?.id ?? vendors[0]?.id ?? null;
    setSelectedVendorId((current) => (current === nextId ? current : nextId));
  }, [searchParams, vendors]);

  const selectedVendor =
    vendors.find((vendor) => vendor.id === selectedVendorId) ?? vendors[0] ?? null;

  const sections = useMemo(
    () => (selectedVendor ? buildCasinoSections(selectedVendor) : []),
    [selectedVendor],
  );
  const vendorPaused = selectedVendor?.status === "paused";

  const selectVendor = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setLaunchError(null);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("vendor", vendorId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 pb-12">
      <div className="content-pad-phi mx-auto w-full min-w-0 max-w-[90rem]">
        <div className="border-b border-[rgba(218,174,87,0.2)] bg-black py-5">
          <h1 className="text-xl font-bold text-main-gold">카지노</h1>
        </div>

        {loading ? (
          <div className="py-4">
            <div className="h-12 animate-pulse rounded-full border border-white/5 bg-white/[0.04]" />
          </div>
        ) : (
          <section className="pt-4">
            <VendorTabs
              vendors={vendors}
              selectedVendorId={selectedVendor?.id ?? null}
              onSelect={selectVendor}
            />
          </section>
        )}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {launchError ? (
          <p className="mt-5 rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {launchError}
          </p>
        ) : null}

        {selectedVendor ? (
          <>
            <section className="mt-5">
              <CasinoHeroCard
                vendor={selectedVendor}
                launching={launchingKey === `${selectedVendor.id}:all`}
                onEnter={() =>
                  void openVendorLobby({
                    key: `${selectedVendor.id}:all`,
                    vendor: selectedVendor.vendor,
                    game: selectedVendor.game,
                    title: selectedVendor.name,
                    mode: getVendorLaunchMode(selectedVendor.category),
                  })
                }
              />
            </section>

            <section className="mt-6 space-y-5">
              {sections.map((section) => (
                <div
                  key={section.label}
                  className="rounded-[1.6rem] border border-white/10 bg-black/35 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                        {selectedVendor.shortName}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {section.label}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500">{section.items.length}개</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                    {section.items.map((item) => (
                      <CasinoSquareCard
                        key={item.key}
                        item={item}
                        launching={launchingKey === item.key}
                        paused={!!vendorPaused}
                        onEnter={() =>
                          void openVendorLobby({
                            key: item.key,
                            vendor: selectedVendor.vendor,
                            game: item.game,
                            title: `${selectedVendor.name} · ${item.title}`,
                            mode: getVendorLaunchMode(selectedVendor.category),
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

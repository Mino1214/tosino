"use client";

import type {
  CasinoLobbyCatalog,
  CasinoLobbyVendor,
  CasinoLobbyVendorCategory,
} from "@tosino/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCasinoLobbyCatalog } from "@/lib/api";
import {
  CASINO_LOBBY_CATEGORY_LABELS,
  getCatalogVendors,
  getVendorDescription,
  getVendorFeaturedLabels,
  getVendorGameCount,
  getVendorGridItems,
  getVendorHeadline,
  getVendorLaunchMode,
} from "@/lib/casino-lobby-vendor";
import { publicAsset } from "@/lib/public-asset";
import { useVinusLobbyLaunch } from "@/lib/use-vinus-lobby-launch";

const PAGE_SIZE = 24;

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

function CategoryTabs({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: CasinoLobbyVendorCategory[];
  selectedCategory: CasinoLobbyVendorCategory;
  onSelect: (category: CasinoLobbyVendorCategory) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {categories.map((category) => {
        const selected = category === selectedCategory;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={[
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              selected
                ? "border-[rgba(218,174,87,0.55)] bg-gold-gradient text-black"
                : "border-[rgba(218,174,87,0.18)] bg-black/30 text-main-gold-solid/75 hover:border-[rgba(218,174,87,0.35)] hover:text-main-gold-solid",
            ].join(" ")}
          >
            {CASINO_LOBBY_CATEGORY_LABELS[category]}
          </button>
        );
      })}
    </div>
  );
}

function resolveLogoSrc(src: string | null) {
  if (!src) return null;
  return src.startsWith("/") ? publicAsset(src) : src;
}

type VendorGridCatalogProps = {
  categories: CasinoLobbyVendorCategory[];
  className?: string;
  vendorId?: string;
  onVendorChange?: (vendorId: string) => void;
  showVendorTabs?: boolean;
  showCategoryTabs?: boolean;
  showSummary?: boolean;
};

export function VendorGridCatalog({
  categories,
  className,
  vendorId,
  onVendorChange,
  showVendorTabs = true,
  showCategoryTabs = true,
  showSummary = true,
}: VendorGridCatalogProps) {
  const [catalog, setCatalog] = useState<CasinoLobbyCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CasinoLobbyVendorCategory>(
    categories[0] ?? "slot",
  );
  const [internalVendorId, setInternalVendorId] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { launchError, launchingKey, openVendorLobby, setLaunchError } =
    useVinusLobbyLaunch();

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const nextCatalog = await fetchCasinoLobbyCatalog();
        if (!alive) return;
        setCatalog(nextCatalog);
      } catch (fetchError) {
        if (!alive) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "벤더 카탈로그를 불러오지 못했습니다.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const availableCategories = useMemo(() => {
    if (!catalog) return categories;
    const filtered = categories.filter(
      (category) => getCatalogVendors(catalog, category).length > 0,
    );
    return filtered.length > 0 ? filtered : categories;
  }, [catalog, categories]);

  useEffect(() => {
    if (availableCategories.includes(activeCategory)) return;
    setActiveCategory(availableCategories[0] ?? categories[0] ?? "slot");
  }, [activeCategory, availableCategories, categories]);

  const vendors = useMemo(() => {
    if (!catalog) return [];
    return getCatalogVendors(catalog, activeCategory);
  }, [activeCategory, catalog]);

  useEffect(() => {
    if (!vendors.length) {
      setInternalVendorId(null);
      return;
    }

    const requested =
      vendorId && vendors.some((vendor) => vendor.id === vendorId)
        ? vendorId
        : null;

    setInternalVendorId((current) => {
      if (requested) return requested;
      if (current && vendors.some((vendor) => vendor.id === current)) return current;
      return vendors[0]?.id ?? null;
    });
  }, [vendorId, vendors]);

  const selectedVendor =
    vendors.find((vendor) => vendor.id === (vendorId ?? internalVendorId)) ??
    vendors[0] ??
    null;

  const items = useMemo(
    () => (selectedVendor ? getVendorGridItems(selectedVendor) : []),
    [selectedVendor],
  );

  const shown = useMemo(() => items.slice(0, visible), [items, visible]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [activeCategory, selectedVendor?.id]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((entry) => entry.isIntersecting);
        if (!hit) return;
        setVisible((current) =>
          current >= items.length ? current : Math.min(current + PAGE_SIZE, items.length),
        );
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [items.length, selectedVendor?.id]);

  const selectVendor = (nextVendorId: string) => {
    setInternalVendorId(nextVendorId);
    setLaunchError(null);
    onVendorChange?.(nextVendorId);
  };

  const selectCategory = (nextCategory: CasinoLobbyVendorCategory) => {
    setActiveCategory(nextCategory);
    setLaunchError(null);
  };

  const categoryLabel = CASINO_LOBBY_CATEGORY_LABELS[activeCategory];
  const vendorHeadline = selectedVendor ? getVendorHeadline(selectedVendor) : "";
  const vendorDescription = selectedVendor ? getVendorDescription(selectedVendor) : "";
  const vendorLabels = selectedVendor ? getVendorFeaturedLabels(selectedVendor) : [];
  const vendorGameCount = selectedVendor ? getVendorGameCount(selectedVendor) : 0;
  const vendorPaused = selectedVendor?.status === "paused";
  const vendorLogo = resolveLogoSrc(selectedVendor?.logo ?? null);

  return (
    <div
      className={["w-full min-w-0 max-w-full overflow-x-hidden", className ?? ""].join(
        " ",
      )}
    >
      {showCategoryTabs && availableCategories.length > 1 ? (
        <CategoryTabs
          categories={availableCategories}
          selectedCategory={activeCategory}
          onSelect={selectCategory}
        />
      ) : null}

      {loading ? (
        <div className="h-28 animate-pulse rounded-[1.75rem] border border-white/8 bg-white/[0.04]" />
      ) : null}

      {showVendorTabs && vendors.length > 0 && !loading ? (
        <VendorTabs
          vendors={vendors}
          selectedVendorId={selectedVendor?.id ?? null}
          onSelect={selectVendor}
        />
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {launchError ? (
        <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {launchError}
        </p>
      ) : null}

      {selectedVendor ? (
        <>
          {showSummary ? (
            <section className="mt-5 rounded-[1.8rem] border border-[rgba(218,174,87,0.18)] bg-[linear-gradient(135deg,rgba(22,18,10,0.98),rgba(10,10,14,0.98))] p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                    {categoryLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedVendor.name}
                    </h2>
                    {vendorPaused ? (
                      <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        준비중
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {vendorHeadline}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {vendorDescription}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[14rem] lg:items-end">
                  {vendorLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vendorLogo}
                      alt={selectedVendor.name}
                      className="h-10 w-auto object-contain lg:h-12"
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={vendorPaused || launchingKey !== null}
                    onClick={() =>
                      void openVendorLobby({
                        key: `${selectedVendor.id}:all`,
                        vendor: selectedVendor.vendor,
                        game: selectedVendor.game,
                        title: selectedVendor.name,
                        mode: getVendorLaunchMode(selectedVendor.category),
                      })
                    }
                    className="rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {vendorPaused
                      ? "준비중"
                      : launchingKey === `${selectedVendor.id}:all`
                        ? "입장 준비중…"
                        : "회사 전체 입장"}
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {vendorLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-[rgba(218,174,87,0.2)] bg-[rgba(218,174,87,0.08)] px-3 py-1 text-xs text-main-gold-solid/85"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                {selectedVendor.shortName} · {vendorGameCount}개 라인업
              </p>
            </section>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedVendor.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {vendorGameCount}개 라인업
                  {vendorPaused ? " · 준비중" : ""}
                </p>
              </div>
              {vendorLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={vendorLogo}
                  alt={selectedVendor.name}
                  className="h-8 w-auto object-contain"
                />
              ) : null}
            </div>
          )}

          <section className="mt-6">
            <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {shown.map((item) => {
                const busy = launchingKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={vendorPaused || launchingKey !== null}
                    onClick={() =>
                      void openVendorLobby({
                        key: item.key,
                        vendor: selectedVendor.vendor,
                        game: item.game,
                        title: `${selectedVendor.name} · ${item.title}`,
                        mode: getVendorLaunchMode(selectedVendor.category),
                      })
                    }
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 text-left transition hover:border-[rgba(218,174,87,0.28)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {item.icon ? (
                      <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.icon}
                          alt=""
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                          decoding="async"
                        />
                        {busy ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
                            …
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(218,174,87,0.2),_transparent_58%),linear-gradient(180deg,_rgba(24,24,27,0.92),_rgba(10,10,14,0.98))] px-4 text-center text-xs font-semibold text-main-gold-solid/90">
                        {item.group}
                      </div>
                    )}

                    <div className="space-y-1 px-3 py-3">
                      <p className="line-clamp-2 text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {vendorPaused
                          ? "준비중"
                          : busy
                            ? "연결중…"
                            : item.game === "lobby"
                              ? "메인 로비"
                              : `코드 ${item.game}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {visible < items.length ? (
              <div ref={sentinelRef} className="h-8 w-full shrink-0" aria-hidden />
            ) : null}
          </section>
        </>
      ) : !loading && !error ? (
        <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/30 px-5 py-8 text-sm text-zinc-400">
          표시할 벤더가 없습니다.
        </div>
      ) : null}
    </div>
  );
}

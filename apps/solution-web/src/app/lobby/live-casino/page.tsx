"use client";

import type { CasinoLobbyVendor } from "@tosino/shared";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdBanner } from "@/components/SportsLobbyLayout";
import { fetchCasinoLobbyCatalog } from "@/lib/api";
import { publicAsset } from "@/lib/public-asset";
import { useVinusLobbyLaunch } from "@/lib/use-vinus-lobby-launch";
import {
  CASINO_CARD_BG,
  getCasinoCardAsset,
} from "@/lib/casino-card-assets";
import { VINUS_VERIFIED_HOME_CARDS } from "@/lib/vinus-home-cards";
import {
  VINUS_VERIFIED_GAMES_BY_VENDOR,
  type VinusVerifiedCatalogEntry,
} from "@/lib/vinus-verified-game-catalog";

type CasinoTableRow = {
  key: string;
  game: string;
  title: string;
  group: string;
  icon?: string;
};

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
    <div className="-mx-[var(--content-pad-phi)] overflow-x-auto border-y border-white/8 bg-black/40">
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
              {vendor.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VendorHeroCard({
  vendor,
  launching,
  onPlay,
}: {
  vendor: CasinoLobbyVendor;
  launching: boolean;
  onPlay: () => void;
}) {
  const homeCard = VINUS_VERIFIED_HOME_CARDS.find(
    (card) => card.category === "casino" && card.vendor === vendor.vendor,
  );
  const assets = homeCard ? getCasinoCardAsset(homeCard.slug) : undefined;

  if (!homeCard || !assets) return null;

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-[rgba(218,174,87,0.22)] bg-black shadow-[0_26px_70px_rgba(0,0,0,0.38)]">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-90"
        style={{ backgroundImage: `url(${publicAsset(CASINO_CARD_BG)})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(5,5,7,0.96)_28%,rgba(5,5,7,0.72)_58%,rgba(5,5,7,0.28)_100%)]" />

      <div className="relative grid min-h-[26rem] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(18rem,1.1fr)] lg:px-8">
        <div className="relative z-10 flex flex-col justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-main-gold-solid/55">
              Brand Main UI
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              {vendor.name}
            </h2>
            <p className="mt-2 text-base font-medium text-main-gold">
              {vendor.headline}
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-300">
              {vendor.description}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {vendor.featuredLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[rgba(218,174,87,0.2)] bg-[rgba(218,174,87,0.1)] px-3 py-1 text-xs text-main-gold-solid/90"
                >
                  {label}
                </span>
              ))}
            </div>

            <button
              type="button"
              disabled={launching}
              onClick={onPlay}
              className="rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {launching ? "입장 준비중…" : "이 회사 메인 UI 입장"}
            </button>
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-center overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
          <div className="absolute right-4 top-4 h-10 w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicAsset(assets.logo)}
              alt={vendor.name}
              className="h-full w-full object-contain object-right"
            />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicAsset(assets.thumb)}
            alt=""
            className="max-h-[24rem] w-auto object-contain object-bottom"
            draggable={false}
          />
        </div>
      </div>
    </article>
  );
}

function TableRow({
  row,
  onEnter,
  launching,
}: {
  row: CasinoTableRow;
  onEnter: () => void;
  launching: boolean;
}) {
  return (
    <div className="grid gap-3 border-b border-white/6 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_9rem_8rem] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {row.icon ? (
          <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-black/35">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.icon}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(218,174,87,0.16)] bg-[rgba(218,174,87,0.08)] text-[11px] font-semibold text-main-gold-solid/85">
            TABLE
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{row.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {row.group} · {row.game === "lobby" ? "메인 로비" : `게임 코드 ${row.game}`}
          </p>
        </div>
      </div>

      <div className="hidden text-sm text-zinc-400 md:block">{row.group}</div>

      <div className="flex justify-start md:justify-end">
        <button
          type="button"
          disabled={launching}
          onClick={onEnter}
          className="rounded-full border border-[rgba(218,174,87,0.28)] px-4 py-2 text-xs font-semibold text-main-gold-solid transition hover:bg-[rgba(218,174,87,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {launching ? "연결중…" : "입장"}
        </button>
      </div>
    </div>
  );
}

function buildCasinoRows(vendor: CasinoLobbyVendor): CasinoTableRow[] {
  const verified = (VINUS_VERIFIED_GAMES_BY_VENDOR as Record<
    string,
    VinusVerifiedCatalogEntry[]
  >)[vendor.vendor];

  if (Array.isArray(verified) && verified.length > 0) {
    return verified.slice(0, 12).map((entry) => ({
      key: `${vendor.id}:${entry.game}`,
      game: entry.game,
      title: entry.titleKo || entry.titleEn,
      group: entry.region || "라이브 테이블",
      icon: entry.icon,
    }));
  }

  return vendor.sampleGames.map((entry, index) => ({
    key: `${vendor.id}:${entry.game}:${index}`,
    game: entry.game,
    title: entry.title,
    group: entry.group ?? "메인 라인업",
    icon: entry.icon,
  }));
}

function hasVendorHeroCard(vendor: CasinoLobbyVendor) {
  const homeCard = VINUS_VERIFIED_HOME_CARDS.find(
    (card) => card.category === "casino" && card.vendor === vendor.vendor,
  );
  if (!homeCard) return false;
  return Boolean(getCasinoCardAsset(homeCard.slug));
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

  const casinoRows = useMemo(
    () => (selectedVendor ? buildCasinoRows(selectedVendor) : []),
    [selectedVendor],
  );
  const hasHeroCard = selectedVendor ? hasVendorHeroCard(selectedVendor) : false;

  const selectVendor = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setLaunchError(null);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("vendor", vendorId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 pb-12">
      <AdBanner
        title="라이브 카지노 이벤트  첫충 보너스 혜택을 받아가세요!"
        variant="billboard"
      />

      <div className="content-pad-phi mx-auto w-full min-w-0 max-w-[90rem]">
        <div className="border-b border-[rgba(218,174,87,0.2)] bg-black py-5">
          <p className="text-xs uppercase tracking-[0.22em] text-main-gold-solid/55">
            Live Casino
          </p>
          <h1 className="mt-2 text-lg font-bold text-main-gold sm:text-2xl">
            카지노 회사 탭
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-main-gold-solid/72">
            회사를 누르면 아래에 메인 UI 카드나 테이블 리스트가 바로 펼쳐지고,
            각 카드와 리스트에서 바로 입장할 수 있게 정리했습니다.
          </p>
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

        {selectedVendor ? (
          <>
            <section className="mt-5 rounded-[1.8rem] border border-[rgba(218,174,87,0.16)] bg-[linear-gradient(180deg,rgba(19,19,23,0.96),rgba(8,8,12,0.98))] p-5 sm:p-6">
              {launchError ? (
                <p className="mb-4 rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                  {launchError}
                </p>
              ) : null}

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-main-gold-solid/55">
                    Selected Brand
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    {selectedVendor.logo ? (
                      <div className="flex h-11 w-28 items-center justify-center rounded-xl border border-white/10 bg-black/35 px-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={publicAsset(selectedVendor.logo)}
                          alt={selectedVendor.name}
                          className="max-h-7 w-full object-contain"
                        />
                      </div>
                    ) : null}
                    <div>
                      <h2 className="text-xl font-bold text-white sm:text-2xl">
                        {selectedVendor.name}
                      </h2>
                      <p className="mt-1 text-sm text-main-gold">
                        {selectedVendor.headline}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={launchingKey === selectedVendor.id}
                  onClick={() =>
                    void openVendorLobby({
                      key: selectedVendor.id,
                      vendor: selectedVendor.vendor,
                      game: selectedVendor.game,
                      title: selectedVendor.name,
                      mode: "casino-window",
                    })
                  }
                  className="rounded-full bg-gold-gradient px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {launchingKey === selectedVendor.id ? "입장 준비중…" : "회사 전체 UI 입장"}
                </button>
              </div>

              <p className="mt-4 max-w-4xl text-sm leading-6 text-zinc-300">
                {selectedVendor.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedVendor.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[rgba(218,174,87,0.2)] bg-[rgba(218,174,87,0.08)] px-3 py-1 text-xs text-main-gold-solid/85"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                    Brand UI
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {selectedVendor.name} 메인 UI
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  여성 메인 카드가 있는 회사는 아래에서 바로 입장할 수 있습니다
                </p>
              </div>

              {hasHeroCard ? (
                <VendorHeroCard
                  vendor={selectedVendor}
                  launching={launchingKey === `${selectedVendor.id}:hero`}
                  onPlay={() =>
                    void openVendorLobby({
                      key: `${selectedVendor.id}:hero`,
                      vendor: selectedVendor.vendor,
                      game: selectedVendor.game,
                      title: selectedVendor.name,
                      mode: "casino-window",
                    })
                  }
                />
              ) : (
                <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.94),rgba(10,10,14,0.98))] px-6 py-8">
                  <p className="text-sm font-semibold text-white">
                    이 회사는 현재 여성 메인 카드 대신 테이블 리스트 중심으로
                    구성됩니다.
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    아래 테이블 리스트에서 원하는 라인업을 바로 눌러 입장할 수 있게
                    맞췄습니다.
                  </p>
                </div>
              )}
            </section>

            <section className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/35">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 px-5 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                    Table List
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {selectedVendor.name} 테이블 리스트
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  원하는 테이블을 눌러 바로 입장할 수 있습니다
                </p>
              </div>

              <div>
                {casinoRows.map((row) => (
                  <TableRow
                    key={row.key}
                    row={row}
                    launching={launchingKey === row.key}
                    onEnter={() =>
                      void openVendorLobby({
                        key: row.key,
                        vendor: selectedVendor.vendor,
                        game: row.game,
                        title: `${selectedVendor.name} · ${row.title}`,
                        mode: "casino-window",
                      })
                    }
                  />
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

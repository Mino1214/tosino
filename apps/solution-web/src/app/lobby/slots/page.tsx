"use client";

import type { CasinoLobbyVendor } from "@tosino/shared";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdBanner } from "@/components/SportsLobbyLayout";
import { SlotVendorCatalog } from "@/components/SlotVendorCatalog";
import { fetchCasinoLobbyCatalog } from "@/lib/api";
import { publicAsset } from "@/lib/public-asset";
import { useVinusLobbyLaunch } from "@/lib/use-vinus-lobby-launch";
import {
  VINUS_VERIFIED_GAMES_BY_VENDOR,
  type VinusMatrixVerifiedVendor,
  type VinusVerifiedCatalogEntry,
} from "@/lib/vinus-verified-game-catalog";

type SlotListRow = {
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

function FeaturedSlotCard({
  row,
  onEnter,
  launching,
}: {
  row: SlotListRow;
  onEnter: () => void;
  launching: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/65">
      {row.icon ? (
        <div className="aspect-square w-full overflow-hidden bg-zinc-950">
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
        <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(218,174,87,0.18),_transparent_58%),linear-gradient(180deg,_rgba(24,24,27,0.92),_rgba(10,10,14,0.98))] px-4 text-center text-xs font-semibold text-main-gold-solid/90">
          {row.group}
        </div>
      )}
      <div className="space-y-2 px-3 py-3">
        <p className="line-clamp-2 text-sm font-semibold text-white">{row.title}</p>
        <p className="text-xs text-zinc-500">{row.group}</p>
        <button
          type="button"
          disabled={launching}
          onClick={onEnter}
          className="w-full rounded-full border border-[rgba(218,174,87,0.26)] px-3 py-2 text-xs font-semibold text-main-gold-solid transition hover:bg-[rgba(218,174,87,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {launching ? "연결중…" : "입장"}
        </button>
      </div>
    </article>
  );
}

function ListRow({
  row,
  launching,
  onEnter,
}: {
  row: SlotListRow;
  launching: boolean;
  onEnter: () => void;
}) {
  return (
    <div className="grid gap-3 border-b border-white/6 px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1.4fr)_8rem_8rem] md:items-center">
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
            SLOT
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

function buildSlotRows(vendor: CasinoLobbyVendor): SlotListRow[] {
  const verified = (VINUS_VERIFIED_GAMES_BY_VENDOR as Record<
    string,
    VinusVerifiedCatalogEntry[]
  >)[vendor.vendor];

  if (Array.isArray(verified) && verified.length > 0) {
    return verified.slice(0, 12).map((entry) => ({
      key: `${vendor.id}:${entry.game}`,
      game: entry.game,
      title: entry.titleKo || entry.titleEn,
      group: entry.region || "슬롯",
      icon: entry.icon,
    }));
  }

  return vendor.sampleGames.map((entry, index) => ({
    key: `${vendor.id}:${entry.game}:${index}`,
    game: entry.game,
    title: entry.title,
    group: entry.group ?? "대표 슬롯",
    icon: entry.icon,
  }));
}

export default function SlotsPage() {
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
        setVendors(catalog.slot);
      } catch (fetchError) {
        if (!active) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "슬롯 카탈로그를 불러오지 못했습니다.",
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

  const slotRows = useMemo(
    () => (selectedVendor ? buildSlotRows(selectedVendor) : []),
    [selectedVendor],
  );

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
        title="슬롯 이벤트  첫충 보너스 혜택을 받아가세요!"
        variant="billboard"
      />

      <div className="content-pad-phi mx-auto w-full max-w-[90rem]">
        <div className="border-b border-[rgba(218,174,87,0.2)] bg-black py-5">
          <p className="text-xs uppercase tracking-[0.22em] text-main-gold-solid/55">
            Slot Lobby
          </p>
          <h1 className="mt-2 text-lg font-bold text-main-gold sm:text-2xl">
            슬롯 회사 탭
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-main-gold-solid/72">
            회사를 누르면 아래에 대표 슬롯 리스트와 전체 게임 그리드가 바로
            바뀌도록 정리했습니다.
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
                      mode: "slot-iframe",
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

            <section className="mt-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                    Featured Slots
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {selectedVendor.name} 대표 슬롯
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  위에서 탭을 바꾸면 이 리스트도 바로 같이 바뀝니다
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {slotRows.slice(0, 4).map((row) => (
                  <FeaturedSlotCard
                    key={row.key}
                    row={row}
                    launching={launchingKey === row.key}
                    onEnter={() =>
                      void openVendorLobby({
                        key: row.key,
                        vendor: selectedVendor.vendor,
                        game: row.game,
                        title: `${selectedVendor.name} · ${row.title}`,
                        mode: "slot-iframe",
                      })
                    }
                  />
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-[1.6rem] border border-white/10 bg-black/35">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/8 px-5 py-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                    Slot List
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {selectedVendor.name} 추천 리스트
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  리스트에서 바로 입장하거나 아래 전체 목록으로 더 볼 수 있습니다
                </p>
              </div>

              <div>
                {slotRows.map((row) => (
                  <ListRow
                    key={row.key}
                    row={row}
                    launching={launchingKey === row.key}
                    onEnter={() =>
                      void openVendorLobby({
                        key: row.key,
                        vendor: selectedVendor.vendor,
                        game: row.game,
                        title: `${selectedVendor.name} · ${row.title}`,
                        mode: "slot-iframe",
                      })
                    }
                  />
                ))}
              </div>
            </section>

            <section className="mt-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                    Full Game Grid
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    {selectedVendor.name} 전체 게임 목록
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  선택된 회사의 실제 게임 그리드입니다
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-white/10 bg-black/35 p-4 sm:p-5">
                <SlotVendorCatalog
                  className="mt-0"
                  showTabs={false}
                  vendorId={selectedVendor.vendor as VinusMatrixVerifiedVendor}
                  onVendorChange={(vendorId) => {
                    const nextVendor = vendors.find((vendor) => vendor.vendor === vendorId);
                    if (nextVendor) selectVendor(nextVendor.id);
                  }}
                />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

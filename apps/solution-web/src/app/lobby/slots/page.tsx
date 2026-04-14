"use client";

import type { CasinoLobbyVendor } from "@tosino/shared";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdBanner } from "@/components/SportsLobbyLayout";
import { SlotVendorCatalog } from "@/components/SlotVendorCatalog";
import { fetchCasinoLobbyCatalog } from "@/lib/api";
import { publicAsset } from "@/lib/public-asset";
import { useVinusLobbyLaunch } from "@/lib/use-vinus-lobby-launch";
import type { VinusMatrixVerifiedVendor } from "@/lib/vinus-verified-game-catalog";

const STAT_CARD_CLASS =
  "rounded-2xl border border-[rgba(218,174,87,0.16)] bg-black/45 px-4 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.25)]";

function VendorSampleCard({
  sample,
}: {
  sample: CasinoLobbyVendor["sampleGames"][number];
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/65">
      {sample.icon ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sample.icon}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(218,174,87,0.22),_transparent_58%),linear-gradient(180deg,_rgba(24,24,27,0.92),_rgba(10,10,14,0.98))] px-4 text-center text-xs font-semibold text-main-gold-solid/90">
          {sample.group ?? "대표 타이틀"}
        </div>
      )}
      <div className="space-y-1 px-3 py-3">
        <p className="text-sm font-semibold text-white">{sample.title}</p>
        <p className="text-xs text-zinc-500">{sample.group ?? "추천 슬롯"}</p>
      </div>
    </article>
  );
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
  const totalGames = vendors.reduce((sum, vendor) => sum + (vendor.gameCount ?? 0), 0);

  const selectVendor = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setLaunchError(null);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("vendor", vendorId);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 pb-10">
      <AdBanner
        title="슬롯 이벤트  첫충 보너스 혜택을 받아가세요!"
        variant="billboard"
      />

      <div className="content-pad-phi mx-auto w-full max-w-[90rem]">
        <div className="border-b border-[rgba(218,174,87,0.2)] bg-black py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-main-gold-solid/60">
            Slots Lobby
          </p>
          <h1 className="mt-2 text-lg font-bold text-main-gold sm:text-2xl">
            슬롯 회사 보드와 실제 게임 그리드를 바로 이어서 보는 구역
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-main-gold-solid/72">
            상단 회사 표에서 벤더를 고르면 아래 설명과 대표 타이틀이 먼저 채워지고,
            바로 밑의 실제 게임 목록도 같은 벤더로 맞춰지게 정리했습니다.
          </p>
        </div>

        <section className="grid gap-3 py-5 sm:grid-cols-3">
          <article className={STAT_CARD_CLASS}>
            <p className="text-xs text-zinc-500">노출 벤더</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {loading ? "…" : `${vendors.length}개`}
            </p>
            <p className="mt-1 text-xs text-zinc-500">선택 회사가 실제 목록까지 이어집니다</p>
          </article>
          <article className={STAT_CARD_CLASS}>
            <p className="text-xs text-zinc-500">확인된 슬롯 수</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {loading ? "…" : `${totalGames.toLocaleString("ko-KR")}개`}
            </p>
            <p className="mt-1 text-xs text-zinc-500">카탈로그 기준 합계</p>
          </article>
          <article className={STAT_CARD_CLASS}>
            <p className="text-xs text-zinc-500">연결 방식</p>
            <p className="mt-1 text-2xl font-semibold text-white">심리스 iframe</p>
            <p className="mt-1 text-xs text-zinc-500">선택 벤더 로비와 게임 리스트 동기화</p>
          </article>
        </section>

        {error ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(20,20,24,0.9),rgba(8,8,12,0.96))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-main-gold-solid/55">
                Vendor Table
              </p>
              <h2 className="mt-1 text-base font-semibold text-white sm:text-lg">
                슬롯 회사 선택 보드
              </h2>
            </div>
            <p className="text-xs text-zinc-500">회사 선택이 아래 실제 게임 리스트까지 반영됩니다</p>
          </div>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-36 animate-pulse rounded-2xl border border-white/5 bg-white/[0.04]"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {vendors.map((vendor) => {
                const selected = vendor.id === selectedVendor?.id;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => selectVendor(vendor.id)}
                    className={[
                      "rounded-2xl border px-4 py-4 text-left transition",
                      selected
                        ? "border-[rgba(218,174,87,0.52)] bg-[rgba(218,174,87,0.12)] shadow-[0_14px_32px_rgba(218,174,87,0.12)]"
                        : "border-white/8 bg-black/35 hover:border-white/20 hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.18em] text-main-gold-solid/55">
                          {vendor.shortName}
                        </p>
                        <p className="mt-1 text-base font-semibold text-white">
                          {vendor.name}
                        </p>
                      </div>
                      <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                        운영중
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-medium text-main-gold">
                      {(vendor.gameCount ?? 0).toLocaleString("ko-KR")}개
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {vendor.headline}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {vendor.featuredLabels.slice(0, 3).map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedVendor ? (
          <section className="mt-5 rounded-[1.8rem] border border-[rgba(218,174,87,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(218,174,87,0.16),transparent_30%),linear-gradient(180deg,rgba(18,18,22,0.96),rgba(8,8,12,0.98))] p-5 sm:p-6">
            {launchError ? (
              <p className="mb-4 rounded-2xl border border-red-500/20 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                {launchError}
              </p>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.9fr)]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-main-gold-solid/55">
                      Selected Vendor
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
                    disabled={launchingKey !== null}
                    onClick={() =>
                      void openVendorLobby({
                        key: selectedVendor.id,
                        vendor: selectedVendor.vendor,
                        game: selectedVendor.game,
                        title: selectedVendor.name,
                        mode: "slot-iframe",
                      })
                    }
                    className="rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {launchingKey === selectedVendor.id ? "입장 준비중…" : "이 회사 로비 입장"}
                  </button>
                </div>

                <p className="max-w-3xl text-sm leading-6 text-zinc-300">
                  {selectedVendor.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {selectedVendor.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[rgba(218,174,87,0.2)] bg-[rgba(218,174,87,0.08)] px-3 py-1 text-xs text-main-gold-solid/85"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <article className={STAT_CARD_CLASS}>
                  <p className="text-xs text-zinc-500">확인된 게임 수</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {(selectedVendor.gameCount ?? 0).toLocaleString("ko-KR")}개
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">카탈로그 기준</p>
                </article>
                <article className={STAT_CARD_CLASS}>
                  <p className="text-xs text-zinc-500">연동 코드</p>
                  <p className="mt-1 break-all font-mono text-sm text-white">
                    {selectedVendor.vendor}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">launch API에 그대로 연결</p>
                </article>
                <article className={STAT_CARD_CLASS}>
                  <p className="text-xs text-zinc-500">대표 라인업</p>
                  <p className="mt-1 text-xl font-semibold text-white">
                    {selectedVendor.featuredLabels.length}개
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selectedVendor.featuredLabels.slice(0, 2).join(" · ")}
                  </p>
                </article>
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-main-gold-solid/55">
                      Featured Titles
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-white">
                      대표 타이틀 미리보기
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500">
                    선택 벤더 기준 {selectedVendor.sampleGames.length}개
                  </p>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {selectedVendor.sampleGames.map((sample) => (
                    <VendorSampleCard key={`${selectedVendor.id}:${sample.game}:${sample.title}`} sample={sample} />
                  ))}
                </div>
              </div>

              <aside className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-main-gold-solid/55">
                  Quick Summary
                </p>
                <h3 className="mt-1 text-base font-semibold text-white">
                  먼저 보여줄 포인트
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                  {selectedVendor.featuredLabels.map((label) => (
                    <li
                      key={label}
                      className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3"
                    >
                      {label}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>
        ) : null}

        <section className="pt-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-main-gold-solid/55">
                Game Grid
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                선택 회사 실제 게임 리스트
              </h2>
            </div>
            <p className="text-xs text-zinc-500">
              상단 보드에서 고른 벤더와 같은 목록만 아래에 노출됩니다
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-black/35 p-4 sm:p-5">
            <SlotVendorCatalog
              className="mt-0"
              showTabs={false}
              vendorId={(selectedVendor?.vendor ?? "pragmatic_slot") as VinusMatrixVerifiedVendor}
              onVendorChange={(vendorId) => {
                const nextVendor = vendors.find((vendor) => vendor.vendor === vendorId);
                if (nextVendor) selectVendor(nextVendor.id);
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

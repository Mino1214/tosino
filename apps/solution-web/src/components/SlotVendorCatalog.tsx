"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameLaunch } from "./GameIframeModal";
import { apiFetch, getAccessToken } from "@/lib/api";
import { cardRadiusClass } from "@/lib/theme-ui";
import { useBootstrap } from "./BootstrapProvider";
import type { LaunchSurface } from "@/lib/vinus-home-cards";
import {
  VINUS_VERIFIED_GAMES_BY_VENDOR,
  type VinusMatrixVerifiedVendor,
  type VinusVerifiedCatalogEntry,
} from "@/lib/vinus-verified-game-catalog";

const SLOT_VENDORS: {
  id: VinusMatrixVerifiedVendor;
  label: string;
  /** 데스크톱에서 이 벤더 슬롯 실행 방식 */
  surface: LaunchSurface;
}[] = [
  { id: "pragmatic_slot", label: "프라그마틱", surface: "new-tab" },
  { id: "habanero", label: "하바네로", surface: "slot-iframe" },
  { id: "MICRO_Slot", label: "마이크로", surface: "slot-iframe" },
];

const PAGE_SIZE = 24;

export function SlotVendorCatalog() {
  const b = useBootstrap();
  const router = useRouter();
  const { launch } = useGameLaunch();
  const [vendorIdx, setVendorIdx] = useState(0);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [launchingKey, setLaunchingKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const vendor = SLOT_VENDORS[vendorIdx]!;
  const games = VINUS_VERIFIED_GAMES_BY_VENDOR[vendor.id];
  const shown = useMemo(() => games.slice(0, visible), [games, visible]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [vendor.id]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit) return;
        setVisible((v) => {
          if (v >= games.length) return v;
          return Math.min(v + PAGE_SIZE, games.length);
        });
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [games.length, vendor.id]);

  const runLaunch = useCallback(
    async (entry: VinusVerifiedCatalogEntry, surface: LaunchSurface) => {
      setErr(null);
      if (!getAccessToken()) {
        router.push("/login");
        return;
      }
      const key = `${entry.vendor}:${entry.game}`;
      setLaunchingKey(key);

      const mobile =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 767px)").matches;

      /** 모바일 전부 + PC에서 새 탭 모드(프라그마틱): 비동기 이후 window.open 차단 방지 */
      const usePreTab = mobile || surface === "new-tab";
      let pre: Window | null = null;
      if (usePreTab) {
        pre = window.open("about:blank", "_blank", "noopener,noreferrer");
      }
      if (usePreTab && !pre) {
        setErr("팝업이 차단되었습니다. 브라우저에서 이 사이트의 팝업을 허용해 주세요.");
        setLaunchingKey(null);
        return;
      }

      try {
        const out = await apiFetch<{ url: string }>("/me/casino/vinus/launch", {
          method: "POST",
          body: JSON.stringify({
            vendor: entry.vendor,
            game: entry.game,
            platform: mobile ? "MOBILE" : "WEB",
            method: "transfer",
            lang: "ko",
          }),
        });
        if (!out?.url) {
          if (pre && !pre.closed) pre.close();
          setErr("게임 URL을 받지 못했습니다.");
          return;
        }
        launch({
          url: out.url,
          title: entry.titleKo || entry.titleEn,
          mode: surface,
          preOpenedWindow: pre,
        });
      } catch (e) {
        if (pre && !pre.closed) pre.close();
        setErr(e instanceof Error ? e.message : "입장 요청 실패");
      } finally {
        setLaunchingKey(null);
      }
    },
    [launch, router],
  );

  if (!b) return null;
  const ui = b.theme.ui;
  const radius = cardRadiusClass(ui?.cardRadius);
  const isLight = (ui?.background ?? "dark") === "light";
  const dense = ui?.density === "compact";
  const gap = dense ? "gap-2 sm:gap-3" : "gap-3 sm:gap-4";
  const titleClass = isLight
    ? "text-xs font-semibold text-zinc-900 line-clamp-2"
    : "text-xs font-semibold text-zinc-100 line-clamp-2";

  const tabBtn =
    "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm";
  const tabActive = "text-black shadow-md";
  const tabInactive = isLight
    ? "text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100"
    : "text-zinc-300 ring-1 ring-white/15 hover:bg-white/5";

  return (
    <div className="mt-1">
      {err ? (
        <p className="mb-3 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {err}
        </p>
      ) : null}

      <div
        className={`mb-4 flex gap-2 rounded-2xl p-1 ring-1 ${isLight ? "bg-zinc-100 ring-zinc-200" : "bg-black/40 ring-white/10"}`}
        role="tablist"
        aria-label="슬롯 벤더"
      >
        {SLOT_VENDORS.map((v, i) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={vendorIdx === i}
            className={`${tabBtn} ${vendorIdx === i ? tabActive : tabInactive}`}
            style={
              vendorIdx === i
                ? { backgroundColor: "var(--theme-primary, #c9a227)" }
                : undefined
            }
            onClick={() => setVendorIdx(i)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <p
        className={`mb-3 text-xs ${isLight ? "text-zinc-600" : "text-zinc-500"}`}
      >
        {vendor.label} · {games.length}종 · 스크롤 시 더 불러옵니다
      </p>

      <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 ${gap}`}>
        {shown.map((g) => {
          const lk = `${g.vendor}:${g.game}`;
          const busy = launchingKey === lk;
          return (
            <button
              key={lk}
              type="button"
              disabled={launchingKey !== null}
              onClick={() => void runLaunch(g, vendor.surface)}
              className={`group flex flex-col overflow-hidden border border-white/10 bg-zinc-900/40 text-left shadow-md transition active:scale-[0.98] disabled:opacity-60 ${radius}`}
            >
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.icon}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {busy ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
                    …
                  </div>
                ) : null}
              </div>
              <div className="min-h-[2.75rem] p-2">
                <p className={titleClass}>{g.titleKo || g.titleEn}</p>
              </div>
            </button>
          );
        })}
      </div>

      {visible < games.length ? (
        <div ref={sentinelRef} className="h-8 w-full shrink-0" aria-hidden />
      ) : null}
    </div>
  );
}

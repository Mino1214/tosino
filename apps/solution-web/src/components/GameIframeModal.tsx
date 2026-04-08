"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { LaunchSurface } from "@/lib/vinus-home-cards";

type GameOverlayState = {
  url: string;
  title?: string;
  /** 카지노: 화면 채우는 iframe · 슬롯: PC에서 16:9 박스 */
  kind: "casino" | "slot";
};

export type GameLaunchOpts = {
  url: string;
  title?: string;
  mode: LaunchSurface;
  /** @deprecated 카지노·슬롯 모두 앱 내 iframe 사용 — 무시됨 */
  preOpenedWindow?: Window | null;
};

type GameLaunchContextValue = {
  launch: (opts: GameLaunchOpts) => void;
  closeSlotModal: () => void;
};

const GameLaunchContext = createContext<GameLaunchContextValue | null>(null);

export function useGameLaunch(): GameLaunchContextValue {
  const v = useContext(GameLaunchContext);
  if (!v) {
    throw new Error("useGameLaunch은 GameIframeModalProvider 안에서만 사용하세요.");
  }
  return v;
}

/** @deprecated useGameLaunch().launch 사용 */
export function useGameIframeModal(): Pick<
  GameLaunchContextValue,
  "launch" | "closeSlotModal"
> & { open: (o: { url: string; title?: string }) => void; close: () => void } {
  const v = useGameLaunch();
  return {
    ...v,
    open: (o) => v.launch({ ...o, mode: "slot-iframe" }),
    close: v.closeSlotModal,
  };
}

function closeMaybe(w: Window | null | undefined) {
  if (!w || w.closed) return;
  try {
    w.close();
  } catch {
    /* ignore */
  }
}

export function GameIframeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [overlay, setOverlay] = useState<GameOverlayState | null>(null);

  const launch = useCallback((opts: GameLaunchOpts) => {
    const mobile =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 767px)").matches;

    if (opts.mode === "slot-iframe") {
      closeMaybe(opts.preOpenedWindow);
      setOverlay({
        url: opts.url,
        title: opts.title,
        kind: "slot",
      });
      return;
    }

    if (opts.mode === "casino-window") {
      closeMaybe(opts.preOpenedWindow);
      setOverlay({
        url: opts.url,
        title: opts.title,
        kind: "casino",
      });
      return;
    }

    const pre = opts.preOpenedWindow;
    if (pre && !pre.closed) {
      try {
        pre.location.href = opts.url;
      } catch {
        window.open(opts.url, "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (mobile) {
      window.open(opts.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (opts.mode === "new-tab") {
      window.open(opts.url, "_blank", "noopener,noreferrer");
      return;
    }

    setOverlay({ url: opts.url, title: opts.title, kind: "slot" });
  }, []);

  const closeSlotModal = useCallback(() => {
    setOverlay(null);
  }, []);

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSlotModal();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [overlay, closeSlotModal]);

  const label = overlay?.title?.trim() || (overlay?.kind === "casino" ? "카지노" : "슬롯");
  const isCasino = overlay?.kind === "casino";

  return (
    <GameLaunchContext.Provider value={{ launch, closeSlotModal }}>
      {children}
      {overlay ? (
        <div
          className="fixed inset-0 z-[110] flex flex-col bg-black md:items-center md:justify-center md:bg-black/90 md:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div
            className={
              isCasino
                ? "flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-zinc-950 md:h-[min(92dvh,900px)] md:max-h-[92dvh] md:max-w-[min(98vw,1440px)] md:rounded-2xl md:border md:border-white/10 md:shadow-2xl"
                : "flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-zinc-950 md:h-auto md:max-h-[92vh] md:max-w-[min(96vw,1680px)] md:rounded-2xl md:border md:border-white/10 md:shadow-2xl"
            }
          >
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-950/98 px-3 sm:h-14 sm:px-4">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100 sm:text-base">
                {label}
              </h2>
              <a
                href={overlay.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-white/15 hover:bg-white/5 hover:text-zinc-200 sm:px-3 sm:text-sm"
              >
                새 탭
              </a>
              <button
                type="button"
                onClick={closeSlotModal}
                aria-label="닫기"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-zinc-200 hover:bg-white/10 sm:text-3xl"
              >
                ×
              </button>
            </header>
            <div
              className={
                isCasino
                  ? "min-h-0 flex-1 bg-black p-0"
                  : "flex min-h-0 flex-1 bg-black md:items-center md:justify-center md:p-4"
              }
            >
              <div
                className={
                  isCasino
                    ? "relative h-full w-full"
                    : "relative h-full w-full md:aspect-video md:max-h-[min(78vh,calc(96vw*9/16))] md:max-w-[min(96vw,calc(78vh*16/9))] md:overflow-hidden md:rounded-xl md:border md:border-white/10 md:shadow-lg"
                }
              >
                <iframe
                  title={label}
                  src={overlay.url}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="fullscreen; autoplay; clipboard-read; clipboard-write; payment"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </GameLaunchContext.Provider>
  );
}

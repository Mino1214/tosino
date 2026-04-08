"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { LaunchSurface } from "@/lib/vinus-home-cards";

type SlotModalState = {
  url: string;
  title?: string;
};

type GameLaunchOpts = {
  url: string;
  title?: string;
  mode: LaunchSurface;
};

type GameLaunchContextValue = {
  launch: (opts: GameLaunchOpts) => void;
  closeSlotModal: () => void;
};

const GameLaunchContext = createContext<GameLaunchContextValue | null>(null);

/** 카지노: 독립 팝업 창. 내부에 iframe — 최상위 창 쿠키/XFO 이슈 완화용 */
export function openCasinoGameWindow(url: string, title: string) {
  const w = Math.min(1280, window.screen.availWidth - 24);
  const h = Math.min(820, window.screen.availHeight - 48);
  const left = Math.max(0, (window.screen.availWidth - w) / 2);
  const top = Math.max(0, (window.screen.availHeight - h) / 2);
  const feat = `popup=yes,width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes`;
  const win = window.open("about:blank", "_blank", feat);
  if (!win) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const safeTitle = esc(title);
  const safeUrl = url.replace(/"/g, "&quot;");
  win.document.open();
  win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/><title>${safeTitle}</title>
<style>
html,body{margin:0;height:100%;overflow:hidden;background:#09090b;font-family:system-ui,sans-serif}
.bar{flex-shrink:0;height:42px;background:#18181b;display:flex;align-items:center;gap:10px;padding:0 12px;color:#e4e4e7;font-size:14px;border-bottom:1px solid #27272a;box-sizing:border-box}
.bar strong{font-weight:600;color:#fafafa}
.bar a{margin-left:auto;font-size:13px;color:#a3a3a3;text-decoration:none;border:1px solid #3f3f46;padding:4px 10px;border-radius:8px}
.bar a:hover{color:#fafafa;background:#27272a}
.frame-wrap{flex:1;min-height:0;display:flex}
iframe{border:0;flex:1;width:100%;height:100%}
</style></head>
<body style="display:flex;flex-direction:column;height:100vh">
<div class="bar"><strong>${safeTitle}</strong><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">새 탭에서 열기</a></div>
<div class="frame-wrap"><iframe src="${safeUrl}" allow="fullscreen; autoplay; clipboard-read; clipboard-write; payment" referrerpolicy="no-referrer-when-downgrade" title="${safeTitle}"></iframe></div>
</body></html>`);
  win.document.close();
}

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

export function GameIframeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [slot, setSlot] = useState<SlotModalState | null>(null);

  const launch = useCallback((opts: GameLaunchOpts) => {
    if (opts.mode === "casino-window") {
      openCasinoGameWindow(opts.url, opts.title?.trim() || "게임");
      return;
    }
    setSlot({ url: opts.url, title: opts.title });
  }, []);

  const closeSlotModal = useCallback(() => {
    setSlot(null);
  }, []);

  useEffect(() => {
    if (!slot) return;
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
  }, [slot, closeSlotModal]);

  const label = slot?.title?.trim() || "슬롯";

  return (
    <GameLaunchContext.Provider value={{ launch, closeSlotModal }}>
      {children}
      {slot ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="flex max-h-[92vh] w-full max-w-[min(96vw,1680px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-950/95 px-3 py-2 sm:px-4">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100 sm:text-base">
                {label}
              </h2>
              <a
                href={slot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-white/15 hover:bg-white/5 hover:text-zinc-200 sm:px-3 sm:text-sm"
              >
                새 탭
              </a>
              <button
                type="button"
                onClick={closeSlotModal}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-black"
                style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
              >
                닫기
              </button>
            </header>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-2 sm:p-4">
              <div
                className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg"
                style={{
                  aspectRatio: "16 / 9",
                  maxHeight: "min(78vh, calc(96vw * 9 / 16))",
                  maxWidth: "min(96vw, calc(78vh * 16 / 9))",
                }}
              >
                <iframe
                  title={label}
                  src={slot.url}
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

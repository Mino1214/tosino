"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type OpenOpts = {
  url: string;
  title?: string;
};

type GameIframeContextValue = {
  open: (opts: OpenOpts) => void;
  close: () => void;
};

const GameIframeContext = createContext<GameIframeContextValue | null>(null);

export function useGameIframeModal(): GameIframeContextValue {
  const v = useContext(GameIframeContext);
  if (!v) {
    throw new Error("useGameIframeModal은 GameIframeModalProvider 안에서만 사용하세요.");
  }
  return v;
}

export function GameIframeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<OpenOpts | null>(null);

  const open = useCallback((opts: OpenOpts) => {
    setState(opts);
  }, []);

  const close = useCallback(() => {
    setState(null);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [state, close]);

  const label = state?.title?.trim() || "게임";

  return (
    <GameIframeContext.Provider value={{ open, close }}>
      {children}
      {state ? (
        <div
          className="fixed inset-0 z-[110] flex flex-col bg-black/80 p-0 sm:p-3 sm:pb-4"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 border-white/10 bg-zinc-950 shadow-2xl sm:mx-auto sm:max-w-[min(100vw-1.5rem,1200px)] sm:rounded-2xl sm:border">
            <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-zinc-950/95 px-2 py-2 pl-3 sm:px-4">
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100 sm:text-base">
                {label}
              </h2>
              <a
                href={state.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-white/15 hover:bg-white/5 hover:text-zinc-200 sm:px-3 sm:text-sm"
              >
                새 탭
              </a>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-black"
                style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
              >
                닫기
              </button>
            </header>
            <div className="relative min-h-0 flex-1 bg-black">
              <iframe
                title={label}
                src={state.url}
                className="absolute inset-0 h-full w-full border-0"
                allow="fullscreen; autoplay; clipboard-read; clipboard-write; payment"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      ) : null}
    </GameIframeContext.Provider>
  );
}

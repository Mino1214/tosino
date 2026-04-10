"use client";

import { useEffect } from "react";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

type ModalScaffoldProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
};

export function ModalScaffold({
  open,
  onClose,
  title,
  wide,
  children,
}: ModalScaffoldProps) {
  useEffect(() => {
    if (!open) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center md:p-4">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-white/10 bg-[#0a0a0e] shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl ${
          wide ? "sm:max-w-lg" : "sm:max-w-md"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xl leading-none text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

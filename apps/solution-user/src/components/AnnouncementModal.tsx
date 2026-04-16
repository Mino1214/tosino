"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useBootstrap } from "./BootstrapProvider";

function localYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hideStorageKey(platformId: string) {
  return `tosino_ann_hide_${platformId}`;
}

export function AnnouncementModal() {
  const b = useBootstrap();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const enabled = b?.announcements.modalEnabled === true;
  const items = useMemo(
    () =>
      (b?.announcements.items ?? []).filter((it) => it.imageUrl?.trim()),
    [b?.announcements.items],
  );
  const imagesFingerprint = items.map((it) => it.imageUrl).join("\0");

  useEffect(() => {
    if (!enabled || !b?.platformId || items.length === 0) {
      setOpen(false);
      return;
    }
    try {
      const saved = localStorage.getItem(hideStorageKey(b.platformId));
      if (saved === localYmd()) {
        setOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
    setIndex(0);
  }, [enabled, b?.platformId, items.length, imagesFingerprint]);

  const hideToday = useCallback(() => {
    if (!b?.platformId) return;
    try {
      localStorage.setItem(hideStorageKey(b.platformId), localYmd());
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, [b?.platformId]);

  const closeOnly = useCallback(() => setOpen(false), []);

  if (!enabled || items.length === 0 || !open) return null;

  const current = items[index] ?? items[0];
  const src = current.imageUrl;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-4 pb-8 sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-label="공지"
    >
      <div className="w-full max-w-[367px] overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">
        <div
          className="relative w-full bg-black"
          style={{ aspectRatio: "366.93 / 450.51" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="h-full w-full object-contain object-center"
          />
          {current.width != null && current.height != null ? (
            <p className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-zinc-300">
              {current.width}×{current.height}px
            </p>
          ) : null}
        </div>
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 border-t border-white/10 py-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`공지 ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? "bg-gold-gradient" : "bg-zinc-600"
                }`}
              />
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={hideToday}
            className="rounded-xl border border-white/20 py-3 text-sm font-medium text-zinc-200 hover:bg-white/5"
          >
            오늘하루 보지않기
          </button>
          <button
            type="button"
            onClick={closeOnly}
            className="rounded-xl bg-gold-gradient py-3 text-sm font-semibold text-black hover:opacity-90"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

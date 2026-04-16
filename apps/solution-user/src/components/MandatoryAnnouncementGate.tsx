"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";

type UnreadItem = { id: string; imageUrl: string };

/**
 * 필수 공지(mandatoryRead) 미읽음이 있으면 전체 화면으로 막고,
 * 확인 시 /me/announcements/:id/ack 후 다음으로 진행.
 */
export function MandatoryAnnouncementGate() {
  const [queue, setQueue] = useState<UnreadItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setQueue([]);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ unreadMandatory: UnreadItem[] }>(
        "/me/session-guards",
      );
      setQueue(res.unreadMandatory ?? []);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const current = queue[0];
  if (!current || loading) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="필수 공지"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl">
        <div className="max-h-[70vh] overflow-y-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.imageUrl}
            alt=""
            className="w-full object-contain"
          />
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="mb-3 text-center text-sm text-zinc-400">
            필수 공지입니다. 확인 후 이동할 수 있습니다.
          </p>
          <button
            type="button"
            className="w-full rounded-xl bg-amber-600 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-500"
            onClick={async () => {
              try {
                await apiFetch(`/me/announcements/${current.id}/ack`, {
                  method: "POST",
                });
                setQueue((q) => q.slice(1));
              } catch {
                /* ignore */
              }
            }}
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}

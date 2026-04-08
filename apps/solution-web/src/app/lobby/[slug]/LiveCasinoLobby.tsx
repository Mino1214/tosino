"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";
import { useGameLaunch } from "@/components/GameIframeModal";
import type { LaunchSurface } from "@/lib/vinus-home-cards";

type LiveCasinoLobbyProps = {
  /** 기본 pragmatic_casino (에이전트에서 에볼루션 미개통 시) */
  vendor?: string;
  title?: string;
  /** 카지노·라이브: 앱 내 전체 iframe / 슬롯: 16:9 모달 */
  launchSurface?: LaunchSurface;
};

export function LiveCasinoLobby({
  vendor = "pragmatic_casino",
  title = "라이브 카지노",
  launchSurface = "casino-window",
}: LiveCasinoLobbyProps = {}) {
  const router = useRouter();
  const { launch: openGame } = useGameLaunch();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    void (async () => {
      try {
        const w = await apiFetch<{ balance: string }>("/me/wallet");
        setWalletBalance(w.balance);
      } catch {
        setWalletBalance(null);
      }
    })();
  }, []);

  const launch = useCallback(async () => {
    setErr(null);
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    setLoading(true);
    const mobile =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 767px)").matches;
    /** `new-tab`만 비동기 전 빈 탭 선오픈(차단 완화). 카지노·슬롯 iframe은 앱 내부 */
    const needsPreTab = launchSurface === "new-tab";
    const pre =
      needsPreTab && typeof window !== "undefined"
        ? window.open("about:blank", "_blank", "noopener,noreferrer")
        : null;
    if (needsPreTab && !pre) {
      setErr("팝업이 차단되었습니다. 브라우저에서 이 사이트의 팝업을 허용해 주세요.");
      setLoading(false);
      return;
    }
    try {
      const out = await apiFetch<{ url: string }>("/me/casino/vinus/launch", {
        method: "POST",
        body: JSON.stringify({
          vendor,
          game: "lobby",
          platform: mobile ? "MOBILE" : "WEB",
          method: "seamless",
          lang: "ko",
        }),
      });
      if (out?.url) {
        openGame({
          url: out.url,
          title,
          mode: launchSurface,
          preOpenedWindow: pre,
        });
        return;
      }
      if (pre && !pre.closed) pre.close();
      setErr("게임 URL을 받지 못했습니다.");
    } catch (e) {
      if (pre && !pre.closed) pre.close();
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [router, vendor, title, openGame, launchSurface]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-zinc-500">Vinus Gaming</p>
      <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
      {walletBalance !== null ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left">
          <p className="text-xs text-zinc-500">충전·입금과 같은 지갑 (심리스)</p>
          <p className="mt-0.5 font-mono text-xl font-semibold text-[var(--theme-primary,#c9a227)]">
            {walletBalance}{" "}
            <span className="text-sm font-normal text-zinc-400">원</span>
          </p>
          <Link
            href="/wallet"
            className="mt-2 inline-block text-xs text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200"
          >
            모바일 충전 · 입금 신청 →
          </Link>
        </div>
      ) : null}
      <p className="mt-4 text-left text-sm leading-relaxed text-zinc-400">
        <strong className="text-zinc-200">심리스</strong>만 사용합니다. 베팅·당첨은
        위 지갑 잔액과 동일하게 처리됩니다.{" "}
        <strong className="text-zinc-200">카지노·라이브</strong>는 이 사이트 안
        iframe으로 열립니다.{" "}
        <strong className="text-zinc-200">슬롯(iframe 모드)</strong>은 PC에서
        16:9, 모바일은 넓게 표시됩니다.
      </p>
      {err ? (
        <p className="mt-4 text-sm text-red-400 whitespace-pre-wrap">{err}</p>
      ) : null}
      <div className="mx-auto mt-8 flex w-full max-w-md justify-center">
        <button
          type="button"
          onClick={() => void launch()}
          disabled={loading}
          className="inline-flex w-full justify-center rounded-xl px-6 py-3 text-sm font-medium text-black disabled:opacity-60"
          style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
        >
          {loading ? "연결 중…" : "입장"}
        </button>
      </div>
      <p className="mt-4 text-xs text-zinc-600">
        API 스모크: <code className="text-zinc-500">pnpm run vinus:flows-smoke</code>{" "}
        (apps/api, 서버 기동 후)
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl px-6 py-3 text-sm font-medium text-zinc-300 ring-1 ring-white/15 hover:bg-white/5"
      >
        홈으로
      </Link>
    </div>
  );
}

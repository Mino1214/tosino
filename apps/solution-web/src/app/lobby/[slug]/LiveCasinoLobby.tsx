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
  /** 프라그마틱 등 트랜스퍼만 쓰는 경우 버튼 단순화 */
  transferOnly?: boolean;
  /** 카지노·라이브: 팝업 / 슬롯·로비 슬롯: 16:9 모달 */
  launchSurface?: LaunchSurface;
};

export function LiveCasinoLobby({
  vendor = "pragmatic_casino",
  title = "라이브 카지노",
  transferOnly = false,
  launchSurface = "casino-window",
}: LiveCasinoLobbyProps = {}) {
  const router = useRouter();
  const { launch: openGame } = useGameLaunch();
  const [loadingMode, setLoadingMode] = useState<null | "seamless" | "transfer">(
    null,
  );
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

  const launch = useCallback(
    async (walletMethod: "seamless" | "transfer") => {
      setErr(null);
      if (!getAccessToken()) {
        router.push("/login");
        return;
      }
      setLoadingMode(walletMethod);
      try {
        const mobile =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(max-width: 767px)").matches;
        const out = await apiFetch<{ url: string }>("/me/casino/vinus/launch", {
          method: "POST",
          body: JSON.stringify({
            vendor,
            game: "lobby",
            platform: mobile ? "MOBILE" : "WEB",
            method: walletMethod,
            lang: "ko",
          }),
        });
        if (out?.url) {
          openGame({ url: out.url, title, mode: launchSurface });
          return;
        }
        setErr("게임 URL을 받지 못했습니다.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "오류");
      } finally {
        setLoadingMode(null);
      }
    },
    [router, vendor, title, openGame, launchSurface],
  );

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
        <strong className="text-zinc-200">심리스</strong> 입장 시 베팅/당첨은
        모두 위 지갑 잔액을 기준으로 처리됩니다. 입장 시 세션 토큰 발급 후 게임을
        <strong className="text-zinc-200">카지노·라이브</strong>는 별도 창(내부
        iframe), <strong className="text-zinc-200">슬롯</strong> 로비는 이 사이트
        위 16:9 모달로 띄웁니다. 막히면 각 화면의{" "}
        <strong className="text-zinc-200">새 탭</strong>을 쓰세요.
      </p>
      {err ? (
        <p className="mt-4 text-sm text-red-400 whitespace-pre-wrap">{err}</p>
      ) : null}
      <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
        {transferOnly ? (
          <button
            type="button"
            onClick={() => void launch("transfer")}
            disabled={loadingMode !== null}
            className="inline-flex w-full justify-center rounded-xl px-6 py-3 text-sm font-medium text-black disabled:opacity-60"
            style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
          >
            {loadingMode === "transfer" ? "연결 중…" : "트랜스퍼로 입장"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void launch("seamless")}
              disabled={loadingMode !== null}
              className="inline-flex flex-1 justify-center rounded-xl px-6 py-3 text-sm font-medium text-black disabled:opacity-60"
              style={{ backgroundColor: "var(--theme-primary, #c9a227)" }}
            >
              {loadingMode === "seamless" ? "연결 중…" : "심리스 입장"}
            </button>
            <button
              type="button"
              onClick={() => void launch("transfer")}
              disabled={loadingMode !== null}
              className="inline-flex flex-1 justify-center rounded-xl px-6 py-3 text-sm font-medium text-zinc-100 ring-1 ring-white/25 hover:bg-white/10 disabled:opacity-60"
            >
              {loadingMode === "transfer" ? "연결 중…" : "트랜스퍼 입장"}
            </button>
          </>
        )}
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

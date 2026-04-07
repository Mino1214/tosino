"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { apiFetch, getAccessToken } from "@/lib/api";

export function LiveCasinoLobby() {
  const router = useRouter();
  const [loadingMode, setLoadingMode] = useState<null | "seamless" | "transfer">(
    null,
  );
  const [err, setErr] = useState<string | null>(null);

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
            vendor: "evolution",
            game: "lobby",
            platform: mobile ? "MOBILE" : "WEB",
            method: walletMethod,
            lang: "ko",
          }),
        });
        if (out?.url) {
          window.location.href = out.url;
          return;
        }
        setErr("게임 URL을 받지 못했습니다.");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "오류");
      } finally {
        setLoadingMode(null);
      }
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-sm text-zinc-500">Vinus Gaming · 라이브 카지노</p>
      <h1 className="mt-2 text-2xl font-bold text-white">라이브 카지노</h1>
      <p className="mt-4 text-left text-sm leading-relaxed text-zinc-400">
        입장 시 서버에서 세션 토큰을 발급하고, Vinus{" "}
        <code className="text-zinc-500">play-game</code> 의{" "}
        <code className="text-zinc-500">method=seamless|transfer</code> 로
        실행 URL을 받습니다. 벤더 쪽에서는 두 방식 모두 테스트·컨펌(에볼루션)까지
        완료해야 합니다.
      </p>
      {err ? (
        <p className="mt-4 text-sm text-red-400 whitespace-pre-wrap">{err}</p>
      ) : null}
      <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
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

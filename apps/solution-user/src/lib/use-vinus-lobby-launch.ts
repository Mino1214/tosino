"use client";

import { useCallback, useState } from "react";
import { useGameLaunch } from "@/components/GameIframeModal";
import { useAppModals } from "@/contexts/AppModalsContext";
import { apiFetch, getAccessToken } from "@/lib/api";
import type { LaunchSurface } from "@/lib/vinus-home-cards";

type LobbyLaunchRequest = {
  key: string;
  vendor: string;
  title: string;
  game?: string;
  mode: LaunchSurface;
};

export function useVinusLobbyLaunch() {
  const { openLogin } = useAppModals();
  const { launch } = useGameLaunch();
  const [launchingKey, setLaunchingKey] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const openVendorLobby = useCallback(
    async ({ key, vendor, title, game = "lobby", mode }: LobbyLaunchRequest) => {
      setLaunchError(null);
      if (!getAccessToken()) {
        openLogin();
        return;
      }

      setLaunchingKey(key);
      const mobile =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 767px)").matches;

      try {
        const out = await apiFetch<{ url: string }>("/me/casino/vinus/launch", {
          method: "POST",
          body: JSON.stringify({
            vendor,
            game,
            platform: mobile ? "MOBILE" : "WEB",
            method: "seamless",
            lang: "ko",
          }),
        });

        if (!out?.url) {
          setLaunchError("게임 URL을 받지 못했습니다.");
          return;
        }

        launch({ url: out.url, title, mode });
      } catch (error) {
        setLaunchError(error instanceof Error ? error.message : "입장 요청 실패");
      } finally {
        setLaunchingKey(null);
      }
    },
    [launch, openLogin],
  );

  return {
    launchingKey,
    launchError,
    setLaunchError,
    openVendorLobby,
  };
}

"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

const STORAGE_KEY = "adminSelectedPlatformId";

/** 구 URL /platforms/:platformId/... 에서 세션에 플랫폼 저장 후 콘솔 경로로 이동 */
export function RedirectWithPlatform({ to }: { to: string }) {
  const router = useRouter();
  const params = useParams();
  const platformId = params.platformId as string | undefined;

  useEffect(() => {
    if (platformId && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, platformId);
    }
    router.replace(to);
  }, [platformId, router, to]);

  return <p className="text-zinc-500">콘솔로 이동 중…</p>;
}

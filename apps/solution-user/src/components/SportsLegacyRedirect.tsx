"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 구 URL → `/lobby/sports?tab=…` 통합 허브 */
export function SportsLegacyRedirect({
  tab,
}: {
  tab: "live" | "prematch";
}) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/lobby/sports?tab=${tab}`);
  }, [router, tab]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-zinc-500">
      스포츠 허브로 이동 중…
    </div>
  );
}

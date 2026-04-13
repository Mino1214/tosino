"use client";

import { useMemo, useState } from "react";
import { useBootstrap } from "@/components/BootstrapProvider";
import { defaultOddshostProxySecretFromEnv } from "@/lib/api";

/**
 * OddsHost 공개 프록시 비밀값.
 * 1) GET /public/bootstrap 의 oddshostProxySecret (API `ODDSHOST_PROXY_SECRET`)
 * 2) 빌드 시 `NEXT_PUBLIC_ODDSHOST_PROXY_SECRET`
 *
 * 운영에서는 API만 설정해도 스포츠 탭(오즈마켓·스페셜 등)이 자동으로 oddshostSecret 을 붙입니다.
 */
export function useOddsHostProxySecret(options: {
  allowManualOverride: boolean;
}) {
  const bootstrap = useBootstrap();
  const autoSecret = useMemo(() => {
    const b =
      typeof bootstrap?.oddshostProxySecret === "string"
        ? bootstrap.oddshostProxySecret.trim()
        : "";
    return b || defaultOddshostProxySecretFromEnv();
  }, [bootstrap]);

  const [manualOverride, setManualOverride] = useState("");
  const effectiveSecret = useMemo(() => {
    if (!options.allowManualOverride) return autoSecret;
    const t = manualOverride.trim();
    return t || autoSecret;
  }, [options.allowManualOverride, autoSecret, manualOverride]);

  return {
    effectiveSecret,
    autoSecret,
    manualOverride,
    setManualOverride,
  };
}

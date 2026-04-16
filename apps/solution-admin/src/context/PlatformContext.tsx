"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, getAccessToken, getStoredUser } from "@/lib/api";

export type PlatformRow = {
  id: string;
  slug: string;
  name: string;
  previewPort: number | null;
  domains: { host: string }[];
  solutionTemplateKey?: string;
  solutionHostSuffix?: string;
  solutionRatePolicy?: {
    upstreamCasinoPct?: string | null;
    upstreamSportsPct?: string | null;
    platformCasinoPct?: string | null;
    platformSportsPct?: string | null;
    autoMarginPct?: string | null;
  };
};

type Ctx = {
  platforms: PlatformRow[];
  selectedPlatformId: string | null;
  setSelectedPlatformId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const PlatformContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "adminSelectedPlatformId";

function initialSelectedPlatformId(): string | null {
  if (typeof window === "undefined") return null;
  const user = getStoredUser();
  if (user?.role === "PLATFORM_ADMIN" && user.platformId) {
    return user.platformId;
  }
  if (user?.role === "MASTER_AGENT" && user.platformId) {
    return user.platformId;
  }
  return sessionStorage.getItem(STORAGE_KEY);
}

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [platforms, setPlatforms] = useState<PlatformRow[]>([]);
  const [selectedPlatformId, setSelectedPlatformIdState] = useState<
    string | null
  >(initialSelectedPlatformId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applySelection = useCallback((list: PlatformRow[]) => {
    const user = getStoredUser();
    if (user?.role === "PLATFORM_ADMIN" && user.platformId) {
      setSelectedPlatformIdState(user.platformId);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, user.platformId);
      }
      return;
    }
    if (user?.role === "MASTER_AGENT" && user.platformId) {
      setSelectedPlatformIdState(user.platformId);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(STORAGE_KEY, user.platformId);
      }
      return;
    }
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && list.some((p) => p.id === saved)) {
      setSelectedPlatformIdState(saved);
      return;
    }
    if (list[0]) {
      setSelectedPlatformIdState(list[0].id);
      sessionStorage.setItem(STORAGE_KEY, list[0].id);
    } else {
      setSelectedPlatformIdState(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) {
      setPlatforms([]);
      setSelectedPlatformIdState(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const list = await apiFetch<PlatformRow[]>("/platforms");
      setPlatforms(list);
      applySelection(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "플랫폼 목록 오류");
      setPlatforms([]);
      /** 목록 실패해도 플랫폼 관리자는 JWT의 platformId로 API 호출 가능 */
      applySelection([]);
    } finally {
      setLoading(false);
    }
  }, [applySelection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSelectedPlatformId = useCallback((id: string) => {
    setSelectedPlatformIdState(id);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const value = useMemo(
    () => ({
      platforms,
      selectedPlatformId,
      setSelectedPlatformId,
      loading,
      error,
      refresh,
    }),
    [
      platforms,
      selectedPlatformId,
      setSelectedPlatformId,
      loading,
      error,
      refresh,
    ],
  );

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }
  return ctx;
}

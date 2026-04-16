"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AdminConsoleMode = "standard" | "semiVirtual";

const STORAGE_KEY = "tosinoAdminConsoleMode";

type Ctx = {
  mode: AdminConsoleMode;
  setMode: (m: AdminConsoleMode) => void;
};

const AdminConsoleModeContext = createContext<Ctx | null>(null);

export function AdminConsoleModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<AdminConsoleMode>("standard");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = sessionStorage.getItem(STORAGE_KEY) as AdminConsoleMode | null;
    if (s === "semiVirtual" || s === "standard") setModeState(s);
  }, []);

  const setMode = useCallback((m: AdminConsoleMode) => {
    setModeState(m);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, m);
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <AdminConsoleModeContext.Provider value={value}>
      {children}
    </AdminConsoleModeContext.Provider>
  );
}

export function useAdminConsoleMode() {
  const ctx = useContext(AdminConsoleModeContext);
  if (!ctx) {
    throw new Error("useAdminConsoleMode must be used within provider");
  }
  return ctx;
}

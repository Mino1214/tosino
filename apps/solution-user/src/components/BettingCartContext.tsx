"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type BettingCartLine = {
  id: string;
  matchLabel: string;
  pickLabel: string;
  odd: string;
  selectionKey?: string;
  source?: "odds-api" | "manual";
  marketType?: "moneyline" | "handicap" | "totals";
  outcome?: "home" | "draw" | "away" | "over" | "under";
  line?: number | null;
  leagueName?: string | null;
  homeName?: string | null;
  awayName?: string | null;
  startTime?: string | null;
  bookmakerCount?: number | null;
  sourceBookmaker?: string | null;
};

type BettingCartContextValue = {
  lines: BettingCartLine[];
  addLine: (line: Omit<BettingCartLine, "id">) => void;
  removeLine: (id: string) => void;
  clear: () => void;
  /** 배팅카트 모바일 패널 */
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  /** 배팅내역 패널 */
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
};

const BettingCartContext = createContext<BettingCartContextValue | null>(null);

export function BettingCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<BettingCartLine[]>([]);
  const [panelOpen, setPanelOpen]     = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const addLine = useCallback((line: Omit<BettingCartLine, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setLines((prev) => [...prev, { ...line, id }]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, addLine, removeLine, clear, panelOpen, setPanelOpen, historyOpen, setHistoryOpen }),
    [lines, addLine, removeLine, clear, panelOpen, historyOpen],
  );

  return (
    <BettingCartContext.Provider value={value}>
      {children}
    </BettingCartContext.Provider>
  );
}

export function useBettingCart() {
  const v = useContext(BettingCartContext);
  if (!v) throw new Error("useBettingCart는 BettingCartProvider 안에서만 사용하세요.");
  return v;
}

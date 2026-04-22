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
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
};

const BettingCartContext = createContext<BettingCartContextValue | null>(null);

export function BettingCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<BettingCartLine[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  /**
   * 동일 경기 + 동일 마켓(ex. moneyline home/draw/away) 는 서로 상충이라 중복 선택 금지.
   * selectionKey 형식: `${matchId}:${marketType}:${outcome}[:line]`.
   * - 동일한 selectionKey 가 이미 있으면 → 제거만 (토글 off).
   * - 접두사 `${matchId}:${marketType}:` 가 같은 기존 라인은 제거하고 새 라인으로 교체.
   * - extra 마켓(selectionKey 에 `:extra:` 포함)은 그 마켓 이름까지 포함한 prefix 로 교체.
   */
  const addLine = useCallback((line: Omit<BettingCartLine, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nextKey = line.selectionKey ?? "";
    const conflictPrefix = deriveConflictPrefix(nextKey);
    setLines((prev) => {
      if (nextKey && prev.some((l) => l.selectionKey === nextKey)) {
        return prev.filter((l) => l.selectionKey !== nextKey);
      }
      const filtered = conflictPrefix
        ? prev.filter((l) => {
            const k = l.selectionKey ?? "";
            return !(k && k.startsWith(conflictPrefix) && k !== nextKey);
          })
        : prev;
      return [...filtered, { ...line, id }];
    });
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      addLine,
      removeLine,
      clear,
      panelOpen,
      setPanelOpen,
      historyOpen,
      setHistoryOpen,
    }),
    [lines, addLine, removeLine, clear, panelOpen, historyOpen],
  );

  return (
    <BettingCartContext.Provider value={value}>
      {children}
    </BettingCartContext.Provider>
  );
}

/**
 * selectionKey → "같은 경기+마켓" prefix.
 * - "matchId:marketType:outcome[:line]"   → "matchId:marketType:"
 * - "matchId:extra:MarketName:label:hdp" → "matchId:extra:MarketName:"
 * - 그 외 형식은 null 로 놓아 교체 없이 추가.
 */
function deriveConflictPrefix(key: string): string | null {
  if (!key) return null;
  const parts = key.split(":");
  if (parts.length < 3) return null;
  if (parts[1] === "extra") {
    if (parts.length < 4) return null;
    return `${parts[0]}:extra:${parts[2]}:`;
  }
  return `${parts[0]}:${parts[1]}:`;
}

export function useBettingCart() {
  const v = useContext(BettingCartContext);
  if (!v) throw new Error("useBettingCart는 BettingCartProvider 안에서만 사용하세요.");
  return v;
}

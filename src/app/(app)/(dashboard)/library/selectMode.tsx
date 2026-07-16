"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SelectModeValue = {
  isSelecting: boolean;
  canSelect: boolean;
  setCanSelect: (v: boolean) => void;
  start: () => void;
  exit: () => void;
  toggle: () => void;
};

const SelectModeContext = createContext<SelectModeValue | null>(null);

export function SelectModeProvider({ children }: { children: ReactNode }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [canSelect, setCanSelect] = useState(false);

  const start = useCallback(() => setIsSelecting(true), []);
  const exit = useCallback(() => setIsSelecting(false), []);
  const toggle = useCallback(() => setIsSelecting((v) => !v), []);

  const value = useMemo(
    () => ({ isSelecting, canSelect, setCanSelect, start, exit, toggle }),
    [isSelecting, canSelect, start, exit, toggle]
  );

  return (
    <SelectModeContext.Provider value={value}>
      {children}
    </SelectModeContext.Provider>
  );
}

export function useSelectMode(): SelectModeValue {
  const ctx = useContext(SelectModeContext);
  if (!ctx) {
    // Safe no-op fallback so components outside the provider don't crash
    // (e.g. LibraryTabs while other library sub-routes mount).
    return {
      isSelecting: false,
      canSelect: false,
      setCanSelect: () => {},
      start: () => {},
      exit: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

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
  headerRight: ReactNode | null;
  setHeaderRight: (node: ReactNode | null) => void;
};

const SelectModeContext = createContext<SelectModeValue | null>(null);

export function SelectModeProvider({ children }: { children: ReactNode }) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [canSelect, setCanSelect] = useState(false);
  const [headerRight, setHeaderRight] = useState<ReactNode | null>(null);

  const start = useCallback(() => setIsSelecting(true), []);
  const exit = useCallback(() => setIsSelecting(false), []);
  const toggle = useCallback(() => setIsSelecting((v) => !v), []);

  const value = useMemo(
    () => ({
      isSelecting,
      canSelect,
      setCanSelect,
      start,
      exit,
      toggle,
      headerRight,
      setHeaderRight,
    }),
    [isSelecting, canSelect, start, exit, toggle, headerRight]
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
    return {
      isSelecting: false,
      canSelect: false,
      setCanSelect: () => {},
      start: () => {},
      exit: () => {},
      toggle: () => {},
      headerRight: null,
      setHeaderRight: () => {},
    };
  }
  return ctx;
}

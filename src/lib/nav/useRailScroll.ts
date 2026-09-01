"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

// Tracks whether a horizontal scroll rail has room to advance in either
// direction, and exposes helpers to scroll by a card width.
//
// Callers pass a ref to the scrolling element and (optionally) the width
// of a single card + gap so the click advance matches the visible grid.
// Falls back to ~90% of clientWidth when no per-card measurement is passed.
export function useRailScroll(
  ref: RefObject<HTMLElement | null>,
  { step, epsilon = 4 }: { step?: number; epsilon?: number } = {}
) {
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > epsilon);
    setCanRight(scrollLeft + clientWidth < scrollWidth - epsilon);
  }, [ref, epsilon]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [ref, update]);

  const scrollBy = useCallback(
    (direction: 1 | -1) => {
      const el = ref.current;
      if (!el) return;
      const dx = direction * (step ?? Math.round(el.clientWidth * 0.9));
      el.scrollBy({ left: dx, behavior: "smooth" });
    },
    [ref, step]
  );

  return {
    canLeft,
    canRight,
    scrollLeft: () => scrollBy(-1),
    scrollRight: () => scrollBy(1),
  };
}

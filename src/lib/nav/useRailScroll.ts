"use client";

import { useCallback, useEffect, useState } from "react";

// Tracks whether a horizontal scroll rail has room to advance in either
// direction, and exposes helpers to scroll by a card width.
//
// Uses a callback ref so the hook re-binds whenever the scroller node
// mounts or unmounts — critical for rails that only appear after their
// data has loaded (skeleton → real rail swap).
export function useRailScroll({
  step,
  epsilon = 4,
}: { step?: number; epsilon?: number } = {}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanLeft(scrollLeft > epsilon);
      setCanRight(scrollLeft + clientWidth < scrollWidth - epsilon);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [el, epsilon]);

  const scrollBy = useCallback(
    (direction: 1 | -1) => {
      if (!el) return;
      const dx = direction * (step ?? Math.round(el.clientWidth * 0.9));
      el.scrollBy({ left: dx, behavior: "smooth" });
    },
    [el, step]
  );

  return {
    // Callback ref — pass this straight to <div ref={setRef}>.
    setRef: setEl,
    canLeft,
    canRight,
    scrollLeft: () => scrollBy(-1),
    scrollRight: () => scrollBy(1),
  };
}

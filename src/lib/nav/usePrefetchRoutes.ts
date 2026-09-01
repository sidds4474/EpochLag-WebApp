"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Warms one or more route chunks on mount so subsequent router.push()
// navigations feel instant instead of stalling on cold JS download.
//
// Safe to call anywhere: router.prefetch is a pure side-effect — it
// downloads bundles in the background, doesn't render, doesn't affect
// state, and gracefully no-ops on failure.
//
// Pass exact URLs (including dynamic ids where known). For static routes
// call once with the string list; for lists of dynamic destinations
// (`/thread/:id`, `/profile/:id`), pass the resolved URLs after data loads.
export function usePrefetchRoutes(routes: readonly string[]) {
  const router = useRouter();
  useEffect(() => {
    for (const r of routes) {
      if (r) router.prefetch(r);
    }
    // We intentionally re-run when the list of routes changes; for static
    // arrays this fires once per mount, for derived lists it fires as new
    // ids come in. Callers should memoize when they want per-item prefetch
    // triggered only on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, routes.join("|")]);
}

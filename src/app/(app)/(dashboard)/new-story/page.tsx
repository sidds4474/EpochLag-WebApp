"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// `/new-story` used to be a mode-picker landing (Tell / Ask / Inspire).
// The new composer collapses everything into a single `/new-lag` surface
// with mode branches driven by query params, so this route just forwards
// along with whatever params were passed in.
//
// Callers that still link here: TabletDrawer, BottomTabBar, Sidebar
// (Create button), Moments detail card, album page, PromptViewer — all
// authored before the composer collapse. Rather than updating every
// call site, we keep this as a stable redirect.

export default function NewStoryRedirect() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const qs = search.toString();
    router.replace(qs ? `/new-lag?${qs}` : "/new-lag");
  }, [router, search]);

  return null;
}

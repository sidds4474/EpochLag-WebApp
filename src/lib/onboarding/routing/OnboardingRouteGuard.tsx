"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../store";
import { pickInitialRouteFromState } from "./pickInitialRoute";
import { urlForScreen, type ScreenName } from "./routes";

// Route guard for entry-point pages. Landing (`/`), auth entries, and the
// generic `/onboarding` shell mount this. On hydration, it computes
// pickInitialRoute and — if the decision doesn't match the current URL —
// router.replace to the correct screen.
//
// Screens in the middle of a flow should NOT mount this. It exists to
// resolve ambiguity at entry points, not to policework every page.
//
// Behavior:
//   • !hydrated  → render fallback (splash)
//   • hydrated + decision === "STAY" → render children (URL is fine)
//   • hydrated + decision === ScreenName → redirect if URL differs; else render children
//
// The `currentScreen` prop tells the guard what URL the user hit, so it can
// no-op when the decision matches. If omitted, any non-STAY decision triggers
// a redirect (useful for a generic /onboarding shell that has no dedicated
// screen).

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  currentScreen?: ScreenName;
};

export function OnboardingRouteGuard({
  children,
  fallback = null,
  currentScreen,
}: Props) {
  const router = useRouter();
  const state = useAppSelector((s) => ({
    hydrated: s.anonDraft.hydrated,
    hasDraftToken: s.anonDraft.hasDraftToken,
    lastStep: s.anonDraft.lastStep,
    isAuthenticated: s.auth.isAuthenticated,
    onboardingCompletedAt: s.profile.onboardingCompletedAt,
    hasUsedTrial: s.profile.hasUsedTrial,
  }));

  const decision = useMemo(() => {
    if (!state.hydrated) return null;
    return pickInitialRouteFromState({
      anonDraft: {
        hydrated: state.hydrated,
        hasDraftToken: state.hasDraftToken,
        lastStep: state.lastStep,
      },
      auth: { isAuthenticated: state.isAuthenticated },
      profile: {
        onboardingCompletedAt: state.onboardingCompletedAt,
        hasUsedTrial: state.hasUsedTrial,
      },
      // Placeholder shape — the helper only reads these fields.
    } as unknown as Parameters<typeof pickInitialRouteFromState>[0]);
  }, [state]);

  useEffect(() => {
    if (!decision) return;
    if (decision === "STAY") return;
    if (currentScreen && decision === currentScreen) return;
    router.replace(urlForScreen(decision));
  }, [decision, currentScreen, router]);

  if (!state.hydrated) return <>{fallback}</>;

  // While a redirect is queued, still render children rather than flashing
  // an empty screen — Next.js will unmount as soon as router.replace resolves.
  return <>{children}</>;
}

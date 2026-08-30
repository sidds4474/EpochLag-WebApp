import type { RootState } from "../store";
import {
  PHASE_A_SCREEN_INDEX,
  screenAtResumableIndex,
  type ScreenName,
} from "./routes";

// Cold-start decision. Mirrors mobile's AppNavigator.js:221-402. Called by
// the router guard on landing / auth / onboarding root paths.
//
// Return value:
//   • ScreenName — redirect here
//   • null       — splash (still hydrating)
//   • "STAY"     — no redirect; render whatever URL the user hit

export type InitialRouteDecision = ScreenName | "STAY" | null;

export type PickInitialRouteInput = {
  anonHydrated: boolean;
  anonHasDraftToken: boolean;
  anonLastStep: number | null;
  isAuthenticated: boolean;
  onboardingCompletedAt: string | null | undefined;
  hasUsedTrial: boolean;
  // Non-null when the post-signup FirstStory track is active (dispatch-driven).
  firstStoryActiveStep: number | null;
};

export function pickInitialRoute(
  s: PickInitialRouteInput
): InitialRouteDecision {
  // 1. Wait for hydration. Splash.
  if (!s.anonHydrated) return null;

  // 2. Post-signup FirstStory track — highest priority. Even if user is
  //    authed and mid-Phase-C, an active FirstStory dispatch takes over.
  if (s.firstStoryActiveStep !== null) return "FirstStoryOnboarding";

  // 3. Anon-authed resume gate. User has a token but may or may not have
  //    finished onboarding.
  if (s.isAuthenticated) {
    if (s.onboardingCompletedAt) return "AppDrawer";
    if (s.hasUsedTrial === true) return "ReferralPitch";
    return "AddRelationship";
  }

  // 4. Anon cold-start with in-flight draft.
  if (s.anonHasDraftToken && typeof s.anonLastStep === "number") {
    const resume = screenAtResumableIndex(s.anonLastStep);
    if (resume) return resume;
    // Corrupted lastStep — fall through to fresh start.
  }

  // 5. Fresh cold start.
  return "ValueProp1";
}

// Convenience: pull the inputs off a RootState snapshot. FirstStory
// dispatch-driven step will land in a dedicated slice in M11 — until then,
// this helper reads a field that's always null.
export function pickInitialRouteFromState(
  state: RootState,
  firstStoryActiveStep: number | null = null
): InitialRouteDecision {
  return pickInitialRoute({
    anonHydrated: state.anonDraft.hydrated,
    anonHasDraftToken: state.anonDraft.hasDraftToken,
    anonLastStep: state.anonDraft.lastStep,
    isAuthenticated: state.auth.isAuthenticated,
    onboardingCompletedAt: state.profile.onboardingCompletedAt,
    hasUsedTrial: state.profile.hasUsedTrial,
    firstStoryActiveStep,
  });
}

// Re-export so callers don't have to reach into routes.ts separately.
export { PHASE_A_SCREEN_INDEX };

// Mobile ↔ web route mapping. Mobile uses React Navigation screen names;
// web uses URL paths. Everything else in the onboarding code refers to
// screens by their mobile name — this file is the single translation table.

export type ScreenName =
  // Track 1 — anon composer (Phase A)
  | "ValueProp1"
  | "WhyEpochLag"
  | "WhatsALag"
  | "AddMemory"
  | "AddTimePlace"
  | "AddParticipants"
  | "LagPreview"
  // Auth (Phase B)
  | "LoginScreen"
  | "SignupScreen"
  | "VerifyOtp"
  | "CreateAccount"
  // Post-auth (Phase B tail)
  | "ShareLag"
  // Preferences (Phase C)
  | "AddRelationship"
  | "MemoryTags"
  | "AllowContacts"
  | "SelectFriends"
  // Trial + growth + complete (Phase D)
  | "FreeTrialOnboarding"
  | "WhatToExpect"
  | "ReferralPitch"
  | "OnboardingComplete"
  // Post-signup FirstStory track (Track 2, redispatched)
  | "FirstStoryOnboarding"
  // Main app
  | "AppDrawer";

// PHASE_A_ORDER — canonical Track 1 progression. Index into this to seed
// back-stack via usePhaseAResumeSeed (M5).
export const PHASE_A_ORDER: ScreenName[] = [
  "ValueProp1",
  "WhyEpochLag",
  "WhatsALag",
  "AddMemory",
  "AddTimePlace",
  "AddParticipants",
  "LagPreview",
];

// PHASE_A_SCREEN_INDEX — resumable subset (WhatsALag onwards). Persisted
// as `lastOnboardingStep`. ValueProp1 + WhyEpochLag intentionally excluded
// (per spec: bumpLastOnboardingStep early-returns for index < 2 in
// PHASE_A_ORDER terms, i.e. resumable index < 0).
export const PHASE_A_RESUMABLE_START_INDEX = 2; // WhatsALag

export const PHASE_A_SCREEN_INDEX: ScreenName[] = PHASE_A_ORDER.slice(
  PHASE_A_RESUMABLE_START_INDEX
);

// Convert a Phase A screen name to its resumable index (or null if
// non-resumable / not in Phase A).
export function resumableIndexOf(screen: ScreenName): number | null {
  const idx = PHASE_A_SCREEN_INDEX.indexOf(screen);
  return idx >= 0 ? idx : null;
}

// Convert a resumable index back to a screen name (or null if OOB).
export function screenAtResumableIndex(index: number): ScreenName | null {
  return PHASE_A_SCREEN_INDEX[index] || null;
}

// URL map — the only place mobile screen names get translated to Next.js
// paths. Screens that don't exist yet (M5+) are still listed so the router
// can plan redirects; navigating there before the screen ships will land on
// a 404, which is the desired behavior during scaffolding.
export const ROUTE_URL: Record<ScreenName, string> = {
  // Track 1 anon composer
  ValueProp1: "/onboarding/welcome",
  WhyEpochLag: "/onboarding/why-epoch-lag",
  WhatsALag: "/onboarding/whats-a-lag",
  AddMemory: "/onboarding/add-memory",
  AddTimePlace: "/onboarding/add-time-place",
  AddParticipants: "/onboarding/add-participants",
  LagPreview: "/onboarding/lag-preview",

  // Auth — existing screens for now; redesign lands in M8.
  LoginScreen: "/login",
  SignupScreen: "/signup",
  VerifyOtp: "/verify-otp",
  CreateAccount: "/onboarding/create-account",

  ShareLag: "/onboarding/share-lag",

  // Phase C
  AddRelationship: "/onboarding/add-relationship",
  MemoryTags: "/onboarding/memory-tags",
  AllowContacts: "/onboarding/allow-contacts",
  SelectFriends: "/onboarding/select-friends",

  // Phase D
  FreeTrialOnboarding: "/onboarding/free-trial",
  WhatToExpect: "/onboarding/what-to-expect",
  ReferralPitch: "/onboarding/referral-pitch",
  OnboardingComplete: "/onboarding/complete",

  // Track 2
  FirstStoryOnboarding: "/onboarding/first-story",

  // Main app
  AppDrawer: "/home",
};

export function urlForScreen(screen: ScreenName): string {
  return ROUTE_URL[screen];
}

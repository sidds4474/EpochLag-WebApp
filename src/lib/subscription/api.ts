import { api } from "../api/client";

export type SubscriptionPlan =
  | "free"
  | "free_trial"
  | "unlimited"
  | (string & {});

export type Subscription = {
  plan: SubscriptionPlan;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  willRenew: boolean;
  cancellationDate: string | null;
  hasUsedTrial: boolean;
  store: "app_store" | "play_store" | null;
};

type RawSubscription = Partial<Subscription> & {
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  // MONETIZATION OFF: BE 2026-09-25 contract — when false, every user is
  // treated as unlimited and all paid/trial/referral surfaces must hide.
  monetizationEnabled?: boolean;
};

type SubscriptionEnvelope = {
  success: boolean;
  data: RawSubscription;
  message?: string;
  // Some BE paths put monetizationEnabled at envelope level too.
  monetizationEnabled?: boolean;
};

export async function fetchSubscription(): Promise<Subscription> {
  const res = await api.get<SubscriptionEnvelope>("/api/subscription");
  const d = res.data ?? {};
  // MONETIZATION OFF: server is authoritative. If BE flagged monetization off
  // OR already returned plan: "unlimited", force the unlocked shape so no
  // stale /me field or local cache can downgrade us to "free". Mirrors the
  // mobile reconciler fix (local cache was fighting server-of-truth).
  const monetizationOff =
    d.monetizationEnabled === false || res.monetizationEnabled === false;
  if (monetizationOff || d.plan === "unlimited") {
    return {
      plan: "unlimited",
      trialStartedAt: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      willRenew: false,
      cancellationDate: null,
      hasUsedTrial: false,
      store: null,
    };
  }
  return {
    plan: (d.plan as SubscriptionPlan) ?? "free",
    trialStartedAt: d.trialStartedAt ?? d.trialStartDate ?? null,
    trialEndsAt: d.trialEndsAt ?? d.trialEndDate ?? null,
    currentPeriodEnd: d.currentPeriodEnd ?? null,
    willRenew: d.willRenew ?? false,
    cancellationDate: d.cancellationDate ?? null,
    hasUsedTrial: d.hasUsedTrial ?? false,
    store: d.store ?? null,
  };
}

// Explicit trial activation. Idempotent per BE contract:
//   200 → trial granted, subscription state flips to free_trial
//   409 → hasUsedTrial was already true (previous device / mobile)
//   403 → paywall gate (interceptor tags err.isPaywallRedirect)
// Mirror of mobile FreeTrialOnboardingScreen.onStartTrial. `platform` is
// accepted-and-ignored server-side but kept for parity + future gating.
export async function startTrial(): Promise<Subscription> {
  // MONETIZATION OFF: trial activation is a no-op server-side. Return the
  // same "unlimited" shape BE now returns for /api/subscription so any caller
  // that reconciles off this result sees the user as fully unlocked. Original
  // body preserved below for restoration.
  return {
    plan: "unlimited",
    trialStartedAt: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    willRenew: false,
    cancellationDate: null,
    hasUsedTrial: false,
    store: null,
  };
  // eslint-disable-next-line no-unreachable
  const res = await api.post<SubscriptionEnvelope>(
    "/api/subscription/start-trial",
    { platform: "web" }
  );
  const d = res.data ?? {};
  return {
    plan: (d.plan as SubscriptionPlan) ?? "free",
    trialStartedAt: d.trialStartedAt ?? d.trialStartDate ?? null,
    trialEndsAt: d.trialEndsAt ?? d.trialEndDate ?? null,
    currentPeriodEnd: d.currentPeriodEnd ?? null,
    willRenew: d.willRenew ?? false,
    cancellationDate: d.cancellationDate ?? null,
    hasUsedTrial: d.hasUsedTrial ?? true,
    store: d.store ?? null,
  };
}

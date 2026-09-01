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
};

type SubscriptionEnvelope = {
  success: boolean;
  data: RawSubscription;
  message?: string;
};

export async function fetchSubscription(): Promise<Subscription> {
  const res = await api.get<SubscriptionEnvelope>("/api/subscription");
  const d = res.data ?? {};
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

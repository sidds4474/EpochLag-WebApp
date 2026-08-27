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

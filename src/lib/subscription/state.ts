import type { AppDispatch } from "../onboarding/store";
import {
  setSubscription,
  type SubscriptionPlan as ProfileSubscriptionPlan,
} from "../onboarding/store/slices/profileSlice";
import { fetchSubscription, type Subscription } from "./api";

function narrowPlan(plan: Subscription["plan"]): ProfileSubscriptionPlan {
  if (plan === "unlimited") return "unlimited";
  if (plan === "free_trial") return "free_trial";
  return "free";
}

// Fetch /api/subscription and reconcile the profile slice. Returns the
// fresh subscription on success or null if the fetch failed — callers
// decide whether that's fatal (login gate) or best-effort (side panel).
export async function refreshSubscriptionState(
  dispatch: AppDispatch
): Promise<Subscription | null> {
  try {
    const sub = await fetchSubscription();
    dispatch(
      setSubscription({
        plan: narrowPlan(sub.plan),
        hasUsedTrial: sub.hasUsedTrial,
        trialStartedAt: sub.trialStartedAt,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
        willRenew: sub.willRenew,
      })
    );
    return sub;
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn(
        "[refreshSubscriptionState] failed:",
        e instanceof Error ? e.message : e
      );
    }
    return null;
  }
}

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../../../types/user";

export type SubscriptionPlan = "free" | "unlimited" | "free_trial";
export type FreeTrialDecision = "started" | "declined" | null;

export type ProfileState = {
  _id: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  countryCode: string | null;
  email: string | null;
  dateOfBirth: string | null;

  subscriptionPlan: SubscriptionPlan;
  hasUsedTrial: boolean;
  freeTrialDecision: FreeTrialDecision;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialReminderSeenAt: string | null;
  currentPeriodEnd: string | null;
  willRenew: boolean | null;

  // V4 gate — the truth source for onboarding completion. undefined means
  // legacy V3 profile (fall back to onboardingStage).
  onboardingCompletedAt: string | null | undefined;
  onboardingStage: 0 | 1 | 2 | 3 | null;

  // Raw dump for anything else screens want to read (e.g. profilePicture).
  raw: User | null;
};

const initialState: ProfileState = {
  _id: null,
  firstName: null,
  lastName: null,
  phone: null,
  countryCode: null,
  email: null,
  dateOfBirth: null,
  subscriptionPlan: "free",
  hasUsedTrial: false,
  freeTrialDecision: null,
  trialStartedAt: null,
  trialEndsAt: null,
  trialReminderSeenAt: null,
  currentPeriodEnd: null,
  willRenew: null,
  onboardingCompletedAt: undefined,
  onboardingStage: null,
  raw: null,
};

type SubscriptionInfo = {
  plan?: SubscriptionPlan;
  hasUsedTrial?: boolean;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  willRenew?: boolean | null;
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    saveProfile: (state, action: PayloadAction<User>) => {
      const u = action.payload;
      state._id = u._id ?? null;
      state.firstName = u.firstName ?? null;
      state.lastName = u.lastName ?? null;
      state.phone = u.phone ?? null;
      state.countryCode = u.countryCode ?? null;
      state.email = u.email ?? null;
      state.dateOfBirth = u.dateOfBirth ?? null;
      state.onboardingStage = (u.onboardingStage ?? null) as ProfileState["onboardingStage"];
      // NOTE: onboardingCompletedAt / subscription fields come from a fuller
      // user envelope than the current `User` type declares. Keep them opt-in
      // via raw and let dedicated actions overwrite them when BE returns them.
      const extended = u as User & {
        onboardingCompletedAt?: string | null;
        subscriptionPlan?: SubscriptionPlan;
        hasUsedTrial?: boolean;
        trialStartedAt?: string | null;
        trialEndsAt?: string | null;
      };
      if ("onboardingCompletedAt" in extended) {
        state.onboardingCompletedAt = extended.onboardingCompletedAt ?? null;
      }
      if (extended.subscriptionPlan) state.subscriptionPlan = extended.subscriptionPlan;
      if (typeof extended.hasUsedTrial === "boolean") {
        state.hasUsedTrial = extended.hasUsedTrial;
      }
      if ("trialStartedAt" in extended) state.trialStartedAt = extended.trialStartedAt ?? null;
      if ("trialEndsAt" in extended) state.trialEndsAt = extended.trialEndsAt ?? null;
      state.raw = u;
    },
    updateProfileFields: (state, action: PayloadAction<Partial<ProfileState>>) => {
      Object.assign(state, action.payload);
    },
    setSubscription: (state, action: PayloadAction<SubscriptionInfo>) => {
      const s = action.payload;
      if (s.plan) state.subscriptionPlan = s.plan;
      if (typeof s.hasUsedTrial === "boolean") state.hasUsedTrial = s.hasUsedTrial;
      if ("trialStartedAt" in s) state.trialStartedAt = s.trialStartedAt ?? null;
      if ("trialEndsAt" in s) state.trialEndsAt = s.trialEndsAt ?? null;
      if ("currentPeriodEnd" in s) state.currentPeriodEnd = s.currentPeriodEnd ?? null;
      if ("willRenew" in s) state.willRenew = s.willRenew ?? null;
    },
    setSubscriptionPlan: (state, action: PayloadAction<SubscriptionPlan>) => {
      state.subscriptionPlan = action.payload;
    },
    setFreeTrialDecision: (state, action: PayloadAction<FreeTrialDecision>) => {
      state.freeTrialDecision = action.payload;
    },
    setOnboardingCompletedAt: (
      state,
      action: PayloadAction<string | null | undefined>
    ) => {
      state.onboardingCompletedAt = action.payload;
    },
    resetProfile: () => initialState,
  },
});

export const {
  saveProfile,
  updateProfileFields,
  setSubscription,
  setSubscriptionPlan,
  setFreeTrialDecision,
  setOnboardingCompletedAt,
  resetProfile,
} = profileSlice.actions;

export default profileSlice.reducer;

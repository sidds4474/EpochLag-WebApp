import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type MediaStatus = {
  pendingUploads: Array<{ mediaId?: string; type?: string }>;
  mediaCount: number;
  lastCheckedAt: number | null;
};

export type AnonDraftState = {
  isLoading: boolean;
  error: string | null;

  // Server-side draft snapshot from GET /api/onboarding/anon/draft/get.
  // Kept intentionally loose — hydration writes into createALag slice.
  draft: unknown;

  mediaStatus: MediaStatus;

  // Boot flag. Router blocks on !hydrated.
  hydrated: boolean;

  // Presence of the encrypted draftToken in secureTokenStore. Router uses
  // this to decide whether to resume mid-flow.
  hasDraftToken: boolean;

  // Highest index reached in PHASE_A_SCREEN_INDEX (WhatsALag = 0). Persists
  // via localStore (monotonic). Null before hydration.
  lastStep: number | null;

  // Referral deep-link resolution.
  referralCode: string | null;
  referrerFirstName: string | null;
};

const initialState: AnonDraftState = {
  isLoading: false,
  error: null,
  draft: null,
  mediaStatus: { pendingUploads: [], mediaCount: 0, lastCheckedAt: null },
  hydrated: false,
  hasDraftToken: false,
  lastStep: null,
  referralCode: null,
  referrerFirstName: null,
};

const anonDraftSlice = createSlice({
  name: "anonDraft",
  initialState,
  reducers: {
    setAnonDraftLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setAnonDraftError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setServerDraft: (state, action: PayloadAction<unknown>) => {
      state.draft = action.payload;
    },
    setMediaStatus: (state, action: PayloadAction<MediaStatus>) => {
      state.mediaStatus = action.payload;
    },
    // Fired once by hydrateAnonDraft — even on failure (prevents infinite splash).
    markHydrated: (state) => {
      state.hydrated = true;
    },
    setHasDraftToken: (state, action: PayloadAction<boolean>) => {
      state.hasDraftToken = action.payload;
    },
    setLastStep: (state, action: PayloadAction<number>) => {
      // monotonic — never regress
      if (state.lastStep === null || action.payload > state.lastStep) {
        state.lastStep = action.payload;
      }
    },
    setReferralAttribution: (
      state,
      action: PayloadAction<{ code: string | null; referrerFirstName: string | null }>
    ) => {
      state.referralCode = action.payload.code;
      state.referrerFirstName = action.payload.referrerFirstName;
    },
    resetAnonDraft: () => ({
      ...initialState,
      hydrated: true, // preserve hydration flag after reset
    }),
  },
});

export const {
  setAnonDraftLoading,
  setAnonDraftError,
  setServerDraft,
  setMediaStatus,
  markHydrated,
  setHasDraftToken,
  setLastStep,
  setReferralAttribution,
  resetAnonDraft,
} = anonDraftSlice.actions;

export default anonDraftSlice.reducer;

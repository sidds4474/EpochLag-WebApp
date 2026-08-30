// Public surface for onboarding feature. Screens import from here.

export {
  makeStore,
  useAppDispatch,
  useAppSelector,
  type RootState,
  type AppDispatch,
  type OnboardingStore,
} from "./store";

export { hydrateAnonDraft } from "./store/hydrateAnonDraft";

export { OnboardingStoreProvider } from "./OnboardingStoreProvider";

// Secure token store (draftToken) — mobile SecureStore equivalent.
export {
  setDraftToken,
  getDraftToken,
  clearDraftToken,
} from "./storage/secureTokenStore";

// localStorage helpers.
export {
  getOrCreateAnonId,
  peekAnonId,
  setStoredReferralCode,
  getStoredReferralCode,
  clearStoredReferralCode,
  getStoredLastOnboardingStep,
  setStoredLastOnboardingStep,
  clearStoredLastOnboardingStep,
  clearAnonDraftLocalState,
} from "./storage/localStore";

// Routing.
export {
  PHASE_A_ORDER,
  PHASE_A_SCREEN_INDEX,
  PHASE_A_RESUMABLE_START_INDEX,
  ROUTE_URL,
  urlForScreen,
  resumableIndexOf,
  screenAtResumableIndex,
  type ScreenName,
} from "./routing/routes";
export {
  pickInitialRoute,
  pickInitialRouteFromState,
  type InitialRouteDecision,
  type PickInitialRouteInput,
} from "./routing/pickInitialRoute";
export { HydrationGate } from "./routing/HydrationGate";
export { OnboardingRouteGuard } from "./routing/OnboardingRouteGuard";

// Orchestrators (mounted at root by OnboardingStoreProvider; exported for
// tests / storybook).
export { AnonMergeOrchestrator } from "./orchestrators/AnonMergeOrchestrator";
export { LateMediaOrchestrator } from "./orchestrators/LateMediaOrchestrator";

// HTTP + Cloudinary.
export {
  http,
  request as httpRequest,
  setAuthTokenGetter,
  resolveAuthToken,
  OnboardingApiError,
  type RequestOptions,
} from "./api/httpClient";
export {
  uploadToCloudinary,
  type CloudinaryUploadParams,
  type CloudinaryUploadResponse,
  type UploadProgress,
  type CloudinaryUploadArgs,
} from "./api/cloudinary";

// Anon endpoint wrappers.
export {
  apiCreateAnonDraft,
  apiGetAnonDraft,
  apiSaveAnonDraft,
  apiGetMediaStatus,
  apiGetAnonUploadToken,
  apiMerge,
  apiMergeRetry,
  apiGetOnboardingStatus,
  type AnonServerDraft,
  type AnonServerMedia,
  type SaveAnonDraftPayload,
  type MediaStatusResponse,
  type UploadTokenRequest,
  type UploadTokenResponse,
  type MergeResponse,
  type OnboardingStatusResponse,
} from "./api/anonEndpoints";

// Authed endpoint wrappers.
export {
  apiCreateUserCard,
  apiCreateStory,
  apiGetAuthedUploadToken,
  apiSaveStory,
  apiPublishStory,
  apiMintPublicLink,
  buildPublicStoryUrl,
  type SaveStoryPayload,
} from "./api/authedEndpoints";

// Upload hooks (M4).
export {
  useAnonMediaUpload,
  type StartAnonUploadArgs,
} from "./upload/useAnonMediaUpload";
export {
  useAuthedMediaUpload,
  type StartAuthedUploadArgs,
} from "./upload/useAuthedMediaUpload";

// Merge orchestration.
export {
  runAnonMergeSync,
  type MergeSyncSource,
  type MergeSyncResult,
} from "./merge/runAnonMergeSync";
export {
  queueAnonMergeIfNeeded,
  type QueueAnonMergeResult,
} from "./merge/queueAnonMergeIfNeeded";
export { findUnaccountedMedia } from "./merge/mergeUtils";

// Upload pipeline.
export {
  UploadProvider,
  useUploads,
  useUploadStatus,
  useAnyUploading,
} from "./upload/UploadContext";
export { compressMedia, type CompressInput, type CompressResult } from "./upload/compress";
export {
  makeBlockId,
  categoryFromMediaId,
  mimeFromUri,
  extFromMime,
  collectCandidateMedia,
  getBlobSize,
  type MediaCategory,
} from "./upload/helpers";
export type {
  UploadItem,
  UploadStatus,
  EnqueueParams,
  UploadContextValue,
} from "./upload/types";

// Slice actions (re-export so screens don't reach into internal paths).
export * from "./store/slices/authSlice";
export * from "./store/slices/profileSlice";
export * from "./store/slices/anonDraftSlice";
export * from "./store/slices/createALagSlice";
export * from "./store/slices/pendingAnonMergeSlice";
export * from "./store/slices/lateMediaSlice";
export * from "./store/slices/pendingFriendRequestsSlice";

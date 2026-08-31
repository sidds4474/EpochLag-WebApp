// Typed wrappers for anon onboarding endpoints. All use auth: "draft"
// (X-Draft-Token header from IndexedDB) unless overridden with explicit
// draftToken (used by merge orchestrators reading token from Redux intent).

import { http } from "./httpClient";
import type { LagLocation } from "../store/slices/createALagSlice";

// ---- POST /api/onboarding/anon/draft — mint draftToken ----

type CreateDraftResponse = {
  draftToken?: string;
  status?: string;
  data?: { draftToken?: string; status?: string };
};

export async function apiCreateAnonDraft(): Promise<{
  draftToken: string;
  status?: string;
}> {
  const res = await http.post<CreateDraftResponse>(
    "/api/onboarding/anon/draft",
    {},
    { auth: "none" }
  );
  const draftToken = res.draftToken || res.data?.draftToken;
  if (!draftToken) throw new Error("BE did not return draftToken");
  return { draftToken, status: res.status || res.data?.status };
}

// ---- POST /api/onboarding/anon/draft/get — snapshot ----

export type AnonServerMedia = {
  _id?: string;
  type?: "image" | "video" | "audio";
  url?: string;
  thumbnailUrl?: string | null;
  providerPublicId?: string;
};

export type AnonServerDraft = {
  content?: string;
  media?: AnonServerMedia[];
  dateOfStory?: string | null;
  location?: LagLocation | null;
  taggedPeople?: Array<{
    name?: string;
    relationshipSlug?: string;
    userId?: string | null;
  }>;
};

type GetDraftEnvelope =
  | AnonServerDraft
  | { data?: AnonServerDraft; success?: boolean };

export async function apiGetAnonDraft(
  draftToken?: string
): Promise<AnonServerDraft> {
  const res = await http.post<GetDraftEnvelope>(
    "/api/onboarding/anon/draft/get",
    {},
    { auth: "draft", draftToken }
  );
  return (res && "data" in res && res.data ? res.data : res) as AnonServerDraft;
}

// ---- PUT /api/onboarding/anon/draft — save-on-pick ----

export type SaveAnonDraftPayload = {
  title?: string;
  content?: string;
  screensReached?: number;
  dateOfStory?: string | null;
  location?: LagLocation | null;
  exifResolved?: boolean;
  taggedPeople?: Array<{ name: string; relationshipSlug: string }>;
};

export async function apiSaveAnonDraft(
  payload: SaveAnonDraftPayload,
  draftToken?: string
): Promise<void> {
  await http.put(
    "/api/onboarding/anon/draft",
    payload,
    { auth: "draft", draftToken }
  );
}

// ---- POST /api/onboarding/anon/draft/media-status — poll ----

export type MediaStatusResponse = {
  pendingUploads: Array<{ mediaId?: string; type?: string }>;
  mediaCount: number;
};

type MediaStatusEnvelope =
  | MediaStatusResponse
  | { data?: MediaStatusResponse; success?: boolean };

export async function apiGetMediaStatus(
  draftToken?: string
): Promise<MediaStatusResponse> {
  const res = await http.post<MediaStatusEnvelope>(
    "/api/onboarding/anon/draft/media-status",
    {},
    { auth: "draft", draftToken }
  );
  if ("data" in res && res.data) return res.data;
  return res as MediaStatusResponse;
}

// ---- POST /api/onboarding/anon/upload-token ----

export type UploadTokenRequest = {
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type UploadTokenResponse = {
  uploadUrl: string;
  uploadParams: {
    api_key: string;
    timestamp: number | string;
    signature: string;
    folder?: string;
    public_id?: string;
    resource_type?: string;
    eager_async?: boolean | string;
    notification_url?: string;
    [key: string]: unknown;
  };
};

type UploadTokenEnvelope =
  | UploadTokenResponse
  | { data?: UploadTokenResponse; success?: boolean };

export async function apiGetAnonUploadToken(
  payload: UploadTokenRequest,
  draftToken?: string
): Promise<UploadTokenResponse> {
  const res = await http.post<UploadTokenEnvelope>(
    "/api/onboarding/anon/upload-token",
    payload,
    { auth: "draft", draftToken }
  );
  if ("data" in res && res.data) return res.data;
  return res as UploadTokenResponse;
}

// ---- POST /api/onboarding/merge (called by runAnonMergeSync + orchestrator) ----

export type MergeResponse = {
  storyId: string;
  threadId: string;
  mergeState?: "pending" | "done" | "failed";
};

type MergeEnvelope =
  | MergeResponse
  | { data?: MergeResponse; success?: boolean };

// The merge endpoint reads draftToken from the request body (per mobile
// parity — see spec §Section E). Header is also sent as a belt-and-braces
// signal in case BE prefers it.
export async function apiMerge(draftToken: string): Promise<MergeResponse> {
  const res = await http.post<MergeEnvelope>(
    "/api/onboarding/merge",
    { draftToken },
    { auth: "authed+draft", draftToken }
  );
  if ("data" in res && res.data) return res.data;
  return res as MergeResponse;
}

// ---- POST /api/onboarding/merge/retry ----

export async function apiMergeRetry(draftToken: string): Promise<MergeResponse> {
  const res = await http.post<MergeEnvelope>(
    "/api/onboarding/merge/retry",
    { draftToken },
    { auth: "authed+draft", draftToken }
  );
  if ("data" in res && res.data) return res.data;
  return res as MergeResponse;
}

// ---- GET /api/onboarding/status ----

export type OnboardingStatusResponse = {
  mergeState: "pending" | "done" | "failed";
  storyThreadId?: string | null;
  publicCode?: string | null;
};

type StatusEnvelope =
  | OnboardingStatusResponse
  | { data?: OnboardingStatusResponse; success?: boolean };

export async function apiGetOnboardingStatus(): Promise<OnboardingStatusResponse> {
  const res = await http.get<StatusEnvelope>("/api/onboarding/status");
  if ("data" in res && res.data) return res.data;
  return res as OnboardingStatusResponse;
}

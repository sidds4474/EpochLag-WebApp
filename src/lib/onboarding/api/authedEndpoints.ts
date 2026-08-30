// Typed wrappers for authed onboarding endpoints. Bearer token flows via
// httpClient's authTokenGetter (M8 wires this to Redux) or explicit token
// param during handoff windows.

import { http } from "./httpClient";
import type {
  UploadTokenRequest,
  UploadTokenResponse,
} from "./anonEndpoints";

// ---- POST /api/user-card — mint promptId (authed composer only) ----

type UserCardResponse = {
  data?: { _id: string };
  _id?: string;
};

export async function apiCreateUserCard(
  type: "WHITE" | "BLACK",
  token?: string
): Promise<{ promptId: string }> {
  const form = new FormData();
  form.append("type", type);
  const res = await http.post<UserCardResponse>("/api/user-card", form, {
    auth: "authed",
    token,
  });
  const promptId = res.data?._id || res._id;
  if (!promptId) throw new Error("BE did not return promptId");
  return { promptId };
}

// ---- POST /api/stories — mint storyId (authed composer only) ----

type CreateStoryResponse = {
  data?: { _id: string };
  _id?: string;
};

export async function apiCreateStory(
  args: {
    content?: string;
    title: string;
    promptId: string;
    status?: "draft" | "published";
  },
  token?: string
): Promise<{ storyId: string }> {
  const form = new FormData();
  form.append("content", args.content ?? "");
  form.append("title", args.title);
  form.append("promptId", args.promptId);
  form.append("status", args.status || "draft");
  const res = await http.post<CreateStoryResponse>("/api/stories", form, {
    auth: "authed",
    token,
  });
  const storyId = res.data?._id || res._id;
  if (!storyId) throw new Error("BE did not return storyId");
  return { storyId };
}

// ---- POST /api/stories/{storyId}/getUploadToken ----

type UploadTokenEnvelope =
  | UploadTokenResponse
  | { data?: UploadTokenResponse; success?: boolean };

export async function apiGetAuthedUploadToken(
  storyId: string,
  payload: UploadTokenRequest,
  token?: string
): Promise<UploadTokenResponse> {
  const res = await http.post<UploadTokenEnvelope>(
    `/api/stories/${encodeURIComponent(storyId)}/getUploadToken`,
    payload,
    { auth: "authed", token }
  );
  if ("data" in res && res.data) return res.data;
  return res as UploadTokenResponse;
}

// ---- PUT /api/stories/{storyId} — save date/location/participants ----

export type SaveStoryPayload = {
  content?: string;
  dateOfStory?: string | null;
  location?: {
    city?: string | null;
    country?: string | null;
    formattedAddress?: string | null;
    placeId?: string | null;
  } | null;
  taggedPeople?: Array<{ name: string; relationshipSlug: string }>;
};

export async function apiSaveStory(
  storyId: string,
  payload: SaveStoryPayload,
  token?: string
): Promise<void> {
  await http.put(
    `/api/stories/${encodeURIComponent(storyId)}`,
    payload,
    { auth: "authed", token }
  );
}

// ---- PUT /api/stories/{storyId}/publish ----

type PublishResponse = {
  data?: { storyId?: string; threadId?: string };
  storyId?: string;
  threadId?: string;
};

export async function apiPublishStory(
  storyId: string,
  token?: string
): Promise<{ storyId: string; threadId: string }> {
  const res = await http.put<PublishResponse>(
    `/api/stories/${encodeURIComponent(storyId)}/publish`,
    {},
    { auth: "authed", token }
  );
  const outStoryId = res.data?.storyId || res.storyId || storyId;
  const threadId = res.data?.threadId || res.threadId;
  if (!threadId) throw new Error("BE did not return threadId on publish");
  return { storyId: outStoryId, threadId };
}

// ---- POST /api/stories/thread/{threadId}/public-link ----

type PublicLinkResponse = {
  data?: { publicCode?: string };
  publicCode?: string;
};

export async function apiMintPublicLink(
  threadId: string,
  token?: string
): Promise<{ publicCode: string }> {
  const res = await http.post<PublicLinkResponse>(
    `/api/stories/thread/${encodeURIComponent(threadId)}/public-link`,
    {},
    { auth: "authed", token }
  );
  const publicCode = res.data?.publicCode || res.publicCode;
  if (!publicCode) throw new Error("BE did not return publicCode");
  return { publicCode };
}

// URL builder — kept here so callers don't hard-code the base.
const STORY_URL_BASE =
  process.env.NEXT_PUBLIC_PUBLIC_STORY_BASE || "https://www.epochlag.com/story";

export function buildPublicStoryUrl(publicCode: string): string {
  return `${STORY_URL_BASE}/${publicCode}`;
}

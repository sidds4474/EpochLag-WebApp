import { api } from "../api/client";

// Multipart quirk: BE requires tags as JSON.stringify([""]) — an array
// containing an empty string, then stringified. `[]` or `""` will fail.
const TAGS_DEFAULT = JSON.stringify([""]);

type Envelope<T> = { success: boolean; message?: string; data: T };

export type UserCardType = "WHITE";

export type CreatedUserCard = {
  _id: string;
  content?: string;
  type?: string;
};

export type CreatedStory = {
  _id: string;
  title?: string;
  content?: string;
  status?: string;
};

export type PublishedStory = {
  _id?: string;
  storyThread?: string;
};

export async function createUserCard(input: {
  content: string;
  type: UserCardType;
  file?: File | null;
  imageUrl?: string;
}): Promise<CreatedUserCard> {
  const fd = new FormData();
  fd.append("content", input.content);
  fd.append("tags", TAGS_DEFAULT);
  fd.append("type", input.type);
  if (input.file) fd.append("file", input.file);
  if (input.imageUrl) fd.append("imageUrl", input.imageUrl);

  const res = await api.post<Envelope<CreatedUserCard>>("/api/user-card", fd);
  return res.data;
}

// /api/stories is text-only on the current BE. Cover images live on the
// user-card (POST /api/user-card with `file`, or PUT /api/user-card/:id).
// Passing any file field here returns 400 "Unexpected field".
export async function createStory(input: {
  title: string;
  content: string;
  status: "draft" | "published";
  promptId: string;
  // When present, BE appends the new story into the existing thread's
  // stories[] instead of spinning up a new thread. Critical for the
  // "Add more to this Story" flow.
  threadId?: string;
}): Promise<CreatedStory> {
  const fd = new FormData();
  fd.append("title", input.title);
  fd.append("content", input.content);
  fd.append("status", input.status);
  fd.append("promptId", input.promptId);
  if (input.threadId) fd.append("threadId", input.threadId);

  const res = await api.post<Envelope<CreatedStory>>("/api/stories", fd);
  return res.data;
}

// BE Joi schema for /publish rejects unknown fields (returns 422
// "isPrivate not allowed"). Privacy is set via /privacy AFTER publish.
export async function publishStory(
  storyId: string,
  input: { shareWith: string[]; sendSeparately: boolean }
): Promise<PublishedStory> {
  const res = await api.put<Envelope<PublishedStory>>(
    `/api/stories/${storyId}/publish`,
    input
  );
  return res.data;
}

// BE quirk: the same endpoint handles both "delete story" (called by author)
// and "remove me from thread" (called by recipient). BE branches on who's
// calling. See ManageStoryParticipantsModal.js:292 in the mobile app.
export async function deleteStory(storyId: string): Promise<void> {
  await api.put<Envelope<unknown>>(`/api/stories/${storyId}/delete`, {});
}

// Removes a single media entry from a story by its position in the media
// array. BE only accepts this on draft stories — the caller downgrades the
// story to draft first if it's currently published. Removals must be sent
// in DESCENDING index order sequentially: BE bumps __v on every media
// mutation so parallel fanout hits optimistic-concurrency conflicts, and
// ascending would shift the remaining indices under the caller's feet.
export async function deleteStoryMedia(
  storyId: string,
  index: number
): Promise<void> {
  await api.delete<Envelope<unknown>>(
    `/api/stories/${storyId}/media/${index}`
  );
}

export async function setThreadPrivacy(
  threadId: string,
  input: { isPrivate: boolean }
): Promise<void> {
  await api.put<Envelope<unknown>>(
    `/api/stories/thread/${threadId}/privacy`,
    input
  );
}

export async function removeThreadParticipant(
  threadId: string,
  userId: string
): Promise<void> {
  await api.delete<Envelope<unknown>>(
    `/api/stories/thread/${threadId}/participant/${userId}`
  );
}

// BE quirk: this endpoint expects `userIds` (not `shareWith`) — intentional
// asymmetry with shareUserCard, preserved from mobile V4.
export async function shareStory(
  storyId: string,
  input: {
    userIds: string[];
    groupIds: string[];
    sendSeparately: boolean;
  }
): Promise<void> {
  await api.post<Envelope<unknown>>(
    `/api/stories/${storyId}/share`,
    input
  );
}

export async function shareUserCard(
  promptId: string,
  input: {
    shareWith: string[];
    groupIds: string[];
    sendSeparately: boolean;
    note: string;
  }
): Promise<void> {
  await api.post<Envelope<unknown>>(
    `/api/user-card/${promptId}/share`,
    input
  );
}

export type UploadToken = {
  uploadUrl: string;
  uploadParams: Record<string, string>;
};

export async function getUploadToken(
  storyId: string,
  input: { fileName: string; fileSize: number; mimeType: string }
): Promise<UploadToken> {
  const res = await api.post<Envelope<UploadToken>>(
    `/api/stories/${storyId}/getUploadToken`,
    input
  );
  return res.data;
}

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id?: string;
  resource_type?: string;
};

// Direct browser → Cloudinary upload. No Authorization header — the signed
// uploadParams from getUploadToken authenticate the request.
export async function uploadToCloudinary(
  token: UploadToken,
  file: File
): Promise<CloudinaryUploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  for (const [key, value] of Object.entries(token.uploadParams)) {
    fd.append(key, value);
  }
  const res = await fetch(token.uploadUrl, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Cloudinary upload failed (${res.status}): ${text || res.statusText}`
    );
  }
  return (await res.json()) as CloudinaryUploadResponse;
}

export type UploadHandle = {
  promise: Promise<CloudinaryUploadResponse>;
  abort: () => void;
};

// XHR-based Cloudinary upload with progress events + abort support.
// fetch() cannot report upload progress, so we drop to XHR here.
export function uploadToCloudinaryWithProgress(
  token: UploadToken,
  file: File,
  onProgress: (fraction: number) => void
): UploadHandle {
  const xhr = new XMLHttpRequest();
  const fd = new FormData();
  fd.append("file", file);
  for (const [key, value] of Object.entries(token.uploadParams)) {
    fd.append(key, value);
  }

  const promise = new Promise<CloudinaryUploadResponse>((resolve, reject) => {
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResponse);
        } catch {
          reject(new Error("Cloudinary returned invalid JSON"));
        }
      } else {
        reject(
          new Error(
            `Cloudinary upload failed (${xhr.status}): ${
              xhr.responseText || xhr.statusText
            }`
          )
        );
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.open("POST", token.uploadUrl);
    xhr.send(fd);
  });

  return { promise, abort: () => xhr.abort() };
}

// Attach cover image (or update other fields) on an existing user-card.
// Multipart because it may carry a file. Web equivalent of mobile V4's
// two-step "create user-card empty, then PUT cover".
export async function updateUserCard(
  promptId: string,
  input: { file?: File | null; imageUrl?: string; content?: string }
): Promise<CreatedUserCard> {
  const fd = new FormData();
  if (input.file) fd.append("file", input.file);
  if (input.imageUrl) fd.append("imageUrl", input.imageUrl);
  if (input.content !== undefined) fd.append("content", input.content);
  const res = await api.put<Envelope<CreatedUserCard>>(
    `/api/user-card/${promptId}`,
    fd
  );
  return res.data;
}

// Curated gradient cover thumbnails for the Choose Cover picker. Same
// endpoint is reused for the Moments-cover picker per product spec. Falls
// through to empty on failure so the modal still renders the Upload slot.
export type GradientCover = {
  _id?: string;
  id?: string;
  url?: string | null;
  imageUrl?: string | null;
  type?: string;
};

export async function fetchCardGradients(): Promise<GradientCover[]> {
  try {
    const res = await api.get<Envelope<GradientCover[]>>(
      "/api/cards/gradients"
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function updateStory(
  storyId: string,
  input: {
    title?: string;
    content?: string;
    status?: "draft" | "published";
    dateOfStory?: string;
    location?:
      | { formattedAddress: string; placeId: string; city: string }
      | null;
    music?:
      | {
          trackName: string;
          artistName: string;
          previewUrl: string;
          artworkUrl: string;
        }
      | null;
  }
): Promise<CreatedStory> {
  const res = await api.put<Envelope<CreatedStory>>(
    `/api/stories/${storyId}`,
    input
  );
  return res.data;
}

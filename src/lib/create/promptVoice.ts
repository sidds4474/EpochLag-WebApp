// Voice-prompt upload pipeline — mirrors the mobile
// `uploadPromptVoiceWithRetry` flow verbatim. Three steps:
//   1. Hit `/api/user-card/voice/upload-params` to get a signed Cloudinary
//      upload URL + the voice-specific publicId.
//   2. POST the audio blob directly to Cloudinary multipart.
//   3. Return the publicId for the caller to attach to the final
//      user-card POST (as `voicePublicId`).
//
// Prompts use a voice-specific endpoint (not the generic story media
// pipeline) because the publicId is a REQUIRED field on the user-card
// POST — BE verifies the audio exists on Cloudinary before accepting
// the user-card creation. Different validation path than generic media.

import { api } from "../api/client";

export class PromptVoiceUploadError extends Error {
  code: string | null;
  status: number | null;
  constructor(
    message: string,
    opts: { code?: string | null; status?: number | null } = {},
  ) {
    super(message);
    this.name = "PromptVoiceUploadError";
    this.code = opts.code ?? null;
    this.status = opts.status ?? null;
  }
}

type VoiceUploadParams = {
  uploadUrl: string;
  cloudinaryParams: Record<string, string | number | null | undefined>;
  publicId: string;
};

type Envelope<T> = { data: T };

function extFromMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("aac")) return "aac";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}

async function fetchVoiceUploadParams(input: {
  fileName: string;
  mimeType: string;
  fileSize: number;
}): Promise<VoiceUploadParams> {
  try {
    const res = await api.post<Envelope<VoiceUploadParams>>(
      "/api/user-card/voice/upload-params",
      {
        fileName: input.fileName,
        mimeType: input.mimeType,
        ...(input.fileSize > 0 ? { fileSize: input.fileSize } : {}),
      },
    );
    const data = res.data;
    if (!data?.uploadUrl || !data?.cloudinaryParams || !data?.publicId) {
      throw new PromptVoiceUploadError("Malformed upload-params response", {
        code: "VOICE_INVALID",
      });
    }
    return data;
  } catch (err) {
    if (err instanceof PromptVoiceUploadError) throw err;
    const e = err as { status?: number; code?: string; message?: string };
    throw new PromptVoiceUploadError(e?.message ?? "upload-params failed", {
      code: e?.code ?? null,
      status: e?.status ?? null,
    });
  }
}

async function uploadBlobToCloudinary(input: {
  uploadUrl: string;
  cloudinaryParams: VoiceUploadParams["cloudinaryParams"];
  blob: Blob;
  mimeType: string;
}): Promise<void> {
  const form = new FormData();
  // Append every signed param verbatim — don't drop, don't rename.
  // Cloudinary's signature check is strict.
  for (const [k, v] of Object.entries(input.cloudinaryParams)) {
    if (v != null) form.append(k, String(v));
  }
  // File goes LAST per Cloudinary convention.
  form.append(
    "file",
    input.blob,
    `voice.${extFromMime(input.mimeType)}`,
  );

  const res = await fetch(input.uploadUrl, {
    method: "POST",
    body: form,
    // NO Authorization header — Cloudinary rejects it.
    // NO Content-Type — browser sets the multipart boundary.
  });

  if (!res.ok) {
    throw new PromptVoiceUploadError(
      `Cloudinary upload failed (${res.status})`,
      { code: "VOICE_NOT_FOUND", status: res.status },
    );
  }
}

async function uploadOnce(input: {
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSize: number;
}): Promise<string> {
  const params = await fetchVoiceUploadParams(input);
  await uploadBlobToCloudinary({
    uploadUrl: params.uploadUrl,
    cloudinaryParams: params.cloudinaryParams,
    blob: input.blob,
    mimeType: input.mimeType,
  });
  return params.publicId;
}

/**
 * Upload a voice prompt blob to Cloudinary, retrying once silently on
 * `VOICE_VERIFY_FAILED` (503 — Cloudinary reachability flake). Returns
 * the publicId; the caller attaches it to `createUserCard`.
 */
export async function uploadPromptVoiceWithRetry(input: {
  blob: Blob;
  duration: number;
}): Promise<string> {
  const mimeType = input.blob.type || "audio/webm";
  if (!mimeType.startsWith("audio/")) {
    throw new PromptVoiceUploadError("mimeType must be audio/*", {
      code: "VOICE_NOT_AUDIO",
    });
  }
  const fileName = `voice-${Date.now()}.${extFromMime(mimeType)}`;
  const fileSize = input.blob.size;

  try {
    return await uploadOnce({ blob: input.blob, fileName, mimeType, fileSize });
  } catch (err) {
    const e = err as PromptVoiceUploadError;
    if (e?.code === "VOICE_VERIFY_FAILED" || e?.status === 503) {
      await new Promise((r) => setTimeout(r, 400));
      return await uploadOnce({
        blob: input.blob,
        fileName,
        mimeType,
        fileSize,
      });
    }
    throw err;
  }
}

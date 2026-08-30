// Upload pipeline helpers. Pure functions — safe to import anywhere.

import type { CreateALagState } from "../store/slices/createALagSlice";
import type { CandidateMediaItem } from "../store/slices/pendingAnonMergeSlice";

export type MediaCategory = "cover" | "video" | "image" | "audio";

// Filename convention is the ONLY signal BE has for role — upload-token
// endpoints don't accept a role field. Cover / body-image / body-video /
// body-audio are distinguished by the mediaId prefix.
//
// makeBlockId("cover") → "cover_a3f9k2p1"
export function makeBlockId(category: MediaCategory): string {
  const shortId = Math.random().toString(36).slice(2, 10);
  return `${category}_${shortId}`;
}

// Reverse — category from mediaId prefix.
export function categoryFromMediaId(mediaId: string): MediaCategory | null {
  const [prefix] = mediaId.split("_");
  if (
    prefix === "cover" ||
    prefix === "video" ||
    prefix === "image" ||
    prefix === "audio"
  ) {
    return prefix;
  }
  return null;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  ogg: "audio/ogg",
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
};

// Best-effort mime from URI (file path or object URL with hint). Object
// URLs (blob://…) have no extension — caller should pass mimeType from the
// original File instead.
export function mimeFromUri(uri: string): string | null {
  const cleaned = uri.split("?")[0].split("#")[0];
  const ext = cleaned.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return MIME_BY_EXT[ext] || null;
}

// Extension for filename from mime — used to name Cloudinary uploads.
export function extFromMime(mimeType: string): string {
  return EXT_BY_MIME[mimeType.toLowerCase()] || "bin";
}

// Snapshot helper — collects every media entry currently in createALag
// slice into the CandidateMediaItem shape used for merge orchestration.
// MUST run BEFORE resetCreateALag() (which fires on ShareLag Next).
export function collectCandidateMedia(
  createALag: CreateALagState
): CandidateMediaItem[] {
  const items: CandidateMediaItem[] = [];

  if (createALag.coverUri && createALag.coverMediaId) {
    items.push({
      mediaId: createALag.coverMediaId,
      sourceUri: createALag.coverUri,
      mimeType: mimeFromUri(createALag.coverUri) || "image/jpeg",
      category: "cover",
    });
  }

  for (const v of createALag.videos) {
    items.push({
      mediaId: v.mediaId,
      sourceUri: v.uri,
      mimeType: mimeFromUri(v.uri) || "video/mp4",
      category: "video",
    });
  }

  for (const i of createALag.extraImages) {
    items.push({
      mediaId: i.mediaId,
      sourceUri: i.uri,
      mimeType: mimeFromUri(i.uri) || "image/jpeg",
      category: "image",
    });
  }

  for (const a of createALag.audios) {
    items.push({
      mediaId: a.mediaId,
      sourceUri: a.uri,
      mimeType: mimeFromUri(a.uri) || "audio/mp4",
      category: "audio",
    });
  }

  return items;
}

// Size of a Blob / File — trivial but centralized so tests can mock.
export function getBlobSize(blob: Blob): number {
  return blob.size;
}

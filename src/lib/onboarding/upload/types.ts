// Shared upload types. Kept in a separate module so hooks/context/orchestrator
// can share references without circular imports.

import type { MediaCategory } from "./helpers";
import type { CloudinaryUploadParams } from "../api/cloudinary";

export type UploadStatus =
  | "queued"
  | "compressing"
  | "uploading"
  | "done"
  | "error"
  | "cancelled";

export type UploadItem = {
  mediaId: string;
  category: MediaCategory;
  status: UploadStatus;
  progress: number; // 0-100
  originalSize: number;
  compressedSize: number;
  error?: string;
};

export type EnqueueParams = {
  // Either pass a mediaId (caller pre-generated it for instant UI) OR let
  // the queue mint one.
  mediaId?: string;
  category: MediaCategory;
  file: Blob;
  mimeType: string;
  // Cloudinary upload target. The queue does not mint tokens itself — the
  // caller (useAnonMediaUpload / useAuthedMediaUpload in M4) does.
  uploadUrl: string;
  uploadParams: CloudinaryUploadParams;
  // Optional: called with the Cloudinary response on success.
  onDone?: (response: unknown) => void;
  // Optional: called on final failure.
  onError?: (error: Error) => void;
};

export type UploadContextValue = {
  items: Record<string, UploadItem>;
  enqueue: (params: EnqueueParams) => Promise<string>;
  cancel: (mediaId: string) => void;
  clear: (mediaId: string) => void;
};

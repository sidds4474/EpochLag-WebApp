"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { uploadToCloudinary } from "../api/cloudinary";
import { compressMedia } from "./compress";
import { makeBlockId } from "./helpers";
import type {
  EnqueueParams,
  UploadContextValue,
  UploadItem,
  UploadStatus,
} from "./types";

// UploadContext orchestrates the compress → upload lifecycle for one media
// item at a time (per mediaId, not serialized globally — multiple items can
// upload in parallel).
//
// Callers:
//   • useAnonMediaUpload / useAuthedMediaUpload (M4) mint a token, then call
//     enqueue({...}) with the pre-signed uploadUrl + uploadParams.
//   • Composer components read status via useUploadStatus(mediaId).
//   • LagPreview waits for pendingUploads → 0 before enabling Next.

// ---- reducer ----

type State = { items: Record<string, UploadItem> };

type Action =
  | { type: "seed"; item: UploadItem }
  | {
      type: "patch";
      mediaId: string;
      changes: Partial<UploadItem>;
    }
  | { type: "clear"; mediaId: string };

const initialState: State = { items: {} };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "seed":
      return {
        ...state,
        items: { ...state.items, [action.item.mediaId]: action.item },
      };
    case "patch": {
      const existing = state.items[action.mediaId];
      if (!existing) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.mediaId]: { ...existing, ...action.changes },
        },
      };
    }
    case "clear": {
      if (!state.items[action.mediaId]) return state;
      const next = { ...state.items };
      delete next[action.mediaId];
      return { ...state, items: next };
    }
    default:
      return state;
  }
}

// ---- context ----

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Per-mediaId abort controllers so cancel() can tear down in-flight XHR.
  const controllersRef = useRef<Record<string, AbortController>>({});

  const patch = useCallback(
    (mediaId: string, changes: Partial<UploadItem>) =>
      dispatch({ type: "patch", mediaId, changes }),
    []
  );

  const enqueue = useCallback(
    async (params: EnqueueParams): Promise<string> => {
      const mediaId = params.mediaId || makeBlockId(params.category);

      const seed: UploadItem = {
        mediaId,
        category: params.category,
        status: "queued",
        progress: 0,
        originalSize: params.file.size,
        compressedSize: params.file.size,
      };
      dispatch({ type: "seed", item: seed });

      const controller = new AbortController();
      controllersRef.current[mediaId] = controller;

      // Kick off the async pipeline. Errors flow through onError.
      (async () => {
        try {
          // Compression.
          patch(mediaId, { status: "compressing" as UploadStatus });
          const compressed = await compressMedia({
            file: params.file,
            mimeType: params.mimeType,
            category: params.category,
          });
          patch(mediaId, {
            compressedSize: compressed.compressedSize,
          });

          if (controller.signal.aborted) {
            patch(mediaId, { status: "cancelled" });
            return;
          }

          // Upload.
          patch(mediaId, { status: "uploading" as UploadStatus, progress: 0 });
          const response = await uploadToCloudinary({
            uploadUrl: params.uploadUrl,
            uploadParams: params.uploadParams,
            file: compressed.blob,
            signal: controller.signal,
            onProgress: (p) => patch(mediaId, { progress: p.percent }),
          });

          patch(mediaId, { status: "done", progress: 100 });
          params.onDone?.(response);
        } catch (err) {
          const e = err as { name?: string; message?: string };
          if (e?.name === "AbortError") {
            patch(mediaId, { status: "cancelled" });
            return;
          }
          const message = e?.message || "Upload failed";
          patch(mediaId, { status: "error", error: message });
          params.onError?.(new Error(message));
        } finally {
          delete controllersRef.current[mediaId];
        }
      })();

      return mediaId;
    },
    [patch]
  );

  const cancel = useCallback((mediaId: string) => {
    controllersRef.current[mediaId]?.abort();
  }, []);

  const clear = useCallback((mediaId: string) => {
    dispatch({ type: "clear", mediaId });
  }, []);

  const value = useMemo<UploadContextValue>(
    () => ({ items: state.items, enqueue, cancel, clear }),
    [state.items, enqueue, cancel, clear]
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUploads(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUploads must be used inside UploadProvider");
  return ctx;
}

// Per-item status hook. Returns a stable object when the mediaId is unknown
// so consumers can render "unknown / 0%" without null checks.
const UNKNOWN: UploadItem = {
  mediaId: "",
  category: "image",
  status: "queued",
  progress: 0,
  originalSize: 0,
  compressedSize: 0,
};

export function useUploadStatus(mediaId: string | null | undefined): UploadItem {
  const ctx = useContext(UploadContext);
  if (!ctx || !mediaId) return UNKNOWN;
  return ctx.items[mediaId] || UNKNOWN;
}

// Aggregate — used by LagPreview's "pendingUploads" gate.
export function useAnyUploading(): boolean {
  const ctx = useContext(UploadContext);
  if (!ctx) return false;
  for (const item of Object.values(ctx.items)) {
    if (
      item.status === "queued" ||
      item.status === "compressing" ||
      item.status === "uploading"
    ) {
      return true;
    }
  }
  return false;
}

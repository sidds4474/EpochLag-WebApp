import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type LateMediaStatus =
  | "compressing"
  | "ready"
  | "uploading"
  | "done"
  | "failed";

export type LateMediaItem = {
  status: LateMediaStatus;
  compressedUri?: string;
  compressedSize?: number;
  sourceUri?: string;
  mimeType: string;
  category: "cover" | "video" | "image" | "audio";
  error?: string;
  attempts?: number;
};

export type LateMediaState = {
  items: Record<string, LateMediaItem>; // keyed by mediaId
};

const initialState: LateMediaState = {
  items: {},
};

const lateMediaSlice = createSlice({
  name: "lateMedia",
  initialState,
  reducers: {
    seedLateMedia: (
      state,
      action: PayloadAction<
        Array<{
          mediaId: string;
          sourceUri: string;
          mimeType: string;
          category: LateMediaItem["category"];
          phase?: LateMediaStatus;
        }>
      >
    ) => {
      for (const item of action.payload) {
        state.items[item.mediaId] = {
          status: item.phase || "compressing",
          sourceUri: item.sourceUri,
          mimeType: item.mimeType,
          category: item.category,
          attempts: 0,
        };
      }
    },
    markItemReady: (
      state,
      action: PayloadAction<{
        mediaId: string;
        compressedUri: string;
        compressedSize: number;
        mimeType?: string;
        category?: LateMediaItem["category"];
      }>
    ) => {
      const existing = state.items[action.payload.mediaId] || ({} as LateMediaItem);
      state.items[action.payload.mediaId] = {
        ...existing,
        status: "ready",
        compressedUri: action.payload.compressedUri,
        compressedSize: action.payload.compressedSize,
        mimeType: action.payload.mimeType || existing.mimeType || "application/octet-stream",
        category: action.payload.category || existing.category || "image",
        attempts: existing.attempts || 0,
      };
    },
    markItemUploading: (state, action: PayloadAction<string>) => {
      const item = state.items[action.payload];
      if (!item) return;
      item.status = "uploading";
      item.attempts = (item.attempts || 0) + 1;
    },
    markItemDone: (state, action: PayloadAction<string>) => {
      const item = state.items[action.payload];
      if (!item) return;
      item.status = "done";
    },
    markItemFailed: (
      state,
      action: PayloadAction<{ mediaId: string; error: string }>
    ) => {
      const item = state.items[action.payload.mediaId];
      if (!item) return;
      item.status = "failed";
      item.error = action.payload.error;
    },
    // Reset a failed item back to "ready" so the orchestrator's next tick
    // picks it up. `attempts` is preserved so the backoff schedule advances.
    markItemForRetry: (state, action: PayloadAction<string>) => {
      const item = state.items[action.payload];
      if (!item) return;
      item.status = "ready";
      item.error = undefined;
    },
    removeLateMediaItem: (state, action: PayloadAction<string>) => {
      delete state.items[action.payload];
    },
    resetLateMedia: () => initialState,
  },
});

export const {
  seedLateMedia,
  markItemReady,
  markItemUploading,
  markItemDone,
  markItemFailed,
  markItemForRetry,
  removeLateMediaItem,
  resetLateMedia,
} = lateMediaSlice.actions;

export default lateMediaSlice.reducer;

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type CandidateMediaItem = {
  mediaId: string;
  sourceUri: string;
  mimeType: string;
  category: "cover" | "video" | "image" | "audio";
};

export type PendingAnonMergeStatus =
  | "idle"
  | "waiting"
  | "merging"
  | "done"
  | "failed";

export type PendingAnonMergeState = {
  status: PendingAnonMergeStatus;
  intent: {
    draftToken: string;
    candidateMedia: CandidateMediaItem[];
    source: string;
  } | null;
  result: {
    storyId: string;
    threadId: string;
  } | null;
  error: string | null;
};

const initialState: PendingAnonMergeState = {
  status: "idle",
  intent: null,
  result: null,
  error: null,
};

const pendingAnonMergeSlice = createSlice({
  name: "pendingAnonMerge",
  initialState,
  reducers: {
    queueAnonMerge: (
      state,
      action: PayloadAction<{
        draftToken: string;
        candidateMedia: CandidateMediaItem[];
        source: string;
      }>
    ) => {
      state.status = "waiting";
      state.intent = action.payload;
      state.error = null;
    },
    markMerging: (state) => {
      state.status = "merging";
    },
    markMergeDone: (
      state,
      action: PayloadAction<{ storyId: string; threadId: string }>
    ) => {
      state.status = "done";
      state.result = action.payload;
      state.error = null;
    },
    markMergeFailed: (state, action: PayloadAction<{ error: string }>) => {
      state.status = "failed";
      state.error = action.payload.error;
    },
    resetPendingAnonMerge: () => initialState,
  },
});

export const {
  queueAnonMerge,
  markMerging,
  markMergeDone,
  markMergeFailed,
  resetPendingAnonMerge,
} = pendingAnonMergeSlice.actions;

export default pendingAnonMergeSlice.reducer;

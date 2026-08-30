import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";

import auth from "./slices/authSlice";
import profile from "./slices/profileSlice";
import anonDraft from "./slices/anonDraftSlice";
import createALag from "./slices/createALagSlice";
import pendingAnonMerge from "./slices/pendingAnonMergeSlice";
import lateMedia from "./slices/lateMediaSlice";
import pendingFriendRequests from "./slices/pendingFriendRequestsSlice";

import {
  writePersistedPendingAnonMerge,
  clearPersistedPendingAnonMerge,
} from "../storage/localStore";

// Persistence middleware — mirrors mobile behavior:
//  • pendingAnonMergeSlice is durable across browser restarts so the deferred
//    merge orchestrator can pick up on next boot.
//  • Wipe on logout so stale intent doesn't haunt the next signed-in session.
const persistPendingAnonMerge: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  const typed = action as { type?: string };

  // Persist any pendingAnonMerge/* action, or clear on setAuthenticated(false).
  if (typed.type?.startsWith("pendingAnonMerge/")) {
    const state = storeApi.getState() as { pendingAnonMerge: unknown };
    if (typed.type === "pendingAnonMerge/resetPendingAnonMerge") {
      clearPersistedPendingAnonMerge();
    } else {
      writePersistedPendingAnonMerge(state.pendingAnonMerge);
    }
  }

  // Clear persisted merge intent when auth resets (logout).
  if (typed.type === "auth/resetAuth") {
    clearPersistedPendingAnonMerge();
  }

  return result;
};

export function makeStore() {
  return configureStore({
    reducer: {
      auth,
      profile,
      anonDraft,
      createALag,
      pendingAnonMerge,
      lateMedia,
      pendingFriendRequests,
    },
    middleware: (getDefault) =>
      getDefault({
        // Redux Toolkit warns on non-serializable payloads. During M3-M4 we
        // will pass File/Blob refs through actions in dev-only paths; keep
        // the check on for now and tighten later if it becomes noisy.
        serializableCheck: {
          // Ignore paths that legitimately hold non-serializable data.
          ignoredActionPaths: ["payload.file", "payload.blob"],
          ignoredPaths: ["createALag.videos", "createALag.extraImages", "createALag.audios"],
        },
      }).concat(persistPendingAnonMerge),
  });
}

export type OnboardingStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<OnboardingStore["getState"]>;
export type AppDispatch = OnboardingStore["dispatch"];

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// queueAnonMergeIfNeeded — deferred-path entry.
//
// Called on every auth screen success (Part 3 §Section F):
//   • LoginScreen (returning user)
//   • VerifyOtpScreen (as fallback if runAnonMergeSync returned null)
//   • CreateAccountScreen (as fallback)
//
// Reads draftToken from secure storage. If present, seeds
// pendingAnonMergeSlice.intent so AnonMergeOrchestrator can fire once
// isAuthenticated flips true.

import type { AppDispatch, RootState } from "../store";
import { queueAnonMerge } from "../store/slices/pendingAnonMergeSlice";
import { getDraftToken } from "../storage/secureTokenStore";
import { collectCandidateMedia } from "../upload/helpers";

export type QueueAnonMergeResult = {
  queued: boolean;
  reason?: "no-draft";
  candidateCount?: number;
};

export function queueAnonMergeIfNeeded({ source }: { source: string }) {
  return async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<QueueAnonMergeResult> => {
    const draftToken = await getDraftToken();
    if (!draftToken) return { queued: false, reason: "no-draft" };

    const candidateMedia = collectCandidateMedia(getState().createALag);
    dispatch(queueAnonMerge({ draftToken, candidateMedia, source }));
    return { queued: true, candidateCount: candidateMedia.length };
  };
}

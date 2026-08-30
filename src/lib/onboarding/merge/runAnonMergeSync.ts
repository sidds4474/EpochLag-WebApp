// runAnonMergeSync — THE CRITICAL PATH.
//
// Fires during VerifyOtp / CreateAccount / social-signup success handlers.
// Converts the anon draft into a real authed story synchronously so ShareLag
// can render a real URL on first paint (no polling).
//
// Contract (Part 3 §Section E):
//   1. Read draftToken from secure storage
//   2. Snapshot candidateMedia BEFORE ShareLag resets createALag
//   3. queueAnonMerge + markMerging
//   4. POST /api/onboarding/merge
//   5. Diff candidateMedia vs attached, seed lateMedia for stragglers
//   6. Mint public link
//   7. Housekeeping (clear anon local state)
//
// Returns { storyId, threadId, publicCode, seededLateCount } on success.
// Returns null on failure — caller falls back to queueAnonMergeIfNeeded
// (deferred orchestrator).

import type { AppDispatch, RootState } from "../store";
import {
  markMergeDone,
  markMergeFailed,
  markMerging,
  queueAnonMerge,
} from "../store/slices/pendingAnonMergeSlice";
import { seedLateMedia } from "../store/slices/lateMediaSlice";
import { getDraftToken } from "../storage/secureTokenStore";
import { clearAnonDraftLocalState } from "../storage/localStore";
import {
  apiGetAnonDraft,
  apiMerge,
  type AnonServerMedia,
} from "../api/anonEndpoints";
import { apiMintPublicLink } from "../api/authedEndpoints";
import { collectCandidateMedia } from "../upload/helpers";
import { findUnaccountedMedia } from "./mergeUtils";

export type MergeSyncSource = "phone" | "email" | "google" | "apple";

export type MergeSyncResult = {
  storyId: string;
  threadId: string;
  publicCode: string | null;
  seededLateCount: number;
} | null;

export function runAnonMergeSync({ source }: { source: MergeSyncSource }) {
  return async (
    dispatch: AppDispatch,
    getState: () => RootState
  ): Promise<MergeSyncResult> => {
    // 1. Read draftToken.
    const draftToken = await getDraftToken();
    if (!draftToken) return null;

    // 2. Snapshot candidateMedia BEFORE anything mutates createALag.
    const candidateMedia = collectCandidateMedia(getState().createALag);

    // 3. Signal intent + move to merging.
    dispatch(queueAnonMerge({ draftToken, candidateMedia, source }));
    dispatch(markMerging());

    try {
      // 4. Merge.
      const mergeRes = await apiMerge(draftToken);
      const { storyId, threadId } = mergeRes;
      dispatch(markMergeDone({ storyId, threadId }));

      // 5. Late-media diff. Non-fatal — the deferred orchestrator will not
      //    fire for these because merge already succeeded. Best-effort.
      let seededLateCount = 0;
      try {
        const attachedDraft = await apiGetAnonDraft(draftToken);
        const attached: AnonServerMedia[] = attachedDraft.media || [];
        const unaccounted = findUnaccountedMedia(candidateMedia, attached);
        if (unaccounted.length > 0) {
          dispatch(
            seedLateMedia(
              unaccounted.map((u) => ({
                mediaId: u.mediaId,
                sourceUri: u.sourceUri,
                mimeType: u.mimeType,
                category: u.category,
                phase: "compressing",
              }))
            )
          );
          seededLateCount = unaccounted.length;
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[MergeSync] late-media diff failed", e);
        }
      }

      // 6. Public link.
      let publicCode: string | null = null;
      try {
        const linkRes = await apiMintPublicLink(threadId);
        publicCode = linkRes.publicCode;
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[MergeSync] public-link mint failed", e);
        }
        // ShareLag will retry on mount if publicCode is missing.
      }

      // 7. Housekeeping.
      //    NOTE: setStoriesRefreshTimestamp + setPendingLiveToast belong to
      //    features not yet ported (Home refresh, live toast). Wire in M11.
      await clearAnonDraftLocalState();

      return { storyId, threadId, publicCode, seededLateCount };
    } catch (e) {
      const message = e instanceof Error ? e.message : "merge failed";
      dispatch(markMergeFailed({ error: message }));
      return null;
    }
  };
}

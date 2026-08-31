"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  markMergeDone,
  markMergeFailed,
  markMerging,
} from "../store/slices/pendingAnonMergeSlice";
import { seedLateMedia } from "../store/slices/lateMediaSlice";
import { clearAnonDraftLocalState } from "../storage/localStore";
import { clearDraftToken } from "../storage/secureTokenStore";
import { resetCreateALag } from "../store/slices/createALagSlice";
import { resetAnonDraft } from "../store/slices/anonDraftSlice";
import { apiGetAnonDraft, apiMerge } from "../api/anonEndpoints";
import { findUnaccountedMedia } from "../merge/mergeUtils";

// Deferred merge — fires when isAuthenticated flips true and there's a
// waiting intent (Part 3 §Section F). Used when runAnonMergeSync couldn't
// run inline (e.g., returning user with abandoned draft logs in).
//
// Does NOT retry on failure — user retries via ShareLag's Retry button (which
// calls /api/onboarding/merge/retry). This prevents runaway retries.

export function AnonMergeOrchestrator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const status = useAppSelector((s) => s.pendingAnonMerge.status);
  const intent = useAppSelector((s) => s.pendingAnonMerge.intent);

  // Guard against StrictMode double-invoke + fast state ripples firing merge
  // twice.
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;
    if (!isAuthenticated) return;
    if (status !== "waiting") return;
    if (!intent?.draftToken) return;

    runningRef.current = true;
    const { draftToken, candidateMedia } = intent;

    (async () => {
      dispatch(markMerging());

      try {
        const mergeRes = await apiMerge(draftToken);
        const { storyId, threadId } = mergeRes;
        dispatch(markMergeDone({ storyId, threadId }));

        // Late-media diff.
        try {
          const attachedDraft = await apiGetAnonDraft(draftToken);
          const attached = attachedDraft.media || [];
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
          }
        } catch (e) {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn("[MergeOrchestrator] late-media diff failed", e);
          }
        }

        // Housekeeping.
        await clearAnonDraftLocalState();
      } catch (e) {
        const message = e instanceof Error ? e.message : "merge failed";
        dispatch(markMergeFailed({ error: message }));
        // NO auto-retry — ShareLag banner surfaces to user.
      } finally {
        runningRef.current = false;
      }
    })();
  }, [isAuthenticated, status, intent, dispatch]);

  return null;
}

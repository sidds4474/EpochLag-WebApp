import type { AppDispatch } from "./index";
import {
  markHydrated,
  setHasDraftToken,
  setLastStep,
  setReferralAttribution,
} from "./slices/anonDraftSlice";
import {
  queueAnonMerge,
  resetPendingAnonMerge,
} from "./slices/pendingAnonMergeSlice";
import {
  clearDraftToken,
  getDraftToken,
} from "../storage/secureTokenStore";
import {
  getOrCreateAnonId,
  getStoredLastOnboardingStep,
  getStoredReferralCode,
  peekAnonId,
  readPersistedPendingAnonMerge,
} from "../storage/localStore";

// Fresh-install cleanup: mobile's iOS Keychain survives app uninstall, so an
// old draftToken can stick around. Web equivalent: if anonId doesn't exist in
// localStorage (fresh visit or site-data-clear) BUT the encrypted draftToken
// exists in IndexedDB, treat it as stale and wipe it. Prevents zombie drafts
// from a previous device that shared this origin (edge case, but cheap to
// guard).
async function freshInstallCleanup(): Promise<void> {
  const priorAnonId = peekAnonId();
  if (priorAnonId) return; // not a fresh install
  const staleToken = await getDraftToken();
  if (staleToken) {
    await clearDraftToken();
  }
}

// Boot thunk. Fires once on app boot BEFORE the router renders. Sets
// `anonDraft.hydrated = true` on completion (even on failure — prevents
// infinite splash).
export function hydrateAnonDraft() {
  return async (dispatch: AppDispatch) => {
    try {
      await freshInstallCleanup();

      // Mint anonId if missing (side-effect on localStorage).
      getOrCreateAnonId();

      // Read draftToken presence (do NOT surface the token itself into Redux).
      const token = await getDraftToken();
      dispatch(setHasDraftToken(Boolean(token)));

      // Resume index.
      const lastStep = getStoredLastOnboardingStep();
      if (typeof lastStep === "number") {
        dispatch(setLastStep(lastStep));
      }

      // Referral deep-link (resolve of referrerFirstName happens later —
      // M3 will add /api/referral/resolve/{code}).
      const code = getStoredReferralCode();
      if (code) {
        dispatch(setReferralAttribution({ code, referrerFirstName: null }));
      }

      // Rehydrate persisted pendingAnonMerge intent. If a returning user
      // closed the browser mid-merge, we want the orchestrator to pick up.
      const persistedMerge = readPersistedPendingAnonMerge() as
        | {
            status?: string;
            intent?: {
              draftToken?: string;
              candidateMedia?: Array<{
                mediaId: string;
                sourceUri: string;
                mimeType: string;
                category: "cover" | "video" | "image" | "audio";
              }>;
              source?: string;
            } | null;
          }
        | null;

      if (
        persistedMerge &&
        (persistedMerge.status === "waiting" ||
          persistedMerge.status === "merging" ||
          persistedMerge.status === "failed") &&
        persistedMerge.intent?.draftToken
      ) {
        dispatch(
          queueAnonMerge({
            draftToken: persistedMerge.intent.draftToken,
            candidateMedia: persistedMerge.intent.candidateMedia || [],
            source: persistedMerge.intent.source || "restored",
          })
        );
      } else if (persistedMerge && persistedMerge.status === "done") {
        // "done" was already consumed by a previous session; clear it.
        dispatch(resetPendingAnonMerge());
      }
    } catch {
      // Swallow — hydration must never block the app.
    } finally {
      dispatch(markHydrated());
    }
  };
}

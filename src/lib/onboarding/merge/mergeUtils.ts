// Shared merge helpers used by runAnonMergeSync and the deferred orchestrator.
// Keeping these here (vs inline in each) means the late-media diff logic is
// tested once, not twice.

import type { CandidateMediaItem } from "../store/slices/pendingAnonMergeSlice";
import type { AnonServerMedia } from "../api/anonEndpoints";

// Late-media detection: compare candidateMedia (client's snapshot at merge
// time) against BE-attached media. Cloudinary strips underscores from
// public_ids, so cover_a3f9k2p1 becomes covera3f9k2p1 in the stored
// providerPublicId. We do the same normalization on the client mediaId to
// compare.
export function findUnaccountedMedia(
  candidateMedia: CandidateMediaItem[],
  attached: AnonServerMedia[]
): CandidateMediaItem[] {
  const attachedNormalized = attached
    .map((m) => (m.providerPublicId || "").replace(/_/g, "").toLowerCase())
    .filter(Boolean);

  return candidateMedia.filter((cm) => {
    const cleaned = cm.mediaId.replace(/_/g, "").toLowerCase();
    return !attachedNormalized.some((pid) => pid.includes(cleaned));
  });
}

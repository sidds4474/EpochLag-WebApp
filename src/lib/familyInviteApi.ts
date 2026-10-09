import type { PublicFamilyInvitePreview } from "../types/familyInvite";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com";

// Status enum mirrors the public story endpoints — same shape callers can
// switch on. 400 and 404 collapse into NOT_FOUND because BE's spec says to
// show the same "This invite is no longer valid" screen for both.
export const FAMILY_INVITE_FETCH_STATUS = {
  OK: "ok",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  ERROR: "error",
} as const;

export type FamilyInviteFetchResult =
  | { status: "ok"; data: PublicFamilyInvitePreview }
  | { status: "not_found" }
  | { status: "rate_limited" }
  | { status: "error" };

// GET /api/public/family-invite/:token
// Public — no auth. Reading does NOT consume the token; signup still
// forwards familyInviteToken on /auth/register as today.
export async function fetchFamilyInvitePreview(
  token: string
): Promise<FamilyInviteFetchResult> {
  const trimmed = token.trim();
  if (!trimmed) return { status: FAMILY_INVITE_FETCH_STATUS.NOT_FOUND };

  let res;
  try {
    res = await fetch(
      `${API_BASE}/api/public/family-invite/${encodeURIComponent(trimmed)}`,
      { cache: "no-store" }
    );
  } catch {
    return { status: FAMILY_INVITE_FETCH_STATUS.ERROR };
  }

  if (res.status === 400 || res.status === 404) {
    return { status: FAMILY_INVITE_FETCH_STATUS.NOT_FOUND };
  }
  if (res.status === 429) {
    return { status: FAMILY_INVITE_FETCH_STATUS.RATE_LIMITED };
  }
  if (!res.ok) {
    return { status: FAMILY_INVITE_FETCH_STATUS.ERROR };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { status: FAMILY_INVITE_FETCH_STATUS.ERROR };
  }

  if (!body?.success || !body?.data) {
    return { status: FAMILY_INVITE_FETCH_STATUS.NOT_FOUND };
  }

  return {
    status: FAMILY_INVITE_FETCH_STATUS.OK,
    data: body.data as PublicFamilyInvitePreview,
  };
}

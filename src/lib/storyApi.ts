import type {
  PublicStoryData,
  PublicCommentListResponse,
} from "../types/story";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com";

export const STORY_FETCH_STATUS = {
  OK: "ok",
  NOT_FOUND: "not_found",
  ERROR: "error",
} as const;

export type StoryFetchResult =
  | { status: "ok"; data: PublicStoryData }
  | { status: "not_found" }
  | { status: "error" };

export const COMMENTS_FETCH_STATUS = {
  OK: "ok",
  NOT_FOUND: "not_found",
  RATE_LIMITED: "rate_limited",
  ERROR: "error",
} as const;

export type CommentsFetchResult =
  | { status: "ok"; data: PublicCommentListResponse }
  | { status: "not_found" }
  | { status: "rate_limited" }
  | { status: "error" };

// Public endpoints are open; adding Authorization only unlocks viewer-specific
// fields (isLoved, isLiked, canEdit, canDelete). Server-side (no window) we
// can't read the JWT from localStorage, so SSR always runs unauthed — the
// client re-fetches on hydration to populate viewer state.
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const token = window.localStorage.getItem("epochlag.token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchPublicStory(
  publicCode: string
): Promise<StoryFetchResult> {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/public/story/${publicCode}`, {
      cache: "no-store",
      headers: authHeaders(),
    });
  } catch {
    return { status: STORY_FETCH_STATUS.ERROR };
  }

  if (res.status === 404) {
    return { status: STORY_FETCH_STATUS.NOT_FOUND };
  }
  if (!res.ok) {
    return { status: STORY_FETCH_STATUS.ERROR };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { status: STORY_FETCH_STATUS.ERROR };
  }

  if (!body?.success || !body?.data) {
    return { status: STORY_FETCH_STATUS.NOT_FOUND };
  }

  return { status: STORY_FETCH_STATUS.OK, data: body.data as PublicStoryData };
}

// GET /api/public/story/:code/stories/:storyId/comments?page=1&limit=10
// Newest first. storyId MUST come from a story returned by fetchPublicStory —
// never from user input (spec rule).
export async function fetchStoryComments(
  publicCode: string,
  storyId: string,
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {}
): Promise<CommentsFetchResult> {
  const url = new URL(
    `${API_BASE}/api/public/story/${publicCode}/stories/${storyId}/comments`
  );
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  let res;
  try {
    res = await fetch(url.toString(), {
      cache: "no-store",
      headers: authHeaders(),
    });
  } catch {
    return { status: COMMENTS_FETCH_STATUS.ERROR };
  }

  if (res.status === 404) return { status: COMMENTS_FETCH_STATUS.NOT_FOUND };
  if (res.status === 429) return { status: COMMENTS_FETCH_STATUS.RATE_LIMITED };
  if (!res.ok) return { status: COMMENTS_FETCH_STATUS.ERROR };

  let body;
  try {
    body = await res.json();
  } catch {
    return { status: COMMENTS_FETCH_STATUS.ERROR };
  }

  if (!body?.success || !body?.data) {
    return { status: COMMENTS_FETCH_STATUS.ERROR };
  }

  return {
    status: COMMENTS_FETCH_STATUS.OK,
    data: body.data as PublicCommentListResponse,
  };
}

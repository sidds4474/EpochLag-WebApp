const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com";

export const STORY_FETCH_STATUS = {
  OK: "ok",
  NOT_FOUND: "not_found",
  ERROR: "error",
};

export async function fetchPublicStory(publicCode) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/public/story/${publicCode}`, {
      next: { revalidate: 300 },
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

  return { status: STORY_FETCH_STATUS.OK, data: body.data };
}

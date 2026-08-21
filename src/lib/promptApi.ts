import type { PublicStoryData } from "../types/story";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com";

export const PROMPT_FETCH_STATUS = {
  OK: "ok",
  NOT_FOUND: "not_found",
  ERROR: "error",
} as const;

export type PublicPromptData = PublicStoryData & { hasStory?: boolean };

export type PromptFetchResult =
  | { status: "ok"; data: PublicPromptData }
  | { status: "not_found" }
  | { status: "error" };

export async function fetchPublicPrompt(
  publicCode: string
): Promise<PromptFetchResult> {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/public/prompt/${publicCode}`, {
      cache: "no-store",
    });
  } catch {
    return { status: PROMPT_FETCH_STATUS.ERROR };
  }

  if (res.status === 404) {
    return { status: PROMPT_FETCH_STATUS.NOT_FOUND };
  }
  if (!res.ok) {
    return { status: PROMPT_FETCH_STATUS.ERROR };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { status: PROMPT_FETCH_STATUS.ERROR };
  }

  if (!body?.success || !body?.data) {
    return { status: PROMPT_FETCH_STATUS.NOT_FOUND };
  }

  return { status: PROMPT_FETCH_STATUS.OK, data: body.data as PublicPromptData };
}

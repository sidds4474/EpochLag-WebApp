import type { PublicMomentData } from "../types/moment";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://dev.epochlag.com";

export const MOMENT_FETCH_STATUS = {
  OK: "ok",
  NOT_FOUND: "not_found",
  ERROR: "error",
} as const;

export type MomentFetchResult =
  | { status: "ok"; data: PublicMomentData }
  | { status: "not_found" }
  | { status: "error" };

export async function fetchPublicMoment(
  publicCode: string
): Promise<MomentFetchResult> {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/public/moment/${publicCode}`, {
      cache: "no-store",
    });
  } catch {
    return { status: MOMENT_FETCH_STATUS.ERROR };
  }

  if (res.status === 404) {
    return { status: MOMENT_FETCH_STATUS.NOT_FOUND };
  }
  if (!res.ok) {
    return { status: MOMENT_FETCH_STATUS.ERROR };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { status: MOMENT_FETCH_STATUS.ERROR };
  }

  if (!body?.success || !body?.data) {
    return { status: MOMENT_FETCH_STATUS.NOT_FOUND };
  }

  return { status: MOMENT_FETCH_STATUS.OK, data: body.data as PublicMomentData };
}

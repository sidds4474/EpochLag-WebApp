// Daily Lag endpoint wrappers. Mirrors the mobile `lagApi.js` surface:
//   GET  /api/lags/this-week
//   GET  /api/lags?month=M&year=Y
//   POST /api/lags                { storyThreadId, date? }
//   DELETE /api/lags/:date
//
// POST is idempotent per day — repeat for the same date replaces the
// previous thread (201, not 409). DELETE 404 is "already un-lagged" and
// should be treated as success by callers.

import { api, ApiError } from "../api/client";
import type { LagsResponse } from "./types";

export async function fetchThisWeek(): Promise<LagsResponse> {
  return api.get<LagsResponse>("/api/lags/this-week");
}

export async function fetchLagsMonth(
  month: number,
  year: number,
): Promise<LagsResponse> {
  return api.get<LagsResponse>(`/api/lags?month=${month}&year=${year}`);
}

export async function postLag(args: {
  storyThreadId: string;
  date?: string; // YYYY-MM-DD; omit for today in BE timezone
}): Promise<void> {
  const body: { storyThreadId: string; date?: string } = {
    storyThreadId: args.storyThreadId,
  };
  if (args.date) body.date = args.date;
  await api.post("/api/lags", body);
}

export async function deleteLag(dateISO: string): Promise<void> {
  try {
    await api.delete(`/api/lags/${dateISO}`);
  } catch (err) {
    // 404 = already un-lagged. Idempotent — swallow.
    if (err instanceof ApiError && err.status === 404) return;
    throw err;
  }
}

// Paywall vs participant-error distinguisher. Free-plan 403 arrives without
// a `code`; NOT_THREAD_PARTICIPANT arrives tagged.
export function isFreePlanGate(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 403 &&
    err.code !== "NOT_THREAD_PARTICIPANT"
  );
}

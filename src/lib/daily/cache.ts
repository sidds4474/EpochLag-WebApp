// Module-level caches + event emitter for Daily Lag state.
//
// Two separate caches live here:
//   1. `entries` — keyed by range (week / month / year). Keeps rescaled
//      entries around across route transitions so opening My Days after
//      Home already fetched doesn't cold-flash empty.
//   2. `todayKept` — tracks "did I lag today yet?" so the Home tile can
//      swap between the fresh and archive variants without re-fetching.
//
// Subscribers are a plain Set. Components subscribe on mount and the
// composer / un-lag paths fire `notifyDailyEntryChanged` after a
// successful write so every surface refetches in lockstep.

import type { DailyEntryMap } from "./types";

type RangeKey = "week" | `month:${string}` | `year:${number}`;

type RangeState = {
  entries: DailyEntryMap | null;
  hasSucceeded: boolean;
  loading: boolean;
};

const ranges = new Map<RangeKey, RangeState>();

export function getRange(key: RangeKey): RangeState {
  let state = ranges.get(key);
  if (!state) {
    state = { entries: null, hasSucceeded: false, loading: false };
    ranges.set(key, state);
  }
  return state;
}

export function setRange(key: RangeKey, next: Partial<RangeState>): void {
  const current = getRange(key);
  ranges.set(key, { ...current, ...next });
}

export function clearAllRanges(): void {
  ranges.clear();
}

// Year counts (one row per year — array of 12 ints, or "loading", or
// undefined when we haven't fetched that year yet).
const yearCounts = new Map<number, number[] | "loading">();

export function getYearCounts(year: number): number[] | "loading" | undefined {
  return yearCounts.get(year);
}

export function setYearCounts(
  year: number,
  value: number[] | "loading" | undefined,
): void {
  if (value === undefined) yearCounts.delete(year);
  else yearCounts.set(year, value);
}

export function clearYearCounts(): void {
  yearCounts.clear();
}

// -- todayKept -----------------------------------------------------------

export type TodayKept = {
  iso: string;
  entry?: unknown;
};

let todayKept: TodayKept | null = null;

export function readTodayKept(): TodayKept | null {
  return todayKept;
}

export function writeTodayKept(iso: string, entry?: unknown): void {
  todayKept = { iso, entry };
  notifyDailyEntryChanged();
}

export function clearTodayKept(): void {
  todayKept = null;
  notifyDailyEntryChanged();
}

// -- Event emitter -------------------------------------------------------

type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

export function subscribeToDailyEntryChanges(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function notifyDailyEntryChanged(): void {
  subscribers.forEach((cb) => cb());
}

// Sign-out hook — wipe everything.
export function resetDailyCaches(): void {
  clearAllRanges();
  clearYearCounts();
  todayKept = null;
}

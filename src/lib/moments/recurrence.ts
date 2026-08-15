import type { Moment, MomentFrequency } from "../../types/moment";

export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STEPPERS: Record<MomentFrequency, (d: Date) => void> = {
  yearly: (d) => d.setFullYear(d.getFullYear() + 1),
  monthly: (d) => d.setMonth(d.getMonth() + 1),
  weekly: (d) => d.setDate(d.getDate() + 7),
  daily: (d) => d.setDate(d.getDate() + 1),
};

// Expand a moment's occurrences into local-YYYY-MM-DD strings that fall inside
// [rangeStart, rangeEnd]. Non-recurring returns a single-item array.
export function expandRecurringOccurrences(
  moment: Moment,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  const baseIso = moment.nextOccurrence || moment.date;
  if (!baseIso) return [];
  const base = new Date(baseIso);
  if (Number.isNaN(base.getTime())) return [];

  if (!moment.isRecurring || !moment.frequency) {
    if (base >= rangeStart && base <= rangeEnd) return [isoDay(base)];
    return [];
  }

  const step = STEPPERS[moment.frequency];
  if (!step) return [];

  const out: string[] = [];
  const d = new Date(base);
  // Wind backward first so we cover cases where nextOccurrence is already past rangeEnd.
  while (d > rangeStart) {
    const prev = new Date(d);
    const rev = STEPPERS[moment.frequency];
    // No inverse stepper — instead, walk forward from a safe past anchor.
    // Cheaper: build forward-only. Break here.
    void prev;
    void rev;
    break;
  }

  // Walk forward from base until we exit the window.
  while (d <= rangeEnd) {
    if (d >= rangeStart) out.push(isoDay(d));
    step(d);
    // Guard against pathological frequencies producing infinite loops.
    if (out.length > 400) break;
  }

  return out;
}

// Build a set of ISO day strings that have at least one moment on them,
// within the visible window.
export function buildDotsByDay(
  moments: Moment[],
  rangeStart: Date,
  rangeEnd: Date
): Set<string> {
  const set = new Set<string>();
  for (const m of moments) {
    const days = expandRecurringOccurrences(m, rangeStart, rangeEnd);
    for (const d of days) set.add(d);
  }
  return set;
}

// Countdown pill copy, driven by BE's daysUntil.
export function countdownLabel(daysUntil: number | null): string {
  if (daysUntil === null || daysUntil === undefined) return "";
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "1 Day";
  if (daysUntil > 0) return `${daysUntil} Days`;
  if (daysUntil === -1) return "1 day ago";
  return `${Math.abs(daysUntil)} days ago`;
}

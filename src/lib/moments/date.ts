// Moment dates are stored as UTC-midnight ISO strings that represent a
// *calendar day* — no time, no zone semantics intended. Reading them with
// local getters shifts the day for viewers west of UTC, so every renderer
// goes through these UTC-anchored helpers.

export function parseCalendarDay(
  iso: string | null | undefined
): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth(),
    d: dt.getUTCDate(),
  };
}

export function formatCalendarDay(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions
): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
}

export function isoDayFromCalendar(iso: string | null | undefined): string {
  const parts = parseCalendarDay(iso);
  if (!parts) return "";
  const mm = String(parts.m + 1).padStart(2, "0");
  const dd = String(parts.d).padStart(2, "0");
  return `${parts.y}-${mm}-${dd}`;
}

export function ordinalSuffix(day: number): string {
  if (day % 10 === 1 && day !== 11) return "st";
  if (day % 10 === 2 && day !== 12) return "nd";
  if (day % 10 === 3 && day !== 13) return "rd";
  return "th";
}

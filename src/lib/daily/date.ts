// Date helpers for the Daily Lag / My Days surfaces. The BE stores lag dates
// as UTC midnight, but calendar UI should display in the user's local
// timezone. Mobile slices the ISO string (treating UTC midnight as the
// intended calendar day) — follow the same pattern on web.

export function isoDay(utcIsoString: string | null | undefined): string | null {
  if (!utcIsoString) return null;
  return utcIsoString.slice(0, 10);
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Monday-start week containing today, as YYYY-MM-DD × 7.
export function getWeekDays(): string[] {
  const d = new Date();
  const dayIdx = (d.getDay() + 6) % 7; // shift so Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayIdx);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const dd = String(day.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });
}

// 6×7 grid including prev / next-month overflow, Monday-start.
// Each cell carries its own YYYY-MM-DD plus whether it belongs to the
// clicked-on month (for grey-out styling).
export type MonthCell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

export function monthMatrix(year: number, monthIdx: number): MonthCell[] {
  const first = new Date(year, monthIdx, 1);
  const leading = (first.getDay() + 6) % 7;

  const cells: MonthCell[] = [];
  if (leading > 0) {
    const prevMonth = monthIdx === 0 ? 11 : monthIdx - 1;
    const prevYear = monthIdx === 0 ? year - 1 : year;
    const prevTotal = new Date(prevYear, prevMonth + 1, 0).getDate();
    for (let i = leading - 1; i >= 0; i--) {
      const day = prevTotal - i;
      cells.push({
        iso: formatISO(prevYear, prevMonth, day),
        day,
        inMonth: false,
      });
    }
  }
  const total = new Date(year, monthIdx + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    cells.push({ iso: formatISO(year, monthIdx, d), day: d, inMonth: true });
  }
  const nextMonth = monthIdx === 11 ? 0 : monthIdx + 1;
  const nextYear = monthIdx === 11 ? year + 1 : year;
  let nd = 1;
  while (cells.length < 42) {
    cells.push({
      iso: formatISO(nextYear, nextMonth, nd),
      day: nd,
      inMonth: false,
    });
    nd++;
  }
  return cells;
}

function formatISO(year: number, monthIdx: number, day: number): string {
  const m = String(monthIdx + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${m}-${dd}`;
}

export function compareISO(a: string, b: string): number {
  return a.localeCompare(b);
}

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

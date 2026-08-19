"use client";

import { useMemo, useState } from "react";
import { isoDay } from "../../../../../lib/moments/recurrence";
import { isoDayFromCalendar, parseCalendarDay } from "../../../../../lib/moments/date";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "../../icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["m", "t", "w", "t", "f", "s", "s"];

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function mondayFirstWeekday(year: number, monthIdx: number): number {
  const d = new Date(year, monthIdx, 1);
  const sun0 = d.getDay();
  return (sun0 + 6) % 7;
}

export default function WizardCalendar({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (iso: string) => void;
}) {
  const today = new Date();
  // value may be either a bare "YYYY-MM-DD" (from a prior tap) or a full
  // UTC-midnight ISO (from BE when editing). Read UTC components so the
  // month/year opens on the day the author actually picked.
  const initialParts = value ? parseCalendarDay(value) : null;
  const [year, setYear] = useState(initialParts?.y ?? today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(initialParts?.m ?? today.getMonth());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const total = daysInMonth(year, monthIdx);
  const leading = mondayFirstWeekday(year, monthIdx);

  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

  if (leading > 0) {
    const prevMonth = monthIdx === 0 ? 11 : monthIdx - 1;
    const prevYear = monthIdx === 0 ? year - 1 : year;
    const prevTotal = daysInMonth(prevYear, prevMonth);
    for (let i = leading - 1; i >= 0; i--) {
      const day = prevTotal - i;
      cells.push({
        iso: isoDay(new Date(prevYear, prevMonth, day)),
        day,
        inMonth: false,
      });
    }
  }
  for (let d = 1; d <= total; d++) {
    cells.push({ iso: isoDay(new Date(year, monthIdx, d)), day: d, inMonth: true });
  }
  const nextMonth = monthIdx === 11 ? 0 : monthIdx + 1;
  const nextYear = monthIdx === 11 ? year + 1 : year;
  let nd = 1;
  while (cells.length < 42) {
    cells.push({
      iso: isoDay(new Date(nextYear, nextMonth, nd)),
      day: nd,
      inMonth: false,
    });
    nd++;
  }

  const gotoMonth = (delta: number) => {
    let m = monthIdx + delta;
    let y = year;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    setMonthIdx(m);
    setYear(y);
  };

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const out: number[] = [];
    for (let i = now - 30; i <= now + 30; i++) out.push(i);
    return out;
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-[14px]">
        <div className="flex items-center gap-[10px]">
          <span className="font-montserrat font-medium text-primary-blue text-[16px]">
            {MONTHS[monthIdx]}
          </span>
          <button
            type="button"
            onClick={() => gotoMonth(-1)}
            aria-label="Previous month"
            className="cursor-pointer w-[22px] h-[22px] rounded-full text-primary-blue/70 hover:bg-black/[0.04] flex items-center justify-center"
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <button
            type="button"
            onClick={() => gotoMonth(1)}
            aria-label="Next month"
            className="cursor-pointer w-[22px] h-[22px] rounded-full text-primary-blue/70 hover:bg-black/[0.04] flex items-center justify-center"
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setYearPickerOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={yearPickerOpen}
            className="cursor-pointer bg-[color:var(--color-surface-muted)] rounded-full px-[12px] py-[5px] flex items-center gap-[6px] font-montserrat font-medium text-primary-blue text-[13px]"
          >
            {year}
            <ChevronDownIcon width={12} height={12} />
          </button>
          {yearPickerOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-[36px] max-h-[220px] overflow-y-auto bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-black/[0.06] py-[6px] z-10 min-w-[80px]"
            >
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={y === year}
                  onClick={() => {
                    setYear(y);
                    setYearPickerOpen(false);
                  }}
                  className={`cursor-pointer w-full text-left px-[14px] py-[6px] font-montserrat text-[13px] transition-colors ${
                    y === year
                      ? "bg-black/[0.04] text-primary-blue font-semibold"
                      : "text-primary-blue/80 hover:bg-black/[0.04]"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-[8px] mb-[6px]">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center font-montserrat text-primary-blue/50 text-[12px] lowercase"
          >
            {w}
          </div>
        ))}
      </div>

      {/* value may be either bare YYYY-MM-DD (fresh tap) or a full BE ISO
          (initial edit seed) — normalize both sides for the match. */}
      <div className="grid grid-cols-7 gap-y-[8px]">
        {cells.map((c) => {
          const normalizedValue = value ? isoDayFromCalendar(value) || value.slice(0, 10) : null;
          const isSelected = normalizedValue === c.iso;
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => onChange(c.iso)}
              className={`mx-auto w-[32px] h-[32px] rounded-full flex items-center justify-center font-montserrat text-[14px] transition-colors focus:outline-none focus-visible:outline-none ${
                isSelected
                  ? "bg-primary-orange text-white font-semibold"
                  : !c.inMonth
                    ? "text-primary-blue/30"
                    : "text-[#333333]"
              }`}
            >
              {String(c.day).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

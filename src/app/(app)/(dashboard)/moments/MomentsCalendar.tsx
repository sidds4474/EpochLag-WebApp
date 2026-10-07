"use client";

import { useMemo, useState } from "react";
import type { Moment } from "../../../../types/moment";
import { buildDotsByDay, isoDay } from "../../../../lib/moments/recurrence";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "../icons";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["m", "t", "w", "t", "f", "s", "s"]; // Monday first

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

// Monday-first weekday index (0=Mon, 6=Sun)
function mondayFirstWeekday(year: number, monthIdx: number): number {
  const d = new Date(year, monthIdx, 1);
  const sun0 = d.getDay(); // 0=Sun
  return (sun0 + 6) % 7;
}

export default function MomentsCalendar({
  moments,
  selectedDay,
  onSelectDay,
}: {
  moments: Moment[];
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  const dotsByDay = useMemo(() => {
    const start = new Date(year, monthIdx - 1, 1);
    const end = new Date(year, monthIdx + 2, 0);
    return buildDotsByDay(moments, start, end);
  }, [moments, year, monthIdx]);

  const total = daysInMonth(year, monthIdx);
  const leading = mondayFirstWeekday(year, monthIdx);

  // Fixed 6-row (42-cell) layout so month switches don't jump.
  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];

  // Previous month tail
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
  // Current month
  for (let d = 1; d <= total; d++) {
    cells.push({ iso: isoDay(new Date(year, monthIdx, d)), day: d, inMonth: true });
  }
  // Next month lead-in
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

  const todayIso = isoDay(today);

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
    <div className="rounded-[20px] bg-white p-[20px]">
      {/* Month + year header */}
      <div className="flex items-center justify-between mb-[10px]">
        <div className="flex items-center gap-[8px]">
          <span className="font-montserrat font-medium text-primary-blue text-[15px]">
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
            className="cursor-pointer bg-white rounded-full px-[10px] py-[4px] flex items-center gap-[6px] font-montserrat font-medium text-primary-blue text-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          >
            {year}
            <ChevronDownIcon width={12} height={12} />
          </button>
          {yearPickerOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-[32px] max-h-[220px] overflow-y-auto bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-black/[0.06] py-[6px] z-10 min-w-[80px]"
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

      {/* Weekday row */}
      <div className="grid grid-cols-7 gap-y-[6px] mb-[4px]">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center font-montserrat text-primary-blue/50 text-[11px] lowercase"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-[4px]">
        {cells.map((c) => {
          const isSelected = selectedDay === c.iso;
          const isToday = c.iso === todayIso;
          const hasDot = dotsByDay.has(c.iso);
          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => onSelectDay(c.iso)}
              className={`relative mx-auto w-[30px] h-[30px] rounded-full flex items-center justify-center font-montserrat text-[14px] transition-colors focus:outline-none focus-visible:outline-none ${
                isSelected
                  ? "bg-primary-orange text-white font-semibold"
                  : !c.inMonth
                    ? "text-primary-blue/30"
                    : isToday
                      ? "text-primary-blue font-semibold"
                      : "text-[#333333]"
              }`}
            >
              {String(c.day).padStart(2, "0")}
              {hasDot && !isSelected && (
                <span
                  className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full bg-primary-orange"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

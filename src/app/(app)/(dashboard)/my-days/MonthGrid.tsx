"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MONTH_LABELS,
  monthMatrix,
  todayISO,
} from "../../../../lib/daily/date";
import type { DailyEntryMap } from "../../../../lib/daily/types";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "../icons";

const WEEKDAYS = ["m", "t", "w", "t", "f", "s", "s"];

export default function MonthGrid({
  month,
  year,
  entries,
  onMonthChange,
  onYearChange,
  onSelectDay,
}: {
  month: number; // 0-11
  year: number;
  entries: DailyEntryMap;
  onMonthChange: (nextMonth: number, nextYear: number) => void;
  onYearChange: (year: number) => void;
  onSelectDay: (iso: string, hasEntry: boolean) => void;
}) {
  const [yearOpen, setYearOpen] = useState(false);
  const yearRef = useRef<HTMLDivElement | null>(null);
  const today = todayISO();

  useEffect(() => {
    if (!yearOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!yearRef.current?.contains(e.target as Node)) setYearOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [yearOpen]);

  const cells = useMemo(() => monthMatrix(year, month), [year, month]);

  const now = new Date().getFullYear();
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => now - i),
    [now],
  );

  const step = (delta: number) => {
    let m = month + delta;
    let y = year;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }
    onMonthChange(m, y);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-[14px]">
        <div className="flex items-center gap-[10px]">
          <span className="font-montserrat text-[#232323] text-[16px]">
            {MONTH_LABELS[month]}
          </span>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="cursor-pointer w-[22px] h-[22px] rounded-full text-[#232323]/70 hover:bg-black/[0.04] flex items-center justify-center"
          >
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next month"
            className="cursor-pointer w-[22px] h-[22px] rounded-full text-[#232323]/70 hover:bg-black/[0.04] flex items-center justify-center"
          >
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>

        <div className="relative" ref={yearRef}>
          <button
            type="button"
            onClick={() => setYearOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={yearOpen}
            className="cursor-pointer bg-white rounded-full px-[14px] py-[6px] flex items-center gap-[8px] font-montserrat text-[#232323] text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          >
            {year}
            <ChevronDownIcon width={12} height={12} />
          </button>
          {yearOpen && (
            <div
              role="listbox"
              className="absolute right-0 top-[40px] bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[6px] z-10 min-w-[90px]"
            >
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={y === year}
                  onClick={() => {
                    onYearChange(y);
                    setYearOpen(false);
                  }}
                  className={`cursor-pointer w-full text-left px-[14px] py-[6px] font-montserrat text-[13px] transition-colors ${
                    y === year
                      ? "bg-black/[0.04] text-[#232323] font-semibold"
                      : "text-[#232323]/80 hover:bg-black/[0.04]"
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
            className="text-center font-montserrat text-[#232323]/50 text-[12px] lowercase"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-[10px]">
        {cells.map((c) => {
          const hasEntry = !!entries[c.iso];
          const isFuture = c.iso > today;
          const disabled = isFuture;
          return (
            <button
              key={c.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDay(c.iso, hasEntry)}
              className={`mx-auto w-[34px] h-[34px] rounded-full flex items-center justify-center font-montserrat text-[14px] transition-colors focus:outline-none focus-visible:outline-none relative ${
                hasEntry
                  ? "bg-primary-orange text-white font-semibold"
                  : !c.inMonth || isFuture
                    ? "text-[#232323]/30"
                    : "text-[#333333] cursor-pointer"
              } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              {String(c.day).padStart(2, "0")}
              {hasEntry && (
                <span className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full bg-primary-orange" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

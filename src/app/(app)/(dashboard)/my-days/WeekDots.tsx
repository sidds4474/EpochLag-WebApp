"use client";

import { DAY_LABELS_SHORT, getWeekDays, todayISO } from "../../../../lib/daily/date";
import type { DailyEntryMap } from "../../../../lib/daily/types";

export default function WeekDots({
  entries,
  onSelectDay,
}: {
  entries: DailyEntryMap;
  onSelectDay: (iso: string, hasEntry: boolean) => void;
}) {
  const days = getWeekDays();
  const today = todayISO();

  return (
    <div className="bg-[#E8E6DF] rounded-[16px] p-[20px] md:p-[24px]">
      <h3 className="font-montserrat text-[#232323] text-[14px] mb-[16px]">
        This Week
      </h3>
      <div className="grid grid-cols-7 gap-[6px]">
        {days.map((iso, i) => {
          const hasEntry = !!entries[iso];
          const isFuture = iso > today;
          const isToday = iso === today;
          const label = DAY_LABELS_SHORT[i];
          const labelColor = isToday
            ? "text-primary-orange font-medium"
            : isFuture
              ? "text-[#848484]"
              : "text-[#151515] font-medium";

          return (
            <button
              key={iso}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDay(iso, hasEntry)}
              className={`flex flex-col items-center gap-[8px] ${
                isFuture ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <span
                className={`w-[30px] h-[30px] rounded-full flex items-center justify-center ${
                  hasEntry
                    ? "bg-[#1C1C1C] text-white"
                    : isFuture
                      ? "bg-white/50"
                      : "bg-white"
                }`}
              >
                {hasEntry && (
                  <svg
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span
                className={`font-montserrat text-[12px] md:text-[13px] ${labelColor}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

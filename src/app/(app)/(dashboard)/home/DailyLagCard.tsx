"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  readTodayKept,
  subscribeToDailyEntryChanges,
} from "../../../../lib/daily/cache";
import { getWeekDays, todayISO } from "../../../../lib/daily/date";
import { useDailyEntries } from "../../../../lib/daily/useDailyEntries";

// Daily Lag card — sand background, thin inner outline, a sun glyph + the
// "Daily Lag" header in a monospaced font, then the day's journal prompt
// with an arrow link to the write flow. Flips to an "archive" variant once
// the user has lagged today — shows the current week's streak and links
// to My Days instead of the composer.

function SunIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/dashboard/icons/dailyLags.png"
      alt=""
      className="w-[36px] h-[36px] md:w-[42px] md:h-[42px] object-contain select-none"
      aria-hidden="true"
    />
  );
}

function CalendarGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#232323"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[32px] h-[32px] md:w-[36px] md:h-[36px]"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#232323"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-[22px] h-[22px] shrink-0"
      aria-hidden="true"
    >
      <path d="M4 12h15M14 6l6 6-6 6" />
    </svg>
  );
}

export default function DailyLagCard() {
  const router = useRouter();
  const [, forceTick] = useState(0);

  // Subscribe to the todayKept event emitter so publish / un-lag flip the
  // tile without a route change.
  useEffect(() => {
    const off = subscribeToDailyEntryChanges(() => forceTick((n) => n + 1));
    return off;
  }, []);

  // Always pull this-week — populates the streak count and tells us whether
  // today is lagged independently of the todayKept quickcache.
  const { entries } = useDailyEntries({ range: "week" });

  const iso = todayISO();
  const todayKept = readTodayKept();
  const hasEntryToday = !!entries[iso] || (todayKept && todayKept.iso === iso);

  const weekDays = getWeekDays();
  const savedThisWeek = weekDays.filter((d) => entries[d]).length;

  const title = hasEntryToday
    ? `${savedThisWeek} Day${savedThisWeek === 1 ? "" : "s"} Saved This Week`
    : "How’s today going?";
  const subtitle = hasEntryToday
    ? "Keep the streak going."
    : "Write about your day.";

  const handleClick = () => {
    if (hasEntryToday) {
      router.push(`/my-days?dateISO=${iso}`);
      return;
    }
    const params = new URLSearchParams({ source: "daily", dailyDate: iso });
    router.push(`/new-lag?${params.toString()}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group block w-full text-left bg-[#E6E3D9] rounded-[6px] shadow-[0_4px_6px_rgba(0,0,0,0.12)] p-[6px] sm:p-[8px] md:p-[10px] hover:shadow-[0_6px_10px_rgba(0,0,0,0.14)] transition-shadow cursor-pointer"
      aria-label={hasEntryToday ? "View your days" : "Write today’s Daily Lag"}
    >
      <div className="rounded-[4px] border border-black/25 divide-y divide-black/25">
        <div className="flex items-center gap-[10px] pl-[6px] sm:pl-[8px] md:pl-[10px] pr-[14px] sm:pr-[16px] md:pr-[20px] py-[8px] md:py-[10px]">
          {hasEntryToday ? <CalendarGlyph /> : <SunIcon />}
          <span
            className="text-[#111] text-[15px] md:text-[18px] font-light leading-none"
            style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
          >
            Daily Lag
          </span>
        </div>
        <div className="flex items-end justify-between gap-[14px] px-[18px] sm:px-[22px] md:px-[28px] pt-[52px] md:pt-[72px] pb-[18px] md:pb-[22px] min-h-[140px] md:min-h-[160px]">
          <div className="flex flex-col gap-[6px]">
            <p className="font-ivy font-normal text-[#111] text-[20px] sm:text-[22px] md:text-[24px] leading-[1.25]">
              {title}
            </p>
            <p className="font-montserrat text-[#2c2c2c]/70 text-[13px] md:text-[14px]">
              {subtitle}
            </p>
          </div>
          <ArrowRight />
        </div>
      </div>
    </button>
  );
}

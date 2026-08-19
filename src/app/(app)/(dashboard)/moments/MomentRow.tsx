"use client";

import type { Moment } from "../../../../types/moment";
import { formatCalendarDay, parseCalendarDay } from "../../../../lib/moments/date";
import { fallbackGradient, momentTypeIcon } from "./momentTypeIcon";

function splitDate(iso: string): { day: string; month: string } {
  const parts = parseCalendarDay(iso);
  if (!parts) return { day: "--", month: "" };
  const day = String(parts.d).padStart(2, "0");
  const month = formatCalendarDay(iso, { month: "short" });
  return { day, month };
}

export default function MomentRow({
  moment,
  selected,
  onClick,
}: {
  moment: Moment;
  selected?: boolean;
  onClick?: () => void;
}) {
  const { day, month } = splitDate(moment.nextOccurrence || moment.date);
  const cover = moment.coverImageUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer w-full h-[119px] lg:h-[86px] flex items-stretch gap-[24px] lg:gap-[16px] bg-white rounded-[20px] lg:rounded-[16px] pl-[24px] lg:pl-[16px] pr-[6px] py-[6px] lg:py-[4px] border transition-shadow ${
        selected ? "border-primary-orange" : "border-transparent"
      }`}
      style={{ filter: "drop-shadow(0 0 12.5px rgba(0,0,0,0.2))" }}
    >
      <div className="shrink-0 flex flex-col items-start justify-center text-primary-blue">
        <div className="font-montserrat font-medium text-[38px] lg:text-[26px] leading-[41px] lg:leading-[28px]">
          {day}
        </div>
        <div className="mt-[-2px] font-montserrat font-medium text-[19.5px] lg:text-[14px] leading-[24px] lg:leading-[18px]">
          {month}
        </div>
      </div>

      <div className="shrink-0 self-center w-px h-[64px] lg:h-[44px] bg-[#C9C9C9]" />

      <div className="flex-1 min-w-0 flex flex-col justify-center items-start gap-[10px] lg:gap-[6px]">
        <div className="w-[29px] h-[29px] lg:w-[24px] lg:h-[24px] shrink-0 rounded-full bg-[color:var(--color-surface-muted)] text-primary-blue flex items-center justify-center">
          {momentTypeIcon(moment.type, 16)}
        </div>
        <span className="font-montserrat font-medium text-primary-blue text-[16px] lg:text-[14px] leading-[20px] truncate max-w-full">
          {moment.title}
        </span>
      </div>

      <div
        className="w-[59px] lg:w-[64px] shrink-0 self-stretch rounded-r-[16px] lg:rounded-r-[12px] overflow-hidden bg-[#D9D9D9]"
        style={
          !cover ? { backgroundImage: fallbackGradient(moment.type) } : undefined
        }
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>
    </button>
  );
}

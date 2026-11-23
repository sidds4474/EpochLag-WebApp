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
  const tagged = (moment.participants ?? []).slice(0, 3);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer w-full flex items-stretch gap-[14px] md:gap-[18px] bg-[#E8E6DF] rounded-[16px] pl-[16px] md:pl-[18px] pr-[8px] md:pr-[10px] py-[10px] md:py-[12px] border transition-colors ${
        selected ? "border-primary-orange" : "border-transparent"
      }`}
    >
      {/* Date column */}
      <div className="shrink-0 flex flex-col items-start justify-center min-w-[42px] md:min-w-[48px] text-[#232323]">
        <div className="font-ivy font-normal text-[32px] md:text-[36px] leading-[1]">
          {day}
        </div>
        <div className="mt-[2px] font-montserrat text-[12px] md:text-[13px] text-[#848484]">
          {month}
        </div>
      </div>

      <div className="shrink-0 self-stretch w-px bg-black/15" />

      {/* Icon → title → avatars, each on its own line */}
      <div className="flex-1 min-w-0 flex flex-col items-start justify-center gap-[4px] md:gap-[6px] text-left">
        <span className="w-[20px] h-[20px] text-[#232323] flex items-center justify-start">
          {momentTypeIcon(moment.type, 18)}
        </span>
        <span className="block w-full font-montserrat font-medium text-[#232323] text-[14px] md:text-[15px] leading-[1.3] truncate text-left">
          {moment.title}
        </span>
        {tagged.length > 0 && (
          <div className="flex items-center mt-[2px]">
            {tagged.map((p, i) => {
              const user = p.userId;
              const initial = (user?.firstName || "?").charAt(0).toUpperCase();
              return (
                <div
                  key={user?._id ?? i}
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                  className="w-[22px] h-[22px] rounded-full border-[1.5px] border-white bg-[#C8D1DA] overflow-hidden flex items-center justify-center font-montserrat font-semibold text-white text-[10px]"
                >
                  {user?.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profilePicture}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Polaroid photo on the right */}
      <div className="shrink-0 bg-white p-[5px] rounded-[2px] shadow-[0_3px_4px_rgba(0,0,0,0.22)] self-center">
        <div
          className="w-[62px] h-[66px] md:w-[76px] md:h-[80px] overflow-hidden bg-primary-blue/10"
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
      </div>
    </button>
  );
}

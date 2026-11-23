"use client";

import { useRef, useState } from "react";
import type { Moment } from "../../../../types/moment";
import { countdownLabel } from "../../../../lib/moments/recurrence";
import { formatCalendarDay } from "../../../../lib/moments/date";
import { fallbackGradient, momentTypeIcon } from "./momentTypeIcon";

function formatMonthDay(iso: string): string {
  return formatCalendarDay(iso, { month: "long", day: "numeric" });
}

export default function CountdownCarousel({
  items,
  onSelect,
}: {
  items: Moment[] | null;
  onSelect?: (m: Moment) => void;
}) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (items === null) {
    return (
      <div className="h-[128px] rounded-[16px] bg-black/[0.05] animate-pulse" />
    );
  }
  if (items.length === 0) {
    return (
      <div className="h-[128px] rounded-[16px] bg-[#E8E6DF] flex items-center justify-center">
        <p className="font-montserrat text-[#2c2c2c]/60 text-[13px]">
          Pin a moment to see it counted down here
        </p>
      </div>
    );
  }

  const scrollTo = (nextIdx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, nextIdx));
    const child = el.children[clamped] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
    setIndex(clamped);
  };

  const canStepPrev = index > 0;
  const canStepNext = index < items.length - 1;

  return (
    <>
    <div className="relative flex items-center gap-[10px]">
      {items.length > 1 && canStepPrev && (
        <button
          type="button"
          onClick={() => scrollTo(index - 1)}
          aria-label="Previous countdown"
          className="shrink-0 cursor-pointer w-[32px] h-[32px] rounded-full text-[#2c2c2c] flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <div
        ref={scrollRef}
        data-countdown-scroller
        className="flex-1 min-w-0 flex gap-[12px] overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        onScroll={(e) => {
          const el = e.currentTarget;
          const cw = el.clientWidth;
          if (!cw) return;
          const i = Math.round(el.scrollLeft / cw);
          if (i !== index) setIndex(i);
        }}
      >
        {items.map((m) => (
          <CountdownSlide
            key={m._id}
            moment={m}
            onSelect={() => onSelect?.(m)}
          />
        ))}
      </div>

      {items.length > 1 && canStepNext && (
        <button
          type="button"
          onClick={() => scrollTo(index + 1)}
          aria-label="Next countdown"
          className="shrink-0 cursor-pointer w-[32px] h-[32px] rounded-full text-[#2c2c2c] flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

    </div>

    {items.length > 1 && (
      <div className="mt-[14px] flex justify-center gap-[6px]">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-[6px] rounded-full transition-all ${
              i === index
                ? "w-[16px] bg-primary-orange"
                : "w-[6px] bg-[#D0D0D0]"
            }`}
          />
        ))}
      </div>
    )}
    </>
  );
}

function CountdownSlide({
  moment,
  onSelect,
}: {
  moment: Moment;
  onSelect: () => void;
}) {
  const label = countdownLabel(moment.daysUntil);
  const cover = moment.coverImageUrl;
  const [num, unit] = splitCountdown(label);
  const dateStr = formatMonthDay(moment.nextOccurrence || moment.date);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="cursor-pointer snap-start shrink-0 w-full relative h-[150px] md:h-[164px] text-left"
    >
      {/* Sand backdrop — fixed height, independent from content. The
          polaroid and the text column live over it and are positioned
          absolutely so the sand card's height doesn't flex with the
          content. */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[84px] md:h-[96px] bg-[#E8E6DF] rounded-[16px]" />

      {/* Polaroid photo anchored to the left. Its top sits just inside
          the sand band; the bottom extends past the sand so the photo
          reads as "pinned" to the card. "N Days" tile overlaps the
          polaroid's bottom-right corner with a dark top band. */}
      <div className="absolute left-[14px] md:left-[18px] top-[38px] md:top-[40px]">
        <div className="relative bg-white p-[6px] pb-[10px] shadow-[0_3px_4px_rgba(0,0,0,0.25)]">
          <div
            className="w-[88px] h-[88px] md:w-[102px] md:h-[102px] overflow-hidden bg-primary-blue/10"
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
          {num !== null && (
            <div className="absolute right-[-6px] bottom-[-6px] bg-white shadow-[0_3px_6px_rgba(0,0,0,0.22)] overflow-hidden min-w-[50px]">
              <div className="h-[10px] bg-[#1C1C1C]" />
              <div className="px-[8px] pt-[4px] pb-[6px] text-center">
                <div className="font-ivy font-normal text-[#232323] text-[22px] md:text-[24px] leading-[1]">
                  {num}
                </div>
                <div className="mt-[1px] font-montserrat text-[#2c2c2c]/70 text-[10px]">
                  {unit}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: icon + title + date — vertically centered on the sand
          band and clamped so the block always fits inside its height. */}
      <div className="absolute left-[140px] md:left-[160px] right-[18px] md:right-[24px] top-1/2 -translate-y-1/2 flex flex-col gap-[2px] md:gap-[4px]">
        <span className="w-[20px] h-[20px] text-[#232323] flex items-center justify-start">
          {momentTypeIcon(moment.type, 20)}
        </span>
        <h3 className="font-ivy font-normal text-[#232323] text-[16px] md:text-[20px] leading-[1.2] truncate">
          {moment.title}
        </h3>
        {dateStr && (
          <p className="font-montserrat text-[#848484] text-[12px] md:text-[13px] truncate">
            {dateStr}
          </p>
        )}
      </div>
    </button>
  );
}

// "32 Days" → ["32", "Days"], "Today" → [null, "Today"], "5 days ago" → ["5", "days ago"]
function splitCountdown(label: string): [string | null, string] {
  const m = label.match(/^(-?\d+)\s+(.+)$/);
  if (!m) return [null, label];
  return [m[1], m[2]];
}

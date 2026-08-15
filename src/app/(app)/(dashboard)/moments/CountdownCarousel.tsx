"use client";

import { useRef, useState } from "react";
import type { Moment } from "../../../../types/moment";
import { countdownLabel } from "../../../../lib/moments/recurrence";
import { fallbackGradient, momentTypeIcon } from "./momentTypeIcon";

function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
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
      <div className="h-[168px] rounded-[20px] bg-black/[0.05] animate-pulse" />
    );
  }
  if (items.length === 0) {
    return (
      <div className="h-[168px] rounded-[20px] bg-[color:var(--color-surface-muted)] flex items-center justify-center">
        <p className="font-montserrat text-primary-blue/50 text-[13px]">
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

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        data-countdown-scroller
        className="flex gap-[12px] overflow-x-auto snap-x snap-mandatory scrollbar-hide"
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

      {items.length > 1 && (
        <div className="mt-[10px] flex justify-center gap-[6px]">
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
    </div>
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
      className="cursor-pointer snap-start shrink-0 w-full relative overflow-hidden rounded-[20px] h-[168px] text-left"
      style={
        !cover ? { backgroundImage: fallbackGradient(moment.type) } : undefined
      }
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {/* Legibility scrim */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 70%)",
        }}
        aria-hidden
      />

      {/* Top-left type badge */}
      <div className="absolute top-[16px] left-[16px] w-[36px] h-[36px] rounded-full bg-white/95 text-primary-blue flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
        {momentTypeIcon(moment.type, 18)}
      </div>

      {/* Top-right arrow — translucent white per Figma */}
      <span
        aria-label={moment.title}
        className="absolute top-[14px] right-[14px] w-[30px] h-[30px] rounded-full flex items-center justify-center"
        style={{ backgroundColor: "rgba(255,255,255,0.30)" }}
      >
        <svg
          width={30 * 0.65}
          height={30 * 0.65}
          viewBox="0 0 33 33"
          fill="none"
          stroke="#ffffff"
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.4278 16.2833H27.1389M18.9972 24.4249L27.1389 16.2833L18.9972 8.1416" />
        </svg>
      </span>

      {/* Bottom-left title + date */}
      <div className="absolute left-[16px] bottom-[16px] text-white max-w-[65%]">
        <h3 className="font-montserrat font-semibold text-[20px] leading-[1.2] drop-shadow">
          {moment.title}
        </h3>
        {dateStr && (
          <p className="mt-[2px] font-montserrat text-white/85 text-[13px]">
            {dateStr}
          </p>
        )}
      </div>

      {/* Bottom-right countdown mini-calendar */}
      {num !== null && (
        <div className="absolute right-[16px] bottom-[16px] bg-white rounded-[14px] px-[16px] pt-[14px] pb-[10px] text-center min-w-[78px] shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
          {/* Two calendar binder rings peeking above the card */}
          <span
            className="absolute -top-[5px] left-[22%] w-[4px] h-[10px] rounded-full bg-primary-blue"
            aria-hidden
          />
          <span
            className="absolute -top-[5px] right-[22%] w-[4px] h-[10px] rounded-full bg-primary-blue"
            aria-hidden
          />
          <div className="font-montserrat font-bold text-primary-blue text-[26px] leading-[1]">
            {num}
          </div>
          <div className="mt-[3px] font-montserrat font-medium text-primary-blue text-[12px]">
            {unit}
          </div>
        </div>
      )}
    </button>
  );
}

// "32 Days" → ["32", "Days"], "Today" → [null, "Today"], "5 days ago" → ["5", "days ago"]
function splitCountdown(label: string): [string | null, string] {
  const m = label.match(/^(-?\d+)\s+(.+)$/);
  if (!m) return [null, label];
  return [m[1], m[2]];
}

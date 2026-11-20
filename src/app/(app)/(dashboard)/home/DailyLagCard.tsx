"use client";

import Link from "next/link";

// Daily Lag card — sand background, thin inner outline, a sun glyph + the
// "Daily Lag" header in a monospaced font, then the day's journal prompt
// with an arrow link to the write flow. Prompt is static for now; later we
// can source it from the docking feed's "card_of_the_day" / "hows-life".

function SunIcon() {
  // Uses the designer-supplied sun glyph. Lives in /public so the hashed
  // Next asset URL pipeline doesn't get in the way; renders consistently
  // regardless of dark/light surface behind it.
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

type Props = {
  prompt?: string;
  href?: string;
};

export default function DailyLagCard({
  prompt = "How’s today going?\nWrite about your day.",
  href = "/new-story",
}: Props) {
  return (
    <Link
      href={href}
      className="group block bg-[#E6E3D9] rounded-[6px] shadow-[0_4px_6px_rgba(0,0,0,0.12)] p-[6px] sm:p-[8px] md:p-[10px] hover:shadow-[0_6px_10px_rgba(0,0,0,0.14)] transition-shadow"
      aria-label="Write today’s Daily Lag"
    >
      {/* Inner frame = two stacked bands separated by an edge-to-edge hairline.
          Padding lives on each band, not the frame, so the divider runs the
          full inner width (matching the designer's layout). */}
      <div className="rounded-[4px] border border-black/25 divide-y divide-black/25">
        <div className="flex items-center gap-[10px] pl-[6px] sm:pl-[8px] md:pl-[10px] pr-[14px] sm:pr-[16px] md:pr-[20px] py-[8px] md:py-[10px]">
          <SunIcon />
          <span
            className="text-[#111] text-[15px] md:text-[18px] font-light leading-none"
            style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
          >
            Daily Lag
          </span>
        </div>
        <div className="flex items-end justify-between gap-[14px] px-[18px] sm:px-[22px] md:px-[28px] pt-[52px] md:pt-[72px] pb-[18px] md:pb-[22px] min-h-[140px] md:min-h-[160px]">
          <p className="font-ivy font-normal text-[#111] text-[20px] sm:text-[22px] md:text-[24px] leading-[1.25] whitespace-pre-line">
            {prompt}
          </p>
          <ArrowRight />
        </div>
      </div>
    </Link>
  );
}

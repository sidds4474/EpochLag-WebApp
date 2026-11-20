"use client";

import { useMemo } from "react";

// Images live in /public/home/homescreen/ so Turbopack serves them as
// static files; keeps HMR happy and avoids import resolution issues
// with the jpg assets folder.
const ASSET = "/home/homescreen";

// Home hero banner — the greeting and backdrop both rotate by time of day:
//   5–11  morning   → Homescreen_1 / _2
//   12–16 afternoon → Homescreen_3 / _4
//   17–20 evening   → Homescreen_5 / _6
//   21–04 night     → Homescreen_7 / _8
// The pair member rotates by day-of-year so visitors see the same picture
// across tabs opened within a day but a different one tomorrow.

const SLOTS = {
  morning: {
    greeting: "Good Morning",
    images: [`${ASSET}/Homescreen_1.jpg`, `${ASSET}/Homescreen_2.jpg`] as const,
  },
  afternoon: {
    greeting: "Good Afternoon",
    images: [`${ASSET}/Homescreen_3.jpg`, `${ASSET}/Homescreen_4.jpg`] as const,
  },
  evening: {
    greeting: "Good Evening",
    images: [`${ASSET}/Homescreen_5.jpg`, `${ASSET}/Homescreen_6.jpg`] as const,
  },
  night: {
    greeting: "Good Night",
    images: [`${ASSET}/Homescreen_7.jpg`, `${ASSET}/Homescreen_8.jpg`] as const,
  },
} as const;

type Slot = keyof typeof SLOTS;

function slotForHour(h: number): Slot {
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

type Props = {
  firstName?: string;
};

export default function HeroBanner({ firstName }: Props) {
  const name = (firstName || "").trim() || "there";

  const { greeting, image } = useMemo(() => {
    const now = new Date();
    const slot = SLOTS[slotForHour(now.getHours())];
    const pick = dayOfYear(now) % slot.images.length;
    return { greeting: slot.greeting, image: slot.images[pick] };
  }, []);

  return (
    <section
      className="relative overflow-hidden rounded-[18px] h-[180px] sm:h-[200px] md:h-[210px] bg-[#2a2f21]"
      aria-label="Welcome"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
        loading="eager"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(17,19,15,0.45) 0%, rgba(17,19,15,0.22) 60%, rgba(17,19,15,0.08) 100%)",
        }}
        aria-hidden="true"
      />
      <div className="relative h-full flex flex-col justify-end px-[20px] sm:px-[28px] md:px-[36px] pb-[18px] sm:pb-[20px] md:pb-[24px]">
        <p className="font-montserrat text-white text-[9px] sm:text-[10px] font-semibold tracking-[0.14em] uppercase">
          Your Memories, Together
        </p>
        <h1 className="mt-[6px] md:mt-[8px] font-ivy font-normal text-white text-[20px] sm:text-[24px] md:text-[28px] leading-[1.15]">
          {greeting}, {name}
        </h1>
      </div>
    </section>
  );
}

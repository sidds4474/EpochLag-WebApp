"use client";

import { useRouter } from "next/navigation";
import { urlForScreen } from "../../../lib/onboarding";

type Rings = 1 | 2 | 3;

type Row = {
  key: string;
  title: string;
  body: string;
  rings: Rings;
};

const ROWS: Row[] = [
  {
    key: "story",
    title: "A Story",
    body: "Write, record your voice, add photos or videos. Capture every detail that matters.",
    rings: 1,
  },
  {
    key: "when",
    title: "A Time & Place",
    body: "Ground your memory in when and where it happened.",
    rings: 2,
  },
  {
    key: "people",
    title: "The People",
    body: "Share it with the ones who were there or the ones who deserve to know.",
    rings: 3,
  },
];

export default function WhatsALagPage() {
  const router = useRouter();
  const goNext = () => router.push(urlForScreen("AddMemory"));

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      {/* Mobile + tablet layout (below lg) */}
      <div className="lg:hidden absolute inset-0 overflow-y-auto px-[28px] pt-[max(env(safe-area-inset-top),40px)] pb-[120px]">
        <h1 className="text-center font-ivy font-normal text-[#232323] text-[24px] md:text-[26px] leading-[1.25]">
          What&apos;s a Lag?
        </h1>
        <div className="mt-[32px] md:mt-[40px] flex flex-col gap-[36px] md:gap-[44px]">
          {ROWS.map((row) => (
            <ColumnItem key={row.key} row={row} />
          ))}
        </div>
      </div>

      {/* Desktop (lg+) 3-column grid */}
      <div className="hidden lg:flex absolute inset-0 flex-col items-center justify-center px-[32px] py-[80px] gap-[64px]">
        <h1 className="font-ivy font-normal text-[#232323] text-[28px] xl:text-[32px] leading-[1.2] text-center">
          What&apos;s a Lag?
        </h1>
        <div className="w-full max-w-[960px] grid grid-cols-3 gap-[32px] xl:gap-[48px]">
          {ROWS.map((row) => (
            <ColumnItem key={row.key} row={row} />
          ))}
        </div>
      </div>

      {/* Desktop Next pill */}
      <button
        type="button"
        onClick={goNext}
        className="hidden lg:inline-flex absolute bottom-[32px] right-[32px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[40px] py-[12px] hover:opacity-90 transition-opacity"
      >
        Next
      </button>

      {/* Mobile + tablet Next pill */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-[24px] md:px-[48px] pb-[max(env(safe-area-inset-bottom),24px)] pt-[16px]">
        <button
          type="button"
          onClick={goNext}
          className="w-full max-w-[520px] mx-auto block cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ColumnItem({ row }: { row: Row }) {
  return (
    <div className="flex flex-col items-center text-center">
      <RingsIcon count={row.rings} />
      <h3 className="mt-[16px] md:mt-[18px] font-montserrat font-semibold text-[#232323] text-[16px]">
        {row.title}
      </h3>
      <p className="mt-[8px] font-montserrat text-[13px] md:text-[13.5px] leading-[1.55] text-[#2c2c2c]/80 max-w-[260px]">
        {row.body}
      </p>
    </div>
  );
}

// Concentric circle glyph. Outer halo + mid ring are added by count so
// "A Story" is just the solid dot, "A Time & Place" adds the mid ring,
// "The People" is the full three-ring epoch-lag logo.
function RingsIcon({ count }: { count: Rings }) {
  const SIZES = {
    outer: 56,
    mid: 42,
    core: 26,
  };
  const C_OUTER = "#FCD6A5";
  const C_MID = "#EF9849";
  const C_CORE = "#D95F3B";

  const dim = SIZES.outer;

  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      {count >= 3 && (
        <span
          className="absolute rounded-full"
          style={{
            width: SIZES.outer,
            height: SIZES.outer,
            backgroundColor: C_OUTER,
          }}
        />
      )}
      {count >= 2 && (
        <span
          className="absolute rounded-full"
          style={{
            width: SIZES.mid,
            height: SIZES.mid,
            backgroundColor: C_MID,
          }}
        />
      )}
      <span
        className="absolute rounded-full"
        style={{
          width: SIZES.core,
          height: SIZES.core,
          backgroundColor: C_CORE,
        }}
      />
    </span>
  );
}

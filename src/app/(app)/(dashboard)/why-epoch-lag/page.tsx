"use client";

import { useRouter } from "next/navigation";
import {
  WhyEpochSlideDesktop,
  WhyEpochSlideMobile,
  useWhyEpochCarousel,
  WHY_EPOCH_SLIDE_COUNT,
} from "../../../../components/WhyEpochLagSlides";
import { ChevronLeftIcon } from "../icons";

// Standalone dashboard entry into the "Why Epoch Lag" carousel — mounted
// from the home Resources tile. Reuses the same 3 slides as the onboarding
// flow (see src/app/onboarding/why-epoch-lag/page.tsx) so any copy or
// visual tweak lives in one place. Final-slide "Done" closes back to
// where the user came from instead of advancing onboarding.
export default function DashboardWhyEpochLagPage() {
  const router = useRouter();
  const { idx, isLast, goNext } = useWhyEpochCarousel(() => router.back());

  return (
    <div className="min-h-full flex flex-col bg-primary-cream">
      <div className="shrink-0 px-[16px] md:px-[24px] lg:px-[40px] pt-[12px] pb-[8px] flex items-center gap-[10px]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue hover:bg-black/[0.05] flex items-center justify-center transition-colors"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <SlideDots active={idx} />
      </div>

      {/* Desktop / tablet — centered stage matching the onboarding shell max-width. */}
      <div className="hidden md:flex flex-1 min-h-0 items-start md:items-center justify-center overflow-y-auto px-[24px] pt-[8px] pb-[24px]">
        <div className="w-full max-w-[820px] flex flex-col items-center">
          <WhyEpochSlideDesktop idx={idx} />
          <div className="mt-[24px] flex justify-center">
            <button
              type="button"
              onClick={goNext}
              className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[48px] py-[12px] hover:opacity-90 transition-opacity"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile — sticky bottom Next/Done matches the onboarding layout. */}
      <div className="md:hidden flex-1 flex flex-col min-h-0">
        <WhyEpochSlideMobile idx={idx} />
        <div className="fixed bottom-[80px] left-0 right-0 z-30 px-[24px] pb-[16px] pt-[16px] bg-gradient-to-t from-primary-cream via-primary-cream to-transparent">
          <button
            type="button"
            onClick={goNext}
            className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
          >
            {isLast ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SlideDots({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-[6px]">
      {Array.from({ length: WHY_EPOCH_SLIDE_COUNT }).map((_, i) => (
        <span
          key={i}
          className={`h-[6px] rounded-full transition-all ${
            i === active ? "w-[18px] bg-primary-orange" : "w-[6px] bg-primary-blue/25"
          }`}
        />
      ))}
    </div>
  );
}

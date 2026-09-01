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
// visual tweak lives in one place. Slides render in `compact` mode here
// so the entire slide fits in the viewport without page scroll; onboarding
// keeps its original generous sizing.
export default function DashboardWhyEpochLagPage() {
  const router = useRouter();
  const { idx, isLast, goNext } = useWhyEpochCarousel(() => router.back());

  return (
    <div className="h-full flex flex-col bg-primary-cream overflow-hidden">
      {/* 3-column header: back left, dots dead-centered, spacer right. */}
      <div className="shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-[16px] md:px-[24px] lg:px-[40px] pt-[12px] pb-[8px]">
        <div className="justify-self-start">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-primary-white text-primary-blue shadow-[0_2px_8px_rgba(9,46,74,0.08)] hover:brightness-95 flex items-center justify-center transition-[filter]"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
        </div>
        <SlideDots active={idx} />
        <div className="justify-self-end" aria-hidden />
      </div>

      {/* Desktop / tablet — content is capped by parent height so nothing
          scrolls the page; individual scrollable regions (privacy card)
          handle their own overflow. */}
      <div className="hidden md:flex flex-1 min-h-0 items-center justify-center px-[24px] pb-[16px]">
        <div className="w-full max-w-[820px] flex flex-col items-center">
          <WhyEpochSlideDesktop idx={idx} compact />
          <div className="mt-[16px] flex justify-center">
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

      {/* Mobile — sticky bottom Next/Done. Mobile slide sizes are unchanged
          because the sticky button lives above the slide content. */}
      <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-y-auto">
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

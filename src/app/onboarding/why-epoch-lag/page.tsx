"use client";

import { useRouter } from "next/navigation";
import { urlForScreen } from "../../../lib/onboarding";
import {
  WhyEpochSlideDesktop,
  WhyEpochSlideMobile,
  useWhyEpochCarousel,
} from "../../../components/WhyEpochLagSlides";

export default function WhyEpochLagPage() {
  const router = useRouter();
  const { idx, goNext } = useWhyEpochCarousel(() =>
    router.push(urlForScreen("WhatsALag"))
  );

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      {/* Mobile + tablet carousel content (below lg) */}
      <div className="lg:hidden absolute inset-0 overflow-y-auto">
        <WhyEpochSlideMobile idx={idx} />
      </div>

      {/* Desktop carousel content (lg+) */}
      <div className="hidden lg:flex absolute inset-0 items-center justify-center">
        <WhyEpochSlideDesktop idx={idx} />
      </div>

      {/* Desktop Next pill — bottom-right */}
      <button
        type="button"
        onClick={goNext}
        className="hidden lg:inline-flex absolute bottom-[32px] right-[32px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[40px] py-[12px] hover:opacity-90 transition-opacity"
      >
        Next
      </button>

      {/* Mobile + tablet Next pill — pinned bottom, full width */}
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

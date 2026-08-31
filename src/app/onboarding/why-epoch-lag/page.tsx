"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
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
    <OnboardingShell
      onNext={goNext}
      hideMobileNext
      desktopContent={<WhyEpochSlideDesktop idx={idx} />}
      mobileContent={
        <div className="flex flex-col min-h-screen">
          <WhyEpochSlideMobile idx={idx} />
          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px]">
            <button
              type="button"
              onClick={goNext}
              className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      }
    />
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { urlForScreen } from "../../../lib/onboarding";
import { MobileLogo } from "../../../lib/onboarding/components/OnboardingShell";

const HEADING = "Stories weren’t meant to disappear in a feed";
const BODY =
  "Whether it’s your family history, or sharing important stories amongst friends, we make it easy to preserve and share meaningful memories.";

// Full-bleed welcome: a looping hero video fills the viewport (mobile + desktop),
// dimmed by a dark overlay. The onboarding layout's split-panel chrome is kept
// out of view by rendering this screen as a fixed cover — no persistent cream
// card, no left blurred cover peek. Log in link floats top-right.
export default function WelcomePage() {
  const router = useRouter();
  const goNext = () => router.push(urlForScreen("WhyEpochLag"));

  return (
    <div className="fixed inset-0 z-40 overflow-hidden text-primary-white">
      <video
        src="/videos/Epoch_Lag_Hero.mp4"
        poster="/onboarding/Epoch_Lag_Hero_poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/55" />

      {/* Mobile-only epoch lag wordmark at the top */}
      <div className="md:hidden absolute top-[max(env(safe-area-inset-top),64px)] left-1/2 -translate-x-1/2 z-10">
        <MobileLogo variant="light" className="w-[140px]" />
      </div>

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-[28px] pb-[120px] md:pb-[0px]">
        <h1 className="font-ivy font-normal text-[26px] md:text-[32px] lg:text-[36px] leading-[1.2] max-w-[520px]">
          {HEADING}
        </h1>
        <p className="mt-[16px] font-montserrat text-[14px] md:text-[15px] leading-[1.55] text-primary-white/80 max-w-[460px]">
          {BODY}
        </p>

        {/* Desktop (lg+) inline Next + Log in link */}
        <button
          type="button"
          onClick={goNext}
          className="hidden lg:inline-flex mt-[28px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full w-full max-w-[360px] py-[14px] items-center justify-center hover:opacity-90 transition-opacity"
        >
          Next
        </button>
        <p className="hidden lg:block mt-[14px] font-montserrat text-[14px] text-primary-white/90">
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-[4px] hover:opacity-90"
          >
            Log in
          </Link>
        </p>
      </div>

      {/* Mobile + tablet — pin both to the bottom of the viewport */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-[24px] md:px-[48px] pb-[max(env(safe-area-inset-bottom),24px)] pt-[16px] flex flex-col items-center gap-[14px]">
        <button
          type="button"
          onClick={goNext}
          className="w-full max-w-[420px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
        >
          Next
        </button>
        <p className="font-montserrat text-[14px] md:text-[15px] text-primary-white/90">
          Already have an account?{" "}
          <Link
            href="/login"
            className="underline underline-offset-[4px] hover:opacity-90"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

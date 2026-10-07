"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingShell, MobileLogo } from "../../../lib/onboarding/components/OnboardingShell";
import { urlForScreen } from "../../../lib/onboarding";

const HEADING = "Stories weren't meant to disappear in a feed";
const BODY =
  "Whether it's your family history, or sharing important stories amongst friends, we make it easy to preserve and share meaningful memories.";

const HERO_VIDEO = "/videos/Epoch_Lag_Hero.mp4";
const HERO_POSTER = "/onboarding/Epoch_Lag_Hero_poster.jpg";

// OnboardingShell renders BOTH the desktop and mobile slots (one hidden via
// CSS), so a <video> in each slot made the 17MB hero download *twice* and
// decode in both places (QA #53 — "plays in two places", 45s loads). Gate the
// heavy <video> to the active viewport only; the other slot (and the brief
// pre-mount phase) shows the lightweight poster image.
function useIsDesktop(): boolean | null {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export default function WelcomePage() {
  const router = useRouter();
  const goNext = () => router.push(urlForScreen("WhyEpochLag"));
  const isDesktop = useIsDesktop();

  return (
    <>
      <Link
        href="/login"
        className="fixed top-[12px] right-[16px] z-40 inline-flex items-center min-h-[44px] px-[8px] font-montserrat text-[15px] underline underline-offset-[4px] cursor-pointer hover:opacity-90 text-primary-white md:hidden"
      >
        Log in
      </Link>
      <Link
        href="/login"
        className="hidden md:inline-flex fixed top-[28px] right-[32px] z-40 h-[30px] items-center gap-[8px] rounded-full bg-primary-white border border-primary-blue/10 px-[16px] font-montserrat font-semibold text-[13px] text-primary-blue shadow-[0_6px_20px_rgba(9,46,74,0.08)] hover:bg-warm-cream cursor-pointer transition-colors"
      >
        Log in
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14M13 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <OnboardingShell
      onNext={goNext}
      mobileTheme="dark"
      hideMobileNext
      desktopContent={
        <div className="flex flex-col items-center text-center text-primary-blue">
          <div className="w-full max-w-[720px] h-[360px] rounded-[24px] overflow-hidden bg-primary-blue/5">
            {isDesktop === true ? (
              <video
                src={HERO_VIDEO}
                poster={HERO_POSTER}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="h-full w-full object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={HERO_POSTER}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <h1 className="mt-[28px] font-montserrat font-bold text-[24px] lg:text-[26px] leading-[120%] max-w-[460px]">
            {HEADING}
          </h1>
          <p className="mt-[12px] font-montserrat text-[13px] leading-[160%] text-primary-blue/70 max-w-[500px]">
            {BODY}
          </p>
        </div>
      }
      mobileContent={
        <div className="relative w-full min-h-dvh overflow-hidden">
          {isDesktop === false ? (
            <video
              src={HERO_VIDEO}
              poster={HERO_POSTER}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={HERO_POSTER}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative z-10 flex flex-col items-center min-h-dvh px-[28px] pt-[56px] pb-[110px] text-primary-white text-center">
            <MobileLogo variant="light" className="w-[140px]" />
            <div className="flex-1 flex flex-col justify-center">
              <h1 className="font-montserrat font-bold text-[28px] leading-[120%]">{HEADING}</h1>
              <p className="mt-[16px] font-montserrat text-[14px] leading-[155%] text-primary-white/85 max-w-[300px] mx-auto">
                {BODY}
              </p>
            </div>
          </div>
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
    </>
  );
}

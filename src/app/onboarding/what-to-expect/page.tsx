"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";
import { useTrialPricing } from "../../../lib/subscription/pricing";

type Row = {
  label: string;
  body: string;
};

function useRows(): Row[] {
  const { monthly, annual } = useTrialPricing();
  return [
    {
      label: "Today:",
      body: "Full access to everything, free for 3 months. No credit card, no payment info.",
    },
    {
      label: "Before your trial ends:",
      body: "We'll remind you, in the app and by notification.",
    },
    {
      label: "If you subscribe:",
      body: `${monthly}/month or ${annual}/year, billed through the App Store. Unlimited data storage and Lags, questions, voice and video, sharing with everyone you love.`,
    },
    {
      label: "If you don't:",
      body: "Everything you've made stays saved and yours to revisit. You just won't be able to create or share new Lags until you subscribe and you can do that anytime.",
    },
    {
      label: "Your Lags are yours:",
      body: "Export your Lags and photos whenever you like.",
    },
  ];
}

export default function WhatToExpectPage() {
  const router = useRouter();
  const rows = useRows();

  const goNext = () => {
    trackOnboarding("what_to_expect_completed");
    router.replace("/onboarding/referral-pitch");
  };

  const list = (
    <div className="w-full flex flex-col gap-[16px]">
      {rows.map((r, i) => (
        <ExpectRow key={r.label} index={i + 1} row={r} />
      ))}
    </div>
  );

  const heading = (
    <h1 className="font-montserrat font-bold text-primary-blue text-center text-[20px] md:text-[22px]">
      What to expect
    </h1>
  );

  return (
    <OnboardingShell
      onNext={goNext}
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
          <div className="w-full max-w-[440px] flex flex-col items-center">
            {heading}
            <div className="mt-[24px] w-full">{list}</div>
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[40px] pb-[120px] text-primary-blue">
          <div className="flex-1 flex flex-col items-center">
            {heading}
            <div className="mt-[24px] w-full max-w-[420px]">{list}</div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px] bg-warm-cream">
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

function ExpectRow({ index, row }: { index: number; row: Row }) {
  const num = index.toString().padStart(2, "0");
  return (
    <div className="w-full flex items-start gap-[12px]">
      <span className="shrink-0 mt-[2px] h-[24px] w-[24px] rounded-full bg-primary-blue text-primary-white font-montserrat font-semibold text-[11px] flex items-center justify-center">
        {num}
      </span>
      <p className="font-montserrat text-[13px] text-primary-blue leading-[160%]">
        <span className="font-semibold">{row.label}</span>{" "}
        <span className="text-primary-blue/85">{row.body}</span>
      </p>
    </div>
  );
}

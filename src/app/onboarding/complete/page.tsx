"use client";

import { useRouter } from "next/navigation";
import { trackOnboarding } from "../../../lib/analytics/track";
import { consumePendingReturnTo } from "../../../lib/auth/pendingReturnTo";
import DecorativePolaroids from "../../../components/auth/DecorativePolaroids";

export default function OnboardingCompletePage() {
  const router = useRouter();

  const goExplore = () => {
    trackOnboarding("onboarding_complete_explore");
    // Round-trip signup originators (e.g. public /story/<code>) back to their
    // originating page. consume = one-shot read + remove.
    const returnTo = consumePendingReturnTo();
    router.replace(returnTo || "/home");
  };

  const goCreateAnother = () => {
    trackOnboarding("onboarding_complete_create_lag");
    router.replace("/new-lag");
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      <DecorativePolaroids showOnMobile />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[24px] py-[48px] overflow-y-auto">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <RingDot />
          <h1 className="mt-[16px] font-ivy font-normal text-[#232323] text-[26px] md:text-[28px] lg:text-[32px] leading-[1.15] text-center">
            You&rsquo;re all set!
          </h1>

          <button
            type="button"
            onClick={goExplore}
            className="mt-[28px] w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity"
          >
            Start exploring Epoch Lag
          </button>

          <button
            type="button"
            onClick={goCreateAnother}
            className="mt-[14px] inline-flex items-center gap-[8px] font-montserrat text-[14px] text-[#232323] hover:text-primary-orange transition-colors cursor-pointer"
          >
            <PencilIcon />
            Create another lag
          </button>
        </div>
      </div>
    </div>
  );
}

// Three concentric rings matching the epoch-lag logo, with a white check
// stamped in the orange core.
function RingDot() {
  return (
    <span
      className="relative block h-[72px] w-[72px] rounded-full flex items-center justify-center"
      style={{ backgroundColor: "#FCD6A5" }}
    >
      <span
        className="absolute inset-[9px] rounded-full"
        style={{ backgroundColor: "#EF9849" }}
      />
      <span
        className="absolute inset-[22px] rounded-full"
        style={{ backgroundColor: "#D95F3B" }}
      />
      <svg
        className="relative"
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M5 12l5 5L20 7"
          stroke="white"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function PencilIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

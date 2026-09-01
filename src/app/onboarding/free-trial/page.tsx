"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";
import { startTrial } from "../../../lib/subscription/api";
import { refreshSubscriptionState } from "../../../lib/subscription/state";
import { useAppDispatch } from "../../../lib/onboarding/store";
import { ApiError } from "../../../lib/api/client";

type SampleLag = {
  day: string;
  month: string;
  title: string;
  icon: "heart" | "cake" | "suitcase";
  image: string;
};

const SAMPLE_LAGS: SampleLag[] = [
  {
    day: "25",
    month: "May",
    title: "Michael's Wedding",
    icon: "heart",
    image: "/onboarding/card1-gradient.jpg",
  },
  {
    day: "13",
    month: "Oct",
    title: "Dad's Birthday",
    icon: "cake",
    image: "/onboarding/card2-gradient.jpg",
  },
  {
    day: "03",
    month: "Dec",
    title: "Trip to Canada",
    icon: "suitcase",
    image: "/onboarding/van_img.jpg",
  },
];

const TITLE = "Your 3 months of full access starts now.";
const SUBTITLE = "No credit card. Just keep telling stories.";

export default function FreeTrialOnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [starting, setStarting] = useState(false);
  // Ref-guard because setStarting is async — a fast double-tap on Continue
  // would race the state update and fire /start-trial twice.
  const inFlightRef = useRef(false);

  useEffect(() => {
    trackOnboarding("trial_started");
  }, []);

  const goNext = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStarting(true);
    try {
      await startTrial();
      const reconciled = await refreshSubscriptionState(dispatch);
      if (
        reconciled?.plan === "free_trial" ||
        reconciled?.plan === "unlimited"
      ) {
        trackOnboarding("free_trial_onboarding_completed");
        router.replace("/onboarding/what-to-expect");
        return;
      }
      // BE 200 but reconciler didn't flip — most likely a stale read; ask
      // the user to tap once more rather than silently proceeding on a
      // still-free plan (would immediately hit the paywall next screen).
      toast("Trial started — give it a moment and tap again.");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Already consumed on another device. Refresh so downstream
          // gates read truth, then continue.
          await refreshSubscriptionState(dispatch);
          router.replace("/onboarding/what-to-expect");
          return;
        }
        if (err.isPaywallRedirect) return;
      }
      toast.error("Couldn't start your trial. Please try again.");
    } finally {
      inFlightRef.current = false;
      setStarting(false);
    }
  }, [dispatch, router]);

  const cards = (
    <div className="w-full flex flex-col gap-[14px]">
      {SAMPLE_LAGS.map((lag) => (
        <SampleLagCard key={lag.title} lag={lag} />
      ))}
    </div>
  );

  return (
    <OnboardingShell
      onNext={goNext}
      nextDisabled={starting}
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
          <div className="w-full max-w-[320px] flex flex-col items-center">
            {cards}
            <h1 className="mt-[28px] font-montserrat font-bold text-primary-blue text-center leading-[130%] text-[26px]">
              Your 3 months of full
              <br />
              access starts now.
            </h1>
            <p className="mt-[8px] font-montserrat text-[12px] text-primary-blue/80 text-center">
              {SUBTITLE}
            </p>
          </div>
        </div>
      }
      mobileContent={
        <div className="relative flex flex-col min-h-screen">
          <div
            className="absolute inset-x-0 top-0 h-[68vh] bg-cover bg-center"
            style={{ backgroundImage: "url('/onboarding/coverimage.png')" }}
          />
          <div className="absolute inset-x-0 top-0 h-[68vh] bg-black/10" />
          <div className="h-[68vh] shrink-0" />
          <div className="relative flex-1 bg-warm-cream px-[24px] pt-[40px] pb-[24px] text-primary-blue">
            <h1 className="font-montserrat font-bold text-[30px] text-center leading-[130%]">
              Your 3 months of full
              <br />
              access starts now.
            </h1>
            <p className="mt-[12px] font-montserrat text-[15px] text-primary-blue/80 text-center">
              {SUBTITLE}
            </p>
            <button
              type="button"
              onClick={goNext}
              disabled={starting}
              className="mt-[24px] w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {starting ? "Starting…" : "Continue"}
            </button>
          </div>
        </div>
      }
    />
  );
}

function SampleLagCard({ lag }: { lag: SampleLag }) {
  return (
    <div className="w-full bg-primary-white rounded-[14px] pl-[14px] pr-[6px] py-[6px] flex items-stretch gap-[10px] shadow-[0_4px_16px_rgba(9,46,74,0.06)]">
      <div className="flex flex-col items-center justify-center min-w-[32px] py-[4px]">
        <span className="font-montserrat font-medium text-primary-blue text-[22px] leading-[110%]">
          {lag.day}
        </span>
        <span className="font-montserrat text-primary-blue/70 text-[12px] leading-[110%] mt-[2px]">
          {lag.month}
        </span>
      </div>
      <div className="w-px bg-primary-blue/10 my-[6px]" />
      <div className="flex-1 flex flex-col items-start justify-center gap-[4px] py-[6px]">
        <IconBadge kind={lag.icon} />
        <span className="font-montserrat text-primary-blue text-[12px]">
          {lag.title}
        </span>
      </div>
      <div className="shrink-0 w-[58px] rounded-r-[10px] overflow-hidden bg-primary-blue/5">
        <img
          src={lag.image}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

function IconBadge({ kind }: { kind: SampleLag["icon"] }) {
  return (
    <span className="shrink-0 h-[26px] w-[26px] rounded-full bg-primary-blue/5 text-primary-blue flex items-center justify-center">
      {kind === "heart" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.65 12 21 12 21z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {kind === "cake" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 21h16M5 21v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M8 13V9m4 4V9m4 4V9M8 6.5a1 1 0 1 0 0-.001M12 6.5a1 1 0 1 0 0-.001M16 6.5a1 1 0 1 0 0-.001"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
      {kind === "suitcase" && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );
}

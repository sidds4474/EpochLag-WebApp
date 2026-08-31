"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";

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
    image: "/onboarding/girl-dad.png",
  },
  {
    day: "13",
    month: "Oct",
    title: "Dad's Birthday",
    icon: "cake",
    image: "/onboarding/kid-cake.jpg",
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

  const goNext = () => {
    trackOnboarding("free_trial_onboarding_completed");
    router.replace("/onboarding/what-to-expect");
  };

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
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
          <div className="w-full max-w-[400px] flex flex-col items-center">
            {cards}
            <h1 className="mt-[36px] font-montserrat font-bold text-primary-blue text-center leading-[130%] text-[24px]">
              Your 3 months of full
              <br />
              access starts now.
            </h1>
            <p className="mt-[10px] font-montserrat text-[13px] text-primary-blue/80 text-center">
              {SUBTITLE}
            </p>
          </div>
        </div>
      }
      mobileContent={
        <div className="relative flex flex-col min-h-screen">
          <div
            className="absolute inset-x-0 top-0 h-[58vh] bg-cover bg-center"
            style={{ backgroundImage: "url('/onboarding/coverimage.png')" }}
          />
          <div className="absolute inset-x-0 top-0 h-[58vh] bg-black/10" />
          <div className="relative flex-1" />
          <div className="relative bg-warm-cream rounded-t-[28px] px-[24px] pt-[32px] pb-[24px] text-primary-blue">
            <h1 className="font-montserrat font-bold text-[22px] text-center leading-[130%]">
              Your 3 months of full
              <br />
              access starts now.
            </h1>
            <p className="mt-[12px] font-montserrat text-[13px] text-primary-blue/80 text-center">
              {SUBTITLE}
            </p>
            <button
              type="button"
              onClick={goNext}
              className="mt-[24px] w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        </div>
      }
    />
  );
}

function SampleLagCard({ lag }: { lag: SampleLag }) {
  return (
    <div className="w-full bg-primary-white rounded-[18px] pl-[16px] pr-[8px] py-[8px] flex items-center gap-[14px] shadow-[0_4px_16px_rgba(9,46,74,0.06)]">
      <div className="flex flex-col items-center min-w-[36px]">
        <span className="font-montserrat font-bold text-primary-blue text-[22px] leading-[110%]">
          {lag.day}
        </span>
        <span className="font-montserrat text-primary-blue/70 text-[12px] leading-[110%] mt-[2px]">
          {lag.month}
        </span>
      </div>
      <div className="h-[42px] w-px bg-primary-blue/10" />
      <div className="flex-1 flex items-center gap-[10px]">
        <IconBadge kind={lag.icon} />
        <span className="font-montserrat text-primary-blue text-[14px]">
          {lag.title}
        </span>
      </div>
      <div className="h-[56px] w-[64px] rounded-[12px] overflow-hidden bg-primary-blue/5">
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

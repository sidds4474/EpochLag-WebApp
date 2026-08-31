"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";
import SuccessCelebration from "../../../components/SuccessCelebration";

type StartCard = {
  label: string;
  title: string;
  image: string;
  href: string;
  event: string;
};

const CARDS: StartCard[] = [
  {
    label: "START HERE",
    title: "Create another lag",
    image: "/onboarding/advice.png",
    href: "/new-lag",
    event: "onboarding_complete_create_lag",
  },
  {
    label: "START HERE",
    title: "Add Moments to my calendar",
    image: "/onboarding/card1-gradient.jpg",
    href: "/moments/new",
    event: "onboarding_complete_add_moments",
  },
];

export default function OnboardingCompletePage() {
  const router = useRouter();

  const goExplore = () => {
    trackOnboarding("onboarding_complete_explore");
    router.replace("/home");
  };

  const goCard = (card: StartCard) => {
    trackOnboarding(card.event);
    router.replace(card.href);
  };

  const cards = (
    <div className="w-full flex flex-col gap-[14px]">
      {CARDS.map((c) => (
        <StartHereCard key={c.title} card={c} onClick={() => goCard(c)} />
      ))}
    </div>
  );

  const cta = (
    <button
      type="button"
      onClick={goExplore}
      className="w-full max-w-[420px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity"
    >
      Start exploring Epoch Lag
    </button>
  );

  return (
    <OnboardingShell
      hideDesktopNext
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[88vh]">
          <div className="w-full max-w-[440px] flex flex-col items-center">
            <SuccessCelebration
              title="You&rsquo;re all set!"
              titleClassName="font-montserrat font-bold text-primary-blue text-[24px] leading-tight text-center"
              titleMarginTop={0}
              childrenClassName="w-full mt-[28px]"
            >
              <div className="w-full flex flex-col items-center gap-[28px]">
                {cards}
                <div className="w-full flex justify-center">{cta}</div>
              </div>
            </SuccessCelebration>
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[24px] pb-[32px] text-primary-blue">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[380px] flex flex-col items-center">
              <SuccessCelebration
                title="You&rsquo;re all set!"
                titleClassName="font-montserrat font-bold text-primary-blue text-[24px] leading-tight text-center"
                illustrationHeight={200}
                titleMarginTop={0}
                childrenClassName="w-full mt-[24px]"
              >
                {cards}
              </SuccessCelebration>
            </div>
          </div>
          <div className="w-full max-w-[380px] mx-auto mt-[24px] flex justify-center">
            {cta}
          </div>
        </div>
      }
    />
  );
}

function StartHereCard({
  card,
  onClick,
}: {
  card: StartCard;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full text-left bg-primary-white rounded-[16px] p-[8px] pr-[16px] flex items-center gap-[14px] shadow-[0_4px_16px_rgba(9,46,74,0.06)] cursor-pointer hover:shadow-[0_6px_20px_rgba(9,46,74,0.08)] transition-shadow"
    >
      <div className="h-[72px] w-[72px] rounded-l-[10px] overflow-hidden bg-primary-blue/5 shrink-0">
        <img src={card.image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex-1 min-w-0 pr-[28px] flex flex-col justify-center">
        <p className="font-montserrat font-medium text-primary-orange text-[11px] tracking-[0.08em]">
          {card.label}
        </p>
        <p className="mt-[4px] font-montserrat font-medium text-primary-blue text-[15px] leading-[130%]">
          {card.title}
        </p>
      </div>
      <span className="absolute bottom-[10px] right-[10px] h-[26px] w-[26px] rounded-full text-primary-white flex items-center justify-center shadow-[0_2px_6px_rgba(239,152,73,0.35)]" style={{ backgroundColor: "#FFD9AA" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14M13 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";

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
    image: "/onboarding/childhood.jpg",
    href: "/new-lag",
    event: "onboarding_complete_create_lag",
  },
  {
    label: "START HERE",
    title: "Add Moments to my calendar",
    image: "/onboarding/girl-dad.png",
    href: "/moments",
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

  const badge = (
    <div className="relative h-[88px] w-[88px] flex items-center justify-center">
      <span className="absolute inset-0 rounded-full" style={{ backgroundColor: "#F1B978", opacity: 0.35 }} />
      <span
        className="absolute inset-[10px] rounded-full"
        style={{ backgroundColor: "#F1B978", opacity: 0.55 }}
      />
      <span className="relative h-[52px] w-[52px] rounded-full bg-primary-orange text-primary-white flex items-center justify-center shadow-[0_4px_14px_rgba(239,152,73,0.35)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5L20 7"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );

  const title = (
    <h1 className="mt-[18px] font-montserrat font-bold text-primary-blue text-center text-[24px]">
      You&apos;re all set!
    </h1>
  );

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
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
          <div className="w-full max-w-[440px] flex flex-col items-center">
            {badge}
            {title}
            <div className="mt-[28px] w-full">{cards}</div>
            <div className="mt-[32px] w-full flex justify-center">{cta}</div>
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[40px] pb-[32px] text-primary-blue">
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full max-w-[380px] flex flex-col items-center">
              {badge}
              {title}
              <div className="mt-[24px] w-full">{cards}</div>
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
      className="w-full text-left bg-primary-white rounded-[16px] p-[10px] flex items-center gap-[14px] shadow-[0_4px_16px_rgba(9,46,74,0.06)] cursor-pointer hover:shadow-[0_6px_20px_rgba(9,46,74,0.08)] transition-shadow"
    >
      <div className="h-[68px] w-[80px] rounded-[10px] overflow-hidden bg-primary-blue/5 shrink-0">
        <img src={card.image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-montserrat font-semibold text-primary-orange text-[11px] tracking-[0.08em]">
          {card.label}
        </p>
        <p className="mt-[4px] font-montserrat font-semibold text-primary-blue text-[15px] leading-[130%]">
          {card.title}
        </p>
      </div>
      <span className="shrink-0 h-[28px] w-[28px] rounded-full bg-primary-orange/20 text-primary-orange flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14M13 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

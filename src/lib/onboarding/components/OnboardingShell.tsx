"use client";

import Link from "next/link";
import Image from "next/image";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import LogoLight from "../../../assets/images/logo-light.webp";
import LogoDark from "../../../assets/images/logo-dark.webp";

// Provider set by src/app/onboarding/layout.tsx. When present, the shell
// skips its own outer chrome (fixed cover panel, cream section, logo) and
// slots content into the persistent layout instead. When absent (e.g.
// pages under src/app/(auth)/), the shell renders full standalone chrome
// so it still looks correct.
const PersistentChromeContext = createContext(false);

export function PersistentChromeProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PersistentChromeContext.Provider value={true}>
      {children}
    </PersistentChromeContext.Provider>
  );
}

type OnboardingShellProps = {
  desktopContent: ReactNode;
  mobileContent: ReactNode;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  hideDesktopNext?: boolean;
  hideMobileNext?: boolean;
  mobileTheme?: "cream" | "dark";
};

export function OnboardingShell(props: OnboardingShellProps) {
  const chromeProvided = useContext(PersistentChromeContext);
  return chromeProvided ? <SlimShell {...props} /> : <StandaloneShell {...props} />;
}

// Slim shell — used when the layout provides the persistent frame.
function SlimShell({
  desktopContent,
  mobileContent,
  onNext,
  nextDisabled,
  nextLabel = "Next",
  hideDesktopNext,
  hideMobileNext,
  mobileTheme = "cream",
}: OnboardingShellProps) {
  return (
    <>
      <div className="hidden md:flex md:flex-1 md:flex-col">
        <div className="flex-1 flex md:items-start lg:items-center justify-center md:pt-[6vh] lg:pt-0">
          <div className="w-full max-w-[820px]">{desktopContent}</div>
        </div>
        {!hideDesktopNext && (
          <div className="flex justify-end">
            <NextPill onClick={onNext} disabled={nextDisabled} label={nextLabel} />
          </div>
        )}
      </div>
      <div
        className={`md:hidden min-h-screen w-full flex flex-col ${
          mobileTheme === "cream" ? "bg-warm-cream" : "bg-primary-black"
        }`}
      >
        <div className="flex-1 flex flex-col">{mobileContent}</div>
        {!hideMobileNext && (
          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px]">
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Standalone shell — full chrome, used when there's no persistent layout
// (auth pages under src/app/(auth)/).
function StandaloneShell({
  desktopContent,
  mobileContent,
  onNext,
  nextDisabled,
  nextLabel = "Next",
  hideDesktopNext,
  hideMobileNext,
  mobileTheme = "cream",
}: OnboardingShellProps) {
  return (
    <>
      <main className="hidden md:flex min-h-screen w-full bg-warm-cream items-stretch">
        <div className="sticky top-0 self-start relative md:w-[34%] lg:w-[44%] xl:w-[46%] h-screen overflow-hidden">
          <div className="absolute inset-0 scale-110">
            <Image
              src="/onboarding/coverimage.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 46vw, (min-width: 1024px) 44vw, (min-width: 768px) 42vw, 0vw"
              className="object-cover object-center blur-[24px]"
            />
          </div>
          <div className="absolute inset-0 bg-black/10" />
          <Link href="/" className="absolute top-[56px] left-[56px] z-10 block cursor-pointer w-fit">
            <img
              src={LogoLight.src}
              alt="Epoch Lag"
              className="w-[130px] lg:w-[145px] h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
            />
          </Link>
        </div>
        <section className="relative flex-1 bg-warm-cream md:rounded-l-[48px] md:-ml-[48px] flex flex-col px-[16px] lg:px-[24px] pt-[32px] pb-[20px] lg:pb-[24px] min-h-screen">
          <div className="flex-1 flex md:items-start lg:items-center justify-center md:pt-[6vh] lg:pt-0">
            <div className="w-full max-w-[820px]">{desktopContent}</div>
          </div>
          {!hideDesktopNext && (
            <div className="flex justify-end">
              <NextPill onClick={onNext} disabled={nextDisabled} label={nextLabel} />
            </div>
          )}
        </section>
      </main>
      <main
        className={`md:hidden min-h-screen w-full flex flex-col ${
          mobileTheme === "cream" ? "bg-warm-cream" : "bg-primary-black"
        }`}
      >
        <div className="flex-1 flex flex-col">{mobileContent}</div>
        {!hideMobileNext && (
          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px]">
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nextLabel}
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export function NextPill({
  onClick,
  disabled,
  label = "Next",
}: {
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-medium text-[15px] rounded-full px-[48px] py-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_6px_20px_rgba(239,152,73,0.35)]"
    >
      {label}
    </button>
  );
}

export function MobileLogo({ variant = "dark", className = "" }: { variant?: "dark" | "light"; className?: string }) {
  const src = variant === "light" ? LogoLight.src : LogoDark.src;
  return (
    <img
      src={src}
      alt="Epoch Lag"
      className={`w-[140px] h-auto object-contain ${className}`}
    />
  );
}

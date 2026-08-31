"use client";

import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import LogoLight from "../../assets/images/logo-light.webp";
import { PersistentChromeProvider } from "../../lib/onboarding/components/OnboardingShell";

// Persistent onboarding chrome (Option B).
//
// Layout owns EVERY piece of visual chrome that repeats across screens:
//   - Fixed left cover panel + logo (desktop/tablet only)
//   - Right cream section with rounded curve (desktop/tablet only)
// so route changes only swap the inner content. This eliminates the white
// flash caused by the cream frame unmounting between routes.
//
// Mobile intentionally opts out of the fade+slide (transition duration = 0)
// since the mobile page owns its own full-screen frame with its own bg —
// animating it would flash the underlying layout bg between routes.

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {/* Fixed left cover — decorative, pointer-events off. */}
      <aside
        className="hidden md:block fixed left-0 top-0 h-screen md:w-[34%] lg:w-[44%] xl:w-[46%] z-0 overflow-hidden pointer-events-none"
        aria-hidden
      >
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
      </aside>
      <Link
        href="/"
        className="hidden md:block fixed z-20 top-[56px] left-[56px] cursor-pointer w-fit"
      >
        <img
          src={LogoLight.src}
          alt="Epoch Lag"
          className="w-[130px] lg:w-[145px] h-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
        />
      </Link>

      {/* Persistent frame. Every class is md:-gated so mobile stays
          passthrough (no chrome, no bg). */}
      <main className="min-h-screen w-full md:flex md:bg-warm-cream md:items-stretch">
        <div
          className="hidden md:block md:w-[34%] lg:w-[44%] xl:w-[46%] shrink-0"
          aria-hidden
        />
        <section className="relative md:flex-1 md:min-h-screen md:bg-warm-cream md:rounded-l-[48px] md:-ml-[48px] md:flex md:flex-col md:px-[16px] lg:px-[24px] md:pt-[32px] md:pb-[20px] lg:pb-[24px] z-10">
          <PersistentChromeProvider>{children}</PersistentChromeProvider>
        </section>
      </main>
    </>
  );
}

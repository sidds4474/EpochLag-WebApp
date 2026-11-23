"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import LogoDark from "../assets/images/logo-dark.webp";
import PolaroidImg1 from "../assets/images/newimgs/polaroidImg1.jpg";
import PolaroidImg2 from "../assets/images/newimgs/polaroidImg2.jpg";
import PolaroidImg3 from "../assets/images/newimgs/polaroidImg3.png";
import { PRIVACY_SECTIONS } from "../lib/privacy/content";

// Shared 3-slide "Why Epoch Lag" carousel used by:
//   • /onboarding/why-epoch-lag — wrapped in OnboardingShell, Next on the
//     final slide advances the onboarding flow to WhatsALag.
//   • /why-epoch-lag (dashboard) — opened from the home Resources tile,
//     Next on the final slide closes the screen (router.back()).
//
// Both entry points render the exact same slide content — only the outer
// chrome and finish behavior differ.

export const WHY_EPOCH_SLIDE_COUNT = 3;

export type WhyEpochSlideIndex = 0 | 1 | 2;

// `compact` shrinks the desktop slide dimensions (logo, polaroid cluster,
// timeline, privacy card height) so the dashboard entry fits in a viewport
// without scrolling. Onboarding leaves this false and keeps its original
// generous sizing so that flow is untouched.
export function WhyEpochSlideDesktop({
  idx,
  compact = false,
}: {
  idx: WhyEpochSlideIndex;
  compact?: boolean;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {idx === 0 && <SlideIntroDesktop compact={compact} />}
        {idx === 1 && <SlideFeaturesDesktop compact={compact} />}
        {idx === 2 && <SlidePrivacyDesktop compact={compact} />}
      </motion.div>
    </AnimatePresence>
  );
}

export function WhyEpochSlideMobile({
  idx,
  compact = false,
}: {
  idx: WhyEpochSlideIndex;
  compact?: boolean;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex-1"
      >
        {idx === 0 && <SlideIntroMobile compact={compact} />}
        {idx === 1 && <SlideFeaturesMobile compact={compact} />}
        {idx === 2 && <SlidePrivacyMobile compact={compact} />}
      </motion.div>
    </AnimatePresence>
  );
}

// Convenience hook for callers that just need idx + advance behavior.
export function useWhyEpochCarousel(onFinish: () => void) {
  const [idx, setIdx] = useState<WhyEpochSlideIndex>(0);
  const isLast = idx === WHY_EPOCH_SLIDE_COUNT - 1;
  const goNext = () => {
    if (isLast) onFinish();
    else setIdx((i) => ((i + 1) as WhyEpochSlideIndex));
  };
  return { idx, isLast, goNext };
}

/* ------------------------------------------------------------------ */
/* Slide 1 — Intro                                                     */
/* ------------------------------------------------------------------ */

const INTRO_BODY =
  "The intentional pause between eras, not rushing into the next epoch, but lingering to absorb lessons, memories, or meaning from the last.";

function SlideIntroDesktop({ compact = false }: { compact?: boolean }) {
  // Compact variant (dashboard entry) keeps the old centered layout. Full
  // variant (onboarding) uses the Figma 2-column design: polaroid cluster
  // on the left, epoch lag wordmark + body on the right.
  if (compact) {
    return (
      <div className="flex flex-col items-center text-center text-[#232323] px-[24px]">
        <img src={LogoDark.src} alt="Epoch Lag" className="w-[120px] h-auto object-contain" />
        <p className="mt-[12px] font-montserrat text-[13px] leading-[150%] text-[#2c2c2c]/80 max-w-[440px]">
          {INTRO_BODY}
        </p>
        <PolaroidCluster compact={compact} />
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-row items-center justify-between px-[6vw] xl:px-[8vw] 2xl:px-[10vw] gap-[48px]">
      <div className="flex-1 flex items-center justify-center">
        <IntroCluster />
      </div>
      <div className="flex-1 flex flex-col items-start text-left max-w-[520px]">
        <img
          src={LogoDark.src}
          alt="Epoch Lag"
          className="w-[130px] lg:w-[140px] xl:w-[150px] h-auto object-contain"
        />
        <p className="mt-[16px] font-montserrat text-[12.5px] lg:text-[13px] xl:text-[13.5px] leading-[1.55] text-[#2c2c2c]/80 max-w-[360px]">
          {INTRO_BODY}
        </p>
      </div>
    </div>
  );
}

// Stand-alone cluster for the onboarding intro slide. Sized in percentages
// so it fills the left column on wide viewports without feeling restricted.
function IntroCluster() {
  return (
    <div className="relative w-[340px] h-[340px] xl:w-[380px] xl:h-[380px]">
      <div
        className="absolute top-[18%] left-[42%] -translate-x-1/2 rounded-full"
        style={{
          width: "62%",
          height: "62%",
          backgroundColor: "#E6E3D9",
        }}
      />
      <div className="absolute top-[18%] left-[6%] -rotate-[6deg] w-[52%]">
        <IntroPolaroid src="/onboarding/kids-car.jpg" />
      </div>
      <div className="absolute bottom-[4%] right-[32%] rotate-[8deg] w-[40%]">
        <IntroPolaroid src="/onboarding/van_img.jpg" />
      </div>
    </div>
  );
}

function IntroPolaroid({ src }: { src: string }) {
  return (
    <div className="bg-white p-[6px] shadow-[0_6px_18px_rgba(0,0,0,0.18)] aspect-square">
      <div className="w-full h-full overflow-hidden bg-[#D9D9D9]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

function SlideIntroMobile({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-center text-[#232323] px-[32px] pt-[max(env(safe-area-inset-top),24px)] pb-[120px] min-h-dvh gap-[24px]">
      <div className="flex flex-col items-center">
        <img
          src={LogoDark.src}
          alt="Epoch Lag"
          className="w-[150px] md:w-[170px] h-auto object-contain"
        />
        <p className="mt-[16px] md:mt-[18px] font-montserrat text-[14px] md:text-[15px] leading-[1.55] text-[#2c2c2c]/80 max-w-[320px] md:max-w-[420px]">
          {INTRO_BODY}
        </p>
      </div>
      <PolaroidCluster mobile />
    </div>
  );
}

function PolaroidCluster({
  mobile = false,
  compact = false,
}: {
  mobile?: boolean;
  compact?: boolean;
}) {
  const wrap = mobile
    ? "w-full h-[300px] mt-[24px]"
    : compact
      ? "w-full h-[240px] mt-[20px]"
      : "w-full h-[320px] mt-[40px]";
  const circle = mobile
    ? "w-[220px] h-[220px] top-[8%]"
    : compact
      ? "w-[170px] h-[170px] top-[8%]"
      : "w-[220px] h-[220px] top-[10%]";
  const bigSize = mobile ? "md" : compact ? "md" : "lg";
  const smallSize = mobile ? "sm" : compact ? "sm" : "sm";
  return (
    <div className={`relative ${wrap}`}>
      <div className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-[#E6E3D9] ${circle}`} />
      <div className="absolute left-1/2 top-[6%] -translate-x-[70%] -rotate-[6deg]">
        <Polaroid src="/onboarding/kids-car.jpg" size={bigSize} />
      </div>
      <div className={`absolute left-1/2 ${mobile ? "top-[48%]" : "top-[52%]"} translate-x-[-6%] rotate-[8deg]`}>
        <Polaroid src="/onboarding/van_img.jpg" size={smallSize} objectPosition="bottom" />
      </div>
    </div>
  );
}

function Polaroid({
  src,
  size,
  objectPosition = "center",
}: {
  src: string;
  size: "xl" | "lg" | "md" | "sm";
  objectPosition?: string;
}) {
  // Symmetric padding on every side (no bottom-heavy polaroid lip) — the
  // inner photo fills whatever's left via flex-1.
  const box = {
    xl: "w-[240px] h-[220px] p-[12px]",
    lg: "w-[190px] h-[170px] p-[10px]",
    md: "w-[180px] h-[170px] p-[10px]",
    sm: "w-[140px] h-[130px] p-[8px]",
  }[size];
  return (
    <div className={`${box} bg-primary-white rounded-[6px] shadow-[0_8px_24px_rgba(9,46,74,0.18)] flex`}>
      <div className="w-full flex-1 overflow-hidden">
        <img src={src} alt="" className="w-full h-full object-cover" style={{ objectPosition }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 2 — Features + timeline                                       */
/* ------------------------------------------------------------------ */

const FEATURE_BULLETS = [
  "Share stories with important friends and family",
  "Pass stories down to future generations",
  "Create shared stories and albums",
  "Preserve voices and memories",
  "Keep everything completely private",
];

type TimelineItem = {
  day: string;
  month: string;
  title: string;
  thumb: string;
  yearLabel?: string;
};

const TIMELINE: TimelineItem[] = [
  { day: "30", month: "Oct", title: "What is your best memory with your father?", thumb: "/onboarding/girl-dad.png" },
  { day: "13", month: "Sept", title: "What is your best childhood memory?", thumb: "/onboarding/kid-cake.jpg" },
  { day: "14", month: "Nov", title: "Grandpa's favorite story", thumb: "/onboarding/childhood.jpg", yearLabel: "2024" },
];

function SlideFeaturesDesktop({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center text-[#232323] px-[16px]">
        <h1 className="text-center font-ivy font-normal text-[20px] leading-[1.25] max-w-[320px]">
          Built for the stories behind the photos
        </h1>
        <ul className="mt-[16px] flex flex-col gap-[8px] self-center">
          {FEATURE_BULLETS.map((b) => (
            <li key={b} className="flex items-center gap-[10px] font-montserrat text-[12.5px] text-[#2c2c2c]/90">
              <CheckDot /> <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-[20px]">
          <FeaturePolaroidRow />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-row items-center pl-[2vw] pr-[6vw] xl:pr-[8vw] gap-[48px]">
      <div className="shrink-0 flex items-center justify-start">
        <FeaturePolaroidStack />
      </div>
      <div className="flex-1 flex flex-col items-start text-left max-w-[520px]">
        <h1 className="font-ivy font-normal text-[#232323] text-[24px] lg:text-[26px] xl:text-[28px] leading-[1.2] max-w-[380px]">
          Built for the stories behind the photos
        </h1>
        <ul className="mt-[22px] flex flex-col gap-[12px]">
          {FEATURE_BULLETS.map((b) => (
            <li
              key={b}
              className="flex items-center gap-[12px] font-montserrat text-[13px] lg:text-[13.5px] text-[#232323]"
            >
              <CheckDot />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SlideFeaturesMobile({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center text-[#232323] px-[28px] pt-[max(env(safe-area-inset-top),32px)] pb-[120px] min-h-dvh gap-[88px]">
      <div className="flex flex-col items-center gap-[20px]">
        <h1 className="text-center font-ivy font-normal text-[22px] md:text-[24px] leading-[1.25] max-w-[320px]">
          Built for the stories behind the photos
        </h1>
        <ul className="flex flex-col gap-[12px] self-center max-w-[340px]">
          {FEATURE_BULLETS.map((b) => (
            <li
              key={b}
              className="flex items-center gap-[12px] font-montserrat text-[14px] md:text-[15px] leading-[1.35] text-[#232323]"
            >
              <CheckDot />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      <FeaturePolaroidRow />
    </div>
  );
}

// Three polaroids stacked vertically with alternating rotations for the
// desktop left column.
function FeaturePolaroidStack() {
  const items: Array<{ src: string; rotate: string }> = [
    { src: PolaroidImg2.src, rotate: "rotate-[6deg]" },
    { src: PolaroidImg3.src, rotate: "-rotate-[5deg]" },
    { src: PolaroidImg1.src, rotate: "rotate-[7deg]" },
  ];
  return (
    <div className="relative flex flex-col items-center gap-[24px]">
      {items.map((it, i) => (
        <div
          key={i}
          className={`${it.rotate} w-[200px] h-[200px] xl:w-[220px] xl:h-[220px]`}
        >
          <IntroPolaroid src={it.src} />
        </div>
      ))}
    </div>
  );
}

// Three polaroids in a horizontal row for the mobile footer.
function FeaturePolaroidRow() {
  const items: Array<{ src: string; rotate: string }> = [
    { src: PolaroidImg3.src, rotate: "-rotate-[10deg]" },
    { src: PolaroidImg1.src, rotate: "rotate-[6deg]" },
    { src: PolaroidImg2.src, rotate: "-rotate-[8deg]" },
  ];
  return (
    <div className="flex items-center justify-center gap-[36px]">
      {items.map((it, i) => (
        <div
          key={i}
          className={`${it.rotate} w-[170px] h-[170px] md:w-[190px] md:h-[190px]`}
        >
          <IntroPolaroid src={it.src} />
        </div>
      ))}
    </div>
  );
}

function CheckDot() {
  return (
    <span className="inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#1C1C1C] text-white">
      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function Timeline({
  items,
  mobile = false,
  compact = false,
}: {
  items: TimelineItem[];
  mobile?: boolean;
  compact?: boolean;
}) {
  const wrap = mobile
    ? "mt-[36px] w-full max-w-[300px]"
    : compact
      ? "mt-[16px] w-full max-w-[280px]"
      : "mt-[28px] w-full max-w-[280px]";
  return (
    <div className={`relative mx-auto ${wrap}`}>
      <div
        className={`absolute rounded-full bg-[#E6E3D9] pointer-events-none ${
          mobile
            ? "left-[-14px] top-[-24px] w-[300px] h-[300px]"
            : "left-[0px] top-[24px] w-[220px] h-[220px] lg:left-[-22px] lg:w-[260px] lg:h-[260px]"
        }`}
      />
      <div className={`relative z-10 pl-[28px] ${compact ? "pb-[24px]" : "pb-[80px]"}`}>
        <div className="absolute left-[8px] top-0 bottom-0 w-px bg-primary-blue/70" />
        {items.map((it, i) => (
          <div key={i}>
            {it.yearLabel && (
              <div className="relative py-[10px] pl-[2px]">
                <span className="font-montserrat text-[12px] text-primary-blue/80">{it.yearLabel}</span>
              </div>
            )}
            <div className="relative py-[8px]">
              {i === 0 ? (
                <span className="absolute -left-[24px] top-[50%] -translate-y-1/2 h-[10px] w-[10px] rounded-full bg-primary-orange border-[1.5px] border-primary-blue" />
              ) : (
                <span className="absolute -left-[24px] top-[50%] -translate-y-1/2 h-[10px] w-[10px] rounded-full bg-primary-white border-[1.5px] border-primary-blue" />
              )}
              <TimelineCard item={it} mobile={mobile} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineCard({ item, mobile = false }: { item: TimelineItem; mobile?: boolean }) {
  const dayCol = mobile ? "w-[56px]" : "w-[42px]";
  const daySize = mobile ? "text-[28px]" : "text-[19px]";
  const monthSize = mobile ? "text-[13px]" : "text-[11px]";
  const title = mobile ? "text-[14px]" : "text-[11px]";
  const thumb = mobile ? "h-[64px] w-[64px]" : "h-[48px] w-[48px]";
  const pad = mobile ? "px-[14px] py-[12px]" : "px-[10px] py-[8px]";
  return (
    <div className={`flex items-stretch gap-[12px] bg-primary-white rounded-[12px] ${pad} shadow-[0_5px_16px_rgba(9,46,74,0.10)]`}>
      <div className={`text-center leading-none shrink-0 self-center ${dayCol}`}>
        <div className={`font-montserrat font-medium ${daySize} text-primary-blue`}>{item.day}</div>
        <div className={`mt-[3px] font-montserrat ${monthSize} text-primary-blue/70`}>{item.month}</div>
      </div>
      <div className="flex-1 min-w-0 self-center">
        <p className={`font-montserrat ${title} leading-[135%] text-primary-blue`}>{item.title}</p>
      </div>
      <div className={`${thumb} rounded-[8px] overflow-hidden shrink-0 self-center`}>
        <img src={item.thumb} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slide 3 — Privacy                                                   */
/* ------------------------------------------------------------------ */

function SlidePrivacyDesktop({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full max-w-[720px] mx-auto flex flex-col text-[#232323] px-[32px]">
      <h1 className="font-ivy font-normal text-[26px] lg:text-[28px] xl:text-[30px] leading-[1.25]">
        Epoch Lag is secure and private, always.
      </h1>
      <p className="mt-[8px] font-montserrat text-[13px] lg:text-[13.5px] leading-[1.6] text-[#2c2c2c]/70">
        We take your privacy seriously. We will never sell your personal data to third parties.
      </p>
      <PrivacyCard compact={compact} />
    </div>
  );
}

function SlidePrivacyMobile({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col text-[#232323] px-[28px] pt-[max(env(safe-area-inset-top),32px)] pb-[120px]">
      <h1 className="font-ivy font-normal text-[24px] md:text-[26px] leading-[1.25]">
        Epoch Lag is secure and private, always.
      </h1>
      <p className="mt-[10px] font-montserrat text-[13px] md:text-[14px] leading-[1.55] text-[#2c2c2c]/70">
        We take your privacy seriously. We will never sell your personal data to third parties.
      </p>
      <PrivacyCard mobile />
    </div>
  );
}

function PrivacyCard({
  mobile = false,
  compact = false,
}: {
  mobile?: boolean;
  compact?: boolean;
}) {
  const sizing = mobile
    ? "w-full h-[460px]"
    : compact
      ? "w-full h-[260px] lg:h-[240px]"
      : "w-full h-[520px] lg:h-[480px] xl:h-[520px]";
  return (
    <div
      className={`${mobile ? "mt-[20px]" : "mt-[28px]"} ${sizing} bg-white rounded-[14px] shadow-[0_6px_24px_rgba(0,0,0,0.06)] overflow-y-auto p-[24px] md:p-[28px] text-left [&::-webkit-scrollbar]:hidden`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <h3 className="font-montserrat font-semibold text-[15px] text-[#232323]">Privacy Policy</h3>
      {PRIVACY_SECTIONS.map((section, i) => (
        <div key={i} className="mt-[16px] flex flex-col gap-[8px]">
          {section.heading && (
            <h4 className="font-montserrat font-semibold text-[13.5px] text-[#232323]">{section.heading}</h4>
          )}
          {section.blocks.map((block, j) => {
            if (block.type === "para") {
              return (
                <p key={j} className="font-montserrat text-[12.5px] leading-[1.6] text-[#232323]/85">
                  {block.text}
                </p>
              );
            }
            if (block.type === "subheading") {
              return (
                <p key={j} className="mt-[2px] font-montserrat font-semibold text-[12.5px] text-[#232323]">
                  {block.text}
                </p>
              );
            }
            return (
              <ul key={j} className="pl-[18px] list-disc font-montserrat text-[12.5px] leading-[1.6] text-[#232323]/85 space-y-[4px]">
                {block.items.map((item, k) => (
                  <li key={k}>{item}</li>
                ))}
              </ul>
            );
          })}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import LogoDark from "../assets/images/logo-dark.webp";
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
const INTRO_TAG = "Epoch Lag is about remembering and connection";

function SlideIntroDesktop({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center text-primary-blue px-[24px]">
      <img
        src={LogoDark.src}
        alt="Epoch Lag"
        className={`${compact ? "w-[120px]" : "w-[160px]"} h-auto object-contain`}
      />
      <p
        className={`${
          compact ? "mt-[12px]" : "mt-[20px]"
        } font-montserrat text-[13px] leading-[150%] text-primary-blue/80 max-w-[440px]`}
      >
        {INTRO_BODY}
      </p>
      <p
        className={`${
          compact ? "mt-[10px]" : "mt-[16px]"
        } font-montserrat font-bold text-[14px] text-primary-blue max-w-[300px]`}
      >
        {INTRO_TAG}
      </p>
      <PolaroidCluster compact={compact} />
    </div>
  );
}

function SlideIntroMobile({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center text-primary-blue px-[28px] pt-[40px] pb-[110px]">
      <img src={LogoDark.src} alt="Epoch Lag" className="w-[140px] h-auto object-contain" />
      <p className="mt-[16px] font-montserrat text-[14px] leading-[160%] text-primary-blue/80">
        {INTRO_BODY}
      </p>
      <p className="mt-[12px] font-montserrat font-bold text-[15px] text-primary-blue">
        {INTRO_TAG}
      </p>
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
      <div className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-primary-orange/45 ${circle}`} />
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
  const box = {
    xl: "w-[240px] h-[220px] p-[12px]",
    lg: "w-[190px] h-[170px] p-[10px]",
    md: "w-[180px] h-[170px] p-[10px]",
    sm: "w-[140px] h-[130px] p-[8px]",
  }[size];
  const inner = {
    xl: "h-[168px]",
    lg: "h-[128px]",
    md: "h-[130px]",
    sm: "h-[100px]",
  }[size];
  return (
    <div className={`${box} bg-primary-white rounded-[6px] shadow-[0_8px_24px_rgba(9,46,74,0.18)]`}>
      <div className={`w-full ${inner} overflow-hidden`}>
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
  return (
    <div className="flex flex-col items-center text-primary-blue">
      <h1 className="text-center font-montserrat font-bold text-[20px] lg:text-[22px] leading-[125%] max-w-[360px]">
        Built for the stories behind the photos
      </h1>
      <ul
        className={`${
          compact ? "mt-[12px] gap-[6px]" : "mt-[20px] gap-[8px]"
        } flex flex-col self-center`}
      >
        {FEATURE_BULLETS.map((b) => (
          <li key={b} className="flex items-center gap-[10px] font-montserrat text-[12.5px] text-primary-blue/90">
            <CheckDot /> <span>{b}</span>
          </li>
        ))}
      </ul>
      <Timeline items={compact ? TIMELINE.slice(0, 2) : TIMELINE} compact={compact} />
    </div>
  );
}

function SlideFeaturesMobile({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col items-center text-primary-blue px-[28px] pt-[48px] pb-[110px]">
      <h1 className="text-center font-montserrat font-bold text-[22px] leading-[125%]">
        Built for the stories behind the photos
      </h1>
      <ul className="mt-[16px] flex flex-col gap-[8px] self-start max-w-[340px]">
        {FEATURE_BULLETS.map((b) => (
          <li key={b} className="flex items-start gap-[12px] font-montserrat text-[16px] leading-[135%] text-primary-blue/90">
            <span className="pt-[2px]"><CheckDot size="md" /></span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Timeline items={TIMELINE.slice(0, 2)} mobile />
    </div>
  );
}

function CheckDot({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-[22px] w-[22px]" : "h-[18px] w-[18px]";
  const svg = size === "md" ? 13 : 10;
  return (
    <span className={`inline-flex ${dim} items-center justify-center rounded-full text-primary-blue shrink-0`} style={{ backgroundColor: "#FFE0BB" }}>
      <svg width={svg} height={svg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
        className={`absolute rounded-full bg-primary-orange/40 pointer-events-none ${
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
    <div className="flex flex-col items-center text-primary-blue px-[16px]">
      <h1 className="text-center font-montserrat font-bold text-[22px] lg:text-[24px] leading-[125%] max-w-[340px]">
        Epoch Lag is secure and private, always.
      </h1>
      <p className="mt-[12px] text-center font-montserrat text-[12.5px] leading-[160%] text-primary-blue/70 max-w-[340px]">
        We take your privacy seriously. We will never sell your personal data to third parties.
      </p>
      <PrivacyCard compact={compact} />
    </div>
  );
}

function SlidePrivacyMobile({ compact: _compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col text-primary-blue px-[24px] pt-[40px] pb-[110px]">
      <h1 className="font-montserrat font-bold text-[22px] leading-[125%]">
        Epoch Lag is secure and private, always.
      </h1>
      <p className="mt-[10px] font-montserrat text-[13px] leading-[160%] text-primary-blue/70">
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
    ? "w-full h-[360px]"
    : compact
      ? "w-full max-w-[540px] h-[300px] lg:h-[260px]"
      : "w-full max-w-[540px] h-[560px] lg:h-[340px]";
  return (
    <div
      className={`${mobile ? "mt-[16px]" : "mt-[24px]"} ${sizing} bg-primary-white rounded-[14px] shadow-[0_6px_24px_rgba(9,46,74,0.08)] overflow-y-auto p-[20px] text-left [&::-webkit-scrollbar]:hidden`}
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <h3 className="font-montserrat font-bold text-[15px] text-primary-blue">Privacy Policy</h3>
      {PRIVACY_SECTIONS.map((section, i) => (
        <div key={i} className="mt-[14px] flex flex-col gap-[8px]">
          {section.heading && (
            <h4 className="font-montserrat font-bold text-[13px] text-primary-blue">{section.heading}</h4>
          )}
          {section.blocks.map((block, j) => {
            if (block.type === "para") {
              return (
                <p key={j} className="font-montserrat text-[12.5px] leading-[160%] text-primary-blue/85">
                  {block.text}
                </p>
              );
            }
            if (block.type === "subheading") {
              return (
                <p key={j} className="mt-[2px] font-montserrat font-semibold text-[12.5px] text-primary-blue">
                  {block.text}
                </p>
              );
            }
            return (
              <ul key={j} className="pl-[16px] list-disc font-montserrat text-[12.5px] leading-[170%] text-primary-blue/85 space-y-[2px]">
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

"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { urlForScreen } from "../../../lib/onboarding";

const SUBTITLE = "A Lag is created when combining 3 important elements:";

type Row = {
  key: string;
  title: string;
  body: string;
  icon: string;
};

const ROWS: Row[] = [
  {
    key: "story",
    title: "A Story",
    body: "Write, record your voice, add photos or videos. Capture every detail that matters.",
    icon: "/onboarding/Group 14.svg",
  },
  {
    key: "when",
    title: "A Time & Place",
    body: "Ground your memory in when and where it happened.",
    icon: "/onboarding/Group 633722.svg",
  },
  {
    key: "people",
    title: "The People",
    body: "Share it with the ones who were there or the ones who deserve to know.",
    icon: "/onboarding/Logo.svg",
  },
];

export default function WhatsALagPage() {
  const router = useRouter();
  const goNext = () => router.push(urlForScreen("AddMemory"));

  return (
    <OnboardingShell
      onNext={goNext}
      hideMobileNext
      desktopContent={
        <div className="flex flex-col items-center text-primary-blue w-full">
          <h1 className="font-montserrat font-bold text-[24px] lg:text-[26px] text-primary-blue text-center">
            What&apos;s a Lag?
          </h1>
          <p className="mt-[10px] font-montserrat text-[14px] leading-[150%] text-primary-blue/80 text-center max-w-[360px]">
            {SUBTITLE}
          </p>

          <div className="mt-[36px] w-full max-w-[520px] flex flex-col">
            {ROWS.map((row, i) => (
              <RowDesktop key={row.key} row={row} showDivider={i < ROWS.length - 1} index={i} />
            ))}
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[40px] pb-[120px] text-primary-blue">
          <h1 className="font-montserrat font-bold text-[24px] text-center">What&apos;s a Lag?</h1>
          <p className="mt-[10px] font-montserrat text-[14px] leading-[150%] text-primary-blue/80 text-center">
            {SUBTITLE}
          </p>

          <div className="mt-[24px] flex flex-col gap-[20px]">
            {ROWS.map((row, i) => (
              <RowMobile key={row.key} row={row} index={i} />
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px]">
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

function RowDesktop({ row, showDivider, index }: { row: Row; showDivider: boolean; index: number }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 + index * 0.1 }}
        className="flex items-center gap-[28px] py-[20px]"
      >
        <div className="shrink-0 w-[72px] flex justify-center">
          <img
            src={row.icon}
            alt=""
            className={`${
              row.key === "story"
                ? "h-[32px] w-[32px]"
                : row.key === "when"
                ? "h-[42px] w-[42px]"
                : "h-[52px] w-[52px]"
            } object-contain`}
          />
        </div>
        <div>
          <h3 className="font-montserrat font-bold text-[16px] text-primary-blue">{row.title}</h3>
          <p className="mt-[4px] font-montserrat text-[13.5px] leading-[150%] text-primary-blue/80 max-w-[360px]">
            {row.body}
          </p>
        </div>
      </motion.div>
      {showDivider && <div className="h-px bg-primary-blue/12" />}
    </>
  );
}

function RowMobile({ row, index }: { row: Row; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 + index * 0.08 }}
      className="flex flex-col items-center text-center"
    >
      <img
        src={row.icon}
        alt=""
        className={`${
          row.key === "story"
            ? "h-[32px] w-[32px]"
            : row.key === "when"
            ? "h-[42px] w-[42px]"
            : "h-[48px] w-[48px]"
        } object-contain`}
      />
      <h3 className="mt-[16px] font-montserrat font-bold text-[17px] text-primary-blue">{row.title}</h3>
      <p className="mt-[8px] font-montserrat text-[14px] leading-[150%] text-primary-blue/80 max-w-[260px]">
        {row.body}
      </p>
    </motion.div>
  );
}


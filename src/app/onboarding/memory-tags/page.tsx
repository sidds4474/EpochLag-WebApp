"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";

type Tag = { slug: string; label: string };

const TAGS: Tag[] = [
  { slug: "travel", label: "Travel" },
  { slug: "pets", label: "Pets" },
  { slug: "parenthood", label: "Parenthood" },
  { slug: "love", label: "Love" },
  { slug: "siblings", label: "Siblings" },
  { slug: "childhood", label: "Childhood" },
  { slug: "nostalgia", label: "Nostalgia" },
  { slug: "humor", label: "Humor" },
  { slug: "milestones", label: "Milestones" },
  { slug: "education", label: "Education" },
  { slug: "tradition", label: "Tradition" },
  { slug: "loss", label: "Loss" },
  { slug: "gratitude", label: "Gratitude" },
  { slug: "career", label: "Career" },
];

const TITLE_LINES = ["What kinds of memories", "matter most to you?"];

export default function MemoryTagsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const goNext = () => {
    trackOnboarding("memory_tags_completed", {
      selected: Array.from(selected),
    });
    router.replace("/onboarding/free-trial");
  };

  const grid = (
    <div className="w-full flex flex-wrap justify-center gap-x-[10px] gap-y-[12px]">
      {TAGS.map((t) => (
        <TagChip
          key={t.slug}
          label={t.label}
          checked={selected.has(t.slug)}
          onToggle={() => toggle(t.slug)}
        />
      ))}
    </div>
  );

  const title = (
    <h1 className="font-montserrat font-bold text-primary-blue text-center leading-[130%] text-[20px] md:text-[22px]">
      {TITLE_LINES[0]}
      <br />
      {TITLE_LINES[1]}
    </h1>
  );

  return (
    <OnboardingShell
      onNext={goNext}
      hideMobileNext
      desktopContent={
        <div className="w-full flex flex-col items-center justify-center min-h-[78vh] lg:min-h-0">
          <div className="w-full max-w-[460px] flex flex-col items-center">
            {title}
            <div className="mt-[28px] w-full">{grid}</div>
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[48px] pb-[120px] text-primary-blue">
          <div className="flex-1 flex flex-col items-center">
            {title}
            <div className="mt-[28px] w-full max-w-[360px]">{grid}</div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px] bg-warm-cream">
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

function TagChip({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const base =
    "inline-flex items-center gap-[8px] rounded-full h-[40px] pl-[10px] pr-[16px] font-montserrat text-[14px] cursor-pointer transition-colors";
  const state = checked
    ? "border border-primary-orange text-primary-blue"
    : "bg-primary-white text-primary-blue shadow-[0_2px_8px_rgba(9,46,74,0.05)] hover:bg-primary-white/85";
  const activeBg = checked ? { backgroundColor: "#FBD5B4" } : undefined;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`${base} ${state}`}
      style={activeBg}
    >
      <CheckboxIcon checked={checked} />
      <span>{label}</span>
    </button>
  );
}

function CheckboxIcon({ checked }: { checked: boolean }) {
  return (
    <span
      className={`shrink-0 h-[20px] w-[20px] rounded-[5px] flex items-center justify-center transition-colors ${
        checked
          ? "bg-primary-orange text-primary-white"
          : "border-2 border-primary-blue/25 bg-transparent"
      }`}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5L20 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

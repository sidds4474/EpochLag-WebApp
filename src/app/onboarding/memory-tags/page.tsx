"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto px-[24px] md:px-[40px] pt-[max(env(safe-area-inset-top),48px)] pb-[160px] lg:pb-[100px] flex flex-col items-center">
        <div className="w-full max-w-[640px] flex flex-col items-center lg:justify-center lg:flex-1">
          <h1 className="font-ivy font-normal text-[#232323] text-[22px] md:text-[24px] lg:text-[26px] leading-[1.3] text-center max-w-[420px]">
            {TITLE_LINES[0]}
            <br />
            {TITLE_LINES[1]}
          </h1>

          <div className="w-full max-w-[560px] mt-[32px] md:mt-[40px] flex flex-wrap justify-center gap-[10px] md:gap-[12px]">
            {TAGS.map((t) => (
              <TagChip
                key={t.slug}
                label={t.label}
                checked={selected.has(t.slug)}
                onToggle={() => toggle(t.slug)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Next pill */}
      <button
        type="button"
        onClick={goNext}
        className="hidden lg:inline-flex absolute bottom-[32px] right-[32px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[40px] py-[12px] hover:opacity-90 transition-opacity"
      >
        Next
      </button>

      {/* Mobile + tablet Next pill */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#F3F1EB] px-[24px] md:px-[48px] pb-[max(env(safe-area-inset-bottom),24px)] pt-[16px]">
        <button
          type="button"
          onClick={goNext}
          className="w-full max-w-[520px] mx-auto block cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
        >
          Next
        </button>
      </div>
    </div>
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
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`inline-flex items-center gap-[10px] rounded-full h-[42px] pl-[12px] pr-[18px] font-montserrat text-[14px] cursor-pointer transition-colors ${
        checked
          ? "bg-[#1C1C1C] text-white"
          : "bg-white text-[#232323] hover:brightness-95"
      }`}
    >
      <CheckboxIcon checked={checked} />
      <span>{label}</span>
    </button>
  );
}

function CheckboxIcon({ checked }: { checked: boolean }) {
  return (
    <span
      className={`shrink-0 h-[20px] w-[20px] rounded-[4px] flex items-center justify-center transition-colors ${
        checked
          ? "border border-white"
          : "border border-[#2c2c2c]/35"
      }`}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12l5 5L20 7"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { trackOnboarding } from "../../../lib/analytics/track";

type Relationship = { slug: string; label: string };

const RELATIONSHIPS: Relationship[] = [
  { slug: "mom", label: "Mom" },
  { slug: "dad", label: "Dad" },
  { slug: "sibling", label: "Sibling" },
  { slug: "grandparent", label: "Grandparent" },
  { slug: "friend", label: "Friend" },
  { slug: "other", label: "Other" },
];

const TITLE_LINES = ["Who would you like", "to share Lags with?"];

export default function AddRelationshipPage() {
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
    trackOnboarding("add_relationship_completed", {
      selected: Array.from(selected),
    });
    // Persist choices to BE once the endpoint contract is confirmed.
    router.replace("/onboarding/memory-tags");
  };

  const list = (
    <div className="w-full flex flex-col gap-[12px]">
      {RELATIONSHIPS.map((r) => (
        <RelationshipRow
          key={r.slug}
          label={r.label}
          checked={selected.has(r.slug)}
          onToggle={() => toggle(r.slug)}
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
          <div className="w-full max-w-[400px] flex flex-col items-center">
            {title}
            <div className="mt-[28px] w-full">{list}</div>
          </div>
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[48px] pb-[120px] text-primary-blue">
          <div className="flex-1 flex flex-col items-center">
            {title}
            <div className="mt-[24px] w-full max-w-[420px]">{list}</div>
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

function RelationshipRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const base =
    "w-full flex items-center gap-[14px] rounded-full h-[52px] pl-[16px] pr-[20px] font-montserrat text-[15px] cursor-pointer transition-colors";
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
      className={`shrink-0 h-[24px] w-[24px] rounded-[6px] flex items-center justify-center transition-colors ${
        checked
          ? "bg-primary-orange text-primary-white"
          : "border-2 border-primary-blue/25 bg-transparent"
      }`}
    >
      {checked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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

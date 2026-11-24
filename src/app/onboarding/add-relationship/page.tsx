"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const TITLE_LINES = ["Who would you like to", "share Lags with?"];

export default function AddRelationshipPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherLabel, setOtherLabel] = useState("");

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
        if (slug === "other") setOtherLabel("");
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const goNext = () => {
    const selectedArr = Array.from(selected);
    const trimmedOther = otherLabel.trim();
    trackOnboarding("add_relationship_completed", {
      selected: selectedArr,
      otherLabel: selected.has("other") ? trimmedOther || null : null,
    });
    router.replace("/onboarding/memory-tags");
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto px-[24px] md:px-[40px] pt-[max(env(safe-area-inset-top),48px)] pb-[160px] lg:pb-[100px] flex flex-col items-center">
        <div className="w-full max-w-[640px] lg:max-w-[720px] flex flex-col items-center lg:justify-center lg:flex-1">
          <h1 className="font-ivy font-normal text-[#232323] text-[22px] md:text-[24px] lg:text-[26px] leading-[1.3] text-center max-w-[380px]">
            {TITLE_LINES[0]}
            <br />
            {TITLE_LINES[1]}
          </h1>

          {/* Mobile + tablet: single-column stack */}
          <div className="lg:hidden w-full max-w-[380px] mt-[32px] flex flex-col gap-[12px]">
            {RELATIONSHIPS.map((r) => (
              <div key={r.slug} className="w-full">
                <RelationshipRow
                  label={r.label}
                  checked={selected.has(r.slug)}
                  onToggle={() => toggle(r.slug)}
                />
                {r.slug === "other" && selected.has("other") && (
                  <OtherInput
                    value={otherLabel}
                    onChange={setOtherLabel}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Desktop: 2-column grid */}
          <div className="hidden lg:grid w-full max-w-[640px] mt-[40px] grid-cols-2 gap-x-[20px] gap-y-[14px]">
            {RELATIONSHIPS.map((r) => (
              <div key={r.slug} className="w-full">
                <RelationshipRow
                  label={r.label}
                  checked={selected.has(r.slug)}
                  onToggle={() => toggle(r.slug)}
                />
                {r.slug === "other" && selected.has("other") && (
                  <OtherInput
                    value={otherLabel}
                    onChange={setOtherLabel}
                  />
                )}
              </div>
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

function OtherInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Who else?"
      autoFocus
      maxLength={40}
      className="mt-[10px] w-full bg-primary-white rounded-full h-[48px] px-[20px] font-montserrat text-[15px] text-[#232323] placeholder:text-[#2c2c2c]/40 outline-none shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
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
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={`w-full flex items-center gap-[14px] rounded-full h-[52px] pl-[16px] pr-[20px] font-montserrat text-[15px] cursor-pointer transition-colors ${
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
      className={`shrink-0 h-[22px] w-[22px] rounded-[4px] flex items-center justify-center transition-colors ${
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

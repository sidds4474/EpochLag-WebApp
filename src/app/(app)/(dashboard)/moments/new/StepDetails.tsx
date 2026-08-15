"use client";

import { useEffect, useState } from "react";
import { DEFAULT_HOSTED_COVER_URL } from "../../../../../lib/moments/api";
import { ImageIcon } from "../../icons";
import { fallbackGradient } from "../momentTypeIcon";
import ChooseCoverModal from "../../new-story/ChooseCoverModal";
import type { Draft } from "./wizardTypes";
import WizardCalendar from "./WizardCalendar";

export type DetailsSubStep = "titleCover" | "date";

const FREQ_OPTIONS: Array<{ value: "yearly" | "monthly" | "weekly" | "daily"; label: string }> = [
  { value: "yearly", label: "Yearly" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
];

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="cursor-pointer flex items-center gap-[12px]"
    >
      <span
        className={`w-[20px] h-[20px] rounded-[4px] border flex items-center justify-center transition-colors ${
          checked
            ? "bg-primary-orange border-primary-orange"
            : "bg-white border-primary-blue/40"
        }`}
      >
        {checked && (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="font-montserrat font-medium text-primary-blue text-[15px]">
        {label}
      </span>
    </button>
  );
}

function CoverCard({
  type,
  activeUrl,
  onOpen,
  className,
}: {
  type: string | null;
  activeUrl: string | null;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${className} cursor-pointer`}
      style={
        !activeUrl && type
          ? { backgroundImage: fallbackGradient(type) }
          : !activeUrl
            ? { backgroundColor: "#D9D9D9" }
            : undefined
      }
    >
      {activeUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-[8px] text-white bg-black/[0.20]">
        <ImageIcon width={32} height={32} />
        <span className="font-montserrat font-medium text-[16px]">
          Tap to {activeUrl ? "change" : "add"} image
        </span>
      </span>
    </button>
  );
}

export default function StepDetails({
  draft,
  onChange,
  onNext,
  subStep,
  onSubStepChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onNext: () => void;
  subStep: DetailsSubStep;
  onSubStepChange: (s: DetailsSubStep) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Seed default hosted cover on mount if nothing chosen yet.
  useEffect(() => {
    if (!draft.coverLocalUri && !draft.coverImageUrl) {
      onChange({ coverImageUrl: DEFAULT_HOSTED_COVER_URL });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCoverUrl = draft.coverLocalUri ?? draft.coverImageUrl;

  const canGoTitleCoverNext = draft.title.trim().length > 0;
  const canSubmit = canGoTitleCoverNext && !!draft.date;

  const titleInput = (
    <input
      type="text"
      value={draft.title}
      onChange={(e) => onChange({ title: e.target.value })}
      placeholder="Give it a title"
      className="w-full h-[46px] rounded-full bg-[color:var(--color-surface-muted)] px-[20px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/40 focus:outline-none"
    />
  );

  const cover = (
    <CoverCard
      type={draft.type}
      activeUrl={activeCoverUrl}
      onOpen={() => setPickerOpen(true)}
      className="relative w-full aspect-square rounded-[16px] overflow-hidden"
    />
  );

  const recurringBlock = (
    <div className="flex flex-col gap-[12px]">
      <CheckboxRow
        checked={draft.isRecurring}
        onChange={(next) =>
          onChange({
            isRecurring: next,
            frequency: next ? draft.frequency ?? "yearly" : null,
          })
        }
        label="This is a recurring event"
      />
      {draft.isRecurring && (
        <div className="pl-[32px] flex flex-wrap gap-[8px]">
          {FREQ_OPTIONS.map((f) => {
            const active = draft.frequency === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onChange({ frequency: f.value })}
                className={`cursor-pointer h-[32px] px-[14px] rounded-full border font-montserrat text-[13px] transition-colors ${
                  active
                    ? "bg-primary-orange border-primary-orange text-white font-medium"
                    : "bg-white border-primary-blue/40 text-primary-blue"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}
      <CheckboxRow
        checked={draft.addToCountdown}
        onChange={(next) => onChange({ addToCountdown: next })}
        label="Add to countdown"
      />
    </div>
  );

  return (
    <>
      {/* Desktop: unified single screen */}
      <div className="hidden lg:flex flex-col items-center">
        <h1 className="font-montserrat font-medium text-primary-blue text-[18px] leading-[26px] text-center mb-[32px]">
          Add a title, a cover image and a date
        </h1>
        <div className="w-full max-w-[860px] grid grid-cols-2 gap-[48px] items-start">
          <div className="flex flex-col gap-[16px]">
            {titleInput}
            {cover}
          </div>
          <div className="flex flex-col gap-[20px]">
            <WizardCalendar
              value={draft.date}
              onChange={(iso) => onChange({ date: iso })}
            />
            {recurringBlock}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={onNext}
              className={`mt-[4px] w-full h-[46px] rounded-full font-montserrat font-medium text-[16px] transition-opacity ${
                canSubmit
                  ? "bg-primary-orange text-white cursor-pointer hover:brightness-[1.03]"
                  : "bg-primary-orange/50 text-white cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: sub-steps */}
      <div className="lg:hidden">
        {subStep === "titleCover" ? (
          <div className="flex flex-col items-center">
            <h1 className="font-montserrat font-medium text-primary-blue text-[20px] leading-[26px] text-center mb-[28px] max-w-[280px]">
              Title your Moment & choose an image
            </h1>
            <div className="w-full max-w-[420px] flex flex-col gap-[20px]">
              {titleInput}
              {cover}
              <button
                type="button"
                disabled={!canGoTitleCoverNext}
                onClick={() => onSubStepChange("date")}
                className={`mt-[8px] w-full h-[46px] rounded-full font-montserrat font-medium text-[16px] ${
                  canGoTitleCoverNext
                    ? "bg-primary-orange text-white cursor-pointer"
                    : "bg-primary-orange/50 text-white cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <h1 className="font-montserrat font-medium text-primary-blue text-[20px] leading-[26px] text-center mb-[28px]">
              When is the Moment?
            </h1>
            <div className="w-full max-w-[420px] flex flex-col gap-[24px]">
              <WizardCalendar
                value={draft.date}
                onChange={(iso) => onChange({ date: iso })}
              />
              {recurringBlock}
              <button
                type="button"
                disabled={!canSubmit}
                onClick={onNext}
                className={`w-full h-[46px] rounded-full font-montserrat font-medium text-[16px] ${
                  canSubmit
                    ? "bg-primary-orange text-white cursor-pointer"
                    : "bg-primary-orange/50 text-white cursor-not-allowed"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ChooseCoverModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedUrl={draft.coverImageUrl}
        onPick={(pick) => {
          if (draft.coverLocalUri) URL.revokeObjectURL(draft.coverLocalUri);
          if (pick.kind === "curated") {
            onChange({
              coverImageUrl: pick.imageUrl,
              coverLocalUri: null,
              coverFile: null,
            });
          } else {
            onChange({
              coverLocalUri: pick.preview,
              coverFile: pick.file,
              coverImageUrl: null,
            });
          }
        }}
      />
    </>
  );
}

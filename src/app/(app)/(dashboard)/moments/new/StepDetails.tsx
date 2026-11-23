"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_HOSTED_COVER_URL } from "../../../../../lib/moments/api";
import { ChevronDownIcon, ImageIcon } from "../../icons";
import { fallbackGradient } from "../momentTypeIcon";
import ChooseCoverModal from "../../new-story/ChooseCoverModal";
import type { Draft } from "./wizardTypes";
import WizardCalendar from "./WizardCalendar";

export type DetailsSubStep = "titleCover" | "date";

type Freq = "yearly" | "monthly" | "weekly" | "daily";
const FREQ_OPTIONS: Array<{ value: Freq; label: string }> = [
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
            : "bg-white border-[#2c2c2c]/40"
        }`}
      >
        {checked && (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="font-montserrat text-[#232323] text-[14px]">
        {label}
      </span>
    </button>
  );
}

function FrequencyDropdown({
  value,
  onChange,
}: {
  value: Freq;
  onChange: (v: Freq) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const current = FREQ_OPTIONS.find((f) => f.value === value) ?? FREQ_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="cursor-pointer bg-white rounded-full px-[16px] py-[6px] min-w-[120px] flex items-center justify-between gap-[10px] font-montserrat text-[#232323] text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
      >
        {current.label}
        <ChevronDownIcon width={12} height={12} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[40px] bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[6px] z-10 min-w-[120px]"
        >
          {FREQ_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="option"
              aria-selected={f.value === value}
              onClick={() => {
                onChange(f.value);
                setOpen(false);
              }}
              className={`cursor-pointer w-full text-left px-[14px] py-[8px] font-montserrat text-[13px] transition-colors ${
                f.value === value
                  ? "bg-black/[0.04] text-[#232323] font-semibold"
                  : "text-[#232323]/80 hover:bg-black/[0.04]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PolaroidCover({
  type,
  activeUrl,
  onOpen,
}: {
  type: string | null;
  activeUrl: string | null;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="cursor-pointer relative w-full bg-white p-[10px] pb-[18px] shadow-[0_4px_18px_rgba(0,0,0,0.18)]"
    >
      <div
        className="relative w-full aspect-square overflow-hidden"
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
        {!activeUrl && (
          <span className="absolute inset-0 flex items-center justify-center text-white">
            <ImageIcon width={32} height={32} />
          </span>
        )}
      </div>
      <span className="absolute top-[20px] right-[20px] w-[32px] h-[32px] rounded-full bg-white text-[#2c2c2c] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      </span>
    </button>
  );
}

function TitleInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Moment Name"
        className="w-full bg-transparent border-b border-[#2c2c2c]/30 pb-[8px] font-ivy font-normal text-[#232323] text-[20px] md:text-[22px] leading-[1.2] placeholder:text-[#2c2c2c]/40 focus:outline-none focus:border-[#2c2c2c]/60 text-center"
      />
    </div>
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

  useEffect(() => {
    if (!draft.coverLocalUri && !draft.coverImageUrl) {
      onChange({ coverImageUrl: DEFAULT_HOSTED_COVER_URL });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCoverUrl = draft.coverLocalUri ?? draft.coverImageUrl;

  const canGoTitleCoverNext = draft.title.trim().length > 0;
  const canSubmit = canGoTitleCoverNext && !!draft.date;

  const recurringBlock = (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center justify-between gap-[12px]">
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
          <FrequencyDropdown
            value={(draft.frequency as Freq) ?? "yearly"}
            onChange={(v) => onChange({ frequency: v })}
          />
        )}
      </div>
      <CheckboxRow
        checked={draft.addToCountdown}
        onChange={(next) => onChange({ addToCountdown: next })}
        label="Add to countdown"
      />
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex flex-col items-center w-full">
        <h1 className="font-ivy font-normal text-[#232323] text-[20px] leading-[1.3] text-center mb-[28px]">
          Add a title, a cover image and a date
        </h1>
        <div className="w-full max-w-[860px] grid grid-cols-2 gap-[48px] items-start">
          <div className="flex flex-col gap-[28px]">
            <TitleInput
              value={draft.title}
              onChange={(v) => onChange({ title: v })}
            />
            <WizardCalendar
              value={draft.date}
              onChange={(iso) => onChange({ date: iso })}
            />
            <div className="mt-[4px]">{recurringBlock}</div>
          </div>
          <div className="flex flex-col gap-[10px]">
            <span className="font-montserrat text-[#232323] text-[14px]">
              Cover photo
            </span>
            <PolaroidCover
              type={draft.type}
              activeUrl={activeCoverUrl}
              onOpen={() => setPickerOpen(true)}
            />
            <div className="mt-[20px] flex justify-end">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={onNext}
                className={`h-[42px] px-[28px] rounded-full font-montserrat font-semibold text-white text-[14px] transition-opacity ${
                  canSubmit
                    ? "bg-primary-orange cursor-pointer hover:opacity-90"
                    : "bg-primary-orange/50 cursor-not-allowed"
                }`}
              >
                Add moment to calendar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sub-steps */}
      <div className="lg:hidden w-full">
        {subStep === "titleCover" ? (
          <div className="flex flex-col items-center">
            <h1 className="font-ivy font-normal text-[#232323] text-[20px] leading-[1.3] text-center mb-[28px] max-w-[280px]">
              Title your Moment & choose an image
            </h1>
            <div className="w-full max-w-[420px] flex flex-col gap-[24px]">
              <TitleInput
                value={draft.title}
                onChange={(v) => onChange({ title: v })}
              />
              <PolaroidCover
                type={draft.type}
                activeUrl={activeCoverUrl}
                onOpen={() => setPickerOpen(true)}
              />
              <button
                type="button"
                disabled={!canGoTitleCoverNext}
                onClick={() => onSubStepChange("date")}
                className={`mt-[8px] w-full h-[46px] rounded-full font-montserrat font-semibold text-[15px] ${
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
            <h1 className="font-ivy font-normal text-[#232323] text-[22px] leading-[1.3] text-center mb-[28px]">
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
                className={`w-full h-[46px] rounded-full font-montserrat font-semibold text-[15px] ${
                  canSubmit
                    ? "bg-primary-orange text-white cursor-pointer"
                    : "bg-primary-orange/50 text-white cursor-not-allowed"
                }`}
              >
                Add Moment
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

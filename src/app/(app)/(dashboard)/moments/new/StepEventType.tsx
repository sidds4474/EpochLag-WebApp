"use client";

import { momentTypeIcon } from "../momentTypeIcon";
import { EVENT_TYPES } from "./wizardTypes";

export default function StepEventType({
  value,
  onChange,
  onNext,
}: {
  value: string | null;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <h1 className="font-montserrat font-medium text-primary-blue text-[20px] lg:text-[18px] leading-[26px] text-center mb-[32px] lg:mb-[36px] max-w-[280px] lg:max-w-none">
        What type of event do you want to add?
      </h1>

      <div className="w-full max-w-[520px] lg:max-w-[560px] grid grid-cols-1 lg:grid-cols-2 gap-[14px] lg:gap-x-[16px] lg:gap-y-[14px]">
        {EVENT_TYPES.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                onChange(t.value);
                onNext();
              }}
              className={`cursor-pointer h-[54px] lg:h-[42px] rounded-full flex items-center gap-[16px] lg:gap-[14px] pl-[24px] lg:pl-[22px] pr-[20px] border font-montserrat text-[16px] lg:text-[14px] transition-colors ${
                active
                  ? "bg-[#FDE6C9] border-[#EDA45A] text-primary-blue font-medium"
                  : "bg-white border-primary-blue/70 text-primary-blue font-medium hover:bg-black/[0.02]"
              }`}
            >
              <span className="text-primary-blue">
                {momentTypeIcon(t.value, 20)}
              </span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

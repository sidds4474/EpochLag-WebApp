"use client";

import { Fragment } from "react";

type YearRailProps = {
  years: number[];
  selected: number | null;
  onSelect: (year: number) => void;
  layout: "vertical" | "horizontal";
};

// Vertical rail (desktop/tablet): year list, selected year in a dark pill,
// thin horizontal divider between each year.
// Horizontal rail (mobile): scrollable strip, orange underline for the
// selected year.
export default function YearRail({
  years,
  selected,
  onSelect,
  layout,
}: YearRailProps) {
  const ordered = [...years].sort((a, b) => b - a);

  if (layout === "horizontal") {
    return (
      <div className="flex items-center gap-[20px] overflow-x-auto scrollbar-hide px-[4px] pt-[6px] pb-[10px] border-b border-black/[0.08] relative">
        {ordered.map((y) => {
          const active = y === selected;
          return (
            <button
              key={y}
              type="button"
              onClick={() => onSelect(y)}
              className={`relative shrink-0 cursor-pointer font-montserrat text-[13px] py-[4px] focus:outline-none flex flex-col items-center gap-[6px] ${
                active
                  ? "text-[#232323] font-semibold"
                  : "text-[#232323]/60 hover:text-[#232323]"
              }`}
            >
              <span>{y}</span>
              <span
                className={`block h-[4px] w-[44px] rounded-full transition-colors ${
                  active ? "bg-[#EF9849]" : "bg-[#B7B7B7]"
                }`}
              />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-[8px] sticky top-[16px] self-start">
      {ordered.map((y, i) => {
        const active = y === selected;
        return (
          <Fragment key={y}>
            {i > 0 && (
              <div className="w-[70px] lg:w-[85px] h-[1.5px] bg-black/15 my-[14px] lg:my-[16px]" />
            )}
            <button
              type="button"
              onClick={() => onSelect(y)}
              className={`cursor-pointer min-w-[80px] lg:min-w-[86px] px-[12px] py-[6px] lg:py-[8px] rounded-full font-montserrat font-medium text-[18px] lg:text-[21px] transition-colors text-center ${
                active
                  ? "bg-[#2c2c2c] text-white"
                  : "text-[#232323] hover:text-black"
              }`}
            >
              {y}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

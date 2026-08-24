"use client";

type YearRailProps = {
  years: number[];
  selected: number | null;
  onSelect: (year: number) => void;
  layout: "vertical" | "horizontal";
};

// Vertical rail (desktop/tablet): year list with an orange pill on the
// selected row and a small orange dot pinned to the right edge so it
// visually sits on the timeline connector line.
// Horizontal rail (mobile): scrollable year strip with orange dot under
// the selected year, sitting on the top border of the story list.
export default function YearRail({
  years,
  selected,
  onSelect,
  layout,
}: YearRailProps) {
  // Both mobile + desktop: newest → oldest.
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
                  ? "text-primary-blue font-semibold"
                  : "text-primary-blue/60 hover:text-primary-blue"
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
    <div className="relative flex flex-col gap-[22px] pt-[16px] sticky top-[16px] self-start">
      {ordered.map((y) => {
        const active = y === selected;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onSelect(y)}
            className="group relative flex items-center justify-start cursor-pointer focus:outline-none"
          >
            <span
              className={`font-montserrat text-[15px] px-[14px] py-[4px] rounded-full transition-colors ${
                active
                  ? "bg-primary-orange text-white font-semibold"
                  : "text-primary-blue/70 group-hover:text-primary-blue"
              }`}
            >
              {y}
            </span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useSelectMode } from "./selectMode";

// Header row: "Lags" title on the left; on mobile the tabs row's
// header-right actions (search icon + Select on People, Filters +
// Select on All) render here so they sit on the app's top bar rather
// than crammed into the pill row. Desktop renders them in LagsTabs.
export default function LagsHeading() {
  const { headerRight } = useSelectMode();
  return (
    <div className="flex items-center justify-between gap-[12px] mb-[16px]">
      <h1 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[28px] leading-[1.15]">
        Lags
      </h1>
      <div className="md:hidden flex items-center gap-[8px]">
        {headerRight}
      </div>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LibraryTabs from "./LibraryTabs";
import LibraryContent from "./LibraryContent";
import LibraryHeading from "./LibraryHeading";
import { SelectModeProvider } from "./selectMode";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const isPlaces = pathname.startsWith("/lags/places");
  return (
    <SelectModeProvider>
      <div
        className={`flex flex-col h-full min-h-0 px-[12px] md:px-[32px] pt-[16px] ${
          isPlaces ? "bg-transparent relative z-10" : "bg-[#f3f1eb]"
        }`}
      >
        <LibraryHeading />
        <LibraryTabs />
        <LibraryContent>{children}</LibraryContent>
      </div>
    </SelectModeProvider>
  );
}

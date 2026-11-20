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
  // Detail routes like /lags/people/[userId], /lags/groups/[groupId],
  // /lags/albums/[id] get their own page chrome — hide the Lags heading
  // and tab bar so the detail header is the only top-level thing.
  const isDetail = /^\/lags\/(people|groups|albums)\/[^/]+/.test(pathname);
  return (
    <SelectModeProvider>
      <div
        className={`flex flex-col h-full min-h-0 px-[12px] md:px-[32px] pt-[16px] ${
          isPlaces
            ? "bg-transparent relative z-10 pointer-events-none"
            : "bg-[#f3f1eb]"
        }`}
      >
        {!isDetail && (
          <div className={isPlaces ? "pointer-events-auto" : undefined}>
            <LibraryHeading />
            <LibraryTabs />
          </div>
        )}
        <LibraryContent passThrough={isPlaces}>{children}</LibraryContent>
      </div>
    </SelectModeProvider>
  );
}

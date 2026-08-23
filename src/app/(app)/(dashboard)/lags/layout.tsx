import type { ReactNode } from "react";
import LibraryTabs from "./LibraryTabs";
import LibraryContent from "./LibraryContent";
import LibraryHeading from "./LibraryHeading";
import { SelectModeProvider } from "./selectMode";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <SelectModeProvider>
      <div className="flex flex-col h-full min-h-0 px-[24px] md:px-[32px] pt-[16px]">
        <LibraryHeading />
        <LibraryTabs />
        <LibraryContent>{children}</LibraryContent>
      </div>
    </SelectModeProvider>
  );
}

import type { ReactNode } from "react";
import LibraryTabs from "./LibraryTabs";
import { SelectModeProvider } from "./selectMode";

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return (
    <SelectModeProvider>
      <div className="flex flex-col h-full min-h-0 px-[24px] md:px-[32px] pt-[16px]">
        <h1 className="font-montserrat font-bold text-primary-blue text-[24px] md:text-[28px] leading-tight mb-[16px]">
          Library
        </h1>
        <LibraryTabs />
        <div className="flex-1 min-h-0 mt-[16px]">{children}</div>
      </div>
    </SelectModeProvider>
  );
}

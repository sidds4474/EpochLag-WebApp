"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "../icons";
import SettingsMenu from "./SettingsMenu";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onIndex = pathname === "/settings";

  function handleBack() {
    router.push("/studio");
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[#f3f1eb]">
      <div className="flex-1 min-h-0 px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] pb-[16px] md:pb-[24px] grid md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] gap-[16px] md:gap-[28px] lg:gap-[40px]">
        <aside
          className={`${onIndex ? "flex" : "hidden"} md:flex flex-col min-h-0 overflow-y-auto scrollbar-hide md:pr-[8px]`}
        >
          <div className="flex items-center gap-[12px] mb-[18px] md:mb-[22px] shrink-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[30px] lg:text-[32px] leading-[1.15]">
              Settings
            </h1>
          </div>
          <SettingsMenu />
        </aside>
        <section
          className={`${onIndex ? "hidden" : "block"} md:block min-w-0 min-h-0 md:overflow-y-auto scrollbar-hide pb-[20px] md:pb-0 md:pt-[8px]`}
        >
          {children}
        </section>
      </div>
    </div>
  );
}

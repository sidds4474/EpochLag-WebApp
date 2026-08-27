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
    router.push("/home");
  }

  return (
    <div className="md:h-full md:min-h-0 flex flex-col md:overflow-hidden bg-white">
      <div className="md:flex-1 md:min-h-0 px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] pb-[24px] md:pb-[24px] grid md:grid-cols-[200px_1fr] lg:grid-cols-[220px_1fr] gap-[16px] md:gap-[28px] lg:gap-[40px]">
        <aside
          className={`${onIndex ? "flex" : "hidden"} md:flex flex-col min-h-0 md:overflow-y-auto scrollbar-hide md:pr-[8px] pb-[20px] md:pb-0`}
        >
          <div className="flex items-center gap-[12px] mb-[20px] md:mb-[24px] shrink-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <h1 className="font-montserrat font-bold text-primary-blue text-[20px] md:text-[24px] lg:text-[26px] leading-tight">
              Settings
            </h1>
          </div>
          <SettingsMenu />
        </aside>
        <section
          className={`${onIndex ? "hidden" : "block"} md:block min-w-0 min-h-0 md:overflow-y-auto scrollbar-hide pb-[20px] md:pb-0 md:pt-[60px]`}
        >
          {children}
        </section>
      </div>
    </div>
  );
}

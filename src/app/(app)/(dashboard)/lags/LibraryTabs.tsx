"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelectMode } from "./selectMode";

const TABS: Array<{ href: string; label: string; match: (p: string) => boolean }> = [
  { href: "/lags", label: "All", match: (p) => p === "/lags" },
  {
    href: "/lags/timeline",
    label: "Timeline",
    match: (p) => p.startsWith("/lags/timeline"),
  },
  {
    href: "/lags/places",
    label: "Places",
    match: (p) => p.startsWith("/lags/places"),
  },
  {
    href: "/lags/people",
    label: "People",
    match: (p) => p.startsWith("/lags/people"),
  },
];

export default function LagsTabs() {
  const pathname = usePathname() ?? "";
  const { headerRight } = useSelectMode();
  return (
    <div className="flex items-center justify-between gap-[12px] md:gap-[16px]">
      <div className="flex items-center gap-[8px] md:gap-[10px] overflow-x-auto scrollbar-hide max-w-full">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative cursor-pointer px-[18px] md:px-[24px] py-[10px] md:py-[12px] rounded-full font-montserrat font-medium text-[13px] md:text-[14px] whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary-blue text-white font-semibold"
                  : "bg-[#f0f0f0] text-primary-blue hover:bg-black/[0.08]"
              }`}
            >
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="hidden md:flex items-center gap-[12px] md:gap-[16px]">
        {headerRight}
      </div>
    </div>
  );
}

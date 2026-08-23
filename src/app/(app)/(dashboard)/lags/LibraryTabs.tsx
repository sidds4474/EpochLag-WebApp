"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
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
      <div className="flex items-center gap-[2px] md:gap-[4px] bg-[#ededed] rounded-full p-[3px] md:p-[4px] overflow-x-auto scrollbar-hide max-w-full">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative cursor-pointer px-[12px] md:px-[18px] py-[5px] md:py-[6px] rounded-full font-montserrat font-medium text-[12px] md:text-[14px] whitespace-nowrap ${
                active ? "text-white" : "text-primary-blue"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="lags-tab-pill"
                  className="absolute inset-0 bg-primary-blue rounded-full"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      {headerRight}
    </div>
  );
}

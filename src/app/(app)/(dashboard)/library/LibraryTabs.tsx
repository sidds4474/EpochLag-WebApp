"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { useSelectMode } from "./selectMode";

const TABS: Array<{ href: string; label: string; match: (p: string) => boolean }> = [
  { href: "/library", label: "Stories", match: (p) => p === "/library" },
  {
    href: "/library/timeline",
    label: "Timeline",
    match: (p) => p.startsWith("/library/timeline"),
  },
  {
    href: "/library/albums",
    label: "Albums",
    match: (p) => p.startsWith("/library/albums"),
  },
];

export default function LibraryTabs() {
  const pathname = usePathname() ?? "";
  const { headerRight } = useSelectMode();
  // Album detail is a distinct context — hide the top-level Library tabs
  // and let the detail page render its own breadcrumb-style header.
  if (/^\/library\/albums\/[^/]+/.test(pathname)) return null;
  return (
    <div className="flex items-center justify-between gap-[16px]">
      <div className="flex items-center gap-[4px] bg-[#ededed] rounded-full p-[4px]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative cursor-pointer px-[18px] py-[6px] rounded-full font-montserrat font-medium text-[14px] ${
                active ? "text-white" : "text-primary-blue"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="library-tab-pill"
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

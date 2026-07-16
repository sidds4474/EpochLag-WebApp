"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const isStories = pathname === "/library";
  return (
    <div className="flex items-center justify-between gap-[16px]">
      <div className="flex items-center gap-[4px] bg-[#ededed] rounded-full p-[4px]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`cursor-pointer px-[18px] py-[6px] rounded-full font-montserrat font-medium text-[14px] transition-colors ${
                active
                  ? "bg-primary-blue text-white"
                  : "text-primary-blue hover:bg-black/[0.04]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {isStories && <SelectHeaderButton />}
    </div>
  );
}

function SelectHeaderButton() {
  const { isSelecting, canSelect, toggle } = useSelectMode();
  if (!canSelect) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className="cursor-pointer font-montserrat text-primary-blue/70 text-[14px] hover:text-primary-blue"
    >
      {isSelecting ? "Done" : "Select"}
    </button>
  );
}

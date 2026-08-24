"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LogoDark from "../../../assets/images/logo-dark.webp";
import {
  ChevronRightIcon,
  HomeIcon,
  LibraryIcon,
  InteractionsIcon,
  PlusIcon,
} from "./icons";

// Three primary destinations only. Old routes (interactions, bookmarks, drafts)
// still exist and are reachable elsewhere; they're just gone from top-level nav.
const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
}> = [
  {
    href: "/home",
    label: "Home",
    icon: <HomeIcon width={20} height={20} />,
    match: (p) => p === "/home",
  },
  {
    href: "/moments",
    label: "Moments",
    icon: <InteractionsIcon width={20} height={20} />,
    match: (p) => p.startsWith("/moments"),
  },
  {
    href: "/lags",
    label: "Lags",
    icon: <LibraryIcon width={20} height={20} />,
    match: (p) => p.startsWith("/lags"),
  },
];

function fireCreate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("new-story:reset"));
  }
}

export default function Sidebar() {
  const pathname = usePathname() ?? "";

  return (
    <>
      {/* Tablet (md → lg): no persistent rail — a hamburger in the header
          opens a slide-out drawer instead. See TabletDrawer.tsx. */}

      {/* Desktop: full sidebar (lg+) */}
      <aside className="hidden lg:flex w-[17.0625rem] shrink-0 flex-col px-[20px] py-[24px] gap-[20px] overflow-y-auto scrollbar-hide shadow-[0_0_28.3px_0_rgba(0,0,0,0.10)] relative z-10">
        <Link href="/home" className="block">
          <img
            src={LogoDark.src}
            alt="Epoch Lag"
            className="w-[130px] h-auto object-contain"
          />
        </Link>

        <Link
          href="/new-story"
          onClick={fireCreate}
          className="cursor-pointer w-full bg-white rounded-full py-[8px] pl-[8px] pr-[16px] flex items-center gap-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] transition-shadow"
        >
          <div className="relative w-[36px] h-[36px] flex items-center justify-center shrink-0">
            <img src="/logo.svg" alt="" className="absolute inset-0 w-full h-full" />
            <PlusIcon
              width={16}
              height={16}
              strokeWidth={2}
              className="relative text-white"
            />
          </div>
          <span className="font-montserrat font-semibold text-primary-blue text-[15px]">
            Create
          </span>
        </Link>

        <nav className="flex flex-col gap-[2px]">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-[12px] px-[12px] py-[12px] rounded-[12px] font-montserrat text-[15px] transition-colors ${
                  active
                    ? "bg-[#EDEDED] text-primary-blue font-semibold"
                    : "text-primary-blue/85 font-medium hover:bg-black/[0.03]"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {active && (
                  <ChevronRightIcon
                    width={14}
                    height={14}
                    className="text-primary-blue/60"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <p className="font-montserrat text-primary-blue/40 text-[11px]">
          © {new Date().getFullYear()} Epoch Lag. All rights reserved.
        </p>
      </aside>
    </>
  );
}

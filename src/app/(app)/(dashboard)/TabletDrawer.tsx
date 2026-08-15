"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { User } from "../../../types/user";
import { bustUrl } from "../../../lib/images";
import {
  ChevronRightIcon,
  HomeIcon,
  InteractionsIcon,
  LibraryIcon,
  PlusIcon,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (p: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
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
    match: (p) => p.startsWith("/lags") || p.startsWith("/library"),
  },
];

function fireCreate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("new-story:reset"));
  }
}

export default function TabletDrawer({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
}) {
  const pathname = usePathname() ?? "";
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";
  const initial = (user?.firstName || "?").charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`hidden md:block lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <aside
        className={`absolute left-0 top-0 h-full w-[280px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex flex-col px-[20px] py-[24px] gap-[20px] transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-label="Navigation menu"
      >
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-[12px] px-[4px]"
        >
          <div className="w-[44px] h-[44px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center shrink-0">
            {user?.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bustUrl(user.profilePicture, user.updatedAt)}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-montserrat font-semibold text-[16px]">
                {initial}
              </span>
            )}
          </div>
          <span className="font-montserrat font-semibold text-primary-blue text-[15px] truncate">
            {displayName}
          </span>
        </Link>

        <Link
          href="/new-story"
          onClick={() => {
            fireCreate();
            onClose();
          }}
          className="cursor-pointer w-full bg-white rounded-full py-[8px] pl-[8px] pr-[16px] flex items-center gap-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.1)] transition-shadow"
        >
          <div className="relative w-[36px] h-[36px] flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt=""
              className="absolute inset-0 w-full h-full"
            />
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
                onClick={onClose}
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
      </aside>
    </div>
  );
}

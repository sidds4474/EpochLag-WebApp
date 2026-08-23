"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { User } from "../../../types/user";
import { bustUrl } from "../../../lib/images";
import {
  HomeIcon,
  InteractionsIcon,
  LibraryIcon,
  PersonIcon,
  PlusIcon,
} from "./icons";

type Item = {
  href: string;
  label: string;
  icon: ReactNode;
  match: (p: string) => boolean;
};

export default function BottomTabBar({ user }: { user: User | null }) {
  const pathname = usePathname() ?? "";
  const initial = (user?.firstName || "?").charAt(0).toUpperCase();

  const items: Item[] = [
    {
      href: "/home",
      label: "Home",
      icon: <HomeIcon width={22} height={22} />,
      match: (p) => p === "/home",
    },
    {
      href: "/moments",
      label: "Moments",
      icon: <InteractionsIcon width={22} height={22} />,
      match: (p) => p.startsWith("/moments"),
    },
    // center Create is rendered separately
    {
      href: "/lags",
      label: "Lags",
      icon: <LibraryIcon width={22} height={22} />,
      match: (p) => p.startsWith("/lags"),
    },
    {
      href: "/studio",
      label: "Studio",
      icon: user?.profilePicture ? (
        <span className="w-[24px] h-[24px] rounded-full overflow-hidden block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bustUrl(user.profilePicture, user.updatedAt)}
            alt=""
            className="w-full h-full object-cover"
          />
        </span>
      ) : user ? (
        <span className="w-[24px] h-[24px] rounded-full bg-primary-blue/15 text-primary-blue flex items-center justify-center text-[11px] font-semibold">
          {initial}
        </span>
      ) : (
        <PersonIcon width={22} height={22} />
      ),
      match: (p) => p.startsWith("/studio") || p.startsWith("/profile"),
    },
  ];

  const [left1, left2, right1, right2] = items;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-black/[0.06] pb-[max(env(safe-area-inset-bottom),8px)] pt-[8px]"
      aria-label="Primary"
    >
      <div className="relative flex items-center justify-around max-w-[520px] mx-auto px-[8px]">
        <TabButton item={left1} active={left1.match(pathname)} />
        <TabButton item={left2} active={left2.match(pathname)} />

        <Link
          href="/new-story"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("new-story:reset"));
            }
          }}
          aria-label="Create"
          className="cursor-pointer -mt-[26px] relative w-[56px] h-[56px] flex items-center justify-center shrink-0"
        >
          {/* Same concentric-ring logo mark the desktop sidebar Create uses,
              with a white plus overlaid. Keeps the visual language consistent. */}
          <img
            src="/logo.svg"
            alt=""
            className="absolute inset-0 w-full h-full"
          />
          <PlusIcon
            width={22}
            height={22}
            strokeWidth={2.5}
            className="relative text-white"
          />
        </Link>

        <TabButton item={right1} active={right1.match(pathname)} />
        <TabButton item={right2} active={right2.match(pathname)} />
      </div>
    </nav>
  );
}

function TabButton({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      className={`flex flex-col items-center gap-[2px] py-[6px] px-[8px] min-w-[44px] transition-colors ${
        active ? "text-primary-blue" : "text-primary-blue/50"
      }`}
    >
      {item.icon}
      {active && (
        <span className="w-[4px] h-[4px] rounded-full bg-primary-orange" />
      )}
    </Link>
  );
}

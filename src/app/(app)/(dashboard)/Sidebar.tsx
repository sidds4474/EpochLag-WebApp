"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LogoDark from "../../../assets/images/logo-dark.webp";
import type { HomePeople, PersonSummary } from "../../../types/home";
import {
  BookmarksIcon,
  ChevronRightIcon,
  DraftsIcon,
  HomeIcon,
  InteractionsIcon,
  LibraryIcon,
  PlusIcon,
} from "./icons";

type SidebarProps = {
  people: HomePeople | null;
};

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: ReactNode;
  match: (path: string) => boolean;
}> = [
  {
    href: "/home",
    label: "Home",
    icon: <HomeIcon width={18} height={18} />,
    match: (p) => p === "/home",
  },
  {
    href: "/interactions",
    label: "Interactions",
    icon: <InteractionsIcon width={18} height={18} />,
    match: (p) => p.startsWith("/interactions"),
  },
  {
    href: "/library",
    label: "Library",
    icon: <LibraryIcon width={18} height={18} />,
    match: (p) => p.startsWith("/library"),
  },
  {
    href: "/bookmarks",
    label: "Bookmarks",
    icon: <BookmarksIcon width={18} height={18} />,
    match: (p) => p.startsWith("/bookmarks"),
  },
  {
    href: "/drafts",
    label: "Drafts",
    icon: <DraftsIcon width={18} height={18} />,
    match: (p) => p.startsWith("/drafts"),
  },
];

export default function Sidebar({ people }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const hasFriends = (people?.users.length ?? 0) > 0;

  return (
    <aside className="hidden md:flex w-[220px] lg:w-[240px] shrink-0 flex-col px-[20px] py-[24px] gap-[20px] overflow-y-auto scrollbar-hide">
      <Link href="/home" className="block">
        <img
          src={LogoDark.src}
          alt="Epoch Lag"
          className="w-[130px] h-auto object-contain"
        />
      </Link>

      <Link
        href="/new-story"
        className="cursor-pointer w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] rounded-full py-[12px] flex items-center justify-center gap-[8px] hover:opacity-90 transition-opacity"
      >
        <PlusIcon width={16} height={16} />
        New Story
      </Link>

      <nav className="flex flex-col gap-[2px]">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-[12px] px-[12px] py-[10px] rounded-[10px] font-montserrat text-[14px] transition-colors ${
                active
                  ? "bg-black/[0.06] text-primary-blue font-semibold"
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

      <div className="h-px bg-black/[0.08] my-[4px]" />

      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between px-[2px]">
          <h3 className="font-montserrat font-bold text-primary-blue text-[14px]">
            Friends &amp; Family
          </h3>
          {hasFriends && (
            <Link
              href="/friends"
              className="font-montserrat text-primary-blue/60 text-[12px] hover:text-primary-blue"
            >
              View All
            </Link>
          )}
        </div>

        {people === null ? (
          <div className="flex flex-col gap-[6px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[36px] rounded-[10px] bg-black/[0.04] animate-pulse"
              />
            ))}
          </div>
        ) : hasFriends ? (
          <ul className="flex flex-col gap-[2px]">
            {people.users.slice(0, 6).map((person) => (
              <FriendRow key={person._id} person={person} />
            ))}
          </ul>
        ) : (
          <Link
            href="/friends"
            className="cursor-pointer flex items-center justify-center gap-[8px] border border-black/[0.15] rounded-full py-[10px] font-montserrat font-medium text-[13px] text-primary-blue/80 hover:bg-black/[0.03] transition-colors"
          >
            <PlusIcon width={14} height={14} />
            Add friends
          </Link>
        )}
      </div>

      <div className="flex-1" />

      <p className="font-montserrat text-primary-blue/40 text-[11px]">
        © {new Date().getFullYear()} Epoch Lag. All rights reserved.
      </p>
    </aside>
  );
}

function FriendRow({ person }: { person: PersonSummary }) {
  const initial = (person.firstName || "?").charAt(0).toUpperCase();
  return (
    <Link
      href={`/friends/${person._id}`}
      className="flex items-center gap-[10px] px-[6px] py-[6px] rounded-[10px] hover:bg-black/[0.03] transition-colors"
    >
      <div className="relative w-[32px] h-[32px] shrink-0">
        {person.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.profilePicture}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[13px]">
            {initial}
          </div>
        )}
        {person.newStory && (
          <span className="absolute -top-[1px] -right-[1px] w-[8px] h-[8px] rounded-full bg-primary-orange ring-2 ring-white" />
        )}
      </div>
      <span className="flex-1 font-montserrat font-medium text-primary-blue text-[14px] truncate">
        {person.firstName}
      </span>
      <ChevronRightIcon
        width={14}
        height={14}
        className="text-primary-blue/40"
      />
    </Link>
  );
}

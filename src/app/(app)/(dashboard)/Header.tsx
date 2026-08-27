"use client";

import Link from "next/link";
import type { User } from "../../../types/user";
import LogoDark from "../../../assets/images/logo-dark.webp";
import { bustUrl } from "../../../lib/images";
import HeaderSearch from "./HeaderSearch";
import { PersonIcon, SearchIcon } from "./icons";
import NotificationsBell from "./notifications/NotificationsBell";

type HeaderProps = {
  user: User | null;
  onOpenDrawer?: () => void;
};

function MenuIcon({ width = 24, height = 24 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export default function Header({ user, onOpenDrawer }: HeaderProps) {
  const initial = (user?.firstName || "?").charAt(0).toUpperCase();

  return (
    <header className="relative hidden md:flex items-center gap-[12px] md:gap-[16px] px-[16px] md:px-[32px] lg:px-[40px] pt-[16px] md:pt-[24px] pb-[16px] md:pb-[20px]">
      {/* Tablet (md → lg): hamburger left, wordmark centered, search+bell right.
          Desktop (lg+): search pill fills the middle, bell + avatar on the right. */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open menu"
        className="lg:hidden cursor-pointer p-[8px] -ml-[8px] rounded-full text-primary-blue hover:bg-black/[0.04] transition-colors"
      >
        <MenuIcon width={24} height={24} />
      </button>

      {/* Tablet-only: absolutely-centered wordmark */}
      <Link
        href="/home"
        className="lg:hidden absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LogoDark.src}
          alt="Epoch Lag"
          className="h-[26px] w-auto object-contain"
        />
      </Link>

      {/* Desktop-only: search pill fills the middle */}
      <div className="hidden lg:flex flex-1 max-w-[631px]">
        <HeaderSearch />
      </div>

      <div className="hidden lg:block flex-1" />

      {/* Tablet spacer — push right cluster to the far right */}
      <div className="flex-1 lg:hidden" />

      <div className="flex items-center justify-end gap-[8px] md:gap-[16px]">
        {/* Tablet-only: search icon button (no bar) */}
        <Link
          href="/search"
          aria-label="Search"
          className="lg:hidden cursor-pointer p-[8px] rounded-full text-primary-blue hover:bg-black/[0.04] transition-colors"
        >
          <SearchIcon width={24} height={24} />
        </Link>

        <NotificationsBell />

      <Link
        href="/studio"
        aria-label="Studio"
        className="cursor-pointer hidden lg:flex w-[40px] h-[40px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue items-center justify-center shrink-0"
      >
        {user?.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bustUrl(user.profilePicture, user.updatedAt)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : user ? (
          <span className="font-montserrat font-semibold text-[15px]">
            {initial}
          </span>
        ) : (
          <PersonIcon width={20} height={20} />
        )}
      </Link>
      </div>
    </header>
  );
}

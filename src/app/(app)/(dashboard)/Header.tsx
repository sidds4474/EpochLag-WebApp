"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { User } from "../../../types/user";
import LogoDark from "../../../assets/images/logo-dark.webp";
import { bustUrl } from "../../../lib/images";
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
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

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
      <form
        onSubmit={handleSubmit}
        className="hidden lg:block flex-1 max-w-[631px]"
      >
        <label className="relative block">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-[color:var(--color-surface-muted)] rounded-full pl-[16px] pr-[44px] py-[12px] font-montserrat font-medium text-primary-blue text-[16px] leading-[20px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
          />
          <button
            type="submit"
            aria-label="Search"
            className="cursor-pointer absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/70 hover:text-primary-blue"
          >
            <SearchIcon width={20} height={20} />
          </button>
        </label>
      </form>

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

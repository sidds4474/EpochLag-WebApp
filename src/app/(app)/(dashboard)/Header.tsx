"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { User } from "../../../types/user";
import { BellIcon, PersonIcon, SearchIcon } from "./icons";

type HeaderProps = {
  user: User | null;
  unreadCount: number;
};

export default function Header({ user, unreadCount }: HeaderProps) {
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
    <header className="flex items-center gap-[16px] px-[24px] md:px-[40px] pt-[24px] pb-[20px]">
      <div className="flex-1" />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[631px] shrink md:-translate-x-[110px] lg:-translate-x-[120px]"
      >
        <label className="relative block">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-[#ededed] rounded-full pl-[16px] pr-[44px] py-[12px] font-montserrat font-medium text-primary-blue text-[16px] leading-[20px] placeholder:text-[#a5a5a5] focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
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

      <div className="flex-1 flex items-center justify-end gap-[16px]">
        <Link
        href="/notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative cursor-pointer p-[8px] rounded-full text-primary-blue hover:bg-black/[0.04] transition-colors"
      >
        <BellIcon width={26} height={26} />
        {unreadCount > 0 && (
          <span className="absolute top-[6px] right-[6px] w-[8px] h-[8px] rounded-full bg-[#e53e3e] ring-2 ring-white" />
        )}
      </Link>

      <Link
        href="/profile"
        aria-label="Profile"
        className="cursor-pointer w-[40px] h-[40px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center shrink-0"
      >
        {user?.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.profilePicture}
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

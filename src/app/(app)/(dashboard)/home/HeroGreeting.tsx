"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import HeroImg from "../../../../assets/images/hero_img.jpg";
import { BellIcon, SearchIcon } from "../icons";

function getGreeting(hour: number): string {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

export default function HeroGreeting({
  firstName,
  unreadCount = 0,
}: {
  firstName: string;
  unreadCount?: number;
}) {
  const router = useRouter();
  const [greeting, setGreeting] = useState<string>(() =>
    getGreeting(new Date().getHours())
  );
  const [query, setQuery] = useState("");
  const timerRef = useRef<number | null>(null);

  // Roll the greeting over if the tab stays open past the bucket boundary.
  useEffect(() => {
    const tick = () => {
      setGreeting(getGreeting(new Date().getHours()));
      timerRef.current = window.setTimeout(tick, 60_000);
    };
    timerRef.current = window.setTimeout(tick, 60_000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const label = firstName ? `${greeting}, ${firstName}` : greeting;

  return (
    <section className="relative overflow-hidden rounded-[20px] md:rounded-[24px] text-white flex flex-col justify-end min-h-[110px] md:min-h-[128px] bg-primary-blue/10 md:ml-[14px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HeroImg.src}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        aria-hidden
      />
      {/* Bottom scrim so the greeting stays legible against any imagery */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0) 100%)",
        }}
        aria-hidden
      />
      {/* Mobile-only bell — plain white icon over the hero, no chrome
          behind it (matches the mobile app's GreetingRow). */}
      <Link
        href="/notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="md:hidden absolute top-[18px] right-[18px] w-[28px] h-[28px] flex items-center justify-center text-white"
      >
        <BellIcon width={22} height={22} />
        {unreadCount > 0 && (
          <span className="absolute top-[2px] right-[2px] w-[8px] h-[8px] rounded-full bg-primary-orange ring-2 ring-white" />
        )}
      </Link>

      <div className="relative px-[16px] md:px-[28px] pt-[20px] md:pt-[48px] pb-[16px] md:pb-[18px] flex flex-col gap-[14px]">
        <h1 className="font-montserrat font-medium text-white text-[22px] md:text-[24px] leading-[1.15] max-w-[80%]">
          {label}
        </h1>

        {/* Mobile-only search embedded in hero — matches HomeSearchBar */}
        <form onSubmit={onSubmit} className="md:hidden">
          <label className="relative block">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find memories"
              className="w-full bg-white rounded-full pl-[18px] pr-[44px] py-[12px] font-montserrat font-normal text-primary-blue text-[14px] leading-[16px] placeholder:text-[#848484] focus:outline-none shadow-[0_1px_3px_rgba(0,0,0,0.10)]"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-[16px] top-1/2 -translate-y-1/2 text-primary-blue/70"
            >
              <SearchIcon width={18} height={18} />
            </button>
          </label>
        </form>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { bustUrl } from "../../../../../lib/images";
import { LibraryIcon, MoreHorizontalIcon } from "../../icons";

function ParticipantIcon({ size = 13 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 13 13" fill="none">
      <circle cx="6.21102" cy="3.10549" r="2.07034" fill="currentColor" />
      <path
        d="M10.3517 9.05764C10.3517 10.344 10.3517 11.3868 6.21099 11.3868C2.07031 11.3868 2.07031 10.344 2.07031 9.05764C2.07031 7.7713 3.92415 6.72852 6.21099 6.72852C8.49782 6.72852 10.3517 7.7713 10.3517 9.05764Z"
        fill="currentColor"
      />
    </svg>
  );
}
import {
  timelineCover,
  timelineDateParts,
  timelineTitle,
  type TimelineEntry,
} from "../../../../../lib/library/timeline";

type TimelineTileProps = {
  entry: TimelineEntry;
  onHide: (storyId: string) => void;
};

const LONG_PRESS_MS = 500;

export default function TimelineTile({ entry, onHide }: TimelineTileProps) {
  const title = timelineTitle(entry);
  const cover = timelineCover(entry);
  const parts = timelineDateParts(entry);
  const people = entry.people ?? [];
  const primary = people[0];
  const participantCount = people.length;
  const storyId = entry.latestStory?._id ?? "";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const startLongPress = () => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setMenuOpen(true);
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (longPressFired.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressFired.current = false;
    }
  };

  const initial = (primary?.firstName || "?").charAt(0).toUpperCase();

  return (
    <div
      className="relative group"
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onTouchCancel={cancelLongPress}
    >
      <Link
        href={`/thread/${entry.threadId}`}
        onClickCapture={handleClickCapture}
        className="relative flex items-stretch bg-white rounded-[20px] shadow-[0_0_46px_0_rgba(0,0,0,0.15)] hover:shadow-[0_0_50px_0_rgba(0,0,0,0.2)] transition-shadow py-[6px] md:py-[8px] pr-[6px] md:pr-[8px]"
      >
        {parts && (
          <div className="shrink-0 flex flex-col items-center justify-center w-[80px] md:w-[100px]">
            <div className="font-montserrat font-medium text-primary-blue text-[28px] md:text-[34px] leading-none">
              {parts.day}
            </div>
            <div className="font-montserrat text-primary-blue/70 text-[12px] md:text-[13px] mt-[4px] lowercase">
              {parts.month}
            </div>
          </div>
        )}

        <div className="self-stretch w-px bg-black/[0.08]" />

        <div className="flex-1 min-w-0 flex flex-col justify-center gap-[10px] py-[4px] pl-[14px] md:pl-[18px] pr-[14px] md:pr-[18px]">
          <p className="font-montserrat font-medium text-primary-blue text-[14px] md:text-[16px] leading-[20px] line-clamp-2">
            {title}
          </p>
          <div className="flex items-center gap-[8px]">
            <div className="w-[24px] h-[24px] md:w-[28px] md:h-[28px] rounded-full overflow-hidden bg-primary-blue/15 shrink-0">
              {primary?.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bustUrl(primary.profilePicture, undefined)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[11px]">
                  {initial}
                </div>
              )}
            </div>
            {participantCount > 0 && (
              <div className="flex items-center gap-[4px] bg-[#F0F0F0] rounded-full px-[8px] py-[2px] text-[#1C274C]">
                <ParticipantIcon size={12} />
                <span className="font-montserrat text-[11px] md:text-[12px]">
                  {participantCount}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="relative shrink-0 w-[88px] h-[88px] md:w-[108px] md:h-[108px] rounded-l-none rounded-r-[14px] overflow-hidden bg-primary-blue/10">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bustUrl(cover, undefined)}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}
          <span className="absolute top-[8px] right-[8px] w-[26px] h-[26px] rounded-full bg-white/70 flex items-center justify-center text-[#092E4A]">
            <LibraryIcon width={13} height={13} />
          </span>
        </div>
      </Link>

      <div
        ref={menuRef}
        className="absolute top-1/2 -translate-y-1/2 right-[-44px] hidden md:block"
      >
        <button
          type="button"
          aria-label="Story options"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] text-primary-blue flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <MoreHorizontalIcon width={16} height={16} />
        </button>
        {menuOpen && (
          <div className="absolute top-[44px] right-0 min-w-[180px] bg-white rounded-[12px] shadow-[0_4px_18px_rgba(0,0,0,0.14)] py-[6px] z-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                if (storyId) onHide(storyId);
              }}
              className="w-full text-left cursor-pointer px-[14px] py-[8px] font-montserrat text-[13px] text-primary-blue hover:bg-black/[0.04]"
            >
              Hide from timeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

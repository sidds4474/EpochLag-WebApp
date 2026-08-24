"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { bustUrl } from "../../../../../lib/images";
import { toggleCardBookmark } from "../../../../../lib/home/api";
import { mintPromptPublicLink } from "../../../../../lib/share/api";
import { parseContentToBlocks } from "../../../../../lib/parseStoryContent";
import type { LibraryThread } from "../../../../../lib/library/api";
import { BookmarkIcon, LibraryIcon, SendIcon } from "../../icons";

function coverFor(t: LibraryThread): string | null {
  const s = t.latestStory;
  if (s?.content) {
    const blocks = parseContentToBlocks(s.content);
    const firstImage = blocks.find((b) => b.type === "image");
    if (firstImage && "url" in firstImage) return firstImage.url;
  }
  const firstMediaImage = s?.media?.find((m) => m.type === "image" && m.url);
  if (firstMediaImage?.url) return firstMediaImage.url;
  return t.promptCard?.imageUrl ?? null;
}

function titleFor(t: LibraryThread): string {
  return (
    t.latestStory?.title ||
    t.promptCard?.title ||
    t.promptCard?.content ||
    "Untitled story"
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatShortDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = DAYS[d.getDay()];
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const meridiem = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${day} ${h}:${m} ${meridiem}`;
}

function ParticipantIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 13 13"
      fill="none"
    >
      <circle cx="6.21102" cy="3.10549" r="2.07034" fill="currentColor" />
      <path
        d="M10.3517 9.05764C10.3517 10.344 10.3517 11.3868 6.21099 11.3868C2.07031 11.3868 2.07031 10.344 2.07031 9.05764C2.07031 7.7713 3.92415 6.72852 6.21099 6.72852C8.49782 6.72852 10.3517 7.7713 10.3517 9.05764Z"
        fill="currentColor"
      />
    </svg>
  );
}

type PlacePanelStoryRowProps = {
  thread: LibraryThread;
};

export default function PlacePanelStoryRow({ thread }: PlacePanelStoryRowProps) {
  const cover = coverFor(thread);
  const title = titleFor(thread);
  const firstPerson = thread.people?.[0];
  const participantCount = thread.totalPeople ?? thread.people?.length ?? 0;
  const avatar = firstPerson?.profilePicture ?? null;
  const initial = (firstPerson?.firstName || "?").charAt(0).toUpperCase();
  const dateStr = formatShortDate(
    thread.displayDate ?? thread.latestActivity ?? null
  );

  const bookmarkCardId = thread.promptCard?._id ?? thread._id;
  const [bookmarked, setBookmarked] = useState(!!thread.isBookmarked);
  const bookmarkPendingRef = useRef(false);
  const handleBookmarkToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (bookmarkPendingRef.current) return;
      bookmarkPendingRef.current = true;
      const prev = bookmarked;
      setBookmarked(!prev);
      try {
        await toggleCardBookmark(bookmarkCardId);
      } catch {
        setBookmarked(prev);
        toast.error("Couldn't update bookmark");
      } finally {
        bookmarkPendingRef.current = false;
      }
    },
    [bookmarked, bookmarkCardId]
  );

  const shareCardId = thread.promptCard?._id ?? null;
  const sharePendingRef = useRef(false);
  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!shareCardId || sharePendingRef.current) return;
      sharePendingRef.current = true;
      try {
        const { publicCode } = await mintPromptPublicLink(shareCardId);
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}/prompt/${publicCode}`;
        const shareData = { url, title: title || "Epoch Lag" };
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          navigator.canShare?.(shareData) !== false
        ) {
          try {
            await navigator.share(shareData);
          } catch {
            /* user dismissed */
          }
        } else if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        } else {
          toast.success(url);
        }
      } catch {
        toast.error("Couldn't create share link");
      } finally {
        sharePendingRef.current = false;
      }
    },
    [shareCardId, title]
  );

  const avatarNode = (
    <div className="w-[28px] h-[28px] rounded-full overflow-hidden bg-primary-blue/15 shrink-0">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bustUrl(avatar, undefined)}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[11px]">
          {initial}
        </div>
      )}
    </div>
  );

  const participantChip = participantCount > 0 && (
    <div className="flex items-center gap-[4px] bg-[#F0F0F0] rounded-full px-[8px] py-[2px] text-[#1C274C]">
      <ParticipantIcon size={11} />
      <span className="font-montserrat text-[11px] font-medium">
        {participantCount}
      </span>
    </div>
  );

  const bookmarkBtnMobile = (
    <button
      type="button"
      onClick={handleBookmarkToggle}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
      className="cursor-pointer w-[28px] h-[28px] rounded-full text-primary-blue flex items-center justify-center hover:bg-black/[0.05] transition-colors"
    >
      <BookmarkIcon width={14} height={16} filled={bookmarked} />
    </button>
  );

  return (
    <Link
      href={`/thread/${thread._id}`}
      className="relative block bg-white rounded-[16px] md:rounded-[20px] shadow-[0_0_25px_0_rgba(0,0,0,0.20)] hover:shadow-[0_0_30px_0_rgba(0,0,0,0.25)] transition-shadow overflow-hidden"
    >
      {/* Mobile: horizontal thumbnail | content. Desktop: cover on top,
          content below (with avatar/chip/bookmark overlaid on cover). */}
      <div className="flex md:block md:p-[8px]">
        <div className="relative shrink-0 w-[110px] aspect-square md:w-full md:aspect-[16/10] bg-primary-blue/10 md:rounded-t-[14px] md:overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bustUrl(cover, undefined)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : null}

          {/* Desktop overlay: avatar + chip top-left */}
          <div className="hidden md:flex absolute top-[10px] left-[10px] items-center gap-[6px]">
            <div className="relative w-[30px] h-[30px] shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-white/90 border-2 border-white">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bustUrl(avatar, undefined)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[11px]">
                    {initial}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-[2px] -right-[2px] w-[14px] h-[14px] rounded-full bg-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
                <LibraryIcon width={9} height={9} />
              </div>
            </div>
            {participantCount > 0 && (
              <div className="flex items-center gap-[4px] bg-white/90 rounded-full px-[8px] py-[3px] text-[#1C274C]">
                <ParticipantIcon size={11} />
                <span className="font-montserrat text-[11px] font-medium">
                  {participantCount}
                </span>
              </div>
            )}
          </div>

          {/* Desktop overlay: bookmark + share top-right */}
          <div className="hidden md:flex absolute top-[10px] right-[10px] flex-col gap-[6px]">
            <button
              type="button"
              onClick={handleBookmarkToggle}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              className="w-[30px] h-[30px] rounded-full bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.12)] text-primary-blue flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
            >
              <BookmarkIcon width={12} height={14} filled={bookmarked} />
            </button>
            {shareCardId && (
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share link"
                className="w-[30px] h-[30px] rounded-full bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.12)] text-primary-blue flex items-center justify-center hover:bg-white transition-colors cursor-pointer"
              >
                <SendIcon width={14} height={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between md:justify-start p-[12px] md:px-[6px] md:pt-[8px] md:pb-[4px] gap-[6px]">
          {/* Mobile top row: avatar/chip on left, bookmark on right */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center gap-[6px]">
              {avatarNode}
              {participantChip}
            </div>
            {bookmarkBtnMobile}
          </div>

          <p className="font-montserrat font-medium text-primary-blue text-[13px] md:text-[14px] leading-[18px] line-clamp-2">
            {title}
          </p>

          {dateStr && (
            <p className="md:hidden font-montserrat text-primary-blue/50 text-[11px]">
              {dateStr}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { BookmarkIcon, PersonIcon, SendIcon } from "../icons";
import Avatar from "../../../../components/Avatar";
import { bustUrl } from "../../../../lib/images";
import { parseContentToBlocks } from "../../../../lib/parseStoryContent";
import { toggleCardBookmark } from "../../../../lib/home/api";
import { mintPromptPublicLink } from "../../../../lib/share/api";
import type { LibraryThread } from "../../../../lib/library/api";

type StoryCardProps = {
  thread: LibraryThread;
  daysRemaining?: number | null;
  isSelecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (thread: LibraryThread) => void;
};

// Story covers live inside <image>URL</image> tags in latestStory.content,
// or as the first image entry in latestStory.media[]. Fall back to the
// prompt card's imageUrl when the story itself has no visual.
function coverFor(thread: LibraryThread): string | null {
  const s = thread.latestStory;
  if (s?.content) {
    const blocks = parseContentToBlocks(s.content);
    const firstImage = blocks.find((b) => b.type === "image");
    if (firstImage && "url" in firstImage) return firstImage.url;
  }
  const firstMediaImage = s?.media?.find((m) => m.type === "image" && m.url);
  if (firstMediaImage?.url) return firstMediaImage.url;
  return thread.promptCard?.imageUrl ?? null;
}

function titleFor(thread: LibraryThread): string {
  return (
    thread.latestStory?.title ||
    thread.promptCard?.title ||
    thread.promptCard?.content ||
    "Untitled story"
  );
}

export default function StoryCard({
  thread,
  daysRemaining,
  isSelecting = false,
  selected = false,
  onToggleSelect,
}: StoryCardProps) {
  const cover = coverFor(thread);
  const title = titleFor(thread);
  const participantCount = thread.totalPeople ?? thread.people?.length ?? 0;
  const firstPerson = thread.people?.[0];

  const bookmarkCardId = thread.promptCard?._id ?? thread._id;
  const [bookmarked, setBookmarked] = useState(!!thread.isBookmarked);
  const pendingRef = useRef(false);
  const handleBookmarkToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (pendingRef.current) return;
      pendingRef.current = true;
      const previous = bookmarked;
      setBookmarked(!previous);
      try {
        await toggleCardBookmark(bookmarkCardId);
      } catch {
        setBookmarked(previous);
        toast.error("Couldn't update bookmark");
      } finally {
        pendingRef.current = false;
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
        // Web Share API on mobile/supported browsers → native share sheet.
        // Otherwise → copy to clipboard.
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.share === "function" &&
          navigator.canShare?.(shareData) !== false
        ) {
          try {
            await navigator.share(shareData);
          } catch {
            // User dismissed the sheet — treat as no-op, don't toast.
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

  return (
    <Link
      href={`/thread/${thread._id}`}
      onClick={(e) => {
        if (isSelecting) {
          e.preventDefault();
          onToggleSelect?.(thread);
        }
      }}
      className="relative flex flex-col bg-white rounded-[22px] shadow-[0_0_18px_rgba(0,0,0,0.2)] hover:shadow-[0_0_22px_rgba(0,0,0,0.25)] transition-shadow pt-[8px] px-[8px] pb-[10px] md:pb-[16px] gap-[7px]"
    >
      <div className="relative aspect-[5/4] bg-primary-blue/10 rounded-[15px] overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bustUrl(cover, undefined)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}

        {typeof daysRemaining !== "number" && (
          <div className="absolute top-[10px] left-[10px] flex items-center gap-[6px]">
            <div className="rounded-full border-[2px] border-white overflow-hidden shrink-0 md:hidden">
              <Avatar
                user={{
                  firstName: firstPerson?.firstName,
                  profilePicture: firstPerson?.profilePicture ?? null,
                }}
                size={28}
              />
            </div>
            <div className="rounded-full border-[2px] border-white overflow-hidden shrink-0 hidden md:block">
              <Avatar
                user={{
                  firstName: firstPerson?.firstName,
                  profilePicture: firstPerson?.profilePicture ?? null,
                }}
                size={36}
              />
            </div>
            {participantCount > 0 && (
              <div className="bg-white border border-white rounded-full px-[8px] py-[4px] flex items-center gap-[4px]">
                <PersonIcon width={12} height={12} />
                <span className="font-montserrat font-medium text-primary-blue text-[12px] leading-[16px]">
                  {participantCount}
                </span>
              </div>
            )}
          </div>
        )}

        {isSelecting && (
          <span
            className={`absolute top-[10px] right-[10px] w-[26px] h-[26px] rounded-full flex items-center justify-center border transition-colors ${
              selected
                ? "bg-primary-orange border-primary-orange text-white"
                : "bg-black/25 border-white/70 text-transparent"
            }`}
            aria-hidden
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12l5 5L20 7"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        {!isSelecting && typeof daysRemaining === "number" ? (
          <span className="absolute top-[10px] right-[10px] bg-white rounded-full px-[10px] py-[4px] font-montserrat font-semibold text-[12px] text-primary-blue shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
            {daysRemaining} days
          </span>
        ) : !isSelecting ? (
          <div className="absolute top-[10px] right-[10px] flex flex-col gap-[6px] md:gap-[8px]">
            <button
              type="button"
              onClick={handleBookmarkToggle}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] rounded-full bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] flex items-center justify-center text-primary-blue hover:bg-white/95 transition-colors cursor-pointer"
            >
              <BookmarkIcon width={15} height={17} filled={bookmarked} />
            </button>
            {shareCardId && (
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share link"
                className="w-[28px] h-[28px] md:w-[36px] md:h-[36px] rounded-full bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.15)] flex items-center justify-center text-primary-blue hover:bg-white/95 transition-colors cursor-pointer"
              >
                <SendIcon width={16} height={16} />
              </button>
            )}
          </div>
        ) : null}
      </div>
      <div className="min-h-[36px] flex items-center justify-center px-[4px]">
        <p className="font-montserrat text-center text-primary-blue text-[14px] leading-[18px] line-clamp-2">
          {title}
        </p>
      </div>
    </Link>
  );
}

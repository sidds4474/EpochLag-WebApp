"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { BookmarkIcon, SendIcon } from "../icons";
import Avatar from "../../../../components/Avatar";
import SendToDrawer from "../../../../components/share/SendToDrawer";
import PromptPreviewCard from "../../../../components/share/PromptPreviewCard";
import { bustUrl } from "../../../../lib/images";
import QueuedImage from "../../../../components/QueuedImage";
import { parseContentToBlocks } from "../../../../lib/parseStoryContent";
import { toggleCardBookmark } from "../../../../lib/home/api";
import { shareUserCard } from "../../../../lib/create/api";
import { ApiError } from "../../../../lib/api/client";
import type { LibraryThread } from "../../../../lib/library/api";
import type { UserCard } from "../../../../types/home";

type StoryRowProps = {
  thread: LibraryThread;
  daysRemaining?: number | null;
  isSelecting?: boolean;
  selected?: boolean;
  onToggleSelect?: (thread: LibraryThread) => void;
};

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

function dateFor(thread: LibraryThread): string | null {
  const raw = thread.displayDate || thread.latestActivity || null;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StoryRow({
  thread,
  daysRemaining,
  isSelecting = false,
  selected = false,
  onToggleSelect,
}: StoryRowProps) {
  const cover = coverFor(thread);
  const title = titleFor(thread);
  const date = dateFor(thread);
  const people = (thread.people ?? []).slice(0, 4);

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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMounted, setShareMounted] = useState(false);
  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!shareCardId) return;
      setShareMounted(true);
      requestAnimationFrame(() => setShareOpen(true));
    },
    [shareCardId]
  );
  const closeShare = useCallback(() => {
    setShareOpen(false);
    window.setTimeout(() => setShareMounted(false), 320);
  }, []);

  async function handleShareSend(
    userIds: string[],
    groupIds: string[],
    _note: string
  ) {
    if (!shareCardId) return;
    try {
      await shareUserCard(shareCardId, {
        shareWith: userIds,
        groupIds,
        sendSeparately: false,
        note: "",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      throw new Error(message);
    }
  }

  const previewCard: UserCard | null = thread.promptCard
    ? ({
        _id: thread.promptCard._id ?? "",
        title: thread.promptCard.title ?? null,
        content: thread.promptCard.content ?? null,
        imageUrl: thread.promptCard.imageUrl ?? cover ?? null,
        author: thread.people?.[0]
          ? {
              _id: thread.people[0]._id ?? "",
              firstName: thread.people[0].firstName ?? "",
              lastName: thread.people[0].lastName ?? "",
              profilePicture: thread.people[0].profilePicture ?? null,
            }
          : null,
      } as UserCard)
    : null;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Link
        href={`/thread/${thread._id}`}
        onClick={(e) => {
          if (isSelecting) {
            e.preventDefault();
            onToggleSelect?.(thread);
          }
        }}
        className="group relative flex items-start gap-[16px] md:gap-[22px] py-[14px] md:py-[18px] border-b border-black/10 last:border-b-0"
      >
        {/* Polaroid frame */}
        <div className="relative shrink-0 bg-white p-[7px] md:p-[10px] rounded-[2px] shadow-[0_3px_4px_rgba(0,0,0,0.25)]">
          <div className="relative w-[86px] h-[91px] md:w-[128px] md:h-[135px] overflow-hidden bg-primary-blue/10">
            {cover ? (
              <QueuedImage
                src={bustUrl(cover, undefined)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}
          </div>
        </div>

        {/* Text + avatars */}
        <div className="flex-1 min-w-0 flex flex-col gap-[6px] md:gap-[8px] pt-[4px] md:pt-[10px]">
          <div className="flex flex-col gap-[2px]">
            <h3 className="font-ivy font-normal text-[15px] md:text-[17px] leading-[1.3] text-[#232323] break-words">
              {title}
            </h3>
            {date && (
              <p className="font-montserrat text-text-disabled text-[13px] md:text-[16px] leading-[1.35]">
                {date}
              </p>
            )}
          </div>

          <div className="flex items-center mt-[2px] md:mt-[6px]">
            {people.length > 0 ? (
              <div className="flex items-center">
                {people.map((p, i) => (
                  <div
                    key={p._id ?? i}
                    style={{ marginLeft: i === 0 ? 0 : -10 }}
                    className="rounded-full border-[1.6px] md:border-[2px] border-white overflow-hidden shrink-0"
                  >
                    <Avatar
                      user={{
                        firstName: p.firstName,
                        profilePicture: p.profilePicture ?? null,
                      }}
                      size={24}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <span className="h-[24px]" />
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="shrink-0 flex items-center gap-[12px] md:gap-[18px] pr-[4px] pt-[18px] md:pt-[24px]">
          {isSelecting ? (
            <span
              className={`w-[24px] h-[24px] rounded-full flex items-center justify-center border transition-colors ${
                selected
                  ? "bg-primary-orange border-primary-orange text-white"
                  : "bg-white border-black/30 text-transparent"
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
          ) : typeof daysRemaining === "number" ? (
            <span className="bg-white rounded-full px-[10px] py-[4px] font-montserrat font-semibold text-[12px] text-primary-blue shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
              {daysRemaining} days
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBookmarkToggle}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
                className="cursor-pointer text-[#232323] hover:opacity-70 transition-opacity"
              >
                <BookmarkIcon width={18} height={22} filled={bookmarked} />
              </button>
              {shareCardId && (
                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share link"
                  className="cursor-pointer text-[#232323] hover:opacity-70 transition-opacity"
                >
                  <SendIcon width={22} height={22} />
                </button>
              )}
            </>
          )}
        </div>
      </Link>

      {mounted &&
        shareMounted &&
        createPortal(
          <SendToDrawer
            open={shareOpen}
            onClose={closeShare}
            onSend={handleShareSend}
            shareContext="story"
            showMessageInput={false}
            shareTarget={{ kind: "story", id: thread._id }}
            previewContent={
              previewCard ? <PromptPreviewCard card={previewCard} /> : undefined
            }
          />,
          document.body
        )}
    </>
  );
}

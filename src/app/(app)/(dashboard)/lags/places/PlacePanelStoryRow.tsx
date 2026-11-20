"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { bustUrl } from "../../../../../lib/images";
import { toggleCardBookmark } from "../../../../../lib/home/api";
import { shareUserCard } from "../../../../../lib/create/api";
import { ApiError } from "../../../../../lib/api/client";
import { parseContentToBlocks } from "../../../../../lib/parseStoryContent";
import type { LibraryThread } from "../../../../../lib/library/api";
import type { UserCard } from "../../../../../types/home";
import SendToDrawer from "../../../../../components/share/SendToDrawer";
import PromptPreviewCard from "../../../../../components/share/PromptPreviewCard";
import Avatar from "../../../../../components/Avatar";
import { BookmarkIcon, SendIcon } from "../../icons";

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

function dateFor(t: LibraryThread): string | null {
  const iso =
    t.latestStory?.createdAt ||
    t.latestStory?.updatedAt ||
    t.latestActivity ||
    null;
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return t.displayDate || null;
}

type PlacePanelStoryRowProps = {
  thread: LibraryThread;
};

export default function PlacePanelStoryRow({ thread }: PlacePanelStoryRowProps) {
  const cover = coverFor(thread);
  const title = titleFor(thread);
  const date = dateFor(thread);
  const people = (thread.people ?? []).slice(0, 3);

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
        className="relative flex items-start gap-[12px] py-[12px] border-b border-black/10 last:border-b-0"
      >
        {/* Polaroid */}
        <div className="shrink-0 bg-white p-[6px] rounded-[2px] shadow-[0_3px_4px_rgba(0,0,0,0.22)]">
          <div className="relative w-[64px] h-[68px] md:w-[72px] md:h-[76px] overflow-hidden bg-primary-blue/10">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bustUrl(cover, undefined)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
        </div>

        {/* Title + date + avatars */}
        <div className="flex-1 min-w-0 flex flex-col gap-[4px] pt-[2px]">
          <p className="font-ivy font-normal text-[#232323] text-[15px] md:text-[16px] leading-[1.3] break-words">
            {title}
          </p>
          {date && (
            <p className="font-montserrat text-[#2c2c2c]/60 text-[12px] md:text-[13px]">
              {date}
            </p>
          )}
          {people.length > 0 && (
            <div className="flex items-center mt-[4px]">
              {people.map((p, i) => (
                <div
                  key={p._id ?? i}
                  style={{ marginLeft: i === 0 ? 0 : -8 }}
                  className="rounded-full border-[1.5px] border-white overflow-hidden shrink-0"
                >
                  <Avatar
                    user={{
                      firstName: p.firstName,
                      profilePicture: p.profilePicture ?? null,
                    }}
                    size={20}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookmark + Send on the right */}
        <div className="shrink-0 flex items-center gap-[10px] pt-[20px] text-[#232323]">
          <button
            type="button"
            onClick={handleBookmarkToggle}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
            className="cursor-pointer hover:opacity-70 transition-opacity"
          >
            <BookmarkIcon width={16} height={18} filled={bookmarked} />
          </button>
          {shareCardId && (
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share link"
              className="cursor-pointer hover:opacity-70 transition-opacity"
            >
              <SendIcon width={18} height={18} />
            </button>
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

"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { toggleCardBookmark } from "../../../../lib/home/api";
import type { UserCard } from "../../../../types/home";
import { BookmarkIcon, SendIcon } from "../icons";

type Props = {
  card: UserCard;
  onAnswer: () => void;
  onShare: () => void;
  // PromptDetail opens the card already flipped so the reader sees the
  // Answer / Send actions immediately. Tap anywhere on the back flips it to
  // reveal the cover.
  initialFlipped?: boolean;
};

// 3D card flip. Container establishes perspective; the inner "flipper" holds
// two absolute faces (front/back) with `backface-visibility: hidden`, and we
// rotateY the flipper on tap. Front intercepts the tap; back has its own
// buttons and back-arrow so we don't consume the tap there.
export default function InspirationCard({
  card,
  onAnswer,
  onShare,
  initialFlipped = false,
}: Props) {
  const [flipped, setFlipped] = useState(initialFlipped);
  const { bookmarked, toggle } = useInspirationBookmark(
    card._id,
    card.isBookmarked
  );

  const tag = card.tags?.[0];
  const caption = card.content || card.title || "Untitled";
  const imageSrc = card.imageUrl;

  return (
    <div className="[perspective:1400px] w-full h-full">
      <div
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] [will-change:transform]"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* FRONT */}
        <button
          type="button"
          onClick={() => setFlipped(true)}
          aria-label="View options for this prompt"
          className="absolute inset-0 [backface-visibility:hidden] cursor-pointer text-left bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.25)] pt-[12px] px-[12px] pb-[24px] flex flex-col gap-[20px] hover:shadow-[0_0_20px_rgba(0,0,0,0.28)] transition-shadow"
        >
          <div className="relative flex-1 min-h-0 rounded-t-[24px] overflow-hidden bg-primary-blue/10">
            {imageSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="relative flex items-start justify-between pt-[16px] pl-[16px] pr-[12px]">
              {tag ? (
                <span className="bg-white rounded-full px-[12px] py-[6px] font-montserrat font-medium text-primary-blue text-[14px] leading-[18px] capitalize">
                  {tag}
                </span>
              ) : (
                <span />
              )}
              <div className="flex flex-col items-center gap-[12px] text-primary-blue">
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      toggle();
                    }
                  }}
                  className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white border border-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <BookmarkIcon width={14} height={17} filled={bookmarked} />
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Send"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      onShare();
                    }
                  }}
                  className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white border border-white flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <SendIcon width={16} height={16} />
                </span>
              </div>
            </div>
          </div>
          <p className="font-montserrat font-medium text-primary-blue text-[14px] leading-[18px] text-center px-[8px] line-clamp-3">
            {caption}
          </p>
        </button>

        {/* BACK — whole card is a flip-back target; the two action buttons
            stopPropagation so they don't consume clicks that flip the card. */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Flip back"
          onClick={() => setFlipped(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped(false);
            }
          }}
          className="absolute inset-0 [backface-visibility:hidden] bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.25)] pt-[12px] px-[12px] pb-[24px] flex flex-col gap-[16px] cursor-pointer text-left"
          style={{ transform: "rotateY(180deg)" }}
        >
          {/* Top: same-height image so the flip feels like the same card. Back
              face only shows the tag pill — no save/share row. */}
          <div
            className="relative flex-1 min-h-0 rounded-t-[24px] overflow-hidden bg-primary-blue/10"
          >
            {imageSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="relative flex pt-[21px] pl-[20px]">
              {tag && (
                <span className="bg-white rounded-full px-[12px] py-[6px] font-montserrat font-medium text-primary-blue text-[14px] leading-[18px] capitalize">
                  {tag}
                </span>
              )}
            </div>
          </div>

          <p className="font-montserrat font-medium text-primary-blue text-[14px] leading-[18px] text-center px-[8px] line-clamp-3">
            {caption}
          </p>

          <div className="mt-auto flex flex-col gap-[8px] px-[10px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAnswer();
              }}
              className="cursor-pointer h-[44px] rounded-full bg-primary-orange text-white font-montserrat font-medium text-[14px] leading-[18px] hover:brightness-95 transition-[filter]"
            >
              Answer yourself
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="cursor-pointer h-[44px] rounded-full border-[1.5px] border-primary-blue text-primary-blue bg-white font-montserrat font-medium text-[14px] leading-[18px] hover:bg-primary-blue/[0.04] transition-colors"
            >
              Send it to someone
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Local variant of the same hook used inside new-story/page.tsx — optimistic
// bookmark toggle with rollback on failure. Kept alongside the card so we can
// delete the new-story copy once that flow is gone.
function useInspirationBookmark(cardId: string, initial: boolean) {
  const [bookmarked, setBookmarked] = useState(initial);
  const pendingRef = useRef(false);

  const toggle = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const previous = bookmarked;
    setBookmarked(!previous);
    try {
      await toggleCardBookmark(cardId);
    } catch {
      setBookmarked(previous);
      toast.error("Couldn't update bookmark");
    } finally {
      pendingRef.current = false;
    }
  }, [cardId, bookmarked]);

  return { bookmarked, toggle };
}

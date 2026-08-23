"use client";

import type { UserCard } from "../../../../types/home";
import { bustUrl } from "../../../../lib/images";
import { BookmarkIcon, PersonIcon } from "../icons";

type Props = {
  card: UserCard;
  onTap: () => void;
  onToggleBookmark: () => void;
  /** Fades the tile out (opacity + slight scale) before the parent
   *  removes it from the list. Used on the Bookmark tab when the user
   *  un-bookmarks a tile — mirrors the mobile "Saved" fade-out. */
  fadingOut?: boolean;
};

// Card tile shown under Received / Sent / Bookmark tabs. Layout mirrors
// the Figma: 60×60 (mobile) / 80×80 (desktop) cover thumb on the left,
// participant badge overlaid top-left, prompt/story title, timestamp,
// bookmark toggle on the top-right.
export default function CardTile({ card, onTap, onToggleBookmark, fadingOut }: Props) {
  const cover = pickCover(card);
  const title = resolveCardTitle(card);
  const timestamp = formatTimestamp(card.createdAt);
  const participants =
    (card.storyThread as { totalStories?: number } | null | undefined)?.totalStories ??
    card.shareWith?.length ??
    0;
  const bookmarked = card.isBookmarked === true;
  return (
    <div
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      }}
      className={`cursor-pointer group relative flex items-stretch gap-[12px] bg-white rounded-[16px] shadow-[0_0_25px_0_rgba(0,0,0,0.20)] p-[10px] transition-[opacity,transform] duration-[400ms] ease-in-out ${
        fadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      <div className="relative w-[80px] h-[92px] md:w-[100px] md:h-[100px] shrink-0 rounded-[12px] overflow-hidden bg-primary-blue/10">
        {cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-primary-blue/40 font-montserrat font-semibold text-[24px]">
            ?
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center pr-[36px]">
        {/* Participants chip — small avatar-count badge that reads "N
            participants" per the Figma. */}
        <span className="inline-flex items-center gap-[4px] w-fit rounded-full bg-[#ededed] text-primary-blue px-[8px] py-[2px] font-montserrat font-medium text-[11px]">
          <PersonIcon width={11} height={11} />
          {participants}
        </span>
        <p className="mt-[6px] font-montserrat font-medium text-primary-blue text-[14px] leading-[19px] line-clamp-2">
          {title}
        </p>
        <p className="mt-[6px] font-montserrat text-primary-blue/50 text-[12px]">
          {timestamp}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleBookmark();
        }}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
        className="cursor-pointer absolute top-[10px] right-[10px] w-[30px] h-[30px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center hover:brightness-95 transition-[filter]"
      >
        <BookmarkIcon width={16} height={16} filled={bookmarked} />
      </button>
    </div>
  );
}

function pickCover(card: UserCard): string | null {
  // Cover priority: story cover → prompt image. Neither survives a bust
  // key because these come from user-owned Cloudinary URLs with content-
  // hashed paths.
  const thread = card.storyThread as { coverImage?: string | null } | null | undefined;
  if (thread?.coverImage) return bustUrl(thread.coverImage, undefined);
  if (card.imageUrl) return bustUrl(card.imageUrl, undefined);
  return null;
}

// Prompt content typically holds the question; if empty we fall back to
// the story title or a placeholder so the tile never reads blank.
function resolveCardTitle(card: UserCard): string {
  const c = card.content?.trim();
  if (c) return c;
  const t = card.title?.trim();
  if (t) return t;
  return "Untitled story";
}

// "Thu 8:12 PM" style. Short readable form; matches Figma.
function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

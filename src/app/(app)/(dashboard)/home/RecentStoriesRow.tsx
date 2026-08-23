"use client";

import Link from "next/link";
import type { RecentStory } from "../../../../lib/home/api";
import { SectionHeader } from "../../../../components/ui";
import { bustUrl } from "../../../../lib/images";
import { BookmarkIcon, PersonIcon, SendIcon } from "../icons";
import { useBookmarkToggle } from "./useBookmarkToggle";

// Match the original For You card dimensions exactly.
const CARD_WIDTH = 240;
const CARD_HEIGHT = 270;

export default function RecentStoriesRow({
  stories,
  loading,
  onShare,
}: {
  stories: RecentStory[] | null;
  loading: boolean;
  onShare?: (s: RecentStory) => void;
}) {
  return (
    <section className="mt-[24px] md:mt-[32px]">
      <SectionHeader title="Recent Stories" viewAllHref="/lags" />
      {loading || stories === null ? (
        <StoriesSkeleton />
      ) : stories.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
          <div className="flex gap-[16px] snap-x snap-mandatory py-[20px] px-[20px]">
            {stories.map((s) => (
              <StoryTile key={s._id} story={s} onShare={onShare} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// 1:1 with the original For You card shell — rounded-[32px] outer, thick
// soft shadow, image with only top corners rounded, centered caption below.
function StoryTile({
  story,
  onShare,
}: {
  story: RecentStory;
  onShare?: (s: RecentStory) => void;
}) {
  const promptId = story.promptCard?._id ?? "";
  const { bookmarked, toggle } = useBookmarkToggle(
    promptId,
    story.isBookmarked ?? false
  );
  const cover =
    story.coverImage ||
    story.promptCard?.imageUrl ||
    story.latestStory?.media?.[0]?.url ||
    null;
  const title =
    story.promptCard?.title ||
    story.promptCard?.content ||
    story.latestStory?.content ||
    story.latestStory?.title ||
    "Untitled";
  // BE returns participants under `people`; total count may be `totalPeople`
  // when the list is truncated. Fall back to the array length otherwise.
  const people = story.people ?? [];
  const participantCount = story.totalPeople ?? people.length;
  const firstPerson = people[0];
  const authorPic = firstPerson?.profilePicture ?? null;
  const authorInitial = (firstPerson?.firstName || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <Link
      href={`/thread/${story._id}`}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className="snap-start shrink-0 bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.25)] pt-[12px] pb-[24px] px-[12px] flex flex-col gap-[20px]"
    >
      <div className="relative flex-1 min-h-0 rounded-tl-[24px] rounded-tr-[24px] overflow-hidden bg-primary-blue/10">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="relative pt-[21px] pl-[20px] pr-[16px] flex items-start justify-between">
          <div className="flex items-center gap-[6px]">
            <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
              {authorPic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bustUrl(authorPic, undefined)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[12px]">
                  {authorInitial}
                </div>
              )}
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

          <div className="flex flex-col gap-[10px]">
            <button
              type="button"
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle();
              }}
              className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-center text-primary-blue hover:bg-white/95 transition-colors"
            >
              <BookmarkIcon width={13} height={15} filled={bookmarked} />
            </button>
            <button
              type="button"
              aria-label="Share"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare?.(story);
              }}
              className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-center text-primary-blue hover:bg-white/95 transition-colors"
            >
              <SendIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
      <p className="font-montserrat font-medium text-primary-blue text-[13px] leading-[18px] text-center px-[8px] line-clamp-2">
        {title}
      </p>
    </Link>
  );
}

function StoriesSkeleton() {
  return (
    <div className="flex gap-[16px] overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
          className="shrink-0 bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.25)] pt-[12px] pb-[24px] px-[12px] flex flex-col gap-[20px]"
        >
          <div className="flex-1 rounded-tl-[24px] rounded-tr-[24px] bg-black/[0.06] animate-pulse" />
          <div className="h-[12px] mx-auto w-2/3 bg-black/[0.06] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.25)] px-[24px] py-[36px] text-center max-w-[520px]">
      <p className="font-montserrat font-medium text-primary-blue text-[14px]">
        No stories yet — start your first one.
      </p>
      <Link
        href="/new-story"
        className="inline-block mt-[12px] bg-primary-orange text-white rounded-full px-[18px] py-[10px] font-montserrat font-semibold text-[13px]"
      >
        Create a story
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LibraryThread } from "../../../../../lib/library/api";
import { fetchStudioCards } from "../../../../../lib/studio/api";
import type { UserCard } from "../../../../../types/home";
import { ChevronLeftIcon } from "../../icons";
import StoryRow from "../../lags/StoryRow";
import StoryRowSkeleton from "../../lags/StoryRowSkeleton";

const PAGE_SIZE = 10;

// A bookmarked prompt card maps to the fields StoryRow renders out of a
// LibraryThread: use the card id as the row's thread id (so the /thread/:id
// link still resolves via the prompt viewer), wire the card's image/title/
// content through promptCard, and surface the author as the single person
// on the row.
function cardToThread(card: UserCard): LibraryThread {
  return {
    _id: card._id,
    promptCard: {
      _id: card._id,
      title: card.title,
      content: card.content,
      imageUrl: card.imageUrl,
    },
    latestStory: null,
    people: card.author
      ? [
          {
            _id: card.author._id,
            firstName: card.author.firstName,
            lastName: card.author.lastName,
            profilePicture: card.author.profilePicture,
          },
        ]
      : [],
    totalPeople: card.author ? 1 : 0,
    isBookmarked: true,
    displayDate: card.createdAt,
    latestActivity: card.updatedAt ?? card.createdAt,
  };
}

export default function StudioBookmarksPage() {
  const [threads, setThreads] = useState<LibraryThread[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const { cards, pagination } = await fetchStudioCards(
        "bookmark",
        nextPage,
        PAGE_SIZE
      );
      const fresh = cards.map(cardToThread);
      setThreads((prev) => {
        const seen = new Set(prev.map((t) => t._id));
        return [...prev, ...fresh.filter((t) => !seen.has(t._id))];
      });
      setPage(nextPage);
      const cur = pagination?.pageNumber ?? pagination?.currentPage ?? nextPage;
      const total = pagination?.totalPages ?? 1;
      setHasMore(pagination ? cur < total : fresh.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load bookmarks");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (page !== 0) return;
    loadPage(1);
  }, [page, loadPage]);

  useEffect(() => {
    if (!hasMore || page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) {
          loadPage(page + 1);
        }
      },
      { root, rootMargin: "300px 0px 300px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, page, loading, loadPage]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#f3f1eb]">
      <div className="px-[12px] md:px-[32px] pt-[16px] max-w-[1400px] mx-auto w-full flex flex-col h-full min-h-0">
        {/* Header: back + Bookmarks title */}
        <div className="flex items-center gap-[12px] mb-[16px] md:mb-[20px]">
          <Link
            href="/studio"
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </Link>
          <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[32px] leading-[1.15]">
            Bookmarks
          </h1>
        </div>

        {/* List */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[40px] scrollbar-hide"
        >
          {error ? (
            <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
              {error}
            </p>
          ) : threads.length === 0 && loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-[32px] xl:gap-x-[56px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <StoryRowSkeleton key={i} />
              ))}
            </div>
          ) : threads.length === 0 && !loading ? (
            <p className="font-montserrat text-[#2c2c2c]/60 text-[14px] mt-[8px]">
              No bookmarks yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-[32px] xl:gap-x-[56px]">
              {threads.map((t) => (
                <StoryRow key={t._id} thread={t} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-[1px]" />
          {loading && threads.length > 0 && (
            <div className="flex justify-center mt-[16px]">
              <div className="w-[20px] h-[20px] border-[2px] border-[#2c2c2c]/20 border-t-[#2c2c2c] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

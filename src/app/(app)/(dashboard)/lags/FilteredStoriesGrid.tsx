"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchStories,
  type FetchStoriesParams,
  type LibraryThread,
} from "../../../../lib/library/api";
import StoryCard from "./StoryCard";
import StoryCardSkeleton from "./StoryCardSkeleton";

const PAGE_SIZE = 10;

type FilterKey = { personId?: string; groupId?: string };

// Shared "filtered story grid" used by /lags/people/[userId] and
// /lags/groups/[groupId]. Paginates via IntersectionObserver on a
// sentinel; results de-duped on _id.
export default function FilteredStoriesGrid({ filter }: { filter: FilterKey }) {
  const [threads, setThreads] = useState<LibraryThread[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const genRef = useRef(0);
  useEffect(() => {
    genRef.current += 1;
    setThreads([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, [filter.personId, filter.groupId]);

  const loadPage = useCallback(
    async (nextPage: number) => {
      const gen = genRef.current;
      setLoading(true);
      try {
        const params: FetchStoriesParams = {
          mode: "all",
          page: nextPage,
          limit: PAGE_SIZE,
        };
        if (filter.personId) params.personId = filter.personId;
        if (filter.groupId) params.groupId = filter.groupId;
        const { threads: fresh, pagination } = await fetchStories(params);
        if (gen !== genRef.current) return;
        setThreads((prev) => {
          const seen = new Set(prev.map((t) => t._id));
          return [...prev, ...fresh.filter((t) => !seen.has(t._id))];
        });
        setPage(nextPage);
        const cur = pagination?.pageNumber ?? pagination?.currentPage ?? nextPage;
        const total = pagination?.totalPages ?? 1;
        setHasMore(pagination ? cur < total : fresh.length === PAGE_SIZE);
      } catch (err) {
        if (gen !== genRef.current) return;
        setError(err instanceof Error ? err.message : "Couldn't load stories");
        setHasMore(false);
      } finally {
        if (gen === genRef.current) setLoading(false);
      }
    },
    [filter.personId, filter.groupId]
  );

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
    <div
      ref={scrollRef}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-[8px] md:px-[24px] pt-[8px] pb-[28px] scrollbar-hide"
    >
      {error ? (
        <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
          {error}
        </p>
      ) : threads.length === 0 && loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-[16px] md:gap-x-[24px] gap-y-[28px] md:gap-y-[40px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <StoryCardSkeleton key={i} />
          ))}
        </div>
      ) : threads.length === 0 && !loading ? (
        <p className="font-montserrat text-primary-blue/60 text-[14px] mt-[8px]">
          No stories to show.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-[16px] md:gap-x-[24px] gap-y-[28px] md:gap-y-[40px]">
          {threads.map((t) => (
            <StoryCard key={t._id} thread={t} />
          ))}
        </div>
      )}
      <div ref={sentinelRef} className="h-[1px]" />
      {loading && threads.length > 0 && (
        <div className="flex justify-center mt-[16px]">
          <div className="w-[20px] h-[20px] border-[2px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

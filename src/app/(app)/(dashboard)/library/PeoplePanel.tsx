"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bustUrl } from "../../../../lib/images";
import {
  fetchStories,
  fetchStoriesFilters,
  personStoryCount,
  type FilterPerson,
  type LibraryThread,
} from "../../../../lib/library/api";
import StoryCard from "./StoryCard";
import StoryCardSkeleton from "./StoryCardSkeleton";

const PAGE_SIZE = 10;

// Module-scoped cache of a friend's story list, so re-selecting the same
// friend renders instantly instead of refetching. Keyed by userId.
type PersonListCache = {
  threads: LibraryThread[];
  page: number;
  hasMore: boolean;
};
const personCache = new Map<string, PersonListCache>();
let filtersCache: FilterPerson[] | null = null;

function personLabel(p: FilterPerson): string {
  const first = p.firstName ?? "";
  const last = p.lastName ?? "";
  const full = `${first} ${last}`.trim();
  return full || p.epochlagID || "Friend";
}

function initialsFor(p: FilterPerson): string {
  const first = (p.firstName ?? "").trim();
  const last = (p.lastName ?? "").trim();
  const a = first ? first.charAt(0) : "";
  const b = last ? last.charAt(0) : "";
  return (a + b).toUpperCase() || "?";
}

// Two-panel view backing the Stories tab's People pill. Left rail lists
// every friend that has shared stories in the library; right pane loads
// paginated stories for the selected friend via /api/stories?people=<id>.
export default function PeoplePanel() {
  const [people, setPeople] = useState<FilterPerson[] | null>(filtersCache);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    filtersCache && filtersCache.length > 0 ? filtersCache[0]._id : null
  );

  const initial = selectedId ? personCache.get(selectedId) : null;
  const [threads, setThreads] = useState<LibraryThread[]>(
    initial?.threads ?? []
  );
  const [page, setPage] = useState(initial?.page ?? 0);
  const [hasMore, setHasMore] = useState(initial?.hasMore ?? true);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Skip refetch if we already have filters cached from a prior visit.
    if (filtersCache) return;
    let cancelled = false;
    fetchStoriesFilters()
      .then((f) => {
        if (cancelled) return;
        filtersCache = f.people;
        setPeople(f.people);
        if (f.people.length > 0 && selectedId === null) {
          setSelectedId(f.people[0]._id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPeopleError(
          err instanceof Error ? err.message : "Couldn't load people"
        );
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset the story list whenever a different friend is selected — hydrate
  // from cache first (renders instantly) then background-refresh page 1.
  useEffect(() => {
    if (!selectedId) return;
    const cached = personCache.get(selectedId);
    if (cached) {
      setThreads(cached.threads);
      setPage(cached.page);
      setHasMore(cached.hasMore);
    } else {
      setThreads([]);
      setPage(0);
      setHasMore(true);
    }
  }, [selectedId]);

  const loadPage = useCallback(
    async (personId: string, nextPage: number) => {
      setLoading(true);
      try {
        const { threads: fresh } = await fetchStories({
          mode: "all",
          page: nextPage,
          limit: PAGE_SIZE,
          personId,
        });
        setThreads((prev) => {
          const seen = new Set(prev.map((t) => t._id));
          const merged = [...prev, ...fresh.filter((t) => !seen.has(t._id))];
          const nextHasMore = fresh.length === PAGE_SIZE;
          personCache.set(personId, {
            threads: merged,
            page: nextPage,
            hasMore: nextHasMore,
          });
          return merged;
        });
        setPage(nextPage);
        setHasMore(fresh.length === PAGE_SIZE);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedId) return;
    if (page !== 0) return;
    loadPage(selectedId, 1);
  }, [selectedId, page, loadPage]);

  useEffect(() => {
    if (!selectedId || !hasMore || page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) {
          loadPage(selectedId, page + 1);
        }
      },
      { root, rootMargin: "300px 0px 300px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [selectedId, hasMore, page, loading, loadPage]);

  const selectedPerson = useMemo(
    () => (people ?? []).find((p) => p._id === selectedId) ?? null,
    [people, selectedId]
  );

  return (
    <div className="flex flex-1 min-h-0 gap-[20px]">
      <aside className="w-[320px] shrink-0 bg-[#EDEDED] rounded-[20px] flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-[10px]">
          {peopleError ? (
            <p className="font-montserrat text-primary-orange text-[13px] px-[8px] py-[12px]">
              {peopleError}
            </p>
          ) : people === null ? (
            <ul className="flex flex-col gap-[6px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="h-[64px] bg-white/60 rounded-[16px] animate-pulse"
                />
              ))}
            </ul>
          ) : people.length === 0 ? (
            <p className="font-montserrat text-primary-blue/60 text-[13px] px-[8px] py-[12px]">
              No friends with shared stories yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-[4px]">
              {people.map((p) => {
                const active = p._id === selectedId;
                const count = personStoryCount(p);
                return (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p._id)}
                      className={`w-full flex items-center gap-[12px] rounded-[16px] px-[10px] py-[10px] text-left transition-colors cursor-pointer ${
                        active
                          ? "bg-[#D9D9D9]"
                          : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <div className="w-[42px] h-[42px] rounded-full overflow-hidden bg-primary-blue/15 shrink-0">
                        {p.profilePicture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bustUrl(p.profilePicture, undefined)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[13px]">
                            {initialsFor(p)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-montserrat font-semibold text-primary-blue text-[14px] leading-[18px] truncate">
                          {personLabel(p)}
                        </p>
                        <p className="font-montserrat text-primary-blue/60 text-[12px] leading-[16px]">
                          {count} {count === 1 ? "Story" : "Stories"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <div
        ref={scrollRef}
        className="flex-1 min-w-0 overflow-y-auto px-[20px] pt-[16px] pb-[28px] scrollbar-hide"
      >
        {!selectedPerson ? (
          <p className="font-montserrat text-primary-blue/60 text-[13px] mt-[12px]">
            {people === null ? "" : "Select a friend to see shared stories."}
          </p>
        ) : threads.length === 0 && loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-[20px] gap-y-[32px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        ) : threads.length === 0 && !loading ? (
          <p className="font-montserrat text-primary-blue/60 text-[13px] mt-[12px]">
            No stories shared with {personLabel(selectedPerson)} yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-[20px] gap-y-[32px]">
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
    </div>
  );
}

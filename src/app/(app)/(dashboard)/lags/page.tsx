"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  deleteStories,
  fetchStories,
  permanentDeleteStories,
  removeCardFromFeed,
  type LibraryThread,
  type StoriesMode,
} from "../../../../lib/library/api";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import StoryCard from "./StoryCard";
import StoryCardSkeleton from "./StoryCardSkeleton";
import MediaTypePanel from "./MediaTypePanel";
import FiltersPopover, {
  activeFilterCount,
  DEFAULT_FILTERS,
  type FilterMode,
  type FilterState,
} from "./FiltersPopover";
import { useSelectMode } from "./selectMode";

const PAGE_SIZE = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DELETED_RETENTION_DAYS = 30;

const MODE_TO_STORIES_MODE: Record<FilterMode, StoriesMode> = {
  recent: "latest",
  loved: "loved",
  deleted: "deleted",
};

function daysRemainingFor(thread: LibraryThread): number | null {
  const beValue = thread.latestStory?.daysRemaining;
  if (typeof beValue === "number") return beValue;
  const hiddenAt = thread.latestStory?.hiddenAt ?? thread.hiddenAt;
  if (!hiddenAt) return null;
  const parsed = Date.parse(hiddenAt);
  if (Number.isNaN(parsed)) return null;
  const elapsed = Math.floor((Date.now() - parsed) / MS_PER_DAY);
  return Math.max(0, DELETED_RETENTION_DAYS - elapsed);
}

function cardKeyFor(thread: LibraryThread): string {
  return thread.latestStory?._id ?? thread._id;
}

export default function LagsAllPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);

  const [threads, setThreads] = useState<LibraryThread[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const {
    isSelecting,
    setCanSelect,
    toggle: toggleSelectMode,
    exit: exitSelect,
    setHeaderRight,
  } = useSelectMode();

  useEffect(() => setCanSelect(true), [setCanSelect]);

  // When leaving the All tab (component unmounts), exit selection mode so
  // the trigger resets and selection doesn't leak across data sources.
  useEffect(() => {
    return () => {
      exitSelect();
    };
  }, [exitSelect]);

  useEffect(() => {
    if (!isSelecting) setSelected(new Set());
  }, [isSelecting]);

  useEffect(() => {
    setSelected(new Set());
    exitSelect();
  }, [filters, exitSelect]);

  const toggleSelect = useCallback((thread: LibraryThread) => {
    const key = cardKeyFor(thread);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    setThreads([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, [filters]);

  const requestGenRef = useRef(0);
  useEffect(() => {
    requestGenRef.current += 1;
  }, [filters]);

  const storiesMode = MODE_TO_STORIES_MODE[filters.mode];

  const loadPage = useCallback(
    async (nextPage: number) => {
      const gen = requestGenRef.current;
      setLoading(true);
      try {
        const { threads: fresh, pagination } = await fetchStories({
          mode: storiesMode,
          page: nextPage,
          limit: PAGE_SIZE,
          tags: filters.categories.length > 0 ? filters.categories : undefined,
        });
        if (gen !== requestGenRef.current) return;
        setThreads((prev) => {
          const seen = new Set(prev.map((t) => t._id));
          return [...prev, ...fresh.filter((t) => !seen.has(t._id))];
        });
        setPage(nextPage);
        const currentPageNum =
          pagination?.pageNumber ?? pagination?.currentPage ?? nextPage;
        const totalPages = pagination?.totalPages ?? 1;
        const more = pagination
          ? currentPageNum < totalPages
          : fresh.length === PAGE_SIZE;
        setHasMore(more);
      } catch (err) {
        if (gen !== requestGenRef.current) return;
        setError(err instanceof Error ? err.message : "Couldn't load stories");
        setHasMore(false);
      } finally {
        if (gen === requestGenRef.current) setLoading(false);
      }
    },
    [storiesMode, filters.categories]
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

  const filterCount = useMemo(() => activeFilterCount(filters), [filters]);
  const selectedCount = selected.size;

  const handleBatchDelete = useCallback(async () => {
    const picked = threads.filter((t) => selected.has(cardKeyFor(t)));
    if (picked.length === 0) return;
    const storyIds = picked.map(cardKeyFor);
    const previousThreads = threads;
    setThreads((prev) => prev.filter((t) => !selected.has(cardKeyFor(t))));
    setSelected(new Set());
    setConfirmOpen(false);
    exitSelect();

    try {
      if (filters.mode === "deleted") {
        await permanentDeleteStories(storyIds);
      } else {
        await deleteStories(storyIds);
        await Promise.allSettled(
          picked
            .map((t) => t.promptCard?._id)
            .filter((id): id is string => !!id)
            .map((id) => removeCardFromFeed(id))
        );
      }
      toast.success(
        filters.mode === "deleted" ? "Deleted permanently" : "Moved to Deleted"
      );
    } catch (err) {
      setThreads(previousThreads);
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete stories"
      );
    }
  }, [filters.mode, exitSelect, selected, threads]);

  // Batch "Add to Album" — wired up but disabled while the Albums feature is
  // commented out. When Albums ships, uncomment the state + handler + the
  // BatchActionsMenu trigger in the header/toolbar below.
  //
  // const cardIdToThreadIdRef = useRef<Record<string, string>>({});
  // useEffect(() => {
  //   const map: Record<string, string> = {};
  //   for (const t of threads) {
  //     const cardId = cardKeyFor(t);
  //     const threadId = t.latestStory?._id ?? t._id;
  //     if (cardId && threadId) map[cardId] = threadId;
  //   }
  //   cardIdToThreadIdRef.current = map;
  // }, [threads]);
  //
  // const [showBatchMenu, setShowBatchMenu] = useState(false);
  // const [showAddToAlbum, setShowAddToAlbum] = useState(false);
  // const [albumThreadIds, setAlbumThreadIds] = useState<string[]>([]);
  //
  // const handleBatchAddToAlbum = useCallback(() => {
  //   const ids = Array.from(selected)
  //     .map((cid) => cardIdToThreadIdRef.current[cid] || cid)
  //     .filter(Boolean);
  //   setAlbumThreadIds(ids);
  //   setShowAddToAlbum(true);
  //   setShowBatchMenu(false);
  // }, [selected]);

  // Register Filters + selection controls in the shared header-right slot of
  // the tab row. Default state: [Filters] [Select]. Selecting state:
  // [Filters] [{n} lags selected] [trash (if n>0)] [X close].
  useEffect(() => {
    setHeaderRight(
      <div className="flex items-center gap-[12px] md:gap-[16px]">
        <div className="relative">
          <button
            ref={filtersButtonRef}
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="cursor-pointer inline-flex items-center gap-[8px] bg-white border border-black/[0.14] text-primary-blue rounded-full pl-[14px] pr-[14px] py-[8px] hover:bg-black/[0.03] transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9.5 14C11.1569 14 12.5 15.3431 12.5 17C12.5 18.6568 11.1569 20 9.5 20C7.84315 20 6.5 18.6568 6.5 17C6.5 15.3431 7.84315 14 9.5 14Z"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <path
                d="M14.5 3.99998C12.8431 3.99998 11.5 5.34312 11.5 6.99998C11.5 8.65683 12.8431 9.99998 14.5 9.99998C16.1569 9.99998 17.5 8.65683 17.5 6.99998C17.5 5.34312 16.1569 3.99998 14.5 3.99998Z"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <path
                d="M15 16.959L22 16.959"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <path
                d="M9 6.95898L2 6.95898"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <path
                d="M2 16.959L4 16.959"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
              <path
                d="M22 6.95898L20 6.95898"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
            <span className="font-montserrat font-medium text-[13px]">Filters</span>
            {filterCount > 0 && (
              <span
                aria-label={`${filterCount} active filters`}
                className="inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[11px] px-[6px]"
              >
                {filterCount}
              </span>
            )}
          </button>
          <FiltersPopover
            open={filtersOpen}
            anchorRef={filtersButtonRef}
            applied={filters}
            onClose={() => setFiltersOpen(false)}
            onApply={(next) => {
              setFilters(next);
              setFiltersOpen(false);
            }}
          />
        </div>
        {!isSelecting ? (
          <button
            type="button"
            onClick={toggleSelectMode}
            className="cursor-pointer font-montserrat text-black text-[14px] hover:opacity-80 transition-opacity"
          >
            Select
          </button>
        ) : (
          <>
            {selectedCount > 0 && (
              <>
                <span className="font-montserrat text-primary-blue text-[14px]">
                  {selectedCount} {selectedCount === 1 ? "lag" : "lags"} selected
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  aria-label="Delete selected"
                  className="cursor-pointer w-[32px] h-[32px] flex items-center justify-center text-primary-orange hover:opacity-80 transition-opacity"
                >
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V7"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {/*
                  Batch actions "···" menu — shown here when Albums ships.
                  Currently hidden because the only action is Add to Album.
                <button
                  type="button"
                  onClick={() => setShowBatchMenu(true)}
                  aria-label="More actions"
                  className="cursor-pointer w-[32px] h-[32px] flex items-center justify-center text-primary-blue hover:opacity-80"
                >
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                    <circle cx={5} cy={12} r={2} />
                    <circle cx={12} cy={12} r={2} />
                    <circle cx={19} cy={12} r={2} />
                  </svg>
                </button>
                */}
              </>
            )}
            <button
              type="button"
              onClick={exitSelect}
              aria-label="Exit selection mode"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-primary-blue text-white flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    );
    return () => setHeaderRight(null);
  }, [
    isSelecting,
    toggleSelectMode,
    exitSelect,
    setHeaderRight,
    filtersOpen,
    filterCount,
    filters,
    selectedCount,
  ]);

  // Media-type filter uses the existing media-gallery endpoint. When any
  // type is selected we render MediaTypePanel's overview strip(s) above
  // the story grid — both filters compose, since media strips and the
  // story grid are independent surfaces. Category (tags) still narrows
  // the story grid; the media strips are always all-media (BE endpoint
  // has no tags param).
  const mediaTypeToBucket: Record<
    "audio" | "gallery" | "video",
    "audio" | "image" | "video"
  > = { audio: "audio", gallery: "image", video: "video" };
  const bucketTypes = filters.mediaTypes.map((t) => mediaTypeToBucket[t]);
  const showMediaStrip = bucketTypes.length > 0;
  // Story grid is hidden when the only active filter is media type —
  // media strip stands alone. Any category or mode change brings the
  // grid back so both surfaces show together.
  const showStoryGrid =
    !showMediaStrip ||
    filters.categories.length > 0 ||
    filters.mode !== "recent";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-0 md:px-[24px] pt-[8px] pb-[28px] scrollbar-hide"
      >
        {showMediaStrip && (
          <div className={showStoryGrid ? "mb-[24px]" : ""}>
            <MediaTypePanel visibleTypes={bucketTypes} />
          </div>
        )}
        {!showStoryGrid ? null : error ? (
          <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
            {error}
          </p>
        ) : threads.length === 0 && loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-[10px] md:gap-x-[24px] gap-y-[18px] md:gap-y-[40px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        ) : threads.length === 0 && !loading ? (
          <p className="font-montserrat text-primary-blue/60 text-[14px] mt-[8px]">
            No stories to show.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-[10px] md:gap-x-[24px] gap-y-[18px] md:gap-y-[40px]">
            {threads.map((t) => (
              <StoryCard
                key={t._id}
                thread={t}
                daysRemaining={
                  filters.mode === "deleted" ? daysRemainingFor(t) : null
                }
                isSelecting={isSelecting}
                selected={selected.has(cardKeyFor(t))}
                onToggleSelect={toggleSelect}
              />
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

      {/* Mobile bottom toolbar — matches the mobile Figma. Desktop puts these
          actions inline in the header (see setHeaderRight above), so this is
          md:hidden. The "···" more-actions button is omitted while Albums is
          disabled (its only action is Add to Album). */}
      {isSelecting && selectedCount > 0 && (
        <div className="md:hidden fixed left-0 right-0 bottom-0 z-40 flex items-center justify-between bg-white border-t border-black/10 px-[20px] py-[14px] shadow-[0_-2px_16px_rgba(0,0,0,0.08)]">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete selected"
            className="cursor-pointer w-[36px] h-[36px] flex items-center justify-center text-primary-orange"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V7"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span className="font-montserrat font-medium text-primary-blue text-[14px]">
            {selectedCount} {selectedCount === 1 ? "Story" : "Stories"} selected
          </span>
          {/* Batch actions "···" — shown here when Albums ships.
          <button
            type="button"
            onClick={() => setShowBatchMenu(true)}
            aria-label="More actions"
            className="cursor-pointer w-[36px] h-[36px] flex items-center justify-center text-primary-blue"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
              <circle cx={5} cy={12} r={2} />
              <circle cx={12} cy={12} r={2} />
              <circle cx={19} cy={12} r={2} />
            </svg>
          </button>
          */}
          <span className="w-[36px] h-[36px]" aria-hidden />
        </div>
      )}

      <ConfirmationModal
        open={confirmOpen}
        title={
          filters.mode === "deleted"
            ? "Delete permanently?"
            : "Move to Deleted?"
        }
        body={
          filters.mode === "deleted"
            ? `${selectedCount} ${selectedCount === 1 ? "story" : "stories"} will be permanently removed. This can't be undone.`
            : `${selectedCount} ${selectedCount === 1 ? "story" : "stories"} will be moved to Deleted. You have 30 days to restore.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleBatchDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

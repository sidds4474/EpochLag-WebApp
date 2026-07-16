"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  deleteStories,
  fetchStories,
  permanentDeleteStories,
  removeCardFromFeed,
  STORY_TAGS,
  type LibraryThread,
  type StoriesMode,
} from "../../../../lib/library/api";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import StoryCard from "./StoryCard";
import StoryCardSkeleton from "./StoryCardSkeleton";
import { useSelectMode } from "./selectMode";

type PillId =
  | "recent"
  | "myStories"
  | "categories"
  | "people"
  | "media"
  | "loved"
  | "deleted";

type PillDef = {
  id: PillId;
  label: string;
  mode: StoriesMode | null;
};

const PILLS: PillDef[] = [
  { id: "recent", label: "Recent", mode: "latest" },
  { id: "myStories", label: "My Stories", mode: "myStories" },
  { id: "categories", label: "Categories", mode: "latest" },
  { id: "people", label: "People", mode: null },
  { id: "media", label: "Media Type", mode: null },
  { id: "loved", label: "Loved", mode: "loved" },
  { id: "deleted", label: "Deleted", mode: "deleted" },
];

const PAGE_SIZE = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DELETED_RETENTION_DAYS = 30;

function daysRemainingFor(thread: LibraryThread): number | null {
  if (!thread.hiddenAt) return null;
  const parsed = Date.parse(thread.hiddenAt);
  if (Number.isNaN(parsed)) return null;
  const elapsed = Math.floor((Date.now() - parsed) / MS_PER_DAY);
  return Math.max(0, DELETED_RETENTION_DAYS - elapsed);
}

// Mirrors mobile's getCardId — latestStory._id is the selection key and
// the storyId sent to /api/stories/delete. Falls back to the thread _id
// on cards missing a latestStory.
function cardKeyFor(thread: LibraryThread): string {
  return thread.latestStory?._id ?? thread._id;
}

export default function LibraryStoriesPage() {
  const [activePill, setActivePill] = useState<PillId>("recent");
  const [activeTags, setActiveTags] = useState<string[]>([]);
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
    canSelect,
    setCanSelect,
    toggle: toggleSelectMode,
    exit: exitSelect,
    setHeaderRight,
  } = useSelectMode();

  const activeDef = useMemo(
    () => PILLS.find((p) => p.id === activePill)!,
    [activePill]
  );

  // Select is only meaningful when the active pill is a card grid. People
  // and Media Type have different content shapes.
  useEffect(() => {
    setCanSelect(activePill !== "people" && activePill !== "media");
  }, [activePill, setCanSelect]);

  // Register the Stories tab's Select/Done button in the shared header slot.
  useEffect(() => {
    if (!canSelect) {
      setHeaderRight(null);
      return;
    }
    setHeaderRight(
      <button
        type="button"
        onClick={toggleSelectMode}
        className="cursor-pointer font-montserrat text-black text-[14px] hover:opacity-80 transition-opacity"
      >
        {isSelecting ? "Done" : "Select"}
      </button>
    );
    return () => setHeaderRight(null);
  }, [canSelect, isSelecting, toggleSelectMode, setHeaderRight]);

  // Exiting select mode (or switching pills) clears the current picks.
  useEffect(() => {
    if (!isSelecting) setSelected(new Set());
  }, [isSelecting]);
  useEffect(() => {
    setSelected(new Set());
    exitSelect();
  }, [activePill, exitSelect]);

  const toggleSelect = useCallback((thread: LibraryThread) => {
    const key = cardKeyFor(thread);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Clear tag selection when moving away from Categories so it doesn't
  // silently re-apply if the user comes back.
  useEffect(() => {
    if (activePill !== "categories" && activeTags.length > 0) {
      setActiveTags([]);
    }
  }, [activePill, activeTags.length]);

  useEffect(() => {
    setThreads([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, [activePill, activeTags]);

  const loadPage = useCallback(
    async (nextPage: number) => {
      if (!activeDef.mode) return;
      setLoading(true);
      try {
        const { threads: fresh, pagination } = await fetchStories({
          mode: activeDef.mode,
          page: nextPage,
          limit: PAGE_SIZE,
          tags: activePill === "categories" ? activeTags : undefined,
        });
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
        setError(err instanceof Error ? err.message : "Couldn't load stories");
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [activeDef.mode, activePill, activeTags]
  );

  useEffect(() => {
    if (!activeDef.mode) return;
    if (page !== 0) return;
    loadPage(1);
  }, [activeDef.mode, page, loadPage]);

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

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const showCategoryChips = activePill === "categories";
  const isPlaceholder = activeDef.mode === null;
  const selectedCount = selected.size;

  // Batch delete flow. Endpoint switches on the active pill: normal pills
  // soft-delete stories and best-effort clear the source card from the
  // For-You feed; Deleted pill wipes permanently.
  const handleBatchDelete = useCallback(async () => {
    const picked = threads.filter((t) => selected.has(cardKeyFor(t)));
    if (picked.length === 0) return;
    const storyIds = picked.map(cardKeyFor);
    const previousThreads = threads;
    // Optimistic removal.
    setThreads((prev) => prev.filter((t) => !selected.has(cardKeyFor(t))));
    setSelected(new Set());
    setConfirmOpen(false);
    exitSelect();

    try {
      if (activePill === "deleted") {
        await permanentDeleteStories(storyIds);
      } else {
        await deleteStories(storyIds);
        // Best-effort side effect — don't fail the whole op if these throw.
        await Promise.allSettled(
          picked
            .map((t) => t.promptCard?._id)
            .filter((id): id is string => !!id)
            .map((id) => removeCardFromFeed(id))
        );
      }
      toast.success(
        activePill === "deleted"
          ? "Deleted permanently"
          : "Moved to Deleted"
      );
    } catch (err) {
      setThreads(previousThreads);
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete stories"
      );
    }
  }, [activePill, exitSelect, selected, threads]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-[10px] mb-[16px]">
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-primary-blue/70"
          aria-hidden
        >
          <path
            d="M3 6h18M6 12h12M10 18h4"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </svg>
        <div className="flex-1 flex items-center gap-[8px] flex-wrap">
          {PILLS.map((p) => {
            const active = p.id === activePill;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePill(p.id)}
                className={`cursor-pointer px-[12px] py-[3px] rounded-full font-montserrat text-[12px] border transition-colors ${
                  active
                    ? "bg-primary-blue text-white border-primary-blue font-semibold"
                    : "bg-white text-primary-blue border-black/[0.14] font-medium hover:bg-black/[0.03]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {showCategoryChips && (
        <div className="flex items-center gap-[8px] flex-wrap mb-[16px]">
          {STORY_TAGS.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`cursor-pointer px-[10px] py-[2px] rounded-full font-montserrat font-medium text-[11px] border transition-colors ${
                  active
                    ? "bg-primary-orange text-white border-primary-orange"
                    : "bg-white text-primary-blue border-black/[0.12] hover:bg-black/[0.03]"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-[24px] pt-[28px] pb-[28px] scrollbar-hide"
      >
        {isPlaceholder ? (
          <p className="font-montserrat text-primary-blue/60 text-[14px] mt-[8px]">
            {activePill === "people"
              ? "People filter coming next."
              : "Media Type filter coming next."}
          </p>
        ) : error ? (
          <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
            {error}
          </p>
        ) : threads.length === 0 && loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-[24px] gap-y-[40px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoryCardSkeleton key={i} />
            ))}
          </div>
        ) : threads.length === 0 && !loading ? (
          <p className="font-montserrat text-primary-blue/60 text-[14px] mt-[8px]">
            No stories to show.
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-[24px] gap-y-[40px]">
            {threads.map((t) => (
              <StoryCard
                key={t._id}
                thread={t}
                daysRemaining={
                  activePill === "deleted" ? daysRemainingFor(t) : null
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

      {isSelecting && selectedCount > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[24px] z-40 flex items-center gap-[12px] bg-primary-blue text-white rounded-full pl-[20px] pr-[8px] py-[8px] shadow-[0_6px_24px_rgba(0,0,0,0.25)]">
          <span className="font-montserrat font-medium text-[14px]">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete selected"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V7"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            disabled
            title="Add to Album — coming soon"
            aria-label="More actions"
            className="w-[36px] h-[36px] rounded-full bg-white/5 flex items-center justify-center opacity-40 cursor-not-allowed"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="1.6" fill="currentColor" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              <circle cx="19" cy="12" r="1.6" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}

      <ConfirmationModal
        open={confirmOpen}
        title={
          activePill === "deleted"
            ? "Delete permanently?"
            : "Move to Deleted?"
        }
        body={
          activePill === "deleted"
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

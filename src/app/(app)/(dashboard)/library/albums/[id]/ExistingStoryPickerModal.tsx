"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchStories, type LibraryThread } from "../../../../../../lib/library/api";
import { bustUrl } from "../../../../../../lib/images";
import { parseContentToBlocks } from "../../../../../../lib/parseStoryContent";

type Props = {
  open: boolean;
  excludeThreadIds: Set<string>;
  onCancel: () => void;
  onSubmit: (threadIds: string[]) => Promise<void>;
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

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

export default function ExistingStoryPickerModal({
  open,
  excludeThreadIds,
  onCancel,
  onSubmit,
}: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [threads, setThreads] = useState<LibraryThread[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setThreads([]);
      setPage(0);
      setHasMore(true);
      setSelected(new Set());
      setBusy(false);
    }
  }, [open]);

  // Debounce the query so we don't spam the search endpoint.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  // Reset when search query changes.
  useEffect(() => {
    if (!open) return;
    setThreads([]);
    setPage(0);
    setHasMore(true);
  }, [debouncedQuery, open]);

  const loadPage = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const { threads: fresh } = await fetchStories({
          mode: "all",
          page: nextPage,
          limit: PAGE_SIZE,
          search: debouncedQuery || undefined,
        });
        setThreads((prev) => {
          const seen = new Set(prev.map((t) => t._id));
          return [...prev, ...fresh.filter((t) => !seen.has(t._id))];
        });
        setPage(nextPage);
        setHasMore(fresh.length === PAGE_SIZE);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [debouncedQuery]
  );

  useEffect(() => {
    if (!open) return;
    if (page !== 0) return;
    loadPage(1);
  }, [open, page, loadPage]);

  useEffect(() => {
    if (!open || !hasMore || page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) {
          loadPage(page + 1);
        }
      },
      { root, rootMargin: "200px 0px 200px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [open, hasMore, page, loading, loadPage]);

  const visible = useMemo(
    () => threads.filter((t) => !excludeThreadIds.has(t._id)),
    [threads, excludeThreadIds]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleAdd() {
    if (busy || selected.size === 0) return;
    setBusy(true);
    try {
      await onSubmit(Array.from(selected));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center px-[16px]"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-[560px] max-h-[80vh] bg-white rounded-[20px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[20px] pt-[18px] pb-[12px] border-b border-black/[0.06]">
          <div className="flex items-center justify-between gap-[12px]">
            <h3 className="font-montserrat font-bold text-primary-blue text-[17px]">
              Add existing story
            </h3>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="cursor-pointer text-primary-blue/60 hover:text-primary-blue text-[13px] font-montserrat disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your stories"
            className="mt-[12px] w-full bg-[#f4f4f4] rounded-[12px] px-[14px] py-[9px] font-montserrat text-primary-blue text-[13px] placeholder:text-primary-blue/40 focus:outline-none focus:ring-2 focus:ring-primary-orange"
          />
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-[20px] py-[12px] scrollbar-hide"
        >
          {visible.length === 0 && !loading ? (
            <p className="font-montserrat text-primary-blue/60 text-[13px] py-[24px] text-center">
              {debouncedQuery
                ? "No matching stories."
                : "No stories available to add."}
            </p>
          ) : (
            <ul className="flex flex-col gap-[8px]">
              {visible.map((t) => {
                const cover = coverFor(t);
                const isSelected = selected.has(t._id);
                return (
                  <li key={t._id}>
                    <button
                      type="button"
                      onClick={() => toggle(t._id)}
                      className={`w-full flex items-center gap-[12px] p-[8px] rounded-[14px] border transition-colors text-left cursor-pointer ${
                        isSelected
                          ? "border-primary-orange bg-primary-orange/[0.05]"
                          : "border-black/[0.08] hover:bg-black/[0.02]"
                      }`}
                    >
                      <div className="w-[52px] h-[52px] rounded-[10px] overflow-hidden bg-primary-blue/10 shrink-0">
                        {cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bustUrl(cover, undefined)}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <p className="flex-1 min-w-0 font-montserrat text-primary-blue text-[13px] leading-[16px] line-clamp-2">
                        {titleFor(t)}
                      </p>
                      <span
                        className={`w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 shrink-0 ${
                          isSelected
                            ? "bg-primary-orange border-primary-orange text-white"
                            : "bg-white border-primary-blue/25 text-transparent"
                        }`}
                        aria-hidden
                      >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 12l5 5L20 7"
                            stroke="currentColor"
                            strokeWidth={3}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                  </li>
                );
              })}
              <div ref={sentinelRef} className="h-[1px]" />
              {loading && (
                <p className="font-montserrat text-primary-blue/50 text-[12px] text-center py-[8px]">
                  Loading…
                </p>
              )}
            </ul>
          )}
        </div>

        <div className="px-[20px] py-[14px] border-t border-black/[0.06] flex items-center justify-between gap-[12px]">
          <span className="font-montserrat text-primary-blue/70 text-[13px]">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || selected.size === 0}
            className="cursor-pointer bg-primary-orange text-white font-montserrat font-semibold text-[14px] rounded-full px-[22px] py-[9px] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >
            {busy ? "…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

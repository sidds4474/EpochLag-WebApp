"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import {
  applyTimelineSearch,
  dedupeTimelineByThread,
  fetchTimeline,
  hideTimelineStory,
  stripHidden,
  type TimelineYearBucket,
  timelineDateParts,
} from "../../../../../lib/library/timeline";
import { PencilIcon } from "../../icons";
import { useSelectMode } from "../selectMode";
import YearRail from "./YearRail";
import TimelineTile from "./TimelineTile";

// Module-scoped cache so re-visiting the tab renders instantly.
let cachedBuckets: TimelineYearBucket[] | null = null;

const REFRESH_STALE_MS = 60 * 1000;
let lastFetchedAt = 0;

function defaultYearRange(): number[] {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3, y - 4, y - 5, y - 6];
}

export default function LagsTimelinePage() {
  const { user } = useAuth();
  const userId = user?._id ?? "";
  const { setHeaderRight } = useSelectMode();

  const [buckets, setBuckets] = useState<TimelineYearBucket[] | null>(
    cachedBuckets
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [pendingHiddenIds, setPendingHiddenIds] = useState<Set<string>>(
    () => new Set()
  );
  // Committed hidden IDs — these render dimmed but stay in the list.
  const [committedHiddenIds, setCommittedHiddenIds] = useState<Set<string>>(
    () => new Set()
  );

  const hiddenIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const suppressObserverUntil = useRef(0);

  const storageKey = userId ? `timelineHiddenIds:${userId}` : null;

  // Load persisted hidden IDs.
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const ids = new Set(JSON.parse(raw) as string[]);
        hiddenIdsRef.current = ids;
        setCommittedHiddenIds(new Set(ids));
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const persistHidden = useCallback(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(hiddenIdsRef.current))
      );
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const runFetch = useCallback(async () => {
    try {
      const raw = await fetchTimeline();
      const deduped = dedupeTimelineByThread(raw);
      // Don't strip hidden entries — the redesign keeps them visible in a
      // dimmed state instead of removing them from the list.
      cachedBuckets = deduped;
      lastFetchedAt = Date.now();
      setBuckets(deduped);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load timeline");
    }
  }, []);

  useEffect(() => {
    if (cachedBuckets === null) runFetch();
  }, [runFetch]);

  // Silent refresh on tab focus after 60s.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetchedAt < REFRESH_STALE_MS) return;
      runFetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [runFetch]);

  useEffect(() => {
    if (!searchOpen) setQuery("");
  }, [searchOpen]);

  // Flush pending hides: merge into the committed set (card stays visible
  // but dimmed), persist locally, and fire the hide API for each in the
  // background. The timeline list is NOT stripped — hidden cards remain
  // in the list so the user can see what they've hidden.
  const handleSaveEdits = useCallback(async () => {
    const ids = Array.from(pendingHiddenIds);
    setPendingHiddenIds(new Set());
    setEditMode(false);
    if (ids.length === 0) return;

    setCommittedHiddenIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    for (const id of ids) hiddenIdsRef.current.add(id);
    persistHidden();

    if (!userId) return;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      try {
        await hideTimelineStory(id, userId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (/already hidden/i.test(msg)) continue;
        toast.error("Failed to hide story");
      }
    }
  }, [pendingHiddenIds, persistHidden, userId]);

  // Register header-right — "Edit Timeline" → "Save Changes" when editing.
  useEffect(() => {
    setHeaderRight(
      editMode ? (
        <button
          type="button"
          onClick={handleSaveEdits}
          className="cursor-pointer inline-flex items-center gap-[8px] bg-primary-orange text-white font-montserrat font-medium text-[14px] md:text-[15px] rounded-full px-[18px] md:px-[22px] py-[8px] md:py-[10px] hover:opacity-90 transition-opacity"
        >
          <span className="hidden md:inline">Save Changes</span>
          <span className="md:hidden">Done</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditMode(true)}
          aria-label="Edit timeline"
          className="cursor-pointer inline-flex items-center gap-[8px] bg-transparent text-[#2c2c2c] border border-[#2c2c2c]/60 rounded-full px-[14px] md:px-[16px] py-[8px] md:py-[10px] hover:bg-black/[0.03] transition-colors"
        >
          <PencilIcon width={16} height={16} />
          <span className="font-montserrat text-[14px] md:text-[15px] hidden md:inline">
            Edit Timeline
          </span>
          <span className="font-montserrat text-[14px] md:hidden">Edit</span>
        </button>
      )
    );
    return () => setHeaderRight(null);
  }, [editMode, setHeaderRight, handleSaveEdits]);

  const filtered = useMemo(() => {
    return applyTimelineSearch(buckets ?? [], query);
  }, [buckets, query]);

  const derivedYears = useMemo(() => {
    const src = buckets ?? [];
    return src.map((b) => b.year).sort((a, b) => b - a);
  }, [buckets]);

  const displayYears = derivedYears.length > 0 ? derivedYears : defaultYearRange();

  // Track the visible-years derived from currently filtered data.
  const visibleYears = useMemo(
    () => filtered.map((b) => b.year).sort((a, b) => b - a),
    [filtered]
  );

  // Initialize selected year to newest available.
  useEffect(() => {
    if (selectedYear != null) return;
    if (visibleYears.length > 0) setSelectedYear(visibleYears[0]);
    else if (displayYears.length > 0) setSelectedYear(displayYears[0]);
  }, [visibleYears, displayYears, selectedYear]);

  const handleYearPress = useCallback((year: number) => {
    setSelectedYear(year);
    isProgrammaticScroll.current = true;
    suppressObserverUntil.current = Date.now() + 400;
    const el = document.getElementById(`timeline-year-${year}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
  }, []);

  // IntersectionObserver on year anchors → auto-update selected year.
  useEffect(() => {
    const anchors = document.querySelectorAll("[data-timeline-year-anchor]");
    if (anchors.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressObserverUntil.current) return;
        for (const e of entries) {
          if (e.isIntersecting) {
            const y = Number((e.target as HTMLElement).dataset.year);
            if (y) setSelectedYear(y);
          }
        }
      },
      { threshold: 0, rootMargin: "-30% 0px -60% 0px" }
    );
    anchors.forEach((a) => observer.observe(a));
    return () => observer.disconnect();
  }, [filtered]);

  const handleHide = useCallback(
    async (storyId: string) => {
      if (!userId || !buckets) return;
      hiddenIdsRef.current.add(String(storyId));
      persistHidden();
      const prev = buckets;
      const next = stripHidden(prev, hiddenIdsRef.current);
      cachedBuckets = next;
      setBuckets(next);
      try {
        await hideTimelineStory(storyId, userId);
        runFetch();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (/already hidden/i.test(msg)) {
          runFetch();
          return;
        }
        hiddenIdsRef.current.delete(String(storyId));
        persistHidden();
        cachedBuckets = prev;
        setBuckets(prev);
        toast.error("Failed to hide story");
      }
    },
    [buckets, persistHidden, runFetch, userId]
  );

  const togglePendingHide = useCallback((storyId: string) => {
    setPendingHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  }, []);

  const loading = buckets === null;
  const totallyEmpty = !loading && (buckets?.length ?? 0) === 0;
  const searchActive = query.trim().length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 pt-[8px] md:pt-[12px]">
      {/* Search UI removed from the Timeline chrome per the Edit Timeline
          redesign. The applyTimelineSearch helper and `query` state remain
          wired so search can be reintroduced later. */}

      {/* Mobile horizontal year strip */}
      <div className="md:hidden">
        <YearRail
          layout="horizontal"
          years={displayYears}
          selected={selectedYear}
          onSelect={handleYearPress}
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-[110px_1fr] lg:grid-cols-[120px_1fr] gap-[8px] md:gap-[20px] flex-1 min-h-0">
          {/* Rail skeleton (desktop only) — mirrors the year list */}
          <div className="hidden md:flex flex-col gap-[22px] pt-[16px]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[24px] w-[52px] rounded-full bg-[#f0f0f0] animate-pulse"
              />
            ))}
          </div>

          <div className="relative max-w-[860px] overflow-hidden">
            <div className="relative pl-[32px] pr-[24px] md:pl-[40px] md:pr-[60px] pt-[20px] pb-[40px]">
              {/* Spine skeleton */}
              <div className="absolute left-[14px] md:left-[22px] top-[30px] bottom-[40px] w-[1px] bg-black/[0.06]" />

              <div className="flex flex-col gap-[16px]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="relative">
                    <span className="absolute left-[-23px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full bg-[#f0f0f0]" />
                    <div className="flex items-stretch bg-[#f0f0f0] rounded-[20px] p-[12px] md:p-[14px] gap-[14px] md:gap-[18px] animate-pulse h-[116px] md:h-[136px]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : error && (buckets?.length ?? 0) === 0 ? (
        <div className="pt-[24px]">
          <p className="font-montserrat text-primary-orange text-[14px]">
            {error}
          </p>
        </div>
      ) : totallyEmpty ? (
        <div className="flex flex-col items-center justify-center pt-[80px] px-[24px] text-center">
          <p className="font-montserrat font-semibold text-primary-blue text-[17px]">
            Start building your timeline
          </p>
          <p className="mt-[8px] font-montserrat text-primary-blue/60 text-[14px] leading-[22px] max-w-[360px]">
            Stories you share will appear here, arranged by the moment they
            happened.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[110px_1fr] lg:grid-cols-[120px_1fr] gap-[8px] md:gap-[20px] flex-1 min-h-0">
          {/* Desktop vertical rail */}
          <div className="hidden md:block">
            <YearRail
              layout="vertical"
              years={displayYears}
              selected={selectedYear}
              onSelect={handleYearPress}
            />
          </div>

          <div
            ref={listRef}
            className="relative flex-1 overflow-y-auto scrollbar-hide"
          >
            {/* Inner wrapper stretches to full scroll-content height so the
                spine spans every tile. Three layout columns per row:
                [day/month] [spine with dot] [sand tile]. */}
            <div className="relative pr-[24px] md:pr-[60px] pt-[8px] pb-[40px] max-w-[980px]">
              {filtered.length === 0 && searchActive && (
                <p className="pt-[16px] font-montserrat text-[#2c2c2c]/60 text-[14px]">
                  No stories match &ldquo;{query}&rdquo;.
                </p>
              )}

              {filtered.map((section) => (
                <section
                  key={section.year}
                  id={`timeline-year-${section.year}`}
                  data-timeline-year-anchor
                  data-year={section.year}
                  className="scroll-mt-[16px]"
                >
                  <div className="md:hidden font-montserrat font-bold text-[#232323] text-[15px] mt-[16px] mb-[8px]">
                    {section.year}
                  </div>
                  <div className="flex flex-col">
                    {section.stories.map((entry, i) => {
                      const isLatestOfSelected =
                        section.year === selectedYear && i === 0;
                      const parts = timelineDateParts(entry);
                      const storyKey = entry.latestStory?._id ?? "";
                      const isHidden =
                        pendingHiddenIds.has(storyKey) ||
                        committedHiddenIds.has(storyKey);
                      return (
                        <div
                          key={entry.threadId}
                          className="relative flex items-center gap-[10px] md:gap-[18px] py-[10px] md:py-[12px]"
                        >
                          {/* Day / Month column */}
                          <div className="shrink-0 w-[54px] md:w-[86px] text-center md:text-left md:pl-[8px]">
                            {parts && (
                              <>
                                <div className="font-ivy text-[34px] md:text-[48px] leading-[1] text-[#232323]">
                                  {parts.day}
                                </div>
                                <div className="font-montserrat text-[13px] md:text-[16px] text-[#2c2c2c] mt-[2px] md:mt-[4px]">
                                  {parts.month}
                                </div>
                              </>
                            )}
                          </div>

                          {/* Spine column with dot */}
                          <div className="relative shrink-0 self-stretch w-[14px] flex items-center justify-center">
                            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-[#2c2c2c]/35" />
                            {isLatestOfSelected ? (
                              <span className="relative w-[12px] h-[12px] rounded-full bg-primary-orange shadow-[0_0_0_2px_#f3f1eb] z-[2]" />
                            ) : (
                              <span className="relative w-[10px] h-[10px] rounded-full bg-white border-[1.5px] border-[#2c2c2c] z-[2]" />
                            )}
                          </div>

                          {/* Tile */}
                          <div className="flex-1 min-w-0">
                            <TimelineTile
                              entry={entry}
                              onHide={handleHide}
                              editMode={editMode}
                              pendingHidden={isHidden}
                            />
                          </div>

                          {/* Eye toggle — only in edit mode */}
                          {editMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (storyKey) togglePendingHide(storyKey);
                              }}
                              aria-label={isHidden ? "Unhide story" : "Hide story"}
                              className="shrink-0 cursor-pointer text-[#2c2c2c] hover:opacity-70 transition-opacity w-[28px] h-[28px] flex items-center justify-center"
                            >
                              {isHidden ? (
                                <svg
                                  width={22}
                                  height={22}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.6}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 4.22-5.19" />
                                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.17 4.19" />
                                  <path d="M9.88 9.88A3 3 0 1 0 14.12 14.12" />
                                  <line x1="2" y1="2" x2="22" y2="22" />
                                </svg>
                              ) : (
                                <svg
                                  width={22}
                                  height={22}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={1.6}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

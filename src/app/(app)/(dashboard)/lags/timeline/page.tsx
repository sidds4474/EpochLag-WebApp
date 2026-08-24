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
} from "../../../../../lib/library/timeline";
import { SearchIcon } from "../../icons";
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
      if (raw) hiddenIdsRef.current = new Set(JSON.parse(raw) as string[]);
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
      const stripped = stripHidden(deduped, hiddenIdsRef.current);
      cachedBuckets = stripped;
      lastFetchedAt = Date.now();
      setBuckets(stripped);
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

  // Register header-right (search icon) — matches People tab pattern.
  useEffect(() => {
    setHeaderRight(
      <button
        type="button"
        onClick={() => setSearchOpen((v) => !v)}
        aria-label={searchOpen ? "Close search" : "Search"}
        className="cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue hover:bg-black/[0.05] flex items-center justify-center transition-colors"
      >
        <SearchIcon width={18} height={18} />
      </button>
    );
    return () => setHeaderRight(null);
  }, [searchOpen, setHeaderRight]);

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

  const loading = buckets === null;
  const totallyEmpty = !loading && (buckets?.length ?? 0) === 0;
  const searchActive = query.trim().length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 pt-[8px] md:pt-[12px]">
      {searchOpen && (
        <div className="mb-[12px] flex items-center gap-[10px] bg-[#f0f0f0] rounded-full px-[14px] py-[8px] max-w-[420px]">
          <SearchIcon width={14} height={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stories and people"
            autoFocus
            className="flex-1 bg-transparent border-0 outline-none font-montserrat text-primary-blue text-[14px] placeholder:text-primary-blue/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="cursor-pointer text-primary-blue/60 hover:text-primary-blue"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}

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
        <div className="grid md:grid-cols-[80px_1fr] gap-[16px] md:gap-[24px] flex-1 min-h-0">
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
        <div className="grid md:grid-cols-[80px_1fr] gap-[16px] md:gap-[24px] flex-1 min-h-0">
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
            className="relative max-w-[860px] overflow-y-auto scrollbar-hide"
          >
            {/* Inner wrapper stretches to full scroll-content height so
                the spine spans every tile, not just the visible viewport.
                Left padding creates room for the dots + spine. Right +
                top padding leaves room for the tile's 46px soft
                box-shadow. Extra desktop right padding (60px) reserves
                space for the floating three-dot menu that sits outside
                the card. */}
            <div className="relative pl-[32px] pr-[24px] md:pl-[40px] md:pr-[60px] pt-[20px] pb-[40px]">
              {/* Spine — continuous vertical connector line. Sits inside
                  the scroll content so it grows with the list. Renders
                  on both mobile (x=14) and desktop (x=22). */}
              <div className="absolute left-[14px] md:left-[22px] top-[10px] bottom-0 w-[1px] bg-[#092E4A] pointer-events-none" />

              {filtered.length === 0 && searchActive && (
                <p className="pt-[16px] font-montserrat text-primary-blue/60 text-[14px]">
                  No stories match &ldquo;{query}&rdquo;.
                </p>
              )}

              {filtered.map((section) => (
                <section
                  key={section.year}
                  id={`timeline-year-${section.year}`}
                  data-timeline-year-anchor
                  data-year={section.year}
                  className="mb-[12px] scroll-mt-[16px]"
                >
                  <div className="md:hidden font-montserrat font-bold text-primary-blue text-[15px] mt-[16px] mb-[8px]">
                    {section.year}
                  </div>
                  <div className="flex flex-col gap-[16px]">
                    {section.stories.map((entry, i) => {
                      const isLatestOfSelected =
                        section.year === selectedYear && i === 0;
                      return (
                        <div key={entry.threadId} className="relative">
                          {/* Filled orange dot for the first tile of the
                              selected year; small outlined navy dot for
                              everyone else. */}
                          {isLatestOfSelected ? (
                            <span className="absolute left-[-25px] md:left-[-25px] top-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-full bg-primary-orange border-[3px] border-white shadow-[0_0_0_1px_rgba(0,0,0,0.06)] z-[2]" />
                          ) : (
                            <span className="absolute left-[-23px] md:left-[-23px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full bg-white border-2 border-[#092E4A] z-[2]" />
                          )}
                          <TimelineTile entry={entry} onHide={handleHide} />
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

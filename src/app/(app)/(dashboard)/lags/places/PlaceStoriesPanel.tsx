"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cityFor,
  countryCodeFor,
  fetchPlaceStories,
  type PlaceLocation,
  type ResolvedCoords,
} from "../../../../../lib/library/places";
import type { LibraryThread } from "../../../../../lib/library/api";
import PlacePanelStoryRow from "./PlacePanelStoryRow";

// Panel body — remounts fresh when placeId changes (see spec §7). Keyed by
// parent via `place` identity to guarantee no state bleed across taps.
function PanelBody({
  place,
  resolved,
}: {
  place: PlaceLocation;
  resolved: Record<string, ResolvedCoords>;
}) {
  const [threads, setThreads] = useState<LibraryThread[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNext = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      const res = await fetchPlaceStories(place, page);
      const fresh: LibraryThread[] = [];
      for (const t of res.threads) {
        if (t._id && !seenIdsRef.current.has(t._id)) {
          seenIdsRef.current.add(t._id);
          fresh.push(t);
        }
      }
      setThreads((prev) => [...prev, ...fresh]);
      setHasMore(res.hasMore);
      setPage(res.nextPage);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [place, page, hasMore, loading]);

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) loadNext();
        }
      },
      { rootMargin: "0px 0px 200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNext]);

  const city = cityFor(place, resolved);
  const country = countryCodeFor(place, resolved);
  const heading = country ? `${city}, ${country}` : city;
  const subtitle =
    place.storyCount === 1 ? "1 story" : `${place.storyCount} stories`;

  return (
    <>
      <div className="px-[16px] pb-[16px]">
        <h2 className="font-montserrat font-medium text-primary-blue text-[22px] leading-tight">
          {heading}
        </h2>
        <p className="font-montserrat text-primary-blue/60 text-[13px] mt-[4px]">
          {subtitle}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-[16px] pb-[20px]">
        {threads.length === 0 && !loading && (
          <p className="pt-[24px] font-montserrat text-primary-blue/60 text-[14px]">
            No stories at this place.
          </p>
        )}
        <div className="flex flex-col gap-[10px]">
          {threads.map((t) => (
            <PlacePanelStoryRow key={t._id} thread={t} />
          ))}
        </div>
        <div ref={sentinelRef} className="h-[1px]" />
        {loading && (
          <div className="pt-[16px] flex justify-center">
            <div className="w-[20px] h-[20px] rounded-full border-2 border-primary-blue/20 border-t-primary-blue animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}

// Desktop: inline flex column, only rendered when a place is active.
// Contributes to the flex row so the map naturally shrinks by the panel's
// width when it appears.
export function PlaceStoriesInlinePanel({
  place,
  resolved,
}: {
  place: PlaceLocation;
  resolved: Record<string, ResolvedCoords>;
}) {
  return (
    <aside
      role="region"
      aria-label="Stories at place"
      className="hidden md:flex flex-col w-[270px] md:-mt-[64px]"
    >
      <PanelBody
        key={place.placeId ?? place.formattedAddress}
        place={place}
        resolved={resolved}
      />
    </aside>
  );
}

// Mobile: bottom sheet. Always mounted so slide-in/out animates cleanly.
// Rendered as a top-level sibling of the map wrapper (outside its
// `overflow-hidden` box) so mobile browsers don't clip the fixed panel.
export function PlaceStoriesMobileSheet({
  place,
  resolved,
  onClose,
}: {
  place: PlaceLocation | null;
  resolved: Record<string, ResolvedCoords>;
  onClose: () => void;
}) {
  const [rendered, setRendered] = useState<PlaceLocation | null>(place);
  useEffect(() => {
    if (place) {
      setRendered(place);
      return;
    }
    const t = window.setTimeout(() => setRendered(null), 240);
    return () => window.clearTimeout(t);
  }, [place]);

  const open = place !== null;

  return (
    <div className="md:hidden">
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/30 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
      />
      <aside
        role="dialog"
        aria-label="Stories at place"
        className={`fixed z-40 bg-white flex flex-col shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
          left-0 right-0 bottom-0 h-[70vh] rounded-t-[24px]
          transition-transform duration-200
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
      >
        <div className="pt-[10px] pb-[6px] flex justify-center">
          <div className="w-[36px] h-[4px] rounded-full bg-black/[0.12]" />
        </div>
        {rendered && (
          <PanelBody
            key={rendered.placeId ?? rendered.formattedAddress}
            place={rendered}
            resolved={resolved}
          />
        )}
      </aside>
    </div>
  );
}

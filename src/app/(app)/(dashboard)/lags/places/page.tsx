"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import {
  coordsForLocation,
  fetchPlaceLocations,
  placeCacheKey,
  resolveLocations,
  type PlaceLocation,
  type ResolvedCoords,
} from "../../../../../lib/library/places";
import { MapPinIcon } from "../../icons";
import PlacesMap, { type MapPin } from "./PlacesMap";
import {
  PlaceStoriesInlinePanel,
  PlaceStoriesMobileSheet,
} from "./PlaceStoriesPanel";

// Module cache so re-visiting the tab renders pins instantly.
let cachedLocations: PlaceLocation[] | null = null;
let cachedResolved: Record<string, ResolvedCoords> = {};

const LOADING_MESSAGES = [
  "Mapping your stories",
  "Finding your places",
  "Dropping pins",
  "Almost there",
];

export default function LagsPlacesPage() {
  const { user } = useAuth();
  const userId = user?._id ?? "";
  const [locations, setLocations] = useState<PlaceLocation[] | null>(
    cachedLocations
  );
  const [resolved, setResolved] = useState<Record<string, ResolvedCoords>>(
    cachedResolved
  );
  const [resolving, setResolving] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activePlace, setActivePlace] = useState<PlaceLocation | null>(null);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const lastPinTapRef = useRef(0);

  useEffect(() => {
    if (cachedLocations !== null) return;
    let cancelled = false;
    fetchPlaceLocations()
      .then((locs) => {
        if (cancelled) return;
        cachedLocations = locs;
        setLocations(locs);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!locations || !userId) return;
    const need = locations.filter(
      (l) => !(typeof l.lat === "number" && typeof l.lng === "number")
    );
    const uncached = need.filter((l) => !resolved[placeCacheKey(l)]);
    if (uncached.length === 0) return;
    setResolving(true);
    resolveLocations(userId, uncached)
      .then((next) => {
        cachedResolved = next;
        setResolved(next);
      })
      .finally(() => setResolving(false));
  }, [locations, userId, resolved]);

  const pins: MapPin[] = useMemo(() => {
    if (!locations) return [];
    const out: MapPin[] = [];
    for (const l of locations) {
      const c = coordsForLocation(l, resolved);
      if (!c) continue;
      out.push({
        key: placeCacheKey(l),
        lat: c.lat,
        lng: c.lng,
        count: l.storyCount,
        placeId: l.placeId,
        formattedAddress: l.formattedAddress,
      });
    }
    return out;
  }, [locations, resolved]);

  const loading = locations === null;
  const ready = !loading && !resolving;
  const empty = ready && locations.length === 0;

  useEffect(() => {
    if (ready) return;
    const t = window.setInterval(() => {
      setLoadingMessageIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => window.clearInterval(t);
  }, [ready]);

  const handleClose = useCallback(() => {
    setActiveKey(null);
    setActivePlace(null);
  }, []);

  const handlePinTap = useCallback(
    (pin: MapPin) => {
      const now = Date.now();
      if (now - lastPinTapRef.current < 500) return;
      lastPinTapRef.current = now;
      // Re-tapping the active pin closes the panel.
      if (activeKey === pin.key) {
        handleClose();
        return;
      }
      const loc = locations?.find((l) => placeCacheKey(l) === pin.key);
      if (!loc) return;
      setActiveKey(pin.key);
      setActivePlace(loc);
    },
    [activeKey, handleClose, locations]
  );

  useEffect(() => {
    if (!activePlace) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activePlace, handleClose]);

  return (
    <>
      <div className="relative flex md:gap-[20px] h-full md:h-[calc(100%-24px)] min-h-0">
        <div className="relative flex-1 min-h-0 min-w-0 rounded-[20px] overflow-hidden bg-[#e5e5e5]">
          <PlacesMap
            pins={pins}
            activeKey={activeKey}
            onPinTap={handlePinTap}
            onMapClick={handleClose}
          />

          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-[16px] px-[20px] py-[14px] shadow-[0_4px_18px_rgba(0,0,0,0.14)] flex items-center gap-[12px]">
                <span className="inline-flex w-[36px] h-[36px] rounded-full bg-primary-blue/10 text-primary-blue items-center justify-center animate-pulse">
                  <MapPinIcon width={18} height={18} />
                </span>
                <span className="font-montserrat font-medium text-primary-blue text-[14px]">
                  {LOADING_MESSAGES[loadingMessageIdx]}…
                </span>
              </div>
            </div>
          )}

          {empty && (
            <div className="absolute inset-x-0 bottom-[24px] flex justify-center pointer-events-none">
              <div className="bg-white/95 rounded-[16px] px-[20px] py-[16px] shadow-[0_4px_18px_rgba(0,0,0,0.12)] max-w-[360px] text-center">
                <p className="font-montserrat font-semibold text-primary-blue text-[15px]">
                  No places yet
                </p>
                <p className="mt-[6px] font-montserrat text-primary-blue/60 text-[13px] leading-[18px]">
                  When you tag a place while writing a lag, it will show up
                  here on the map.
                </p>
              </div>
            </div>
          )}
        </div>

        {activePlace && (
          <PlaceStoriesInlinePanel place={activePlace} resolved={resolved} />
        )}
      </div>

      <PlaceStoriesMobileSheet
        place={activePlace}
        resolved={resolved}
        onClose={handleClose}
      />
    </>
  );
}

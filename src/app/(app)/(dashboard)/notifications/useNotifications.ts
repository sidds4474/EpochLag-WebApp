"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearAllNotifications,
  enrichDockingCards,
  fetchNotifications,
} from "../../../../lib/notifications/api";
import type { Notification } from "../../../../types/home";

// Module-level cache so the dropdown and the full-page view share a single
// snapshot — mirrors the pattern in home/page.tsx. Both surfaces refresh on
// mount but reuse the cached list synchronously so the UI never blanks.
let cached: Notification[] | null = null;
let loadedAt = 0;
// The in-progress fetch, shared across every mounted consumer. Holding the
// promise (rather than a boolean) lets a second consumer await the same
// request and then read the cache, instead of bailing out with its own
// `loading` stuck at true — which is what left /notifications on "Loading…"
// forever whenever the header bell and the page mounted together.
let inFlight: Promise<void> | null = null;
// The docking-card enrichment for the most recent fetch. Rows read the card
// cache at render time, so once this settles every mounted consumer must
// re-render — otherwise rows that drew a skeleton on first paint keep it
// forever (which is exactly what happened: enrichment finished, nobody looked).
let enriching: Promise<void> | null = null;
const FRESHNESS_MS = 60_000;

export type UseNotifications = {
  items: Notification[];
  loading: boolean;
  hasUnread: boolean;
  refresh: () => void;
  markSeen: (id: string) => void;
  clearAll: () => Promise<void>;
};

export function useNotifications(): UseNotifications {
  const [items, setItems] = useState<Notification[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);

    if (inFlight) {
      // Another consumer already owns the request. Wait for it, then adopt
      // whatever landed in the shared cache so this consumer settles too.
      try {
        await inFlight;
      } catch {
        // The owner handles its own failure; we still need to stop loading.
      }
      setItems(cached ?? []);
      setLoading(false);
      // The owner's enrichment may still be running — re-render when it lands.
      if (enriching) void enriching.finally(() => setItems((prev) => [...prev]));
      return;
    }

    inFlight = (async () => {
      try {
        const { items: fresh } = await fetchNotifications();
        cached = fresh;
        loadedAt = Date.now();
        setItems(fresh);
        // Fire-and-forget enrichment; we don't block the initial paint on it.
        // When it settles, hand out a fresh array so rows re-read the cache.
        enriching = enrichDockingCards(fresh).catch(() => {});
        void enriching.finally(() => setItems((prev) => [...prev]));
      } catch {
        if (cached === null) setItems([]);
      } finally {
        setLoading(false);
      }
    })();

    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
  }, []);

  useEffect(() => {
    const stale =
      cached === null || Date.now() - loadedAt > FRESHNESS_MS;
    if (stale) void load(cached !== null);
  }, [load]);

  const markSeen = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((n) => (n._id === id ? { ...n, seen: true } : n));
      cached = next;
      return next;
    });
  }, []);

  const clearAll = useCallback(async () => {
    // Optimistic wipe — restore on failure to avoid dropping the user's list.
    const prev = cached ?? items;
    cached = [];
    setItems([]);
    try {
      await clearAllNotifications();
    } catch {
      cached = prev;
      setItems(prev);
      throw new Error("Could not clear notifications");
    }
  }, [items]);

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);

  return {
    items,
    loading,
    hasUnread: items.some((n) => !n.seen),
    refresh,
    markSeen,
    clearAll,
  };
}

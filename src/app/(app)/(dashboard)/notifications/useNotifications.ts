"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
let inFlight = false;
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
  const localFlight = useRef(false);

  const load = useCallback(async (silent: boolean) => {
    if (inFlight || localFlight.current) return;
    inFlight = true;
    localFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const { items: fresh } = await fetchNotifications();
      cached = fresh;
      loadedAt = Date.now();
      setItems(fresh);
      // Fire-and-forget enrichment; row renderer re-reads from the cache once
      // it settles. We don't block the initial paint on this.
      enrichDockingCards(fresh).catch(() => {});
    } catch {
      if (cached === null) setItems([]);
    } finally {
      setLoading(false);
      inFlight = false;
      localFlight.current = false;
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

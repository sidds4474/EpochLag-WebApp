"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchLagsMonth, fetchThisWeek } from "./api";
import {
  getRange,
  setRange,
  subscribeToDailyEntryChanges,
} from "./cache";
import { isoDay } from "./date";
import type {
  DailyEntry,
  DailyEntryMap,
  DailyMode,
  DailyTheme,
  LagsResponse,
  PromptCard,
} from "./types";

// Derive dominant mode from story content. Mobile checks for <video> first,
// then <audio>, then falls back to "write". Match that ordering.
function deriveMode(content: string | undefined): DailyMode {
  if (!content) return "write";
  if (content.includes("<video")) return "video";
  if (content.includes("<audio")) return "audio";
  return "write";
}

// Theme marker is a client-side convention — BE neither knows nor cares.
// <dailyEntry theme="..."> lives somewhere in the content HTML.
function deriveTheme(content: string | undefined): DailyTheme {
  if (!content) return null;
  const match = content.match(/<dailyEntry\s+theme="([^"]+)"/);
  if (!match) return null;
  const t = match[1];
  if (t === "scrapbook" || t === "editorial" || t === "bonfire") return t;
  return null;
}

// Resolve the thread's cover across the two response shapes we see:
//   - /api/lags → card.promptCard.imageUrl (the prompt's own cover/gradient)
//   - older shape → card.coverImageUrl / card.stories[].coverImageUrl
//   - fallbacks → first image media in latestStory / stories, then inline
//     <img src> in the content HTML.
function deriveCover(card: PromptCard | null): string | null {
  if (!card) return null;
  if (card.promptCard?.imageUrl) return card.promptCard.imageUrl;
  if (card.coverImageUrl) return card.coverImageUrl;
  if (card.latestStory?.coverImageUrl) return card.latestStory.coverImageUrl;
  const firstStoryCover = card.stories?.find((s) => s.coverImageUrl)?.coverImageUrl;
  if (firstStoryCover) return firstStoryCover;
  const latestMedia = card.latestStory?.media?.find((m) => m.type === "image");
  if (latestMedia) return latestMedia.url;
  const firstMedia = card.stories?.flatMap((s) => s.media ?? []).find((m) => m.type === "image");
  if (firstMedia) return firstMedia.url;
  const content = card.latestStory?.content ?? card.content ?? "";
  const match = content.match(/<img[^>]+src="([^"]+)"/);
  if (match) return match[1];
  return null;
}

// Reshape BE envelope into a date-keyed map. The two arrays are joined by
// storyThread._id (or by the bare string when BE only sent the ID).
export function reshapeEntries(response: LagsResponse): DailyEntryMap {
  const cards = response.data?.promptCards ?? [];
  const lags = response.data?.lag?.lags ?? [];
  const cardById = new Map<string, PromptCard>();
  for (const c of cards) cardById.set(c._id, c);

  const out: DailyEntryMap = {};
  for (const row of lags) {
    const iso = isoDay(row.date);
    if (!iso) continue;
    const threadRef = row.storyThread;
    const embedded =
      threadRef && typeof threadRef === "object" ? (threadRef as PromptCard) : null;
    const threadId =
      typeof threadRef === "string" ? threadRef : embedded?._id ?? "";
    if (!threadId) continue;
    // Prefer the full promptCards[] row when BE returned it; fall back to
    // the storyThread object embedded on the lag row itself.
    const card = cardById.get(threadId) ?? embedded ?? null;
    const content = card?.latestStory?.content ?? card?.content ?? "";
    const entry: DailyEntry = {
      iso,
      threadId,
      thread: card,
      content,
      mode: deriveMode(content),
      theme: deriveTheme(content),
      coverUrl: deriveCover(card),
      laggedAt: row.laggedAt ?? row.createdAt ?? null,
    };
    out[iso] = entry;
  }
  return out;
}

type Range =
  | { range: "week" }
  | { range: "month"; month: number; year: number };

function keyFor(args: Range): "week" | `month:${string}` {
  if (args.range === "week") return "week";
  const mm = String(args.month).padStart(2, "0");
  return `month:${args.year}-${mm}`;
}

export type UseDailyEntriesResult = {
  entries: DailyEntryMap;
  loading: boolean;
  hasLoaded: boolean;
  error: unknown;
  refresh: () => Promise<void>;
};

export function useDailyEntries(args: Range): UseDailyEntriesResult {
  const key = keyFor(args);
  const seed = getRange(key);
  const [entries, setEntries] = useState<DailyEntryMap>(seed.entries ?? {});
  const [loading, setLoading] = useState<boolean>(!seed.hasSucceeded);
  const [hasLoaded, setHasLoaded] = useState<boolean>(seed.hasSucceeded);
  const [error, setError] = useState<unknown>(null);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response: LagsResponse;
      if (args.range === "week") {
        response = await fetchThisWeek();
      } else {
        response = await fetchLagsMonth(args.month, args.year);
      }
      const next = reshapeEntries(response);
      setEntries(next);
      setHasLoaded(true);
      setRange(key, { entries: next, hasSucceeded: true, loading: false });
    } catch (e) {
      setError(e);
      setRange(key, { loading: false });
    } finally {
      setLoading(false);
    }
  }, [key, args]);

  // Initial + key-change fetch.
  useEffect(() => {
    void fetchOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Refetch on any daily-change event (publish, un-lag).
  useEffect(() => {
    const off = subscribeToDailyEntryChanges(() => {
      void fetchOnce();
    });
    return off;
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    await fetchOnce();
  }, [fetchOnce]);

  return useMemo(
    () => ({ entries, loading, hasLoaded, error, refresh }),
    [entries, loading, hasLoaded, error, refresh],
  );
}

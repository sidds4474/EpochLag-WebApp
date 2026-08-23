// Cross-surface bookmark store. Bookmarks live on the promptCard (not the
// story), so the "am I bookmarked" state is keyed by promptId. Every
// surface that renders a bookmark icon (Home carousel, Inspiration
// cards, Library grid, Studio tabs, OpenStory viewer) reads from this
// module so a toggle in one place is visible everywhere on the next
// re-render — no Redux, no context, just a module-level map + a small
// pub/sub.
//
// Three cooperating pieces:
//
//   • knownBookmarks — { promptId -> boolean }. The authoritative
//     override map. Every list-fetch response should pass through
//     overlayBookmarks(list) so stale server data (BE isn't
//     read-your-writes consistent) doesn't clobber a just-flipped
//     local state.
//
//   • bookmarkMemory — { cardKey -> boolean }. In-flight intent guard.
//     Solves rapid double-tap: if the user taps twice within a re-
//     render window, tap 2 would otherwise read the stale prop from
//     tap 1's optimistic update and no-op. Memory ref stores the last-
//     known-flipped state per card so tap 2 flips from THAT.
//
//   • bookmarkEvents — a browser EventTarget. Screens that don't
//     re-fetch on focus (OpenStory, prompt detail) subscribe here to
//     mirror a bookmark change made on another surface.

type CardWithBookmark = {
  _id?: string;
  isBookmarked?: boolean;
  promptCard?: { _id?: string; isBookmarked?: boolean } | null;
  latestStory?: { _id?: string } | null;
};

const knownBookmarks = new Map<string, boolean>();
const bookmarkMemory = new Map<string, boolean>();

export function getKnownBookmark(promptId: string): boolean | undefined {
  return knownBookmarks.get(promptId);
}

export function setKnownBookmark(promptId: string, isBookmarked: boolean): void {
  knownBookmarks.set(promptId, isBookmarked);
  // Broadcast so subscribers on other screens reflect the change even
  // if their own list state was fetched before this toggle.
  bookmarkEvents.dispatchEvent(
    new CustomEvent("bookmark:changed", {
      detail: { promptId, isBookmarked },
    })
  );
}

export function getMemoryBookmark(cardKey: string): boolean | undefined {
  return bookmarkMemory.get(cardKey);
}

export function setMemoryBookmark(cardKey: string, next: boolean): void {
  bookmarkMemory.set(cardKey, next);
}

// Pull the current-best-known bookmark for an item. Priority:
//   1. memory ref (in-flight optimistic)
//   2. knownBookmarks override (session-scoped truth)
//   3. the card's own field (BE snapshot at last fetch)
export function resolveBookmarkState(item: CardWithBookmark): boolean {
  const promptId = item.promptCard?._id || item._id;
  const cardKey = item.latestStory?._id || item._id;
  if (cardKey && bookmarkMemory.has(cardKey)) {
    return bookmarkMemory.get(cardKey)!;
  }
  if (promptId && knownBookmarks.has(promptId)) {
    return knownBookmarks.get(promptId)!;
  }
  return !!(item.promptCard?.isBookmarked || item.isBookmarked);
}

// Utility to overlay knownBookmarks onto a fresh list-fetch response.
// Use immediately after a GET returns cards so any prior toggles keep
// winning until BE catches up.
export function overlayBookmarks<T extends CardWithBookmark>(cards: T[]): T[] {
  if (knownBookmarks.size === 0) return cards;
  return cards.map((c) => {
    const promptId = c.promptCard?._id || c._id;
    if (!promptId) return c;
    if (!knownBookmarks.has(promptId)) return c;
    const known = knownBookmarks.get(promptId)!;
    return {
      ...c,
      isBookmarked: known,
      promptCard: c.promptCard
        ? { ...c.promptCard, isBookmarked: known }
        : c.promptCard,
    };
  });
}

// Cross-surface event emitter. Any screen that shows a bookmark icon
// can subscribe: `bookmarkEvents.addEventListener("bookmark:changed", ...)`
// and update its local state on `detail.promptId` matches.
export const bookmarkEvents: EventTarget =
  typeof window !== "undefined" ? new EventTarget() : ({} as EventTarget);

export type BookmarkChangedDetail = {
  promptId: string;
  isBookmarked: boolean;
};

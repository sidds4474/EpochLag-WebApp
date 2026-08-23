"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { fetchMyProfile } from "../../../../lib/profile/api";
import { toggleCardBookmark } from "../../../../lib/home/api";
import {
  bookmarkEvents,
  getMemoryBookmark,
  overlayBookmarks,
  setKnownBookmark,
  setMemoryBookmark,
  type BookmarkChangedDetail,
} from "../../../../lib/bookmarks/store";
import type { UserCard } from "../../../../types/home";
import type { LibraryThread } from "../../../../lib/library/api";
import {
  fetchDraftStories,
  fetchFriendRequests,
  fetchStudioCards,
  getCachedRequests,
  getCachedTab,
  removeCardFromCache,
  setCachedRequests,
  setCachedTab,
  type FriendRequest,
  type StudioTab,
} from "../../../../lib/studio/api";
import StudioHeader from "./StudioHeader";
import StudioTabs from "./StudioTabs";
import CardTile from "./CardTile";
import DraftTile from "./DraftTile";
import WaitingOnYou from "./WaitingOnYou";
import AvatarUploadModal from "./AvatarUploadModal";
import CoverPickerModal from "./CoverPickerModal";

// Studio is the personal profile-hub: header (cover + avatar + name +
// meta + bio + actions), four content tabs (Received / Sent / Bookmark
// / Draft), and — desktop only — a "Waiting on you" side panel
// aggregating friend requests + unanswered prompts.
//
// A single top-level useState per tab holds cards + pagination, seeded
// from the module cache in src/lib/studio/api.ts so switching tabs
// feels instant on repeat visits; a background refresh runs on mount
// to keep it fresh.
export default function StudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser } = useAuth();

  // Initial tab honors ?tab=… so redirects from /interactions and other
  // deep links keep working ("interactions?tab=sent" → studio?tab=sent).
  const initialTab = (() => {
    const t = searchParams.get("tab");
    if (t === "received" || t === "sent" || t === "bookmark" || t === "draft") return t;
    return "received";
  })();
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  const [received, setReceived] = useState<UserCard[]>(
    () => (getCachedTab("received")?.data as UserCard[] | undefined) ?? []
  );
  const [sent, setSent] = useState<UserCard[]>(
    () => (getCachedTab("sent")?.data as UserCard[] | undefined) ?? []
  );
  const [bookmark, setBookmark] = useState<UserCard[]>(
    () => (getCachedTab("bookmark")?.data as UserCard[] | undefined) ?? []
  );
  const [drafts, setDrafts] = useState<LibraryThread[]>(
    () => (getCachedTab("draft")?.data as LibraryThread[] | undefined) ?? []
  );
  const [loadingTab, setLoadingTab] = useState<Record<StudioTab, boolean>>({
    received: false,
    sent: false,
    bookmark: false,
    draft: false,
  });
  // Per-tab pagination state. `page` is the next page to fetch (starts
  // at 2 because the initial mount grabs page 1); `hasMore` is a hint
  // whether the last response's pagination said we can keep asking.
  const [pageState, setPageState] = useState<Record<StudioTab, { page: number; hasMore: boolean }>>({
    received: { page: 2, hasMore: true },
    sent: { page: 2, hasMore: true },
    bookmark: { page: 2, hasMore: true },
    draft: { page: 2, hasMore: true },
  });
  const [loadingMore, setLoadingMore] = useState(false);

  const [requests, setRequests] = useState<FriendRequest[]>(
    () => getCachedRequests()?.data ?? []
  );

  // Fade-out set for Bookmark tab. When a bookmark is toggled off on
  // the Bookmark tab, we don't yank the tile immediately — 400ms fade
  // gives visual continuity before it disappears (matches mobile).
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());

  // Uploader modals — avatar (1:1) and cover (curated + upload).
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);

  // Silent profile refresh on mount so header fields stay current even
  // when AuthProvider's cached user is stale (older than its own
  // freshness window).
  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((next) => {
        if (!cancelled) updateUser(next);
      })
      .catch(() => {
        /* keep cached user */
      });
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  // Page size per tab. Bookmark loads a bigger first page because the
  // user scrolls through it linearly; the paginated tabs use 10 so the
  // first load is snappy.
  const limitFor = (tab: StudioTab) => (tab === "bookmark" ? 20 : 10);

  // Fetch (and cache) the active tab's page 1 on mount + on tab switch.
  // We don't gate on `fresh` — a background refresh is always cheap and
  // avoids the "typed reply then came back, still see old counts" case.
  useEffect(() => {
    const controller = new AbortController();
    setLoadingTab((s) => ({ ...s, [activeTab]: true }));
    (async () => {
      try {
        if (activeTab === "draft") {
          const { drafts: list, pagination } = await fetchDraftStories(1, limitFor("draft"));
          if (controller.signal.aborted) return;
          setDrafts(list);
          setCachedTab("draft", list);
          setPageState((s) => ({
            ...s,
            draft: { page: 2, hasMore: hasMoreFromPagination(pagination, list.length, limitFor("draft")) },
          }));
        } else {
          const { cards, pagination } = await fetchStudioCards(activeTab, 1, limitFor(activeTab));
          if (controller.signal.aborted) return;
          let merged = overlayBookmarks(cards);
          if (activeTab === "bookmark") {
            merged = merged.map((c) => ({ ...c, isBookmarked: true }));
          }
          if (activeTab === "received") setReceived(merged);
          else if (activeTab === "sent") setSent(merged);
          else setBookmark(merged);
          setCachedTab(activeTab, merged);
          setPageState((s) => ({
            ...s,
            [activeTab]: { page: 2, hasMore: hasMoreFromPagination(pagination, merged.length, limitFor(activeTab)) },
          }));
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!(err instanceof ApiError)) return;
        toast.error(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingTab((s) => ({ ...s, [activeTab]: false }));
        }
      }
    })();
    return () => controller.abort();
  }, [activeTab]);

  // Infinite scroll: fetch the next page and append to the active tab.
  // Cheap-gated on loading flags so a fast scroll doesn't stack fetches.
  const loadMore = useCallback(async () => {
    const tabState = pageState[activeTab];
    if (loadingMore || loadingTab[activeTab] || !tabState.hasMore) return;
    setLoadingMore(true);
    try {
      if (activeTab === "draft") {
        const { drafts: list, pagination } = await fetchDraftStories(tabState.page, limitFor("draft"));
        setDrafts((prev) => dedupeAppend(prev, list));
        setPageState((s) => ({
          ...s,
          draft: {
            page: tabState.page + 1,
            hasMore: hasMoreFromPagination(pagination, list.length, limitFor("draft")),
          },
        }));
      } else {
        const { cards, pagination } = await fetchStudioCards(activeTab, tabState.page, limitFor(activeTab));
        let merged = overlayBookmarks(cards);
        if (activeTab === "bookmark") {
          merged = merged.map((c) => ({ ...c, isBookmarked: true }));
        }
        if (activeTab === "received") setReceived((prev) => dedupeAppend(prev, merged));
        else if (activeTab === "sent") setSent((prev) => dedupeAppend(prev, merged));
        else setBookmark((prev) => dedupeAppend(prev, merged));
        setPageState((s) => ({
          ...s,
          [activeTab]: {
            page: tabState.page + 1,
            hasMore: hasMoreFromPagination(pagination, merged.length, limitFor(activeTab)),
          },
        }));
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, pageState, loadingMore, loadingTab]);

  // IntersectionObserver on a sentinel div at the list's bottom. When
  // the sentinel enters the viewport we fire loadMore; the observer is
  // re-attached whenever the tab (and thus the observed element) changes.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, activeTab]);

  // Friend requests — powers both the Waiting-on-you panel and (via
  // union with unanswered prompts) the pending count. Silent refresh
  // so the panel doesn't blink between navigations.
  useEffect(() => {
    let cancelled = false;
    fetchFriendRequests("received")
      .then((list) => {
        if (cancelled) return;
        setRequests(list);
        setCachedRequests(list);
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Unanswered prompts derive from the Received cache — a card with
  // no storyThread (or totalStories === 0) is one the user hasn't
  // replied to yet.
  const unansweredPrompts = useMemo(() => {
    return received.filter((c) => {
      const thread = c.storyThread as { totalStories?: number } | null | undefined;
      const total = thread?.totalStories ?? 0;
      return total === 0;
    });
  }, [received]);

  // Mirror bookmark changes made on other surfaces (Home tile, Library
  // grid, Inspiration card, OpenStory viewer) into the Studio lists so
  // we don't render stale state when the user comes back to a tab.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<BookmarkChangedDetail>).detail;
      if (!detail) return;
      const { promptId, isBookmarked } = detail;
      const patch = (list: UserCard[]) =>
        list.map((c) => (c._id === promptId ? { ...c, isBookmarked } : c));
      setReceived(patch);
      setSent(patch);
      if (isBookmarked) {
        setBookmark(patch);
      } else {
        // If somebody else un-bookmarked this card, drop it from the
        // Bookmark tab immediately (no fade — the change didn't
        // originate here).
        setBookmark((prev) => prev.filter((c) => c._id !== promptId));
      }
    };
    bookmarkEvents.addEventListener("bookmark:changed", onChange);
    return () => bookmarkEvents.removeEventListener("bookmark:changed", onChange);
  }, []);

  // Full optimistic-toggle model per the bookmark ideology spec:
  //   1) resolve current state via memory ref (guards double-tap),
  //   2) flip local list + the knownBookmarks override + fire event,
  //   3) on the Bookmark tab, run a 400ms fade before splicing the
  //      tile out (no rollback on error — user-perceived unbookmark
  //      wins over server truth; next refresh reconciles),
  //   4) call POST /api/bookmarks/:promptId,
  //   5) reconcile from `res.data.isBookmarked` if server disagrees.
  async function handleToggleBookmark(card: UserCard) {
    // For a flat UserCard the promptId IS the card id (no nested
    // promptCard). Cross-surface tiles that DO carry a nested promptCard
    // (LibraryThread etc.) resolve their promptId via
    // `resolveBookmarkState` — the shared store handles both shapes.
    const promptId = card._id;
    if (!promptId) return;
    const cardKey = card._id;
    // Step 1: current state — memory ref first, then card field.
    const currentBookmarked =
      getMemoryBookmark(cardKey) ?? !!card.isBookmarked;
    const nextBookmarked = !currentBookmarked;
    setMemoryBookmark(cardKey, nextBookmarked);

    // Step 2: optimistic flip.
    const applyFlip = (list: UserCard[]) =>
      list.map((c) =>
        c._id === cardKey ? { ...c, isBookmarked: nextBookmarked } : c
      );
    setReceived(applyFlip);
    setSent(applyFlip);
    setBookmark(applyFlip);
    setKnownBookmark(promptId, nextBookmarked);

    // Step 3: Bookmark-tab fade-out on unbookmark.
    let willFadeOut = false;
    if (activeTab === "bookmark" && !nextBookmarked) {
      willFadeOut = true;
      setFadingOut((prev) => new Set(prev).add(cardKey));
      window.setTimeout(() => {
        setBookmark((prev) => prev.filter((c) => c._id !== cardKey));
        removeCardFromCache("bookmark", cardKey);
        setFadingOut((prev) => {
          const next = new Set(prev);
          next.delete(cardKey);
          return next;
        });
      }, 420);
    }

    // Step 4 + 5: fire + reconcile with server.
    try {
      const { isBookmarked: serverBookmarked } = await toggleCardBookmark(promptId);
      if (
        serverBookmarked !== null &&
        serverBookmarked !== nextBookmarked
      ) {
        // Cross-device race — server disagrees. Take server as truth.
        setMemoryBookmark(cardKey, serverBookmarked);
        setKnownBookmark(promptId, serverBookmarked);
        const applyReconciled = (list: UserCard[]) =>
          list.map((c) =>
            c._id === cardKey ? { ...c, isBookmarked: serverBookmarked } : c
          );
        setReceived(applyReconciled);
        setSent(applyReconciled);
        setBookmark(applyReconciled);
      }
    } catch {
      // Bookmark-tab fade-out path: no rollback. Card is gone from the
      // user's view; a subsequent refresh will resync if needed. Any
      // other tab: revert to pre-tap state.
      if (willFadeOut) return;
      setMemoryBookmark(cardKey, currentBookmarked);
      setKnownBookmark(promptId, currentBookmarked);
      const applyRollback = (list: UserCard[]) =>
        list.map((c) =>
          c._id === cardKey ? { ...c, isBookmarked: currentBookmarked } : c
        );
      setReceived(applyRollback);
      setSent(applyRollback);
      setBookmark(applyRollback);
      toast.error("Couldn't update bookmark");
    }
  }

  function handleCardTap(card: UserCard) {
    const thread = card.storyThread as { _id?: string; totalStories?: number } | null | undefined;
    // Received tab: no reply yet → open the composer in reply mode.
    if (activeTab === "received" && (!thread?._id || thread.totalStories === 0)) {
      router.push(`/new-lag?promptId=${encodeURIComponent(card._id)}`);
      return;
    }
    // Anything with a thread → open the thread. Otherwise fall back to
    // the prompt detail view (rare — prompts with no thread only show
    // up under Sent or when the Received default hits above).
    if (thread?._id) {
      router.push(`/thread/${thread._id}`);
      return;
    }
    router.push(`/prompt/${card._id}`);
  }

  function handleDraftTap(draft: LibraryThread) {
    router.push(`/new-lag?draftId=${encodeURIComponent(draft._id)}`);
  }

  const activeCards =
    activeTab === "received"
      ? received
      : activeTab === "sent"
      ? sent
      : activeTab === "bookmark"
      ? bookmark
      : [];

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-white">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] pb-[100px] md:pb-[40px] max-w-[1440px] mx-auto w-full">
        <StudioHeader
          user={user}
          onOpenAvatar={() => setAvatarModalOpen(true)}
          onOpenCover={() => setCoverModalOpen(true)}
        />

        <div className="mt-[16px] md:mt-[20px] flex flex-col lg:flex-row gap-[24px] lg:gap-[32px]">
          <div className="flex-1 min-w-0">
            <StudioTabs active={activeTab} onChange={setActiveTab} />
            <div className="mt-[14px] flex flex-col gap-[10px]">
              {activeTab === "draft" ? (
                drafts.length === 0 && !loadingTab.draft ? (
                  <EmptyRow label="No drafts yet." />
                ) : (
                  drafts.map((d) => (
                    <DraftTile key={d._id} draft={d} onTap={() => handleDraftTap(d)} />
                  ))
                )
              ) : activeCards.length === 0 && !loadingTab[activeTab] ? (
                <EmptyRow label={emptyLabelFor(activeTab)} />
              ) : (
                activeCards.map((card) => (
                  <CardTile
                    key={card._id}
                    card={card}
                    fadingOut={fadingOut.has(card._id)}
                    onTap={() => handleCardTap(card)}
                    onToggleBookmark={() => handleToggleBookmark(card)}
                  />
                ))
              )}
              {loadingTab[activeTab] && activeCards.length === 0 && drafts.length === 0 && (
                <SkeletonRow count={3} />
              )}
              {/* Sentinel — IntersectionObserver watches this to trigger
                  loadMore. A small spinner shows while the next page is
                  in flight; when the tail is reached we simply stop. */}
              <div ref={sentinelRef} className="h-[1px] w-full" aria-hidden />
              {loadingMore && (
                <div className="py-[16px] flex justify-center">
                  <span className="w-[22px] h-[22px] rounded-full border-2 border-primary-blue/20 border-t-primary-blue animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Desktop-only "Waiting on you" side panel. */}
          <aside className="hidden lg:block w-[340px] shrink-0">
            <WaitingOnYou
              requests={requests}
              unansweredPrompts={unansweredPrompts}
            />
          </aside>
        </div>
      </div>

      <AvatarUploadModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
      <CoverPickerModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
      />
    </div>
  );
}

function emptyLabelFor(tab: StudioTab): string {
  if (tab === "received") return "No prompts received yet.";
  if (tab === "sent") return "You haven't sent any prompts yet.";
  if (tab === "bookmark") return "No bookmarks yet.";
  return "";
}

// Merge a new page into the tail of the existing list, skipping ids we
// already have. Cheap dupe guard for cases where BE returns overlapping
// pages after a mutation (e.g. new bookmark inserted at the top shifts
// the pagination window).
function dedupeAppend<T extends { _id: string }>(prev: T[], next: T[]): T[] {
  if (next.length === 0) return prev;
  const seen = new Set(prev.map((x) => x._id));
  const fresh = next.filter((x) => !seen.has(x._id));
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh];
}

// Read the "more pages exist" hint out of whatever the BE gave us. If
// pagination metadata is missing (some endpoints omit it), fall back to
// "did the last page return a full limit worth of rows?" — if it did,
// probably more; if not, definitely done.
function hasMoreFromPagination(
  p: { totalPages?: number; currentPage?: number; pageNumber?: number } | null,
  received: number,
  limit: number
): boolean {
  if (!p) return received >= limit;
  const current = p.currentPage ?? p.pageNumber;
  if (typeof current === "number" && typeof p.totalPages === "number") {
    return current < p.totalPages;
  }
  return received >= limit;
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="py-[40px] text-center font-montserrat text-primary-blue/60 text-[14px]">
      {label}
    </div>
  );
}

function SkeletonRow({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full h-[112px] rounded-[16px] bg-[#f3f3f3] animate-pulse"
        />
      ))}
    </>
  );
}

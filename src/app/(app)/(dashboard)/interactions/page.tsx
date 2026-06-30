"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  fetchInteractionCards,
  fetchThread,
  toggleStoryLike,
  type InteractionType,
} from "../../../../lib/interactions/api";
import { toggleCardBookmark } from "../../../../lib/home/api";
import { formatShortDayTime } from "../../../../lib/formatters";
import { parseContentToBlocks } from "../../../../lib/parseStoryContent";
import StoryMedia from "../../../../views/StoryPage/components/StoryMedia";
import type { ContentBlock } from "../../../../types/story";
import type {
  Story,
  StoryMedia as StoryMediaItem,
  ThreadParticipant,
  ThreadResponse,
  UserCard,
} from "../../../../types/home";
import {
  BookmarkIcon,
  ChatIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PersonIcon,
  SendIcon,
  SparkleIcon,
} from "../icons";

const PAGE_SIZE = 20;
const PREFETCH_PX = 200;

function dedupeAppend<T extends { _id: string }>(prev: T[], next: T[]): T[] {
  if (next.length === 0) return prev;
  const seen = new Set(prev.map((c) => c._id));
  const fresh: T[] = [];
  for (const item of next) {
    if (seen.has(item._id)) continue;
    seen.add(item._id);
    fresh.push(item);
  }
  return fresh.length === 0 ? prev : [...prev, ...fresh];
}

function useBookmarkToggle(cardId: string, initial: boolean) {
  const [bookmarked, setBookmarked] = useState(initial);
  const pendingRef = useRef(false);

  const toggle = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const previous = bookmarked;
    setBookmarked(!previous);
    try {
      await toggleCardBookmark(cardId);
    } catch {
      setBookmarked(previous);
      toast.error("Couldn't update bookmark");
    } finally {
      pendingRef.current = false;
    }
  }, [cardId, bookmarked]);

  return { bookmarked, toggle };
}

type TabState = {
  cards: UserCard[];
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
  loaded: boolean;
};

const initialTabState: TabState = {
  cards: [],
  page: 0,
  hasMore: true,
  loadingMore: false,
  loaded: false,
};

type ThreadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: ThreadResponse }
  | { kind: "no-thread" }
  | { kind: "error"; message: string };

export default function InteractionsPage() {
  const { user } = useAuth();
  const currentUserId = user?._id ?? "";
  const [activeTab, setActiveTab] = useState<InteractionType>("received");
  const [received, setReceived] = useState<TabState>(initialTabState);
  const [sent, setSent] = useState<TabState>(initialTabState);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [threadState, setThreadState] = useState<ThreadState>({ kind: "idle" });
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const threadLogFiredRef = useRef(false);

  const tabState = activeTab === "received" ? received : sent;
  const setTabState =
    activeTab === "received" ? setReceived : setSent;

  const loadMore = useCallback(async () => {
    if (tabState.loadingMore) return;
    if (!tabState.hasMore && tabState.page > 0) return;
    setTabState((t) => ({ ...t, loadingMore: true }));
    try {
      const nextPage = tabState.page + 1;
      const { cards, pagination, envelope } = await fetchInteractionCards(
        activeTab,
        nextPage,
        PAGE_SIZE
      );
      if (nextPage === 1) {
        console.log(`[interactions] ${activeTab} full response:`, envelope);
      }
      const hasMore = pagination
        ? pagination.pageNumber < pagination.totalPages
        : cards.length > 0;
      setTabState((t) => ({
        ...t,
        cards: dedupeAppend(t.cards, cards),
        page: nextPage,
        hasMore,
        loadingMore: false,
        loaded: true,
      }));
    } catch (err) {
      console.log(`[interactions] ${activeTab} error:`, err);
      setTabState((t) => ({
        ...t,
        hasMore: false,
        loadingMore: false,
        loaded: true,
      }));
    }
  }, [activeTab, tabState.loadingMore, tabState.hasMore, tabState.page, setTabState]);

  // Auto-load first page when switching tabs (only if not yet loaded)
  useEffect(() => {
    if (!tabState.loaded && !tabState.loadingMore) {
      loadMore();
    }
  }, [tabState.loaded, tabState.loadingMore, loadMore]);

  // Fetch thread when a card is selected
  useEffect(() => {
    if (!selectedCardId) {
      setThreadState({ kind: "idle" });
      return;
    }
    const card =
      received.cards.find((c) => c._id === selectedCardId) ??
      sent.cards.find((c) => c._id === selectedCardId);
    if (!card) return;

    const storyThread = card.storyThread as { _id?: string } | null;
    const threadId = storyThread?._id;
    if (!threadId) {
      setThreadState({ kind: "no-thread" });
      setActiveStoryIndex(0);
      return;
    }

    let cancelled = false;
    setThreadState({ kind: "loading" });
    setActiveStoryIndex(0);

    fetchThread(threadId)
      .then(({ data, envelope }) => {
        if (cancelled) return;
        if (!threadLogFiredRef.current) {
          threadLogFiredRef.current = true;
          console.log("[interactions] thread full response:", envelope);
        }
        setThreadState({ kind: "ready", data });
      })
      .catch((err) => {
        if (cancelled) return;
        console.log("[interactions] thread error:", err);
        setThreadState({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Couldn't load the story",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCardId, received.cards, sent.cards]);

  // IntersectionObserver for vertical load-more
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!tabState.hasMore || tabState.page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root, rootMargin: `${PREFETCH_PX}px 0px ${PREFETCH_PX}px 0px` }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [tabState.hasMore, tabState.page, loadMore, activeTab]);

  return (
    <div className="flex h-full min-h-0">
      <section className="w-[400px] shrink-0 flex flex-col px-[24px] pt-[16px] min-h-0">
        <h1 className="font-montserrat font-bold text-primary-blue text-[24px] md:text-[28px] leading-tight mb-[16px]">
          Interactions
        </h1>

        <div className="flex items-center gap-[4px] bg-[#ededed] rounded-full p-[4px] mb-[14px] self-start">
          {(["received", "sent"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setActiveTab(t);
                setSelectedCardId(null);
              }}
              className={`relative cursor-pointer px-[16px] py-[6px] rounded-full font-montserrat font-medium text-[14px] ${
                activeTab === t ? "text-white" : "text-primary-blue"
              }`}
            >
              {activeTab === t && (
                <motion.span
                  layoutId="interactions-tab-pill"
                  className="absolute inset-0 bg-primary-blue rounded-full"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative">
                {t === "received" ? "Received" : "Sent"}
              </span>
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-hide -mx-[20px] px-[20px] pt-[18px]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08, ease: "easeOut" }}
            >
              {!tabState.loaded ? (
                <SkeletonList />
              ) : tabState.cards.length === 0 ? (
                <EmptyMessage type={activeTab} />
              ) : (
                <ul className="flex flex-col gap-[10px]">
                  {tabState.cards.map((card) => (
                    <li key={card._id}>
                      <InteractionCard
                        card={card}
                        selected={selectedCardId === card._id}
                        onSelect={() => {
                          setSelectedCardId(card._id);
                          if (card.newStory) {
                            setTabState((t) => ({
                              ...t,
                              cards: t.cards.map((c) =>
                                c._id === card._id
                                  ? { ...c, newStory: false }
                                  : c
                              ),
                            }));
                          }
                        }}
                        hideAuthor={
                          activeTab === "sent" &&
                          card.author?._id === currentUserId
                        }
                      />
                    </li>
                  ))}
                  {tabState.hasMore && (
                    <li
                      ref={sentinelRef}
                      className="h-[40px] flex items-center justify-center"
                    >
                      {tabState.loadingMore && (
                        <div className="w-[20px] h-[20px] border-[2px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
                      )}
                    </li>
                  )}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <div className="flex-1 min-w-0 flex flex-col relative">
        {threadState.kind === "idle" ? (
          <RightPanelEmpty />
        ) : threadState.kind === "loading" ? (
          <RightPanelLoading />
        ) : threadState.kind === "no-thread" ? (
          <NewStoryStub />
        ) : threadState.kind === "error" ? (
          <RightPanelError message={threadState.message} />
        ) : (
          <ThreadViewer
            data={threadState.data}
            activeIndex={activeStoryIndex}
            onSelectIndex={setActiveStoryIndex}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}

function RightPanelEmpty() {
  return (
    <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
      <p className="font-montserrat text-primary-blue/50 text-[14px] text-center max-w-[360px]">
        Select an interaction to view or respond
      </p>
    </div>
  );
}

function RightPanelLoading() {
  return (
    <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
      <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
    </div>
  );
}

function RightPanelError({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
      <p className="font-montserrat text-primary-blue/60 text-[14px] text-center max-w-[360px]">
        {message}
      </p>
    </div>
  );
}

function NewStoryStub() {
  return (
    <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
      <p className="font-montserrat text-primary-blue/50 text-[14px] text-center max-w-[360px]">
        No story yet — the response form goes here.
      </p>
    </div>
  );
}

function ThreadViewer({
  data,
  activeIndex,
  onSelectIndex,
  currentUserId,
}: {
  data: ThreadResponse;
  activeIndex: number;
  onSelectIndex: (i: number) => void;
  currentUserId: string;
}) {
  const stories = data.stories ?? [];
  const total = stories.length;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0));
  const story: Story | undefined = stories[safeIndex];
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < total - 1;

  // Per-story like state (keyed by story._id). Lets the user toggle without
  // mutating the parent threadState and survives switching between stories.
  const [likeOverrides, setLikeOverrides] = useState<
    Record<string, { liked: boolean; count: number }>
  >({});
  const likePendingRef = useRef<Record<string, boolean>>({});

  const storyId = story?._id ?? "";
  const override = storyId ? likeOverrides[storyId] : undefined;
  const isLiked = override?.liked ?? !!story?.isLikedByMe;
  const likeCount = override?.count ?? story?.likesCount ?? 0;

  const handleLikeToggle = useCallback(async () => {
    if (!storyId) return;
    if (likePendingRef.current[storyId]) return;
    likePendingRef.current[storyId] = true;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
    setLikeOverrides((m) => ({
      ...m,
      [storyId]: { liked: nextLiked, count: nextCount },
    }));
    try {
      await toggleStoryLike(storyId);
    } catch {
      setLikeOverrides((m) => ({
        ...m,
        [storyId]: { liked: prevLiked, count: prevCount },
      }));
      toast.error("Couldn't update like");
    } finally {
      likePendingRef.current[storyId] = false;
    }
  }, [storyId, isLiked, likeCount]);

  const prompt = data.thread.prompt;
  const participants: ThreadParticipant[] = data.thread.participants ?? [];

  // Compute hasPrompt per spec: (content || imageUrl) && !isTitleAvailable
  const hasPrompt =
    !!(prompt?.content || prompt?.imageUrl) && !prompt?.isTitleAvailable;

  // Prompt pill creator (own vs. someone else's). Star icon when own/unknown.
  const promptCreator = prompt?.author ?? null;
  const creatorName =
    promptCreator?.firstName || promptCreator?.username || null;
  const isOwnPrompt = promptCreator?._id === currentUserId;
  const showStarIcon = isOwnPrompt || !promptCreator || !creatorName;

  // Note pill: derive author from participants (BE quirk — prompt.author is null on thread response)
  const noteAuthor =
    participants.find((p) => p?.role === "author") || null;
  const noteAuthorFirst =
    noteAuthor?.firstName || noteAuthor?.username || null;
  const promptNote = prompt?.note || "";
  const hasPromptNote = hasPrompt && !!promptNote && !!noteAuthorFirst;

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
        <p className="font-montserrat text-primary-blue/60 text-[14px] text-center max-w-[360px]">
          No stories yet — be the first to respond.
        </p>
      </div>
    );
  }

  // Cover: prompt image first, else first cover-marked media on the active story
  const firstCoverMedia = story?.media?.find(
    (m: StoryMediaItem) =>
      m?.type === "image" &&
      typeof m?.url === "string" &&
      m.url.includes("_cover.jpg")
  );
  const coverUrl =
    prompt?.imageUrl ||
    firstCoverMedia?.url ||
    story?.coverImage ||
    story?.cover ||
    story?.imageUrl ||
    null;

  // Body: parse tagged content into blocks
  const blocks = parseContentToBlocks(story?.content || "");

  // Viewer face stack — try story.viewers first, else fall back to thread participants
  const viewerSource: ThreadParticipant[] =
    (story?.viewers as ThreadParticipant[] | undefined)?.length
      ? (story!.viewers as ThreadParticipant[])
      : participants;

  return (
    <>
      {/* Column-edge nav arrows (only when multi-story) */}
      {total > 1 && canPrev && (
        <button
          type="button"
          aria-label="Previous story"
          onClick={() => onSelectIndex(safeIndex - 1)}
          className="cursor-pointer absolute left-[8px] top-1/2 -translate-y-1/2 z-10 w-[36px] h-[36px] rounded-full bg-[#ededed] flex items-center justify-center text-primary-blue hover:bg-[#e3e3e3] transition-colors"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
      )}
      {total > 1 && canNext && (
        <button
          type="button"
          aria-label="Next story"
          onClick={() => onSelectIndex(safeIndex + 1)}
          className="cursor-pointer absolute right-[8px] top-1/2 -translate-y-1/2 z-10 w-[36px] h-[36px] rounded-full bg-[#ededed] flex items-center justify-center text-primary-blue hover:bg-[#e3e3e3] transition-colors"
        >
          <ChevronRightIcon width={18} height={18} />
        </button>
      )}

      <div className="flex-1 min-w-0 overflow-y-auto scrollbar-hide px-[40px] pt-[16px]">
        {/* top chrome: Add Story + options menu */}
        <div className="flex items-center justify-between gap-[16px] mb-[12px]">
          <button
            type="button"
            className="cursor-pointer bg-[#ededed] border border-white rounded-full px-[14px] py-[7px] flex items-center gap-[8px] font-montserrat font-medium text-primary-blue text-[14px] hover:opacity-90"
          >
            Add Story
            <span className="text-[16px] leading-none">+</span>
          </button>
          <button
            type="button"
            aria-label="More options"
            className="cursor-pointer bg-[#f1f1f1] rounded-full w-[36px] h-[36px] flex items-center justify-center text-primary-blue hover:opacity-90"
          >
            <MoreHorizontalIcon width={20} height={20} />
          </button>
        </div>

        {/* Prompt pill (and note pill) */}
        {hasPrompt && prompt && (
          <PromptPill
            promptContent={prompt.content || ""}
            showStarIcon={showStarIcon}
            creatorName={creatorName}
            creatorAvatar={promptCreator?.profilePicture ?? null}
          />
        )}
        {hasPromptNote && noteAuthor && (
          <NotePill
            note={promptNote}
            authorFirstName={noteAuthorFirst!}
            authorAvatar={noteAuthor.profilePicture ?? null}
          />
        )}

        {/* Progress bar (one segment per story) — show when >= 2 */}
        {total >= 2 && (
          <div className="flex items-center gap-[6px] mt-[12px] mb-[14px]">
            {stories.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to story ${i + 1}`}
                onClick={() => onSelectIndex(i)}
                className={`h-[3px] flex-1 rounded-full transition-colors ${
                  i === safeIndex
                    ? "bg-primary-blue"
                    : "bg-[#dbdbdb] hover:bg-primary-blue/30"
                }`}
              />
            ))}
          </div>
        )}

        {/* Hero */}
        <div className="relative rounded-[24px] overflow-hidden bg-primary-blue/10 h-[260px] mb-[20px] mt-[8px]">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
        </div>

        {/* title + date */}
        {(story?.title || story?.createdAt) && (
          <div className="flex items-start justify-between gap-[12px]">
            {story?.title ? (
              <h2 className="font-montserrat font-semibold text-primary-blue text-[22px] md:text-[26px] leading-[30px] flex-1 min-w-0">
                {story.title}
              </h2>
            ) : (
              <span />
            )}
            <span className="font-montserrat text-primary-blue/50 text-[13px] shrink-0 mt-[8px]">
              {formatShortDayTime(story?.createdAt)}
            </span>
          </div>
        )}

        {/* author row */}
        {story?.author && (
          <div className="flex items-center gap-[10px] mt-[10px]">
            <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
              {story.author.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={story.author.profilePicture}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[13px]">
                  {(story.author.firstName || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="font-montserrat font-medium text-primary-blue text-[15px]">
              {[story.author.firstName, story.author.lastName]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
        )}

        {/* body */}
        <div className="mt-[18px] mb-[24px] flex flex-col gap-[16px]">
          {blocks.map((block, i) => (
            <BodyBlock
              key={i}
              block={block}
              storyTitle={story?.title || undefined}
            />
          ))}
        </div>
      </div>

      {/* Fixed footer action bar */}
      <div className="shrink-0 px-[40px] py-[14px] border-t border-black/[0.06] bg-white flex items-center justify-between text-primary-blue/80 font-montserrat">
        <ViewerStack viewers={viewerSource} />
        <div className="flex items-center gap-[18px]">
          <button
            type="button"
            aria-label="Comments"
            className="cursor-pointer flex items-center gap-[6px] text-primary-blue hover:opacity-80 transition-opacity"
          >
            <ChatIcon width={20} height={20} />
            <span className="text-[14px] font-medium">
              {story?.commentsCount ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={handleLikeToggle}
            aria-label={isLiked ? "Unlike" : "Like"}
            className={`cursor-pointer flex items-center gap-[6px] transition-opacity hover:opacity-80 ${
              isLiked ? "text-[#e53e3e]" : "text-primary-blue"
            }`}
          >
            <HeartIcon width={20} height={20} filled={isLiked} />
            <span className="text-[14px] font-medium">{likeCount}</span>
          </button>
        </div>
      </div>
    </>
  );
}

function PromptPill({
  promptContent,
  showStarIcon,
  creatorName,
  creatorAvatar,
}: {
  promptContent: string;
  showStarIcon: boolean;
  creatorName: string | null;
  creatorAvatar: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-[4px] mb-[6px] flex items-center gap-[10px]">
      {showStarIcon ? (
        <div className="w-[32px] h-[32px] rounded-full bg-primary-orange/15 text-primary-orange flex items-center justify-center shrink-0">
          <SparkleIcon width={18} height={18} />
        </div>
      ) : (
        <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
          {creatorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creatorAvatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[12px]">
              {(creatorName || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer flex-1 min-w-0 bg-[#ededed] rounded-[14px] px-[14px] py-[10px] flex items-start justify-between gap-[10px] hover:bg-[#e3e3e3] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {expanded ? (
            <>
              {creatorName && !showStarIcon && (
                <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[4px]">
                  {creatorName}
                </p>
              )}
              <p className="font-montserrat text-primary-blue text-[14px] leading-[20px] whitespace-pre-line">
                {promptContent}
              </p>
            </>
          ) : (
            <p className="font-montserrat text-primary-blue text-[14px]">
              {showStarIcon || !creatorName ? (
                "View prompt"
              ) : (
                <>
                  View{" "}
                  <span className="font-semibold">{creatorName}</span>
                  &apos;s prompt
                </>
              )}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-primary-blue/60 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon width={16} height={16} />
        </span>
      </button>
    </div>
  );
}

function NotePill({
  note,
  authorFirstName,
  authorAvatar,
}: {
  note: string;
  authorFirstName: string;
  authorAvatar: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-[4px] mb-[6px] flex items-center gap-[10px]">
      <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
        {authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authorAvatar}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[12px]">
            {authorFirstName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer flex-1 min-w-0 bg-[#ededed] rounded-[14px] px-[14px] py-[10px] flex items-start justify-between gap-[10px] hover:bg-[#e3e3e3] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {expanded ? (
            <>
              <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[4px]">
                {authorFirstName}
              </p>
              <p className="font-montserrat text-primary-blue text-[14px] leading-[20px] whitespace-pre-line">
                {note}
              </p>
            </>
          ) : (
            <p className="font-montserrat text-primary-blue text-[14px]">
              View{" "}
              <span className="font-semibold">{authorFirstName}</span>
              &apos;s note
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-primary-blue/60 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon width={16} height={16} />
        </span>
      </button>
    </div>
  );
}

function ViewerStack({ viewers }: { viewers: ThreadParticipant[] }) {
  const visible = viewers.slice(0, 4);
  const extra = Math.max(0, viewers.length - visible.length);
  if (visible.length === 0) return <span />;
  return (
    <div className="flex items-center gap-[8px]">
      <div className="flex -space-x-[8px]">
        {visible.map((p) => (
          <div
            key={p._id}
            className="w-[26px] h-[26px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white"
            title={[p.firstName, p.lastName].filter(Boolean).join(" ")}
          >
            {p.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.profilePicture}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[10px]">
                {(p.firstName || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
      {extra > 0 && (
        <span className="font-montserrat font-medium text-primary-blue/70 text-[13px]">
          +{extra}
        </span>
      )}
    </div>
  );
}

function BodyBlock({
  block,
  storyTitle,
}: {
  block: ContentBlock;
  storyTitle?: string;
}) {
  if (block.type === "text") {
    return (
      <p className="font-montserrat text-primary-blue text-[15px] leading-[22px] whitespace-pre-line">
        {block.text}
      </p>
    );
  }
  if (block.type === "audio") {
    return (
      <div className="mx-auto max-w-[300px] md:max-w-[420px] w-full">
        <audio
          src={block.url}
          controls
          preload="metadata"
          className="w-full"
        >
          <track kind="captions" />
        </audio>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[300px] md:max-w-[420px] w-full">
      <StoryMedia
        item={{ type: block.type, url: block.url }}
        storyTitle={storyTitle}
      />
    </div>
  );
}

function InteractionCard({
  card,
  selected,
  onSelect,
  hideAuthor = false,
}: {
  card: UserCard;
  selected: boolean;
  onSelect: () => void;
  hideAuthor?: boolean;
}) {
  const { bookmarked, toggle } = useBookmarkToggle(
    card._id,
    card.isBookmarked
  );
  const author = card.author;
  const shareCount = card.shareWith?.length ?? 0;
  const displayText = card.content || card.title || "Untitled Story";
  const dateLabel = formatShortDayTime(card.createdAt);

  return (
    <article
      onClick={onSelect}
      className={`relative cursor-pointer bg-white rounded-[20px] shadow-[0_0_12.5px_rgba(0,0,0,0.2)] pt-[6px] px-[6px] pb-[3px] flex gap-[12px] transition-colors ${
        selected
          ? "border-[3px] border-primary-orange"
          : "border-[3px] border-transparent"
      }`}
    >
      {card.newStory && (
        <span
          aria-label="New story"
          className="absolute top-[46px] right-[18px] w-[8px] h-[8px] rounded-full bg-primary-orange z-10"
        />
      )}
      <div className="relative w-[88px] min-h-[88px] rounded-l-[16px] overflow-hidden bg-primary-blue/10 shrink-0">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <div className="flex-1 flex flex-col justify-between gap-[10px] pt-[6px] pb-0 pr-[8px] min-w-0">
        <div className="flex items-center justify-between gap-[6px]">
          <div className="flex items-center gap-[5px] min-w-0">
            {author && !hideAuthor && (
              <div className="w-[26px] h-[26px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
                {author.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={author.profilePicture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[10px]">
                    {(author.firstName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            )}
            {shareCount > 0 && (
              <div className="bg-[#ededed] border border-white rounded-full px-[6px] py-[2px] flex items-center gap-[3px]">
                <PersonIcon width={9} height={9} />
                <span className="font-montserrat font-medium text-primary-blue text-[10px] leading-[12px]">
                  {shareCount}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-[16px] shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
              }}
              aria-label="Share"
              className="cursor-pointer text-primary-blue hover:opacity-80 transition-opacity"
            >
              <SendIcon width={19} height={19} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              className="cursor-pointer text-primary-blue hover:opacity-80 transition-opacity"
            >
              <BookmarkIcon width={16} height={19} filled={bookmarked} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-[10px] min-w-0">
          <p className="font-montserrat font-medium text-primary-blue text-[14px] leading-[18px] line-clamp-3">
            {displayText}
          </p>
          <p className="font-montserrat font-medium text-black/50 text-[11px] leading-[14px] truncate">
            {dateLabel}
          </p>
        </div>
      </div>
    </article>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-[10px]">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="h-[130px] bg-white rounded-[20px] shadow-[0_0_12.5px_rgba(0,0,0,0.2)] animate-pulse"
        />
      ))}
    </ul>
  );
}

function EmptyMessage({ type }: { type: InteractionType }) {
  return (
    <p className="font-montserrat text-primary-blue/60 text-[14px] mt-[40px] text-center px-[20px]">
      {type === "received"
        ? "No one has sent you a prompt yet…"
        : "You haven't sent any prompts yet…"}
    </p>
  );
}


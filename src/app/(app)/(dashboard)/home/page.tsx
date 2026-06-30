"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  fetchInspirationFeed,
  fetchReceivedCards,
  toggleCardBookmark,
} from "../../../../lib/home/api";
import type { UserCard } from "../../../../types/home";
import {
  EMPTY_STATE_CARDS,
  loadEmptyStateDismissed,
  toggleEmptyStateDismissed,
  type EmptyStateCard,
} from "../../../../data/emptyStateCards";
import { BookmarkIcon, PersonIcon, SendIcon } from "../icons";

type ForYouItem =
  | (UserCard & { kind: "api" })
  | (EmptyStateCard & { kind: "empty-state" });

const CARD_WIDTH = 240;
const FORYOU_HEIGHT = 270;
const INSPO_HEIGHT = 380;
const PAGE_SIZE = 20;
const PREFETCH_PX = 200;
const INSPO_CYCLE_COUNT = 50;

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const userId = user?._id ?? "";

  // For You state
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [forYouPage, setForYouPage] = useState(0);
  const [hasMoreForYou, setHasMoreForYou] = useState(true);
  const [loadingMoreForYou, setLoadingMoreForYou] = useState(false);

  // Inspiration state
  const [inspoCards, setInspoCards] = useState<UserCard[]>([]);
  const [inspoPage, setInspoPage] = useState(0);
  const [hasMoreInspo, setHasMoreInspo] = useState(true);
  const [loadingMoreInspo, setLoadingMoreInspo] = useState(false);
  const [inspoExhausted, setInspoExhausted] = useState(false);

  // Empty-state dismissals (per-user, localStorage)
  const [dismissedEmptyState, setDismissedEmptyState] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    setDismissedEmptyState(loadEmptyStateDismissed(userId));
  }, [userId]);

  const handleToggleEmptyState = (cardId: string) => {
    if (!userId) return;
    const next = toggleEmptyStateDismissed(userId, cardId);
    setDismissedEmptyState(next);
  };

  const loadMoreForYou = useCallback(async () => {
    if (loadingMoreForYou) return;
    setLoadingMoreForYou(true);
    try {
      const nextPage = forYouPage + 1;
      const { cards, envelope } = await fetchReceivedCards(
        nextPage,
        PAGE_SIZE
      );
      if (nextPage === 1) {
        console.log("[paginate] for-you full response:", envelope);
      }
      setUserCards((prev) => dedupeAppend(prev, cards));
      setForYouPage(nextPage);
      setHasMoreForYou(cards.length > 0);
    } catch (err) {
      console.log("[paginate] for-you error:", err);
      setHasMoreForYou(false);
    } finally {
      setLoadingMoreForYou(false);
    }
  }, [forYouPage, loadingMoreForYou]);

  const loadMoreInspo = useCallback(async () => {
    if (loadingMoreInspo) return;
    setLoadingMoreInspo(true);
    try {
      const nextPage = inspoPage + 1;
      const { cards, envelope } = await fetchInspirationFeed(
        nextPage,
        PAGE_SIZE
      );
      if (nextPage === 1) {
        console.log("[paginate] inspiration full response:", envelope);
      }
      setInspoCards((prev) => {
        const merged = dedupeAppend(prev, cards);
        const freshCount = merged.length - prev.length;
        if (freshCount < PAGE_SIZE) {
          setHasMoreInspo(false);
          setInspoExhausted(true);
        }
        return merged;
      });
      setInspoPage(nextPage);
    } catch (err) {
      console.log("[paginate] inspiration error:", err);
      setHasMoreInspo(false);
      setInspoExhausted(true);
    } finally {
      setLoadingMoreInspo(false);
    }
  }, [inspoPage, loadingMoreInspo]);

  // Initial mount: page 1 of both, in parallel.
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    loadMoreForYou();
    loadMoreInspo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // IntersectionObserver — For You rail
  const forYouScrollRef = useRef<HTMLDivElement | null>(null);
  const forYouSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMoreForYou || forYouPage === 0) return;
    const root = forYouScrollRef.current;
    const sentinel = forYouSentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreForYou();
      },
      { root, rootMargin: `0px ${PREFETCH_PX}px 0px 0px` }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMoreForYou, forYouPage, loadMoreForYou]);

  // IntersectionObserver — Inspiration rail
  const inspoScrollRef = useRef<HTMLDivElement | null>(null);
  const inspoSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMoreInspo || inspoPage === 0) return;
    const root = inspoScrollRef.current;
    const sentinel = inspoSentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreInspo();
      },
      { root, rootMargin: `0px ${PREFETCH_PX}px 0px 0px` }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMoreInspo, inspoPage, loadMoreInspo]);

  // Empty-state cards appear only when For You has no more pages.
  const forYouItems = useMemo<ForYouItem[]>(() => {
    const apiItems: ForYouItem[] = userCards.map((c) => ({
      ...c,
      kind: "api" as const,
    }));
    if (hasMoreForYou) return apiItems;
    const visibleEmptyState: ForYouItem[] = EMPTY_STATE_CARDS.filter(
      (c) => !dismissedEmptyState.includes(c.id)
    ).map((c) => ({ ...c, kind: "empty-state" as const }));
    return [...apiItems, ...visibleEmptyState];
  }, [userCards, hasMoreForYou, dismissedEmptyState]);

  // Inspiration: once BE is exhausted, repeat the loaded set N times so the
  // rail keeps scrolling. Pure client-side cycle, no further fetches.
  const inspoListData = useMemo<UserCard[]>(() => {
    if (!inspoExhausted || inspoCards.length === 0) return inspoCards;
    return Array.from(
      { length: inspoCards.length * INSPO_CYCLE_COUNT },
      (_, i) => inspoCards[i % inspoCards.length]
    );
  }, [inspoCards, inspoExhausted]);

  const inspoKey = (card: UserCard, idx: number) =>
    inspoExhausted
      ? `${card._id}-${Math.floor(idx / inspoCards.length)}`
      : card._id;

  const firstName = (user?.firstName || "there").trim();
  const forYouInitialLoaded = forYouPage > 0;
  const inspoInitialLoaded = inspoPage > 0;

  return (
    <div className="px-[24px] md:px-[40px] pb-[40px]">
      <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[26px] leading-[1.2]">
        {getGreeting()}, {firstName}
      </h1>

      <Section title="For you">
        {!forYouInitialLoaded ? (
          <SkeletonRail tileHeight={FORYOU_HEIGHT} />
        ) : forYouItems.length === 0 ? (
          <EmptyMessage>Nothing here yet.</EmptyMessage>
        ) : (
          <Rail scrollRef={forYouScrollRef}>
            {forYouItems.map((item) =>
              item.kind === "api" ? (
                <UserCardTile key={item._id} card={item} />
              ) : (
                <EmptyStateCardTile
                  key={item.id}
                  card={item}
                  onToggle={() => handleToggleEmptyState(item.id)}
                />
              )
            )}
            {hasMoreForYou && (
              <Sentinel
                refEl={forYouSentinelRef}
                loading={loadingMoreForYou}
                height={FORYOU_HEIGHT}
              />
            )}
          </Rail>
        )}
      </Section>

      <Section title="Inspiration">
        {!inspoInitialLoaded ? (
          <SkeletonRail tileHeight={INSPO_HEIGHT} />
        ) : inspoCards.length === 0 ? (
          <EmptyMessage>No inspiration cards yet.</EmptyMessage>
        ) : (
          <Rail scrollRef={inspoScrollRef}>
            {inspoListData.map((card, idx) => (
              <InspoCardTile key={inspoKey(card, idx)} card={card} />
            ))}
            {hasMoreInspo && (
              <Sentinel
                refEl={inspoSentinelRef}
                loading={loadingMoreInspo}
                height={INSPO_HEIGHT}
              />
            )}
          </Rail>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-[28px] md:mt-[36px]">
      <h2 className="font-montserrat font-medium text-primary-blue text-[17px] md:text-[19px] leading-[26px] mb-[12px]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Rail({
  scrollRef,
  children,
}: {
  scrollRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={scrollRef}
      className="-mx-[24px] md:-mx-[40px] px-[24px] md:px-[40px] py-[18px] -my-[18px] overflow-x-auto scrollbar-hide"
    >
      <div className="flex gap-[16px] items-start">{children}</div>
    </div>
  );
}

function Sentinel({
  refEl,
  loading,
  height,
}: {
  refEl: React.Ref<HTMLDivElement>;
  loading: boolean;
  height: number;
}) {
  return (
    <div
      ref={refEl}
      style={{ width: loading ? 96 : 8, height }}
      className="shrink-0 flex items-center justify-center"
      aria-hidden="true"
    >
      {loading && (
        <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
      )}
    </div>
  );
}

function SkeletonRail({ tileHeight }: { tileHeight: number }) {
  return (
    <div className="-mx-[24px] md:-mx-[40px] px-[24px] md:px-[40px] py-[18px] -my-[18px] overflow-x-hidden">
      <div className="flex gap-[16px]">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ width: CARD_WIDTH, height: tileHeight }}
            className={`shrink-0 bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.25)] pt-[12px] pb-[24px] px-[12px] flex flex-col gap-[20px]`}
          >
            <div className="flex-1 rounded-tl-[24px] rounded-tr-[24px] bg-black/[0.06] animate-pulse" />
            <div className="h-[12px] mx-auto w-2/3 bg-black/[0.06] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <p className="font-montserrat text-primary-blue/60 text-[14px]">
      We couldn&apos;t load this. Try refreshing.
    </p>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-montserrat text-primary-blue/50 text-[14px]">
      {children}
    </p>
  );
}

function CardShell({
  height,
  href,
  children,
}: {
  height: number;
  href?: string;
  children: React.ReactNode;
}) {
  const className = `shrink-0 bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.25)] pt-[12px] pb-[24px] px-[12px] flex flex-col gap-[20px]`;
  const style = { width: CARD_WIDTH, height };
  if (href) {
    return (
      <Link href={href} style={style} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <article style={style} className={className}>
      {children}
    </article>
  );
}

function ImageArea({
  src,
  children,
}: {
  src?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex-1 min-h-0 rounded-tl-[24px] rounded-tr-[24px] overflow-hidden bg-primary-blue/10">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="relative pt-[21px] pl-[20px] pr-[16px] flex items-start justify-between">
        {children}
      </div>
    </div>
  );
}

type DisplayableCard = {
  content?: string | null;
  title?: string | null;
  imageUrl?: string | null;
  coverImage?: string | null;
};

function getCardDisplay(card: DisplayableCard): {
  displayText: string;
  imageSrc: string | null;
} {
  return {
    displayText: card.content || card.title || "Untitled Story",
    imageSrc: card.imageUrl || card.coverImage || null,
  };
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-montserrat font-medium text-primary-blue text-[13px] leading-[18px] text-center px-[8px] line-clamp-2">
      {children}
    </p>
  );
}

function CircleButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-center text-primary-blue hover:bg-white/95 transition-colors"
    >
      {children}
    </button>
  );
}

function UserCardTile({ card }: { card: UserCard }) {
  const { bookmarked, toggle } = useBookmarkToggle(card._id, card.isBookmarked);
  const shareCount = card.shareWith?.length ?? 0;
  const author = card.author;
  const { displayText, imageSrc } = getCardDisplay(card);
  const threadId = (card.storyThread as { _id?: string } | null)?._id;
  const href = threadId ? `/thread/${threadId}` : undefined;

  return (
    <CardShell height={FORYOU_HEIGHT} href={href}>
      <ImageArea src={imageSrc}>
        <div className="flex items-center gap-[6px]">
          {author && (
            <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
              {author.profilePicture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.profilePicture}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[12px]">
                  {(author.firstName || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          {shareCount > 0 && (
            <div className="bg-white border border-white rounded-full px-[8px] py-[4px] flex items-center gap-[4px]">
              <PersonIcon width={12} height={12} />
              <span className="font-montserrat font-medium text-primary-blue text-[12px] leading-[16px]">
                {shareCount}
              </span>
            </div>
          )}
        </div>

        <CircleButton
          ariaLabel={bookmarked ? "Remove bookmark" : "Bookmark"}
          onClick={toggle}
        >
          <BookmarkIcon width={13} height={15} filled={bookmarked} />
        </CircleButton>
      </ImageArea>
      <Caption>{displayText}</Caption>
    </CardShell>
  );
}

function EmptyStateCardTile({
  card,
  onToggle,
}: {
  card: EmptyStateCard;
  onToggle: () => void;
}) {
  const { displayText, imageSrc } = getCardDisplay(card);

  return (
    <CardShell height={FORYOU_HEIGHT} href={`/welcome/${card.id}`}>
      <ImageArea src={imageSrc}>
        <div className="w-[32px] h-[32px] rounded-full bg-white border border-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt=""
            className="w-[22px] h-[22px] object-contain"
          />
        </div>

        <CircleButton
          ariaLabel="Dismiss card"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
        >
          <BookmarkIcon width={13} height={15} />
        </CircleButton>
      </ImageArea>
      <Caption>{displayText}</Caption>
    </CardShell>
  );
}

function InspoCardTile({ card }: { card: UserCard }) {
  const { bookmarked, toggle } = useBookmarkToggle(card._id, card.isBookmarked);
  const tag = card.tags?.[0];
  const { displayText, imageSrc } = getCardDisplay(card);

  return (
    <CardShell height={INSPO_HEIGHT}>
      <ImageArea src={imageSrc}>
        {tag ? (
          <div className="bg-white border border-white rounded-full px-[10px] py-[4px]">
            <span className="font-montserrat font-medium text-primary-blue text-[12px] leading-[16px] capitalize">
              {tag}
            </span>
          </div>
        ) : (
          <span />
        )}

        <div className="flex flex-col gap-[10px]">
          <CircleButton
            ariaLabel={bookmarked ? "Remove bookmark" : "Bookmark"}
            onClick={toggle}
          >
            <BookmarkIcon width={13} height={15} filled={bookmarked} />
          </CircleButton>
          <CircleButton ariaLabel="Send">
            <SendIcon width={16} height={16} />
          </CircleButton>
        </div>
      </ImageArea>
      <Caption>{displayText}</Caption>
    </CardShell>
  );
}

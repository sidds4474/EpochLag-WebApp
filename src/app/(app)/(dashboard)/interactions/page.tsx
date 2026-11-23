"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LibraryThread } from "../../../../lib/library/api";
import { fetchStudioCards } from "../../../../lib/studio/api";
import type { UserCard } from "../../../../types/home";
import { ChevronLeftIcon } from "../icons";
import StoryRow from "../lags/StoryRow";
import StoryRowSkeleton from "../lags/StoryRowSkeleton";

type InteractionTab = "received" | "sent";

const PAGE_SIZE = 10;

// UserCards (prompts) adapted into the LibraryThread fields StoryRow
// renders — same approach as the Bookmarks page.
function cardToThread(card: UserCard): LibraryThread {
  // Participants = author + everyone the card was shared with, deduped
  // by _id so the author doesn't double up when they're also in the
  // shareWith list (common on Sent prompts).
  const people: LibraryThread["people"] = [];
  const seen = new Set<string>();
  if (card.author?._id) {
    people.push({
      _id: card.author._id,
      firstName: card.author.firstName,
      lastName: card.author.lastName,
      profilePicture: card.author.profilePicture,
    });
    seen.add(card.author._id);
  }
  for (const p of card.shareWith ?? []) {
    if (!p || !p._id || seen.has(p._id)) continue;
    people.push({
      _id: p._id,
      firstName: p.firstName,
      lastName: p.lastName,
      profilePicture: p.profilePicture,
    });
    seen.add(p._id);
  }
  return {
    _id: card._id,
    promptCard: {
      _id: card._id,
      title: card.title,
      content: card.content,
      imageUrl: card.imageUrl,
    },
    latestStory: null,
    people,
    totalPeople: people.length,
    isBookmarked: !!card.isBookmarked,
    displayDate: card.createdAt,
    latestActivity: card.updatedAt ?? card.createdAt,
  };
}

export default function InteractionsPage() {
  const searchParams = useSearchParams();
  // Honor ?tab= and ?initial= from the composers and other deep links
  // that used to redirect here through /studio — "sent" from the Ask
  // and Tell flows, "received" from the Home conversations list.
  const initialTab = (() => {
    const t =
      searchParams.get("tab") ?? searchParams.get("initial") ?? "received";
    return t === "sent" ? "sent" : "received";
  })();
  const [activeTab, setActiveTab] = useState<InteractionTab>(initialTab);
  const [threadsByTab, setThreadsByTab] = useState<
    Record<InteractionTab, LibraryThread[]>
  >({ received: [], sent: [] });
  const [pageByTab, setPageByTab] = useState<Record<InteractionTab, number>>({
    received: 0,
    sent: 0,
  });
  const [hasMoreByTab, setHasMoreByTab] = useState<
    Record<InteractionTab, boolean>
  >({ received: true, sent: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const threads = threadsByTab[activeTab];
  const page = pageByTab[activeTab];
  const hasMore = hasMoreByTab[activeTab];

  const loadPage = useCallback(
    async (tab: InteractionTab, nextPage: number) => {
      setLoading(true);
      try {
        const { cards, pagination } = await fetchStudioCards(
          tab,
          nextPage,
          PAGE_SIZE
        );
        const fresh = cards.map(cardToThread);
        setThreadsByTab((prev) => {
          const existing = prev[tab];
          const seen = new Set(existing.map((t) => t._id));
          return {
            ...prev,
            [tab]: [...existing, ...fresh.filter((t) => !seen.has(t._id))],
          };
        });
        setPageByTab((prev) => ({ ...prev, [tab]: nextPage }));
        const cur =
          pagination?.pageNumber ?? pagination?.currentPage ?? nextPage;
        const total = pagination?.totalPages ?? 1;
        setHasMoreByTab((prev) => ({
          ...prev,
          [tab]: pagination ? cur < total : fresh.length === PAGE_SIZE,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't load interactions"
        );
        setHasMoreByTab((prev) => ({ ...prev, [tab]: false }));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // First page per tab, only on first switch to that tab.
  useEffect(() => {
    if (page !== 0) return;
    loadPage(activeTab, 1);
  }, [activeTab, page, loadPage]);

  // Reset error between tab switches so stale messages don't persist.
  useEffect(() => {
    setError(null);
  }, [activeTab]);

  useEffect(() => {
    if (!hasMore || page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) {
          loadPage(activeTab, page + 1);
        }
      },
      { root, rootMargin: "300px 0px 300px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, page, loading, loadPage, activeTab]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#f3f1eb]">
      <div className="px-[12px] md:px-[32px] pt-[16px] max-w-[1400px] mx-auto w-full flex flex-col h-full min-h-0">
        {/* Header: back + Interactions title */}
        <div className="flex items-center gap-[12px] mb-[14px] md:mb-[16px]">
          <Link
            href="/studio"
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </Link>
          <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[32px] leading-[1.15]">
            Interactions
          </h1>
        </div>

        {/* Received / Sent pill toggle */}
        <div className="flex items-center gap-[8px] md:gap-[10px] mb-[12px] md:mb-[16px]">
          <TabPill
            label="Received"
            active={activeTab === "received"}
            onClick={() => setActiveTab("received")}
          />
          <TabPill
            label="Sent"
            active={activeTab === "sent"}
            onClick={() => setActiveTab("sent")}
          />
        </div>

        {/* List */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[40px] scrollbar-hide"
        >
          {error ? (
            <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
              {error}
            </p>
          ) : threads.length === 0 && loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-[32px] xl:gap-x-[56px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <StoryRowSkeleton key={i} />
              ))}
            </div>
          ) : threads.length === 0 && !loading ? (
            <p className="font-montserrat text-[#2c2c2c]/60 text-[14px] mt-[8px]">
              {activeTab === "received"
                ? "No prompts received yet."
                : "You haven't sent any prompts yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-[32px] xl:gap-x-[56px]">
              {threads.map((t) => (
                <StoryRow key={t._id} thread={t} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-[1px]" />
          {loading && threads.length > 0 && (
            <div className="flex justify-center mt-[16px]">
              <div className="w-[20px] h-[20px] border-[2px] border-[#2c2c2c]/20 border-t-[#2c2c2c] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer px-[20px] md:px-[22px] py-[8px] md:py-[10px] rounded-full font-montserrat font-medium text-[14px] whitespace-nowrap transition-colors ${
        active
          ? "bg-primary-orange text-white"
          : "bg-[#E6E3D9] text-[#232323] hover:bg-[#dcd8ca]"
      }`}
    >
      {label}
    </button>
  );
}

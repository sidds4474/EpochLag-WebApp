"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { shareUserCard } from "../../../../lib/create/api";
import { fetchInspirationFeed, seedUserCard } from "../../../../lib/home/api";
import type { UserCard } from "../../../../types/home";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../icons";
import ShareModal from "../new-story/ShareModal";
import InspirationCard from "./InspirationCard";

export default function InspirationPage() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [shareCard, setShareCard] = useState<UserCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { cards: fetched } = await fetchInspirationFeed(1, 30);
        if (cancelled) return;
        const unique = Array.from(
          new Map(fetched.map((c) => [c._id, c])).values()
        );
        setCards(unique);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Couldn't load inspiration cards.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tag chips derived from the loaded feed — mobile filter row. Deduped and
  // lower-cased for match, but rendered with capitalize.
  const tags = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of cards) {
      for (const t of c.tags ?? []) {
        const norm = t.trim().toLowerCase();
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          out.push(norm);
        }
      }
    }
    return out.slice(0, 12);
  }, [cards]);

  const visibleCards = useMemo(() => {
    if (!activeTag) return cards;
    return cards.filter((c) =>
      (c.tags ?? []).some((t) => t.trim().toLowerCase() === activeTag)
    );
  }, [cards, activeTag]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    // Card width + gap-[24px]; fall back to a reasonable step if the ref
    // isn't wired yet (unlikely but keeps this null-safe).
    const step = first ? first.offsetWidth + 24 : 347;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || visibleCards.length === 0) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    const step = first ? first.offsetWidth + 24 : 347;
    const index = Math.round(el.scrollLeft / step);
    setActiveIndex(Math.min(Math.max(index, 0), visibleCards.length - 1));
  };

  const handleAnswer = (card: UserCard) => {
    seedUserCard(card);
    router.push(`/new-lag?promptId=${encodeURIComponent(card._id)}`);
  };

  const handleWriteOwn = () => {
    router.push("/new-story?mode=tell");
  };

  const handleShareSend = async (
    userIds: string[],
    sendSeparately: boolean,
    note: string,
    _isPrivate: boolean,
    groupIds: string[]
  ) => {
    if (!shareCard) return;
    try {
      await shareUserCard(shareCard._id, {
        shareWith: userIds,
        groupIds,
        sendSeparately,
        note,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not share. Please try again.";
      toast.error(message);
      throw new Error(message);
    }
  };

  const showControls = !loading && !error && visibleCards.length > 0;

  return (
    <div className="h-full flex flex-col min-h-0 px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] pb-[24px] overflow-hidden">
      {/* Header row: title left, "Write my own question" right on md+. On
          mobile the button lives at the bottom of the scroll area instead. */}
      <div className="flex items-center justify-between gap-[16px] mb-[16px] md:mb-[24px]">
        <h1 className="font-montserrat font-bold text-primary-blue text-[24px] md:text-[28px] lg:text-[32px] leading-tight">
          Inspiration
        </h1>
        <button
          type="button"
          onClick={handleWriteOwn}
          className="hidden md:inline-flex cursor-pointer items-center gap-[10px] bg-primary-orange text-white rounded-full px-[16px] py-[12px] font-montserrat font-medium text-[16px] leading-[20px] hover:brightness-95 transition-[filter]"
        >
          <PlusIcon width={18} height={18} strokeWidth={2.5} />
          Write my own question
        </button>
      </div>

      {/* Tag filter row — mobile + tablet only. Desktop (lg+) uses the carousel
          nav directly with no filter chips per design. */}
      {tags.length > 0 && (
        <div className="lg:hidden mb-[16px] -mx-[16px] md:-mx-0 overflow-x-auto scrollbar-hide">
          <ul className="flex gap-[6px] px-[16px] md:px-0">
            <li>
              <TagChip
                label="All"
                active={activeTag === null}
                onClick={() => setActiveTag(null)}
              />
            </li>
            {tags.map((t) => (
              <li key={t}>
                <TagChip
                  label={t}
                  active={activeTag === t}
                  onClick={() => setActiveTag(t)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Carousel row */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 -mx-[16px] md:-mx-[24px] lg:-mx-[40px] px-[16px] md:px-[24px] lg:px-[40px] py-[8px] overflow-x-auto overflow-y-hidden scrollbar-hide"
      >
        {loading ? (
          <ul className="flex gap-[24px] items-start h-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="shrink-0 w-[323px] lg:w-[280px] h-[554px] lg:h-[420px] max-h-full"
              >
                <SkeletonCard delayMs={i * 120} />
              </li>
            ))}
          </ul>
        ) : error ? (
          <p className="font-montserrat text-primary-blue/60 text-[14px]">
            {error}
          </p>
        ) : visibleCards.length === 0 ? (
          <p className="font-montserrat text-primary-blue/50 text-[14px]">
            No inspiration cards for this filter.
          </p>
        ) : (
          <ul className="flex gap-[24px] items-start h-full">
            {visibleCards.map((card) => (
              <li
                key={card._id}
                data-card
                className="shrink-0 w-[323px] lg:w-[280px] h-[554px] lg:h-[420px] max-h-full transition-transform duration-200 lg:hover:-translate-y-[6px]"
              >
                <InspirationCard
                  card={card}
                  onAnswer={() => handleAnswer(card)}
                  onShare={() => setShareCard(card)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop controls: chevron-left, dots, chevron-right. Hidden on mobile
          where users swipe the row instead. */}
      {showControls && (
        <div className="hidden md:flex mt-[16px] items-center justify-center gap-[16px]">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByCard(-1)}
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-black/[0.06] text-primary-blue flex items-center justify-center hover:bg-black/[0.1] transition-colors"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <div className="flex items-center gap-[6px]">
            {visibleCards.map((card, i) => (
              <span
                key={card._id}
                className={`h-[10px] w-[10px] rounded-full transition-colors ${
                  i === activeIndex ? "bg-primary-orange" : "bg-black/[0.15]"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByCard(1)}
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-primary-orange text-white flex items-center justify-center hover:brightness-95 transition-[filter]"
          >
            <ChevronRightIcon width={16} height={16} />
          </button>
        </div>
      )}

      {/* Mobile: full-width Write-my-own button pinned below the carousel. */}
      <div className="md:hidden mt-[16px]">
        <button
          type="button"
          onClick={handleWriteOwn}
          className="w-full cursor-pointer inline-flex items-center justify-center gap-[10px] bg-primary-orange text-white rounded-full px-[16px] py-[12px] font-montserrat font-medium text-[16px] leading-[20px] hover:brightness-95 transition-[filter]"
        >
          <PlusIcon width={18} height={18} strokeWidth={2.5} />
          Write my own question
        </button>
      </div>

      <ShareModal
        open={shareCard !== null}
        title="Send this prompt"
        shareContext="prompt"
        showMessageInput
        cardData={shareCard}
        onClose={() => setShareCard(null)}
        onSend={handleShareSend}
      />
    </div>
  );
}

// Shimmer skeleton that mirrors the real InspirationCard silhouette (image
// block, tag pill, save/share icons on the right, caption strip). Staggered
// entry via `delayMs` so the row feels alive rather than a flat wall.
function SkeletonCard({ delayMs = 0 }: { delayMs?: number }) {
  return (
    <div
      className="w-full h-full bg-white rounded-[32px] shadow-[0_0_13.4px_rgba(0,0,0,0.15)] pt-[12px] px-[12px] pb-[24px] flex flex-col gap-[20px] opacity-0 animate-[skeleton-in_320ms_ease-out_forwards]"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="relative flex-1 min-h-0 rounded-t-[24px] overflow-hidden bg-primary-blue/[0.06]">
        <div className="absolute inset-0 animate-[skeleton-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent bg-[length:200%_100%]" />
        <div className="relative flex items-start justify-between pt-[16px] pl-[16px] pr-[12px]">
          <span className="h-[26px] w-[88px] rounded-full bg-white/80" />
          <div className="flex flex-col items-center gap-[12px]">
            <span className="w-[36px] h-[36px] rounded-full bg-white/80" />
            <span className="w-[36px] h-[36px] rounded-full bg-white/80" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-[6px] px-[8px]">
        <div className="h-[12px] w-[80%] rounded-full bg-primary-blue/[0.08]" />
        <div className="h-[12px] w-[60%] rounded-full bg-primary-blue/[0.08]" />
      </div>
    </div>
  );
}

function TagChip({
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
      className={`cursor-pointer whitespace-nowrap rounded-full border-[1.5px] px-[12px] py-[4px] font-montserrat font-medium text-[16px] leading-[20px] capitalize transition-colors ${
        active
          ? "bg-primary-blue border-primary-blue text-white"
          : "bg-transparent border-primary-blue text-primary-blue hover:bg-primary-blue/[0.04]"
      }`}
    >
      {label}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { shareUserCard } from "../../../../lib/create/api";
import { fetchInspirationFeed, seedUserCard } from "../../../../lib/home/api";
import type { UserCard } from "../../../../types/home";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../icons";
import SendToDrawer from "../../../../components/share/SendToDrawer";
import PromptPreviewCard from "../../../../components/share/PromptPreviewCard";
import InspirationCard from "./InspirationCard";

export default function InspirationPage() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // True while we're mid-way through an arrow-triggered smooth scroll. Blocks
  // handleScroll from clobbering our eager activeIndex with whichever card is
  // momentarily closest to center during the animation.
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  // Debounce timer for detecting when a manual scroll has settled — on rest
  // we soft-snap the closest card back to true center.
  const settleTimerRef = useRef<number | null>(null);
  // rAF handle for the scroll-driven scale updater. Coalesces scroll events
  // to at most one paint frame.
  const rafRef = useRef<number | null>(null);
  // Ref to the <ul>. We set paddingInlineEnd via JS so the scroller has
  // enough trailing scrollable width to center the final card. Padding on
  // the ul itself is included in ul.offsetWidth (unlike marginInlineEnd on
  // the last flex child, which Chrome silently drops from scrollWidth).
  const cardListRef = useRef<HTMLUListElement | null>(null);
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

  // Give the card list enough trailing padding that the last card can
  // scroll to true viewport center. Sized from JS + re-synced on resize.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || loading) return;
    const sync = () => {
      const ul = cardListRef.current;
      if (!ul || !el) return;
      const card = el.querySelector<HTMLElement>("[data-card]");
      if (!card) return;
      const gutter = Math.max(0, (el.clientWidth - card.offsetWidth) / 2);
      ul.style.paddingInlineEnd = `${gutter}px`;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading, cards, activeTag]);

  // Scroll-driven scale/opacity: on every scroll frame, interpolate each
  // card's transform based on its distance from the viewport center. Cards
  // continuously grow as they approach center and shrink as they leave, so
  // the magnify effect tracks scroll velocity 1:1 instead of firing as a
  // separate 250ms CSS transition after activeIndex updates.
  const MIN_SCALE = 0.82;
  const MIN_OPACITY = 0.55;
  const updateCardTransforms = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-card]");
    if (cards.length === 0) return;
    const scrollerRect = el.getBoundingClientRect();
    const viewportCenter = scrollerRect.left + el.clientWidth / 2;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const wrapper = card.firstElementChild as HTMLElement | null;
      if (!wrapper) continue;
      const r = card.getBoundingClientRect();
      const cardCenter = r.left + r.width / 2;
      // Falloff = one card + gap; beyond that, card is fully minimized.
      const falloff = card.offsetWidth + 24;
      const t = Math.min(1, Math.abs(cardCenter - viewportCenter) / falloff);
      const scale = 1 - t * (1 - MIN_SCALE);
      const opacity = 1 - t * (1 - MIN_OPACITY);
      wrapper.style.transform = `scale(${scale})`;
      wrapper.style.opacity = `${opacity}`;
    }
  }, []);

  // Scroll listener that schedules updateCardTransforms via rAF. Also runs
  // once on mount / when cards change so the initial paint has the right
  // scale without waiting for the first scroll event.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateCardTransforms();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // Initial paint after cards render.
    updateCardTransforms();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [updateCardTransforms, cards, loading, activeTag]);

  // Live active-index tracking: observe cards against a narrow center band of
  // the scroller. A card entering the band becomes active; leaving does
  // nothing (the next entrant takes over). Naturally hysteretic, so no
  // ping-pong flicker at the midpoint between two cards.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || loading || cards.length === 0) return;
    const cardEls = el.querySelectorAll<HTMLElement>("[data-card]");
    if (cardEls.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number(
            (entry.target as HTMLElement).dataset.cardIndex ?? "-1"
          );
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      {
        root: el,
        // Narrow 10% center band — a card must actually occupy the middle
        // slice of the viewport to be considered active.
        rootMargin: "0px -45% 0px -45%",
        threshold: 0,
      }
    );
    cardEls.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [cards, loading, activeTag]);

  const visibleCards = useMemo(() => {
    if (!activeTag) return cards;
    return cards.filter((c) =>
      (c.tags ?? []).some((t) => t.trim().toLowerCase() === activeTag)
    );
  }, [cards, activeTag]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-card]");
    if (cards.length === 0) return;
    // Navigate by target index rather than a relative delta. Relative scrollBy
    // fights `snap-mandatory` when the current scrollLeft isn't exactly on a
    // snap point — the browser snaps back and the click feels like a no-op.
    const targetIdx = Math.min(
      cards.length - 1,
      Math.max(0, activeIndex + direction)
    );
    const target = cards[targetIdx];
    // offsetLeft is relative to the <ul> (target's offsetParent), which skips
    // the scroller's own padding. Use bounding rects instead so the math is
    // padding-agnostic and always centers correctly.
    const scrollerRect = el.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const delta =
      targetRect.left -
      scrollerRect.left -
      (el.clientWidth - target.offsetWidth) / 2;
    const left = el.scrollLeft + delta;
    setActiveIndex(targetIdx);
    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current !== null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    // Release the lock after the smooth scroll should have settled. Manual
    // swipes past this window fall back to handleScroll's center detection.
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 500);
    el.scrollTo({ left, behavior: "smooth" });
  };

  // Center a specific card via the same rect-based math used by scrollByCard.
  // Used both by the arrow buttons and the scroll-settle soft-snap.
  const centerCard = (targetIdx: number, behavior: ScrollBehavior) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLElement>("[data-card]");
    const target = cards[targetIdx];
    if (!target) return;
    const scrollerRect = el.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const delta =
      targetRect.left -
      scrollerRect.left -
      (el.clientWidth - target.offsetWidth) / 2;
    // Skip tiny corrections — under 1px is imperceptible and would fight the
    // browser's snap engine.
    if (Math.abs(delta) < 1) return;
    el.scrollTo({ left: el.scrollLeft + delta, behavior });
  };

  // Debounced scroll-settle: after the user stops scrolling for ~140ms, snap
  // the closest card back to true center. Handles trackpad drags that land
  // between snap points and keeps activeIndex in sync with rest state.
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || visibleCards.length === 0) return;
    if (programmaticScrollRef.current) return;
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(() => {
      const cards = Array.from(
        el.querySelectorAll<HTMLElement>("[data-card]")
      );
      if (cards.length === 0) return;
      const scrollerRect = el.getBoundingClientRect();
      const viewportCenter = scrollerRect.left + el.clientWidth / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      setActiveIndex(bestIdx);
      centerCard(bestIdx, "smooth");
    }, 140);
  };

  const handleAnswer = (card: UserCard) => {
    seedUserCard(card);
    router.push(`/new-lag?promptId=${encodeURIComponent(card._id)}`);
  };

  const handleWriteOwn = () => {
    router.push("/new-ask");
  };

  const handleShareSend = async (
    userIds: string[],
    groupIds: string[],
    note: string
  ) => {
    if (!shareCard) return;
    try {
      await shareUserCard(shareCard._id, {
        shareWith: userIds,
        groupIds,
        // sendSeparately dropped in v1 — see share drawer migration notes.
        sendSeparately: false,
        note,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not share. Please try again.";
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

      {/* Carousel row — center-snap so the visually-centered card is the
          "featured" one. paddingInline = half the leftover width so the
          first and last cards can snap into viewport center. Different
          card widths per breakpoint (323px < lg, 280px lg+). */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 -mx-[16px] md:-mx-[24px] lg:-mx-[40px] py-[8px] overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory scroll-smooth px-[calc((100%-323px)/2)] lg:px-[calc((100%-280px)/2)]"
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
          <ul ref={cardListRef} className="flex gap-[24px] items-center h-full min-w-max">
            {visibleCards.map((card, i) => {
              return (
                <li
                  key={card._id}
                  data-card
                  data-card-index={i}
                  className="shrink-0 snap-center w-[323px] lg:w-[280px] h-[554px] lg:h-[420px] max-h-full"
                >
                  {/* Scale/opacity are driven per-frame by the scroll
                      listener above (updateCardTransforms) — no CSS
                      transition here so the scale tracks scroll velocity
                      exactly instead of running its own timeline. */}
                  <div
                    className="w-full h-full origin-center will-change-transform"
                  >
                    <InspirationCard
                      card={card}
                      onAnswer={() => handleAnswer(card)}
                      onShare={() => setShareCard(card)}
                    />
                  </div>
                </li>
              );
            })}
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

      <SendToDrawer
        open={shareCard !== null}
        onClose={() => setShareCard(null)}
        onSend={handleShareSend}
        shareContext="prompt"
        showMessageInput
        shareTarget={shareCard ? { kind: "prompt", id: shareCard._id } : undefined}
        previewContent={shareCard ? <PromptPreviewCard card={shareCard} /> : undefined}
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { createUserCard, shareUserCard } from "../../../../lib/create/api";
import { fetchInspirationFeed, seedUserCard } from "../../../../lib/home/api";
import type { UserCard } from "../../../../types/home";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../icons";
import SendToDrawer from "../../../../components/share/SendToDrawer";
import PromptPreviewCard from "../../../../components/share/PromptPreviewCard";
import PromptTile from "./PromptTile";

export default function InspirationPage() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const cardListRef = useRef<HTMLUListElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [shareCard, setShareCard] = useState<UserCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { cards: fetched } = await fetchInspirationFeed(1, 30);
        if (cancelled) return;
        const unique = Array.from(
          new Map(fetched.map((c) => [c._id, c])).values(),
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
    return out;
  }, [cards]);

  const visibleCards = useMemo(() => {
    if (selectedTags.size === 0) return cards;
    return cards.filter((c) =>
      (c.tags ?? []).some((t) => selectedTags.has(t.trim().toLowerCase())),
    );
  }, [cards, selectedTags]);

  // Reset active index when the filtered pool changes so we never point past
  // the end of the shortened array.
  useEffect(() => {
    setActiveIndex(0);
  }, [selectedTags]);

  // Carousel side gutters: half the leftover width so first/last cards snap
  // to center.
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
  }, [loading, visibleCards]);

  // Live active-index tracking — a card is "active" when it occupies the
  // center 10% band of the scroller viewport.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || loading || visibleCards.length === 0) return;
    const cardEls = el.querySelectorAll<HTMLElement>("[data-card]");
    if (cardEls.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) return;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number(
            (entry.target as HTMLElement).dataset.cardIndex ?? "-1",
          );
          if (idx >= 0) setActiveIndex(idx);
        }
      },
      {
        root: el,
        rootMargin: "0px -45% 0px -45%",
        threshold: 0,
      },
    );
    cardEls.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [visibleCards, loading]);

  const centerCard = useCallback(
    (targetIdx: number, behavior: ScrollBehavior) => {
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
      if (Math.abs(delta) < 1) return;
      el.scrollTo({ left: el.scrollLeft + delta, behavior });
    },
    [],
  );

  const step = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const targetIdx = Math.min(
      visibleCards.length - 1,
      Math.max(0, activeIndex + direction),
    );
    if (targetIdx === activeIndex) return;
    setActiveIndex(targetIdx);
    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current !== null) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 500);
    centerCard(targetIdx, "smooth");
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || visibleCards.length === 0) return;
    if (programmaticScrollRef.current) return;
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(() => {
      const cards = Array.from(
        el.querySelectorAll<HTMLElement>("[data-card]"),
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

  const handleAnswer = () => {
    const card = visibleCards[activeIndex];
    if (!card) return;
    seedUserCard(card);
    router.push(`/new-lag?promptId=${encodeURIComponent(card._id)}`);
  };

  const handleSendIt = () => {
    const card = visibleCards[activeIndex];
    if (!card) return;
    setShareCard(card);
  };

  const handleWriteOwn = () => {
    router.push("/new-ask");
  };

  const handleShareSend = async (
    userIds: string[],
    groupIds: string[],
    note: string,
  ) => {
    if (!shareCard) return;
    try {
      let cardId = shareCard._id;
      if (shareCard.isGenerated) {
        const minted = await createUserCard({
          content: shareCard.content ?? "",
          type: "WHITE",
          imageUrl: shareCard.imageUrl ?? undefined,
        });
        cardId = minted._id;
      }
      await shareUserCard(cardId, {
        shareWith: userIds,
        groupIds,
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

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearTags = () => setSelectedTags(new Set());

  void toast; // kept for future error toasts

  return (
    <div className="min-h-full bg-[#F3F1EB] px-[20px] md:px-[32px] pt-[20px] md:pt-[24px] pb-[40px] flex flex-col overflow-hidden">
      <div className="max-w-[1120px] w-full mx-auto flex flex-col flex-1 min-h-0">
        <div className="flex items-start justify-between gap-[16px] mb-[20px] md:mb-[28px]">
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              onClick={() => router.push("/home")}
              aria-label="Back to home"
              className="cursor-pointer w-[28px] h-[28px] text-[#232323] flex items-center justify-center hover:opacity-70 transition-opacity"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <h1 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[32px] leading-[1.15]">
              Inspiration
            </h1>
          </div>

          <CategoriesControl
            tags={tags}
            selected={selectedTags}
            open={categoriesOpen}
            onToggleOpen={() => setCategoriesOpen((v) => !v)}
            onClose={() => setCategoriesOpen(false)}
            onToggleTag={toggleTag}
            onClear={clearTags}
          />
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-[780px] h-[280px] md:h-[320px] bg-[#E8E6DF] rounded-[16px] animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-montserrat text-[#2c2c2c]/60 text-[14px]">
                {error}
              </p>
            </div>
          ) : visibleCards.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-montserrat text-[#2c2c2c]/60 text-[14px]">
                No prompts for these categories.
              </p>
            </div>
          ) : (
            <div className="relative flex-1 min-h-0 flex items-center">
              {/* Desktop chevrons */}
              <button
                type="button"
                aria-label="Previous"
                onClick={() => step(-1)}
                disabled={activeIndex === 0}
                className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-[36px] h-[36px] items-center justify-center text-[#232323] transition-opacity ${
                  activeIndex === 0 ? "opacity-30 cursor-not-allowed" : "opacity-100 cursor-pointer hover:opacity-70"
                }`}
              >
                <ChevronLeftIcon width={18} height={18} />
              </button>

              <div
                ref={scrollerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 max-h-full overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory scroll-smooth px-[calc((100%-280px)/2)] md:px-[calc((100%-260px)/2)] py-[8px]"
              >
                <ul
                  ref={cardListRef}
                  className="flex gap-[24px] items-center h-full min-w-max"
                >
                  {visibleCards.map((card, i) => (
                    <li
                      key={card._id}
                      data-card
                      data-card-index={i}
                      className={`shrink-0 snap-center transition-transform duration-200 ${
                        i === activeIndex
                          ? "scale-100"
                          : "scale-[0.92] opacity-70"
                      }`}
                    >
                      <div className="w-[280px] h-[300px] md:w-[260px] md:h-[280px]">
                        <PromptTile card={card} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                aria-label="Next"
                onClick={() => step(1)}
                disabled={activeIndex >= visibleCards.length - 1}
                className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-[36px] h-[36px] items-center justify-center text-[#232323] transition-opacity ${
                  activeIndex >= visibleCards.length - 1
                    ? "opacity-30 cursor-not-allowed"
                    : "opacity-100 cursor-pointer hover:opacity-70"
                }`}
              >
                <ChevronRightIcon width={18} height={18} />
              </button>
            </div>
          )}

          {!loading && !error && visibleCards.length > 1 && (
            <div className="mt-[12px] md:mt-[20px] flex items-center justify-center gap-[6px]">
              {visibleCards.slice(0, 7).map((_, i) => {
                const isActive = i === activeIndex;
                return (
                  <span
                    key={i}
                    className={`rounded-full transition-all ${
                      isActive
                        ? "w-[18px] h-[6px] bg-primary-orange"
                        : "w-[6px] h-[6px] bg-[#C9C9C9]"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {!loading && !error && visibleCards.length > 0 && (
          <div className="mt-[24px] flex flex-col items-center gap-[10px]">
            <button
              type="button"
              onClick={handleAnswer}
              className="cursor-pointer w-full max-w-[380px] h-[46px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[15px] flex items-center justify-center gap-[8px] hover:opacity-90 transition-opacity"
            >
              <MicIcon />
              Answer it
            </button>
            <button
              type="button"
              onClick={handleSendIt}
              className="cursor-pointer w-full max-w-[380px] h-[46px] rounded-full border-[1.5px] border-[#2c2c2c] text-[#232323] font-montserrat font-medium text-[15px] flex items-center justify-center gap-[8px] hover:bg-black/[0.03] transition-colors"
            >
              <PaperPlaneIcon />
              Send it
            </button>
            <button
              type="button"
              onClick={handleWriteOwn}
              className="cursor-pointer inline-flex items-center gap-[8px] mt-[4px] text-[#232323] font-montserrat text-[14px] hover:text-primary-orange transition-colors"
            >
              <PencilIcon />
              Write my own question
            </button>
          </div>
        )}
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

function CategoriesControl({
  tags,
  selected,
  open,
  onToggleOpen,
  onClose,
  onToggleTag,
}: {
  tags: string[];
  selected: Set<string>;
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}) {
  const count = selected.size;

  return (
    <>
      <button
        type="button"
        onClick={onToggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="cursor-pointer inline-flex items-center gap-[10px] bg-white rounded-full pl-[14px] pr-[6px] py-[6px] font-montserrat text-[#232323] text-[13px] md:text-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
      >
        <FilterIcon />
        <span className="hidden sm:inline">Categories</span>
        <span
          className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[12px] font-semibold transition-colors ${
            count > 0
              ? "bg-primary-orange text-white"
              : "bg-[#EDEDED] text-[#232323]/60"
          }`}
        >
          {count}
        </span>
      </button>

      <CategoriesSheet
        open={open}
        tags={tags}
        selected={selected}
        onClose={onClose}
        onToggleTag={onToggleTag}
      />
    </>
  );
}

function CategoriesSheet({
  open,
  tags,
  selected,
  onClose,
  onToggleTag,
}: {
  open: boolean;
  tags: string[];
  selected: Set<string>;
  onClose: () => void;
  onToggleTag: (tag: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Dim the main content behind the sheet */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Categories"
        className="absolute right-0 top-0 h-full w-full sm:max-w-[380px] bg-[#F3F1EB] flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center justify-between gap-[16px] px-[24px] pt-[24px] pb-[16px]">
          <h2 className="font-ivy font-normal text-[#232323] text-[22px] leading-[1.15]">
            Categories ({tags.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#EDEDED] text-[#232323] flex items-center justify-center hover:brightness-95 transition"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <line x1={18} y1={6} x2={6} y2={18} />
              <line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[24px]">
          {tags.length === 0 ? (
            <p className="font-montserrat text-[#2c2c2c]/60 text-[13px] py-[12px]">
              No categories available
            </p>
          ) : (
            <div className="flex flex-wrap gap-[8px]">
              {tags.map((t) => {
                const checked = selected.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onToggleTag(t)}
                    className={`cursor-pointer h-[34px] px-[16px] rounded-full font-montserrat text-[13px] md:text-[14px] capitalize transition-colors ${
                      checked
                        ? "bg-[#1C1C1C] text-white"
                        : "bg-transparent border border-[#2c2c2c]/50 text-[#232323] hover:bg-black/[0.03]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1={4} y1={6} x2={20} y2={6} />
      <line x1={7} y1={12} x2={17} y2={12} />
      <line x1={10} y1={18} x2={14} y2={18} />
    </svg>
  );
}

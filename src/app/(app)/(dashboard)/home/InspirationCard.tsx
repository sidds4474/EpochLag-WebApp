"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  fetchInspirationFeed,
} from "../../../../lib/home/api";
import type { UserCard } from "../../../../types/home";

// Inspiration section — wired to the shared /api/user-card/feed?inspoOnly=true
// endpoint. Desktop renders one centered card with chevron paging through the
// fetched list; mobile renders a horizontal peek-strip with scroll-snap and
// dot pagination. 6-second auto-advance on desktop, paused when the pointer
// is over the card. In-memory cache with 5-minute TTL so remounts are instant.

const PAGE_LIMIT = 10;
const FRESHNESS_MS = 5 * 60_000;

// Card colors + text per the designer spec.
const DARKER_SAND = "#E6E3D9";
const BORDER_COLOR = "rgba(0, 0, 0, 0.30)";
const TEXT_COLOR = "#2E2E2E";

// Backend sends a card.icon URL AND a card.imageUrl. The category NAME is
// derived from the filename slug — BE doesn't send it directly. Priority:
//   1. icon_<slug>.png on card.icon
//   2. category_<slug>_<n>.png on card.imageUrl
//   3. generic <slug>_<hash>.png on card.imageUrl
// Labels are title-cased, split on "-". Overrides table for edge cases.
const URL_SLUG_RE = /icon_([a-z0-9_-]+)\.(png|jpg|jpeg|webp)/i;
const CATEGORY_IMAGE_URL_SLUG_RE =
  /\/category_([a-z0-9_-]+)_\d+\.(png|jpg|jpeg|webp)/i;
const IMAGE_URL_SLUG_RE =
  /\/([a-z0-9_-]+)_[a-f0-9]+\.(png|jpg|jpeg|webp)/i;

const LABEL_OVERRIDES: Record<string, string> = {
  "life-update": "Life Update",
};

function normaliseSlug(raw?: string | null): string | null {
  if (!raw) return null;
  return raw.toLowerCase().replace(/_/g, "-").trim();
}

function slugFromIconUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(URL_SLUG_RE);
  return normaliseSlug(m?.[1]);
}

function slugFromImageUrl(url?: string | null): string | null {
  if (!url) return null;
  const cat = url.match(CATEGORY_IMAGE_URL_SLUG_RE);
  if (cat) return normaliseSlug(cat[1]);
  const generic = url.match(IMAGE_URL_SLUG_RE);
  return normaliseSlug(generic?.[1]);
}

function labelFromSlug(slug: string | null): string {
  if (!slug) return "";
  if (LABEL_OVERRIDES[slug]) return LABEL_OVERRIDES[slug];
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function iconUrlFromImageUrl(
  imageUrl: string | null | undefined,
  slug: string | null,
): string | null {
  if (!imageUrl || !slug) return null;
  const lastSlash = imageUrl.lastIndexOf("/");
  if (lastSlash < 0) return null;
  const prefix = imageUrl.slice(0, lastSlash + 1);
  return `${prefix}icon_${slug}.png`;
}

type IconInfo = { uri: string | null; label: string };

function resolveInspoIcon(card: UserCard): IconInfo {
  // next/font / TS doesn't know about the optional `icon` field — fall back
  // to a looser lookup here.
  const asRecord = card as unknown as Record<string, unknown>;
  const beIcon = typeof asRecord.icon === "string" ? asRecord.icon : null;
  const slug = slugFromIconUrl(beIcon) || slugFromImageUrl(card.imageUrl);
  const uri = beIcon || iconUrlFromImageUrl(card.imageUrl, slug);
  return { uri, label: labelFromSlug(slug) || "Inspiration" };
}

function titleOf(c: UserCard): string {
  return (c.title?.trim() || c.content?.trim() || "").trim();
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#2C2C2C" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-[14px] h-[14px]" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]" aria-hidden="true">
      <rect x="8" y="2" width="4" height="10" rx="2" />
      <path d="M5 9v1a5 5 0 0 0 10 0V9M10 15v3" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]" aria-hidden="true">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

// Fallback glyph when a card has no resolvable icon URL (keeps the layout
// consistent instead of leaving the cell empty).
function PlaceholderIcon({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <path d="M3 20l5-9 4 6 4-4 5 7z" />
    </svg>
  );
}

let cachedCards: UserCard[] | null = null;
let loadedAt = 0;

// Mobile peek-card — compact mode per the mobile spec. Uses the derived icon
// + category label, 3-cell header (icon · label · [reserved for bookmark]),
// DM Mono label, Lora italic question hugging the bottom. Card tilts ±0.655°
// per index for the hand-placed polaroid feel. SQUARE corners by design.
function MobileCard({ c, index }: { c: UserCard; index: number }) {
  const { uri, label } = resolveInspoIcon(c);
  const tiltDeg = index % 2 === 0 ? -0.655 : 0.655;
  return (
    <Link
      href={`/inspiration?initialPromptId=${encodeURIComponent(c._id)}`}
      className="block aspect-square shadow-[0_4px_4.8px_rgba(0,0,0,0.25)]"
      style={{
        backgroundColor: DARKER_SAND,
        padding: 6,
        transform: `rotate(${tiltDeg}deg)`,
      }}
      aria-label={`Open prompt: ${titleOf(c)}`}
    >
      <div
        className="flex flex-col h-full"
        style={{
          backgroundColor: DARKER_SAND,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: "38px minmax(0,1fr) 38px",
            height: 32,
            borderBottom: `1px solid ${BORDER_COLOR}`,
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{ borderRight: `1px solid ${BORDER_COLOR}` }}
          >
            {uri ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={uri}
                alt=""
                className="object-contain select-none"
                style={{ width: 20, height: 20 }}
                loading="lazy"
              />
            ) : (
              <span
                className="flex items-center justify-center bg-black rounded-[3px]"
                style={{ width: 20, height: 20 }}
              >
                <PlaceholderIcon size={12} />
              </span>
            )}
          </div>
          <div className="flex items-center" style={{ paddingLeft: 10 }}>
            <span
              className="text-[11px] leading-none capitalize"
              style={{
                fontFamily:
                  "var(--font-dm-mono), ui-monospace, monospace",
                color: TEXT_COLOR,
                letterSpacing: "0.2px",
              }}
            >
              {label}
            </span>
          </div>
          <div aria-hidden="true" />
        </div>
        <div
          className="flex-1 flex items-end"
          style={{ padding: "0 10px 10px 10px" }}
        >
          <p
            className="font-ivy font-normal text-[14px] leading-[19px] line-clamp-5"
            style={{ color: TEXT_COLOR }}
          >
            {titleOf(c)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function InspirationCard() {
  const [cards, setCards] = useState<UserCard[] | null>(cachedCards);
  const [loading, setLoading] = useState(cachedCards === null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const fresh = Date.now() - loadedAt < FRESHNESS_MS;
    if (cachedCards !== null && fresh) {
      setCards(cachedCards);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    fetchInspirationFeed(1, PAGE_LIMIT)
      .then(({ cards: list }) => {
        cachedCards = list;
        loadedAt = Date.now();
        setCards(list);
      })
      .catch(() => {
        setCards([]);
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
      });
  }, []);

  const items = useMemo(() => (cards ?? []).slice(0, PAGE_LIMIT), [cards]);
  const total = items.length;

  // 6-second auto-advance, paused on hover / when tab is hidden.
  useEffect(() => {
    if (total < 2 || paused) return;
    const id = window.setInterval(() => {
      setIdx((p) => (p + 1) % total);
    }, 6000);
    return () => window.clearInterval(id);
  }, [total, paused]);

  const current = items[idx] || null;

  const go = (delta: number) => {
    if (total < 2) return;
    setIdx((prev) => (prev + delta + total) % total);
  };

  return (
    <section aria-labelledby="home-inspiration" className="min-w-0">
      <header className="flex items-end justify-between gap-[12px] pb-[14px] border-b border-black/10">
        <h2
          id="home-inspiration"
          className="font-ivy font-normal text-[#2C2C2C] text-[20px] sm:text-[22px] md:text-[24px] leading-[1.1]"
        >
          <span className="sm:hidden">Find Inspiration</span>
          <span className="hidden sm:inline">Inspiration</span>
        </h2>
        <Link
          href="/inspiration"
          className="font-montserrat text-[#2C2C2C] text-[14px] md:text-[16px] hover:text-primary-orange transition-colors"
        >
          View all
        </Link>
      </header>

      {loading && !current && (
        <div className="mt-[18px] bg-[#E6E3D9] rounded-[18px] h-[220px] animate-pulse" />
      )}

      {!loading && total === 0 && (
        <p className="mt-[24px] font-montserrat text-[#848484] text-[14px]">
          Fresh prompts will show up here soon.
        </p>
      )}

      {/* ---------- Desktop / tablet: single centered card w/ chevrons ---------- */}
      {total > 0 && (
        <div
          className="relative mt-[18px] hidden sm:block"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <Link
            href={`/inspiration?initialPromptId=${encodeURIComponent(current?._id ?? "")}`}
            className="block bg-[#E6E3D9] rounded-[18px] px-[36px] sm:px-[44px] md:px-[56px] py-[32px] md:py-[40px]"
            aria-label={`Open prompt: ${titleOf(current!)}`}
          >
            <div className="flex flex-col items-center text-center">
              <p className="font-ivy font-normal italic text-[#111] text-[16px] sm:text-[18px] md:text-[20px] leading-[1.3] max-w-[300px] line-clamp-3">
                {titleOf(current!)}
              </p>
              <div className="mt-[22px] md:mt-[28px] flex items-center gap-[8px] sm:gap-[10px]">
                <span className="inline-flex items-center gap-[8px] bg-primary-orange text-white rounded-full px-[18px] py-[8px] font-montserrat text-[14px] md:text-[15px]">
                  <MicIcon />
                  Answer it
                </span>
                <span className="inline-flex items-center gap-[8px] text-[#2C2C2C] rounded-full px-[18px] py-[8px] border border-[#092E4A]/80 font-montserrat text-[14px] md:text-[15px]">
                  <SendIcon />
                  Send it
                </span>
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            disabled={total < 2}
            className="absolute left-[12px] md:left-[16px] top-1/2 -translate-y-1/2 w-[28px] h-[28px] rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center hover:bg-black/[0.03] transition-colors disabled:opacity-40"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            disabled={total < 2}
            className="absolute right-[12px] md:right-[16px] top-1/2 -translate-y-1/2 w-[28px] h-[28px] rounded-full bg-white shadow-sm border border-black/5 flex items-center justify-center hover:bg-black/[0.03] transition-colors disabled:opacity-40"
          >
            <ChevronRight />
          </button>

          {total > 1 && (
            <div className="mt-[14px] flex justify-center gap-[6px]">
              {items.slice(0, Math.min(total, 7)).map((_, i) => (
                <span
                  key={i}
                  className={`h-[6px] rounded-full transition-all ${
                    i === idx % Math.min(total, 7)
                      ? "w-[18px] bg-primary-orange"
                      : "w-[6px] bg-black/20"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Mobile: horizontal peek-strip ---------- */}
      {total > 0 && (
        <div className="mt-[18px] sm:hidden -mx-[16px] px-[16px] overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex gap-[12px] py-[6px]">
            {items.map((c, i) => (
              <li
                key={`${c._id}-${i}`}
                className="snap-start shrink-0 w-[50%]"
              >
                <MobileCard c={c} index={i} />
              </li>
            ))}
          </ul>
          {total > 1 && (
            <div className="mt-[14px] flex justify-center gap-[6px]">
              {items.slice(0, Math.min(total, 7)).map((_, i) => (
                <span
                  key={i}
                  className="h-[6px] w-[6px] rounded-full bg-black/20"
                  aria-hidden="true"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

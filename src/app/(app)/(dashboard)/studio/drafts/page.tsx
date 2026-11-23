"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LibraryThread } from "../../../../../lib/library/api";
import { fetchDraftStories } from "../../../../../lib/studio/api";
import { bustUrl } from "../../../../../lib/images";
import { parseContentToBlocks } from "../../../../../lib/parseStoryContent";
import { ChevronLeftIcon } from "../../icons";

const PAGE_SIZE = 10;

export default function StudioDraftsPage() {
  const [drafts, setDrafts] = useState<LibraryThread[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const { drafts: fresh, pagination } = await fetchDraftStories(
        nextPage,
        PAGE_SIZE
      );
      setDrafts((prev) => {
        const seen = new Set(prev.map((t) => t._id));
        return [...prev, ...fresh.filter((t) => !seen.has(t._id))];
      });
      setPage(nextPage);
      const cur = pagination?.pageNumber ?? pagination?.currentPage ?? nextPage;
      const total = pagination?.totalPages ?? 1;
      setHasMore(pagination ? cur < total : fresh.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load drafts");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (page !== 0) return;
    loadPage(1);
  }, [page, loadPage]);

  useEffect(() => {
    if (!hasMore || page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) {
          loadPage(page + 1);
        }
      },
      { root, rootMargin: "300px 0px 300px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, page, loading, loadPage]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#f3f1eb]">
      <div className="px-[12px] md:px-[32px] pt-[16px] max-w-[1400px] mx-auto w-full flex flex-col h-full min-h-0">
        <div className="flex items-center gap-[12px] mb-[16px] md:mb-[20px]">
          <Link
            href="/studio"
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </Link>
          <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[32px] leading-[1.15]">
            Drafts
          </h1>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[40px] scrollbar-hide"
        >
          {error ? (
            <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
              {error}
            </p>
          ) : drafts.length === 0 && loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-[32px] xl:gap-x-[56px]">
              {Array.from({ length: 6 }).map((_, i) => (
                <DraftRowSkeleton key={i} />
              ))}
            </div>
          ) : drafts.length === 0 && !loading ? (
            <p className="font-montserrat text-[#2c2c2c]/60 text-[14px] mt-[8px]">
              No drafts yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-[32px] xl:gap-x-[56px]">
              {drafts.map((d) => (
                <DraftRow key={d._id} draft={d} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-[1px]" />
          {loading && drafts.length > 0 && (
            <div className="flex justify-center mt-[16px]">
              <div className="w-[20px] h-[20px] border-[2px] border-[#2c2c2c]/20 border-t-[#2c2c2c] rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function draftCover(d: LibraryThread): string | null {
  const s = d.latestStory;
  if (s?.content) {
    const blocks = parseContentToBlocks(s.content);
    const firstImage = blocks.find((b) => b.type === "image");
    if (firstImage && "url" in firstImage) return firstImage.url;
  }
  const firstMediaImage = s?.media?.find((m) => m.type === "image" && m.url);
  if (firstMediaImage?.url) return firstMediaImage.url;
  return d.promptCard?.imageUrl ?? null;
}

function draftTitle(d: LibraryThread): string {
  return (
    d.latestStory?.title ||
    d.promptCard?.title ||
    d.promptCard?.content ||
    "Untitled Memory"
  );
}

// "Last edited today / Friday / Jan 12" — relative label for drafts.
function lastEdited(d: LibraryThread): string | null {
  const raw =
    d.latestStory?.updatedAt ||
    d.latestActivity ||
    d.latestStory?.createdAt ||
    null;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfThen = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const daysAgo = Math.round(
    (startOfToday.getTime() - startOfThen.getTime()) / msPerDay
  );

  if (daysAgo <= 0) return "Last edited today";
  if (daysAgo === 1) return "Last edited yesterday";
  if (daysAgo < 7) {
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    return `Last edited ${weekday}`;
  }
  return `Last edited ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

// Rough completion score so the progress bar reads differently across
// drafts even without a BE-provided percentage. Each filled field counts
// for a chunk; cap at 95% so no draft looks "finished" while still being
// a draft.
function draftProgress(d: LibraryThread): number {
  let score = 10;
  if (d.latestStory?.title) score += 25;
  if (d.latestStory?.content && d.latestStory.content.length > 40) score += 35;
  if (draftCover(d)) score += 20;
  if (d.people && d.people.length > 0) score += 10;
  return Math.min(95, score);
}

function DraftRow({ draft }: { draft: LibraryThread }) {
  const cover = draftCover(draft);
  const title = draftTitle(draft);
  const edited = lastEdited(draft);
  const progress = draftProgress(draft);

  return (
    <Link
      href={`/new-lag?draftId=${encodeURIComponent(draft._id)}`}
      className="relative flex items-start gap-[16px] md:gap-[22px] py-[14px] md:py-[18px] border-b border-black/10 last:border-b-0"
    >
      {/* Polaroid */}
      <div className="shrink-0 bg-white p-[7px] md:p-[10px] rounded-[2px] shadow-[0_3px_4px_rgba(0,0,0,0.25)]">
        <div className="relative w-[86px] h-[91px] md:w-[128px] md:h-[135px] overflow-hidden bg-primary-blue/10 flex items-center justify-center">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bustUrl(cover, undefined)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <ImagePlaceholder className="text-primary-blue/30" />
          )}
        </div>
      </div>

      {/* Title + edited + progress */}
      <div className="flex-1 min-w-0 flex flex-col gap-[6px] md:gap-[10px] pt-[4px] md:pt-[10px] pr-[6px]">
        <div className="flex flex-col gap-[2px]">
          <h3 className="font-ivy font-normal text-[15px] md:text-[17px] leading-[1.3] text-[#232323] break-words">
            {title}
          </h3>
          {edited && (
            <p className="font-montserrat text-[#848484] text-[13px] md:text-[14px] leading-[1.35]">
              {edited}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-[6px] md:mt-[14px] h-[6px] rounded-full bg-[#DED9D3] overflow-hidden">
          <div
            className="h-full bg-primary-orange rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function DraftRowSkeleton() {
  return (
    <div className="flex items-start gap-[16px] md:gap-[22px] py-[14px] md:py-[18px] border-b border-black/10 animate-pulse">
      <div className="shrink-0 bg-white p-[7px] md:p-[10px] rounded-[2px] shadow-[0_3px_4px_rgba(0,0,0,0.15)]">
        <div className="w-[86px] h-[91px] md:w-[128px] md:h-[135px] bg-primary-blue/10" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-[8px] pt-[8px] md:pt-[14px]">
        <div className="h-[16px] w-[55%] bg-primary-blue/10 rounded-full" />
        <div className="h-[12px] w-[30%] bg-primary-blue/10 rounded-full" />
        <div className="mt-[6px] h-[6px] w-full bg-primary-blue/10 rounded-full" />
      </div>
    </div>
  );
}

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <svg
      width={38}
      height={38}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M21 15l-5-5-11 11" />
    </svg>
  );
}

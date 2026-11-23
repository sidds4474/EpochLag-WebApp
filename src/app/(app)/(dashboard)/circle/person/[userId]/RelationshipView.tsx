"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "../../../../../../components/Avatar";
import { ChevronLeftIcon, ChevronRightIcon } from "../../../icons";
import type {
  CirclePersonDetail,
  CirclePersonLag,
} from "../../../../../../lib/circle/api";

type Props = {
  person: CirclePersonDetail;
  lags: CirclePersonLag[];
  currentUserFirstName: string;
  onBack: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
};

export default function RelationshipView({
  person,
  lags,
  currentUserFirstName,
  onBack,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  const p = person.person;
  const rel = person.relationship;
  const label = rel?.myLabel?.trim() || "Relationship";
  const heroTitle = `${currentUserFirstName || "You"} + ${p?.firstName ?? "Someone"}`;

  return (
    <div>
      {/* Top header */}
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer w-[32px] h-[32px] rounded-full flex items-center justify-center text-[#2C2C2C] hover:bg-black/[0.04] transition-colors"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <h1 className="font-ivy text-[#2C2C2C] text-[20px] md:text-[24px]">
          Relationship
        </h1>
      </div>

      {/* Hero banner */}
      <HeroBanner
        person={p}
        currentUserFirstName={currentUserFirstName}
        heroTitle={heroTitle}
        label={label}
        coverImageUrl={rel?.coverImageUrl ?? null}
      />

      {/* Highlights + prompt rotator */}
      <div className="mt-[20px] md:mt-[24px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[16px] md:gap-[20px] items-start">
        <HighlightsCard
          relationship={rel}
          totalLags={person.totalLags ?? 0}
        />
        <PromptRotator prompts={person.inspoCards ?? []} />
      </div>

      {/* Shared Lags */}
      <SharedLagsSection
        lags={lags}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
      />
    </div>
  );
}

function HeroBanner({
  person,
  currentUserFirstName,
  heroTitle,
  label,
  coverImageUrl,
}: {
  person: CirclePersonDetail["person"];
  currentUserFirstName: string;
  heroTitle: string;
  label: string;
  coverImageUrl: string | null;
}) {
  return (
    <div className="relative mt-[16px] md:mt-[20px] overflow-hidden rounded-[18px] h-[180px] md:h-[200px]">
      {/* Cover image if present; else fall back to the orange → navy gradient. */}
      {coverImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dim for text legibility */}
          <div className="absolute inset-0 bg-black/30" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #EF9849 0%, #7A5B3C 45%, #2C2C2C 100%)",
          }}
        />
      )}
      <div className="relative h-full flex items-center justify-between gap-[16px] px-[20px] md:px-[28px]">
        <div className="flex items-center gap-[14px] md:gap-[18px] min-w-0">
          <div className="flex items-center shrink-0">
            <span className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full ring-4 ring-white overflow-hidden">
              <Avatar
                user={{
                  firstName: currentUserFirstName || "",
                  profilePicture: null,
                }}
                size={88}
                isSelf
              />
            </span>
            <span className="-ml-[18px] md:-ml-[22px] w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full ring-4 ring-white overflow-hidden">
              <Avatar
                user={{
                  firstName: person.firstName,
                  profilePicture: person.profilePicture,
                  updatedAt: person.updatedAt,
                }}
                size={88}
              />
            </span>
          </div>
          <div className="min-w-0 text-white">
            <p className="font-ivy text-[22px] md:text-[28px] leading-[1.15] truncate">
              {heroTitle}
            </p>
            <p className="mt-[2px] font-montserrat text-white/85 text-[13px] md:text-[14px]">
              {label}
            </p>
          </div>
        </div>

        {/* Edit pencil — inert for v1; opens edit sheet in follow-up */}
        <button
          type="button"
          aria-label="Edit relationship"
          className="shrink-0 w-[34px] h-[34px] rounded-full bg-white/90 text-[#2C2C2C] flex items-center justify-center hover:bg-white transition-colors"
        >
          <EditPencil />
        </button>
      </div>
    </div>
  );
}

function HighlightsCard({
  relationship,
  totalLags,
}: {
  relationship: CirclePersonDetail["relationship"];
  totalLags: number;
}) {
  const song = relationship?.song;
  const location = relationship?.metPlace;
  const since = formatMetOn(relationship?.metOn, relationship?.metOnPrecision);
  const iconUrl = relationship?.iconUrl;
  const lagCount = totalLags;
  const anyContent = !!(song?.trackName || location || since || lagCount);

  return (
    <section className="bg-white rounded-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-[16px] md:p-[20px]">
      <header className="flex items-center justify-between">
        <h2 className="font-montserrat font-semibold text-[#2C2C2C] text-[13px] md:text-[14px] uppercase tracking-[0.04em]">
          Relationship Highlights
        </h2>
        <button
          type="button"
          aria-label="Edit highlights"
          className="w-[28px] h-[28px] flex items-center justify-center text-[#848484] hover:text-[#2C2C2C] transition-colors"
        >
          <EditPencil />
        </button>
      </header>

      {!anyContent && (
        <p className="mt-[12px] font-montserrat text-[#848484] text-[13px]">
          No highlights yet.
        </p>
      )}

      {song?.trackName && <SongRow song={song} />}

      {(since || location) && (
        <div className="mt-[12px] grid grid-cols-2 gap-[12px]">
          {since && (
            <Field label="Since" value={since} />
          )}
          {location && (
            <Field
              label={(location.city || location.country) ?? "Location"}
              value={
                location.city && location.country
                  ? `${location.city}, ${location.country}`
                  : location.city || location.country || ""
              }
              singleLine
            />
          )}
        </div>
      )}

      {lagCount > 0 && (
        <div className="mt-[16px] flex items-center justify-between border-t border-[#C9C9C9]/40 pt-[12px]">
          <div>
            <p className="font-ivy text-[#2C2C2C] text-[22px] md:text-[26px] leading-none">
              {lagCount}
              <span className="ml-[6px] font-montserrat text-[#848484] text-[12px] md:text-[13px] align-middle">
                Lags Shared
              </span>
            </p>
          </div>
          <IconHighlight url={iconUrl} />
        </div>
      )}
    </section>
  );
}

function SongRow({
  song,
}: {
  song: NonNullable<CirclePersonDetail["relationship"]>["song"];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {
        /* browser autoplay policy or network — no recovery */
      });
    } else {
      el.pause();
    }
  }

  if (!song?.trackName) return null;
  const preview = song.previewUrl || "";
  return (
    <div className="mt-[12px] flex items-center gap-[12px]">
      {song.artworkUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={song.artworkUrl}
          alt=""
          className="w-[48px] h-[48px] rounded-[6px] object-cover shrink-0"
        />
      ) : (
        <div className="w-[48px] h-[48px] rounded-[6px] bg-black/10 shrink-0" />
      )}
      <div className="flex-1 min-w-0 leading-tight">
        <p className="font-montserrat font-semibold text-[#2C2C2C] text-[13px] md:text-[14px] truncate">
          {song.trackName}
        </p>
        {song.artistName && (
          <p className="font-montserrat text-[#848484] text-[12px] truncate">
            {song.artistName}
          </p>
        )}
      </div>
      {preview && (
        <>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="w-[36px] h-[36px] rounded-full bg-[#2C2C2C] text-white flex items-center justify-center shrink-0 hover:opacity-90"
          >
            {playing ? (
              <span className="flex items-center gap-[2px]">
                <span className="w-[3px] h-[12px] bg-white rounded-sm" />
                <span className="w-[3px] h-[12px] bg-white rounded-sm" />
              </span>
            ) : (
              <span className="border-l-[10px] border-l-white border-y-[7px] border-y-transparent ml-[3px]" />
            )}
          </button>
          <audio
            ref={audioRef}
            src={preview}
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  singleLine,
}: {
  label: string;
  value: string;
  singleLine?: boolean;
}) {
  return (
    <div className="bg-[#F6F4EC] rounded-[10px] px-[12px] py-[10px] min-w-0">
      <p className="font-montserrat text-[#848484] text-[11px] md:text-[12px] uppercase tracking-[0.04em]">
        {label}
      </p>
      <p
        className={`mt-[2px] font-ivy text-[#2C2C2C] text-[14px] md:text-[15px] ${singleLine ? "truncate" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function IconHighlight({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <span className="text-[#2C2C2C] text-[22px]" aria-hidden>
        ♡
      </span>
    );
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={url} alt="" className="w-[28px] h-[28px] object-contain" />;
}

function PromptRotator({ prompts }: { prompts: Array<{ _id: string; content: string }> }) {
  // Random starting index on mount so returning users don't see the same line.
  const list = useMemo(() => prompts.filter((p) => p.content?.trim()), [prompts]);
  const [index, setIndex] = useState(() =>
    list.length > 0 ? Math.floor(Math.random() * list.length) : 0,
  );
  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, 7000);
    return () => clearInterval(id);
  }, [list.length]);

  if (list.length === 0) {
    return (
      <section className="bg-[#E6E3D9] rounded-[16px] p-[20px] min-h-[160px] flex items-center justify-center">
        <p className="font-ivy italic text-[#848484] text-[14px] text-center">
          No prompts for this relationship yet.
        </p>
      </section>
    );
  }

  const prompt = list[index];
  return (
    <section className="relative bg-[#E6E3D9] rounded-[16px] p-[20px] md:p-[24px] min-h-[160px] flex flex-col items-center justify-center text-center">
      {list.length > 1 && (
        <button
          type="button"
          aria-label="Previous"
          onClick={() =>
            setIndex((i) => (i - 1 + list.length) % list.length)
          }
          className="absolute left-[8px] top-1/2 -translate-y-1/2 w-[28px] h-[28px] flex items-center justify-center text-[#848484] hover:text-[#2C2C2C]"
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
      )}
      <p className="font-ivy italic text-[#2C2C2C] text-[18px] md:text-[20px] leading-[1.25] max-w-[320px]">
        {prompt.content}
      </p>
      <div className="mt-[16px] flex items-center gap-[10px]">
        <button
          type="button"
          className="inline-flex items-center gap-[8px] rounded-full bg-primary-orange text-white px-[16px] py-[9px] font-montserrat text-[13px] hover:opacity-90"
        >
          <MicIcon />
          Answer it
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-[8px] rounded-full border border-[#2C2C2C]/30 text-[#232323] px-[16px] py-[9px] font-montserrat text-[13px] hover:bg-black/[0.03]"
        >
          <PaperPlaneIcon />
          Send it
        </button>
      </div>
      {list.length > 1 && (
        <button
          type="button"
          aria-label="Next"
          onClick={() => setIndex((i) => (i + 1) % list.length)}
          className="absolute right-[8px] top-1/2 -translate-y-1/2 w-[28px] h-[28px] flex items-center justify-center text-[#848484] hover:text-[#2C2C2C]"
        >
          <ChevronRightIcon width={16} height={16} />
        </button>
      )}
    </section>
  );
}

function SharedLagsSection({
  lags,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  lags: CirclePersonLag[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const list = Array.isArray(lags) ? lags : [];
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // IntersectionObserver watches a sentinel below the grid. When it enters
  // the viewport, pull the next page. The 400px rootMargin preloads ahead
  // of the fold so scrolling never has to pause for a fetch.
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "400px 0px 400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onLoadMore, list.length]);

  return (
    <section className="mt-[32px] md:mt-[40px]">
      <h2 className="font-ivy text-[#2C2C2C] text-[22px] md:text-[24px]">
        Shared Lags
      </h2>
      {list.length === 0 ? (
        <p className="mt-[12px] font-montserrat text-[#848484] text-[14px]">
          You haven&rsquo;t shared any Lags together yet.
        </p>
      ) : (
        <>
          <ul className="mt-[16px] md:mt-[20px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-[20px] md:gap-[24px]">
            {list.map((lag) => (
              <SharedLagCard key={lag._id} lag={lag} />
            ))}
          </ul>
          {(hasMore || loadingMore) && (
            <div
              ref={sentinelRef}
              className="mt-[24px] flex items-center justify-center py-[16px]"
            >
              {loadingMore && (
                <div className="w-[22px] h-[22px] border-[2.5px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SharedLagCard({ lag }: { lag: CirclePersonLag }) {
  const threadId = lag._id;
  const prompt = lag.promptCard;
  // Threads with real prompts land on the prompt viewer; story-only threads
  // and single-story threads go straight into the lag at the latest story.
  const latestStoryId = lag.latestStory?._id;
  const href = latestStoryId
    ? `/thread/${threadId}/story/${latestStoryId}`
    : `/thread/${threadId}`;

  const title =
    prompt?.title?.trim() ||
    prompt?.content?.trim() ||
    "Untitled";
  const cover = prompt?.imageUrl || null;
  const date = lag.displayDate || formatDate(lag.latestActivity);
  const commentCount = lag.latestStory?.totalComments ?? 0;
  const participants = (lag.people ?? []).slice(0, 3);
  const extra = Math.max(0, (lag.totalPeople ?? lag.people?.length ?? 0) - participants.length);

  return (
    <li>
      <Link href={href} className="block group">
        <div className="bg-white shadow-[0_8px_20px_rgba(0,0,0,0.12)] p-[10px] pb-[14px]">
          {cover ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cover}
              alt=""
              className="w-full aspect-square object-cover block"
            />
          ) : (
            <div className="w-full aspect-square bg-black/5" />
          )}
        </div>
        <div className="mt-[10px]">
          <p className="font-ivy text-[#2C2C2C] text-[15px] md:text-[16px] group-hover:opacity-80 transition-opacity line-clamp-1">
            {title}
          </p>
          <div className="mt-[4px] flex items-center justify-between gap-[12px]">
            <p className="font-montserrat text-[#848484] text-[12px]">
              {date}
            </p>
            {(participants.length > 0 || commentCount > 0) && (
              <div className="flex items-center gap-[6px]">
                <div className="flex items-center">
                  {participants.map((p, i) => (
                    <span
                      key={p._id}
                      className={`w-[20px] h-[20px] rounded-full ring-2 ring-white overflow-hidden ${
                        i > 0 ? "-ml-[8px]" : ""
                      }`}
                    >
                      <Avatar
                        user={{
                          firstName: p.firstName || "",
                          profilePicture: p.profilePicture || null,
                        }}
                        size={20}
                      />
                    </span>
                  ))}
                  {extra > 0 && (
                    <span className="w-[20px] h-[20px] -ml-[8px] rounded-full ring-2 ring-white bg-[#848484] text-white font-montserrat text-[9px] flex items-center justify-center">
                      +{extra}
                    </span>
                  )}
                </div>
                {commentCount > 0 && (
                  <span className="font-montserrat text-[#2C2C2C] text-[12px]">
                    {commentCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

function MicIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 0.833984C9.33696 0.833984 8.70107 1.09738 8.23223 1.56622C7.76339 2.03506 7.5 2.67094 7.5 3.33398V10.0007C7.5 10.6637 7.76339 11.2996 8.23223 11.7684C8.70107 12.2373 9.33696 12.5007 10 12.5007C10.663 12.5007 11.2989 12.2373 11.7678 11.7684C12.2366 11.2996 12.5 10.6637 12.5 10.0007V3.33398C12.5 2.67094 12.2366 2.03506 11.7678 1.56622C11.2989 1.09738 10.663 0.833984 10 0.833984Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.8346 8.33398V10.0007C15.8346 11.5477 15.2201 13.0315 14.1261 14.1254C13.0321 15.2194 11.5484 15.834 10.0013 15.834C8.45421 15.834 6.97047 15.2194 5.87651 14.1254C4.78255 13.0315 4.16797 11.5477 4.16797 10.0007V8.33398"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 15.834V19.1673"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66797 19.166H13.3346"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 21 21"
      fill="none"
      aria-hidden
    >
      <path
        d="M19.25 1.75L9.625 11.375"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.25 1.75L13.125 19.25L9.625 11.375L1.75 7.875L19.25 1.75Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditPencil() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20h4L19 9l-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatMetOn(
  iso?: string | null,
  precision?: string | null,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (precision === "year") return String(d.getUTCFullYear());
  if (precision === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

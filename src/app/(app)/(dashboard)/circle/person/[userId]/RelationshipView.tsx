"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "../../../../../../components/Avatar";
import { ChevronLeftIcon, ChevronRightIcon } from "../../../icons";
import {
  patchCirclePerson,
  type CirclePersonDetail,
  type CirclePersonLag,
} from "../../../../../../lib/circle/api";
import {
  LocationModal,
  MusicPickerModal,
  type LocationValue,
  type MusicValue,
} from "../../../new-story/pickers";
import { toast } from "react-hot-toast";
import RelationshipCoverSheet from "./RelationshipCoverSheet";

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
  // Local override for the cover so the sheet can update the hero instantly
  // without waiting for a refetch. Reset when the person prop changes.
  const [coverOverride, setCoverOverride] = useState<string | null | undefined>(
    undefined,
  );
  const [coverSheetOpen, setCoverSheetOpen] = useState(false);
  const activeCoverUrl =
    coverOverride !== undefined ? coverOverride : rel?.coverImageUrl ?? null;

  return (
    <div>
      {/* Top header — desktop only. On mobile, back + title overlay the cover. */}
      <div className="hidden md:flex items-center gap-[8px]">
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
        coverImageUrl={activeCoverUrl}
        onEditCover={() => setCoverSheetOpen(true)}
        onBack={onBack}
      />

      {/* Mobile gets its own horizontal padding since the page wrapper
          strips px on <md so the cover can bleed edge-to-edge. */}
      <div className="px-[16px] md:px-0">
        {/* Highlights + prompt rotator */}
        <div className="mt-[20px] md:mt-[24px] grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-[16px] md:gap-[20px] items-start">
          <HighlightsCard
            userId={p._id}
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

      <RelationshipCoverSheet
        open={coverSheetOpen}
        userId={p._id}
        hasCurrentCover={!!activeCoverUrl}
        onClose={() => setCoverSheetOpen(false)}
        onSaved={(url) => setCoverOverride(url)}
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
  onEditCover,
  onBack,
}: {
  person: CirclePersonDetail["person"];
  currentUserFirstName: string;
  heroTitle: string;
  label: string;
  coverImageUrl: string | null;
  onEditCover: () => void;
  onBack: () => void;
}) {
  const coverBg = coverImageUrl ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
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
  );

  return (
    <div className="mt-[16px] md:mt-[20px]">
      {/* ---------- Mobile layout ---------- */}
      <div className="md:hidden relative">
        {/* Cover image/gradient is clipped only on the bottom corners so
            the top bleeds edge-to-edge and up to the viewport top. */}
        <div className="relative overflow-hidden h-[200px]">
          {coverBg}
          {/* Overlay back + title on top of the cover (white) */}
          <div className="absolute top-0 left-0 right-0 flex items-center gap-[8px] px-[12px] pt-[14px]">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="w-[36px] h-[36px] rounded-full bg-white/90 text-[#232323] flex items-center justify-center"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <h1 className="font-ivy text-white text-[20px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
              Relationship
            </h1>
          </div>
          <button
            type="button"
            onClick={onEditCover}
            aria-label="Edit relationship cover"
            className="absolute top-[14px] right-[12px] w-[36px] h-[36px] rounded-full bg-white/90 text-[#232323] flex items-center justify-center hover:bg-white transition-colors"
          >
            <EditPencil />
          </button>
        </div>
        {/* Avatars sit OUTSIDE the clipped cover so they can hang halfway
            below the card onto the cream page. Full-width absolute row
            with flex-justify-center = reliable horizontal centering. */}
        <div
          className="absolute inset-x-0 flex justify-center pointer-events-none"
          style={{ top: "164px" }}
        >
          <span className="w-[72px] h-[72px] rounded-full ring-[3px] ring-white overflow-hidden">
            <Avatar
              user={{
                firstName: currentUserFirstName || "",
                profilePicture: null,
              }}
              size={72}
              isSelf
            />
          </span>
          <span className="-ml-[16px] w-[72px] h-[72px] rounded-full ring-[3px] ring-white overflow-hidden">
            <Avatar
              user={{
                firstName: person.firstName,
                profilePicture: person.profilePicture,
                updatedAt: person.updatedAt,
              }}
              size={72}
            />
          </span>
        </div>
        <div className="mt-[44px] text-center">
          <p className="font-ivy text-[#2C2C2C] text-[22px] leading-[1.1]">
            {heroTitle}
          </p>
          <p className="mt-[2px] font-montserrat text-[#848484] text-[13px]">
            {label}
          </p>
        </div>
      </div>

      {/* ---------- Desktop layout ---------- */}
      <div className="hidden md:block relative overflow-hidden rounded-[18px] h-[200px]">
        {coverBg}
        <div className="relative h-full flex items-center justify-between gap-[16px] px-[28px]">
          <div className="flex-1 min-w-0 flex items-center gap-[18px]">
            <div className="flex items-center shrink-0">
              <span className="w-[88px] h-[88px] rounded-full ring-4 ring-white overflow-hidden">
                <Avatar
                  user={{
                    firstName: currentUserFirstName || "",
                    profilePicture: null,
                  }}
                  size={88}
                  isSelf
                />
              </span>
              <span className="-ml-[22px] w-[88px] h-[88px] rounded-full ring-4 ring-white overflow-hidden">
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
              <p className="font-ivy text-[28px] leading-[1.15] truncate">
                {heroTitle}
              </p>
              <p className="mt-[2px] font-montserrat text-white/85 text-[14px]">
                {label}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onEditCover}
            aria-label="Edit relationship cover"
            className="shrink-0 w-[34px] h-[34px] rounded-full bg-white/90 text-[#232323] flex items-center justify-center hover:bg-white transition-colors"
          >
            <EditPencil />
          </button>
        </div>
      </div>
    </div>
  );
}

function HighlightsCard({
  userId,
  relationship,
  totalLags,
}: {
  userId: string;
  relationship: CirclePersonDetail["relationship"];
  totalLags: number;
}) {
  const incomingSong = relationship?.song;
  const incomingPlace = relationship?.metPlace;
  const incomingMetOn = relationship?.metOn;
  const incomingPrecision = relationship?.metOnPrecision;
  // Local overrides so inline picks re-render the card without a refetch.
  // `undefined` = no override yet.
  const [songOverride, setSongOverride] = useState<MusicValue | null | undefined>(
    undefined,
  );
  const [placeOverride, setPlaceOverride] = useState<
    LocationValue | null | undefined
  >(undefined);
  const [metOnOverride, setMetOnOverride] = useState<string | null | undefined>(
    undefined,
  );
  const song = songOverride !== undefined ? songOverride : incomingSong;
  const location =
    placeOverride !== undefined ? placeOverride : incomingPlace;
  const effectiveMetOn =
    metOnOverride !== undefined ? metOnOverride : incomingMetOn;
  const [musicOpen, setMusicOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [savingSong, setSavingSong] = useState(false);
  const [savingPlace, setSavingPlace] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const since = formatMetOn(effectiveMetOn, incomingPrecision);
  const iconUrl = relationship?.iconUrl;
  const lagCount = totalLags;
  const hasAnyHighlight = !!(song?.trackName || location || since || iconUrl);
  const editHref = `/circle/person/${userId}/edit`;

  async function handleSongPick(v: MusicValue) {
    if (savingSong) return;
    setSavingSong(true);
    setMusicOpen(false);
    try {
      await patchCirclePerson(userId, { song: v });
      setSongOverride(v);
      toast.success("Saved");
    } catch {
      toast.error("Couldn't save song");
    } finally {
      setSavingSong(false);
    }
  }

  async function handlePlacePick(v: LocationValue) {
    if (savingPlace) return;
    setSavingPlace(true);
    setLocationOpen(false);
    try {
      await patchCirclePerson(userId, { metPlace: v });
      setPlaceOverride(v);
      toast.success("Saved");
    } catch {
      toast.error("Couldn't save place");
    } finally {
      setSavingPlace(false);
    }
  }

  async function handleYearPick(year: number) {
    if (savingYear) return;
    setSavingYear(true);
    setYearOpen(false);
    try {
      const iso = `${year}-01-01T00:00:00.000Z`;
      await patchCirclePerson(userId, {
        metOn: iso,
        metOnPrecision: "month",
      });
      setMetOnOverride(iso);
      toast.success("Saved");
    } catch {
      toast.error("Couldn't save year");
    } finally {
      setSavingYear(false);
    }
  }

  // Mobile parity: when there's nothing set, show a single clickable "Add
  // relationship highlights" card instead of the dense breakdown. Keeps the
  // column from looking empty on first-visit.
  if (!hasAnyHighlight) {
    return (
      <section>
        <h2 className="font-montserrat font-semibold text-[#2C2C2C] text-[13px] md:text-[14px] uppercase tracking-[0.04em]">
          Relationship Highlights
        </h2>
        <Link
          href={editHref}
          className="mt-[12px] flex items-center justify-center gap-[12px] bg-[#EDE9DD] hover:bg-[#E2DDCF] transition-colors rounded-[16px] px-[20px] py-[28px] md:py-[36px]"
        >
          <span className="w-[36px] h-[36px] rounded-full bg-white flex items-center justify-center text-[#2C2C2C]">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-ivy text-[#2C2C2C] text-[16px] md:text-[18px]">
            Add relationship highlights
          </span>
        </Link>
      </section>
    );
  }

  // Per product: everything inside the Highlights card renders in DM Mono —
  // matches the Daily Lag and other label surfaces across the app.
  return (
    <section
      className="py-[4px]"
      style={{ fontFamily: "var(--font-dm-mono), ui-monospace, monospace" }}
    >
      <header className="flex items-center justify-between">
        <h2
          className="font-montserrat font-medium text-[#2C2C2C] text-[13px] md:text-[14px] uppercase tracking-[0.04em]"
        >
          Relationship Highlights
        </h2>
        <Link
          href={editHref}
          aria-label="Edit highlights"
          className="w-[28px] h-[28px] flex items-center justify-center text-[#232323] hover:text-[#2C2C2C] transition-colors"
        >
          <EditPencil />
        </Link>
      </header>

      {song?.trackName ? (
        <SongRow song={song} />
      ) : (
        <button
          type="button"
          onClick={() => setMusicOpen(true)}
          disabled={savingSong}
          className="mt-[12px] w-full flex items-center gap-[12px] hover:bg-black/[0.03] rounded-[12px] px-[0px] py-[8px] text-left transition-colors disabled:opacity-60"
        >
          <span className="w-[48px] h-[48px] rounded-[6px] bg-[#2C2C2C]/15 shrink-0" />
          <span className="text-[#2C2C2C] text-[14px] md:text-[15px]">
            {savingSong ? "Saving…" : "+ Add a song"}
          </span>
        </button>
      )}

      {musicOpen && (
        <MusicPickerModal
          onClose={() => setMusicOpen(false)}
          onSelect={handleSongPick}
        />
      )}

      <div className="mt-[12px] border-t border-[#C9C9C9]/50 grid grid-cols-2 items-stretch">
        {/* Since cell — value or inline placeholder */}
        {since ? (
          <div className="px-[12px] py-[6px] flex items-center min-w-0">
            <span className="text-[#2C2C2C] text-[14px] md:text-[15px] leading-tight truncate">
              Since {since}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setYearOpen(true)}
            disabled={savingYear}
            className="px-[12px] py-[6px] flex items-center min-w-0 text-left hover:bg-black/[0.03] transition-colors disabled:opacity-60"
          >
            <span className="text-[#2C2C2C] text-[14px] md:text-[15px] leading-tight truncate">
              {savingYear ? "Saving…" : "+ Add year"}
            </span>
          </button>
        )}
        {/* Place cell — value or inline placeholder */}
        {location ? (
          <div className="px-[12px] py-[6px] flex items-center min-w-0 border-l border-[#C9C9C9]/50">
            <span className="text-[#2C2C2C] text-[14px] md:text-[15px] leading-tight truncate">
              {location.city || location.formattedAddress || ""}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLocationOpen(true)}
            disabled={savingPlace}
            className="px-[12px] py-[6px] flex items-center min-w-0 border-l border-[#C9C9C9]/50 text-left hover:bg-black/[0.03] transition-colors disabled:opacity-60"
          >
            <span className="text-[#2C2C2C] text-[14px] md:text-[15px] leading-tight truncate">
              {savingPlace ? "Saving…" : "+ Add where you met"}
            </span>
          </button>
        )}
      </div>

      {locationOpen && (
        <LocationModal
          initial={
            location
              ? {
                  formattedAddress: location.formattedAddress || "",
                  placeId: location.placeId || "",
                  city: location.city || "",
                }
              : null
          }
          onClose={() => setLocationOpen(false)}
          onSubmit={handlePlacePick}
        />
      )}
      {yearOpen && (
        <InlineYearPickerModal
          initial={effectiveMetOn ? yearOfIso(effectiveMetOn) : null}
          onClose={() => setYearOpen(false)}
          onSelect={handleYearPick}
        />
      )}

      {lagCount > 0 && (
        <div className="border-t border-[#C9C9C9]/50 grid grid-cols-[1fr_auto] items-stretch">
          <div className="px-[12px] py-[10px] flex items-center min-w-0">
            <p className="text-[#2C2C2C] text-[22px] md:text-[26px] leading-none">
              {lagCount}
              <span className="ml-[6px] text-[#848484] text-[12px] md:text-[13px] align-middle">
                Lags Shared
              </span>
            </p>
          </div>
          <div className="px-[16px] py-[10px] flex items-center justify-center border-l border-[#C9C9C9]/50">
            <IconHighlight url={iconUrl} />
          </div>
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
        <p className="font-semibold text-[#2C2C2C] text-[13px] md:text-[14px] truncate">
          {song.trackName}
        </p>
        {song.artistName && (
          <p className="text-[#848484] text-[12px] truncate">
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


function IconHighlight({ url }: { url?: string | null }) {
  if (!url) {
    return (
      <span className="text-[#2C2C2C] text-[32px]" aria-hidden>
        ♡
      </span>
    );
  }
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={url} alt="" className="w-[40px] h-[40px] object-contain" />;
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
    <svg width={16} height={16} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M14.168 2.497C14.3868 2.27813 14.6467 2.10451 14.9326 1.98606C15.2186 1.86761 15.5251 1.80664 15.8346 1.80664C16.1442 1.80664 16.4507 1.86761 16.7366 1.98606C17.0226 2.10451 17.2824 2.27813 17.5013 2.497C17.7202 2.71587 17.8938 2.9757 18.0122 3.26167C18.1307 3.54764 18.1917 3.85413 18.1917 4.16366C18.1917 4.47319 18.1307 4.77969 18.0122 5.06566C17.8938 5.35162 17.7202 5.61146 17.5013 5.83033L6.2513 17.0803L1.66797 18.3303L2.91797 13.747L14.168 2.497Z"
        stroke="currentColor"
        strokeWidth={1.2463}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function yearOfIso(iso: string): number {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? new Date().getUTCFullYear()
    : d.getUTCFullYear();
}

function InlineYearPickerModal({
  initial,
  onClose,
  onSelect,
}: {
  initial: number | null;
  onClose: () => void;
  onSelect: (year: number) => void;
}) {
  const currentYear = new Date().getUTCFullYear();
  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y--) out.push(y);
    return out;
  }, [currentYear]);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-[16px]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] w-full max-w-[380px] max-h-[70vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-[20px] py-[14px] border-b border-black/5 flex items-center justify-between">
          <h3 className="font-ivy text-[#2C2C2C] text-[18px]">Select year</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-[32px] h-[32px] flex items-center justify-center text-[#848484] hover:text-[#2C2C2C]"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6l-12 12"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>
        <ul className="flex-1 overflow-y-auto">
          {years.map((y) => {
            const selected = y === initial;
            return (
              <li key={y}>
                <button
                  type="button"
                  onClick={() => onSelect(y)}
                  className={`w-full text-left px-[20px] py-[12px] font-montserrat text-[15px] transition-colors ${
                    selected
                      ? "bg-primary-blue/10 text-primary-blue font-semibold"
                      : "text-[#2C2C2C] hover:bg-black/[0.03]"
                  }`}
                >
                  {y}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function formatMetOn(
  iso?: string | null,
  _precision?: string | null,
): string {
  // Web collects year-only via the picker; BE stores a full ISO with
  // precision="month" for parity with mobile, but the UI always shows
  // just the year. Ignore precision and render the year.
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return String(d.getUTCFullYear());
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

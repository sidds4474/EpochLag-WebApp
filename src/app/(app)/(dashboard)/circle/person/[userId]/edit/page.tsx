"use client";

// Highlights edit form — person mode.
//
// Fields: myLabel (chip or free text), song, metOn (year-only), metPlace,
// iconUrl. Diff-based PATCH — only changed fields are sent. Reuses the
// existing Music + Location modal pickers from /new-story/pickers.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  fetchCircleIcons,
  fetchCircleOptions,
  fetchCirclePerson,
  patchCirclePerson,
  type CircleIcon,
  type CirclePersonDetail,
  type CirclePersonPatch,
  type RelationshipOption,
} from "../../../../../../../lib/circle/api";
import {
  LocationModal,
  MusicPickerModal,
  type LocationValue,
  type MusicValue,
} from "../../../../new-story/pickers";
import { ChevronLeftIcon } from "../../../../icons";

type State = {
  myLabel: string;
  song: MusicValue | null;
  metOn: string | null; // ISO date
  metPlace: LocationValue | null;
  iconUrl: string | null;
};

export default function EditHighlightsPage() {
  const router = useRouter();
  const params = useParams<{ userId: string }>();
  const userId = params?.userId ?? "";

  const [initial, setInitial] = useState<State | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [targetName, setTargetName] = useState("");
  const [options, setOptions] = useState<RelationshipOption[]>([]);
  const [maxLabelLen, setMaxLabelLen] = useState(60);
  const [icons, setIcons] = useState<CircleIcon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  // Modal open flags for the reused pickers.
  const [musicOpen, setMusicOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchCirclePerson(userId),
      fetchCircleOptions(),
      fetchCircleIcons().catch(() => [] as CircleIcon[]),
    ])
      .then(([detail, opts, iconList]) => {
        if (cancelled) return;
        setOptions(opts.relationships);
        setMaxLabelLen(opts.labelMaxLength);
        setIcons(iconList);
        const seed = seedState(detail);
        setInitial(seed);
        setState(seed);
        setTargetName(detail.person.firstName || "");
        // If their label is free text not in the chip list, open the custom
        // input slot so the current value stays visible to the user.
        if (
          seed.myLabel &&
          !opts.relationships.some(
            (r) => r.slug.toLowerCase() === seed.myLabel.toLowerCase(),
          )
        ) {
          setCustomOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load highlights");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const patch = useMemo(
    () => (initial && state ? diffPatch(initial, state) : {}),
    [initial, state],
  );
  const dirty = Object.keys(patch).length > 0;

  async function save() {
    if (!state || !initial) return;
    if (!dirty) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await patchCirclePerson(userId, patch);
      toast.success("Saved");
      router.back();
    } catch (e) {
      console.error("[EditHighlights] save failed", e);
      toast.error("Could not save. Please try again.");
      setSaving(false);
    }
  }

  if (loading || !state) {
    return (
      <div className="min-h-full bg-[#F3F1EB] flex items-center justify-center py-[64px]">
        <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F3F1EB]">
      <div className="mx-auto max-w-[1000px] px-[16px] sm:px-[24px] md:px-[40px] pt-[16px] md:pt-[24px] pb-[48px]">
        {/* Header */}
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[#2C2C2C] hover:bg-black/[0.04] transition-colors"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
          <h1 className="font-ivy text-[#2C2C2C] text-[22px] md:text-[28px]">
            Add Highlights
          </h1>
        </div>

        <div className="mt-[24px] md:mt-[32px] grid grid-cols-1 md:grid-cols-2 gap-[24px] md:gap-[40px] items-start">
          {/* Left column */}
          <div className="flex flex-col gap-[24px]">
            <section>
              <h2 className="font-montserrat text-[#2C2C2C] text-[14px] md:text-[15px]">
                {targetName || "They"} is your…
              </h2>
              <div className="mt-[12px] flex flex-wrap gap-[8px]">
                {options.map((opt) => {
                  const selected =
                    !customOpen &&
                    state.myLabel.toLowerCase() === opt.slug.toLowerCase();
                  return (
                    <button
                      key={opt.slug}
                      type="button"
                      onClick={() => {
                        setCustomOpen(false);
                        setState({ ...state, myLabel: opt.slug });
                      }}
                      className={`px-[16px] py-[8px] rounded-full font-montserrat text-[13px] md:text-[14px] transition-colors ${
                        selected
                          ? "bg-primary-blue text-white"
                          : "bg-white text-[#2C2C2C] hover:bg-black/[0.04]"
                      }`}
                    >
                      {opt.displayName}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setCustomOpen(true);
                    setState({ ...state, myLabel: "" });
                  }}
                  className={`px-[16px] py-[8px] rounded-full font-montserrat text-[13px] md:text-[14px] transition-colors ${
                    customOpen
                      ? "bg-primary-blue text-white"
                      : "bg-white text-[#2C2C2C] hover:bg-black/[0.04]"
                  }`}
                >
                  Other
                </button>
              </div>
              {customOpen && (
                <input
                  type="text"
                  value={state.myLabel}
                  onChange={(e) =>
                    setState({
                      ...state,
                      myLabel: e.target.value.slice(0, maxLabelLen),
                    })
                  }
                  placeholder="Type a custom label"
                  className="mt-[12px] w-full bg-white rounded-full px-[16px] py-[12px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
                  maxLength={maxLabelLen}
                />
              )}
            </section>

            <section>
              <h2 className="font-montserrat text-[#2C2C2C] text-[14px] md:text-[15px]">
                When did you meet {targetName || "them"}?
              </h2>
              <button
                type="button"
                onClick={() => setYearOpen(true)}
                className="mt-[10px] w-full bg-white rounded-full px-[16px] py-[12px] flex items-center justify-between font-montserrat text-[14px] text-[#2C2C2C] hover:bg-black/[0.02] transition-colors"
              >
                <span className={state.metOn ? "" : "text-[#848484]"}>
                  {state.metOn ? yearOf(state.metOn) : "Select"}
                </span>
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </section>

            <section>
              <h2 className="font-montserrat text-[#2C2C2C] text-[14px] md:text-[15px]">
                Where did you meet {targetName || "them"}?
              </h2>
              <button
                type="button"
                onClick={() => setLocationOpen(true)}
                className="mt-[10px] w-full bg-white rounded-full px-[16px] py-[12px] text-left font-montserrat text-[14px] hover:bg-black/[0.02] transition-colors"
              >
                <span
                  className={state.metPlace ? "text-[#2C2C2C]" : "text-[#848484]"}
                >
                  {state.metPlace?.formattedAddress || "e.g. Los Angeles"}
                </span>
              </button>
            </section>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-[24px]">
            <section>
              <h2 className="font-montserrat text-[#2C2C2C] text-[14px] md:text-[15px]">
                What&rsquo;s a shared song?
              </h2>
              {state.song ? (
                <div className="mt-[10px] flex items-center gap-[12px] bg-white rounded-[16px] px-[12px] py-[10px]">
                  {state.song.artworkUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={state.song.artworkUrl}
                      alt=""
                      className="w-[44px] h-[44px] rounded-[6px] object-cover"
                    />
                  ) : (
                    <div className="w-[44px] h-[44px] rounded-[6px] bg-black/10" />
                  )}
                  <div className="flex-1 min-w-0 leading-tight">
                    <p className="font-montserrat font-semibold text-[#2C2C2C] text-[13px] truncate">
                      {state.song.trackName}
                    </p>
                    <p className="font-montserrat text-[#848484] text-[12px] truncate">
                      {state.song.artistName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setState({ ...state, song: null })}
                    aria-label="Remove song"
                    className="w-[28px] h-[28px] flex items-center justify-center text-[#848484] hover:text-[#2C2C2C]"
                  >
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 6l12 12M18 6l-12 12"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMusicOpen(true)}
                  className="mt-[10px] w-full bg-white rounded-full px-[16px] py-[12px] text-left font-montserrat text-[14px] text-[#848484] hover:bg-black/[0.02] transition-colors"
                >
                  + Add song
                </button>
              )}
            </section>

            <section>
              <h2 className="font-montserrat text-[#2C2C2C] text-[14px] md:text-[15px]">
                What icon represents your relationship best?
              </h2>
              <div className="mt-[12px] grid grid-cols-5 gap-[10px]">
                {icons.map((icon) => {
                  const selected = state.iconUrl === icon.url;
                  return (
                    <button
                      key={icon._id}
                      type="button"
                      onClick={() =>
                        setState({
                          ...state,
                          iconUrl: selected ? null : icon.url,
                        })
                      }
                      className={`aspect-square rounded-[10px] bg-white flex items-center justify-center border-[1.5px] transition-colors ${
                        selected
                          ? "border-primary-orange"
                          : "border-transparent hover:border-black/10"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={icon.url}
                        alt={icon.tag || ""}
                        className="w-[60%] h-[60%] object-contain"
                      />
                    </button>
                  );
                })}
                {icons.length === 0 && (
                  <p className="col-span-5 font-montserrat text-[#848484] text-[13px]">
                    No icons available.
                  </p>
                )}
              </div>
            </section>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full bg-primary-orange text-white rounded-full py-[14px] font-montserrat font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? "Saving…" : "Apply Changes"}
            </button>
          </div>
        </div>
      </div>

      {musicOpen && (
        <MusicPickerModal
          onClose={() => setMusicOpen(false)}
          onSelect={(v) => {
            setState({ ...state, song: v });
            setMusicOpen(false);
          }}
        />
      )}
      {locationOpen && (
        <LocationModal
          initial={state.metPlace}
          onClose={() => setLocationOpen(false)}
          onSubmit={(v) => {
            setState({ ...state, metPlace: v });
            setLocationOpen(false);
          }}
        />
      )}
      {yearOpen && (
        <YearPickerModal
          initial={state.metOn ? yearOf(state.metOn) : null}
          onClose={() => setYearOpen(false)}
          onSelect={(year) => {
            setState({
              ...state,
              metOn: `${year}-01-01T00:00:00.000Z`,
            });
            setYearOpen(false);
          }}
        />
      )}
    </div>
  );
}

function YearPickerModal({
  initial,
  onClose,
  onSelect,
}: {
  initial: number | null;
  onClose: () => void;
  onSelect: (year: number) => void;
}) {
  const currentYear = new Date().getUTCFullYear();
  // Range: 100 years back → current year. Most recent first so people
  // scrolling for a recent year don't have to walk to the bottom.
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

function seedState(detail: CirclePersonDetail): State {
  const r = detail.relationship;
  const place = r?.metPlace;
  return {
    myLabel: r?.myLabel?.trim() || "",
    song: r?.song
      ? {
          trackName: r.song.trackName || "",
          artistName: r.song.artistName || "",
          previewUrl: r.song.previewUrl || "",
          artworkUrl: r.song.artworkUrl || "",
        }
      : null,
    metOn: r?.metOn || null,
    metPlace: place
      ? {
          formattedAddress: place.formattedAddress || "",
          placeId: place.placeId || "",
          city: place.city || "",
        }
      : null,
    iconUrl: r?.iconUrl || null,
  };
}

function diffPatch(initial: State, current: State): CirclePersonPatch {
  const patch: CirclePersonPatch = {};
  const nextLabel = current.myLabel.trim();
  const prevLabel = initial.myLabel.trim();
  if (nextLabel !== prevLabel) patch.relationship = nextLabel || null;
  if (!shallowEqualMusic(initial.song, current.song)) {
    patch.song = current.song
      ? {
          trackName: current.song.trackName,
          artistName: current.song.artistName,
          previewUrl: current.song.previewUrl,
          artworkUrl: current.song.artworkUrl,
        }
      : null;
  }
  if ((initial.metOn || null) !== (current.metOn || null)) {
    patch.metOn = current.metOn;
    if (current.metOn) patch.metOnPrecision = "month";
  }
  if (!shallowEqualPlace(initial.metPlace, current.metPlace)) {
    patch.metPlace = current.metPlace
      ? {
          formattedAddress: current.metPlace.formattedAddress,
          placeId: current.metPlace.placeId,
          city: current.metPlace.city,
        }
      : null;
  }
  if ((initial.iconUrl || null) !== (current.iconUrl || null)) {
    patch.iconUrl = current.iconUrl;
  }
  return patch;
}

function shallowEqualMusic(a: MusicValue | null, b: MusicValue | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.trackName === b.trackName &&
    a.artistName === b.artistName &&
    a.previewUrl === b.previewUrl &&
    a.artworkUrl === b.artworkUrl
  );
}

function shallowEqualPlace(
  a: LocationValue | null,
  b: LocationValue | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.formattedAddress === b.formattedAddress &&
    a.placeId === b.placeId &&
    a.city === b.city
  );
}

function yearOf(iso: string): number {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date().getUTCFullYear() : d.getUTCFullYear();
}

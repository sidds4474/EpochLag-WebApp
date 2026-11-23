"use client";

// Group highlights edit — trimmed version of the person edit form. Only
// song + iconUrl are exposed; label, date, and place don't apply to
// groups per the spec.

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  fetchCircleGroup,
  fetchCircleIcons,
  patchCircleGroup,
  type CircleGroupDetail,
  type CircleGroupPatch,
  type CircleIcon,
} from "../../../../../../../lib/circle/api";
import {
  MusicPickerModal,
  type MusicValue,
} from "../../../../new-story/pickers";
import { ChevronLeftIcon } from "../../../../icons";

type State = {
  song: MusicValue | null;
  iconUrl: string | null;
};

export default function EditGroupHighlightsPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId ?? "";

  const EMPTY: State = { song: null, iconUrl: null };
  const [initial, setInitial] = useState<State>(EMPTY);
  const [state, setState] = useState<State>(EMPTY);
  const [groupName, setGroupName] = useState("");
  const [icons, setIcons] = useState<CircleIcon[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);

  // Paint the form shell immediately; stream the seed data in as it arrives
  // so the page feels instant even if the group fetch is slow.
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    fetchCircleIcons()
      .then((list) => {
        if (!cancelled) setIcons(list);
      })
      .catch(() => {});
    fetchCircleGroup(groupId)
      .then((detail) => {
        if (cancelled) return;
        const seed = seedState(detail);
        setInitial(seed);
        setState((cur) => (cur === EMPTY ? seed : cur));
        setGroupName(detail.group?.name || "");
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't load highlights");
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const patch = useMemo(() => diffPatch(initial, state), [initial, state]);
  const dirty = Object.keys(patch).length > 0;

  async function save() {
    if (!hydrated) return;
    if (!dirty) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await patchCircleGroup(groupId, patch);
      toast.success("Saved");
      router.back();
    } catch {
      toast.error("Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-[#F3F1EB]">
      <div className="mx-auto max-w-[800px] px-[16px] sm:px-[24px] md:px-[40px] pt-[16px] md:pt-[24px] pb-[48px]">
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
            Edit Highlights
          </h1>
        </div>

        {groupName && (
          <p className="mt-[8px] font-montserrat text-[#848484] text-[13px] md:text-[14px]">
            For {groupName}
          </p>
        )}

        <div className="mt-[24px] md:mt-[32px] flex flex-col gap-[24px]">
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
              What icon represents your group best?
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
            disabled={saving || !hydrated}
            className="w-full bg-primary-orange text-white rounded-full py-[14px] font-montserrat font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? "Saving…" : !hydrated ? "Loading…" : "Apply Changes"}
          </button>
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
    </div>
  );
}

function seedState(detail: CircleGroupDetail): State {
  const g = detail.group;
  return {
    song: g?.song
      ? {
          trackName: g.song.trackName || "",
          artistName: g.song.artistName || "",
          previewUrl: g.song.previewUrl || "",
          artworkUrl: g.song.artworkUrl || "",
        }
      : null,
    iconUrl: g?.iconUrl || null,
  };
}

function diffPatch(initial: State, current: State): CircleGroupPatch {
  const patch: CircleGroupPatch = {};
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

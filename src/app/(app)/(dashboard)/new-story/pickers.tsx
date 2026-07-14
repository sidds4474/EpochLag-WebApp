"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef, useState } from "react";
import {
  CalendarIcon,
  CloseIcon,
  MapPinIcon,
  MusicNoteIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
} from "../icons";

export type LocationValue = {
  formattedAddress: string;
  placeId: string;
  city: string;
};

export type MusicValue = {
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl: string;
};

// ============ shared chip shell ============

function ChipShell({
  active,
  onClick,
  onClear,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-[6px] rounded-full pl-[10px] pr-[6px] py-[6px] shadow-[0_0_8px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_10px_rgba(0,0,0,0.12)] transition-shadow font-montserrat font-medium text-[13px] ${
        active
          ? "bg-primary-orange/10 text-primary-blue"
          : "bg-white text-primary-blue"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer flex items-center gap-[6px] pr-[6px]"
      >
        <span className="shrink-0 text-primary-blue">{icon}</span>
        <span className="max-w-[180px] truncate">{label}</span>
      </button>
      {active && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear"
          className="cursor-pointer shrink-0 w-[18px] h-[18px] rounded-full text-primary-blue/60 hover:bg-black/[0.08] flex items-center justify-center transition-colors"
        >
          <CloseIcon width={10} height={10} />
        </button>
      )}
      {!active && (
        <span className="w-[6px]" aria-hidden="true" />
      )}
    </div>
  );
}

// ============ Date chip ============

function formatDateForLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Add Date";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DateChip({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
      (el as HTMLInputElement & { showPicker: () => void }).showPicker();
    } else {
      el.click();
    }
  }

  return (
    <>
      <ChipShell
        active={value !== null}
        onClick={openPicker}
        onClear={() => onChange(null)}
        icon={<CalendarIcon width={14} height={14} />}
        label={value ? formatDateForLabel(value) : "Add Date"}
      />
      <input
        ref={inputRef}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="sr-only absolute pointer-events-none"
        tabIndex={-1}
      />
    </>
  );
}

// ============ Location chip ============

export function LocationChip({
  value,
  onChange,
}: {
  value: LocationValue | null;
  onChange: (next: LocationValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChipShell
        active={value !== null}
        onClick={() => setOpen(true)}
        onClear={() => onChange(null)}
        icon={<MapPinIcon width={14} height={14} />}
        label={value ? value.city || value.formattedAddress : "Add Location"}
      />
      {open && (
        <LocationModal
          initial={value}
          onClose={() => setOpen(false)}
          onSubmit={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function LocationModal({
  onClose,
  onSubmit,
}: {
  initial: LocationValue | null;
  onClose: () => void;
  onSubmit: (v: LocationValue) => void;
}) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // A session token groups autocomplete + details fetch into ONE billable
  // Google Places session. Reset per modal open.
  useEffect(() => {
    if (!places) return;
    sessionTokenRef.current = new places.AutocompleteSessionToken();
    return () => {
      sessionTokenRef.current = null;
    };
  }, [places]);

  useEffect(() => {
    if (!places || !query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { suggestions: results } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionTokenRef.current ?? undefined,
          });
        if (cancelled) return;
        setSuggestions(results ?? []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setSuggestions([]);
        setError(
          err instanceof Error ? err.message : "Location search failed"
        );
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, places]);

  async function handleSelect(
    suggestion: google.maps.places.AutocompleteSuggestion
  ) {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["formattedAddress", "addressComponents", "id"],
      });
      const findComponent = (types: string[]) => {
        for (const type of types) {
          const c = place.addressComponents?.find((comp) =>
            comp.types.includes(type)
          );
          if (c) return c.longText ?? "";
        }
        return "";
      };
      const city = findComponent([
        "locality",
        "postal_town",
        "administrative_area_level_2",
        "sublocality",
      ]);
      onSubmit({
        formattedAddress:
          place.formattedAddress || prediction.text?.text || "",
        placeId: place.id || prediction.placeId || "",
        city,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch place");
    }
  }

  return (
    <ModalShell title="Add Location" onClose={onClose}>
      <div className="bg-[#ededed] rounded-full pl-[14px] pr-[16px] py-[10px] flex items-center gap-[10px]">
        <SearchIcon
          width={16}
          height={16}
          className="text-primary-blue/60 shrink-0"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a place"
          autoFocus
          className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px]"
        />
      </div>

      <div className="mt-[12px] max-h-[320px] overflow-y-auto scrollbar-hide">
        {!places && (
          <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">
            Loading…
          </p>
        )}
        {error && (
          <p className="font-montserrat text-red-600 text-[13px] py-[10px] text-center">
            {error}
          </p>
        )}
        {places && !error && !query.trim() && (
          <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">
            Search for a city, address, or landmark
          </p>
        )}
        {places && !error && query.trim() && suggestions.length === 0 && (
          <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">
            No results
          </p>
        )}
        {suggestions.length > 0 && (
          <ul className="flex flex-col">
            {suggestions.map((s) => {
              const p = s.placePrediction;
              if (!p) return null;
              return (
                <li key={p.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    className="cursor-pointer w-full flex items-start gap-[10px] py-[10px] px-[6px] rounded-[10px] hover:bg-black/[0.04] transition-colors text-left"
                  >
                    <MapPinIcon
                      width={16}
                      height={16}
                      className="text-primary-blue/60 shrink-0 mt-[2px]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-montserrat font-semibold text-primary-blue text-[14px] truncate">
                        {p.mainText?.text ?? p.text?.text}
                      </p>
                      {p.secondaryText?.text && (
                        <p className="font-montserrat text-primary-blue/60 text-[12px] truncate">
                          {p.secondaryText.text}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}

// ============ Music chip ============

type ItunesResult = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
};

export function MusicChip({
  value,
  onChange,
}: {
  value: MusicValue | null;
  onChange: (next: MusicValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ChipShell
        active={value !== null}
        onClick={() => setOpen(true)}
        onClear={() => onChange(null)}
        icon={<MusicNoteIcon width={14} height={14} />}
        label={
          value
            ? `${value.trackName} — ${value.artistName}`
            : "Add Music"
        }
      />
      {open && (
        <MusicPickerModal
          onClose={() => setOpen(false)}
          onSelect={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function MusicPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (v: MusicValue) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItunesResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            q
          )}&media=music&entity=song&limit=15&country=us`
        );
        if (!res.ok) throw new Error(`iTunes returned ${res.status}`);
        const data = (await res.json()) as { results: ItunesResult[] };
        if (cancelled) return;
        setResults(data.results ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Music search failed"
        );
        setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function togglePreview(item: ItunesResult) {
    if (previewId === item.trackId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPreviewId(null);
      return;
    }
    audioRef.current?.pause();
    const el = new Audio(item.previewUrl);
    el.play().then(() => {
      audioRef.current = el;
      setPreviewId(item.trackId);
      el.onended = () => setPreviewId(null);
    }).catch(() => {
      setPreviewId(null);
    });
  }

  function selectItem(item: ItunesResult) {
    audioRef.current?.pause();
    audioRef.current = null;
    onSelect({
      trackName: item.trackName,
      artistName: item.artistName,
      previewUrl: item.previewUrl,
      artworkUrl: (item.artworkUrl100 || "").replace("100x100", "300x300"),
    });
  }

  return (
    <ModalShell title="Add Music" onClose={onClose}>
      <div className="bg-[#ededed] rounded-full pl-[14px] pr-[16px] py-[10px] flex items-center gap-[10px]">
        <SearchIcon
          width={16}
          height={16}
          className="text-primary-blue/60 shrink-0"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists"
          autoFocus
          className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px]"
        />
      </div>

      <div className="mt-[12px] max-h-[360px] overflow-y-auto scrollbar-hide">
        {loading && (
          <div className="flex flex-col gap-[8px]">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[56px] rounded-[10px] bg-black/[0.04] animate-pulse"
              />
            ))}
          </div>
        )}
        {!loading && error && (
          <p className="font-montserrat text-red-600 text-[13px] py-[10px]">
            {error}
          </p>
        )}
        {!loading && !error && query.trim() && results.length === 0 && (
          <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">
            No results
          </p>
        )}
        {!loading && !error && !query.trim() && (
          <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">
            Search for a track to attach to your story
          </p>
        )}
        {!loading && !error && results.length > 0 && (
          <ul className="flex flex-col">
            {results.map((item) => {
              const playing = previewId === item.trackId;
              return (
                <li key={item.trackId}>
                  <div className="flex items-center gap-[10px] py-[6px] px-[4px] rounded-[10px] hover:bg-black/[0.03] transition-colors">
                    <button
                      type="button"
                      onClick={() => togglePreview(item)}
                      className="cursor-pointer relative shrink-0 w-[48px] h-[48px] rounded-[10px] overflow-hidden bg-black/[0.05] group"
                      aria-label={playing ? "Pause preview" : "Play preview"}
                    >
                      {item.artworkUrl100 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.artworkUrl100}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                      <span
                        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                          playing
                            ? "bg-black/50 opacity-100"
                            : "bg-black/40 opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <span className="w-[26px] h-[26px] rounded-full bg-white text-primary-blue flex items-center justify-center">
                          {playing ? (
                            <PauseIcon width={12} height={12} />
                          ) : (
                            <PlayIcon width={12} height={12} />
                          )}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectItem(item)}
                      className="cursor-pointer flex-1 min-w-0 text-left"
                    >
                      <p className="font-montserrat font-semibold text-primary-blue text-[14px] truncate">
                        {item.trackName}
                      </p>
                      <p className="font-montserrat text-primary-blue/60 text-[12px] truncate">
                        {item.artistName}
                      </p>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}

// ============ shared modal shell ============

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] bg-white rounded-[20px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[20px] pt-[16px] pb-[8px]">
          <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <div className="px-[20px] pb-[20px]">{children}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { urlForScreen } from "../../../lib/onboarding";
import { useAppDispatch, useAppSelector } from "../../../lib/onboarding/store";
import {
  setDate,
  setLocation,
  type LagLocation,
} from "../../../lib/onboarding/store/slices/createALagSlice";
import { setLastStep } from "../../../lib/onboarding/store/slices/anonDraftSlice";
import {
  apiSaveAnonDraft,
  apiGetAnonDraft,
} from "../../../lib/onboarding/api/anonEndpoints";
import { hydrateFromServerDraft } from "../../../lib/onboarding/store/slices/createALagSlice";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
} from "../../(app)/(dashboard)/icons";
import toast from "react-hot-toast";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const TITLE = "Now add a time and place";

export default function AddTimePlacePage() {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <AddTimePlaceInner />
    </APIProvider>
  );
}

function AddTimePlaceInner() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const savedDate = useAppSelector((s) => s.createALag.date);
  const savedLocation = useAppSelector((s) => s.createALag.location);
  const hasDraftToken = useAppSelector((s) => s.anonDraft.hasDraftToken);
  const hydrated = useAppSelector((s) => s.anonDraft.hydrated);
  const hydratedFromServerRef = useRef(false);

  // Rehydrate from BE on refresh so date/location autofill from an earlier
  // cover pick survives a page reload.
  useEffect(() => {
    if (!hydrated || hydratedFromServerRef.current) return;
    if (!hasDraftToken) return;
    hydratedFromServerRef.current = true;
    apiGetAnonDraft()
      .then((d) => d && dispatch(hydrateFromServerDraft(d)))
      .catch(() => {});
  }, [dispatch, hasDraftToken, hydrated]);

  const [selectedIso, setSelectedIso] = useState<string | null>(savedDate);
  const [location, setLocationLocal] = useState<LagLocation | null>(savedLocation);
  const [dontKnowLocation, setDontKnowLocation] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

  // Reflect resumed state whenever it hydrates.
  useEffect(() => {
    if (savedDate && !selectedIso) setSelectedIso(savedDate);
  }, [savedDate, selectedIso]);
  useEffect(() => {
    if (savedLocation && !location) setLocationLocal(savedLocation);
  }, [savedLocation, location]);

  const goNext = () => {
    if (!selectedIso) {
      toast.error("Please pick a date");
      return;
    }
    if (!location && !dontKnowLocation) {
      toast.error("Please add a location or tick 'I don't know the location'");
      return;
    }
    const payloadLocation = dontKnowLocation ? null : location;
    dispatch(setDate(selectedIso));
    dispatch(setLocation(payloadLocation));
    dispatch(setLastStep(2)); // AddTimePlace = index 2 in PHASE_A_SCREEN_INDEX
    apiSaveAnonDraft({
      dateOfStory: selectedIso,
      location: payloadLocation,
      screensReached: 2,
    }).catch(() => {});
    router.push(urlForScreen("AddParticipants"));
  };

  const onPickDate = (iso: string) => {
    setSelectedIso(iso);
  };

  const onPickLocation = (v: LagLocation) => {
    setLocationLocal(v);
    setDontKnowLocation(false);
    setLocationOpen(false);
  };

  const toggleDontKnow = () => {
    setDontKnowLocation((prev) => {
      const next = !prev;
      if (next) setLocationLocal(null);
      return next;
    });
  };

  return (
    <>
      {locationOpen && (
        <LocationPickerModal
          onClose={() => setLocationOpen(false)}
          onSubmit={onPickLocation}
        />
      )}
      <div className="fixed inset-0 z-40 bg-[#F3F1EB] overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto px-[24px] md:px-[32px] pt-[max(env(safe-area-inset-top),32px)] pb-[160px] lg:pb-[100px]">
          <div className="w-full max-w-[460px] mx-auto flex flex-col items-center">
            <RingDot />
            <h1 className="mt-[14px] font-ivy font-normal text-[#232323] text-[22px] md:text-[24px] lg:text-[26px] leading-[1.25] text-center">
              {TITLE}
            </h1>

            <div className="mt-[28px] w-full">
              <DateField iso={selectedIso} />
            </div>

            <div className="mt-[14px] w-full bg-white p-[16px] md:p-[20px] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]">
              <Calendar selectedIso={selectedIso} onSelect={onPickDate} />
            </div>

            <div className="mt-[20px] w-full">
              <LocationField
                value={location}
                placeholder="Add location"
                disabled={dontKnowLocation}
                onClick={() => setLocationOpen(true)}
              />
            </div>

            <div className="mt-[14px] w-full">
              <DontKnowCheckbox checked={dontKnowLocation} onToggle={toggleDontKnow} />
            </div>
          </div>
        </div>

        {/* Desktop Next pill */}
        <button
          type="button"
          onClick={goNext}
          className="hidden lg:inline-flex absolute bottom-[32px] right-[32px] cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full px-[40px] py-[12px] hover:opacity-90 transition-opacity"
        >
          Next
        </button>

        {/* Mobile + tablet Next pill */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#F3F1EB] px-[24px] md:px-[48px] pb-[max(env(safe-area-inset-bottom),24px)] pt-[16px]">
          <button
            type="button"
            onClick={goNext}
            className="w-full max-w-[520px] mx-auto block cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Location picker modal (Google Places) ---------- */

function LocationPickerModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (v: LagLocation) => void;
}) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

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
        setError(err instanceof Error ? err.message : "Location search failed");
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, places]);

  async function handleSelect(s: google.maps.places.AutocompleteSuggestion) {
    const prediction = s.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "addressComponents", "id"] });
      const findComponent = (types: string[]) => {
        for (const type of types) {
          const c = place.addressComponents?.find((comp) => comp.types.includes(type));
          if (c) return c.longText ?? "";
        }
        return "";
      };
      const city = findComponent(["locality", "postal_town", "administrative_area_level_2", "sublocality"]);
      const country = findComponent(["country"]);
      onSubmit({
        city: city || null,
        country: country || null,
        formattedAddress: place.formattedAddress || prediction.text?.text || null,
        placeId: place.id || prediction.placeId || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch place");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-primary-white w-full md:w-[520px] md:rounded-[20px] rounded-t-[20px] p-[20px] max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-[12px]">
          <h3 className="font-montserrat font-bold text-[16px] text-primary-blue">Add Location</h3>
          <button type="button" onClick={onClose} className="cursor-pointer text-primary-blue/60 hover:text-primary-blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
        <div className="bg-[#EDEDED] rounded-full px-[14px] py-[10px] flex items-center gap-[10px]">
          <MapPinIcon width={16} height={16} className="text-primary-blue/60 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a place"
            autoFocus
            className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px]"
          />
        </div>
        <div className="mt-[12px] flex-1 overflow-y-auto">
          {!places && (
            <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">Loading…</p>
          )}
          {error && (
            <p className="font-montserrat text-red-600 text-[13px] py-[10px] text-center">{error}</p>
          )}
          {places && !error && !query.trim() && (
            <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">
              Search for a city, address, or landmark
            </p>
          )}
          {places && !error && query.trim() && suggestions.length === 0 && (
            <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">No results</p>
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
                      <MapPinIcon width={16} height={16} className="text-primary-blue/60 shrink-0 mt-[2px]" />
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
      </div>
    </div>
  );
}

/* ---------- Shared bits ---------- */

function RingDot() {
  return (
    <span
      className="relative block h-[42px] w-[42px] rounded-full"
      style={{ backgroundColor: "#FCD6A5" }}
    >
      <span
        className="absolute inset-[8px] rounded-full"
        style={{ backgroundColor: "#D95F3B" }}
      />
    </span>
  );
}

function DateField({ iso }: { iso: string | null }) {
  const label = iso ? formatDate(iso) : "Add date";
  return (
    <div className="w-full flex items-center justify-between gap-[12px] pb-[8px] border-b border-[#2c2c2c]/30">
      <span
        className={`font-montserrat text-[14px] ${
          iso ? "text-[#232323]" : "text-[#2c2c2c]/50"
        }`}
      >
        {label}
      </span>
      <CalendarIcon width={18} height={18} className="text-[#232323]" />
    </div>
  );
}

function LocationField({
  value,
  placeholder,
  disabled,
  onClick,
}: {
  value: LagLocation | null;
  placeholder: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const label = value ? value.city || value.formattedAddress || placeholder : placeholder;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } flex items-center justify-between gap-[12px] pb-[8px] border-b border-[#2c2c2c]/30 text-left`}
    >
      <span
        className={`font-montserrat text-[14px] ${
          value ? "text-[#232323]" : "text-[#2c2c2c]/50"
        } truncate`}
      >
        {label}
      </span>
      <MapPinIcon width={18} height={18} className="text-[#232323] shrink-0" />
    </button>
  );
}

function DontKnowCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-[10px] cursor-pointer"
    >
      <span
        className={`h-[18px] w-[18px] rounded-[4px] border flex items-center justify-center transition-colors ${
          checked
            ? "bg-primary-orange border-primary-orange"
            : "bg-white border-[#2c2c2c]/40"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <span className="font-montserrat text-[14px] text-[#232323]">
        I don&apos;t know the location
      </span>
    </button>
  );
}

/* ---------- Calendar ---------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["m", "t", "w", "t", "f", "s", "s"];

function Calendar({
  selectedIso,
  onSelect,
  compact = false,
}: {
  selectedIso: string | null;
  onSelect: (iso: string) => void;
  compact?: boolean;
}) {
  const initial = selectedIso ? new Date(selectedIso) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [yearOpen, setYearOpen] = useState(false);
  useEffect(() => {
    if (!selectedIso) return;
    const d = new Date(selectedIso);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [selectedIso]);

  const selectedYMD = selectedIso ? (() => {
    const d = new Date(selectedIso);
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
  })() : null;

  const days = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const list: number[] = [];
    for (let y = now; y >= now - 100; y--) list.push(y);
    return list;
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const dayFont = compact ? "text-[13px]" : "text-[14px]";

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <span className="font-montserrat font-medium text-[#232323] text-[15px]">
            {MONTHS[viewMonth]}
          </span>
          <button type="button" onClick={prevMonth} aria-label="Previous month" className="cursor-pointer w-[22px] h-[22px] rounded-full text-[#232323]/70 hover:bg-black/[0.05] flex items-center justify-center">
            <ChevronLeftIcon width={14} height={14} />
          </button>
          <button type="button" onClick={nextMonth} aria-label="Next month" className="cursor-pointer w-[22px] h-[22px] rounded-full text-[#232323]/70 hover:bg-black/[0.05] flex items-center justify-center">
            <ChevronRightIcon width={14} height={14} />
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setYearOpen((v) => !v)}
            className="cursor-pointer flex items-center gap-[8px] bg-white rounded-full px-[12px] py-[6px] font-montserrat text-[13px] text-[#232323] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
          >
            {viewYear}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {yearOpen && (
            <div className="absolute right-0 top-full mt-[6px] z-20 bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] max-h-[220px] overflow-y-auto min-w-[90px] py-[4px]">
              {yearOptions.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setYearOpen(false);
                  }}
                  className={`w-full text-left cursor-pointer px-[14px] py-[6px] font-montserrat text-[13px] hover:bg-black/[0.04] ${y === viewYear ? "text-[#232323] font-semibold" : "text-[#232323]/80"}`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-[14px] grid grid-cols-7 gap-y-[6px]">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center font-montserrat text-[#232323]/50 text-[12px] lowercase">
            {d}
          </div>
        ))}
        {days.map((cell, i) => {
          const isSelected =
            selectedYMD && cell.inMonth && cell.year === selectedYMD.y && cell.month === selectedYMD.m && cell.day === selectedYMD.d;
          return (
            <button
              key={i}
              type="button"
              disabled={!cell.inMonth}
              onClick={() => onSelect(toIso(cell.year, cell.month, cell.day))}
              className={`h-[34px] mx-auto w-[34px] flex items-center justify-center rounded-full font-montserrat ${dayFont} transition-colors ${
                cell.inMonth
                  ? isSelected
                    ? "bg-primary-orange text-white font-semibold"
                    : "text-[#333333] cursor-pointer hover:bg-black/[0.05]"
                  : "text-[#232323]/25 cursor-not-allowed"
              }`}
            >
              {pad2(cell.day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  // Convert Sun-Sat (0-6) to Mon-Sun (0-6).
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: Array<{ year: number; month: number; day: number; inMonth: boolean }> = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({
      year: month === 0 ? year - 1 : year,
      month: (month + 11) % 12,
      day: prevMonthDays - i,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ year, month, day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - firstDow - daysInMonth + 1;
    cells.push({
      year: month === 11 ? year + 1 : year,
      month: (month + 1) % 12,
      day: nextDay,
      inMonth: false,
    });
  }
  return cells;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toIso(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0).toISOString();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

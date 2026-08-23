"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { bustUrl } from "../../../../../lib/images";
import { updateMyProfile } from "../../../../../lib/profile/api";
import { ChevronLeftIcon, CloseIcon, MapPinIcon, SearchIcon } from "../../icons";

// Edit Info — the full profile form. Save button lives in the header
// (top-right on both mobile and desktop), disabled until firstName +
// lastName are both non-empty and something has actually changed. The
// cover preview strip on top of the form navigates to /studio/edit-cover
// via the pencil affordance — cover changes are their own screen with
// their own endpoint per the API spec.
export default function EditInfoPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [stateName, setStateName] = useState(user?.state ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? toDateInput(user.dateOfBirth) : "");
  const [saving, setSaving] = useState(false);

  // Seed from user once it's hydrated (AuthProvider may load async).
  useEffect(() => {
    if (!user) return;
    setFirstName((v) => v || user.firstName || "");
    setLastName((v) => v || user.lastName || "");
    setBio((v) => v || user.bio || "");
    setCity((v) => v || user.city || "");
    setStateName((v) => v || user.state || "");
    setCountry((v) => v || user.country || "");
    setDateOfBirth((v) => v || (user.dateOfBirth ? toDateInput(user.dateOfBirth) : ""));
  }, [user]);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      firstName !== (user.firstName ?? "") ||
      lastName !== (user.lastName ?? "") ||
      bio !== (user.bio ?? "") ||
      city !== (user.city ?? "") ||
      stateName !== (user.state ?? "") ||
      country !== (user.country ?? "") ||
      dateOfBirth !== (user.dateOfBirth ? toDateInput(user.dateOfBirth) : "")
    );
  }, [user, firstName, lastName, bio, city, stateName, country, dateOfBirth]);

  const canSave =
    !!firstName.trim() && !!lastName.trim() && dirty && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const next = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio,
        city,
        state: stateName,
        country,
        dateOfBirth,
      });
      updateUser(next);
      toast.success("Profile updated");
      router.back();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Couldn't update profile";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const cover = bustUrl(user?.backgroundPicture ?? null, user?.updatedAt);

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-white">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] pb-[100px] md:pb-[40px] max-w-[1100px] mx-auto w-full">
        {/* Header row: back + title on the left, Save pill on the right.
            Save is the primary action on this screen; the pill mirrors
            the Studio design language (orange filled, disabled = 40%). */}
        <div className="flex items-center justify-between gap-[12px]">
          <div className="flex items-center gap-[10px]">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue flex items-center justify-center hover:bg-black/[0.06] transition-colors"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
            <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[28px] leading-tight">
              Edit Info
            </h1>
          </div>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="cursor-pointer bg-primary-orange text-white rounded-full h-[40px] md:h-[44px] px-[24px] font-montserrat font-semibold text-[14px] hover:brightness-95 transition-[filter] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center min-w-[86px]"
          >
            {saving ? (
              <span className="w-[18px] h-[18px] rounded-full border-2 border-white/40 border-t-white animate-spin" />
            ) : (
              "Save"
            )}
          </button>
        </div>

        {/* Cover preview strip. Pencil in the top-right navigates to the
            dedicated cover-picker screen. */}
        <button
          type="button"
          onClick={() => router.push("/studio/edit-cover")}
          className="cursor-pointer relative mt-[20px] w-full aspect-[16/5] md:aspect-[1028/220] rounded-[20px] overflow-hidden bg-gradient-to-br from-[#f2a45c] via-[#e18248] to-[#4a2a2f] hover:brightness-95 transition-[filter]"
          aria-label="Change cover image"
        >
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <span className="absolute top-[12px] right-[12px] w-[36px] h-[36px] rounded-full bg-white text-primary-blue flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            <PencilIcon width={16} height={16} />
          </span>
        </button>

        {/* Form grid. 2-col on md+, single column on mobile. */}
        <div className="mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-x-[16px] gap-y-[16px]">
          <TextField
            label="Name"
            value={firstName}
            onChange={setFirstName}
            required
            placeholder="First name"
          />
          <TextField
            label="Last name"
            value={lastName}
            onChange={setLastName}
            required
            placeholder="Last name"
          />
          <DateField
            label="Birthday"
            value={dateOfBirth}
            onChange={setDateOfBirth}
          />
          <LocationField
            label="Location"
            city={city}
            state={stateName}
            country={country}
            onChange={(v) => {
              setCity(v.city);
              setStateName(v.state);
              setCountry(v.country);
            }}
          />
        </div>

        <div className="mt-[16px]">
          <BioField value={bio} onChange={setBio} />
        </div>
      </div>
    </div>
  );
}

// Converts an ISO date (or already-yyyy-MM-dd string) to the yyyy-MM-dd
// form the <input type="date"> expects. Bad input → empty string so we
// don't crash the form.
function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-montserrat font-semibold text-primary-blue text-[13px] mb-[6px]">
      {children}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#ededed] rounded-full h-[44px] px-[16px] font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#ededed] rounded-full h-[44px] px-[16px] font-montserrat text-primary-blue text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-blue/20"
      />
    </div>
  );
}

function BioField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const max = 150;
  return (
    <div>
      <FieldLabel>About</FieldLabel>
      <div className="relative bg-[#ededed] rounded-[20px] p-[14px]">
        <textarea
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tell us about yourself"
          rows={4}
          className="w-full bg-transparent resize-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px] leading-[20px] focus:outline-none"
        />
        <span className="absolute right-[14px] bottom-[10px] font-montserrat text-primary-blue/50 text-[11px]">
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}

// Location field — a read-only trigger that opens a Places search modal.
// The form owns three independent fields (city, state, country); the
// visible input renders them as one comma-joined display string. Tap the
// pill → modal. Pick a suggestion → parent fetches full address
// components, parses city/state/country, and writes all three back at
// once. Tap the ✕ → clears all three.
function LocationField({
  label,
  city,
  state,
  country,
  onChange,
}: {
  label: string;
  city: string;
  state: string;
  country: string;
  onChange: (v: { city: string; state: string; country: string }) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const display = [city, state, country].filter(Boolean).join(", ");
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="cursor-pointer w-full bg-[#ededed] rounded-full h-[44px] pl-[40px] pr-[40px] font-montserrat text-left truncate text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-blue/20 hover:brightness-95 transition-[filter]"
        >
          <MapPinIcon
            width={16}
            height={16}
            className="text-primary-blue/50 absolute left-[16px] top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <span className={display ? "text-primary-blue" : "text-primary-blue/40"}>
            {display || "Add location"}
          </span>
        </button>
        {display && (
          <button
            type="button"
            onClick={() => onChange({ city: "", state: "", country: "" })}
            aria-label="Clear location"
            className="cursor-pointer absolute right-[6px] top-1/2 -translate-y-1/2 w-[28px] h-[28px] rounded-full text-primary-blue/60 hover:bg-black/[0.06] flex items-center justify-center transition-colors"
          >
            <CloseIcon width={12} height={12} />
          </button>
        )}
      </div>
      {pickerOpen && (
        <LocationPickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={async (data) => {
            setPickerOpen(false);
            if (!data) return;
            const parsed = await resolvePlaceComponents(data.place);
            // If the components parse returned nothing for city, fall
            // back to whatever the prediction's mainText gave us — a
            // country-only pick shouldn't wipe the visible value.
            onChange({
              city: parsed.city || data.fallbackCity,
              state: parsed.state,
              country: parsed.country,
            });
          }}
        />
      )}
    </div>
  );
}

// Places autocomplete modal. Session-tokened so a whole search + pick
// counts as one billable session with Google. Closes on outside click
// or on suggestion select.
function LocationPickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (
    result: {
      place: google.maps.places.Place;
      fallbackCity: string;
    } | null
  ) => void;
}) {
  const places = useMapsLibrary("places");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

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
        if (!cancelled) setSuggestions(results ?? []);
      } catch (err) {
        if (!cancelled) {
          setSuggestions([]);
          setError(err instanceof Error ? err.message : "Location search failed");
        }
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, places]);

  async function handlePick(s: google.maps.places.AutocompleteSuggestion) {
    const prediction = s.placePrediction;
    if (!prediction) return;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["addressComponents", "id", "formattedAddress"],
      });
      onSelect({
        place,
        fallbackCity: prediction.mainText?.text ?? prediction.text?.text ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't fetch place");
    }
  }

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
            Add Location
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
        <div className="px-[20px] pb-[20px]">
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
                        onClick={() => handlePick(s)}
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
        </div>
      </div>
    </div>
  );
}

// Wraps the parse behind a Promise so the field can await it. Right now
// the SDK's `fetchFields` is the sole async source — kept as a helper so
// swapping to the REST /place/details endpoint (per the spec) later is
// a one-place change.
async function resolvePlaceComponents(place: google.maps.places.Place) {
  return parseAddressComponents(place.addressComponents ?? []);
}

// Extracts city/state/country from Google's addressComponents. City uses
// the fallback ladder from the spec:
//   locality → postal_town → sublocality_level_1 → sublocality → admin_area_2
// Rationale:
//   • locality — standard city (US, most western)
//   • postal_town — UK equivalent; London has no locality, only postal_town
//   • sublocality_level_1 / sublocality — boroughs/neighborhoods that
//     Google refuses to classify as locality (Brooklyn falls through to
//     Kings County otherwise)
//   • administrative_area_level_2 — county-level last resort
function parseAddressComponents(
  components: google.maps.places.AddressComponent[]
) {
  const get = (type: string) => {
    const match = components.find((c) => c.types.includes(type));
    return match?.longText ?? "";
  };
  return {
    city:
      get("locality") ||
      get("postal_town") ||
      get("sublocality_level_1") ||
      get("sublocality") ||
      get("administrative_area_level_2"),
    state: get("administrative_area_level_1"),
    country: get("country"),
  };
}

function PencilIcon({ width = 16, height = 16 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 20 20" fill="none">
      <path
        d="M11.9667 3.40018L12.7391 2.62778C14.0188 1.34803 16.0937 1.34803 17.3735 2.62778C18.6532 3.90754 18.6532 5.98243 17.3735 7.26218L16.6011 8.03458M11.9667 3.40018C11.9667 3.40018 12.0632 5.04153 13.5115 6.48978C14.9597 7.93803 16.6011 8.03458 16.6011 8.03458M16.6011 8.03458L9.50004 15.1356C9.01907 15.6166 8.77859 15.8571 8.51343 16.0639C8.20064 16.3079 7.8622 16.517 7.50411 16.6877C7.20054 16.8324 6.87789 16.9399 6.23261 17.155L3.49823 18.0665L2.82983 18.2893C2.51228 18.3951 2.16217 18.3125 1.92549 18.0758C1.6888 17.8391 1.60615 17.489 1.712 17.1714L1.9348 16.503L2.84626 13.7687C3.06136 13.1234 3.1689 12.8007 3.31358 12.4972C3.48424 12.1391 3.6934 11.8006 3.93737 11.4878C4.14419 11.2227 4.38468 10.9822 4.86565 10.5012L11.9667 3.40018M3.49823 18.0665L1.9348 16.503"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

import { api } from "../api/client";
import type { LibraryThread } from "./api";

type Envelope<T> = { success: boolean; message?: string; data: T };

export type PlaceLocation = {
  placeId: string | null;
  formattedAddress: string;
  city?: string | null;
  lat: number | null;
  lng: number | null;
  storyCount: number;
};

export async function fetchPlaceLocations(): Promise<PlaceLocation[]> {
  const res = await api.get<Envelope<{ locations: PlaceLocation[] }>>(
    `/api/stories/locations?includeStoryIds=false`
  );
  return res.data?.locations ?? [];
}

// ---------------------------------------------------------------------------
// Coordinate resolver — Places Details + Geocoding fallback with localStorage
// cache. Mirrors mobile's placeCoordsCache pattern (see spec §3).
// ---------------------------------------------------------------------------

export type ResolvedCoords = {
  lat: number;
  lng: number;
  city?: string | null;
  country?: string | null;
  countryCode?: string | null;
};

const CACHE_KEY_PREFIX = "placeCoordsCache";

type CacheMap = Record<string, ResolvedCoords>;

function keyFor(loc: Pick<PlaceLocation, "placeId" | "formattedAddress">): string {
  return loc.placeId || loc.formattedAddress || "";
}

function loadCache(userId: string): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${CACHE_KEY_PREFIX}:${userId}`);
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}

function saveCache(userId: string, cache: CacheMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${CACHE_KEY_PREFIX}:${userId}`,
      JSON.stringify(cache)
    );
  } catch {
    /* quota — ignore */
  }
}

type GoogleAddrComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function extractParts(components: GoogleAddrComponent[] | undefined): {
  city: string | null;
  country: string | null;
  countryCode: string | null;
} {
  if (!components) return { city: null, country: null, countryCode: null };
  let city: string | null = null;
  let country: string | null = null;
  let countryCode: string | null = null;
  for (const c of components) {
    if (c.types.includes("locality")) city = c.long_name;
    else if (!city && c.types.includes("administrative_area_level_2"))
      city = c.long_name;
    else if (c.types.includes("country")) {
      country = c.long_name;
      countryCode = c.short_name;
    }
  }
  return { city, country, countryCode };
}

// Google's REST endpoints (place/details/json, geocode/json) reject browser
// requests with no CORS headers. Use the client-side Maps JS SDK instead —
// PlacesService + Geocoder both work from the browser.
async function waitForMapsSdk(timeoutMs = 15000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const g = (window as unknown as { google?: typeof google }).google;
    if (g?.maps?.places?.PlacesService && g?.maps?.Geocoder) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

let placesServiceEl: HTMLDivElement | null = null;
function getPlacesService(): google.maps.places.PlacesService | null {
  if (typeof window === "undefined") return null;
  if (!placesServiceEl) {
    placesServiceEl = document.createElement("div");
  }
  return new google.maps.places.PlacesService(placesServiceEl);
}

async function resolveViaPlacesDetails(
  placeId: string
): Promise<ResolvedCoords | null> {
  const service = getPlacesService();
  if (!service) return null;
  return new Promise((resolve) => {
    service.getDetails(
      { placeId, fields: ["geometry", "address_components"] },
      (result, status) => {
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !result?.geometry?.location
        ) {
          if (
            status !== google.maps.places.PlacesServiceStatus.OK
          ) {
            console.warn("[places] getDetails failed", { placeId, status });
          }
          resolve(null);
          return;
        }
        const loc = result.geometry.location;
        const parts = extractParts(
          result.address_components as GoogleAddrComponent[] | undefined
        );
        resolve({ lat: loc.lat(), lng: loc.lng(), ...parts });
      }
    );
  });
}

async function resolveViaGeocode(
  address: string
): Promise<ResolvedCoords | null> {
  if (typeof window === "undefined") return null;
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (
        status !== google.maps.GeocoderStatus.OK ||
        !results ||
        results.length === 0
      ) {
        if (status !== google.maps.GeocoderStatus.OK) {
          console.warn("[places] geocode failed", { address, status });
        }
        resolve(null);
        return;
      }
      const top = results[0];
      const loc = top.geometry?.location;
      if (!loc) {
        resolve(null);
        return;
      }
      const parts = extractParts(
        top.address_components as GoogleAddrComponent[] | undefined
      );
      resolve({ lat: loc.lat(), lng: loc.lng(), ...parts });
    });
  });
}


export async function resolveLocations(
  userId: string,
  locations: PlaceLocation[]
): Promise<Record<string, ResolvedCoords>> {
  const ready = await waitForMapsSdk();
  if (!ready) return {};

  const cache = loadCache(userId);
  const out: Record<string, ResolvedCoords> = { ...cache };
  const toResolve: PlaceLocation[] = [];

  for (const loc of locations) {
    const key = keyFor(loc);
    if (!key) continue;
    if (out[key]) continue;
    toResolve.push(loc);
  }

  await Promise.all(
    toResolve.map(async (loc) => {
      const key = keyFor(loc);
      let resolved: ResolvedCoords | null = null;
      if (loc.placeId) {
        resolved = await resolveViaPlacesDetails(loc.placeId);
      }
      if (!resolved && loc.formattedAddress) {
        resolved = await resolveViaGeocode(loc.formattedAddress);
      }
      if (resolved) out[key] = resolved;
    })
  );

  saveCache(userId, out);
  return out;
}

// Combines server coords with resolver output, keyed by placeId|address.
export function coordsForLocation(
  loc: PlaceLocation,
  resolved: Record<string, ResolvedCoords>
): { lat: number; lng: number } | null {
  if (typeof loc.lat === "number" && typeof loc.lng === "number") {
    return { lat: loc.lat, lng: loc.lng };
  }
  const key = keyFor(loc);
  const r = resolved[key];
  if (!r) return null;
  return { lat: r.lat, lng: r.lng };
}

export function placeCacheKey(loc: PlaceLocation): string {
  return keyFor(loc);
}

// Common country full-name → ISO 2-letter code fallback for pre-fix cached
// entries missing countryCode. Kept small; extend as new formattedAddress
// patterns show up in prod.
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  canada: "CA",
  australia: "AU",
  india: "IN",
  germany: "DE",
  france: "FR",
  italy: "IT",
  spain: "ES",
  japan: "JP",
  china: "CN",
  brazil: "BR",
  mexico: "MX",
  netherlands: "NL",
  singapore: "SG",
  ireland: "IE",
  "new zealand": "NZ",
  "south africa": "ZA",
};

export function countryCodeFor(
  loc: PlaceLocation,
  resolved: Record<string, ResolvedCoords>
): string | null {
  const key = keyFor(loc);
  const r = resolved[key];
  if (r?.countryCode) return r.countryCode;
  const last = loc.formattedAddress?.split(",").pop()?.trim() ?? "";
  if (/^[A-Z]{2,3}$/.test(last)) return last.slice(0, 2);
  const found = COUNTRY_NAME_TO_CODE[last.toLowerCase()];
  return found ?? null;
}

export function cityFor(
  loc: PlaceLocation,
  resolved: Record<string, ResolvedCoords>
): string {
  const key = keyFor(loc);
  const r = resolved[key];
  if (r?.city) return r.city;
  if (loc.city) return loc.city;
  return loc.formattedAddress?.split(",")[0]?.trim() ?? "Place";
}

// ---------------------------------------------------------------------------
// Paginated stories at a place — mirrors useStoryEngine's placeId/location
// query variants.
// ---------------------------------------------------------------------------

export type PlaceStoriesPage = {
  threads: LibraryThread[];
  hasMore: boolean;
  nextPage: number;
};

export async function fetchPlaceStories(
  loc: Pick<PlaceLocation, "placeId" | "formattedAddress">,
  page: number,
  limit = 10
): Promise<PlaceStoriesPage> {
  // The stories filter builder in library/api.ts doesn't accept placeId/location
  // yet; call the endpoint directly to pass the location param through.
  const qs = new URLSearchParams();
  qs.set("type", "latest");
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  qs.set("sortBy", "latestActivity");
  qs.set("sortOrder", "desc");
  if (loc.placeId) qs.set("placeId", loc.placeId);
  else if (loc.formattedAddress) qs.set("location", loc.formattedAddress);

  const res = await api.get<Envelope<Record<string, unknown>>>(
    `/api/stories?${qs.toString()}`
  );
  const raw = res.data ?? {};
  const threads =
    (raw.threads as LibraryThread[] | undefined) ??
    (raw.promptCards as LibraryThread[] | undefined) ??
    [];
  const pagination = raw.pagination as
    | { currentPage?: number; totalPages?: number }
    | undefined;
  const currentPage = pagination?.currentPage ?? page;
  const totalPages = pagination?.totalPages ?? currentPage;
  return {
    threads,
    hasMore: currentPage < totalPages,
    nextPage: currentPage + 1,
  };
}

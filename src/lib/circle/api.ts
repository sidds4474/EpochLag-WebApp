// Circles data layer. Two independent BE surfaces:
//   /api/circles/*       — ring people + groups + per-person detail
//   /api/family-tree/*   — genealogical tree
// Independently cached, independently invalidated. Freshness TTLs follow
// mobile: 60s for circles, 30s for family tree.

import { api } from "../api/client";

type Envelope<T> = { success: boolean; message?: string; data: T };

// ---------------- /api/circles ----------------

export type CirclePerson = {
  _id: string;
  firstName: string;
  lastName?: string;
  profilePicture: string | null;
  relationshipLabel?: string | null;
  updatedAt?: string | null;
};

export type CircleGroupSummary = {
  _id: string;
  name: string;
  groupPhotoUrl?: string | null;
  memberCount: number;
  lagCount: number;
  members?: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string | null;
  }>;
};

export type CirclesFeed = {
  people: CirclePerson[];
  groups: CircleGroupSummary[];
};

export async function fetchCircles(): Promise<CirclesFeed> {
  const res = await api.get<Envelope<CirclesFeed>>("/api/circles");
  return {
    people: res.data?.people ?? [],
    groups: res.data?.groups ?? [],
  };
}

// ---------------- Person detail ----------------
// BE shape (confirmed via /api/circles/people/:id):
//   { person, relationship, totalLags, sharedThreadCount, inspoCards[] }

export type CircleSongHighlight = {
  trackName?: string | null;
  artistName?: string | null;
  previewUrl?: string | null;
  artworkUrl?: string | null;
};

export type CirclePlaceHighlight = {
  city?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
  placeId?: string | null;
  lat?: number;
  lng?: number;
};

export type CircleRelationship = {
  myLabel?: string | null;
  theirLabel?: string | null;
  song?: CircleSongHighlight | null;
  metOn?: string | null;
  metOnPrecision?: "year" | "month" | "day" | string | null;
  metPlace?: CirclePlaceHighlight | null;
  iconUrl?: string | null;
  coverImageUrl?: string | null;
  updatedAt?: string | null;
};

export type CirclePersonSummary = {
  _id: string;
  firstName: string;
  lastName?: string;
  profilePicture: string | null;
  epochlagID?: string;
  isFriend?: boolean;
  updatedAt?: string | null;
};

export type CirclePrompt = {
  _id: string;
  content: string;
  imageUrl?: string | null;
  icon?: string | null;
  type?: string;
};

export type CirclePersonDetail = {
  person: CirclePersonSummary;
  relationship: CircleRelationship;
  totalLags: number;
  sharedThreadCount?: number;
  inspoCards?: CirclePrompt[];
  inspoSource?: string;
};

// Shape of one `promptCards[]` item returned by
// GET /api/circles/people/:id/lags. Each item represents a thread (grouped
// around a prompt) with its most recent story preview.
export type CirclePersonLag = {
  _id: string; // thread id
  promptCard?: {
    _id?: string;
    content?: string | null;
    title?: string | null;
    isTitleAvailable?: boolean;
    imageUrl?: string | null;
    note?: string | null;
    cardType?: "INSPO" | "CUSTOM" | string;
  } | null;
  latestStory?: {
    _id?: string;
    content?: string;
    createdAt?: string;
    totalLikes?: number;
    totalComments?: number;
  } | null;
  people?: Array<{
    _id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string | null;
  }>;
  totalPeople?: number;
  totalStories?: number;
  latestActivity?: string;
  displayDate?: string;
  mediaIndicators?: {
    hasImages?: boolean;
    hasAudio?: boolean;
    hasVideo?: boolean;
  };
  isBookmarked?: boolean;
};

export async function fetchCirclePerson(
  userId: string,
): Promise<CirclePersonDetail> {
  const res = await api.get<Envelope<CirclePersonDetail>>(
    `/api/circles/people/${userId}`,
  );
  return res.data;
}

export type CirclePersonLagsPage = {
  cards: CirclePersonLag[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
};

export async function fetchCirclePersonLags(
  userId: string,
  page = 1,
  limit = 20,
): Promise<CirclePersonLagsPage> {
  const res = await api.get<
    Envelope<{
      pagination?: {
        currentPage?: number;
        totalPages?: number;
        totalCount?: number;
        limit?: number;
      };
      promptCards?: CirclePersonLag[];
    }>
  >(`/api/circles/people/${userId}/lags?page=${page}&limit=${limit}`);
  const cards = res.data?.promptCards;
  const pagination = res.data?.pagination;
  return {
    cards: Array.isArray(cards) ? cards : [],
    currentPage: pagination?.currentPage ?? page,
    totalPages: pagination?.totalPages ?? 1,
    totalCount: pagination?.totalCount ?? 0,
  };
}

// ---------------- Family Tree ----------------
// Powered by /api/family-tree/*. Independently cached from /api/circles.

export type FamilyTreePerson = {
  _id: string;
  name: string;
  relationshipSlug?: string | null;
  profilePicture?: string | null;
  isMe?: boolean;
  isOnApp?: boolean;
  isLinked?: boolean;
  phone?: string | null;
  countryCode?: string | null;
  email?: string | null;
  linkedUserId?: string | null;
  hasPendingInvite?: boolean;
  wasInvitedByMe?: boolean;
};

export async function fetchFamilyTree(): Promise<FamilyTreePerson[]> {
  const res = await api.get<Envelope<unknown>>("/api/family-tree");
  const d = res.data as unknown;
  if (Array.isArray(d)) return d as FamilyTreePerson[];
  if (d && typeof d === "object") {
    for (const key of ["people", "members", "items"]) {
      const maybe = (d as Record<string, unknown>)[key];
      if (Array.isArray(maybe)) return maybe as FamilyTreePerson[];
    }
  }
  return [];
}

// ---------------- Module freshness cache ----------------

export const CIRCLES_FRESHNESS_MS = 60_000;

let cachedCircles: CirclesFeed | null = null;
let circlesLoadedAt = 0;

export function getCachedCircles(): {
  data: CirclesFeed | null;
  isFresh: boolean;
} {
  const fresh = Date.now() - circlesLoadedAt < CIRCLES_FRESHNESS_MS;
  return { data: cachedCircles, isFresh: fresh && cachedCircles !== null };
}

export function setCachedCircles(data: CirclesFeed) {
  cachedCircles = data;
  circlesLoadedAt = Date.now();
}

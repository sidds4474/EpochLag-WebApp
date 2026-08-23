import { api } from "../api/client";
import type { UserCard } from "../../types/home";
import type { LibraryThread } from "../library/api";

type Envelope<T> = { success?: boolean; message?: string; data: T; pagination?: Pagination };

export type Pagination = {
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
};

export type StudioTab = "received" | "sent" | "bookmark" | "draft";

// ── Card feeds (received / sent / bookmark) ────────────────────────
//
// All three hit /api/user-card with a `type` param. The BE varies its
// response envelope between array vs { cards: [] } — we normalize here.
export async function fetchStudioCards(
  type: "received" | "sent" | "bookmark",
  page = 1,
  limit = 10
): Promise<{ cards: UserCard[]; pagination: Pagination | null }> {
  const res = await api.get<Envelope<UserCard[] | { cards?: UserCard[] }>>(
    `/api/user-card?type=${type}&page=${page}&limit=${limit}`
  );
  const raw = res.data;
  const cards: UserCard[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.cards)
    ? raw.cards
    : [];
  return { cards, pagination: res.pagination ?? null };
}

// ── Drafts ─────────────────────────────────────────────────────────
//
// /api/stories?type=drafts — BE reuses the stories endpoint with a
// mode switch. Response can carry the list under `threads`, `promptCards`,
// or (older) `drafts` — normalize.
export async function fetchDraftStories(
  page = 1,
  limit = 10
): Promise<{ drafts: LibraryThread[]; pagination: Pagination | null }> {
  const qs = new URLSearchParams();
  qs.set("type", "drafts");
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  qs.set("sortBy", "latestActivity");
  qs.set("sortOrder", "desc");
  const res = await api.get<Envelope<Record<string, unknown>>>(
    `/api/stories?${qs.toString()}`
  );
  const raw = res.data ?? {};
  const drafts =
    (raw.threads as LibraryThread[] | undefined) ??
    (raw.promptCards as LibraryThread[] | undefined) ??
    (raw.drafts as LibraryThread[] | undefined) ??
    [];
  return { drafts, pagination: res.pagination ?? null };
}

// Draft detail — hydrates the composer with full block content. The
// composer's /new-lag?draftId=<id> entry uses this to seed title +
// content + media block descriptors.
export type DraftStoryDetail = {
  _id: string;
  title?: string | null;
  content?: string | null;
  status?: string;
  coverImage?: string | null;
  dateOfStory?: string | null;
  location?: unknown;
  music?: unknown;
  promptId?: string | null;
  isPrivate?: boolean;
  updatedAt?: string;
};

export async function fetchDraftDetail(draftId: string): Promise<DraftStoryDetail> {
  const res = await api.get<Envelope<DraftStoryDetail>>(
    `/api/stories/story/${draftId}`
  );
  return res.data;
}

// ── Friend requests (pending on you) ───────────────────────────────
export type FriendRequest = {
  _id: string;
  from?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string | null;
  };
  sender?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string | null;
  };
  createdAt?: string;
};

export async function fetchFriendRequests(
  type: "received" | "sent" = "received"
): Promise<FriendRequest[]> {
  const res = await api.get<Envelope<FriendRequest[] | { requests?: FriendRequest[] }>>(
    `/api/friend-requests?type=${type}`
  );
  const raw = res.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.requests)) return raw.requests;
  return [];
}

// Small helper used by both the "Waiting on you" list and the desktop
// header. Reads the requester name off whichever populated field the
// BE handed us.
export function friendRequestName(req: FriendRequest): string {
  const person = req.from || req.sender;
  if (!person) return "Someone";
  const full = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return full || "Someone";
}

// Studio-scoped module cache. Each tab and the friend-request feed
// share a stale-while-revalidate pattern so switching tabs feels
// instant on second visit; the header profile lives on its own cache
// so avatar/cover uploads bust it independently.
type CacheEntry<T> = { data: T; loadedAt: number };
const cache = {
  received: null as CacheEntry<UserCard[]> | null,
  sent: null as CacheEntry<UserCard[]> | null,
  bookmark: null as CacheEntry<UserCard[]> | null,
  draft: null as CacheEntry<LibraryThread[]> | null,
  requests: null as CacheEntry<FriendRequest[]> | null,
};

const TTL_MS = {
  received: 10 * 60_000,
  sent: 10 * 60_000,
  bookmark: 10 * 60_000,
  draft: 5 * 60_000,
  requests: 10 * 60_000,
};

export function getCachedTab(
  tab: StudioTab
): { data: UserCard[] | LibraryThread[]; fresh: boolean } | null {
  const entry = cache[tab];
  if (!entry) return null;
  const fresh = Date.now() - entry.loadedAt < TTL_MS[tab];
  return { data: entry.data, fresh };
}

export function setCachedTab(tab: "received" | "sent" | "bookmark", data: UserCard[]): void;
export function setCachedTab(tab: "draft", data: LibraryThread[]): void;
export function setCachedTab(tab: StudioTab, data: UserCard[] | LibraryThread[]): void {
  // The type overloads above keep call sites honest; internally we just
  // stash whatever shape the tab uses.
  (cache as Record<StudioTab, CacheEntry<unknown> | null>)[tab] = {
    data,
    loadedAt: Date.now(),
  };
}

export function getCachedRequests(): { data: FriendRequest[]; fresh: boolean } | null {
  const entry = cache.requests;
  if (!entry) return null;
  return { data: entry.data, fresh: Date.now() - entry.loadedAt < TTL_MS.requests };
}

export function setCachedRequests(data: FriendRequest[]): void {
  cache.requests = { data, loadedAt: Date.now() };
}

// Removing a card locally (e.g. optimistic un-bookmark) needs to touch
// the underlying cache too, otherwise a tab switch would re-render the
// pre-mutation state.
export function removeCardFromCache(tab: "received" | "sent" | "bookmark", cardId: string): void {
  const entry = cache[tab];
  if (!entry) return;
  entry.data = entry.data.filter((c) => c._id !== cardId);
}

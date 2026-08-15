import { api } from "../api/client";
import type { User } from "../../types/user";
import type {
  HomePeople,
  StoryMedia,
  UserCard,
} from "../../types/home";

type Envelope<T> = { success: boolean; message?: string; data: T };
type ReceivedEnvelope = Envelope<UserCard[]> & { pagination?: unknown };
type InspoRawData = UserCard[] | { feed?: UserCard[] };
type InspoEnvelope = Envelope<InspoRawData> & { pagination?: unknown };

export type DockingItemType =
  | "card_of_the_day"
  | "moment"
  | "birthday"
  | "challenge"
  | "announcement";

export type DockingProgressStatus =
  | "not_started"
  | "started"
  | "completed";

export type DockingItem = {
  _id: string;
  type: DockingItemType | string;
  source?: "moment" | "birthday" | "special_moment" | null;
  title: string;
  message?: string;
  profilePhotoPath?: string | null;
  imagePath?: string | null;
  momentIcon?:
    | "birthday"
    | "wedding"
    | "anniversary"
    | "graduation"
    | "travel"
    | "newbaby"
    | "firsthome"
    | "retirement"
    | "other"
    | string;
  recipient?: { userId: string; firstName?: string } | null;
  action?: { kind?: string; [k: string]: unknown } | null;
  progressStatus?: DockingProgressStatus;
};

// Shape matches what the shared /api/stories endpoint actually returns —
// see src/lib/library/api.ts::LibraryThread for the canonical version.
// `people` (not `participants`) is the participant list; `promptCard` and
// `latestStory` don't ship author blocks, so the tile derives the avatar
// from people[0].
export type RecentStoryPerson = {
  _id?: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
};

export type RecentStory = {
  _id: string;
  coverImage?: string | null;
  promptCard?: {
    _id?: string;
    title?: string | null;
    content?: string | null;
    imageUrl?: string | null;
    tags?: string[];
  } | null;
  latestStory?: {
    _id?: string;
    title?: string | null;
    content?: string | null;
    media?: StoryMedia[];
  } | null;
  people?: RecentStoryPerson[];
  totalPeople?: number;
  totalStories?: number;
  isBookmarked?: boolean;
  createdAt?: string;
  latestActivity?: string | null;
};

export async function fetchUserProfile(): Promise<User> {
  const res = await api.get<Envelope<User>>("/api/users/profile/me");
  return res.data;
}

export async function fetchReceivedCards(
  page = 1,
  limit = 20
): Promise<{ cards: UserCard[]; envelope: ReceivedEnvelope }> {
  const res = await api.get<ReceivedEnvelope>(
    `/api/user-card?page=${page}&limit=${limit}&type=received`
  );
  return { cards: res.data ?? [], envelope: res };
}

export async function fetchInspirationFeed(
  pageNumber = 1,
  pageSize = 20
): Promise<{ cards: UserCard[]; envelope: InspoEnvelope }> {
  const res = await api.get<InspoEnvelope>(
    `/api/user-card/feed?pageNumber=${pageNumber}&pageSize=${pageSize}&inspoOnly=true`
  );
  const data = res.data;
  const cards: UserCard[] = Array.isArray(data) ? data : data?.feed ?? [];
  return { cards, envelope: res };
}

type BookmarkEnvelope = { success: boolean; message?: string };

export async function toggleCardBookmark(cardId: string): Promise<void> {
  await api.post<BookmarkEnvelope>(`/api/bookmarks/${cardId}`);
}

export async function fetchHomePeople(): Promise<HomePeople> {
  const res = await api.get<Envelope<HomePeople>>("/api/homescreen/people/");
  return res.data;
}

// Module-level cache. Screens that already have the full UserCard (e.g. the
// Inspiration carousel) call `seedUserCard` before navigating so the target
// screen can hydrate its prompt synchronously — no post-mount fetch flicker.
const userCardCache = new Map<string, UserCard>();

export function seedUserCard(card: UserCard) {
  if (card?._id) userCardCache.set(card._id, card);
}

export function getCachedUserCard(promptId: string): UserCard | null {
  return userCardCache.get(promptId) ?? null;
}

// Shape used by the Tag People sheet. BE returns slightly different envelopes
// across versions (data.users vs bare data array vs res.data.users), so the
// caller normalizes.
export type FriendUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  epochlagID?: string;
  profilePicture?: string | null;
};

let friendsCache: FriendUser[] | null = null;

// The friend list is sourced from the homescreen "people" endpoint — same
// one ShareModal + Sidebar consume. There is no dedicated /api/users/friends
// endpoint; using it 404'd silently and left the Tag People sheet stuck on
// "Loading friends…". PersonSummary is shape-compatible with FriendUser.
export async function fetchFriends(): Promise<FriendUser[]> {
  if (friendsCache) return friendsCache;
  const people = await fetchHomePeople();
  const list: FriendUser[] = (people?.users ?? []).map((u) => ({
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    epochlagID: u.epochlagID,
    profilePicture: u.profilePicture ?? null,
  }));
  friendsCache = list;
  return list;
}

export async function fetchUserCard(promptId: string): Promise<UserCard> {
  const res = await api.get<Envelope<UserCard>>(`/api/user-card/${promptId}`);
  userCardCache.set(promptId, res.data);
  return res.data;
}

export async function fetchDockingFeed(
  language = "en",
  limit = 20
): Promise<DockingItem[]> {
  try {
    const res = await api.post<Envelope<{ items: DockingItem[] }>>(
      "/api/docking-station/feed",
      { language, limit }
    );
    return res.data?.items ?? [];
  } catch {
    // Proxy soft-fails to empty; treat network errors the same. Consumers
    // hold prior data via the module cache in the page component.
    return [];
  }
}

export async function updateDockingItemProgress(
  cardId: string,
  progressStatus: DockingProgressStatus
): Promise<void> {
  await api.post(`/api/docking-station/cards/${cardId}/progress`, {
    progressStatus,
  });
}

export async function fetchRecentStories(
  limit = 10
): Promise<RecentStory[]> {
  try {
    const res = await api.get<Envelope<Record<string, unknown>>>(
      `/api/stories?sortBy=latestActivity&sortOrder=desc&limit=${limit}`
    );
    const raw = res.data ?? {};
    // BE varies between `threads` and `promptCards` depending on filter mode;
    // both mean the same thing here — a list of Recent Story items.
    return (
      (raw.threads as RecentStory[] | undefined) ??
      (raw.promptCards as RecentStory[] | undefined) ??
      []
    );
  } catch {
    return [];
  }
}

// Notifications moved to src/lib/notifications/api.ts — richer surface (mark
// seen, clear all, docking enrichment, friend-request respond). Import from
// there.

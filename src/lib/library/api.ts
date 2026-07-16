import { api } from "../api/client";

type Envelope<T> = { success: boolean; message?: string; data: T };

// The /api/stories response varies in shape between filter modes: some
// return `threads`, some return `promptCards`, and Deleted mode returns
// `deletedStories`. Accept any and normalize on the caller side.
export type LibraryPerson = {
  _id?: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
};

export type LibraryStoryMedia = {
  type?: "image" | "video" | "audio" | string;
  url?: string | null;
};

export type LibraryThread = {
  _id: string;
  promptCard?: {
    _id?: string;
    content?: string | null;
    title?: string | null;
    imageUrl?: string | null;
    tags?: string[];
  } | null;
  latestStory?: {
    _id?: string;
    title?: string | null;
    content?: string | null;
    media?: LibraryStoryMedia[];
  } | null;
  people?: LibraryPerson[];
  totalPeople?: number;
  totalStories?: number;
  mediaIndicators?: {
    hasImages?: boolean;
    hasVideo?: boolean;
    hasAudio?: boolean;
  };
  isBookmarked?: boolean;
  isLiked?: boolean;
  isPrivate?: boolean;
  isSent?: boolean;
  hasNewStory?: boolean;
  displayDate?: string | null;
  latestActivity?: string | null;
  hiddenAt?: string | null;
};

export type Pagination = {
  currentPage?: number;
  pageNumber?: number;
  totalPages?: number;
  totalItems?: number;
};

export type StoriesPage = {
  threads: LibraryThread[];
  pagination: Pagination | null;
};

export type StoriesMode =
  | "latest"
  | "myStories"
  | "loved"
  | "deleted"
  | "all";

export type FetchStoriesParams = {
  mode: StoriesMode;
  page?: number;
  limit?: number;
  tags?: string[];
  personId?: string;
  isPrivate?: boolean;
  isBookmark?: boolean;
};

// Mirrors the mobile useStoryEngine query builder — one endpoint, many
// filter combinations. Accepts either `threads` or `promptCards` on the
// response and returns a unified shape.
export async function fetchStories(
  params: FetchStoriesParams
): Promise<StoriesPage> {
  const {
    mode,
    page = 1,
    limit = 10,
    tags,
    personId,
    isPrivate,
    isBookmark,
  } = params;

  const qs = new URLSearchParams();
  qs.set("type", mode);
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  qs.set("sortBy", "latestActivity");
  qs.set("sortOrder", "desc");
  if (personId) qs.set("people", personId);
  if (isPrivate) qs.set("isPrivate", "true");
  if (isBookmark) qs.set("isBookmark", "true");
  if (tags && tags.length > 0) {
    for (const t of tags) qs.append("tag", t.toLowerCase());
  }

  const res = await api.get<Envelope<Record<string, unknown>>>(
    `/api/stories?${qs.toString()}`
  );

  const raw = res.data ?? {};
  const threads =
    (raw.threads as LibraryThread[] | undefined) ??
    (raw.promptCards as LibraryThread[] | undefined) ??
    (raw.deletedStories as LibraryThread[] | undefined) ??
    [];
  const pagination = (raw.pagination as Pagination | undefined) ?? null;

  // Deleted mode: BE sorts by pre-delete latestActivity (stale). Re-sort
  // client-side by most recent hiddenAt so the newest delete shows first.
  if (mode === "deleted") {
    threads.sort((a, b) => {
      const ah = a.hiddenAt ? Date.parse(a.hiddenAt) : 0;
      const bh = b.hiddenAt ? Date.parse(b.hiddenAt) : 0;
      return bh - ah;
    });
  }

  return { threads, pagination };
}

// Batch-delete endpoints. Payload shape differs by filter mode:
// - normal filters (recent, myStories, categories, loved): storyIds
// - deleted filter: storyIds (permanent)
// - album detach: threadIds
export async function deleteStories(storyIds: string[]): Promise<void> {
  await api.post<Envelope<unknown>>(`/api/stories/delete`, { storyIds });
}

export async function permanentDeleteStories(
  storyIds: string[]
): Promise<void> {
  await api.post<Envelope<unknown>>(`/api/stories/permanent-delete`, {
    storyIds,
  });
}

// Best-effort side effect on normal delete: clear the underlying prompt
// from the For-You feed so deleted stories' source prompts don't linger.
export async function removeCardFromFeed(cardId: string): Promise<void> {
  await api.post<Envelope<unknown>>(`/api/user-card/remove-from-feed`, {
    cardId,
  });
}

export const STORY_TAGS = [
  "Adventure",
  "Career",
  "Childhood",
  "Education",
  "Family",
  "Food",
  "Friendship",
  "Hobby",
  "Holiday",
  "Humor",
  "Lessons",
  "Life Update",
  "Love",
  "Nostalgia",
  "Parenting",
  "Pets",
  "Siblings",
] as const;

export type StoryTag = (typeof STORY_TAGS)[number];

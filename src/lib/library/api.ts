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
  search?: string;
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
    search,
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
  if (search && search.trim()) qs.set("search", search.trim());
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

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export type AlbumParticipant = {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
  epochlagID?: string | null;
  role?: "creator" | "participant" | string;
};

export type Album = {
  _id: string;
  title: string;
  description?: string | null;
  isPrivate?: boolean;
  totalThreads?: number;
  totalImages?: number;
  totalVideos?: number;
  topImages?: string[];
  participants?: AlbumParticipant[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export function albumCreatorId(album: Album): string | null {
  const creator = album.participants?.find((p) => p.role === "creator");
  return creator?._id ?? null;
}

export type ListAlbumsParams = {
  page?: number;
  limit?: number;
};

// Module-scoped cache of the last-seen album summaries, keyed by id.
// The detail metadata endpoint (GET /api/albums/:id) returns 400 on some
// albums for reasons we can't fix from the client; mirroring the mobile
// pattern, we seed the detail page from this cache and treat the metadata
// fetch as a refresh-only step.
const albumCache = new Map<string, Album>();

export function getCachedAlbum(albumId: string): Album | null {
  return albumCache.get(albumId) ?? null;
}

export function primeAlbumCache(albums: Album[]) {
  for (const a of albums) albumCache.set(a._id, a);
}

export async function fetchAlbums(
  params: ListAlbumsParams = {}
): Promise<Album[]> {
  const { page = 1, limit = 20 } = params;
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: "latestActivity",
    sortOrder: "desc",
  });
  const res = await api.get<Envelope<{ albums?: Album[] }>>(
    `/api/albums?${qs.toString()}`
  );
  const albums = res.data?.albums ?? [];
  primeAlbumCache(albums);
  return albums;
}

export async function createAlbum(title: string): Promise<Album> {
  const body = new URLSearchParams({ title });
  const res = await api.post<Envelope<{ album: Album }>>(`/api/albums`, body);
  return res.data.album;
}

export async function deleteAlbum(albumId: string): Promise<void> {
  await api.delete<Envelope<unknown>>(`/api/albums/${albumId}`);
}

// BE quirk: leave uses GET (Albums list); DELETE variant also exists but
// the mobile list surface uses GET, so we mirror that for parity.
export async function leaveAlbum(albumId: string): Promise<void> {
  await api.get<Envelope<unknown>>(`/api/albums/${albumId}/leave`);
}

// Full album detail. Adds `author` (creator) alongside participants;
// participants includes creator with role: "creator".
export type AlbumDetail = Album & {
  author?: AlbumParticipant | null;
  photoCount?: number;
  videoCount?: number;
};

export async function fetchAlbum(albumId: string): Promise<AlbumDetail> {
  const res = await api.get<Envelope<{ album: AlbumDetail }>>(
    `/api/albums/${albumId}`
  );
  const detail = res.data.album;
  albumCache.set(detail._id, detail);
  return detail;
}

// Threads inside an album. BE returns them under data.album.storyThreads,
// but older/variant responses may surface them as data.threads or
// data.promptCards — accept any, normalize the way mobile does.
export async function fetchAlbumThreads(
  albumId: string,
  params: { page?: number; limit?: number } = {}
): Promise<StoriesPage> {
  const { page = 1, limit = 10 } = params;
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: "latestActivity",
    sortOrder: "desc",
  });
  const res = await api.get<Envelope<Record<string, unknown>>>(
    `/api/albums/${albumId}/threads?${qs.toString()}`
  );
  const raw = res.data ?? {};
  const nested =
    (raw.album as { storyThreads?: LibraryThread[] } | undefined)
      ?.storyThreads;
  const threads =
    nested ??
    (raw.threads as LibraryThread[] | undefined) ??
    (raw.promptCards as LibraryThread[] | undefined) ??
    [];
  // Album threads carry `participants` while /api/stories returns `people`.
  // Coerce so downstream StoryCard finds the avatar in its expected slot.
  const normalized = threads.map((t) => {
    if (t.people && t.people.length > 0) return t;
    const parts = (t as unknown as { participants?: LibraryPerson[] })
      .participants;
    if (parts && parts.length > 0) {
      return { ...t, people: parts, totalPeople: t.totalPeople ?? parts.length };
    }
    return t;
  });
  const pagination = (raw.pagination as Pagination | undefined) ?? null;
  return { threads: normalized, pagination };
}

export async function renameAlbum(
  albumId: string,
  title: string
): Promise<void> {
  const body = new URLSearchParams({ title });
  await api.put<Envelope<unknown>>(`/api/albums/${albumId}`, body);
}

export async function addAlbumParticipants(
  albumId: string,
  userIds: string[]
): Promise<void> {
  await api.post<Envelope<unknown>>(`/api/albums/${albumId}/participants`, {
    userIds,
  });
}

export async function attachAlbumThreads(
  albumId: string,
  threadIds: string[]
): Promise<void> {
  await api.post<Envelope<unknown>>(`/api/albums/${albumId}/threads`, {
    threadIds,
  });
}

export async function detachAlbumThreads(
  albumId: string,
  threadIds: string[]
): Promise<void> {
  await api.post<Envelope<unknown>>(`/api/albums/${albumId}/threads/remove`, {
    threadIds,
  });
}

// Backfill helper — album-threads responses can arrive with missing prompt
// title/content. Mirrors mobile's per-thread refetch of the story's prompt.
// Returns null on failure so callers can carry on with "Untitled story".
export async function fetchThreadPromptTitle(
  threadId: string
): Promise<{ title: string | null; isTitleAvailable: boolean } | null> {
  try {
    const res = await api.get<
      Envelope<{
        thread?: {
          prompt?: {
            title?: string | null;
            content?: string | null;
            isTitleAvailable?: boolean;
          };
        };
      }>
    >(`/api/stories/thread/${threadId}?page=1&limit=1`);
    const prompt = res.data?.thread?.prompt;
    if (!prompt) return null;
    return {
      title: prompt.title ?? prompt.content ?? null,
      isTitleAvailable: !!prompt.isTitleAvailable,
    };
  } catch {
    return null;
  }
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

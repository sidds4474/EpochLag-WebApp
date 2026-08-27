import { api } from "../api/client";
import type { PersonLike, GroupDetail } from "../connections/api";

type Envelope<T> = { success: boolean; message?: string; data: T };

export type PromptSearchResult = {
  _id: string;
  coverImage?: string | null;
  totalStories?: number;
  isBookmarked?: boolean;
  promptCard?: {
    _id?: string;
    title?: string | null;
    content?: string | null;
    imageUrl?: string | null;
    isTitleAvailable?: boolean;
  } | null;
  latestStory?: {
    title?: string | null;
    content?: string | null;
  } | null;
  people?: PersonLike[];
  participants?: PersonLike[];
  title?: string | null;
};

export type PersonSearchResult = {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  epochlagID?: string | null;
  username?: string | null;
  profilePicture?: string | null;
  updatedAt?: string | null;
};

export async function searchStories(query: string): Promise<PromptSearchResult[]> {
  const q = encodeURIComponent(query);
  const res = await api.get<Envelope<{ promptCards?: PromptSearchResult[] }>>(
    `/api/stories?search=${q}&page=1&limit=10&sortBy=latestActivity&sortOrder=desc`
  );
  return res.data?.promptCards ?? [];
}

export async function searchUsers(query: string): Promise<PersonSearchResult[]> {
  const q = encodeURIComponent(query);
  const res = await api.get<Envelope<PersonSearchResult[]>>(
    `/api/users/search?page=1&limit=10&query=${q}`
  );
  return res.data ?? [];
}

export function normalizeQuery(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

export function filterGroupsByQuery(
  groups: GroupDetail[],
  query: string
): GroupDetail[] {
  const q = query.toLowerCase();
  if (!q) return [];
  return groups.filter((g) => {
    if (g.name?.toLowerCase().includes(q)) return true;
    return (g.members ?? []).some((m) =>
      `${m.firstName ?? ""} ${m.lastName ?? ""}`.toLowerCase().includes(q)
    );
  });
}

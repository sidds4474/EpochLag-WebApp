import { api } from "../api/client";

type Envelope<T> = { success: boolean; message?: string; data: T };

export type TimelinePerson = {
  _id?: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
};

export type TimelineEntry = {
  threadId: string;
  promptCard?: {
    _id?: string;
    content?: string | null;
    title?: string | null;
    imageUrl?: string | null;
    author?: TimelinePerson | null;
  } | null;
  latestStory?: {
    _id?: string;
    title?: string | null;
    content?: string | null;
    dateOfStory?: string | null;
    createdAt?: string | null;
    coverImage?: string | null;
  } | null;
  people?: TimelinePerson[];
  coverImage?: string | null;
  isBookmarked?: boolean;
  content?: string | null;
};

export type TimelineYearBucket = {
  year: number;
  stories: TimelineEntry[];
};

export type TimelineResponse = {
  timelineData: TimelineYearBucket[];
};

export function yearOf(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

export async function fetchTimeline(params?: {
  userId?: string;
  groupId?: string;
}): Promise<TimelineYearBucket[]> {
  const url = params?.groupId
    ? `/api/stories/timeline?groupId=${encodeURIComponent(params.groupId)}`
    : params?.userId
      ? `/api/stories/timeline/${encodeURIComponent(params.userId)}`
      : `/api/stories/timeline`;
  const res = await api.get<Envelope<TimelineResponse>>(url);
  return res.data?.timelineData ?? [];
}

export async function hideTimelineStory(
  storyId: string,
  targetUserId: string
): Promise<void> {
  await api.post<Envelope<unknown>>(`/api/stories/timeline/hide`, {
    storyId,
    targetUserId,
  });
}

// Collapses thread duplicates (BE returns one row per reply) and re-buckets
// each cover into the year of its own dateOfStory, not the reply's createdAt.
export function dedupeTimelineByThread(
  yearBuckets: TimelineYearBucket[]
): TimelineYearBucket[] {
  if (!Array.isArray(yearBuckets) || yearBuckets.length === 0) return [];

  const coverByThread = new Map<string, TimelineEntry>();
  for (const bucket of yearBuckets) {
    for (const entry of bucket.stories || []) {
      const threadId = entry?.threadId;
      if (!threadId) continue;
      const existing = coverByThread.get(threadId);
      const createdAt = entry?.latestStory?.createdAt;
      if (!existing) {
        coverByThread.set(threadId, entry);
        continue;
      }
      const existingCreated = existing.latestStory?.createdAt;
      if (createdAt && existingCreated && createdAt < existingCreated) {
        coverByThread.set(threadId, entry);
      }
    }
  }

  const bucketsByYear = new Map<number, TimelineEntry[]>();
  for (const cover of coverByThread.values()) {
    const targetYear =
      yearOf(cover?.latestStory?.dateOfStory) ??
      yearOf(cover?.latestStory?.createdAt);
    if (targetYear == null) continue;
    if (!bucketsByYear.has(targetYear)) bucketsByYear.set(targetYear, []);
    bucketsByYear.get(targetYear)!.push(cover);
  }

  const out: TimelineYearBucket[] = [];
  for (const [year, stories] of bucketsByYear.entries()) {
    stories.sort((a, b) => {
      const da = a?.latestStory?.dateOfStory || a?.latestStory?.createdAt || "";
      const db = b?.latestStory?.dateOfStory || b?.latestStory?.createdAt || "";
      return db.localeCompare(da);
    });
    out.push({ year, stories });
  }
  out.sort((a, b) => b.year - a.year);
  return out;
}

export function stripHidden(
  data: TimelineYearBucket[],
  hidden: Set<string>
): TimelineYearBucket[] {
  if (hidden.size === 0) return data;
  return data
    .map((yd) => ({
      ...yd,
      stories: yd.stories.filter(
        (s) => !hidden.has(String(s?.latestStory?._id ?? ""))
      ),
    }))
    .filter((yd) => yd.stories.length > 0);
}

export function applyTimelineSearch(
  data: TimelineYearBucket[],
  query: string
): TimelineYearBucket[] {
  const q = query.trim().toLowerCase();
  if (!q) return data;
  return data
    .map((yd) => ({
      ...yd,
      stories: yd.stories.filter((item) => {
        const content = (
          item?.promptCard?.content?.trim() ||
          item?.latestStory?.title?.trim() ||
          item?.content?.trim() ||
          ""
        ).toLowerCase();
        const participants = item.people ?? [];
        const participantsMatch = participants.some((p) =>
          `${p.firstName ?? ""} ${p.lastName ?? ""}`
            .toLowerCase()
            .includes(q)
        );
        return content.includes(q) || participantsMatch;
      }),
    }))
    .filter((yd) => yd.stories.length > 0);
}

export function timelineTitle(entry: TimelineEntry): string {
  return (
    entry?.promptCard?.content?.trim() ||
    entry?.latestStory?.title?.trim() ||
    entry?.content?.trim() ||
    "Untitled story"
  );
}

export function timelineCover(entry: TimelineEntry): string | null {
  return (
    entry.coverImage ||
    entry.promptCard?.imageUrl ||
    entry.latestStory?.coverImage ||
    null
  );
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
];

export function timelineDateParts(
  entry: TimelineEntry
): { day: string; month: string } | null {
  const iso = entry.latestStory?.dateOfStory || entry.latestStory?.createdAt;
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTHS_SHORT[d.getUTCMonth()] ?? "";
  return { day, month };
}

// Shape returned by GET /api/lags/this-week and GET /api/lags?month=M&year=Y.
// BE returns two arrays — the calendar (lag.lags) and the promptCards for
// the stories behind each lag — joined client-side by storyThread._id.

import type { Story } from "../../types/story";

export type PromptCardAuthor = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
};

// The /api/lags response wraps each thread like this:
//   { _id, promptCard: { imageUrl, title, ... }, latestStory: { content, createdAt, ... }, people: [...] }
// Keep the legacy `coverImageUrl` / `stories` / `content` paths as optional
// so `useDailyEntries` stays compatible with the simpler shapes that older
// endpoints may still return.
export type PromptCard = {
  _id: string;
  content?: string;
  createdAt?: string;
  dateOfStory?: string;
  coverImageUrl?: string | null;
  author?: PromptCardAuthor;
  stories?: Story[];
  isBookmarked?: boolean;

  // /api/lags shape
  promptCard?: {
    _id?: string;
    content?: string | null;
    title?: string | null;
    imageUrl?: string | null;
    coverVideo?: string | null;
  };
  latestStory?: {
    _id?: string;
    content?: string;
    createdAt?: string;
    media?: Story["media"];
    coverImageUrl?: string | null;
  };
  people?: PromptCardAuthor[];
  totalPeople?: number;
  latestActivity?: string;
};

// The lag row's embedded storyThread may be a bare ID, null, or a fully
// populated PromptCard-ish object (BE sometimes returns the thread here
// even when the top-level promptCards[] is empty).
export type LagRow = {
  date: string; // UTC ISO midnight — the calendar day the lag is FOR
  storyThread?: string | PromptCard | null;
  // When the lag row was actually recorded. BE sometimes serializes this
  // as `createdAt`; keep both so the join doesn't drop it.
  laggedAt?: string;
  createdAt?: string;
};

export type LagsResponse = {
  data?: {
    promptCards?: PromptCard[];
    lag?: {
      range?: "week" | "month";
      lags?: LagRow[];
    };
  };
};

export type DailyMode = "write" | "audio" | "video";
export type DailyTheme = "scrapbook" | "editorial" | "bonfire" | null;

// Client-reshaped entry keyed by YYYY-MM-DD.
export type DailyEntry = {
  iso: string;
  threadId: string;
  thread: PromptCard | null;
  content: string;
  mode: DailyMode;
  theme: DailyTheme;
  coverUrl: string | null;
  // When the lag was recorded (backfill-aware). Falls back to `iso` when
  // the BE row didn't carry a separate creation timestamp.
  laggedAt: string | null;
};

export type DailyEntryMap = { [iso: string]: DailyEntry };

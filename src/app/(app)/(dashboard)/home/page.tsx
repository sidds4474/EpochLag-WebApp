"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { ApiError } from "../../../../lib/api/client";
import { shareUserCard } from "../../../../lib/create/api";
import {
  fetchDockingFeed,
  fetchRecentStories,
  type DockingItem,
  type RecentStory,
} from "../../../../lib/home/api";
import ShareModal from "../new-story/ShareModal";
import HeroGreeting from "./HeroGreeting";
import RemindersRow from "./RemindersRow";
import RecentStoriesRow from "./RecentStoriesRow";
import ResourcesRow from "./ResourcesRow";
import OnThisDayCard from "./OnThisDayCard";

// Module-level cache. Two invariants come from the mobile port:
//   * dayKey is the LOCAL YYYY-MM-DD stamp — card-of-the-day is date-scoped,
//     so a day flip forces a refetch even if the 5-min TTL hasn't expired.
//   * loadedAt drives a 5-min foreground TTL to catch mid-day BE publishes
//     when the tab has been backgrounded.
let cachedDocking: DockingItem[] | null = null;
let cachedStories: RecentStory[] | null = null;
let cachedDayKey: string | null = null;
let loadedAt = 0;
let inFlight = false;
const FRESHNESS_MS = 5 * 60_000;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomePage() {
  const { user } = useAuth();
  const firstName = (user?.firstName || "").trim();

  const [docking, setDocking] = useState<DockingItem[] | null>(cachedDocking);
  const [stories, setStories] = useState<RecentStory[] | null>(cachedStories);
  const [loading, setLoading] = useState(cachedDocking === null);
  const [shareTarget, setShareTarget] = useState<RecentStory | null>(null);
  const localFlight = useRef(false);

  // Share targets the underlying prompt via /api/user-card/:promptId/share
  // — matches the mobile RecentStoriesCarousel path. NOT /api/stories/:id/share.
  // BE bug workaround: /share overwrites the prompt's `note` column when
  // omitted, so we always send an empty string so BE doesn't null it out.
  const sharePromptId = shareTarget?.promptCard?._id ?? "";

  async function handleShareSend(
    userIds: string[],
    sendSeparately: boolean,
    _note: string,
    _isPrivate: boolean,
    groupIds: string[]
  ) {
    if (!sharePromptId) return;
    try {
      await shareUserCard(sharePromptId, {
        shareWith: userIds,
        groupIds,
        sendSeparately,
        note: "",
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      toast.error(message);
      throw new Error(message);
    }
  }

  useEffect(() => {
    const key = todayKey();
    const stale =
      cachedDocking === null ||
      cachedStories === null ||
      cachedDayKey !== key ||
      Date.now() - loadedAt > FRESHNESS_MS;
    if (!stale) return;
    if (inFlight || localFlight.current) return;
    inFlight = true;
    localFlight.current = true;

    Promise.allSettled([fetchDockingFeed("en", 20), fetchRecentStories(10)])
      .then(([dRes, sRes]) => {
        if (dRes.status === "fulfilled") {
          cachedDocking = dRes.value;
          setDocking(dRes.value);
        } else if (cachedDocking === null) {
          setDocking([]);
        }
        if (sRes.status === "fulfilled") {
          cachedStories = sRes.value;
          setStories(sRes.value);
        } else if (cachedStories === null) {
          setStories([]);
        }
        cachedDayKey = key;
        loadedAt = Date.now();
      })
      .finally(() => {
        setLoading(false);
        inFlight = false;
        localFlight.current = false;
      });
  }, []);

  return (
    <div className="px-[12px] md:px-[20px] lg:px-[24px] pt-[4px] pb-[24px] md:pb-[40px]">
      <HeroGreeting firstName={firstName} />

      <OnThisDayCard story={pickOnThisDay(stories)} yearsAgo={1} />

      <RemindersRow items={docking} loading={loading} />
      <RecentStoriesRow
        stories={stories}
        loading={loading}
        onShare={(s) => setShareTarget(s)}
      />
      <ResourcesRow />

      <ShareModal
        open={shareTarget !== null}
        title="Send story to"
        shareContext="story"
        showMessageInput={false}
        onClose={() => setShareTarget(null)}
        onSend={handleShareSend}
      />
    </div>
  );
}

function pickOnThisDay(stories: RecentStory[] | null): RecentStory | null {
  if (!stories) return null;
  const today = new Date();
  const m = today.getMonth();
  const d = today.getDate();
  const y = today.getFullYear();
  for (const s of stories) {
    const iso = s.latestActivity || s.createdAt;
    if (!iso) continue;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) continue;
    if (dt.getMonth() === m && dt.getDate() === d && dt.getFullYear() < y) {
      return s;
    }
  }
  return null;
}

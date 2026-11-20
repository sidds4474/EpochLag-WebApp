"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  fetchHomeConversations,
  type HomeConversationsResponse,
} from "../../../../lib/home/api";
import HeroBanner from "./HeroBanner";
import ConversationsList from "./ConversationsList";
import DailyLagCard from "./DailyLagCard";
import InspirationCard from "./InspirationCard";

// Module-level freshness cache — first mount per-session fetches, subsequent
// mounts within 5 minutes reuse the cached response so tab switches feel
// instant. A refresh beyond the TTL re-fetches in the background.
let cachedConversations: HomeConversationsResponse | null = null;
let loadedAt = 0;
const FRESHNESS_MS = 5 * 60_000;

export default function HomePage() {
  const { user } = useAuth();
  const firstName = (user?.firstName || "").trim();
  const [conversations, setConversations] =
    useState<HomeConversationsResponse | null>(cachedConversations);
  const [loading, setLoading] = useState(cachedConversations === null);
  const inFlight = useRef(false);

  useEffect(() => {
    const fresh = Date.now() - loadedAt < FRESHNESS_MS;
    if (cachedConversations !== null && fresh) {
      setConversations(cachedConversations);
      setLoading(false);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    // Laptop shows up to 4 rows; smaller viewports hide 3rd/4th via CSS. We
    // fetch all 4 in one call rather than re-fetching on resize.
    fetchHomeConversations(4)
      .then((res) => {
        cachedConversations = res;
        loadedAt = Date.now();
        setConversations(res);
      })
      .catch(() => {
        setConversations({ cards: [], conversationSource: "received" });
      })
      .finally(() => {
        inFlight.current = false;
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-[#F3F1EB] min-h-full">
      <div className="mx-auto max-w-[1400px] px-[16px] sm:px-[24px] md:px-[40px] lg:px-[56px] pt-[16px] md:pt-[20px] pb-[48px] md:pb-[64px]">
        <HeroBanner firstName={firstName} />

        <div className="mt-[32px] md:mt-[40px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-[32px] xl:gap-[48px] items-start">
          <ConversationsList
            data={conversations}
            loading={loading}
            currentUserId={user?._id}
          />

          <div className="flex flex-col gap-[28px] md:gap-[36px] min-w-0">
            <DailyLagCard />
            <InspirationCard />
          </div>
        </div>
      </div>
    </div>
  );
}

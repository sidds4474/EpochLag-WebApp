"use client";

import { useEffect } from "react";

type Props = {
  publicCode: string;
  threadId?: string;
  authorId?: string;
};

const StoryViewAnalytics = ({ publicCode, threadId, authorId }: Props) => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "public_story_page_viewed", {
      public_code: publicCode,
      thread_id: threadId,
      author_id: authorId,
    });
  }, [publicCode, threadId, authorId]);

  return null;
};

export default StoryViewAnalytics;

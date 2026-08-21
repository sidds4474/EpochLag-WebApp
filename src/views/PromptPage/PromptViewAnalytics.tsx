"use client";

import { useEffect } from "react";

type Props = {
  publicCode: string;
  hasStory: boolean;
  authorId?: string;
};

const PromptViewAnalytics = ({ publicCode, hasStory, authorId }: Props) => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "public_prompt_page_viewed", {
      public_code: publicCode,
      has_story: hasStory,
      author_id: authorId,
    });
  }, [publicCode, hasStory, authorId]);

  return null;
};

export default PromptViewAnalytics;

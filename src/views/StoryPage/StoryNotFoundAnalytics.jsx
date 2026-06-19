"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const StoryNotFoundAnalytics = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    const match = pathname?.match(/^\/story\/([^/]+)$/);
    const publicCode = match ? match[1] : null;
    window.gtag("event", "public_story_404", {
      public_code: publicCode,
    });
  }, [pathname]);

  return null;
};

export default StoryNotFoundAnalytics;

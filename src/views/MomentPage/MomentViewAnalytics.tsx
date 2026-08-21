"use client";

import { useEffect } from "react";

type Props = {
  publicCode: string;
  momentType?: string;
};

const MomentViewAnalytics = ({ publicCode, momentType }: Props) => {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "public_moment_page_viewed", {
      public_code: publicCode,
      moment_type: momentType,
    });
  }, [publicCode, momentType]);

  return null;
};

export default MomentViewAnalytics;

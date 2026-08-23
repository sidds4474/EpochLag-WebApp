"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// /interactions is superseded by /studio (with tabs Received / Sent /
// Bookmark / Draft). This page redirects on mount, preserving any
// ?tab= param so legacy links from the Ask/Tell composers keep working.
// The ReplyEditor + interactions/api.ts helpers still live in this
// folder — they're consumed by other routes.
export default function InteractionsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get("tab");
    const qs = tab ? `?tab=${encodeURIComponent(tab)}` : "";
    router.replace(`/studio${qs}`);
  }, [router, searchParams]);
  return null;
}

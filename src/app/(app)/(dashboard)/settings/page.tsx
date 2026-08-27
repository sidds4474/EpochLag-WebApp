"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// On mobile the layout renders the menu on /settings and hides this content.
// On desktop we auto-select Account so the right pane isn't empty on first visit.
export default function SettingsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) {
      router.replace("/settings/account");
    }
  }, [router]);

  return null;
}

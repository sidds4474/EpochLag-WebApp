"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearAllMedia } from "../../../../lib/create/media-storage";
import StoryComposer from "../new-story/StoryComposer";

// Keep in sync with draftKeyFor in StoryComposer.tsx.
function draftKeyFor(
  promptId?: string | null,
  albumId?: string | null
): string {
  if (promptId) return `story-composer-draft-v1:prompt:${promptId}`;
  if (albumId) return `story-composer-draft-v1:album:${albumId}`;
  return "story-composer-draft-v1:blank";
}

export default function NewLagPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const albumId = searchParams.get("albumId");
  const promptId = searchParams.get("promptId");
  const draftId = searchParams.get("draftId");

  // Next 15's router cache keeps the composer's component tree mounted across
  // navigations within the dashboard, so useMemo-based draft hydration doesn't
  // re-run when the user re-enters the composer via Sidebar → Create → Tell.
  // The result is a stale display — the composer shows whatever React held in
  // memory from the previous visit rather than the latest localStorage draft.
  // The sidebar fires "new-story:reset" every time the user clicks Create;
  // bumping this key on that event forces a fresh StoryComposer mount which
  // re-reads localStorage from scratch.
  const [composerKey, setComposerKey] = useState(0);
  useEffect(() => {
    const onReset = () => {
      // Mobile parity: the Sidebar Create button means "start a new Lag".
      // Nuke the local draft + any persisted media so the next composer
      // mount starts empty. The server-side draft (if any) still lives in
      // Studio → Drafts for the user to resume.
      try {
        window.localStorage.removeItem(draftKeyFor(promptId, albumId));
      } catch {
        /* quota / private mode — non-fatal */
      }
      void clearAllMedia();
      setComposerKey((k) => k + 1);
    };
    window.addEventListener("new-story:reset", onReset);
    return () => window.removeEventListener("new-story:reset", onReset);
  }, [promptId, albumId]);

  return (
    <StoryComposer
      key={composerKey}
      albumId={albumId}
      promptId={promptId}
      draftId={draftId}
      onBack={() => {
        if (draftId) router.push("/studio?tab=draft");
        else if (promptId) router.push("/inspiration");
        else if (albumId) router.push(`/albums/${albumId}`);
        else router.push("/new-story");
      }}
    />
  );
}

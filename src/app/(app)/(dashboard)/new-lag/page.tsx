"use client";

import { useRouter, useSearchParams } from "next/navigation";
import StoryComposer from "../new-story/StoryComposer";

export default function NewLagPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const albumId = searchParams.get("albumId");
  const promptId = searchParams.get("promptId");
  const draftId = searchParams.get("draftId");

  return (
    <StoryComposer
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

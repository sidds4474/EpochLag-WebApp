"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import { fetchThread } from "../../../../../lib/interactions/api";
import { parseContentToBlocks } from "../../../../../lib/parseStoryContent";
import type { Story, ThreadResponse } from "../../../../../types/home";
import EditComposer from "./EditComposer";

export default function EditStoryPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  const router = useRouter();

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; story: Story; thread: ThreadResponse }
  >({ kind: "loading" });

  useEffect(() => {
    if (!threadId) {
      setState({ kind: "error", message: "Missing thread reference" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchThread(threadId);
        if (cancelled) return;
        const story = data.stories.find((s) => s._id === storyId);
        if (!story) {
          setState({ kind: "error", message: "Story not found" });
          return;
        }
        setState({ kind: "ready", story, thread: data });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Couldn't load story";
        setState({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storyId, threadId]);

  if (state.kind === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-montserrat text-primary-blue/60 text-[14px]">
          Loading…
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-[12px] px-[24px]">
        <p className="font-montserrat text-primary-blue/70 text-[14px] text-center">
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] rounded-full px-[18px] py-[10px]"
        >
          Go back
        </button>
      </div>
    );
  }

  const { story, thread } = state;
  const blocks = parseContentToBlocks(story.content ?? "");

  return (
    <EditComposer
      storyId={storyId}
      threadId={thread.thread._id}
      threadIsPrivate={!!thread.thread.isPrivate}
      initialTitle={story.title ?? ""}
      initialBlocks={blocks}
      initialDateOfStory={story.dateOfStory ?? null}
      initialLocation={story.location ?? null}
      initialMusic={story.music ?? null}
      onSaved={() => router.replace(`/thread/${thread.thread._id}`)}
      onCancel={() => router.back()}
    />
  );
}

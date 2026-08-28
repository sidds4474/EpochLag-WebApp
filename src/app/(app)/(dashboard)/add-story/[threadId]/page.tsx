"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ApiError } from "../../../../../lib/api/client";
import { fetchThread } from "../../../../../lib/interactions/api";
import type { ThreadResponse } from "../../../../../types/home";
import StoryComposer from "../../new-story/StoryComposer";

// Add-Story-to-existing-thread flow. Composer opens with a locked thread
// cover, the "Finish" button, and a bound threadId — BE appends the new
// story into the thread and auto-fans to its participants.
//
// Fast path: when the caller (ThreadViewer) already has the thread loaded,
// it hands us promptId + cover + thread type via query params so we render
// the composer immediately. Falls back to a fetch when routed here cold
// (e.g. deep link).
export default function AddStoryPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const promptIdFromQuery = searchParams.get("p");
  const coverFromQuery = searchParams.get("cover");
  const isAnswerFromQuery = searchParams.get("answer");

  const hasFastPath = !!promptIdFromQuery && isAnswerFromQuery !== null;

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; thread: ThreadResponse }
  >(hasFastPath ? { kind: "loading" } : { kind: "loading" });

  useEffect(() => {
    if (hasFastPath) return; // no fetch needed
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchThread(threadId);
        if (!cancelled) setState({ kind: "ready", thread: data });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Couldn't load thread";
        setState({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, hasFastPath]);

  // Fast path — render composer immediately from query-provided values.
  if (hasFastPath) {
    return (
      <StoryComposer
        onBack={() => router.back()}
        promptId={promptIdFromQuery}
        replyThreadId={threadId}
        replyThreadCoverUrl={coverFromQuery}
        hidePromptStrip={isAnswerFromQuery !== "1"}
      />
    );
  }

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

  const { thread } = state;
  const promptId = thread.thread.prompt?._id ?? null;

  if (!promptId) {
    return (
      <div className="flex-1 flex items-center justify-center px-[24px]">
        <p className="font-montserrat text-primary-blue/70 text-[14px] text-center">
          Missing prompt reference on this thread.
        </p>
      </div>
    );
  }

  const isAnswerAPrompt = thread.thread.prompt?.isTitleAvailable === false;
  const firstStory = thread.stories?.[0];
  const coverUrl =
    thread.thread.prompt?.imageUrl ??
    firstStory?.coverImage ??
    firstStory?.cover ??
    firstStory?.imageUrl ??
    null;

  return (
    <StoryComposer
      onBack={() => router.back()}
      promptId={promptId}
      replyThreadId={thread.thread._id}
      replyThreadCoverUrl={coverUrl}
      hidePromptStrip={!isAnswerAPrompt}
    />
  );
}

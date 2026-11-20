"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../../../lib/auth/AuthProvider";
import { fetchThread } from "../../../../../../../lib/interactions/api";
import type { ThreadResponse } from "../../../../../../../types/home";
import ThreadViewer from "../../../../../../../views/Thread/ThreadViewerV2";

type ThreadState =
  | { kind: "loading" }
  | { kind: "ready"; data: ThreadResponse }
  | { kind: "error"; message: string };

export default function LagPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string; storyId: string }>();
  const threadId = params?.threadId ?? "";
  const storyId = params?.storyId ?? "";
  const { user } = useAuth();

  const [state, setState] = useState<ThreadState>({ kind: "loading" });
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    setState({ kind: "loading" });

    fetchThread(threadId)
      .then(({ data }) => {
        if (cancelled) return;
        setState({ kind: "ready", data });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Couldn't load the story",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [threadId]);

  // Resolve storyId → index when the payload arrives (and whenever either changes).
  const resolvedIndex = useMemo(() => {
    if (state.kind !== "ready") return 0;
    const i = state.data.stories.findIndex((s) => s._id === storyId);
    return i >= 0 ? i : 0;
  }, [state, storyId]);

  useEffect(() => {
    if (state.kind === "ready") setActiveStoryIndex(resolvedIndex);
  }, [resolvedIndex, state.kind]);

  // When the user pages between stories inside the viewer, reflect it in the URL
  // so refresh / share / back behavior stays coherent.
  function handleSelectIndex(next: number) {
    setActiveStoryIndex(next);
    if (state.kind !== "ready") return;
    const nextStory = state.data.stories[next];
    if (nextStory?._id && nextStory._id !== storyId) {
      router.replace(`/thread/${threadId}/story/${nextStory._id}`);
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-[#F3F1EB]">
      <div className="flex-1 min-h-0 flex flex-col relative">
        {state.kind === "loading" ? (
          <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
            <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
          </div>
        ) : state.kind === "error" ? (
          <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
            <p className="font-montserrat text-primary-blue/60 text-[14px] text-center max-w-[360px]">
              {state.message}
            </p>
          </div>
        ) : (
          <ThreadViewer
            data={state.data}
            activeIndex={activeStoryIndex}
            onSelectIndex={handleSelectIndex}
            currentUser={user}
            onStoryDeleted={(deletedStoryId) => {
              if (state.kind !== "ready") return;
              const remaining = state.data.stories.filter(
                (s) => s._id !== deletedStoryId
              );
              if (remaining.length === 0) {
                if (
                  typeof window !== "undefined" &&
                  window.history.length > 1
                ) {
                  router.back();
                } else {
                  router.push("/home");
                }
                return;
              }
              const nextIndex = Math.min(
                activeStoryIndex,
                remaining.length - 1
              );
              const nextStory = remaining[nextIndex];
              setState({
                kind: "ready",
                data: { ...state.data, stories: remaining },
              });
              setActiveStoryIndex(nextIndex);
              if (nextStory?._id && nextStory._id !== storyId) {
                router.replace(`/thread/${threadId}/story/${nextStory._id}`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

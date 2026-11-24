"use client";

// PromptViewer (ThreadDetail) — prompt-centric hub.
// Shows the question + list of responders. Rows route INTO the lag viewer at
// /thread/:tid/story/:sid. If the thread has no prompt (story-only thread),
// this page redirects to the first story so no broken-hero state renders.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchThread } from "../../../../../lib/interactions/api";
import { fetchUserCard } from "../../../../../lib/home/api";
import { ApiError } from "../../../../../lib/api/client";
import type { ThreadResponse, UserCard } from "../../../../../types/home";
import PromptViewer from "../../../../../views/Thread/PromptViewer";
import { threadHasRealPrompt } from "../../../../../views/Thread/threadPrompt";

type State =
  | { kind: "loading" }
  | { kind: "ready"; data: ThreadResponse }
  | { kind: "error"; message: string };

function userCardToThread(card: UserCard): ThreadResponse {
  const participants = (card.shareWith ?? []).map((u) => ({
    _id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    profilePicture: u.profilePicture,
    role: "recipient" as const,
  }));
  return {
    thread: {
      _id: card._id,
      prompt: {
        _id: card._id,
        content: card.content,
        title: card.title,
        imageUrl: card.imageUrl,
        isTitleAvailable: card.isTitleAvailable,
        note: card.note,
        author: card.author,
      },
      participants,
    },
    stories: [],
    isBookmarked: card.isBookmarked ?? false,
  };
}


export default function PromptViewerPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId ?? "";

  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    setState({ kind: "loading" });

    fetchThread(threadId)
      .then(({ data }) => {
        if (cancelled) return;
        // Story-only thread → bounce to the first story so the lag viewer
        // handles rendering. No prompt hero to render here.
        if (!threadHasRealPrompt(data) && data.stories.length > 0) {
          router.replace(`/thread/${threadId}/story/${data.stories[0]._id}`);
          return;
        }
        setState({ kind: "ready", data });
      })
      .catch(async (threadErr: unknown) => {
        if (cancelled) return;
        // Conversations "askedYou" rows pass a user-card id (not a thread id)
        // because the prompt hasn't been answered yet — no thread exists. Fall
        // back to GET /api/user-card/:id and render a prompt-only hub.
        try {
          const card = await fetchUserCard(threadId);
          if (cancelled) return;
          setState({ kind: "ready", data: userCardToThread(card) });
        } catch {
          if (cancelled) return;
          // When the thread call was a 403, the viewer simply isn't on the
          // thread — the user-card 404 message ("Card not found") is a
          // misleading surface. Prefer the access-denied wording in that case.
          const message =
            threadErr instanceof ApiError && threadErr.status === 403
              ? "You don't have access to this thread."
              : threadErr instanceof Error
                ? threadErr.message
                : "Couldn't load this thread";
          setState({ kind: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [threadId, router]);

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
          <PromptViewer data={state.data} />
        )}
      </div>
    </div>
  );
}

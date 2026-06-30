"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import { fetchThread } from "../../../../../lib/interactions/api";
import type { ThreadResponse } from "../../../../../types/home";
import ThreadViewer from "../../../../../views/Thread/ThreadViewer";
import { ChevronLeftIcon } from "../../icons";

type ThreadState =
  | { kind: "loading" }
  | { kind: "ready"; data: ThreadResponse }
  | { kind: "error"; message: string };

export default function ThreadPage() {
  const router = useRouter();
  const params = useParams<{ threadId: string }>();
  const threadId = params?.threadId ?? "";
  const { user } = useAuth();

  const [state, setState] = useState<ThreadState>({ kind: "loading" });
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    setState({ kind: "loading" });
    setActiveStoryIndex(0);

    fetchThread(threadId)
      .then(({ data, envelope }) => {
        if (cancelled) return;
        console.log("[thread] full response:", envelope);
        setState({ kind: "ready", data });
      })
      .catch((err) => {
        if (cancelled) return;
        console.log("[thread] error:", err);
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

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-[40px] pt-[16px] pb-[8px] shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="cursor-pointer inline-flex items-center gap-[8px] text-primary-blue hover:opacity-80 transition-opacity"
        >
          <span className="w-[32px] h-[32px] rounded-full bg-[#ededed] flex items-center justify-center">
            <ChevronLeftIcon width={18} height={18} />
          </span>
          <span className="font-montserrat font-semibold text-[20px] md:text-[24px] leading-tight">
            Story
          </span>
        </button>
      </div>

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
            onSelectIndex={setActiveStoryIndex}
            currentUser={user}
            compactAuthorRow
          />
        )}
      </div>
    </div>
  );
}

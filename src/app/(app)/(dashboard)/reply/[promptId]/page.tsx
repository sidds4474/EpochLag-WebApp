"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use } from "react";
import ReplyEditor from "../../interactions/ReplyEditor";

export default function ReplyPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = use(params);
  const searchParams = useSearchParams();
  const appendToThreadId = searchParams.get("thread");
  const router = useRouter();

  return (
    <div className="h-full w-full flex justify-center min-h-0">
      <div className="flex-1 max-w-[720px] flex flex-col min-h-0">
        <ReplyEditor
          promptId={promptId}
          appendToThreadId={appendToThreadId}
          onBack={() => router.back()}
          onPublished={(threadId) => {
            if (threadId) router.replace(`/thread/${threadId}`);
            else router.replace("/home");
          }}
        />
      </div>
    </div>
  );
}

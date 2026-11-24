"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AskComposer from "./AskComposer";

export default function NewAskPage() {
  const router = useRouter();
  const params = useSearchParams();
  // When the user arrives from the Inspiration carousel the prompt
  // text is passed verbatim as `?prefill=…`. Back nav returns them
  // to Inspiration in that case so the carousel keeps its scroll
  // position; other entry points fall back to /new-lag.
  const prefill = params.get("prefill") ?? null;
  const source = params.get("source") ?? null;
  const isInspiration = source === "inspiration" || !!prefill;
  return (
    <AskComposer
      prefillQuestion={prefill}
      variant={isInspiration ? "inspiration" : "create"}
      onBack={() => {
        if (isInspiration) {
          router.push("/inspiration");
          return;
        }
        router.push("/new-lag");
      }}
    />
  );
}

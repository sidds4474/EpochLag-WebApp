"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Newsletter unsubscribe landing. Reads `token` from the query string
// and calls the token-scoped GET endpoint. Per the frontend spec doc:
//   - Never accept an email address here (would let anyone unsubscribe
//     anyone; the API 422s on that anyway).
//   - Always render success. Unknown/expired tokens deliberately return
//     200 with the same message — surfacing an "invalid link" branch
//     would confirm to an attacker which tokens are live.
//   - Treat the token as a secret: don't log it or send it to analytics.
// GET is safe to be pre-fetched by mail clients — endpoint is
// idempotent and preserves the original unsubscribe timestamp.

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "done">(
    token ? "loading" : "done"
  );

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    (async () => {
      try {
        await fetch(
          `/api/newsletter/unsubscribe/${encodeURIComponent(token)}`,
          { method: "GET", signal: controller.signal }
        );
      } catch {
        // Deliberately swallow — we never surface errors here.
      } finally {
        setState("done");
      }
    })();
    return () => controller.abort();
  }, [token]);

  return (
    <main className="min-h-screen w-full bg-warm-cream flex items-center justify-center px-[16px] py-[80px]">
      <div className="max-w-[560px] w-full text-center flex flex-col items-center gap-[16px]">
        <span className="w-[56px] h-[56px] rounded-full bg-primary-orange flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h1 className="font-ivy font-bold text-primary-blue text-[32px] md:text-[40px] leading-[110%]">
          You&rsquo;ve been unsubscribed
        </h1>
        <p className="font-montserrat text-primary-blue text-[14px] md:text-[15px] leading-[160%]">
          {state === "loading"
            ? "One moment while we take you off the list…"
            : "Sorry to see you go. You won't receive any more newsletter emails from us."}
        </p>
        <Link
          href="/"
          className="mt-[8px] cursor-pointer bg-primary-blue text-white rounded-full h-[44px] px-[24px] inline-flex items-center font-montserrat font-semibold text-[14px] hover:opacity-90 transition-opacity"
        >
          Back to Epoch Lag
        </Link>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full bg-warm-cream flex items-center justify-center px-[16px] py-[80px]">
          <p className="font-montserrat text-primary-blue/60 text-[14px]">
            Loading…
          </p>
        </main>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}

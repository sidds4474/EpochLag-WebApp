"use client";

import { useEffect } from "react";

export default function StoryRouteError({
  reset,
}: {
  error?: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Errors are reported by Next; nothing else to do here.
  }, []);

  return (
    <main className="min-h-screen bg-warm-cream flex items-center justify-center px-6">
      <div className="max-w-[480px] text-center">
        <h1 className="font-ivy text-primary-blue text-[36px] md:text-[44px] leading-[110%] font-bold">
          Something went wrong
        </h1>
        <p className="mt-[20px] font-montserrat text-primary-blue text-[16px] leading-[160%] opacity-80">
          We couldn&apos;t load this story right now. It might be a temporary
          hiccup on our end.
        </p>
        <button
          onClick={reset}
          className="cursor-pointer mt-[28px] bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] px-[28px] py-[12px] rounded-full hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

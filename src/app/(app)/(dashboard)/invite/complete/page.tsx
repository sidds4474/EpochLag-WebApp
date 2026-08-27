"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import SuccessCelebration from "../../../../../components/SuccessCelebration";

function InviteCompleteInner() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full min-h-0 bg-primary-cream/40 lg:bg-transparent px-[16px] md:px-[32px] pt-[16px] pb-[24px] md:pb-[40px] overflow-y-auto scrollbar-hide">
      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#f0f0f0] hover:bg-black/[0.08] flex items-center justify-center text-primary-blue transition-colors"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="font-montserrat font-bold text-primary-blue text-[20px] md:text-[28px] leading-none">
          Challenge
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-[24px]">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <SuccessCelebration
            title="Challenge completed!"
            titleClassName="font-montserrat font-medium text-primary-blue text-[24px] md:text-[26px] leading-tight text-center"
            titleMarginTop={16}
            childrenClassName="w-full mt-[10px]"
          >
            <div className="flex flex-col items-center gap-[24px]">
              <p className="font-montserrat text-primary-blue/70 text-[13px] md:text-[14px] text-center max-w-[320px]">
                You'll get a free month every time one of your invited friends joins Epoch Lag.
              </p>
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="cursor-pointer bg-primary-orange text-white font-montserrat font-semibold text-[14px] rounded-full px-[48px] py-[12px] hover:brightness-95 transition-[filter]"
              >
                Done
              </button>
            </div>
          </SuccessCelebration>
        </div>
      </div>
    </div>
  );
}

export default function InviteCompletePage() {
  return (
    <Suspense fallback={<div className="h-full" />}>
      <InviteCompleteInner />
    </Suspense>
  );
}

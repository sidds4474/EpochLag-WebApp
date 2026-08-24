"use client";

import { useEffect, useRef } from "react";
import type { LibraryThread } from "../../../../../lib/library/api";
import StoryCard from "../../lags/StoryCard";

type Props = {
  firstName: string;
  loading: boolean;
  stories: LibraryThread[];
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  showSendPrompt: boolean;
  onSendPrompt: () => void;
};

// Shared stories block — heading + one of three states:
//   • Loading: three skeleton cards
//   • Empty: gray card with "No Lags shared" + optional "Send prompt"
//   • Populated: 1-col (mobile) / 2-col (md+) grid of StoryCards with
//     infinite scroll via IntersectionObserver on a tail sentinel
export default function SharedStoriesSection({
  firstName,
  loading,
  stories,
  loadingMore,
  hasMore,
  onLoadMore,
  showSendPrompt,
  onSendPrompt,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <section className="mt-[24px] md:mt-[32px]">
      <h3 className="font-montserrat font-bold text-primary-blue text-[16px] md:text-[18px] mb-[12px] md:mb-[16px]">
        Shared with {firstName || "them"}
      </h3>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[16px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[200px] md:h-[220px] rounded-[16px] bg-[#f3f3f3] animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && stories.length === 0 && (
        <GrayEmptyCard
          firstName={firstName}
          showSendPrompt={showSendPrompt}
          onSendPrompt={onSendPrompt}
        />
      )}

      {!loading && stories.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-[12px] md:gap-[16px]">
            {stories.map((thread) => (
              <StoryCard key={thread._id} thread={thread} />
            ))}
          </div>
          <div ref={sentinelRef} className="h-[1px] w-full" aria-hidden />
          {loadingMore && (
            <div className="py-[16px] flex justify-center">
              <span className="w-[22px] h-[22px] rounded-full border-2 border-primary-blue/20 border-t-primary-blue animate-spin" />
            </div>
          )}
        </>
      )}
    </section>
  );
}

// The "no shared lags yet" empty state. Muted beige card with a
// centered glyph, muted copy, and — only for connections — an orange
// Send Prompt CTA that pre-seeds this user as the recipient on the
// composer.
function GrayEmptyCard({
  firstName,
  showSendPrompt,
  onSendPrompt,
}: {
  firstName: string;
  showSendPrompt: boolean;
  onSendPrompt: () => void;
}) {
  return (
    <div className="bg-[#EDEDED] rounded-[16px] px-[24px] py-[40px] md:py-[48px] flex flex-col items-center gap-[14px] text-center">
      <SharedContentIcon width={32} height={32} />
      <p className="font-montserrat text-[14px]" style={{ color: "#092E4A" }}>
        No Lags shared
      </p>
      {showSendPrompt && (
        <button
          type="button"
          onClick={onSendPrompt}
          className="cursor-pointer bg-primary-orange text-white rounded-full h-[44px] px-[24px] font-montserrat font-semibold text-[14px] hover:brightness-95 transition-[filter]"
        >
          Send prompt to {firstName || "them"}
        </button>
      )}
    </div>
  );
}

function SharedContentIcon({ width = 41, height = 41 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30.75 13.668C30.75 15.5549 29.2203 17.0846 27.3334 17.0846C25.4464 17.0846 23.9167 15.5549 23.9167 13.668C23.9167 11.781 25.4464 10.2513 27.3334 10.2513C29.2203 10.2513 30.75 11.781 30.75 13.668Z" fill="#092E4A"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M20.402 2.13672H20.598C24.5415 2.1367 27.632 2.13668 30.0433 2.46087C32.5114 2.7927 34.4589 3.48515 35.9875 5.01379C37.5162 6.54242 38.2086 8.48996 38.5405 10.958C38.8646 13.3693 38.8646 16.4598 38.8646 20.4033V20.5541C38.8646 23.8149 38.8646 26.4844 38.6875 28.6578C38.5096 30.842 38.1449 32.6671 37.3286 34.1829C36.9686 34.8515 36.5262 35.4502 35.9875 35.9888C34.4589 37.5175 32.5114 38.2099 30.0433 38.5417C27.632 38.8659 24.5415 38.8659 20.598 38.8659H20.402C16.4585 38.8659 13.3681 38.8659 10.9568 38.5417C8.48868 38.2099 6.54114 37.5175 5.0125 35.9888C3.65732 34.6336 2.95748 32.9469 2.58533 30.8545C2.21974 28.7991 2.15287 26.2418 2.13897 23.0663C2.13544 22.2586 2.13544 21.4043 2.13544 20.503V20.4033C2.13542 16.4598 2.1354 13.3693 2.45959 10.958C2.79141 8.48996 3.48387 6.54242 5.0125 5.01379C6.54114 3.48515 8.48868 2.7927 10.9568 2.46087C13.3681 2.13668 16.4585 2.1367 20.402 2.13672ZM11.2982 5.00052C9.11428 5.29414 7.79763 5.85258 6.82447 6.82575C5.8513 7.79891 5.29286 9.11556 4.99924 11.2995C4.70066 13.5203 4.69794 16.4385 4.69794 20.5013C4.69794 20.9976 4.69794 21.4776 4.69852 21.9423L6.4088 20.4458C7.96555 19.0837 10.3118 19.1618 11.7745 20.6245L19.1028 27.9528C20.2768 29.1268 22.1249 29.2868 23.4833 28.3322L23.9927 27.9742C25.9474 26.6004 28.5921 26.7596 30.368 28.3579L35.2033 32.7096C35.6901 31.6875 35.9791 30.3444 36.1335 28.4497C36.3011 26.3921 36.3021 23.8255 36.3021 20.5013C36.3021 16.4385 36.2994 13.5203 36.0008 11.2995C35.7072 9.11556 35.1487 7.79891 34.1756 6.82575C33.2024 5.85258 31.8858 5.29414 29.7018 5.00052C27.481 4.70194 24.5628 4.69922 20.5 4.69922C16.4372 4.69922 13.519 4.70194 11.2982 5.00052Z" fill="#092E4A"/>
    </svg>
  );
}

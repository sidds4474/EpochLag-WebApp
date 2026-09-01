"use client";

import { bustUrl } from "../../lib/images";
import type { UserCard } from "../../types/home";

// Small preview card rendered inside the Send-to drawer when the share
// subject is a prompt. Matches the Figma: outer white card with an inset
// image (rounded, framed by white padding), "{author} asks" label, prompt
// text, and a chevron circle bottom-right. Purely presentational.
export default function PromptPreviewCard({ card }: { card: UserCard }) {
  const author = card.author;
  const authorLabel = author?.firstName
    ? `${author.firstName} asks`
    : "Someone asks";
  const cover = card.imageUrl ? bustUrl(card.imageUrl, null) : null;
  const text = card.content ?? card.title ?? "";

  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[16px] bg-white shadow-[0_0_27.115px_0_rgba(0,0,0,0.25)] p-[10px]">
      {cover ? (
        <div className="w-full aspect-[16/7] rounded-[12px] overflow-hidden bg-primary-blue/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <div className="flex items-end gap-[10px] px-[6px] pt-[10px] pb-[6px]">
        <div className="flex-1 min-w-0">
          <p className="font-montserrat text-primary-blue/60 text-[11px] leading-[13px] mb-[4px]">
            {authorLabel}
          </p>
          <p className="font-montserrat font-semibold text-primary-blue text-[13px] leading-[17px] line-clamp-3">
            {text}
          </p>
        </div>
        <span className="shrink-0 w-[26px] h-[26px] rounded-full bg-[#EDEDED] flex items-center justify-center text-primary-blue">
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

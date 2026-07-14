"use client";

import { useState } from "react";
import { ApiError } from "../../../../lib/api/client";
import { shareStory } from "../../../../lib/create/api";
import ShareModal from "./ShareModal";

type Props = {
  storyId: string;
  onDone: () => void;
};

export default function StoryCreatedOverlay({ storyId, onDone }: Props) {
  const [shareOpen, setShareOpen] = useState(false);

  async function handleSend(
    userIds: string[],
    sendSeparately: boolean,
    _note: string,
    _isPrivate: boolean,
    groupIds: string[]
  ) {
    try {
      await shareStory(storyId, { userIds, groupIds, sendSeparately });
      // Navigate to the created thread after the modal shows its "Sent"
      // confirmation and auto-closes.
      setTimeout(() => onDone(), 1600);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      throw new Error(message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#f7ecd8] flex items-center justify-center px-[24px]">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        <SuccessArt />
        <h2 className="mt-[32px] font-montserrat font-bold text-primary-blue text-[28px] leading-tight">
          Story Created!
        </h2>

        <div className="mt-[36px] w-full flex items-center gap-[12px]">
          <button
            type="button"
            onClick={onDone}
            className="cursor-pointer flex-1 bg-white text-primary-blue font-montserrat font-semibold text-[15px] rounded-full py-[12px] border border-primary-blue/20 hover:bg-black/[0.03] transition-colors"
          >
            Done
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="cursor-pointer flex-1 bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[12px] hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        title="Send story to"
        shareContext="story"
        showMessageInput={false}
        onClose={() => setShareOpen(false)}
        onSend={handleSend}
      />
    </div>
  );
}

function SuccessArt() {
  return (
    <svg
      width="260"
      height="220"
      viewBox="0 0 260 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* confetti dots */}
      <circle cx="60" cy="60" r="6" fill="#FCD6A5" />
      <circle cx="215" cy="65" r="5" fill="#EF9849" />
      <circle cx="230" cy="130" r="6" fill="#FCD6A5" />
      <circle cx="45" cy="150" r="5" fill="#EF9849" />
      <circle cx="90" cy="185" r="4" fill="#FCD6A5" />
      <circle cx="200" cy="180" r="4" fill="#FCD6A5" />

      {/* sparkles */}
      <path
        d="M40 90 l4 -8 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 z"
        fill="#1D3557"
      />
      <path
        d="M220 100 l3 -6 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 z"
        fill="#1D3557"
      />
      <g stroke="#1D3557" strokeWidth="2" strokeLinecap="round">
        <line x1="130" y1="10" x2="130" y2="22" />
        <line x1="115" y1="18" x2="122" y2="26" />
        <line x1="145" y1="18" x2="138" y2="26" />
      </g>

      {/* concentric circles */}
      <circle cx="130" cy="110" r="70" fill="#FCD6A5" />
      <circle cx="130" cy="110" r="52" fill="#EF9849" />
      <circle cx="130" cy="110" r="36" fill="#D95F3B" />

      {/* checkmark */}
      <polyline
        points="112,112 126,126 150,100"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

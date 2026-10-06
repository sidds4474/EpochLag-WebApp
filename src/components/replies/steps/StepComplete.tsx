'use client';

import { useState } from 'react';
import { ReplyShell } from '@/components/replies/ReplyShell';
import DownloadModal from '@/views/StoryPage/components/DownloadModal';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/utils/storeLinks';
import type { Platform } from '@/types/story';

const PEACH = '#FCD6A5';
const ORANGE = '#EF9849';
const TERRACOTTA = '#D95F3B';

type Props = {
  senderName: string;
  platform: Platform;
  publicCode: string;
  /** Where "See the story" should navigate. Backend returns this via
   *  publicUrl; falls back to `/<targetType>/<publicCode>`. */
  viewUrl: string;
};

export function StepComplete({ senderName, platform, publicCode, viewUrl }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  void viewUrl; // reserved for product — Figma complete screen offers Download / Website only

  const handleDownload = () => {
    if (platform === 'ios') {
      window.location.href = APP_STORE_URL;
    } else if (platform === 'android') {
      window.location.href = PLAY_STORE_URL;
    } else {
      setModalOpen(true);
    }
  };

  const headline = senderName
    ? `Your story was sent to ${senderName}!`
    : 'Your story was sent!';

  return (
    <ReplyShell>
      {/* Top Epoch Lag logo (matches Figma) */}
      <div className="flex justify-center pt-6 sm:pt-8 pb-2">
        <div className="flex items-center gap-2">
          <ConcentricCirclesIcon size={22} />
          <span className="font-lora text-[20px] text-primary-blue leading-none">
            epoch lag
          </span>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-8 gap-5">
        {/* Success icon — orange concentric circles with checkmark */}
        <div
          style={{ width: 100, height: 100, position: 'relative', flexShrink: 0 }}
          aria-hidden="true"
        >
          <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="50" fill={PEACH} />
            <circle cx="50" cy="50" r="36" fill={ORANGE} />
            <circle cx="50" cy="50" r="22" fill={TERRACOTTA} />
            {/* Checkmark */}
            <polyline
              points="37,51 46,60 63,41"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        <h2 className="font-lora font-medium text-[24px] text-[#151515] text-center leading-[120%] max-w-[260px]">
          {headline}
        </h2>

        <p className="font-plus-jakarta text-[16px] text-black text-center max-w-[300px] leading-[150%]">
          Get more out of Epoch Lag by downloading the app, or visit our website to learn more.
        </p>
      </main>

      {/* Sticky footer with the two CTAs */}
      <div className="flex-shrink-0 pb-8 sm:pb-10 flex flex-col gap-3 w-full max-w-[380px] mx-auto">
        <button
          type="button"
          onClick={handleDownload}
          className="w-full bg-primary-orange text-primary-white font-plus-jakarta text-[16px] px-6 py-[16px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity leading-none"
        >
          Download the app
        </button>

        <a
          href="/"
          className="w-full border-[1.5px] border-primary-blue bg-transparent text-[#2c2c2c] font-plus-jakarta text-[16px] px-6 py-[16px] rounded-full text-center hover:bg-primary-blue/5 active:bg-primary-blue/10 transition-colors leading-none"
        >
          Visit Epoch Lag website
        </a>
      </div>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        publicCode={publicCode}
        trackEvent="reply_complete_download_clicked"
        position="reply_complete"
      />
    </ReplyShell>
  );
}

/** Small 3-ring concentric circles icon in orange tones for the top logo. */
function ConcentricCirclesIcon({ size }: { size: number }) {
  const PEACH_C = '#FCD6A5';
  const ORANGE_C = '#EF9849';
  const TERRA_C = '#D95F3B';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill={PEACH_C} />
      <circle cx="12" cy="12" r="8.5" fill={ORANGE_C} />
      <circle cx="12" cy="12" r="5" fill={TERRA_C} />
    </svg>
  );
}

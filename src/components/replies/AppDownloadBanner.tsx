'use client';

import { useState } from 'react';
import DownloadModal from '@/views/StoryPage/components/DownloadModal';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/utils/storeLinks';
import type { Platform } from '@/types/story';

type Props = {
  platform: Platform;
  publicCode: string;
  /** When true, hides the Download button (e.g. story landing already has a CTA below) */
  hideDownloadButton?: boolean;
};

export function AppDownloadBanner({ platform, publicCode, hideDownloadButton = false }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleDownloadClick = () => {
    if (platform === 'ios') {
      window.location.href = APP_STORE_URL;
    } else if (platform === 'android') {
      window.location.href = PLAY_STORE_URL;
    } else {
      // desktop → show QR modal
      setModalOpen(true);
    }
  };

  return (
    <>
      <div className="w-full bg-[#E6E3D9] shadow-[0_6px_13.4px_rgba(0,0,0,0.15)]">
        <div className="w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] mx-auto h-[66px] flex items-center px-4 sm:px-6 lg:px-8">
          {/* Icon tile */}
          <div className="w-[50px] h-[50px] rounded-[9px] bg-white flex items-center justify-center flex-shrink-0">
            <ConcentricCirclesIcon size={39} />
          </div>

          {/* Name */}
          <span className="ml-[14px] font-plus-jakarta font-medium text-[14px] text-primary-blue leading-none">
            Epoch Lag app
          </span>

          {/* Download pill */}
          {!hideDownloadButton && (
            <button
              type="button"
              onClick={handleDownloadClick}
              className="ml-auto h-[32px] px-[19px] rounded-[16px] bg-primary-blue text-white font-plus-jakarta font-medium text-[14px] leading-none hover:opacity-90 active:opacity-80 transition-opacity"
            >
              Download
            </button>
          )}
        </div>
      </div>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        publicCode={publicCode}
        trackEvent="reply_banner_download_clicked"
        position="reply_banner"
      />
    </>
  );
}

/** Decorative 3-ring concentric circles icon in orange tones */
function ConcentricCirclesIcon({ size }: { size: number }) {
  const PEACH = '#FCD6A5';
  const ORANGE = '#EF9849';
  const TERRACOTTA = '#D95F3B';

  return (
    <div
      style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill={PEACH} />
        <circle cx="12" cy="12" r="8.5" fill={ORANGE} />
        <circle cx="12" cy="12" r="5" fill={TERRACOTTA} />
      </svg>
    </div>
  );
}

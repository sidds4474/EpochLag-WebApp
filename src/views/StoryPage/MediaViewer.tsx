'use client';

import { useEffect, useState } from 'react';
import HlsVideo from './HlsVideo';
import { toResponsiveImage } from '@/lib/cloudinary';

type MediaItem = { type: 'image' | 'video'; url: string };

type Props = {
  isOpen: boolean;
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  alt?: string;
};

export default function MediaViewer({
  isOpen,
  items,
  initialIndex,
  onClose,
  alt,
}: Props) {
  const [index, setIndex] = useState(initialIndex);

  // Reset when (re)opened
  useEffect(() => {
    if (isOpen) setIndex(initialIndex);
  }, [isOpen, initialIndex]);

  // Lock body scroll; wire keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight')
        setIndex((i) => Math.min(items.length - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, items.length, onClose]);

  if (!isOpen) return null;
  const current = items[index];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center">
      {/* Click-outside to close (covers full viewport, media sits above) */}
      <button
        type="button"
        aria-label="Close media viewer"
        onClick={onClose}
        className="absolute inset-0"
      />

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:bg-white/30 transition-colors z-10"
      >
        <XIcon />
      </button>

      {/* Prev / Next (only when multiple) */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(0, i - 1));
            }}
            disabled={index === 0}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10"
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.min(items.length - 1, i + 1));
            }}
            disabled={index === items.length - 1}
            aria-label="Next"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-10"
          >
            <ChevronIcon dir="right" />
          </button>
        </>
      )}

      {/* Media (clicks here don't close) */}
      <div
        className="relative z-[1] max-w-[92vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === 'image' ? (
          <img
            src={toResponsiveImage(current.url, 1600) ?? current.url}
            alt={alt || 'Story media'}
            className="max-w-[92vw] max-h-[85vh] object-contain"
          />
        ) : (
          <HlsVideo
            key={current.url}
            src={current.url}
            controls
            autoPlay
            muted
            playsInline
            preload="auto"
            className="max-w-[92vw] max-h-[85vh]"
          />
        )}
      </div>

      {/* Index pill */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 text-white font-plus-jakarta text-[13px] px-3 py-1.5 rounded-full z-10">
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

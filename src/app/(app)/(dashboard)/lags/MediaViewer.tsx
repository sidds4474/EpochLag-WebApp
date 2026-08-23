"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { bustUrl } from "../../../../lib/images";
import { mediaTileThreadId, type MediaTile } from "../../../../lib/library/api";

type MediaViewerProps = {
  tiles: MediaTile[];
  initialIndex: number;
  onClose: () => void;
};

function authorName(tile: MediaTile): string {
  const a = tile.story.author;
  if (!a) return "";
  const full = `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim();
  return full || "";
}

export default function MediaViewer({
  tiles,
  initialIndex,
  onClose,
}: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const tile = tiles[index];
  const canPrev = index > 0;
  const canNext = index < tiles.length - 1;

  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : i));
  }, []);
  const goNext = useCallback(() => {
    setIndex((i) => (i < tiles.length - 1 ? i + 1 : i));
  }, [tiles.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!tile) return null;

  const name = authorName(tile);
  const caption = tile.story.title?.trim();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="cursor-pointer absolute top-[20px] right-[20px] w-[40px] h-[40px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </button>

      {(() => {
        const threadId = mediaTileThreadId(tile);
        if (!threadId) return null;
        return (
          <Link
            href={`/thread/${threadId}`}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-[20px] left-[20px] font-montserrat text-white text-[13px] px-[14px] py-[8px] rounded-full bg-white/15 hover:bg-white/25 transition-colors"
          >
            Open story
          </Link>
        );
      })()}

      {canPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous"
          className="cursor-pointer absolute left-[20px] top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {canNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next"
          className="cursor-pointer absolute right-[20px] top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-[16px]"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaBody tile={tile} />
        {(caption || name) && (
          <div className="text-center max-w-[80vw]">
            {caption && (
              <p className="font-montserrat font-semibold text-white text-[16px] leading-[22px]">
                {caption}
              </p>
            )}
            {name && (
              <p className="font-montserrat text-white/70 text-[13px] leading-[18px] mt-[2px]">
                {name}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaBody({ tile }: { tile: MediaTile }) {
  const { type, url } = tile.media;
  if (type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bustUrl(url, undefined)}
        alt=""
        className="max-w-[90vw] max-h-[75vh] object-contain rounded-[12px]"
      />
    );
  }
  if (type === "video") {
    return (
      <video
        src={url}
        controls
        autoPlay
        playsInline
        className="max-w-[90vw] max-h-[75vh] rounded-[12px] bg-black"
      />
    );
  }
  return (
    <div className="min-w-[320px] px-[24px] py-[32px] bg-white/10 rounded-[16px] flex flex-col items-center gap-[16px]">
      <div className="w-[80px] h-[80px] rounded-full bg-primary-orange/20 flex items-center justify-center">
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v18M8 7v10M16 7v10M4 10v4M20 10v4"
            stroke="#F5A623"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <audio src={url} controls autoPlay className="w-[320px]" />
    </div>
  );
}

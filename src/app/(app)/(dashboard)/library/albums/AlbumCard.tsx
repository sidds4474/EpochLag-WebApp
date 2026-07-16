"use client";

import Link from "next/link";
import { PersonIcon } from "../../icons";
import { bustUrl } from "../../../../../lib/images";
import type { Album } from "../../../../../lib/library/api";

type AlbumCardProps = {
  album: Album;
  isEditing?: boolean;
  selected?: boolean;
  onToggleSelect?: (album: Album) => void;
};

// Three grid permutations by image count, matching the mobile spec:
//   1 image  → one full-bleed tile
//   2 images → two side-by-side halves
//   3+       → 1 large left + 2 stacked right (only first 3 used)
// Fixed height (~180px) keeps rows aligned regardless of image count.
function Tile({ src, className = "" }: { src: string; className?: string }) {
  // min-h-0/min-w-0 override grid items' default min-content sizing so an
  // intrinsically-large <img> doesn't force the row taller than h-[180px].
  return (
    <div
      className={`relative overflow-hidden rounded-[8px] bg-primary-blue/8 min-h-0 min-w-0 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bustUrl(src, undefined)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function CoverMosaic({ images }: { images: string[] }) {
  if (images.length === 0) {
    return <div className="h-[180px] rounded-[8px] bg-primary-blue/8" />;
  }
  if (images.length === 1) {
    return <Tile src={images[0]} className="h-[180px]" />;
  }
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-[6px] h-[180px]">
        <Tile src={images[0]} />
        <Tile src={images[1]} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-[6px] h-[180px]">
      <Tile src={images[0]} className="row-span-2" />
      <Tile src={images[1]} />
      <Tile src={images[2]} />
    </div>
  );
}

export default function AlbumCard({
  album,
  isEditing = false,
  selected = false,
  onToggleSelect,
}: AlbumCardProps) {
  const participantCount = album.participants?.length ?? 0;
  const stories = album.totalThreads ?? 0;
  const photos = album.totalImages ?? 0;
  const videos = album.totalVideos ?? 0;

  const content = (
    <div
      className={`relative flex flex-col bg-white rounded-[22px] shadow-[0_0_18px_rgba(0,0,0,0.15)] hover:shadow-[0_0_22px_rgba(0,0,0,0.22)] transition-shadow p-[16px] gap-[10px] ${
        selected ? "ring-2 ring-primary-orange" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-[12px]">
        <div className="min-w-0">
          <p className="font-montserrat font-semibold text-primary-blue text-[16px] leading-[20px] truncate">
            {album.title}
          </p>
          <p className="mt-[2px] font-montserrat text-primary-blue/70 text-[12px] leading-[16px]">
            {stories} {stories === 1 ? "story" : "stories"} · {photos}{" "}
            {photos === 1 ? "photo" : "photos"} · {videos}{" "}
            {videos === 1 ? "video" : "videos"}
          </p>
        </div>
        {participantCount > 0 && (
          <div className="shrink-0 bg-[#ededed] rounded-full px-[10px] py-[4px] flex items-center gap-[4px]">
            <PersonIcon width={12} height={12} />
            <span className="font-montserrat font-medium text-primary-blue text-[12px] leading-[16px]">
              {participantCount}
            </span>
          </div>
        )}
      </div>

      <CoverMosaic
        images={(album.topImages ?? []).filter((u) => /^https?:\/\//.test(u))}
      />

      {isEditing && (
        <span
          className={`absolute top-[10px] right-[10px] w-[26px] h-[26px] rounded-full flex items-center justify-center border-2 transition-colors ${
            selected
              ? "bg-primary-orange border-primary-orange text-white"
              : "bg-white/95 border-white text-transparent shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
          }`}
          aria-hidden
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12l5 5L20 7"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </div>
  );

  if (isEditing) {
    return (
      <button
        type="button"
        onClick={() => onToggleSelect?.(album)}
        className="text-left cursor-pointer"
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={`/library/albums/${album._id}`} className="block">
      {content}
    </Link>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bustUrl } from "../../../../lib/images";
import {
  fetchMediaGalleryByType,
  fetchMediaGalleryOverview,
  type MediaBucketType,
  type MediaGalleryOverview,
  type MediaTile,
} from "../../../../lib/library/api";
import { parseContentToBlocks } from "../../../../lib/parseStoryContent";
import MediaViewer from "./MediaViewer";

const DETAIL_PAGE_SIZE = 20;

let overviewCache: MediaGalleryOverview | null = null;

function derivePoster(url: string): string {
  return url.replace(/\.(mp4|mov|avi|webm)(\?.*)?$/i, ".jpg$2");
}

function firstTextBlock(content?: string | null): string {
  if (!content) return "";
  const blocks = parseContentToBlocks(content);
  const t = blocks.find((b) => b.type === "text");
  if (t && "text" in t) return (t as { text: string }).text;
  return "";
}

function captionFor(tile: MediaTile): string {
  const t = tile.story.title?.trim();
  if (t) return t;
  const body = firstTextBlock(tile.story.content).trim();
  if (body) return body;
  return tile.media.type === "audio" ? "Audio Recording" : "";
}

function ImageTile({ tile, onOpen }: { tile: MediaTile; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block aspect-square rounded-[14px] overflow-hidden bg-primary-blue/10 shadow-[0_0_10px_rgba(0,0,0,0.08)] hover:shadow-[0_0_14px_rgba(0,0,0,0.15)] transition-shadow cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bustUrl(tile.media.url, undefined)}
        alt={captionFor(tile)}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
    </button>
  );
}

function VideoTile({ tile, onOpen }: { tile: MediaTile; onOpen: () => void }) {
  const poster = tile.media.thumbnailUrl || derivePoster(tile.media.url);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block aspect-square rounded-[14px] overflow-hidden bg-primary-blue/10 shadow-[0_0_10px_rgba(0,0,0,0.08)] hover:shadow-[0_0_14px_rgba(0,0,0,0.15)] transition-shadow cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bustUrl(poster, undefined)}
        alt={captionFor(tile)}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-[46px] h-[46px] rounded-full bg-white/85 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path d="M8 5v14l11-7z" fill="#092E4A" />
          </svg>
        </span>
      </span>
    </button>
  );
}

function AudioTile({ onOpen }: { tile: MediaTile; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block aspect-square rounded-[14px] overflow-hidden bg-[#EDEDED] hover:bg-[#E4E4E4] transition-colors cursor-pointer"
    >
      <span className="absolute inset-0 flex items-center justify-center">
        <AudioWaveform />
      </span>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-[38px] h-[38px] rounded-full bg-primary-blue flex items-center justify-center">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path d="M8 5v14l11-7z" fill="white" />
          </svg>
        </span>
      </span>
    </button>
  );
}

function AudioWaveform() {
  const bars = [10, 22, 34, 46, 30, 18, 40, 52, 28, 14, 36, 48, 24, 32, 20];
  return (
    <svg
      viewBox="0 0 200 60"
      className="w-[75%] h-[55%] text-primary-orange"
      preserveAspectRatio="none"
      aria-hidden
    >
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 13 + 4}
          y={30 - h / 2}
          width={6}
          height={h}
          rx={3}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function Tile({ tile, onOpen }: { tile: MediaTile; onOpen: () => void }) {
  if (tile.media.type === "image") return <ImageTile tile={tile} onOpen={onOpen} />;
  if (tile.media.type === "video") return <VideoTile tile={tile} onOpen={onOpen} />;
  return <AudioTile tile={tile} onOpen={onOpen} />;
}

function TileSkeleton() {
  return (
    <div className="aspect-square rounded-[14px] bg-primary-blue/[0.08] animate-pulse" />
  );
}

function SectionStrip({
  title,
  tiles,
  onViewAll,
  onOpen,
  loading,
}: {
  title: string;
  tiles: MediaTile[];
  onViewAll: () => void;
  onOpen: (index: number) => void;
  loading: boolean;
}) {
  const visible = tiles.slice(0, 5);
  return (
    <section>
      <div className="flex items-center justify-between mb-[12px]">
        <h3 className="font-montserrat font-semibold text-primary-blue text-[18px]">
          {title}
        </h3>
        <button
          type="button"
          onClick={onViewAll}
          className="cursor-pointer font-montserrat text-primary-blue text-[13px] hover:opacity-80 transition-opacity"
        >
          View All
        </button>
      </div>
      <div className="grid grid-cols-5 gap-[16px]">
        {loading && tiles.length === 0
          ? Array.from({ length: 5 }).map((_, i) => <TileSkeleton key={i} />)
          : visible.map((t, i) => (
              <Tile key={t.mediaId} tile={t} onOpen={() => onOpen(i)} />
            ))}
      </div>
    </section>
  );
}

function Overview({
  onOpenBucket,
}: {
  onOpenBucket: (type: MediaBucketType) => void;
}) {
  const [data, setData] = useState<MediaGalleryOverview | null>(overviewCache);
  const [loading, setLoading] = useState(!overviewCache);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    tiles: MediaTile[];
    index: number;
  } | null>(null);

  useEffect(() => {
    if (overviewCache) return;
    let cancelled = false;
    fetchMediaGalleryOverview(10)
      .then((res) => {
        if (cancelled) return;
        overviewCache = res;
        setData(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load media");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
        {error}
      </p>
    );
  }

  const openInSection = (bucket: MediaTile[]) => (index: number) =>
    setViewer({ tiles: bucket.slice(0, 5), index });

  return (
    <div className="flex flex-col gap-[32px]">
      <SectionStrip
        title="Images"
        tiles={data?.images ?? []}
        onViewAll={() => onOpenBucket("image")}
        onOpen={openInSection(data?.images ?? [])}
        loading={loading}
      />
      <SectionStrip
        title="Video"
        tiles={data?.videos ?? []}
        onViewAll={() => onOpenBucket("video")}
        onOpen={openInSection(data?.videos ?? [])}
        loading={loading}
      />
      <SectionStrip
        title="Audio"
        tiles={data?.audios ?? []}
        onViewAll={() => onOpenBucket("audio")}
        onOpen={openInSection(data?.audios ?? [])}
        loading={loading}
      />
      {viewer && (
        <MediaViewer
          tiles={viewer.tiles}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

function Detail({
  type,
  onBack,
}: {
  type: MediaBucketType;
  onBack: () => void;
}) {
  const [tiles, setTiles] = useState<MediaTile[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const { tiles: fresh, pagination } = await fetchMediaGalleryByType(
          type,
          nextPage,
          DETAIL_PAGE_SIZE
        );
        setTiles((prev) => {
          const seen = new Set(prev.map((t) => t.mediaId));
          return [...prev, ...fresh.filter((t) => !seen.has(t.mediaId))];
        });
        setPage(nextPage);
        const currentPageNum = pagination?.currentPage ?? nextPage;
        const totalPages = pagination?.totalPages ?? 1;
        setHasMore(
          pagination ? currentPageNum < totalPages : fresh.length === DETAIL_PAGE_SIZE
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load media");
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [type]
  );

  useEffect(() => {
    setTiles([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, [type]);

  useEffect(() => {
    if (page !== 0) return;
    loadPage(1);
  }, [page, loadPage]);

  useEffect(() => {
    if (!hasMore || page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) {
          loadPage(page + 1);
        }
      },
      { root, rootMargin: "300px 0px 300px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, page, loading, loadPage]);

  const heading =
    type === "image" ? "Images" : type === "video" ? "Videos" : "Audio";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-[12px] mb-[16px]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#EDEDED] hover:bg-[#E0E0E0] flex items-center justify-center transition-colors"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="#092E4A"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h3 className="font-montserrat font-semibold text-primary-blue text-[20px]">
          {heading}
        </h3>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto pb-[28px] scrollbar-hide"
      >
        {error ? (
          <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
            {error}
          </p>
        ) : tiles.length === 0 && loading ? (
          <div className="grid grid-cols-5 gap-[16px]">
            {Array.from({ length: 10 }).map((_, i) => (
              <TileSkeleton key={i} />
            ))}
          </div>
        ) : tiles.length === 0 && !loading ? (
          <p className="font-montserrat text-primary-blue/60 text-[14px] mt-[8px]">
            No {heading.toLowerCase()} yet.
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-[16px]">
            {tiles.map((t, i) => (
              <Tile
                key={t.mediaId}
                tile={t}
                onOpen={() => setViewerIndex(i)}
              />
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-[1px]" />
        {loading && tiles.length > 0 && (
          <div className="flex justify-center mt-[16px]">
            <div className="w-[20px] h-[20px] border-[2px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
          </div>
        )}
      </div>
      {viewerIndex !== null && (
        <MediaViewer
          tiles={tiles}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}

export default function MediaTypePanel() {
  const [selectedType, setSelectedType] = useState<MediaBucketType | null>(
    null
  );

  if (selectedType) {
    return (
      <Detail type={selectedType} onBack={() => setSelectedType(null)} />
    );
  }

  return <Overview onOpenBucket={setSelectedType} />;
}

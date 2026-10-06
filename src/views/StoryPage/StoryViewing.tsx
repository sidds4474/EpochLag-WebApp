'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CommentsSheet from './CommentsSheet';
import MediaViewer from './MediaViewer';
import { videoThumbnailUrl } from './HlsVideo';
import { parseContentToBlocks } from '@/lib/parseStoryContent';
import { toResponsiveImage } from '@/lib/cloudinary';
import { bustUrl } from '@/lib/images';
import { getInitials } from '@/lib/formatters';
import type { Story, StoryAuthor, StoryMedia } from '@/types/story';

type FlowBlock = { type: 'text'; text: string } | { type: 'audio'; url: string };
type GridMedia = { type: 'image' | 'video'; url: string };

type Props = {
  story: Story;
  author?: StoryAuthor & { profilePicture?: string | null };
  onBack: () => void;
  // Static placeholder data — swap for BE when `GET /api/public/story/:code`
  // starts returning participants + totals.
  participants?: { avatarUrl?: string | null; initials?: string }[];
  participantsOverflow?: number;
  totalComments?: number;
  totalLikes?: number;
  isLovedByMe?: boolean;
};

export default function StoryViewing({
  story,
  author,
  onBack,
  participants = STATIC_PARTICIPANTS,
  participantsOverflow = 4,
  totalComments = 6,
  totalLikes = 6,
  isLovedByMe = false,
}: Props) {
  const router = useRouter();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const blocks = parseContentToBlocks(story.content || '');

  const goToSignUp = () => {
    if (typeof window === 'undefined') return;
    const returnTo = window.location.pathname + window.location.search;
    router.push(`/signup?returnTo=${encodeURIComponent(returnTo)}`);
  };

  // Walk blocks in document order: text + audio go in the reading flow,
  // images + videos get collected for the bottom grid.
  const flowBlocks: FlowBlock[] = [];
  const gridMedia: GridMedia[] = [];
  blocks.forEach((b) => {
    if (b.type === 'text' && b.text?.trim()) {
      flowBlocks.push({ type: 'text', text: b.text });
    } else if (b.type === 'audio') {
      flowBlocks.push({ type: 'audio', url: b.url });
    } else if (b.type === 'image' || b.type === 'video') {
      gridMedia.push({ type: b.type, url: b.url });
    }
  });

  // Legacy fallbacks from story.media[] when content tags are absent
  const legacyMedia = (story.media || []).filter(
    (m: StoryMedia) => !m?.url?.includes('_cover.jpg')
  );
  if (gridMedia.length === 0) {
    legacyMedia.forEach((m) => {
      if (m?.type === 'image' || m?.type === 'video') {
        gridMedia.push({ type: m.type, url: m.url });
      }
    });
  }
  if (!flowBlocks.some((f) => f.type === 'audio')) {
    legacyMedia.forEach((m) => {
      if (m?.type === 'audio') flowBlocks.push({ type: 'audio', url: m.url });
    });
  }

  const authorName = author?.firstName || 'EpochLag user';
  const location = story.location || '';

  return (
    <div className="bg-warm-cream min-h-screen flex flex-col">
      <div className="w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-[96px] flex-1">
        {/* Top row: back arrow */}
        <div className="pt-2 pb-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#092E4A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
        </div>

        {/* Author row with Sign up pill */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {author?.profilePicture ? (
              <img
                src={bustUrl(author.profilePicture, undefined)}
                alt={`${authorName}'s profile`}
                className="w-11 h-11 rounded-full object-cover bg-primary-cream flex-shrink-0"
                loading="lazy"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary-orange text-white font-plus-jakarta font-semibold text-[14px] flex items-center justify-center flex-shrink-0">
                {getInitials(author?.firstName, author?.lastName)}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <div className="font-lora text-[16px] text-primary-blue truncate">
                {authorName}
              </div>
              {location && (
                <div className="font-plus-jakarta text-[13px] text-primary-blue/60 truncate mt-[2px]">
                  {location}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={goToSignUp}
            className="flex-shrink-0 flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#E6E3D9] text-primary-blue font-plus-jakarta text-[13px] hover:opacity-90 active:opacity-80 transition-opacity"
          >
            Sign up to add Story
            <PlusIcon />
          </button>
        </div>

        {/* Title */}
        {story.title && (
          <h1 className="font-lora text-[26px] sm:text-[28px] lg:text-[32px] text-primary-blue leading-[115%] mb-4">
            {story.title}
          </h1>
        )}

        {/* Body: text paragraphs + inline audio in document order */}
        {flowBlocks.length > 0 && (
          <div className="space-y-4">
            {flowBlocks.map((b, i) =>
              b.type === 'text' ? (
                <p
                  key={`t-${i}`}
                  className="font-plus-jakarta text-primary-blue text-[15px] sm:text-[16px] lg:text-[17px] leading-[160%] whitespace-pre-line"
                >
                  {b.text}
                </p>
              ) : (
                <AudioPlayer key={`a-${i}`} src={b.url} />
              )
            )}
          </div>
        )}

        {/* Media grid — tap to open full viewer */}
        {gridMedia.length > 0 && (
          <div className={`mt-6 grid gap-2 ${gridMedia.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {gridMedia.map((m, i) => (
              <button
                type="button"
                key={`${m.url}-${i}`}
                onClick={() => setViewerIndex(i)}
                aria-label={m.type === 'video' ? 'Play video' : 'Open image'}
                className="relative aspect-[4/5] rounded-[12px] overflow-hidden bg-primary-cream focus:outline-none focus:ring-2 focus:ring-primary-blue/40"
              >
                {m.type === 'image' ? (
                  <img
                    src={toResponsiveImage(m.url, 600) ?? undefined}
                    alt={story.title || 'Story media'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <>
                    <img
                      src={videoThumbnailUrl(m.url)}
                      alt={story.title || 'Video thumbnail'}
                      className="w-full h-full object-cover pointer-events-none"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/15 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-black/55 text-white flex items-center justify-center">
                        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 3l14 9-14 9V3z" />
                        </svg>
                      </div>
                    </div>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sticky footer bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-warm-cream border-t border-primary-blue/10">
        <div className="w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Avatar stack + overflow */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {participants.slice(0, 3).map((p, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-warm-cream overflow-hidden bg-primary-orange flex items-center justify-center text-white font-plus-jakarta text-[10px] font-semibold"
                >
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.initials || '?'
                  )}
                </div>
              ))}
            </div>
            {participantsOverflow > 0 && (
              <span className="ml-2 font-plus-jakarta text-[13px] text-primary-blue">
                +{participantsOverflow}
              </span>
            )}
          </div>

          {/* Reactions */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="flex items-center gap-1.5 text-primary-blue hover:opacity-70 active:opacity-50 transition-opacity"
              aria-label={`${totalComments} comments`}
            >
              <CommentIcon />
              <span className="font-plus-jakarta text-[14px]">{totalComments}</span>
            </button>
            <button
              type="button"
              onClick={goToSignUp}
              className="flex items-center gap-1.5 text-primary-blue hover:opacity-70 active:opacity-50 transition-opacity"
              aria-label={isLovedByMe ? 'Unlike' : 'Like'}
            >
              <HeartIcon filled={isLovedByMe} />
              <span className="font-plus-jakarta text-[14px]">{totalLikes}</span>
            </button>
          </div>
        </div>
      </div>

      <CommentsSheet
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onSignUp={goToSignUp}
      />

      <MediaViewer
        isOpen={viewerIndex !== null}
        items={gridMedia}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
        alt={story.title}
      />
    </div>
  );
}

// Static placeholder avatars — remove once BE returns participant data
const STATIC_PARTICIPANTS: { avatarUrl?: string | null; initials?: string }[] = [
  { initials: 'S' },
  { initials: 'M' },
  { initials: 'N' },
];

// Static waveform decoration — pseudo-random heights.
// A real amplitude analysis could replace this later.
const WAVEFORM_HEIGHTS = Array.from({ length: 60 }, (_, i) =>
  Math.round(8 + Math.abs(Math.sin(i * 0.7) + Math.cos(i * 0.4)) * 12)
);

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? currentTime / duration : 0;
  const playedBars = Math.round(progress * WAVEFORM_HEIGHTS.length);

  return (
    <div className="bg-white rounded-[16px] h-[71px] px-4 flex items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-[35px] h-[35px] rounded-full bg-primary-orange text-white flex items-center justify-center flex-shrink-0 hover:opacity-90 active:opacity-80 transition-opacity"
      >
        {isPlaying ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform (click to seek) */}
      <div
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        onClick={seek}
        className="flex-1 h-full flex items-center justify-between cursor-pointer"
      >
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full ${
              i < playedBars ? 'bg-primary-orange' : 'bg-primary-blue'
            }`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* Duration */}
      <span className="font-plus-jakarta font-medium text-[16px] text-[#565656] tabular-nums flex-shrink-0">
        {formatSecs(duration)}
      </span>
    </div>
  );
}

function formatSecs(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const whole = Math.floor(s);
  const m = Math.floor(whole / 60);
  const sec = whole % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function PlusIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

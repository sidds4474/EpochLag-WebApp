'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getInitials } from '@/lib/formatters';
import {
  COMMENTS_FETCH_STATUS,
  fetchStoryComments,
} from '@/lib/storyApi';
import type {
  CommentPagination,
  PublicComment,
} from '@/types/story';

// Spec: 60/min/IP shared across public reads. Stable toast id so a user
// retrying rapidly only ever sees one toast instance queued at a time.
const RATE_LIMIT_TOAST_ID = 'public-story-rate-limited';

function surfaceRateLimitToast() {
  toast('Too many requests — try again in a minute.', {
    id: RATE_LIMIT_TOAST_ID,
    duration: 4000,
  });
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  publicCode?: string;
  storyId?: string;
  totalComments: number;
};

type LoadState = 'idle' | 'loading' | 'ok' | 'empty' | 'not_found' | 'rate_limited' | 'error';

export default function CommentsSheet({
  isOpen,
  onClose,
  onSignUp,
  publicCode,
  storyId,
  totalComments,
}: Props) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [pagination, setPagination] = useState<CommentPagination | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [loadingMore, setLoadingMore] = useState(false);

  const canFetch = Boolean(publicCode && storyId);

  // Lazy fetch — fire once when the sheet opens, not on component mount.
  const loadPage = useCallback(
    async (page: number) => {
      if (!publicCode || !storyId) return;
      const result = await fetchStoryComments(publicCode, storyId, {
        page,
        limit: 10,
      });
      if (result.status === COMMENTS_FETCH_STATUS.OK) {
        setPagination(result.data.pagination);
        setComments((prev) =>
          page === 1 ? result.data.comments : [...prev, ...result.data.comments]
        );
        setState(result.data.comments.length === 0 && page === 1 ? 'empty' : 'ok');
      } else if (result.status === COMMENTS_FETCH_STATUS.NOT_FOUND) {
        setState('not_found');
      } else if (result.status === COMMENTS_FETCH_STATUS.RATE_LIMITED) {
        setState('rate_limited');
        surfaceRateLimitToast();
      } else {
        setState('error');
      }
    },
    [publicCode, storyId]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!canFetch) {
      // Caller gave us no backing endpoint — surface the empty state so the
      // sheet still renders cleanly in previews.
      setState('empty');
      return;
    }
    // Only fetch the first time the sheet opens for this (code, storyId).
    // Re-opens inside the same mount reuse the cached comments.
    if (state === 'idle') {
      setState('loading');
      loadPage(1);
    }
  }, [isOpen, canFetch, state, loadPage]);

  // Lock body scroll while open; close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const handleLoadMore = async () => {
    if (!pagination || loadingMore) return;
    if (pagination.currentPage >= pagination.totalPages) return;
    setLoadingMore(true);
    await loadPage(pagination.currentPage + 1);
    setLoadingMore(false);
  };

  const handleRetry = () => {
    setState('loading');
    setComments([]);
    setPagination(null);
    loadPage(1);
  };

  if (!isOpen) return null;

  const hasMore =
    pagination != null && pagination.currentPage < pagination.totalPages;

  // Spec: write actions aren't exposed on the public endpoint. Even signed-in
  // viewers only get a read-only sheet here — the deep comment UX lives in
  // the authed dashboard thread view. So the CTA footer is "download/sign up"
  // regardless of auth state.
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close comments"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className="relative w-full max-w-[480px] md:max-w-[560px] bg-warm-cream rounded-t-[24px] shadow-[0_-4px_24px_rgba(0,0,0,0.15)] flex flex-col max-h-[80vh]"
      >
        {/* Drag handle */}
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-primary-blue/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-3">
          <h3 className="font-lora text-[18px] text-primary-blue text-center">
            {totalComments > 0 ? `Comments (${totalComments})` : 'Comments'}
          </h3>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {state === 'loading' && <SheetSkeleton />}

          {state === 'empty' && (
            <p className="font-plus-jakarta text-[14px] text-primary-blue/60 text-center py-10">
              No comments yet.
            </p>
          )}

          {state === 'not_found' && (
            <SheetMessage
              title="Comments unavailable"
              body="This story's comments can't be loaded. The link may have been turned off."
            />
          )}

          {state === 'rate_limited' && (
            <SheetMessage
              title="Slow down for a bit"
              body="You've hit the request limit. Try again in a minute."
              onRetry={handleRetry}
            />
          )}

          {state === 'error' && (
            <SheetMessage
              title="Couldn't load comments"
              body="Something went wrong on our end."
              onRetry={handleRetry}
            />
          )}

          {state === 'ok' && (
            <>
              <ul className="divide-y divide-primary-blue/10">
                {comments.map((c) => (
                  <li key={c._id} className="py-4">
                    <CommentRow comment={c} />
                  </li>
                ))}
              </ul>
              {hasMore && (
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="font-plus-jakarta text-[13px] text-primary-blue/70 underline underline-offset-2 disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky CTA — public endpoint doesn't expose writes, so the only
            path to interact is signup + the app's authed experience. */}
        <div className="absolute bottom-0 left-0 right-0 bg-warm-cream border-t border-primary-blue/10 px-5 pt-3 pb-5">
          <button
            type="button"
            onClick={onSignUp}
            className="w-full bg-primary-orange text-primary-white font-plus-jakarta font-semibold text-[15px] sm:text-[16px] px-6 py-[14px] sm:py-[16px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity leading-none"
          >
            Sign up to reply
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentRow({ comment }: { comment: PublicComment }) {
  const { author, content, createdAt, likes, totalLikes, isEdited } = comment;
  const relative = relativeTime(createdAt);
  const likedByLine = formatLikedByFromLikes(likes, totalLikes);

  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      {author.profilePicture ? (
        <img
          src={author.profilePicture}
          alt={`${author.firstName}'s profile`}
          className="w-9 h-9 rounded-full object-cover bg-primary-cream flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-primary-orange text-white font-plus-jakarta font-semibold text-[12px] flex items-center justify-center flex-shrink-0">
          {getInitials(author.firstName, author.lastName)}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-plus-jakarta font-semibold text-primary-blue text-[14px]">
            {author.firstName}
          </span>
          <span className="font-plus-jakarta text-primary-blue/50 text-[12px]">
            {relative}
            {isEdited ? ' · edited' : ''}
          </span>
        </div>
        <p className="mt-1 font-plus-jakarta text-primary-blue text-[14px] leading-[150%] whitespace-pre-line">
          {content}
        </p>
        {likedByLine && (
          <p className="mt-2 font-plus-jakarta text-primary-blue/60 text-[12px]">
            {likedByLine}
          </p>
        )}
      </div>

      {/* Right rail: like count + kebab (read-only; both are visual) */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-0.5">
        <div
          className="text-primary-blue flex flex-col items-center"
          aria-label={`${totalLikes} likes`}
        >
          <HeartIcon filled={comment.isLiked} />
          {totalLikes > 0 && (
            <span className="font-plus-jakarta text-[10px] text-primary-blue/70 mt-0.5">
              {totalLikes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetSkeleton() {
  return (
    <ul className="divide-y divide-primary-blue/10">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="py-4 flex items-start gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-primary-blue/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-primary-blue/10" />
            <div className="h-3 w-full rounded bg-primary-blue/10" />
            <div className="h-3 w-2/3 rounded bg-primary-blue/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SheetMessage({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div className="py-10 text-center">
      <p className="font-plus-jakarta font-semibold text-primary-blue text-[14px]">
        {title}
      </p>
      <p className="mt-2 font-plus-jakarta text-primary-blue/60 text-[13px] max-w-[280px] mx-auto">
        {body}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 font-plus-jakarta text-[13px] text-primary-orange underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Spec: likes[] is an array of liker profiles. Build a human-readable
// "Liked by X" line. The array is bounded by backend (typically ≤ some cap),
// so remaining count = totalLikes - likes.length.
function formatLikedByFromLikes(
  likes: PublicComment['likes'],
  total: number
): string {
  if (!likes || likes.length === 0 || total === 0) return '';
  const names = likes.map((l) => l.firstName).filter(Boolean);
  if (names.length === 0) return `Liked by ${total}`;
  const extra = Math.max(0, total - names.length);
  if (names.length === 1) {
    return extra > 0
      ? `Liked by ${names[0]} and ${extra} other${extra === 1 ? '' : 's'}`
      : `Liked by ${names[0]}`;
  }
  if (names.length === 2 && extra === 0) {
    return `Liked by ${names[0]} and ${names[1]}`;
  }
  const [first, ...rest] = names;
  const remaining = rest.length + extra;
  return `Liked by ${first} and ${remaining} other${remaining === 1 ? '' : 's'}`;
}

// Lightweight relative formatter — avoids pulling in a date lib for one place.
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const deltaSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (deltaSec < 60) return 'just now';
  const min = Math.round(deltaSec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(deltaSec / 3600);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(deltaSec / 86400);
  if (day < 30) return `${day}d`;
  const mo = Math.round(deltaSec / 2592000);
  if (mo < 12) return `${mo}mo`;
  const yr = Math.round(deltaSec / 31536000);
  return `${yr}y`;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

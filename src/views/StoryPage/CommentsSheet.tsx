'use client';

import { useEffect } from 'react';
import { getInitials } from '@/lib/formatters';

type Comment = {
  _id: string;
  author: { firstName: string; lastName?: string; profilePicture?: string | null };
  content: string;
  createdAtRelative: string; // "1d", "2h" — swap for real formatter when BE lands
  likedByNames: string[];    // ["you", "Michael"]
  isLovedByMe: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  // Static placeholder — remove once BE endpoint lands
  comments?: Comment[];
};

export default function CommentsSheet({
  isOpen,
  onClose,
  onSignUp,
  comments = MOCK_COMMENTS,
}: Props) {
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

  if (!isOpen) return null;

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
            Comments
          </h3>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {comments.length === 0 ? (
            <p className="font-plus-jakarta text-[14px] text-primary-blue/60 text-center py-10">
              No comments yet.
            </p>
          ) : (
            <ul className="divide-y divide-primary-blue/10">
              {comments.map((c) => (
                <li key={c._id} className="py-4">
                  <CommentRow comment={c} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sticky Sign Up CTA — authed users never reach this sheet (they're
            redirected to the dashboard thread viewer with its own comment UI). */}
        <div className="absolute bottom-0 left-0 right-0 bg-warm-cream border-t border-primary-blue/10 px-5 pt-3 pb-5">
          <button
            type="button"
            onClick={onSignUp}
            className="w-full bg-primary-orange text-primary-white font-plus-jakarta font-semibold text-[15px] sm:text-[16px] px-6 py-[14px] sm:py-[16px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity leading-none"
          >
            Sign Up to Comment
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const { author, content, createdAtRelative, likedByNames, isLovedByMe } = comment;
  const likedByLine =
    likedByNames.length > 0 ? `Liked by ${formatLikedBy(likedByNames)}` : '';

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
            {createdAtRelative}
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

      {/* Right rail: heart + menu */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-0.5">
        <button
          type="button"
          aria-label={isLovedByMe ? 'Unlike comment' : 'Like comment'}
          className="text-primary-blue hover:opacity-70 active:opacity-50 transition-opacity"
        >
          <HeartIcon filled={isLovedByMe} />
        </button>
        <button
          type="button"
          aria-label="More"
          className="text-primary-blue/50 hover:opacity-70 active:opacity-50 transition-opacity"
        >
          <KebabIcon />
        </button>
      </div>
    </div>
  );
}

function formatLikedBy(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const [first, ...rest] = names;
  return `${first} and ${rest.length} others`;
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

// Static mock comments — remove once GET /api/public/story/:code/comments ships
const MOCK_COMMENTS: Comment[] = [
  {
    _id: 'c1',
    author: { firstName: 'Sofia' },
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    createdAtRelative: '1d',
    likedByNames: ['you', 'Michael'],
    isLovedByMe: true,
  },
  {
    _id: 'c2',
    author: { firstName: 'Nathalie' },
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    createdAtRelative: '1d',
    likedByNames: ['Sofia'],
    isLovedByMe: false,
  },
];

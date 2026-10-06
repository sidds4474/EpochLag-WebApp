'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tryOpenApp } from '@/lib/replies/installDetection';
import { deepLinkUrl, replyComposerUrl } from '@/lib/replies/routes';
import type { ReplyTargetType, ReplyAs } from '@/lib/replies/publicReplies';
import type { Platform } from '@/types/story';

type Props = {
  targetType: ReplyTargetType;
  publicCode: string;
  platform: Platform;
  // Populated from URL query params when the sharer used Flow 2 (named invite).
  // Omit for Flow 1 (plain share link).
  replyAs?: ReplyAs;
  label?: string;
  className?: string;
};

export function AnswerButton({
  targetType,
  publicCode,
  platform,
  replyAs,
  label,
  className = '',
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const defaultLabel = targetType === 'prompt' ? 'Answer prompt' : 'View Story';
  const buttonLabel = label ?? defaultLabel;
  const fallbackUrl = replyComposerUrl(targetType, publicCode, replyAs);

  const handleClick = () => {
    if (pending) return;

    // Desktop never has the mobile app — skip scheme attempt entirely.
    // Also skip on localhost: deep links can't resolve to the real app during
    // local dev, so the 1.5s fallback timer is pure friction.
    const isLocalhost =
      typeof window !== 'undefined' &&
      /^(localhost|127\.0\.0\.1|192\.168\.|10\.|\[::1\])/.test(window.location.hostname);

    if (platform === 'desktop' || isLocalhost) {
      router.push(fallbackUrl);
      return;
    }

    setPending(true);
    tryOpenApp(deepLinkUrl(targetType, publicCode, replyAs), () => {
      setPending(false);
      router.push(fallbackUrl);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={buttonLabel}
      className={[
        'w-full',
        'bg-primary-orange text-primary-white',
        'font-plus-jakarta font-semibold text-[16px] sm:text-[17px] leading-none',
        'px-6 py-[18px] sm:py-[20px]',
        'rounded-full',
        'transition-opacity duration-150',
        'hover:opacity-90 active:opacity-80',
        'disabled:opacity-60 disabled:cursor-wait',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SpinnerIcon />
          Opening app…
        </span>
      ) : (
        buttonLabel
      )}
    </button>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
    >
      <path d="M12 2a10 10 0 0 1 10 10" opacity={0.3} />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

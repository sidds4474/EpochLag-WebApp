import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Responsive wrapper for all reply-flow screens.
 * Mobile: full-width edge-to-edge.
 * Tablet+: centered at max-w-[480px], warm-cream bg fills sides.
 */
export function ReplyShell({ children, className = '' }: Props) {
  return (
    <div className="min-h-screen bg-warm-cream flex flex-col items-center">
      <div
        className={[
          'w-full max-w-[480px] mx-auto flex flex-col flex-1',
          'px-4 sm:px-6',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

import { ReplyShell } from '@/components/replies/ReplyShell';

const PEACH = '#FCD6A5';
const TERRACOTTA = '#D95F3B';
const DARK_TERRA = '#b34820';

/** Shown when the reply link doesn't exist or has been revoked (404/LINK_NOT_FOUND). */
export function LinkNotFound() {
  return (
    <ReplyShell>
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 gap-6">
        {/* Orange circles with X */}
        <div
          style={{ width: 100, height: 100, position: 'relative', flexShrink: 0 }}
          aria-hidden="true"
        >
          <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="50" fill={PEACH} />
            <circle cx="50" cy="50" r="36" fill={TERRACOTTA} />
            <circle cx="50" cy="50" r="22" fill={DARK_TERRA} />
            {/* X mark */}
            <line x1="39" y1="39" x2="61" y2="61" stroke="white" strokeWidth="4" strokeLinecap="round" />
            <line x1="61" y1="39" x2="39" y2="61" stroke="white" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        <h2 className="font-plus-jakarta font-semibold text-[22px] sm:text-[24px] text-primary-blue text-center">
          This link wasn&apos;t found
        </h2>

        <p className="font-plus-jakarta text-[15px] sm:text-[16px] text-primary-blue opacity-70 text-center max-w-[300px] leading-[160%]">
          The link may have been revoked, or it never existed.
          Ask the person who shared it for a new one.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-[380px]">
          <a
            href="/"
            className="w-full bg-primary-orange text-primary-white font-plus-jakarta font-semibold text-[16px] px-6 py-[18px] rounded-full text-center hover:opacity-90 active:opacity-80 transition-opacity leading-none"
          >
            Exit
          </a>

          <a
            href="https://www.epochlag.com/download"
            target="_blank"
            rel="noopener noreferrer"
            className="text-center font-plus-jakarta text-[13px] text-primary-blue opacity-60 underline"
          >
            Download Epoch Lag
          </a>
        </div>
      </main>
    </ReplyShell>
  );
}

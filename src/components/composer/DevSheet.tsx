"use client";

import type { ReactNode } from "react";

// Minimal bottom-sheet used by the dev sandbox at /dev/composer-ring while
// the real pickers (Date / Location / Music / Tag People) are still being
// restyled to cream+Lora in milestone 7. It covers the 390×844 canvas only
// — a real sheet would use a portal + viewport-size backdrop.

export type DevSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function DevSheet({ open, title, onClose, children }: DevSheetProps) {
  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className="absolute inset-0 z-[5] transition-opacity duration-[240ms]"
        style={{
          background: "rgba(0,0,0,0.25)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      />
      <div
        role="dialog"
        aria-label={title}
        className="absolute left-0 right-0 bottom-0 z-[6] rounded-t-[24px] bg-[#F3F1EC] p-[20px] shadow-[0_-12px_32px_rgba(0,0,0,0.18)]"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          minHeight: 280,
        }}
      >
        <div className="flex items-center justify-between mb-[14px]">
          <div className="font-ivy text-[18px] text-[#2B2B2B]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-[28px] h-[28px] rounded-full text-[#2B2B2B]/50 hover:bg-black/[0.05] flex items-center justify-center transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

"use client";

import type { ReactNode } from "react";
import {
  DateChip,
  LocationChip,
  type LocationValue,
  type MusicValue,
} from "../../app/(app)/(dashboard)/new-story/pickers";

// The desktop composer's right rail. Always visible (no phase gating) —
// mirrors the mobile-prototype layout where metadata chips, cover picker,
// and share controls sit alongside the ring + blocks editor.
//
// Rail content is mode-switched by StoryComposer: reply inherits the
// thread cover + skips share; daily hides nothing; edit uses the existing
// cover; ask-a-question swaps the whole thing out for its own simpler
// rail (title-only).

export type RightRailProps = {
  // Metadata chips — hidden entirely when `showMetaChips` is false.
  showMetaChips?: boolean;
  location: LocationValue | null;
  onLocationChange: (next: LocationValue | null) => void;
  date: string | null;
  onDateChange: (next: string | null) => void;
  peopleCount: number;
  onOpenPeople: () => void;
  // Cover
  showCover: boolean;
  coverPreviewUrl: string | null;
  onOpenCoverPicker: () => void;
  coverLabel?: string;
  // Share
  showShareToggle: boolean;
  allowShare: boolean;
  onAllowShareChange: (next: boolean) => void;
  // Secure box
  showSecureBox: boolean;
  secureHeading?: string;
  secureBody?: string;
};

// Re-export MusicValue for callers that still import it via this module.
export type { MusicValue };

export function RightRail({
  showMetaChips = true,
  location,
  onLocationChange,
  date,
  onDateChange,
  peopleCount,
  onOpenPeople,
  showCover,
  coverPreviewUrl,
  onOpenCoverPicker,
  coverLabel = "Cover image",
  showShareToggle,
  allowShare,
  onAllowShareChange,
  showSecureBox,
  secureHeading = "Secure and Private",
  secureBody = "Only you can add people to this thread",
}: RightRailProps) {
  return (
    <aside className="flex flex-col gap-[20px] w-full">
      {showMetaChips && (
        <div className="flex flex-col gap-[10px]">
          <LocationChip value={location} onChange={onLocationChange} variant="rail" />
          <DateChip value={date} onChange={onDateChange} variant="rail" />
          <PeopleRailChip count={peopleCount} onClick={onOpenPeople} />
        </div>
      )}

      {showCover && (
        <CoverPanel
          label={coverLabel}
          previewUrl={coverPreviewUrl}
          onOpen={onOpenCoverPicker}
        />
      )}

      {showShareToggle && (
        <ShareToggleRow value={allowShare} onChange={onAllowShareChange} />
      )}

      {showSecureBox && <SecureBox heading={secureHeading} body={secureBody} />}
    </aside>
  );
}

// People chip — pickers.tsx doesn't ship one, so we reproduce the same
// rail shell here. Keep it visually identical to the three above.
function PeopleRailChip({ count, onClick }: { count: number; onClick: () => void }) {
  const active = count > 0;
  return (
    <div
      className={`w-full rounded-full bg-[#E6E3D9] px-[26px] py-[14px] flex items-center gap-[12px] font-montserrat font-medium text-[15px] ${
        active ? "text-primary-blue" : "text-[#848484]"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer flex-1 min-w-0 flex items-center gap-[10px] text-left"
      >
        <span className={`shrink-0 ${active ? "text-primary-blue" : "text-[#848484]"}`}>
          <PeopleIcon />
        </span>
        <span className="min-w-0 truncate">
          {active ? `${count} tagged` : "Add People"}
        </span>
      </button>
    </div>
  );
}

function CoverPanel({
  label,
  previewUrl,
  onOpen,
}: {
  label: string;
  previewUrl: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="font-montserrat text-[14px] text-[#2B2B2B]">{label}</div>
      <button
        type="button"
        onClick={onOpen}
        className="relative w-full aspect-square rounded-[18px] bg-white border border-[#E5E3DD] flex items-center justify-center overflow-hidden hover:bg-[#fafaf7] transition-colors"
        aria-label="Choose cover image"
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute bottom-[12px] inset-x-0 flex justify-center">
              <span className="font-montserrat text-[12px] text-white bg-black/50 backdrop-blur px-[12px] py-[6px] rounded-full">
                Change Cover
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-[12px]">
            <ImageIcon />
            <span className="font-montserrat text-[13px] text-[#2B2B2B] border border-[#2B2B2B]/40 rounded-full px-[14px] py-[6px]">
              Choose Cover
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

function ShareToggleRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-montserrat text-[14px] text-[#2B2B2B]">
        Allow others to share
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-[36px] h-[20px] rounded-full transition-colors ${
          value ? "bg-primary-orange" : "bg-[#D6D3CA]"
        }`}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-white transition-transform"
          style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function SecureBox({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="bg-white rounded-[14px] p-[14px] flex gap-[10px]">
      <span className="shrink-0 text-primary-orange mt-[2px]">
        <LockIcon />
      </span>
      <div className="flex flex-col gap-[2px] min-w-0">
        <div className="font-montserrat font-semibold text-[13px] text-[#2B2B2B]">
          {heading}
        </div>
        <div className="font-montserrat text-[12px] text-[#848484] leading-[1.35]">
          {body}
        </div>
      </div>
    </div>
  );
}

// -------- Icons --------

function PeopleIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 20a5 5 0 0 1 6-4.9" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#2B2B2B" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="9" cy="9" r="1.6" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z" />
    </svg>
  );
}

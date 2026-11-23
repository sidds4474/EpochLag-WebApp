"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ProfileWithRelationship,
  RelationshipStatus,
} from "../../../../../lib/connections/api";
import { bustUrl } from "../../../../../lib/images";
import {
  CalendarIcon,
  MapPinIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from "../../icons";

type Props = {
  profile: ProfileWithRelationship;
  status: RelationshipStatus | "";
  mutualCount: number;
  onSendRequest: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onUnblock: () => void;
  onBlockClick: () => void;
  onRemoveClick: () => void;
  // Rendered to the right of the identity block on desktop, and
  // below it on mobile. Used for the Suggested Questions card.
  rightSlot?: React.ReactNode;
};

// Hero for a friend's profile. Cream chrome, cover banner, avatar
// overlapping bottom-left (desktop) / centered (mobile), Lora name
// row with inline ⋯ menu, meta + bio underneath, and the connection-
// state pill below the bio.
export default function FriendProfileHeader({
  profile,
  status,
  mutualCount,
  onSendRequest,
  onAccept,
  onDecline,
  onUnblock,
  onBlockClick,
  onRemoveClick,
  rightSlot,
}: Props) {
  const fullName =
    `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "User";
  const initial = (profile.firstName || "?").charAt(0).toUpperCase();
  const cover = bustUrl(profile.backgroundPicture ?? null, profile.updatedAt);
  const avatar = bustUrl(profile.profilePicture ?? null, profile.updatedAt);
  const isBlocked = status === "blocked";
  const location =
    !isBlocked ? profile.city || profile.state || profile.country || null : null;
  const dob = !isBlocked ? formatDob(profile.dateOfBirth ?? null) : null;
  const bio = !isBlocked ? profile.bio ?? null : null;

  const identityBlock = (
    <div className="flex flex-col md:flex-row md:items-start md:gap-[18px] md:max-w-[520px]">
      {/* Avatar — centered under the cover on mobile, inline-left on desktop.
          relative + z-10 so the circle paints above the cover when the
          negative margin pulls it into the banner. md:ml-[38px] matches
          the Studio hub's own-profile avatar inset. */}
      <div className="shrink-0 relative z-10 -mt-[56px] md:-mt-[70px] mx-auto md:mx-0 md:ml-[38px]">
        <div className="w-[110px] h-[110px] md:w-[124px] md:h-[124px] rounded-full overflow-hidden bg-[#C8D1DA] border-[4px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.10)]">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-[#232323] font-montserrat font-semibold text-[42px]">
              {initial}
            </span>
          )}
        </div>
      </div>

      {/* Name / meta / bio / CTA */}
      <div className="flex-1 min-w-0 text-center md:text-left mt-[12px] md:mt-[14px]">
        <div className="inline-flex items-center gap-[10px]">
          <h2 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[28px] leading-tight">
            {fullName}
          </h2>
          {!isBlocked && (
            <EllipsisMenu
              showRemove={status === "connection"}
              onBlockClick={onBlockClick}
              onRemoveClick={onRemoveClick}
            />
          )}
        </div>

        {(location || dob) && (
          <div className="mt-[8px] flex items-center gap-[16px] font-montserrat text-[#848484] text-[13px] md:text-[14px] justify-center md:justify-start">
            {location && (
              <span className="inline-flex items-center gap-[6px]">
                <MapPinIcon width={14} height={14} />
                {location}
              </span>
            )}
            {dob && (
              <span className="inline-flex items-center gap-[6px]">
                <CalendarIcon width={14} height={14} />
                {dob}
              </span>
            )}
          </div>
        )}

        {bio && (
          <p className="mt-[10px] font-montserrat text-[#092e4a] text-[13px] md:text-[14px] leading-[1.5] whitespace-pre-wrap text-center md:text-left max-w-[380px] mx-auto md:mx-0">
            {bio}
          </p>
        )}

        <div className="mt-[16px] md:mt-[18px] flex flex-col md:flex-row items-center gap-[10px] md:gap-[14px]">
          <CtaRow
            status={status}
            onSendRequest={onSendRequest}
            onAccept={onAccept}
            onDecline={onDecline}
            onUnblock={onUnblock}
          />
          {mutualCount > 0 && !isBlocked && (
            <span className="font-montserrat text-[#848484] text-[13px]">
              {mutualCount === 1
                ? "1 mutual friend"
                : `${mutualCount} mutual friends`}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Cover strip */}
      <div className="relative w-full aspect-[16/6] md:aspect-[1056/212] rounded-[18px] overflow-hidden bg-gradient-to-br from-[#f2a45c] via-[#e18248] to-[#4a2a2f]">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      {/* Identity block (left) + Suggested Questions / rightSlot (right) */}
      <div className="flex flex-col md:flex-row md:items-start md:gap-[32px]">
        <div className="flex-1 min-w-0">{identityBlock}</div>
        {rightSlot && (
          <div className="mt-[24px] md:mt-[20px] w-full md:w-[380px] lg:w-[400px] shrink-0">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

// Six-state CTA cluster. Mirrors the connection lifecycle; the dark
// "Connection" pill is what you see after a successful request.
function CtaRow({
  status,
  onSendRequest,
  onAccept,
  onDecline,
  onUnblock,
}: {
  status: RelationshipStatus | "";
  onSendRequest: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onUnblock: () => void;
}) {
  if (status === "connection") {
    return (
      <button
        type="button"
        disabled
        className="cursor-default inline-flex items-center justify-center gap-[8px] bg-[#2c2c2c] text-white rounded-full h-[40px] md:h-[42px] px-[22px] font-montserrat font-medium text-[14px]"
      >
        <CheckIcon width={14} height={14} />
        Connection
      </button>
    );
  }

  if (status === "notConnected") {
    return (
      <button
        type="button"
        onClick={onSendRequest}
        className="cursor-pointer inline-flex items-center justify-center gap-[8px] border-[1.5px] border-[#2c2c2c] text-[#232323] rounded-full h-[40px] md:h-[42px] px-[22px] font-montserrat font-medium text-[14px] hover:bg-black/[0.04] transition-colors"
      >
        <PlusIcon width={14} height={14} />
        Add Connection
      </button>
    );
  }

  if (status === "pending") {
    return (
      <button
        type="button"
        disabled
        className="cursor-default inline-flex items-center justify-center gap-[8px] bg-[#E8E6DF] text-[#2c2c2c]/70 rounded-full h-[40px] md:h-[42px] px-[22px] font-montserrat font-medium text-[14px]"
      >
        <ClockIcon width={14} height={14} />
        Pending
      </button>
    );
  }

  if (status === "requested") {
    return (
      <div className="flex items-center gap-[8px]">
        <button
          type="button"
          onClick={onDecline}
          className="cursor-pointer border-[1.5px] border-[#2c2c2c] text-[#232323] rounded-full h-[40px] md:h-[42px] px-[20px] font-montserrat font-medium text-[14px] hover:bg-black/[0.04] transition-colors"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="cursor-pointer bg-[#2c2c2c] text-white rounded-full h-[40px] md:h-[42px] px-[20px] font-montserrat font-medium text-[14px] hover:brightness-95 transition-[filter]"
        >
          Confirm
        </button>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <button
        type="button"
        disabled
        className="cursor-default inline-flex items-center justify-center bg-[#E8E6DF] text-[#2c2c2c]/60 rounded-full h-[40px] md:h-[42px] px-[22px] font-montserrat font-medium text-[14px]"
      >
        Request Declined
      </button>
    );
  }

  if (status === "blocked") {
    return (
      <button
        type="button"
        onClick={onUnblock}
        className="cursor-pointer inline-flex items-center justify-center gap-[8px] border-[1.5px] border-[#2c2c2c] text-[#232323] rounded-full h-[40px] md:h-[42px] px-[22px] font-montserrat font-medium text-[14px] hover:bg-black/[0.04] transition-colors"
      >
        <BanIcon width={14} height={14} />
        Unblock
      </button>
    );
  }

  return null;
}

// Inline ⋯ menu beside the name. "Block User" always; "Remove
// Connection" only when the current status is connection.
function EllipsisMenu({
  showRemove,
  onBlockClick,
  onRemoveClick,
}: {
  showRemove: boolean;
  onBlockClick: () => void;
  onRemoveClick: () => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!anchorRef.current) return;
      if (!anchorRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        className="cursor-pointer w-[32px] h-[32px] rounded-full text-[#232323] hover:bg-black/[0.06] flex items-center justify-center transition-colors"
      >
        <MoreHorizontalIcon width={18} height={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 md:left-auto md:right-0 top-[38px] min-w-[200px] bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-black/[0.06] py-[6px] z-20"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onBlockClick();
            }}
            className="cursor-pointer w-full text-left px-[14px] py-[10px] font-montserrat font-medium text-[#232323] text-[14px] hover:bg-black/[0.04] transition-colors inline-flex items-center justify-between gap-[12px]"
          >
            Block User
            <BanIcon width={14} height={14} />
          </button>
          {showRemove && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRemoveClick();
              }}
              className="cursor-pointer w-full text-left px-[14px] py-[10px] font-montserrat font-medium text-[#232323] text-[14px] hover:bg-black/[0.04] transition-colors inline-flex items-center justify-between gap-[12px]"
            >
              Remove Connection
              <RemoveIcon width={14} height={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatDob(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CheckIcon({ width = 14, height = 14 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12.5L10 17.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon({ width = 14, height = 14 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7V12L15 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BanIcon({ width = 14, height = 14 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 5.5L18.5 18.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon({ width = 14, height = 14 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11V17M20 14H13M12 20H5C4.46957 20 3.96086 19.7893 3.58579 19.4142C3.21071 19.0391 3 18.5304 3 18V7C3 6.46957 3.21071 5.96086 3.58579 5.58579C3.96086 5.21071 4.46957 5 5 5H9L11 7H17C17.5304 7 18.0391 7.21071 18.4142 7.58579C18.7893 7.96086 19 8.46957 19 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

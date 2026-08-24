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
};

// Header block for a friend's profile. Cover strip + avatar + name/
// meta on the left; CTA row on the right at md+ (below the cover on
// mobile). "Blocked" hides bio/location/DOB entirely — nothing to show
// when the relationship is suspended; the CTA row collapses to just an
// Unblock pill and the ⋯ menu disappears.
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
}: Props) {
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "User";
  const initial = (profile.firstName || "?").charAt(0).toUpperCase();
  const cover = bustUrl(profile.backgroundPicture ?? null, profile.updatedAt);
  const avatar = bustUrl(profile.profilePicture ?? null, profile.updatedAt);
  const isBlocked = status === "blocked";
  const location = !isBlocked ? profile.city || profile.state || profile.country || null : null;
  const dob = !isBlocked ? formatDob(profile.dateOfBirth ?? null) : null;
  const bio = !isBlocked ? profile.bio ?? null : null;

  return (
    <div className="w-full">
      {/* Cover strip + avatar overlap. */}
      <div className="relative">
        <div className="relative w-full aspect-[16/6] md:aspect-[16/5] lg:aspect-[1028/212] rounded-[20px] overflow-hidden bg-gradient-to-br from-[#f2a45c] via-[#e18248] to-[#4a2a2f]">
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        <div className="absolute left-[16px] md:left-[24px] -bottom-[40px] md:-bottom-[50px]">
          <div className="w-[110px] h-[110px] md:w-[129px] md:h-[129px] rounded-full overflow-hidden bg-primary-blue/10 border-[4px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.10)]">
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-primary-blue font-montserrat font-semibold text-[40px]">
                {initial}
              </span>
            )}
          </div>
        </div>

        {/* Mobile-only 3-dots — sits on the white area below the cover,
            vertically aligned with the avatar's lower half (avatar
            overhangs 40px below cover, its white-portion center is
            ~20px below cover bottom). Hidden when blocked. Desktop
            places the ellipsis inside the actions row above. */}
        {!isBlocked && (
          <div className="md:hidden absolute right-[8px] -bottom-[45px]">
            <EllipsisMenu
              showRemove={status === "connection"}
              onBlockClick={onBlockClick}
              onRemoveClick={onRemoveClick}
            />
          </div>
        )}
      </div>

      {/* Tablet + desktop actions row — sits BELOW the cover, right-
          aligned, with room for the avatar overhang. Mobile puts the
          CTA row further down below the name/meta so it stays reachable
          under the thumb. */}
      <div className="hidden md:flex mt-[16px] items-center justify-end gap-[12px] pl-[160px]">
        {mutualCount > 0 && !isBlocked && (
          <span className="font-montserrat text-primary-blue/60 text-[13px]">
            {mutualCount === 1 ? "1 mutual friend" : `${mutualCount} mutual friends`}
          </span>
        )}
        <CtaRow
          status={status}
          onSendRequest={onSendRequest}
          onAccept={onAccept}
          onDecline={onDecline}
          onUnblock={onUnblock}
        />
        {!isBlocked && (
          <EllipsisMenu
            showRemove={status === "connection"}
            onBlockClick={onBlockClick}
            onRemoveClick={onRemoveClick}
          />
        )}
      </div>

      {/* Name + meta */}
      <div className="mt-[52px] md:mt-[8px] px-[4px] md:px-[8px]">
        <h2 className="font-montserrat font-bold text-primary-blue text-[20px] md:text-[24px] leading-tight">
          {fullName}
        </h2>
        {(location || dob) && (
          <div className="mt-[6px] flex items-center gap-[14px] font-montserrat text-primary-blue/70 text-[13px]">
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
          <p className="mt-[10px] font-montserrat text-primary-blue text-[14px] leading-[20px] whitespace-pre-wrap">
            {bio}
          </p>
        )}
      </div>

      {/* Mobile-only CTA row — below the meta. Matches Figma: pill on
          the left, mutuals count to its right. Ellipsis lives up in the
          avatar row (absolute-positioned on the cover container). */}
      <div className="md:hidden mt-[14px] px-[4px] flex items-center gap-[12px]">
        <CtaRow
          status={status}
          onSendRequest={onSendRequest}
          onAccept={onAccept}
          onDecline={onDecline}
          onUnblock={onUnblock}
        />
        {mutualCount > 0 && !isBlocked && (
          <span className="font-montserrat text-primary-blue/60 text-[13px]">
            {mutualCount === 1 ? "1 mutual friend" : `${mutualCount} mutual friends`}
          </span>
        )}
      </div>
    </div>
  );
}

// The six-state CTA cluster. Each state renders a different pill (or
// pair of pills). `fullWidth` stretches the pills to fill the parent —
// used on mobile where the row spans the full width below the meta.
function CtaRow({
  status,
  onSendRequest,
  onAccept,
  onDecline,
  onUnblock,
  fullWidth,
}: {
  status: RelationshipStatus | "";
  onSendRequest: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onUnblock: () => void;
  fullWidth?: boolean;
}) {
  const grow = fullWidth ? "flex-1" : "";

  if (status === "connection") {
    return (
      <button
        type="button"
        disabled
        className={`${grow} cursor-default inline-flex items-center justify-center gap-[8px] bg-primary-blue text-white rounded-full h-[40px] md:h-[44px] px-[20px] font-montserrat font-medium text-[14px]`}
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
        className={`${grow} cursor-pointer inline-flex items-center justify-center gap-[8px] border-[1.5px] border-primary-blue text-primary-blue rounded-full h-[40px] md:h-[44px] px-[20px] font-montserrat font-medium text-[14px] hover:bg-primary-blue/[0.04] transition-colors`}
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
        className={`${grow} cursor-default inline-flex items-center justify-center gap-[8px] bg-[#ededed] text-primary-blue/70 rounded-full h-[40px] md:h-[44px] px-[20px] font-montserrat font-medium text-[14px]`}
      >
        <ClockIcon width={14} height={14} />
        Pending
      </button>
    );
  }

  if (status === "requested") {
    return (
      <div className={`${fullWidth ? "flex-1 flex" : "flex"} items-center gap-[8px]`}>
        <button
          type="button"
          onClick={onDecline}
          className={`${fullWidth ? "flex-1" : ""} cursor-pointer border-[1.5px] border-primary-blue text-primary-blue rounded-full h-[40px] md:h-[44px] px-[18px] font-montserrat font-medium text-[14px] hover:bg-primary-blue/[0.04] transition-colors`}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          className={`${fullWidth ? "flex-1" : ""} cursor-pointer bg-primary-blue text-white rounded-full h-[40px] md:h-[44px] px-[18px] font-montserrat font-medium text-[14px] hover:brightness-95 transition-[filter]`}
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
        className={`${grow} cursor-default inline-flex items-center justify-center bg-[#ededed] text-primary-blue/50 rounded-full h-[40px] md:h-[44px] px-[20px] font-montserrat font-medium text-[14px]`}
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
        className={`${grow} cursor-pointer inline-flex items-center justify-center gap-[8px] border-[1.5px] border-primary-blue text-primary-blue rounded-full h-[40px] md:h-[44px] px-[20px] font-montserrat font-medium text-[14px] hover:bg-primary-blue/[0.04] transition-colors`}
      >
        <BanIcon width={14} height={14} />
        Unblock
      </button>
    );
  }

  return null;
}

// 3-dot popover with contextual items. "Block User" always shows;
// "Remove Connection" only when we're currently connected. Closes on
// outside click or Escape.
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
        className="cursor-pointer w-[40px] h-[40px] rounded-full text-primary-blue hover:bg-black/[0.06] flex items-center justify-center transition-colors"
      >
        <MoreHorizontalIcon width={20} height={20} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[46px] min-w-[190px] bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-black/[0.06] py-[6px] z-10"
        >
          {showRemove && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onRemoveClick();
              }}
              className="cursor-pointer w-full text-left px-[14px] py-[10px] font-montserrat font-medium text-primary-blue text-[14px] hover:bg-black/[0.04] transition-colors"
            >
              Remove Connection
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onBlockClick();
            }}
            className="cursor-pointer w-full text-left px-[14px] py-[10px] font-montserrat font-medium text-red-600 text-[14px] hover:bg-black/[0.04] transition-colors"
          >
            Block User
          </button>
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
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none">
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
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none">
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
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M5.5 5.5L18.5 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

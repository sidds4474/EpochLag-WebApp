"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  AVATAR_COLORS,
  bustUrl,
  colorForName,
  getInitial,
  hasProfilePicture,
} from "../../../../lib/avatar";
import { deleteLag } from "../../../../lib/daily/api";
import { notifyDailyEntryChanged } from "../../../../lib/daily/cache";
import type { DailyEntry, DailyEntryMap } from "../../../../lib/daily/types";

// Daily lags are a personal archive — the subtitle avatar + "{name} shared"
// is always the *viewer's* identity, not the entry's author. See spec.

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "Sept" is 4 chars per Figma; the rest are 3.
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
];

function parseYmd(ymd: string): Date | null {
  if (!ymd || ymd.length < 10) return null;
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatBigDate(ymd: string): string {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]}, ${d.getFullYear()}`;
}

function formatSubDate(laggedAt: string | null, fallback: string): string {
  let d: Date | null = null;
  if (laggedAt) {
    const candidate = new Date(laggedAt);
    if (!Number.isNaN(candidate.getTime())) d = candidate;
  }
  if (!d) d = parseYmd(fallback);
  if (!d) return "";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export default function RecordedDays({
  entries,
  onOpenEntry,
}: {
  entries: DailyEntryMap;
  onOpenEntry: (entry: DailyEntry) => void;
}) {
  const sorted = Object.values(entries).sort((a, b) =>
    b.iso.localeCompare(a.iso),
  );

  return (
    <div className="flex flex-col">
      <h3 className="font-ivy font-normal text-[#232323] text-[18px] mb-[12px]">
        Recorded Days
      </h3>
      {sorted.length === 0 ? (
        <p className="font-montserrat text-[#2c2c2c]/60 text-[13px]">
          No entries yet. Lag your day to start.
        </p>
      ) : (
        <ul className="flex flex-col">
          {sorted.map((entry) => (
            <RecordedDayRow
              key={entry.iso}
              entry={entry}
              onOpen={() => onOpenEntry(entry)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function RecordedDayRow({
  entry,
  onOpen,
}: {
  entry: DailyEntry;
  onOpen: () => void;
}) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const firstName = user?.firstName ?? "";
  const displayName = firstName || "You";
  const cover = entry.coverUrl;
  const bigDate = formatBigDate(entry.iso);
  const subDate = formatSubDate(entry.laggedAt, entry.iso);

  const handleRemove = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      await deleteLag(entry.iso);
      toast.success("Day removed");
      notifyDailyEntryChanged();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Couldn't remove this day";
      toast.error(message);
    } finally {
      setRemoving(false);
      setMenuOpen(false);
    }
  };

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open entry for ${bigDate}`}
        className="cursor-pointer w-full flex items-center gap-[14px] py-[18px] text-left transition-opacity active:opacity-85"
      >
        {/* Polaroid thumbnail — 94×100 portrait, 6px matte frame all sides */}
        <div className="shrink-0 w-[94px] h-[100px]">
          <div className="w-full h-full bg-white p-[6px] shadow-[0_3px_4px_rgba(0,0,0,0.25)]">
            <div className="w-full h-full bg-[#F1F1F1] overflow-hidden relative">
              {cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  className="block w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-[8px] mb-[10px]">
            <SubtitleAvatar
              uri={user?.profilePicture}
              name={displayName}
              size={24}
            />
            <span className="font-montserrat text-[#848484] text-[12px] truncate">
              {firstName ? `${firstName} shared` : "Shared"}
            </span>
          </div>
          <div className="font-ivy font-normal text-[#232323] text-[16px] leading-[20px] truncate">
            {bigDate}
          </div>
          {subDate && (
            <div className="mt-[4px] font-montserrat text-[#848484] text-[12px] truncate">
              {subDate}
            </div>
          )}
        </div>
      </button>

      <div className="absolute right-0 top-[18px] opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="cursor-pointer w-[28px] h-[28px] rounded-full text-[#232323]/60 hover:bg-black/[0.05] flex items-center justify-center"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx={5} cy={12} r={1.75} />
            <circle cx={12} cy={12} r={1.75} />
            <circle cx={19} cy={12} r={1.75} />
          </svg>
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[32px] bg-white rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] py-[4px] z-10 min-w-[160px]"
          >
            <button
              type="button"
              role="menuitem"
              disabled={removing}
              onClick={handleRemove}
              className="cursor-pointer w-full text-left px-[14px] py-[8px] font-montserrat text-[#D95F3B] text-[13px] hover:bg-black/[0.04]"
            >
              {removing ? "Removing…" : "Remove this day"}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function SubtitleAvatar({
  uri,
  name,
  size,
}: {
  uri: string | null | undefined;
  name: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const hasImage = hasProfilePicture(uri) && !failed;
  const bg = colorForName(name) || AVATAR_COLORS[0];

  return (
    <span
      className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
      style={{ width: size, height: size, backgroundColor: hasImage ? "transparent" : bg }}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bustUrl(uri ?? "", undefined) || ""}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-montserrat font-semibold text-white"
          style={{ fontSize: Math.max(10, Math.round(size * 0.45)) }}
        >
          {getInitial(name)}
        </span>
      )}
    </span>
  );
}

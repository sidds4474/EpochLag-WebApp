"use client";

import type { ReactNode } from "react";

// Inline chip row for the compose phase — Date / Location / Music / People.
// Each chip shows either its default label (no selection) or the currently
// chosen value, and opens its picker sheet on tap.
//
// This component is purely presentational — the composer owns the state and
// wires the chips to real pickers (milestones 7-8). The dev page uses
// lightweight inline sheets in the meantime.

export type ChipValue = string | null;

export type ChipRowProps = {
  date: ChipValue;
  location: ChipValue;
  music: ChipValue;
  peopleCount: number;
  onOpenDate: () => void;
  onOpenLocation: () => void;
  onOpenMusic: () => void;
  onOpenPeople: () => void;
};

export function ChipRow({
  date,
  location,
  music,
  peopleCount,
  onOpenDate,
  onOpenLocation,
  onOpenMusic,
  onOpenPeople,
}: ChipRowProps) {
  return (
    <div className="flex flex-wrap gap-[8px]">
      <Chip
        icon={<CalendarIcon />}
        label={date ?? "Date"}
        selected={!!date}
        onClick={onOpenDate}
      />
      <Chip
        icon={<PinIcon />}
        label={location ?? "Location"}
        selected={!!location}
        onClick={onOpenLocation}
      />
      <Chip
        icon={<MusicIcon />}
        label={music ?? "Music"}
        selected={!!music}
        onClick={onOpenMusic}
      />
      <Chip
        icon={<PeopleIcon />}
        label={peopleCount > 0 ? `${peopleCount} tagged` : "People"}
        selected={peopleCount > 0}
        onClick={onOpenPeople}
      />
    </div>
  );
}

function Chip({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-[6px] px-[10px] h-[32px] rounded-full font-montserrat text-[12px] transition-colors ${
        selected
          ? "bg-[#2B2B2B] text-white"
          : "bg-white text-[#2B2B2B] border border-[#2B2B2B]/15 hover:bg-black/[0.03]"
      }`}
    >
      <span className="w-[14px] h-[14px] flex items-center justify-center">
        {icon}
      </span>
      <span className="truncate max-w-[140px]">{label}</span>
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s-7-6.8-7-12a7 7 0 0 1 14 0c0 5.2-7 12-7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
function MusicIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 20a5 5 0 0 1 6-4.9" />
    </svg>
  );
}

import type { ReactNode } from "react";
import { CakeIcon, MapPinIcon, CalendarIcon } from "../icons";

// Small inline SVGs for types the shared icon set doesn't cover. Kept here
// so the map stays adjacent to the switch that consumes them.
function BriefcaseIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function GraduationCapIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12v4c0 2 3 3 6 3s6-1 6-3v-4" />
    </svg>
  );
}

function HeartIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function BabyIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9 16s1 2 3 2 3-2 3-2" />
      <path d="M6 22a6 6 0 0 1 12 0" />
    </svg>
  );
}

function PartyIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.8 11.3 2 22l10.7-3.79" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="M22 2 12 12l3 10 7-20Z" />
      <path d="m19 5-4 4" />
      <path d="M11 13a3 3 0 1 0-3-3" />
    </svg>
  );
}

function SadFaceIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 15s1.5-2 4-2 4 2 4 2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function SofaIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
      <path d="M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5H2Z" />
      <path d="M4 18v2" />
      <path d="M20 18v2" />
      <path d="M12 4v9" />
    </svg>
  );
}

function HomeIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10 12 3l9 7v10a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export function momentTypeIcon(type: string, size = 20): ReactNode {
  switch (type) {
    case "Birthday":
      return <CakeIcon width={size} height={size} />;
    case "Travel":
      return <BriefcaseIcon width={size} height={size} />;
    case "Graduation":
      return <GraduationCapIcon width={size} height={size} />;
    case "Wedding":
      return <HeartIcon width={size} height={size} />;
    case "Anniversary":
      return <PartyIcon width={size} height={size} />;
    case "NewBaby":
      return <BabyIcon width={size} height={size} />;
    case "FirstHome":
      return <HomeIcon width={size} height={size} />;
    case "Retirement":
      return <SofaIcon width={size} height={size} />;
    case "Loss":
      return <SadFaceIcon width={size} height={size} />;
    case "Other":
    default:
      return <CalendarIcon width={size} height={size} />;
  }
}

// Solid cover gradient used when a moment has no coverImageUrl.
export function fallbackGradient(type: string): string {
  switch (type) {
    case "Birthday":
      return "linear-gradient(135deg, #FFD9AA 0%, #f2a45c 100%)";
    case "Wedding":
    case "Anniversary":
      return "linear-gradient(135deg, #f2b5c7 0%, #b8563a 100%)";
    case "Travel":
      return "linear-gradient(135deg, #b8d9c9 0%, #4a2a2f 100%)";
    case "Graduation":
      return "linear-gradient(135deg, #d4c1e0 0%, #6c5ce7 100%)";
    case "NewBaby":
      return "linear-gradient(135deg, #ffe6c7 0%, #e18248 100%)";
    case "FirstHome":
      return "linear-gradient(135deg, #dbe4c9 0%, #6b8e4e 100%)";
    default:
      return "linear-gradient(135deg, #d9d9d9 0%, #7b7b7b 100%)";
  }
}

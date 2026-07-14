export function formatLongDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getInitials(
  firstName?: string | null,
  lastName?: string | null
): string {
  const first = (firstName || "").trim()[0] || "";
  const last = (lastName || "").trim()[0] || "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}

export function fullName(
  firstName?: string | null,
  lastName?: string | null
): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export function formatCardDate(input?: string | Date | null): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart}, ${time}`;
}

export function formatShortDayTime(input?: string | Date | null): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} ${time}`;
}

// "thu 12:45" — lowercase short day + 12-hour time without AM/PM.
// Used in the Open Story compact header to match the Figma exactly.
export function formatStoryHeaderDate(input?: string | Date | null): string {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const day = d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toLowerCase();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${day} ${hour12}:${minutes}`;
}

// Compact relative time for social feeds ("now", "5m", "2h", "3d", then
// falls back to abbreviated month + day). Matches the mobile comments UI.
export function formatRelativeTime(input?: string | Date | null): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 45) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function excerpt(text: string | null | undefined, maxLength = 150): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength - 1).trimEnd()}…`;
}

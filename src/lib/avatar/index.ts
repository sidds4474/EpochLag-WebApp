// Shared avatar utilities. Mirror mobile Avatar.js so the same user
// renders the same colored circle across web + mobile + across sessions.
// The color is a deterministic hash of firstName (not _id, not email) —
// keeps parity with mobile even if BE later changes the user id shape.

// 15-color palette from mobile Avatar.js. Soft, high-contrast; each
// pairs well with white text at typical avatar sizes.
export const AVATAR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E2",
  "#F8B88B",
  "#AED6F1",
  "#A9DFBF",
  "#F5B7B1",
  "#D7BDE2",
  "#A3E4D7",
  "#FAD7A0",
] as const;

// Same hash formula as mobile — DJB2-ish rolling shift. Do not change:
// changing it re-colors every user across the entire app.
export function colorForName(name: string | null | undefined): string {
  const n = (name ?? "").trim() || "Unknown";
  let hash = 0;
  for (let i = 0; i < n.length; i++) {
    hash = n.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

// Fallback letter shown inside the colored circle. Uppercase first char
// of firstName, or "?" if firstName is empty.
export function getInitial(firstName: string | null | undefined): string {
  const trimmed = (firstName ?? "").trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

// Cache-busting lives in src/lib/images.ts (shared with background pictures
// and Cloudinary asset URLs) — re-export so avatar consumers have one
// import source. Format is ?t={epochMs} to match every existing user
// picture URL in the codebase.
export { bustUrl } from "../images";

// Empty string counts as "no picture" — some legacy accounts have "" not
// null. Trim before checking so " " doesn't slip through as truthy.
export function hasProfilePicture(
  profilePicture: string | null | undefined
): boolean {
  return !!profilePicture && profilePicture.trim() !== "";
}

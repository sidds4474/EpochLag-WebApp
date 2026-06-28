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

export function excerpt(text: string | null | undefined, maxLength = 150): string {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength - 1).trimEnd()}…`;
}

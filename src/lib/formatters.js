export function formatLongDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getInitials(firstName, lastName) {
  const first = (firstName || "").trim()[0] || "";
  const last = (lastName || "").trim()[0] || "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "?";
}

export function fullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export function excerpt(text, maxLength = 150) {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) return flat;
  return `${flat.slice(0, maxLength - 1).trimEnd()}…`;
}

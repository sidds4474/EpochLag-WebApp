const KEY_PREFIX = "recentCoverPicks:";
const MAX = 8;

function isRemote(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export function loadRecentCovers(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + userId);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Filter out any non-remote entries — blob URLs die on refresh.
    return arr.filter((u) => typeof u === "string" && isRemote(u)).slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecentCover(userId: string, url: string): string[] {
  if (typeof window === "undefined") return [];
  if (!isRemote(url)) return loadRecentCovers(userId);
  const current = loadRecentCovers(userId);
  const deduped = [url, ...current.filter((u) => u !== url)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(deduped));
  } catch {
    // storage full — swallow
  }
  return deduped;
}

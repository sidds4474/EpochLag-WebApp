// Persistent state for the "Connect with 3 friends" docking-station
// challenge. Mirrors mobile's AsyncStorage keys (dockingStationCache.js) so
// a user who runs both the mobile app and web sees a shared counter — well,
// as shared as web-vs-mobile can be, which is per-device but at least the
// same shape.

export const CHALLENGE_INVITE_GOAL = 3;

const KEY_COUNT = (userId: string) => `dockingChallengeInvites:${userId}`;
const KEY_CHANNELS = (userId: string) => `linkShareChannels:${userId}`;
const KEY_DONE = (userId: string) => `dockingChallengeDone:${userId}`;

const isBrowser = () => typeof window !== "undefined";

export function loadChallengeInviteCount(userId: string | null | undefined): number {
  if (!isBrowser() || !userId) return 0;
  const raw = window.localStorage.getItem(KEY_COUNT(userId));
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(0, n), CHALLENGE_INVITE_GOAL);
}

function saveChallengeInviteCount(userId: string, count: number) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_COUNT(userId), String(count));
}

export function loadLinkShareChannels(userId: string | null | undefined): string[] {
  if (!isBrowser() || !userId) return [];
  try {
    const raw = window.localStorage.getItem(KEY_CHANNELS(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveLinkShareChannels(userId: string, channels: string[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY_CHANNELS(userId), JSON.stringify(channels));
}

export type CreditResult = { credited: boolean; count: number };

// Per-channel dedup: the first tap of a given channel counts, subsequent
// taps of the same channel don't. Matches mobile's
// creditLinkShareChannel (dockingStationCache.js:97).
export function creditLinkShareChannel(
  userId: string | null | undefined,
  channel: string
): CreditResult {
  if (!userId || !channel) return { credited: false, count: 0 };
  const channels = loadLinkShareChannels(userId);
  if (channels.includes(channel)) {
    return { credited: false, count: loadChallengeInviteCount(userId) };
  }
  channels.push(channel);
  saveLinkShareChannels(userId, channels);
  const nextCount = Math.min(
    loadChallengeInviteCount(userId) + 1,
    CHALLENGE_INVITE_GOAL
  );
  saveChallengeInviteCount(userId, nextCount);
  return { credited: true, count: nextCount };
}

export function markChallengeCompleted(userId: string | null | undefined) {
  if (!isBrowser() || !userId) return;
  window.localStorage.setItem(KEY_DONE(userId), "1");
}

export function isChallengeCompleted(userId: string | null | undefined): boolean {
  if (!isBrowser() || !userId) return false;
  return window.localStorage.getItem(KEY_DONE(userId)) === "1";
}

// Short-lived "resume this reply submit after login" slot.
//
// Why this exists: when the public reply flow gets a 409 LOGIN_REQUIRED on
// submit, we route the user to /login and they come back via returnTo. But
// if we just re-mount ReplyFlow and call openReply() fresh, we mint a brand
// new draftToken — and the user's previously-composed content (audio,
// title, text, cover) lives on the OLD draftToken that was just abandoned.
//
// Instead, before routing away, we stash the current draftToken (and any
// replyAs identity). On return, if the user is now authed AND we see this
// slot, we skip openReply, reuse the saved draftToken, and immediately
// re-attempt the submit — which will succeed with the JWT.

import type { ReplyAs } from "./publicReplies";

const KEY = "epochlag.pendingReplyResume";

type ResumeSlot = {
  draftToken: string;
  targetType: "prompt" | "story";
  code: string;
  replyAs?: ReplyAs;
  stashedAt: number;
};

// Stash slot stays valid for 10 minutes; anything older is considered stale
// (user probably bailed out of the login flow).
const MAX_AGE_MS = 10 * 60 * 1000;

export function setPendingReplyResume(slot: Omit<ResumeSlot, "stashedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ResumeSlot = { ...slot, stashedAt: Date.now() };
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {}
}

export function consumePendingReplyResume(
  expected: { targetType: string; code: string }
): ResumeSlot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeSlot;
    // Only resume if we're back on the same prompt/story — otherwise the user
    // probably navigated elsewhere.
    if (
      parsed.targetType !== expected.targetType ||
      parsed.code !== expected.code
    ) {
      return null;
    }
    if (Date.now() - parsed.stashedAt > MAX_AGE_MS) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    // One-shot: remove on consume so refreshing doesn't double-submit.
    window.sessionStorage.removeItem(KEY);
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingReplyResume(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {}
}

import { api } from "../api/client";

type Envelope<T> = { success: boolean; message?: string; data: T };

export type ReferralCodeResponse = {
  code: string;
};

// Module-scoped cache for the current user's referral code. Safe because
// signOut hard-reloads the tab — the cache dies with the JS runtime, so
// there's no cross-user leak. `inflight` dedupes concurrent callers (e.g.
// a home-tile prefetch racing the invite-page mount) into one round-trip.
let cachedReferralCode: string | null = null;
let inflightReferralMint: Promise<string> | null = null;

// Mint OR fetch the current user's referral code. Idempotent on BE — one
// code per user, so repeated calls return the same code. `entryPoint` is
// analytics-only; mobile always sends "docking_station" for this flow.
// The client-side cache means the second visit reads synchronously.
export async function mintReferralCode(
  entryPoint = "docking_station"
): Promise<string> {
  if (cachedReferralCode) return cachedReferralCode;
  if (inflightReferralMint) return inflightReferralMint;
  inflightReferralMint = (async () => {
    try {
      const res = await api.post<Envelope<ReferralCodeResponse>>(
        "/api/referral/code",
        { entryPoint }
      );
      const code = res.data?.code ?? "";
      if (code) cachedReferralCode = code;
      return code;
    } finally {
      inflightReferralMint = null;
    }
  })();
  return inflightReferralMint;
}

// Read-only accessor for warm-cache checks (skip loading UI if we already
// have it). Returns null if the code hasn't been minted this session.
export function getCachedReferralCode(): string | null {
  return cachedReferralCode;
}

// Fire-and-forget prefetch. Home mounts this on load so the invite page
// renders the link on first paint when the user taps the tile. Errors
// are swallowed — a failed prefetch just means the invite page falls
// back to a normal mint on its own mount.
export function prefetchReferralCode(entryPoint = "docking_station"): void {
  if (cachedReferralCode || inflightReferralMint) return;
  void mintReferralCode(entryPoint).catch(() => {});
}

export function buildReferralUrl(code: string): string {
  return `https://epochlag.com/r/${code}`;
}

// Per-channel share URLs. Each opens in a new tab; the target app takes
// over from there. Messenger uses the fb-messenger:// deeplink which
// opens the app if installed and silently fails on desktop — same
// graceful-degrade shape as sms:.
export type ShareChannel = "whatsapp" | "messenger" | "facebook" | "sms";

export function buildChannelShareUrl(
  channel: ShareChannel,
  message: string,
  shareUrl: string
): string {
  const encodedMessage = encodeURIComponent(message);
  const encodedShareUrl = encodeURIComponent(shareUrl);
  switch (channel) {
    case "whatsapp":
      return `https://wa.me/?text=${encodedMessage}`;
    case "messenger":
      return `fb-messenger://share?link=${encodedShareUrl}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}&quote=${encodedMessage}`;
    case "sms":
      return `sms:?body=${encodedMessage}`;
  }
}

// Verbatim template from mobile's referralMessage.js:37. Preserves the two
// Play Store + App Store lines because mobile-web users on Android read the
// message and want a tappable Play Store link, and vice versa.
export function buildReferralInviteMessage(
  code: string,
  note?: string
): string {
  const trimmedNote = (note ?? "").trim();
  const base = `Hey! I've been using Epoch Lag to save memories with the people who matter. Thought you'd like it too - join me.

Download our Play Store app from here: https://play.google.com/store/apps/details?id=com.epoch.epochlag

Download our App Store app from here: https://apps.apple.com/us/app/epoch-lag/id6745345209

Use code "${code}" and we both get 30 days free.
Excited to storytell with you soon!`;
  return trimmedNote ? `${base}\n\n${trimmedNote}` : base;
}

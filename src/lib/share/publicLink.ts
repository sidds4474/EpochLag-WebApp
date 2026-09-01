import { api } from "../api/client";

// Mirrors the mobile share model. BE returns { data: { publicCode } };
// client concatenates against a static base URL. Base is staging while
// marketing pages finalize — swap to www.epochlag.com at prod launch.
// TEMP: pointing at staging.epochlag.com — one-line swap when marketing
// pages ship on prod.
const PUBLIC_BASE: Record<PublicLinkKind, string> = {
  story: "https://staging.epochlag.com/story",
  prompt: "https://staging.epochlag.com/prompt",
  moment: "https://staging.epochlag.com/moment",
  // album: "https://staging.epochlag.com/album", // Album share not yet
  // functional on web — see rollout notes.
};

export type PublicLinkKind = "story" | "prompt" | "moment";

type MintEnvelope = {
  success?: boolean;
  data?: { publicCode?: string | null };
};

// Mint (or fetch) a public share code for a story thread / prompt / moment.
// Idempotent on BE — repeated calls return the same code. Returns null on
// failure so callers can fall back to the store-blurb message (matches
// mobile's silent-degrade behavior; no error toast).
export async function mintPublicCode(
  kind: PublicLinkKind,
  id: string
): Promise<string | null> {
  const endpoint =
    kind === "story"
      ? `/api/stories/thread/${id}/public-link`
      : kind === "prompt"
        ? `/api/user-card/${id}/public-link`
        : kind === "moment"
          ? `/api/moments/${id}/public-link`
          : null;
  if (!endpoint) return null;
  try {
    const res = await api.post<MintEnvelope>(endpoint);
    return res.data?.publicCode ?? null;
  } catch {
    return null;
  }
}

export function buildPublicUrl(
  kind: PublicLinkKind,
  code: string | null | undefined
): string | null {
  if (!code) return null;
  return `${PUBLIC_BASE[kind]}/${code}`;
}

import { api } from "../api/client";

type Envelope<T> = { success: boolean; message?: string; data: T };

type MintPublicLinkData = {
  publicCode: string;
  publicUrl?: string;
  viewCount?: number;
  hasStory?: boolean;
};

// Mint (or fetch, idempotent) the public link for a prompt card. Once a
// story is written off the prompt, the same code auto-grows to serve the
// story — no re-mint needed.
export async function mintPromptPublicLink(
  cardId: string
): Promise<MintPublicLinkData> {
  const res = await api.post<Envelope<MintPublicLinkData>>(
    `/api/user-card/${cardId}/public-link`,
    {}
  );
  return res.data;
}

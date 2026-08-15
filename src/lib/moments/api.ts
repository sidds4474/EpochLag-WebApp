import { api } from "../api/client";
import type {
  FriendSearchResult,
  Moment,
  MomentFilter,
  MomentOptions,
} from "../../types/moment";

type Envelope<T> = { success: boolean; data: T };
type PagedEnvelope<T> = Envelope<T> & {
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
};

export type GradientImage = {
  _id: string;
  url?: string;
  imageUrl?: string;
  uri?: string;
  type?: string;
};

let gradientsMemo: Promise<GradientImage[]> | null = null;

export async function fetchGradients(): Promise<GradientImage[]> {
  if (gradientsMemo) return gradientsMemo;
  gradientsMemo = api
    .get<Envelope<GradientImage[]>>("/api/cards/gradients")
    .then((res) => res.data)
    .catch((err) => {
      gradientsMemo = null;
      throw err;
    });
  return gradientsMemo;
}

export function gradientUrl(g: GradientImage): string {
  return g.url || g.imageUrl || g.uri || "";
}

export const DEFAULT_HOSTED_COVER_URL =
  "https://epochlag-bucket.s3.us-east-1.amazonaws.com/color-gradient/gradient-10.png";

export async function fetchMomentOptions(): Promise<MomentOptions> {
  const res = await api.get<Envelope<MomentOptions>>("/api/moments/options");
  return res.data;
}

export async function fetchMoments(
  filter: MomentFilter,
  page = 1,
  limit = 50
): Promise<Moment[]> {
  const res = await api.get<PagedEnvelope<Moment[]>>(
    `/api/moments?filter=${filter}&page=${page}&limit=${limit}`
  );
  return res.data;
}

export async function fetchCountdown(): Promise<Moment[]> {
  const res = await api.get<Envelope<Moment[]>>("/api/moments/countdown");
  return res.data;
}

export type CreateMomentJsonBody = {
  type: string;
  title: string;
  date: string;
  isRecurring: boolean;
  frequency?: string | null;
  coverImageUrl?: string | null;
  note?: string | null;
};

export async function createMomentJson(body: CreateMomentJsonBody): Promise<Moment> {
  const res = await api.post<Envelope<Moment>>("/api/moments", body);
  return res.data;
}

export async function createMomentMultipart(form: FormData): Promise<Moment> {
  const res = await api.post<Envelope<Moment>>("/api/moments", form);
  return res.data;
}

export async function patchMomentJson(
  id: string,
  patch: Partial<CreateMomentJsonBody>
): Promise<Moment> {
  const res = await api.patch<Envelope<Moment>>(`/api/moments/${id}`, patch);
  return res.data;
}

export async function patchMomentMultipart(
  id: string,
  form: FormData
): Promise<Moment> {
  const res = await api.patch<Envelope<Moment>>(`/api/moments/${id}`, form);
  return res.data;
}

export async function deleteMoment(id: string): Promise<void> {
  await api.delete(`/api/moments/${id}`);
}

export async function pinCountdown(id: string): Promise<void> {
  await api.post(`/api/moments/${id}/countdown`);
}

export async function unpinCountdown(id: string): Promise<void> {
  await api.delete(`/api/moments/${id}/countdown`);
}

export async function inviteToMoment(id: string, inviteeId: string): Promise<void> {
  await api.post(`/api/moments/${id}/invite`, { inviteeId });
}

export async function respondToInvite(
  id: string,
  response: "accepted" | "declined"
): Promise<Moment | null> {
  const res = await api.post<Envelope<Moment | null>>(
    `/api/moments/${id}/respond`,
    { response }
  );
  return res.data ?? null;
}

export async function removeParticipant(
  id: string,
  userId: string
): Promise<Moment["participants"]> {
  const res = await api.delete<Envelope<{ participants: Moment["participants"] }>>(
    `/api/moments/${id}/participants/${userId}`
  );
  return res.data.participants;
}

export async function leaveMoment(id: string): Promise<void> {
  await api.post(`/api/moments/${id}/leave`);
}

export async function searchFriends(
  query: string,
  page = 1,
  limit = 50
): Promise<FriendSearchResult[]> {
  const q = encodeURIComponent(query);
  const res = await api.get<unknown>(
    `/api/users/friends/search?query=${q}&page=${page}&limit=${limit}`
  );

  const extract = (v: unknown): FriendSearchResult[] => {
    if (Array.isArray(v)) return v as FriendSearchResult[];
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      for (const key of ["items", "friends", "users", "results", "data"]) {
        if (Array.isArray(obj[key])) return obj[key] as FriendSearchResult[];
      }
      // one level deeper
      if (obj.data && typeof obj.data === "object") {
        return extract(obj.data);
      }
    }
    return [];
  };

  // Top-level envelope: {success, data: ...}
  if (res && typeof res === "object" && "data" in (res as object)) {
    return extract((res as { data: unknown }).data);
  }
  return extract(res);
}

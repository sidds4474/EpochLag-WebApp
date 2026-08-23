import { api } from "../api/client";
import type { User } from "../../types/user";
import type { Moment } from "../../types/moment";

type Envelope<T> = { success?: boolean; message?: string; data: T };

export type ProfileUpdateFields = Partial<{
  firstName: string;
  lastName: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  dateOfBirth: string;
  phone: string;
  countryCode: string;
}>;

export async function fetchMyProfile(): Promise<User> {
  const res = await api.get<Envelope<User>>("/api/users/profile/me");
  return res.data;
}

// BE expects application/x-www-form-urlencoded on this endpoint (not JSON —
// verified against the mobile client). Empty-string fields are still sent
// so the user can clear an existing bio / location.
export async function updateMyProfile(
  fields: ProfileUpdateFields
): Promise<User> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    body.append(k, String(v));
  }
  const res = await api.put<Envelope<User>>(
    "/api/users/profile/me",
    body
  );
  return res.data;
}

export async function uploadProfilePicture(file: File): Promise<User> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.put<Envelope<User>>(
    "/api/users/profile/picture",
    form
  );
  return res.data;
}

export async function uploadBackgroundPicture(file: File): Promise<User> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.put<Envelope<User>>(
    "/api/users/profile/background",
    form
  );
  return res.data;
}

// Curated-gradient path: same endpoint, but JSON `{ imageUrl }` instead of
// multipart. Skips the client-side blob download that the modal previously
// used to squeeze curated picks through the multipart contract.
export async function setBackgroundPictureUrl(imageUrl: string): Promise<User> {
  const res = await api.put<Envelope<User>>(
    "/api/users/profile/background",
    { imageUrl }
  );
  return res.data;
}

type MomentsRawData =
  | Moment[]
  | { items?: Moment[]; events?: Moment[] };

export async function fetchMyMoments(
  page = 1,
  limit = 100
): Promise<Moment[]> {
  const res = await api.get<Envelope<MomentsRawData>>(
    `/api/calendar-events?page=${page}&limit=${limit}`
  );
  const raw = res.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.events)) return raw.events;
  return [];
}

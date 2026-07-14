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

export async function updateMyProfile(
  fields: ProfileUpdateFields
): Promise<User> {
  const res = await api.put<Envelope<User>>(
    "/api/users/profile/me",
    fields
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

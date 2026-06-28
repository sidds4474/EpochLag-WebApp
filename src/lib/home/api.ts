import { api } from "../api/client";
import type { User } from "../../types/user";
import type { HomePeople, Notification, UserCard } from "../../types/home";

type Envelope<T> = { success: boolean; message?: string; data: T };
type ReceivedEnvelope = Envelope<UserCard[]> & { pagination?: unknown };
type InspoRawData = UserCard[] | { feed?: UserCard[] };
type InspoEnvelope = Envelope<InspoRawData> & { pagination?: unknown };

export async function fetchUserProfile(): Promise<User> {
  const res = await api.get<Envelope<User>>("/api/users/profile/me");
  return res.data;
}

export async function fetchReceivedCards(
  page = 1,
  limit = 20
): Promise<{ cards: UserCard[]; envelope: ReceivedEnvelope }> {
  const res = await api.get<ReceivedEnvelope>(
    `/api/user-card?page=${page}&limit=${limit}&type=received`
  );
  return { cards: res.data ?? [], envelope: res };
}

export async function fetchInspirationFeed(
  pageNumber = 1,
  pageSize = 20
): Promise<{ cards: UserCard[]; envelope: InspoEnvelope }> {
  const res = await api.get<InspoEnvelope>(
    `/api/user-card/feed?pageNumber=${pageNumber}&pageSize=${pageSize}&inspoOnly=true`
  );
  const data = res.data;
  const cards: UserCard[] = Array.isArray(data) ? data : data?.feed ?? [];
  return { cards, envelope: res };
}

type BookmarkEnvelope = { success: boolean; message?: string };

export async function toggleCardBookmark(cardId: string): Promise<void> {
  await api.post<BookmarkEnvelope>(`/api/bookmarks/${cardId}`);
}

export async function fetchHomePeople(): Promise<HomePeople> {
  const res = await api.get<Envelope<HomePeople>>("/api/homescreen/people/");
  return res.data;
}

export async function fetchNotifications(): Promise<{
  items: Notification[];
  unreadCount: number;
}> {
  const res = await api.get<Envelope<Notification[]> & { unreadCount?: number }>(
    "/api/notifications"
  );
  return { items: res.data, unreadCount: res.unreadCount ?? 0 };
}

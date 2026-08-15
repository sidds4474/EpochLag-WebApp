import { api } from "../api/client";
import type { Notification } from "../../types/home";

type Envelope<T> = { success: boolean; message?: string; data: T };

export type DockingCard = {
  _id: string;
  title?: string | null;
  message?: string | null;
  imagePath?: string | null;
  action?: { kind?: string; [k: string]: unknown } | null;
  cardType?: string;
  [k: string]: unknown;
};

// Module-level enrichment cache for docking_station_card rows.
//   undefined = still pending (render skeleton)
//   null      = resolved with no data (fall back to generic per-cardType label)
//   object    = the real card
const dockingCardCache = new Map<string, DockingCard | null>();

export function getCachedDockingCard(
  cardId: string
): DockingCard | null | undefined {
  return dockingCardCache.get(cardId);
}

export function seedDockingCard(cardId: string, card: DockingCard | null) {
  dockingCardCache.set(cardId, card);
}

export async function fetchDockingCard(
  cardId: string
): Promise<DockingCard | null> {
  const cached = dockingCardCache.get(cardId);
  if (cached !== undefined) return cached;
  try {
    const res = await api.get<Envelope<DockingCard>>(
      `/api/docking-station/cards/${cardId}`
    );
    const card = res.data ?? null;
    dockingCardCache.set(cardId, card);
    return card;
  } catch {
    dockingCardCache.set(cardId, null);
    return null;
  }
}

// Fire enrichment for every docking cardId referenced by the list, but race
// against a 4s timeout so a stalled endpoint doesn't hang the whole render.
// After the race, force-plant `null` for anything still unresolved so rows
// fall through to the generic label instead of getting stuck on skeleton.
export async function enrichDockingCards(
  notifications: Notification[],
  timeoutMs = 4000
): Promise<void> {
  const cardIds = Array.from(
    new Set(
      notifications
        .filter((n) => n.type === "docking_station_card")
        .map((n) => n.navigation?.dockingDetails?.cardId)
        .filter((v): v is string => Boolean(v))
    )
  );
  if (cardIds.length === 0) return;

  await Promise.race([
    Promise.all(cardIds.map((id) => fetchDockingCard(id))),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  for (const id of cardIds) {
    if (!dockingCardCache.has(id)) dockingCardCache.set(id, null);
  }
}

export async function fetchNotifications(): Promise<{
  items: Notification[];
  unreadCount: number;
}> {
  const res = await api.get<
    Envelope<Notification[]> & { unreadCount?: number }
  >("/api/notifications");
  const items = res.data ?? [];
  const derived = items.reduce((n, item) => (item.seen ? n : n + 1), 0);
  return { items, unreadCount: res.unreadCount ?? derived };
}

export async function markNotificationSeen(id: string): Promise<void> {
  try {
    await api.put(`/api/notifications/${id}/mark-seen`);
  } catch (err) {
    // BE returns 404 when the notification was already cleared. That's fine —
    // the local optimistic flip stands.
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      (err as { status: number }).status === 404
    ) {
      return;
    }
    throw err;
  }
}

export async function clearAllNotifications(): Promise<void> {
  await api.delete("/api/notifications/clear-all");
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean
): Promise<void> {
  const body = new URLSearchParams();
  body.set("accept", accept ? "true" : "false");
  await api.post(`/api/friend-requests/respond/${requestId}`, body);
}

// Used to route received/birthday/scheduled prompt taps — the caller inspects
// the returned card to decide OpenStory vs CreateStory/PromptDetail. Repeat
// taps hit this cache instead of re-fetching.
const promptRouteCache = new Map<string, unknown>();

export async function resolvePromptRoute(promptId: string): Promise<unknown> {
  if (promptRouteCache.has(promptId)) return promptRouteCache.get(promptId);
  const res = await api.get<Envelope<unknown>>(`/api/user-card/${promptId}`);
  promptRouteCache.set(promptId, res.data);
  return res.data;
}

export type FeatureUpdatesSettings = Record<string, boolean>;

export async function fetchFeatureUpdatesSettings(): Promise<FeatureUpdatesSettings> {
  const res = await api.get<Envelope<FeatureUpdatesSettings>>(
    "/api/users/feature-updates-notifications"
  );
  return res.data ?? {};
}

export async function updateFeatureUpdatesSettings(
  patch: FeatureUpdatesSettings
): Promise<void> {
  await api.put("/api/users/feature-updates-notifications", patch);
}

export function getTimeDifference(iso: string | undefined | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${d}d`;
}

// Section order is authoritative from BE; when we group by sectionTitle we
// preserve the order we first saw each bucket in.
export function groupBySection(
  notifications: Notification[]
): { title: string; items: Notification[] }[] {
  const order: string[] = [];
  const buckets = new Map<string, Notification[]>();
  for (const n of notifications) {
    const key = n.sectionTitle || "Earlier";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(n);
  }
  return order.map((title) => ({ title, items: buckets.get(title)! }));
}

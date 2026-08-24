import { api } from "../api/client";
import type { User } from "../../types/user";
import type { LibraryThread } from "../library/api";

type Envelope<T> = { success?: boolean; message?: string; data: T; pagination?: Pagination };

export type Pagination = {
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
};

// Any user's profile fetched via the shared /me endpoint with a userID
// query param. Includes the relationship booleans the friend profile
// page needs to pick a CTA state. friendRequestID is only populated
// when isReceived === true (they sent us a request); accept/decline
// need it as the resource id.
export type ProfileWithRelationship = User & {
  isFriend?: boolean;
  isBlocked?: boolean;
  isPending?: boolean;
  isReceived?: boolean;
  friendRequestID?: string | null;
};

// The BE reuses /api/users/profile/me for other users: same shape,
// same route, but with ?userID=<id>. Passing no param returns the
// current user (see fetchMyProfile). We deliberately hit this
// endpoint instead of a bespoke /users/:id path — the mobile client
// does the same and the response includes the relationship flags.
export async function fetchUserProfile(userId: string): Promise<ProfileWithRelationship> {
  const res = await api.get<Envelope<ProfileWithRelationship>>(
    `/api/users/profile/me?userID=${encodeURIComponent(userId)}`
  );
  return res.data;
}

// Six relationship states derived from the boolean ladder on the
// profile response. Client-only "declined" is layered on top after
// the user taps Decline — the BE doesn't persist that state, we just
// don't want to flip back to "requested" before the user leaves.
export type RelationshipStatus =
  | "connection"
  | "notConnected"
  | "pending"      // you sent them a request, awaiting their response
  | "requested"   // they sent you a request, awaiting your response
  | "declined"    // client-only, transient
  | "blocked";

export function deriveRelationshipStatus(
  p: ProfileWithRelationship
): RelationshipStatus {
  if (p.isBlocked) return "blocked";
  if (p.isFriend) return "connection";
  if (p.isReceived) return "requested";
  if (p.isPending) return "pending";
  return "notConnected";
}

// ── Friend-request writes ──────────────────────────────────────────
// The same DELETE endpoint covers both "cancel my outgoing request"
// and "remove existing connection" — BE inspects the current relation
// and does the right thing.

export async function sendFriendRequest(userId: string): Promise<void> {
  await api.post(`/api/friend-requests/${encodeURIComponent(userId)}`);
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean
): Promise<void> {
  const body = new URLSearchParams();
  body.append("accept", String(accept));
  await api.post(
    `/api/friend-requests/respond/${encodeURIComponent(requestId)}`,
    body
  );
}

export async function removeConnection(userId: string): Promise<void> {
  await api.delete(`/api/friend-requests/${encodeURIComponent(userId)}`);
}

export async function blockUser(userId: string): Promise<void> {
  await api.post(`/api/users/friends/block/${encodeURIComponent(userId)}`);
}

export async function unblockUser(userId: string): Promise<void> {
  await api.post(`/api/users/friends/unblock/${encodeURIComponent(userId)}`);
}

// ── Shared stories ─────────────────────────────────────────────────
// Fetches stories both users participate in. BE's /api/stories accepts
// a `people` param that filters to threads including the given userId.
// No `type` param needed — we want cross-participation regardless of
// mode. Response envelope varies (threads vs promptCards) — normalize.
// ── Friend requests (list) ─────────────────────────────────────────
// `type=received` returns requests where the current user is receiverId;
// `type=sent` returns requests where the current user is senderId. BE
// populates the opposite party's user summary on each row.
export type PersonLike = {
  _id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  epochlagID?: string;
  updatedAt?: string;
};

// BE response shape (mobile source of truth):
// received rows -> requester = other user, recipient = me
// sent rows     -> requester = me,        recipient = other user
// Field name for the avatar in the BE response is `profileImage` (not
// `profilePicture`). We normalize into PersonLike so consumers can use
// a single shape.
type FriendRequestRaw = {
  _id: string;
  requester?: (PersonLike & { profileImage?: string | null; email?: string; phone?: string }) | null;
  recipient?: (PersonLike & { profileImage?: string | null; email?: string; phone?: string }) | null;
  status?: string;
  createdAt?: string;
};

export type FriendRequestPerson = PersonLike & {
  email?: string;
  phone?: string;
};

export type FriendRequest = {
  _id: string;
  requester?: FriendRequestPerson;
  recipient?: FriendRequestPerson;
  status?: string;
  createdAt?: string;
};

function normalizePerson(
  p: FriendRequestRaw["requester"]
): FriendRequestPerson | undefined {
  if (!p) return undefined;
  return {
    _id: p._id,
    firstName: p.firstName,
    lastName: p.lastName,
    epochlagID: p.epochlagID,
    updatedAt: p.updatedAt,
    profilePicture: p.profilePicture ?? p.profileImage ?? null,
    email: p.email,
    phone: p.phone,
  };
}

function normalizeRequest(r: FriendRequestRaw): FriendRequest {
  return {
    _id: r._id,
    status: r.status,
    createdAt: r.createdAt,
    requester: normalizePerson(r.requester),
    recipient: normalizePerson(r.recipient),
  };
}

export async function fetchReceivedRequests(): Promise<FriendRequest[]> {
  const res = await api.get<Envelope<FriendRequestRaw[]>>(
    "/api/friend-requests?type=received"
  );
  return (res.data ?? []).filter((r) => r && r.requester).map(normalizeRequest);
}

export async function fetchSentRequests(): Promise<FriendRequest[]> {
  const res = await api.get<Envelope<FriendRequestRaw[]>>(
    "/api/friend-requests?type=sent"
  );
  return (res.data ?? []).filter((r) => r && r.recipient).map(normalizeRequest);
}

// Separate export alongside removeConnection — semantically distinct even
// though the BE route is the same.
export async function cancelRequest(receiverUserId: string): Promise<void> {
  await api.delete(`/api/friend-requests/${encodeURIComponent(receiverUserId)}`);
}

// ── Groups ─────────────────────────────────────────────────────────
export type GroupDetail = {
  _id: string;
  name: string;
  groupPhotoUrl: string | null;
  members: PersonLike[];
  memberCount: number;
  owner?: PersonLike | string;
  createdAt?: string;
};

export async function fetchGroups(): Promise<GroupDetail[]> {
  const res = await api.get<Envelope<GroupDetail[]>>("/api/groups/getGroups");
  return res.data ?? [];
}

export async function createGroup(input: {
  name: string;
  memberIds: string[];
  file?: File | null;
}): Promise<GroupDetail> {
  const fd = new FormData();
  fd.append("name", input.name);
  for (const id of input.memberIds) fd.append("memberIds[]", id);
  if (input.file) fd.append("file", input.file);
  const res = await api.put<Envelope<GroupDetail>>("/api/groups/create", fd);
  return res.data;
}

export async function addUsersToGroup(
  groupId: string,
  members: string[]
): Promise<void> {
  const { getStoredUser } = await import("../auth/storage");
  const currentUserId = getStoredUser()?._id ?? "";
  await api.post("/api/groups/addUsersToGroup", {
    "user._id": currentUserId,
    groupId,
    members,
  });
}

export async function leaveGroup(groupId: string): Promise<void> {
  await api.post("/api/groups/leaveGroup", { groupId });
}

// ── User search ────────────────────────────────────────────────────
// BE tokenizes the query internally by whitespace; sending only the first
// token keeps parity with the mobile client (avoids empty results when
// users type "First Last" but the BE only indexed the first name).
export type UserSearchResult = PersonLike & {
  isFriend?: boolean;
  isPending?: boolean;
  isReceived?: boolean;
  isBlocked?: boolean;
};

export async function searchUsers(
  query: string,
  page = 1,
  limit = 50
): Promise<UserSearchResult[]> {
  const firstToken = query.trim().split(/\s+/)[0] ?? "";
  if (!firstToken) return [];
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  qs.set("query", firstToken);
  const res = await api.get<Envelope<UserSearchResult[]>>(
    `/api/users/search?${qs.toString()}`
  );
  return res.data ?? [];
}

export async function fetchSharedStories(
  userId: string,
  page = 1,
  limit = 10
): Promise<{ stories: LibraryThread[]; pagination: Pagination | null }> {
  const qs = new URLSearchParams();
  qs.set("people", userId);
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  qs.set("sortBy", "latestActivity");
  qs.set("sortOrder", "desc");
  const res = await api.get<Envelope<Record<string, unknown>>>(
    `/api/stories?${qs.toString()}`
  );
  const raw = res.data ?? {};
  const stories =
    (raw.threads as LibraryThread[] | undefined) ??
    (raw.promptCards as LibraryThread[] | undefined) ??
    [];
  return { stories, pagination: res.pagination ?? null };
}

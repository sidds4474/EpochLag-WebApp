"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import type { LibraryThread } from "../../../../../lib/library/api";
import {
  blockUser,
  deriveRelationshipStatus,
  fetchSharedStories,
  fetchUserProfile,
  removeConnection,
  respondToFriendRequest,
  sendFriendRequest,
  unblockUser,
  type ProfileWithRelationship,
  type RelationshipStatus,
} from "../../../../../lib/connections/api";
import ConfirmationModal from "../../../../../components/ConfirmationModal/ConfirmationModal";
import { ChevronLeftIcon } from "../../icons";
import FriendProfileHeader from "./FriendProfileHeader";
import SharedStoriesSection from "./SharedStoriesSection";

// Friend's profile page. Route: /profile/[id]. Renders someone else's
// profile with a per-state CTA row (six relationship states), a 3-dot
// menu for Block/Remove, and a "Shared with X" grid populated from
// GET /api/stories?people=<userId>.
//
// State transitions are optimistic: every write handler flips the
// local `status` immediately and toasts on error. The next silent
// refresh (or the shared-stories effect that fires on status change)
// reconciles with the server.
export default function FriendProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params?.id ?? "";

  const [profile, setProfile] = useState<ProfileWithRelationship | null>(null);
  const [status, setStatus] = useState<RelationshipStatus | "">("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [stories, setStories] = useState<LibraryThread[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesPage, setStoriesPage] = useState(1);
  const [storiesHasMore, setStoriesHasMore] = useState(false);
  const [loadingMoreStories, setLoadingMoreStories] = useState(false);

  const [blockOpen, setBlockOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  // Guards against multiple in-flight writes on the same relationship —
  // useful because the CTA pills stay tappable during the network round-
  // trip (we optimistically flip status but the API call is still open).
  const inFlightRef = useRef(false);

  // ── Fetch profile on mount + when userId changes ────────────────
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoadingProfile(true);
    setProfileError(null);
    fetchUserProfile(userId)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setStatus(deriveRelationshipStatus(data));
      })
      .catch((err) => {
        if (cancelled) return;
        setProfileError(err instanceof ApiError ? err.message : "Unable to load profile");
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ── Fetch shared stories when status resolves to a section-visible
  // state. Blocked + declined suppress the section entirely so we
  // skip the network too.
  const shouldShowSharedSection =
    status === "connection" ||
    status === "notConnected" ||
    status === "pending" ||
    status === "requested";

  useEffect(() => {
    if (!userId || !shouldShowSharedSection) return;
    let cancelled = false;
    setStoriesLoading(true);
    fetchSharedStories(userId, 1, 10)
      .then(({ stories: list, pagination }) => {
        if (cancelled) return;
        setStories(list);
        setStoriesPage(2);
        setStoriesHasMore(hasMoreFromPagination(pagination, list.length, 10));
      })
      .catch(() => {
        if (!cancelled) {
          setStories([]);
          setStoriesHasMore(false);
        }
      })
      .finally(() => {
        if (!cancelled) setStoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, shouldShowSharedSection]);

  const loadMoreStories = useCallback(async () => {
    if (loadingMoreStories || !storiesHasMore || stories.length === 0) return;
    setLoadingMoreStories(true);
    try {
      const { stories: next, pagination } = await fetchSharedStories(userId, storiesPage, 10);
      setStories((prev) => dedupeAppend(prev, next));
      setStoriesPage((p) => p + 1);
      setStoriesHasMore(hasMoreFromPagination(pagination, next.length, 10));
    } catch {
      /* silent — user can scroll again to retry */
    } finally {
      setLoadingMoreStories(false);
    }
  }, [userId, storiesPage, loadingMoreStories, storiesHasMore, stories.length]);

  const mutualCount = useMemo(() => {
    return profile?.friendsDetails?.length ?? profile?.friends?.length ?? 0;
  }, [profile]);

  // ── Handlers ─────────────────────────────────────────────────────
  async function handleSendRequest() {
    if (inFlightRef.current || !userId) return;
    inFlightRef.current = true;
    const previous = status;
    setStatus("pending");
    try {
      await sendFriendRequest(userId);
      toast.success("Request sent");
    } catch (err) {
      setStatus(previous);
      toast.error(err instanceof ApiError ? err.message : "Unable to send request");
    } finally {
      inFlightRef.current = false;
    }
  }

  async function handleAccept() {
    if (inFlightRef.current) return;
    const reqId = profile?.friendRequestID;
    if (!reqId) return;
    inFlightRef.current = true;
    const previous = status;
    setStatus("connection");
    try {
      await respondToFriendRequest(reqId, true);
      toast.success("Request accepted");
    } catch (err) {
      setStatus(previous);
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      inFlightRef.current = false;
    }
  }

  async function handleDecline() {
    if (inFlightRef.current) return;
    const reqId = profile?.friendRequestID;
    if (!reqId) return;
    inFlightRef.current = true;
    const previous = status;
    setStatus("declined");
    try {
      await respondToFriendRequest(reqId, false);
    } catch (err) {
      setStatus(previous);
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      inFlightRef.current = false;
    }
  }

  async function handleBlockConfirm() {
    setBlockOpen(false);
    if (!userId) return;
    const previous = status;
    setStatus("blocked");
    try {
      await blockUser(userId);
      toast.success("User blocked");
    } catch (err) {
      setStatus(previous);
      toast.error(err instanceof ApiError ? err.message : "Unable to block user");
    }
  }

  async function handleUnblock() {
    if (inFlightRef.current || !userId) return;
    inFlightRef.current = true;
    const previous = status;
    setStatus("notConnected");
    try {
      await unblockUser(userId);
      toast.success("User unblocked");
    } catch (err) {
      setStatus(previous);
      toast.error(err instanceof ApiError ? err.message : "Unable to unblock user");
    } finally {
      inFlightRef.current = false;
    }
  }

  async function handleRemoveConfirm() {
    setRemoveOpen(false);
    if (!userId) return;
    const previous = status;
    setStatus("notConnected");
    try {
      await removeConnection(userId);
      toast.success("Connection removed");
    } catch (err) {
      setStatus(previous);
      toast.error(err instanceof ApiError ? err.message : "Unable to remove connection");
    }
  }

  function handleSendPrompt() {
    if (!userId) return;
    // Composer will pick up the recipient via query param and pre-select
    // it in the Share sheet. Support for `recipient=` on the composer
    // side is a follow-up — for now the route lands the user in the
    // composer with the intent preserved in the URL.
    router.push(`/new-story?recipient=${encodeURIComponent(userId)}`);
  }

  // ── Render ───────────────────────────────────────────────────────
  const firstName = profile?.firstName || "";
  const displayName = profile
    ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "User"
    : "";

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-white">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[20px] pb-[100px] md:pb-[40px] max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-[10px] mb-[12px] md:mb-[16px]">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="md:hidden cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue flex items-center justify-center hover:bg-black/[0.06] transition-colors"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
          <h1 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[28px] leading-tight">
            Studio
          </h1>
        </div>

        {loadingProfile && <SkeletonHeader />}
        {profileError && !loadingProfile && (
          <div className="py-[40px] text-center font-montserrat text-primary-blue/60 text-[14px]">
            {profileError}
          </div>
        )}
        {profile && !loadingProfile && (
          <>
            <FriendProfileHeader
              profile={profile}
              status={status}
              mutualCount={mutualCount}
              onSendRequest={handleSendRequest}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onUnblock={handleUnblock}
              onBlockClick={() => setBlockOpen(true)}
              onRemoveClick={() => setRemoveOpen(true)}
            />

            {shouldShowSharedSection && (
              <SharedStoriesSection
                firstName={firstName}
                loading={storiesLoading}
                stories={stories}
                loadingMore={loadingMoreStories}
                hasMore={storiesHasMore}
                onLoadMore={loadMoreStories}
                showSendPrompt={status === "connection"}
                onSendPrompt={handleSendPrompt}
              />
            )}
          </>
        )}
      </div>

      <ConfirmationModal
        open={blockOpen}
        title={`Block ${displayName || "this user"}?`}
        body="They won't see your stories or profile, and you won't see theirs."
        confirmLabel="Block"
        destructive
        onConfirm={handleBlockConfirm}
        onCancel={() => setBlockOpen(false)}
      />
      <ConfirmationModal
        open={removeOpen}
        title={`Remove ${displayName || "this connection"}?`}
        body="You'll no longer be connected. Shared stories stay visible."
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemoveOpen(false)}
      />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────
function dedupeAppend<T extends { _id: string }>(prev: T[], next: T[]): T[] {
  if (next.length === 0) return prev;
  const seen = new Set(prev.map((x) => x._id));
  const fresh = next.filter((x) => !seen.has(x._id));
  if (fresh.length === 0) return prev;
  return [...prev, ...fresh];
}

function hasMoreFromPagination(
  p: { totalPages?: number; currentPage?: number; pageNumber?: number } | null,
  received: number,
  limit: number
): boolean {
  if (!p) return received >= limit;
  const current = p.currentPage ?? p.pageNumber;
  if (typeof current === "number" && typeof p.totalPages === "number") {
    return current < p.totalPages;
  }
  return received >= limit;
}

function SkeletonHeader() {
  return (
    <div className="animate-pulse">
      <div className="w-full aspect-[16/6] md:aspect-[16/5] lg:aspect-[1028/212] rounded-[20px] bg-[#f3f3f3]" />
      <div className="mt-[16px] flex flex-col gap-[10px]">
        <div className="h-[24px] w-[180px] rounded bg-[#f3f3f3]" />
        <div className="h-[14px] w-[220px] rounded bg-[#f3f3f3]" />
      </div>
    </div>
  );
}

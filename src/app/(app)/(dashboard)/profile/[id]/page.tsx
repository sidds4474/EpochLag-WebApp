"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import {
  blockUser,
  deriveRelationshipStatus,
  fetchUserProfile,
  removeConnection,
  respondToFriendRequest,
  sendFriendRequest,
  unblockUser,
  type ProfileWithRelationship,
  type RelationshipStatus,
} from "../../../../../lib/connections/api";
import Link from "next/link";
import ConfirmationModal from "../../../../../components/ConfirmationModal/ConfirmationModal";
import { ChevronLeftIcon } from "../../icons";
import FriendProfileHeader from "./FriendProfileHeader";
import SuggestedQuestionsCard from "./SuggestedQuestionsCard";

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

  // Blocked + declined suppress the suggested-questions card entirely.
  const shouldShowSharedSection =
    status === "connection" ||
    status === "notConnected" ||
    status === "pending" ||
    status === "requested";

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

  function handleSendPrompt(prompt?: string) {
    if (!userId) return;
    const base = `/new-ask?recipient=${encodeURIComponent(userId)}`;
    const qs = prompt ? `${base}&prompt=${encodeURIComponent(prompt)}` : base;
    router.push(qs);
  }

  // ── Render ───────────────────────────────────────────────────────
  const firstName = profile?.firstName || "";
  const displayName = profile
    ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() || "User"
    : "";

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-[#f3f1eb]">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[24px] pb-[100px] md:pb-[48px] max-w-[1400px] mx-auto w-full">
        {/* Page title row: back + Studio + settings gear */}
        <div className="flex items-center justify-between mb-[16px] md:mb-[20px]">
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors shrink-0"
            >
              <ChevronLeftIcon width={16} height={16} />
            </button>
            <h1 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[32px] md:leading-[1.15]">
              Studio
            </h1>
          </div>
          <Link
            href="/settings"
            aria-label="Settings"
            className="cursor-pointer w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full text-[#232323] hover:bg-black/[0.05] flex items-center justify-center transition-colors"
          >
            <GearIcon width={22} height={22} />
          </Link>
        </div>

        {loadingProfile && <SkeletonHeader />}
        {profileError && !loadingProfile && (
          <div className="py-[40px] text-center font-montserrat text-[#2c2c2c]/60 text-[14px]">
            {profileError}
          </div>
        )}
        {profile && !loadingProfile && (
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
            rightSlot={
              shouldShowSharedSection ? (
                <SuggestedQuestionsCard
                  firstName={firstName}
                  onSend={(prompt) => handleSendPrompt(prompt)}
                />
              ) : null
            }
          />
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

function GearIcon({ width = 22, height = 22 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.078 1.5c-.784 0-1.44.578-1.545 1.353L9.4 3.964a8.5 8.5 0 00-1.585.657l-1.02-.674a1.56 1.56 0 00-2.03.26l-1.302 1.42a1.56 1.56 0 00-.148 1.972l.706 1.024a8.5 8.5 0 00-.638 1.605l-1.163.204A1.56 1.56 0 001 10.75v1.5c0 .784.578 1.44 1.353 1.545l1.11.15c.155.567.37 1.109.638 1.615l-.665.968a1.56 1.56 0 00.194 1.99l1.302 1.36c.55.575 1.442.65 2.08.176l.985-.732a8.5 8.5 0 001.583.66l.157 1.116c.105.775.761 1.353 1.545 1.353h1.844c.784 0 1.44-.578 1.545-1.353l.157-1.116a8.5 8.5 0 001.583-.66l.985.732a1.56 1.56 0 002.08-.176l1.302-1.36a1.56 1.56 0 00.194-1.99l-.665-.968a8.5 8.5 0 00.638-1.615l1.11-.15A1.56 1.56 0 0023 12.25v-1.5c0-.784-.578-1.44-1.353-1.545l-1.163-.204a8.5 8.5 0 00-.638-1.605l.706-1.024a1.56 1.56 0 00-.148-1.972l-1.302-1.42a1.56 1.56 0 00-2.03-.26l-1.02.674a8.5 8.5 0 00-1.585-.657l-.133-1.111A1.56 1.56 0 0013.844 1.5h-1.767a1.56 1.56 0 00-.999 0zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      />
    </svg>
  );
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

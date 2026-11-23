"use client";

// Node action card — right-side drawer that opens when the user taps an
// existing family-tree node (except "Me"). Shows identity + the four
// actions: View Relationship (linked only), Remove, Invite (ghost only),
// Add a Relative. The pencil opens the edit form.

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Avatar from "../../../../components/Avatar";
import { ApiError } from "../../../../lib/api/client";
import {
  deleteFamilyPerson,
  fetchFamilyPendingShares,
  prewarmCirclePerson,
  sendFamilyInvite,
  type FamilyTreePerson,
} from "../../../../lib/circle/api";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import { CloseIcon, PencilIcon } from "../icons";
import { getFamilyPersonState } from "./familyTree";

type Props = {
  open: boolean;
  person: FamilyTreePerson | null;
  onClose: () => void;
  onRemoved: (personId: string) => void;
  onEdit: (person: FamilyTreePerson) => void;
  onAddRelative: (person: FamilyTreePerson) => void;
};

export default function NodeActionCard({
  open,
  person,
  onClose,
  onRemoved,
  onEdit,
  onAddRelative,
}: Props) {
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Pending-shares preview — only meaningful for ghosts who haven't claimed
  // the account yet. Linked users receive shares immediately, so count is
  // conceptually zero for them.
  useEffect(() => {
    if (!open || !person) {
      setPendingCount(0);
      return;
    }
    const state = getFamilyPersonState(person);
    if (state === "LINKED" || person.isMe) {
      setPendingCount(0);
      return;
    }
    let cancelled = false;
    fetchFamilyPendingShares(person._id).then((shares) => {
      if (!cancelled) setPendingCount(shares.length);
    });
    return () => {
      cancelled = true;
    };
  }, [open, person]);

  // Prewarm the relationship detail so tapping View Relationship feels
  // instant — the person page reads from the module cache.
  useEffect(() => {
    if (!open || !person) return;
    const linked =
      person.userId || person.accountUserId || person.linkedUserId || null;
    if (linked && getFamilyPersonState(person) === "LINKED") {
      prewarmCirclePerson(linked);
    }
  }, [open, person]);

  if (!open || !person) return null;

  const state = getFamilyPersonState(person);
  const linkedUserId =
    person.userId || person.accountUserId || person.linkedUserId || null;
  const canViewRelationship = state === "LINKED" && !!linkedUserId;
  const canInvite = !person.isMe && !person.isLinked && !person.hasPendingInvite;
  const inviteLabel = person.invitedAt ? "Share invite again" : "Invite to Epoch Lag";

  async function handleRemove() {
    if (removing || !person) return;
    setRemoving(true);
    try {
      await deleteFamilyPerson(person._id);
      toast.success("Removed from your tree");
      onRemoved(person._id);
      onClose();
    } catch (err) {
      mapRemoveError(err);
      setRemoving(false);
      setConfirmRemoveOpen(false);
    }
  }

  async function handleInvite() {
    if (inviting || !person) return;
    setInviting(true);
    try {
      const payload: Record<string, string> = {};
      if (person.phone) {
        payload.phone = person.phone;
        if (person.countryCode) payload.countryCode = person.countryCode;
      }
      if (person.email) payload.email = person.email;
      if (Object.keys(payload).length === 0) {
        toast.error("No phone or email on file — edit the person to add one.");
        return;
      }
      const res = await sendFamilyInvite(person._id, payload);
      if (res.invitedExistingUser) {
        toast.success("Invitation sent");
      } else if (res.inviteToken) {
        await shareInviteToken(res.inviteToken);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || "Couldn't send invite");
      } else {
        toast.error("Couldn't send invite");
      }
    } finally {
      setInviting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex justify-end"
      onClick={() => !removing && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[420px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
      >
        <header className="flex items-center justify-end px-[20px] pt-[20px]">
          <button
            type="button"
            onClick={() => !removing && onClose()}
            aria-label="Close"
            className="w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px] flex flex-col items-center">
          {/* Avatar + pencil */}
          <div className="relative mt-[8px]">
            <div
              className={`rounded-full overflow-hidden ${ringClassFor(state)}`}
              style={{ width: 80, height: 80 }}
            >
              <Avatar
                user={{
                  firstName: person.name,
                  profilePicture: person.profilePicture ?? null,
                }}
                size={80}
                className="!w-full !h-full"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(person);
              }}
              aria-label="Edit"
              className="absolute -right-[32px] top-[8px] w-[28px] h-[28px] rounded-full bg-[#ededed] text-[#2C2C2C] flex items-center justify-center hover:bg-[#E3E3E3]"
            >
              <PencilIcon width={14} height={14} />
            </button>
          </div>

          <p className="mt-[12px] font-ivy text-[#2C2C2C] text-[18px] text-center">
            {person.name}
          </p>
          {person.relationshipSlug && (
            <p className="font-montserrat text-[#848484] text-[12px] text-center">
              {person.relationshipSlug}
            </p>
          )}

          {canViewRelationship && linkedUserId && (
            <Link
              href={`/circle/person/${linkedUserId}`}
              onClick={onClose}
              prefetch
              className="mt-[18px] px-[20px] py-[10px] rounded-full border border-[#2C2C2C]/30 font-montserrat text-[13px] text-[#2C2C2C] hover:bg-black/[0.03] transition-colors"
            >
              View Relationship
            </Link>
          )}

          <button
            type="button"
            onClick={() => setConfirmRemoveOpen(true)}
            className="mt-[14px] font-montserrat text-[#D95F3B] text-[13px] hover:underline"
          >
            Remove from Tree
          </button>

          {canInvite && (
            <>
              {pendingCount > 0 && (
                <p className="mt-[12px] font-montserrat text-[#848484] text-[12px] text-center">
                  {pendingCount} {pendingCount === 1 ? "story" : "stories"} queued · will arrive when they join
                </p>
              )}
              <button
                type="button"
                onClick={handleInvite}
                disabled={inviting}
                className="mt-[10px] font-montserrat text-primary-blue text-[13px] hover:underline disabled:opacity-60"
              >
                {inviting ? "Sending…" : inviteLabel}
              </button>
            </>
          )}

          <div className="w-full mt-[22px] mb-[18px] h-px bg-[#C9C9C9]/60" />

          <button
            type="button"
            onClick={() => {
              onClose();
              onAddRelative(person);
            }}
            className="w-full bg-primary-orange text-white rounded-full py-[12px] font-montserrat font-semibold text-[14px] hover:opacity-90 transition-opacity"
          >
            Add a Relative
          </button>
        </div>
      </div>

      <ConfirmationModal
        open={confirmRemoveOpen}
        title="Remove from tree?"
        body={`${person.name} will be removed from your Family Tree. Stories they're on will still exist.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemove}
        onCancel={() => {
          if (!removing) setConfirmRemoveOpen(false);
        }}
      />
    </div>
  );
}

function ringClassFor(
  state: "LINKED" | "ACCOUNT_PENDING" | "GHOST_INVITED" | "GHOST",
): string {
  switch (state) {
    case "LINKED":
      return "ring-[2px] ring-[#A5A5A5]";
    case "ACCOUNT_PENDING":
      return "border-[2px] border-dashed border-[#092E4A]";
    default:
      return "border-[2px] border-dashed border-primary-orange";
  }
}

function mapRemoveError(err: unknown) {
  if (err instanceof ApiError) {
    if (err.code === "NOT_PERSON_OWNER") {
      toast.error("That person isn't in your tree anymore.");
      return;
    }
    toast.error(err.message || "Couldn't remove.");
    return;
  }
  toast.error("Couldn't remove.");
}

async function shareInviteToken(token: string) {
  const url = `https://epochlag.com/family-invite/${token}`;
  const text = `Join me on Epoch Lag so I can add you to my Family Tree. ${url}`;
  const navAny = typeof navigator !== "undefined" ? navigator : null;
  if (navAny && typeof navAny.share === "function") {
    try {
      await navAny.share({ text });
      return;
    } catch {
      /* fall through */
    }
  }
  if (navAny?.clipboard?.writeText) {
    try {
      await navAny.clipboard.writeText(url);
      toast.success("Invite link copied");
      return;
    } catch {
      /* no-op */
    }
  }
  toast.success("Invite created");
}

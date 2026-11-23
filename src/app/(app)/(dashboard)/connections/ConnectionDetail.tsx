"use client";

// Right-side detail pane shown on desktop when a row is selected. Hero
// (cover + avatar + 3-dot menu), context-aware CTA, and the inspo prompt
// rotator. Data driven by fetchCirclePerson so we reuse the cover / bio /
// inspoCards already loaded for Relationship detail.

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Avatar from "../../../../components/Avatar";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import OptionsMenu, {
  type OptionsMenuItem,
} from "../../../../components/OptionsMenu/OptionsMenu";
import SendToDrawer from "../../../../components/share/SendToDrawer";
import {
  fetchCirclePerson,
  type CirclePersonDetail,
  type CirclePrompt,
} from "../../../../lib/circle/api";
import {
  blockUser,
  removeConnection,
  cancelRequest,
  sendFriendRequest,
} from "../../../../lib/connections/api";
import { shareUserCard } from "../../../../lib/create/api";
import { ApiError } from "../../../../lib/api/client";
import { ChevronLeftIcon, ChevronRightIcon, SendIcon } from "../icons";

export type DetailMode = "all" | "invites" | "pending";

type Props = {
  userId: string;
  requestId: string | null; // only for invites/pending
  mode: DetailMode;
  onAfterRemove: () => void;
  onAfterBlock: () => void;
  onAcceptInvite?: (userId: string) => void;
  onDeclineInvite?: (userId: string) => void;
};

export default function ConnectionDetail({
  userId,
  requestId,
  mode,
  onAfterRemove,
  onAfterBlock,
  onAcceptInvite,
  onDeclineInvite,
}: Props) {
  const [detail, setDetail] = useState<CirclePersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharePrompt, setSharePrompt] = useState<CirclePrompt | null>(null);

  async function handleSharePromptSend(
    userIds: string[],
    groupIds: string[],
    note: string,
  ) {
    if (!sharePrompt) return;
    try {
      await shareUserCard(sharePrompt._id, {
        shareWith: userIds,
        groupIds,
        sendSeparately: false,
        note,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not share. Please try again.";
      throw new Error(message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCirclePerson(userId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center py-[64px]">
        <div className="w-[28px] h-[28px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-[64px] text-center font-montserrat text-[#848484] text-[14px]">
        We couldn&rsquo;t load this profile.
      </div>
    );
  }

  const person = detail.person;
  const relationship = detail.relationship;
  const fullName =
    [person.firstName, person.lastName].filter(Boolean).join(" ") || "Someone";

  async function handleBlock() {
    if (busy) return;
    setBusy(true);
    try {
      await blockUser(userId);
      toast.success("User Blocked");
      onAfterBlock();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to Block User");
    } finally {
      setBusy(false);
      setConfirmBlock(false);
    }
  }

  async function handleRemove() {
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "pending") {
        await cancelRequest(userId);
        toast.success("Request cancelled");
      } else {
        await removeConnection(userId);
        toast.success("Connection removed");
      }
      onAfterRemove();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Something went wrong",
      );
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  }

  async function handleAddConnection() {
    if (busy) return;
    setBusy(true);
    try {
      await sendFriendRequest(userId);
      toast.success("Request Sent");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Unable to Send Request",
      );
    } finally {
      setBusy(false);
    }
  }

  const menuItems: OptionsMenuItem[] = (() => {
    if (mode === "pending") {
      return [
        {
          label: "Cancel Request",
          destructive: true,
          onClick: () => setConfirmRemove(true),
        },
        {
          label: "Block User",
          destructive: true,
          onClick: () => setConfirmBlock(true),
        },
      ];
    }
    if (mode === "invites") {
      return [
        {
          label: "Decline",
          destructive: true,
          onClick: () => onDeclineInvite?.(userId),
        },
        {
          label: "Block User",
          destructive: true,
          onClick: () => setConfirmBlock(true),
        },
      ];
    }
    return [
      {
        label: "Remove Connection",
        destructive: true,
        onClick: () => setConfirmRemove(true),
      },
      {
        label: "Block User",
        destructive: true,
        onClick: () => setConfirmBlock(true),
      },
    ];
  })();

  return (
    <div className="flex flex-col gap-[20px]">
      <section className="relative">
        {/* Cover — floating rounded image, no card. */}
        <div className="relative h-[160px] rounded-[20px] overflow-hidden">
          {relationship?.coverImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={relationship.coverImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, #7A5B3C 0%, #5F6246 60%, #2C2C2C 100%)",
              }}
            />
          )}
          <div className="absolute top-[12px] right-[12px]">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More options"
              className="w-[32px] h-[32px] rounded-full bg-white/90 text-[#232323] flex items-center justify-center hover:bg-white transition-colors"
            >
              <DotsHorizontal />
            </button>
            <OptionsMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              items={menuItems}
              align="right"
            />
          </div>
        </div>

        {/* Avatar straddles cover bottom. */}
        <div className="flex justify-center -mt-[40px]">
          <div className="w-[80px] h-[80px] rounded-full overflow-hidden ring-[4px] ring-[#F3F1EB]">
            <Avatar
              user={{
                firstName: person.firstName,
                profilePicture: person.profilePicture,
              }}
              size={80}
              className="!w-full !h-full"
            />
          </div>
        </div>

        <h2 className="mt-[10px] font-ivy text-[#2C2C2C] text-[22px] text-center">
          {fullName}
        </h2>
        <div className="mt-[4px] flex items-center justify-center gap-[12px] text-[#848484] font-montserrat text-[12px]">
          {relationship?.metPlace?.city && (
            <span className="inline-flex items-center gap-[4px]">
              <PinGlyph /> {relationship.metPlace.city}
            </span>
          )}
          {relationship?.metOn && (
            <span className="inline-flex items-center gap-[4px]">
              <CalendarGlyph /> {formatShortDate(relationship.metOn)}
            </span>
          )}
        </div>

        <div className="mt-[14px] flex items-center justify-center">
          <CtaButton
            mode={mode}
            busy={busy}
            onAccept={() => onAcceptInvite?.(userId)}
            onAdd={handleAddConnection}
          />
        </div>
      </section>

      {mode === "all" && (
        <PromptRotator
          prompts={detail.inspoCards ?? []}
          firstName={person.firstName}
          onSend={(p) => setSharePrompt(p)}
        />
      )}

      <SendToDrawer
        open={sharePrompt !== null}
        onClose={() => setSharePrompt(null)}
        onSend={handleSharePromptSend}
        shareContext="prompt"
        showMessageInput
        shareTarget={
          sharePrompt ? { kind: "prompt", id: sharePrompt._id } : undefined
        }
        selectedUsers={userId ? [userId] : undefined}
      />

      <ConfirmationModal
        open={confirmBlock}
        title={`Block ${fullName}?`}
        body="They won't see your Lags or be able to send you friend requests. You can unblock them later."
        confirmLabel="Block"
        destructive
        onConfirm={handleBlock}
        onCancel={() => !busy && setConfirmBlock(false)}
      />
      <ConfirmationModal
        open={confirmRemove}
        title={mode === "pending" ? "Cancel request?" : "Remove connection?"}
        body={
          mode === "pending"
            ? `${fullName} won't be notified. You can send another request later.`
            : `${fullName} will no longer be in your connections. Shared stories stay intact.`
        }
        confirmLabel={mode === "pending" ? "Cancel request" : "Remove"}
        destructive
        onConfirm={handleRemove}
        onCancel={() => !busy && setConfirmRemove(false)}
      />
    </div>
  );
}

function CtaButton({
  mode,
  busy,
  onAccept,
  onAdd,
}: {
  mode: DetailMode;
  busy: boolean;
  onAccept: () => void;
  onAdd: () => void;
}) {
  if (mode === "all") {
    return (
      <span className="inline-flex items-center gap-[6px] rounded-full bg-[#2C2C2C] text-white h-[36px] px-[18px] font-montserrat font-semibold text-[13px]">
        <CheckGlyph /> Connection
      </span>
    );
  }
  if (mode === "invites") {
    return (
      <button
        type="button"
        onClick={onAccept}
        disabled={busy}
        className="rounded-full bg-primary-orange text-white h-[36px] px-[20px] font-montserrat font-semibold text-[13px] hover:opacity-90 transition disabled:opacity-60"
      >
        Accept Invite
      </button>
    );
  }
  if (mode === "pending") {
    return (
      <span className="rounded-full bg-[#EDEDED] text-[#848484] h-[36px] px-[20px] inline-flex items-center font-montserrat text-[13px]">
        Pending
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={busy}
      className="rounded-full bg-primary-orange text-white h-[36px] px-[20px] font-montserrat font-semibold text-[13px] hover:opacity-90 transition disabled:opacity-60"
    >
      Add Connection
    </button>
  );
}

function PromptRotator({
  prompts,
  firstName,
  onSend,
}: {
  prompts: CirclePrompt[];
  firstName: string;
  onSend: (p: CirclePrompt) => void;
}) {
  const list = prompts.filter((p) => p.content?.trim());
  const [index, setIndex] = useState(() =>
    list.length > 0 ? Math.floor(Math.random() * list.length) : 0,
  );
  const intervalRef = useRef<number | null>(null);
  useEffect(() => {
    if (list.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, 7000);
    intervalRef.current = id;
    return () => {
      window.clearInterval(id);
      intervalRef.current = null;
    };
  }, [list.length]);

  if (list.length === 0) return null;
  const prompt = list[index];

  return (
    <section className="relative bg-[#E6E3D9] rounded-[20px] p-[20px] md:p-[24px] min-h-[160px] flex flex-col items-center justify-center text-center">
      {list.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
            className="absolute left-[10px] top-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full bg-white/70 text-[#232323] flex items-center justify-center hover:bg-white"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((i) => (i + 1) % list.length)}
            className="absolute right-[10px] top-1/2 -translate-y-1/2 w-[32px] h-[32px] rounded-full bg-white/70 text-[#232323] flex items-center justify-center hover:bg-white"
          >
            <ChevronRightIcon width={16} height={16} />
          </button>
        </>
      )}
      <p className="font-ivy italic text-[#2C2C2C] text-[18px] md:text-[20px] leading-[1.25] max-w-[320px]">
        {prompt.content}
      </p>
      <button
        type="button"
        onClick={() => onSend(prompt)}
        className="mt-[16px] inline-flex items-center gap-[8px] rounded-full bg-primary-orange text-white px-[18px] py-[10px] font-montserrat text-[13px] hover:opacity-90"
      >
        <SendIcon width={14} height={14} />
        Send to {firstName || "them"}
      </button>
    </section>
  );
}

function DotsHorizontal() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx={5} cy={12} r={1.75} />
      <circle cx={12} cy={12} r={1.75} />
      <circle cx={19} cy={12} r={1.75} />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
      <polyline
        points="20 6 9 17 4 12"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-7-7.6-7-12a7 7 0 1 1 14 0c0 4.4-7 12-7 12Z"
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <circle cx={12} cy={9} r={2.4} stroke="currentColor" strokeWidth={1.8} />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x={3}
        y={5}
        width={18}
        height={16}
        rx={2}
        stroke="currentColor"
        strokeWidth={1.8}
      />
      <path d="M3 10h18" stroke="currentColor" strokeWidth={1.8} />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

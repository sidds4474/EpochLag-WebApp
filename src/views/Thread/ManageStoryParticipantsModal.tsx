"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { CloseIcon, SearchIcon } from "../../app/(app)/(dashboard)/icons";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import SuccessCelebration from "../../components/SuccessCelebration";
import { ApiError } from "../../lib/api/client";
import {
  deleteStory,
  removeThreadParticipant,
  setThreadPrivacy,
  shareStory,
} from "../../lib/create/api";
import { fetchHomePeople } from "../../lib/home/api";
import { bustUrl } from "../../lib/images";
import type { PersonSummary, ThreadParticipant } from "../../types/home";

type ExtendedParticipant = ThreadParticipant & {
  isRemovable?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  threadId: string;
  storyId: string | null;
  promptContent?: string | null;
  participants: ExtendedParticipant[];
  currentUserId: string;
  creatorId?: string | null;
  isPrivateInitial: boolean;
  onPrivacyChange?: (isPrivate: boolean) => void;
  onParticipantRemoved?: (userId: string) => void;
  onParticipantsAdded?: (userIds: string[]) => void;
  onLeft?: () => void;
};

type ViewMode = "list" | "invite" | "sent";

export default function ManageStoryParticipantsModal({
  open,
  onClose,
  threadId,
  storyId,
  promptContent,
  participants,
  currentUserId,
  creatorId,
  isPrivateInitial,
  onPrivacyChange,
  onParticipantRemoved,
  onParticipantsAdded,
  onLeft,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isPrivate, setIsPrivate] = useState(isPrivateInitial);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [members, setMembers] = useState<ExtendedParticipant[]>(participants);
  const [removeTarget, setRemoveTarget] = useState<ExtendedParticipant | null>(
    null
  );
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [invitePool, setInvitePool] = useState<PersonSummary[] | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteSelected, setInviteSelected] = useState<Set<string>>(new Set());
  const [inviteBusy, setInviteBusy] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setIsPrivate(isPrivateInitial), [isPrivateInitial]);
  useEffect(() => setMembers(participants), [participants]);

  useEffect(() => {
    if (!open) {
      setView("list");
      setInviteQuery("");
      setInviteSelected(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (view !== "invite" || invitePool !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const people = await fetchHomePeople();
        if (!cancelled) setInvitePool(people.users ?? []);
      } catch {
        if (!cancelled) setInvitePool([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, invitePool]);

  const memberIds = useMemo(
    () => new Set(members.map((p) => p._id).filter(Boolean) as string[]),
    [members]
  );

  const filteredCandidates = useMemo(() => {
    if (!invitePool) return [];
    const q = inviteQuery.trim().toLowerCase();
    return invitePool.filter((u) => {
      if (memberIds.has(u._id)) return false;
      if (!q) return true;
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return name.includes(q);
    });
  }, [invitePool, inviteQuery, memberIds]);

  const selectedNames = useMemo(() => {
    if (!invitePool) return "";
    return invitePool
      .filter((u) => inviteSelected.has(u._id))
      .map((u) => u.firstName)
      .filter(Boolean)
      .join(", ");
  }, [invitePool, inviteSelected]);

  function toggleInvite(userId: string) {
    setInviteSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleInviteSend() {
    if (!storyId || inviteBusy || inviteSelected.size === 0) return;
    setInviteBusy(true);
    const userIds = Array.from(inviteSelected);
    try {
      await shareStory(storyId, { userIds, groupIds: [], sendSeparately: false });
      onParticipantsAdded?.(userIds);
      setView("sent");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Could not send. Please try again."
      );
    } finally {
      setInviteBusy(false);
    }
  }

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

  const authorId = useMemo(() => {
    const author = members.find((p) => p.role === "author");
    return author?._id ?? null;
  }, [members]);

  const isCreatorViewer =
    !!currentUserId && (currentUserId === creatorId || currentUserId === authorId);

  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const unique: ExtendedParticipant[] = [];
    for (const p of members) {
      if (!p._id || seen.has(p._id)) continue;
      seen.add(p._id);
      unique.push(p);
    }
    return unique.sort((a, b) => {
      const rank = (p: ExtendedParticipant) => {
        if (p.role === "author") return 0;
        if (creatorId && p._id === creatorId) return 1;
        return 2;
      };
      return rank(a) - rank(b);
    });
  }, [members, creatorId]);

  async function handlePrivacyToggle() {
    if (privacyBusy) return;
    const next = !isPrivate;
    setIsPrivate(next);
    setPrivacyBusy(true);
    try {
      await setThreadPrivacy(threadId, { isPrivate: next });
      onPrivacyChange?.(next);
    } catch (err) {
      setIsPrivate(!next);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to update privacy settings"
      );
    } finally {
      setPrivacyBusy(false);
    }
  }

  async function handleRemoveConfirmed() {
    if (!removeTarget?._id) return;
    const target = removeTarget;
    setMembers((m) => m.filter((p) => p._id !== target._id));
    setRemoveTarget(null);
    try {
      await removeThreadParticipant(threadId, target._id!);
      onParticipantRemoved?.(target._id!);
    } catch (err) {
      setMembers((m) => [...m, target]);
      toast.error(
        err instanceof ApiError ? err.message : "Failed to remove user"
      );
    }
  }

  async function handleLeaveConfirmed() {
    if (!storyId) return;
    try {
      await deleteStory(storyId);
      setLeaveOpen(false);
      onClose();
      window.setTimeout(() => {
        if (onLeft) onLeft();
        else router.back();
      }, 250);
      window.setTimeout(
        () => toast.success("Left story successfully"),
        600
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't leave. Try again."
      );
    }
  }

  const title = promptContent?.trim() || "Story Details";
  const showInvite = isCreatorViewer || !isPrivate;
  const showLeave = !isCreatorViewer;

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Mobile: bottom sheet ~85vh */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 top-[15vh] z-[61] bg-white rounded-t-[20px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="pt-[10px] pb-[6px] flex justify-center">
          <div className="w-[78px] h-[4px] rounded-full bg-black/[0.15]" />
        </div>
        {view === "list" && (
          <>
            <div className="relative pt-[10px] pb-[14px] px-[16px] flex items-center justify-between">
              <span className="w-[44px]" aria-hidden />
              <h3 className="flex-1 text-center font-montserrat font-bold text-primary-blue text-[16px] truncate">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="w-[44px] font-montserrat font-medium text-[#EF9849] text-[16px] cursor-pointer text-right"
              >
                Done
              </button>
            </div>
            <MobileBody
              sorted={sorted}
              creatorId={creatorId ?? authorId}
              isCreatorViewer={isCreatorViewer}
              isPrivate={isPrivate}
              privacyBusy={privacyBusy}
              onPrivacyToggle={handlePrivacyToggle}
              onRemove={(p) => setRemoveTarget(p)}
            />
            <MobileFooter
              showInvite={showInvite}
              showLeave={showLeave}
              onInvite={() => setView("invite")}
              onLeave={() => setLeaveOpen(true)}
            />
          </>
        )}
        {view === "invite" && (
          <InvitePanel
            variant="mobile"
            query={inviteQuery}
            onQueryChange={setInviteQuery}
            candidates={filteredCandidates}
            loading={invitePool === null}
            selected={inviteSelected}
            onToggle={toggleInvite}
            selectedNames={selectedNames}
            busy={inviteBusy}
            onSend={handleInviteSend}
            onClose={onClose}
            onBack={() => setView("list")}
          />
        )}
        {view === "sent" && <SentPanel variant="mobile" onDone={onClose} />}
      </div>

      {/* Tablet + Desktop: right-side drawer full height */}
      <div
        className="hidden md:flex fixed right-[24px] top-[24px] bottom-[24px] w-[420px] lg:w-[480px] z-[61] bg-white rounded-[24px] shadow-[0_4px_33px_rgba(0,0,0,0.25)] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {view === "list" && (
          <>
            <div className="flex items-start justify-between px-[28px] pt-[24px] pb-[8px]">
              <h3 className="font-montserrat font-medium text-primary-blue text-[22px] lg:text-[24px] leading-[28px]">
                People
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer w-[36px] h-[36px] rounded-full bg-black/[0.05] text-primary-blue hover:bg-black/[0.08] flex items-center justify-center transition-colors"
              >
                <CloseIcon width={16} height={16} />
              </button>
            </div>
            <DesktopBody
              sorted={sorted}
              creatorId={creatorId ?? authorId}
              isCreatorViewer={isCreatorViewer}
              isPrivate={isPrivate}
              privacyBusy={privacyBusy}
              onPrivacyToggle={handlePrivacyToggle}
              onRemove={(p) => setRemoveTarget(p)}
            />
            <DesktopFooter
              showInvite={showInvite}
              showLeave={showLeave}
              onInvite={() => setView("invite")}
              onLeave={() => setLeaveOpen(true)}
            />
          </>
        )}
        {view === "invite" && (
          <InvitePanel
            variant="desktop"
            query={inviteQuery}
            onQueryChange={setInviteQuery}
            candidates={filteredCandidates}
            loading={invitePool === null}
            selected={inviteSelected}
            onToggle={toggleInvite}
            selectedNames={selectedNames}
            busy={inviteBusy}
            onSend={handleInviteSend}
            onClose={onClose}
            onBack={() => setView("list")}
          />
        )}
        {view === "sent" && <SentPanel variant="desktop" onDone={onClose} />}
      </div>

      <ConfirmationModal
        open={!!removeTarget}
        title={
          removeTarget
            ? `Do you want to remove ${
                removeTarget.firstName || "this user"
              } from this thread?`
            : ""
        }
        body=""
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirmed}
      />

      <ConfirmationModal
        open={leaveOpen}
        title="Leave Story"
        body="Are you sure you want to leave this story?"
        confirmLabel="Leave"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setLeaveOpen(false)}
        onConfirm={handleLeaveConfirmed}
      />
    </>,
    document.body
  );
}

function MobileBody({
  sorted,
  creatorId,
  isCreatorViewer,
  isPrivate,
  privacyBusy,
  onPrivacyToggle,
  onRemove,
}: {
  sorted: ExtendedParticipant[];
  creatorId: string | null;
  isCreatorViewer: boolean;
  isPrivate: boolean;
  privacyBusy: boolean;
  onPrivacyToggle: () => void;
  onRemove: (p: ExtendedParticipant) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-[16px] pb-[16px]">
      <ul className="flex flex-col">
        {sorted.map((p, i) => (
          <li key={p._id ?? i}>
            {i > 0 && (
              <div className="h-px bg-[#C9C9C9] mx-[4px] my-[10px]" aria-hidden />
            )}
            <ParticipantRow
              p={p}
              isCreatorRow={!!creatorId && p._id === creatorId}
              onRemove={onRemove}
              avatarSize={44}
              nameSize={16}
              nameWeight="medium"
            />
          </li>
        ))}
      </ul>

      {isCreatorViewer && (
        <PrivacyCard
          isPrivate={isPrivate}
          busy={privacyBusy}
          onToggle={onPrivacyToggle}
          className="mt-[20px]"
        />
      )}
      {!isCreatorViewer && isPrivate && <PrivateLockRow className="mt-[20px]" />}
    </div>
  );
}

function DesktopBody({
  sorted,
  creatorId,
  isCreatorViewer,
  isPrivate,
  privacyBusy,
  onPrivacyToggle,
  onRemove,
}: {
  sorted: ExtendedParticipant[];
  creatorId: string | null;
  isCreatorViewer: boolean;
  isPrivate: boolean;
  privacyBusy: boolean;
  onPrivacyToggle: () => void;
  onRemove: (p: ExtendedParticipant) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-[28px] pt-[16px] pb-[16px]">
      <ul className="flex flex-col gap-[20px]">
        {sorted.map((p) => (
          <li key={p._id}>
            <ParticipantRow
              p={p}
              isCreatorRow={!!creatorId && p._id === creatorId}
              onRemove={onRemove}
              avatarSize={53}
              nameSize={18}
              nameWeight="medium"
            />
          </li>
        ))}
      </ul>

      {isCreatorViewer && (
        <PrivacyCard
          isPrivate={isPrivate}
          busy={privacyBusy}
          onToggle={onPrivacyToggle}
          className="mt-[28px]"
        />
      )}
      {!isCreatorViewer && isPrivate && <PrivateLockRow className="mt-[28px]" />}
    </div>
  );
}

function MobileFooter({
  showInvite,
  showLeave,
  onInvite,
  onLeave,
}: {
  showInvite: boolean;
  showLeave: boolean;
  onInvite: () => void;
  onLeave: () => void;
}) {
  if (!showInvite && !showLeave) return null;
  return (
    <div className="shrink-0 px-[24px] pt-[8px] pb-[24px] flex flex-col gap-[10px] bg-white">
      {showInvite && (
        <button
          type="button"
          onClick={onInvite}
          className="cursor-pointer h-[44px] rounded-full border-[1.5px] border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] hover:bg-primary-blue/[0.04] transition-colors"
        >
          Invite someone
        </button>
      )}
      {showLeave && (
        <button
          type="button"
          onClick={onLeave}
          className="cursor-pointer h-[44px] rounded-full bg-[#D95F3B] text-white font-montserrat font-medium text-[16px] hover:opacity-90 transition-opacity"
        >
          Leave this shared story
        </button>
      )}
    </div>
  );
}

function DesktopFooter({
  showInvite,
  showLeave,
  onInvite,
  onLeave,
}: {
  showInvite: boolean;
  showLeave: boolean;
  onInvite: () => void;
  onLeave: () => void;
}) {
  if (!showInvite && !showLeave) return null;
  return (
    <div className="shrink-0 px-[28px] pt-[8px] pb-[28px] flex flex-col gap-[12px] bg-white">
      {showInvite && (
        <button
          type="button"
          onClick={onInvite}
          className="cursor-pointer h-[44px] rounded-full border-[1.5px] border-primary-blue text-primary-blue font-montserrat font-medium text-[16px] hover:bg-primary-blue/[0.04] transition-colors"
        >
          Invite someone
        </button>
      )}
      {showLeave && (
        <button
          type="button"
          onClick={onLeave}
          className="cursor-pointer h-[44px] rounded-full bg-[#D95F3B] text-white font-montserrat font-medium text-[16px] hover:opacity-90 transition-opacity"
        >
          Leave this shared story
        </button>
      )}
    </div>
  );
}

function ParticipantRow({
  p,
  isCreatorRow,
  onRemove,
  avatarSize,
  nameSize,
  nameWeight,
}: {
  p: ExtendedParticipant;
  isCreatorRow: boolean;
  onRemove: (p: ExtendedParticipant) => void;
  avatarSize: number;
  nameSize: number;
  nameWeight: "medium" | "bold";
}) {
  const fullName =
    [p.firstName, p.lastName].filter(Boolean).join(" ") ||
    p.username ||
    "Someone";
  const initial = (p.firstName ?? p.username ?? "?").charAt(0).toUpperCase();
  const showCreator = isCreatorRow || p.role === "author";
  const showRemove = !showCreator && p.isRemovable === true;

  return (
    <div className="w-full flex items-center gap-[16px]">
      <Avatar url={p.profilePicture ?? null} initial={initial} size={avatarSize} />
      <p
        className={`flex-1 font-montserrat truncate text-primary-blue ${
          nameWeight === "bold" ? "font-bold" : "font-medium"
        }`}
        style={{ fontSize: `${nameSize}px` }}
      >
        {fullName}
      </p>
      {showCreator && (
        <span className="font-montserrat font-medium text-[#A5A5A5] text-[15px]">
          Creator
        </span>
      )}
      {showRemove && (
        <button
          type="button"
          onClick={() => onRemove(p)}
          className="cursor-pointer font-montserrat font-medium text-[#D95F3B] text-[15px] hover:opacity-80 transition-opacity"
        >
          Remove
        </button>
      )}
    </div>
  );
}

function Avatar({
  url,
  initial,
  size,
}: {
  url: string | null;
  initial: string;
  size: number;
}) {
  const style = { width: size, height: size };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bustUrl(url, undefined)}
        alt=""
        style={style}
        className="rounded-full object-cover shrink-0 border-[2px] border-white"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[14px] shrink-0"
    >
      {initial}
    </div>
  );
}

function PrivacyCard({
  isPrivate,
  busy,
  onToggle,
  className,
}: {
  isPrivate: boolean;
  busy: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const on = !isPrivate;
  return (
    <div className={`bg-[#F7F7F7] rounded-[16px] px-[16px] py-[14px] ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-[12px]">
        <span className="font-montserrat font-medium text-primary-blue text-[15px]">
          Allow others to share
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={busy}
          onClick={onToggle}
          className={`relative w-[44px] h-[26px] rounded-full transition-colors cursor-pointer ${
            on ? "bg-[#EF9849]" : "bg-[#C9C9C9]"
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-[3px] left-[3px] w-[20px] h-[20px] rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-[18px]" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      <p className="mt-[6px] font-montserrat text-primary-blue/60 text-[13px] leading-[18px]">
        {on
          ? "Anyone on this thread can add people."
          : "Only you can add people to this thread."}
      </p>
    </div>
  );
}

function PrivateLockRow({ className }: { className?: string }) {
  return (
    <div className={`flex items-start gap-[10px] px-[4px] ${className ?? ""}`}>
      <LockIcon width={16} height={16} className="mt-[2px] text-primary-blue/50" />
      <p className="font-montserrat text-primary-blue/60 text-[13px] leading-[18px]">
        This is a private thread. Only the members of this thread can view stories.
      </p>
    </div>
  );
}

function LockIcon({
  width = 16,
  height = 16,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect
        x="3"
        y="7"
        width="10"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InvitePanel({
  variant,
  query,
  onQueryChange,
  candidates,
  loading,
  selected,
  onToggle,
  selectedNames,
  busy,
  onSend,
  onClose,
  onBack,
}: {
  variant: "mobile" | "desktop";
  query: string;
  onQueryChange: (v: string) => void;
  candidates: PersonSummary[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  selectedNames: string;
  busy: boolean;
  onSend: () => void;
  onClose: () => void;
  onBack: () => void;
}) {
  const isMobile = variant === "mobile";
  return (
    <>
      <div
        className={`flex items-start justify-between ${
          isMobile ? "px-[16px] pt-[8px] pb-[10px]" : "px-[28px] pt-[24px] pb-[12px]"
        }`}
      >
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="cursor-pointer w-[28px] h-[28px] rounded-full text-primary-blue hover:bg-black/[0.05] flex items-center justify-center transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M9 2L4 7l5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h3
            className={`font-montserrat text-primary-blue ${
              isMobile
                ? "font-bold text-[18px] leading-[22px]"
                : "font-bold text-[26px] lg:text-[30px] leading-[32px]"
            }`}
          >
            Invite
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-black/[0.05] text-primary-blue hover:bg-black/[0.08] flex items-center justify-center transition-colors"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <div className={`${isMobile ? "px-[16px]" : "px-[28px]"} pb-[10px]`}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search"
            className="w-full h-[42px] rounded-[20px] bg-[#F1F1F1] pl-[16px] pr-[42px] font-montserrat font-medium text-[14px] text-primary-blue placeholder:text-primary-blue/60 outline-none"
          />
          <span className="absolute right-[14px] top-1/2 -translate-y-1/2 text-primary-blue/70">
            <SearchIcon width={18} height={18} />
          </span>
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 overflow-y-auto ${
          isMobile ? "px-[16px]" : "px-[28px]"
        } pb-[100px]`}
      >
        <p className="font-montserrat font-medium text-primary-blue text-[15px] mt-[8px] mb-[8px]">
          Suggested
        </p>
        {loading ? (
          <p className="mt-[12px] font-montserrat text-primary-blue/50 text-[13px]">
            Loading…
          </p>
        ) : candidates.length === 0 ? (
          <p className="mt-[12px] font-montserrat text-primary-blue/50 text-[13px]">
            No people to invite.
          </p>
        ) : (
          <ul className="flex flex-col gap-[16px]">
            {candidates.map((u) => {
              const isSel = selected.has(u._id);
              const name =
                [u.firstName, u.lastName].filter(Boolean).join(" ") || "Someone";
              const initial = (u.firstName ?? "?").charAt(0).toUpperCase();
              return (
                <li key={u._id}>
                  <button
                    type="button"
                    onClick={() => onToggle(u._id)}
                    className="w-full flex items-center gap-[14px] cursor-pointer text-left"
                  >
                    <Avatar
                      url={u.profilePicture ?? null}
                      initial={initial}
                      size={37}
                    />
                    <span className="flex-1 font-montserrat font-bold text-primary-blue text-[15px] truncate">
                      {name}
                    </span>
                    <span
                      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors ${
                        isSel
                          ? "bg-[#EF9849] text-white"
                          : "border border-primary-blue/30"
                      }`}
                      aria-hidden
                    >
                      {isSel && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2.5 6.5L5 9L9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        className={`shrink-0 ${
          isMobile ? "px-[16px] pb-[20px]" : "px-[28px] pb-[24px]"
        } pt-[8px]`}
      >
        <div className="flex items-center gap-[10px] bg-white rounded-full h-[52px] pl-[18px] pr-[6px] shadow-[0_0_23px_rgba(0,0,0,0.15)]">
          <span className="flex-1 font-montserrat font-medium text-primary-blue text-[14px] truncate">
            {selectedNames || `${selected.size} selected`}
          </span>
          <button
            type="button"
            onClick={onSend}
            disabled={selected.size === 0 || busy}
            className="cursor-pointer h-[40px] px-[24px] rounded-full bg-[#EF9849] text-white font-montserrat font-medium text-[15px] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {busy ? "…" : "Invite"}
          </button>
        </div>
      </div>
    </>
  );
}

function SentPanel({
  variant,
  onDone,
}: {
  variant: "mobile" | "desktop";
  onDone: () => void;
}) {
  const isMobile = variant === "mobile";
  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center ${
        isMobile ? "px-[24px] pb-[24px]" : "px-[28px] pb-[28px]"
      }`}
    >
      <SuccessCelebration
        title="Invite sent"
        childrenClassName="w-full mt-[36px] flex justify-center"
      >
        <button
          type="button"
          onClick={onDone}
          className="cursor-pointer h-[44px] px-[64px] rounded-full bg-[#EF9849] text-white font-montserrat font-medium text-[16px] hover:opacity-90 transition-opacity"
        >
          Done
        </button>
      </SuccessCelebration>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { fetchHomePeople } from "../../../../lib/home/api";
import type { GroupSummary, PersonSummary } from "../../../../types/home";
import { CloseIcon, PersonIcon, SearchIcon } from "../icons";
import SharedAvatar from "../../../../components/Avatar";

// Mirrors the mobile spec: (userIds, sendSeparately, note, isPrivate, groupIds).
// isPrivate is reserved for a future toggle — always false today.
export type ShareSendHandler = (
  userIds: string[],
  sendSeparately: boolean,
  note: string,
  isPrivate: boolean,
  groupIds: string[]
) => Promise<void>;

type CardData = {
  _id?: string;
  author?: { _id?: string | null } | null;
  shareWith?: Array<{ _id: string; firstName?: string; lastName?: string; profilePicture?: string | null }> | string[];
  note?: string | null;
};

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onSend: ShareSendHandler;
  selectedUsers?: string[];
  cardData?: CardData | null;
  showMessageInput?: boolean;
  showGroups?: boolean;
  prefillGroupIds?: string[];
  existingMembers?: PersonSummary[];
  existingGroupIds?: string[];
  shareContext?: "story" | "prompt";
};

type Phase = "idle" | "sending" | "sent";

const NOTE_MAX = 150;

export default function ShareModal({
  open,
  title = "Send to",
  onClose,
  onSend,
  selectedUsers,
  cardData,
  showMessageInput = false,
  showGroups = true,
  prefillGroupIds,
  existingMembers,
  existingGroupIds,
  shareContext = "prompt",
}: Props) {
  const [users, setUsers] = useState<PersonSummary[] | null>(null);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    () => new Set(selectedUsers ?? [])
  );
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    () => new Set(prefillGroupIds ?? [])
  );
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [sentNames, setSentNames] = useState<string[]>([]);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Existing-share sets. Normalize to string IDs — filter picker + render pills.
  const existingUserIds = useMemo(() => {
    const s = new Set<string>();
    const cardShare = cardData?.shareWith ?? [];
    for (const u of cardShare) {
      if (typeof u === "string") s.add(u);
      else if (u?._id) s.add(u._id);
    }
    for (const u of existingMembers ?? []) s.add(u._id);
    return s;
  }, [cardData?.shareWith, existingMembers]);

  const existingGroupSet = useMemo(
    () => new Set(existingGroupIds ?? []),
    [existingGroupIds]
  );

  const authorId = cardData?.author?._id ?? null;

  // Note re-send behavior: if the prompt already has a note, honor it verbatim
  // (guards against a BE clobber bug where /share overwrites card.note) and
  // hide the input regardless of showMessageInput.
  const existingNote = cardData?.note?.trim() || "";
  const noteInputVisible = showMessageInput && !existingNote;

  // Load users + groups when the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const people = await fetchHomePeople();
        if (cancelled) return;
        setUsers(people.users ?? []);
        setGroups(people.groups ?? []);
      } catch {
        if (cancelled) return;
        setUsers([]);
        setGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset per-open state when the modal closes.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setMessage("");
    setSelectedContacts(new Set(selectedUsers ?? []));
    setSelectedGroups(new Set(prefillGroupIds ?? []));
    setPhase("idle");
    setSentNames([]);
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
  }, [open, selectedUsers, prefillGroupIds]);

  // Cleanup any pending auto-close on unmount.
  useEffect(() => {
    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  const filteredFriends = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (u._id === authorId) return false;
      if (existingUserIds.has(u._id)) return false;
      if (!q) return true;
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      return name.includes(q);
    });
  }, [users, query, authorId, existingUserIds]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (existingGroupSet.has(g._id)) return false;
      if (!q) return true;
      return g.name.toLowerCase().includes(q);
    });
  }, [groups, query, existingGroupSet]);

  // Users/groups already on the share — rendered read-only in the top strip.
  const currentUsers = useMemo(() => {
    const seen = new Set<string>();
    const out: PersonSummary[] = [];
    for (const u of existingMembers ?? []) {
      if (seen.has(u._id) || u._id === authorId) continue;
      seen.add(u._id);
      out.push(u);
    }
    // Users on cardData.shareWith might be objects with names or bare IDs.
    for (const u of cardData?.shareWith ?? []) {
      if (typeof u === "string") continue;
      if (!u?._id || seen.has(u._id) || u._id === authorId) continue;
      seen.add(u._id);
      out.push({
        _id: u._id,
        firstName: u.firstName ?? "",
        lastName: u.lastName ?? "",
        profilePicture: u.profilePicture ?? null,
      });
    }
    return out;
  }, [existingMembers, cardData?.shareWith, authorId]);

  const currentGroups = useMemo(() => {
    if (!groups) return [];
    return groups.filter((g) => existingGroupSet.has(g._id));
  }, [groups, existingGroupSet]);

  const loading = users === null || groups === null;
  const canSend =
    phase === "idle" &&
    (selectedContacts.size > 0 || selectedGroups.size > 0);
  const canSendSeparately = phase === "idle" && selectedContacts.size >= 2;

  function toggleUser(id: string) {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(id: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resolveSelectedNames(): string[] {
    const names: string[] = [];
    const usersById = new Map((users ?? []).map((u) => [u._id, u]));
    for (const id of selectedContacts) {
      const u = usersById.get(id);
      if (u?.firstName) names.push(u.firstName);
    }
    const groupsById = new Map((groups ?? []).map((g) => [g._id, g]));
    for (const id of selectedGroups) {
      const g = groupsById.get(id);
      if (g?.name) names.push(g.name);
    }
    return names;
  }

  async function runSend(sendSeparately: boolean) {
    if (!canSend) return;
    const names = resolveSelectedNames();
    setPhase("sending");
    try {
      const finalNote =
        existingNote || (noteInputVisible ? message.trim() : "");
      await onSend(
        Array.from(selectedContacts),
        sendSeparately,
        finalNote,
        false,
        Array.from(selectedGroups)
      );
      setSentNames(names);
      setPhase("sent");
      autoCloseRef.current = setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setPhase("idle");
      const msg =
        err instanceof Error ? err.message : "Could not send. Try again.";
      toast.error(msg);
    }
  }

  async function handleExternalShare() {
    const shareText =
      shareContext === "story"
        ? "Wanted to share this story with you on Epoch Lag\n\nhttps://epochlag.com"
        : "Saw this prompt on Epoch Lag and thought of you\n\nhttps://epochlag.com";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  function handleInvite() {
    toast("Invite feature coming soon");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[85vh] bg-white rounded-[24px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "sending" ? (
          <SendingView />
        ) : phase === "sent" ? (
          <SentView names={sentNames} />
        ) : (
          <IdleView
            title={title}
            query={query}
            setQuery={setQuery}
            loading={loading}
            currentUsers={currentUsers}
            currentGroups={currentGroups}
            filteredFriends={filteredFriends}
            filteredGroups={filteredGroups}
            selectedContacts={selectedContacts}
            selectedGroups={selectedGroups}
            toggleUser={toggleUser}
            toggleGroup={toggleGroup}
            showGroups={showGroups}
            noteInputVisible={noteInputVisible}
            message={message}
            setMessage={setMessage}
            canSend={canSend}
            canSendSeparately={canSendSeparately}
            onSend={() => runSend(false)}
            onSendSeparately={() => runSend(true)}
            onInvite={handleInvite}
            onExternalShare={handleExternalShare}
          />
        )}
      </div>
    </div>
  );
}

// ============ Idle view ============

function IdleView(props: {
  title: string;
  query: string;
  setQuery: (v: string) => void;
  loading: boolean;
  currentUsers: PersonSummary[];
  currentGroups: GroupSummary[];
  filteredFriends: PersonSummary[];
  filteredGroups: GroupSummary[];
  selectedContacts: Set<string>;
  selectedGroups: Set<string>;
  toggleUser: (id: string) => void;
  toggleGroup: (id: string) => void;
  showGroups: boolean;
  noteInputVisible: boolean;
  message: string;
  setMessage: (v: string) => void;
  canSend: boolean;
  canSendSeparately: boolean;
  onSend: () => void;
  onSendSeparately: () => void;
  onInvite: () => void;
  onExternalShare: () => void;
}) {
  const {
    title,
    query,
    setQuery,
    loading,
    currentUsers,
    currentGroups,
    filteredFriends,
    filteredGroups,
    selectedContacts,
    selectedGroups,
    toggleUser,
    toggleGroup,
    showGroups,
    noteInputVisible,
    message,
    setMessage,
    canSend,
    canSendSeparately,
    onSend,
    onSendSeparately,
    onInvite,
    onExternalShare,
  } = props;

  const showInviteInline = !loading && filteredFriends.length === 0;

  return (
    <>
      {/* Drag handle + title */}
      <div className="pt-[10px] pb-[4px] flex justify-center">
        <div className="w-[40px] h-[4px] rounded-full bg-black/[0.15]" />
      </div>
      <h3 className="text-center font-montserrat font-bold text-primary-blue text-[18px] pb-[12px]">
        {title}
      </h3>

      {/* Search */}
      <div className="px-[20px] pb-[12px]">
        <div className="bg-[#ededed] rounded-full pl-[14px] pr-[8px] py-[10px] flex items-center gap-[10px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends"
            className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="cursor-pointer w-[24px] h-[24px] rounded-full text-primary-blue/60 hover:bg-black/[0.06] flex items-center justify-center transition-colors"
            >
              <CloseIcon width={12} height={12} />
            </button>
          ) : (
            <SearchIcon
              width={16}
              height={16}
              className="text-primary-blue/60 shrink-0 mr-[6px]"
            />
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto px-[20px] scrollbar-hide">
        {/* Currently on this share */}
        {(currentUsers.length > 0 || currentGroups.length > 0) && (
          <Section label="Currently on this share">
            <div className="flex gap-[12px] overflow-x-auto scrollbar-hide pb-[4px]">
              {currentUsers.map((u) => (
                <ReadOnlyUserTile key={u._id} person={u} />
              ))}
              {currentGroups.map((g) => (
                <ReadOnlyGroupTile key={g._id} group={g} />
              ))}
            </div>
          </Section>
        )}

        {/* Friends */}
        <Section label="Friends">
          {loading ? (
            <div className="flex gap-[12px]">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[64px] h-[80px] rounded-[10px] bg-black/[0.05] animate-pulse"
                />
              ))}
            </div>
          ) : showInviteInline ? (
            <div className="flex flex-col items-center gap-[10px] py-[8px]">
              <p className="font-montserrat text-primary-blue/60 text-[13px]">
                {query ? "No contacts found" : "No friends yet"}
              </p>
              <button
                type="button"
                onClick={onInvite}
                className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[14px] rounded-full px-[18px] py-[10px] hover:opacity-90 transition-opacity"
              >
                Invite to Epoch Lag
              </button>
            </div>
          ) : (
            <div className="flex gap-[12px] overflow-x-auto scrollbar-hide pb-[4px]">
              {filteredFriends.map((u) => (
                <FriendTile
                  key={u._id}
                  person={u}
                  selected={selectedContacts.has(u._id)}
                  onClick={() => toggleUser(u._id)}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Groups */}
        {showGroups && filteredGroups.length > 0 && (
          <Section label="Groups">
            <div className="flex gap-[12px] overflow-x-auto scrollbar-hide pb-[4px]">
              {filteredGroups.map((g) => (
                <GroupTile
                  key={g._id}
                  group={g}
                  selected={selectedGroups.has(g._id)}
                  onClick={() => toggleGroup(g._id)}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Add note */}
        {noteInputVisible && (
          <div className="mb-[16px]">
            <textarea
              value={message}
              onChange={(e) =>
                setMessage(e.target.value.slice(0, NOTE_MAX))
              }
              placeholder="Add a note (optional)"
              rows={2}
              className="w-full bg-[#ededed] rounded-[14px] px-[14px] py-[10px] resize-none focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px] leading-[20px]"
            />
            <p className="mt-[4px] text-right font-montserrat text-primary-blue/50 text-[11px]">
              {message.length}/{NOTE_MAX}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-[20px] pt-[8px] pb-[16px] border-t border-black/[0.06] flex flex-col gap-[10px]">
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="cursor-pointer w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[12px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
        {canSendSeparately && (
          <button
            type="button"
            onClick={onSendSeparately}
            className="cursor-pointer w-full bg-white text-primary-blue font-montserrat font-semibold text-[15px] rounded-full py-[12px] border border-primary-blue/25 hover:bg-black/[0.03] transition-colors"
          >
            Send Separately
          </button>
        )}

        <div className="pt-[8px] mt-[2px] border-t border-black/[0.05] text-center">
          <p className="font-montserrat text-primary-blue/60 text-[12px] mb-[4px]">
            Not on Epoch Lag?
          </p>
          <button
            type="button"
            onClick={onExternalShare}
            className="cursor-pointer font-montserrat text-primary-blue text-[13px] font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            Share outside the app
          </button>
        </div>
      </div>
    </>
  );
}

// ============ Sending / Sent views ============

function SendingView() {
  return (
    <div className="flex flex-col items-center justify-center gap-[16px] py-[60px] px-[24px]">
      <div className="w-[36px] h-[36px] rounded-full border-[3px] border-black/[0.1] border-t-primary-orange animate-spin" />
      <p className="font-montserrat text-primary-blue text-[15px]">Sending…</p>
    </div>
  );
}

function SentView({ names }: { names: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center gap-[14px] py-[60px] px-[24px]">
      <div className="w-[64px] h-[64px] rounded-full bg-primary-orange flex items-center justify-center">
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="font-montserrat font-semibold text-primary-blue text-[15px] text-center">
        {formatSentMessage(names)}
      </p>
    </div>
  );
}

function formatSentMessage(names: string[]): string {
  if (names.length === 0) return "Sent successfully!";
  if (names.length === 1) return `Sent to ${names[0]}`;
  if (names.length === 2) return `Sent to ${names[0]} and ${names[1]}`;
  const rest = names.length - 2;
  return `Sent to ${names[0]}, ${names[1]}, and ${rest} other${rest > 1 ? "s" : ""}`;
}

// ============ Building blocks ============

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[16px]">
      <p className="font-montserrat font-semibold text-primary-blue/60 text-[11px] uppercase tracking-[0.5px] mb-[8px]">
        {label}
      </p>
      {children}
    </div>
  );
}

function FriendTile({
  person,
  selected,
  onClick,
}: {
  person: PersonSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer shrink-0 w-[64px] flex flex-col items-center gap-[6px] focus:outline-none"
    >
      <div className="relative">
        <UserAvatar person={person} size={60} />
        {selected && <CheckmarkBadge />}
      </div>
      <p className="font-montserrat text-primary-blue text-[12px] max-w-[64px] truncate text-center">
        {person.firstName || "Friend"}
      </p>
    </button>
  );
}

function GroupTile({
  group,
  selected,
  onClick,
}: {
  group: GroupSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer shrink-0 w-[88px] flex flex-col items-center gap-[4px] focus:outline-none"
    >
      <div className="relative">
        <GroupAvatarStack group={group} />
        {selected && <CheckmarkBadge />}
        {!selected && group.newStory && (
          <span className="absolute top-0 right-0 w-[10px] h-[10px] rounded-full bg-primary-orange border-[2px] border-white" />
        )}
      </div>
      <p className="font-montserrat text-primary-blue text-[12px] max-w-[88px] truncate text-center">
        {group.name}
      </p>
      <p className="font-montserrat text-primary-blue/50 text-[10px] leading-tight">
        {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
      </p>
    </button>
  );
}

function ReadOnlyUserTile({ person }: { person: PersonSummary }) {
  return (
    <div className="shrink-0 w-[60px] flex flex-col items-center gap-[6px] opacity-70">
      <UserAvatar person={person} size={52} />
      <p className="font-montserrat text-primary-blue text-[11px] max-w-[60px] truncate text-center">
        {person.firstName || "—"}
      </p>
    </div>
  );
}

function ReadOnlyGroupTile({ group }: { group: GroupSummary }) {
  return (
    <div className="shrink-0 w-[80px] flex flex-col items-center gap-[6px] opacity-70">
      <GroupAvatarStack group={group} small />
      <p className="font-montserrat text-primary-blue text-[11px] max-w-[80px] truncate text-center">
        {group.name}
      </p>
    </div>
  );
}

function UserAvatar({
  person,
  size,
}: {
  person: PersonSummary;
  size: number;
}) {
  return (
    <SharedAvatar
      user={{
        firstName: person.firstName,
        profilePicture: person.profilePicture,
      }}
      size={size}
    />
  );
}

function GroupAvatarStack({
  group,
  small = false,
}: {
  group: GroupSummary;
  small?: boolean;
}) {
  const outer = small ? 52 : 60;
  const inner = small ? 30 : 36;
  if (group.groupPhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={group.groupPhotoUrl}
        alt=""
        style={{ width: outer, height: outer }}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  const top = group.members?.[0];
  const bottom = group.members?.[1];
  return (
    <div
      style={{ width: outer, height: outer }}
      className="relative shrink-0 rounded-full bg-primary-orange/15 flex items-center justify-center"
    >
      {top ? (
        <StackMember member={top} size={inner} pos="tl" />
      ) : (
        <div
          style={{ width: inner, height: inner }}
          className="absolute top-0 left-0 rounded-full bg-primary-orange/20 flex items-center justify-center text-primary-orange"
        >
          <PersonIcon width={12} height={12} />
        </div>
      )}
      {bottom ? (
        <StackMember member={bottom} size={inner} pos="br" />
      ) : (
        <div
          style={{ width: inner, height: inner }}
          className="absolute bottom-0 right-0 rounded-full bg-primary-orange/25"
        />
      )}
    </div>
  );
}

function StackMember({
  member,
  size,
  pos,
}: {
  member: { firstName?: string; profilePicture?: string | null };
  size: number;
  pos: "tl" | "br";
}) {
  const anchor = pos === "tl" ? "top-0 left-0" : "bottom-0 right-0";
  return (
    <div className={`absolute ${anchor} rounded-full border-[2px] border-white overflow-hidden`}>
      <SharedAvatar
        user={{
          firstName: member.firstName,
          profilePicture: member.profilePicture,
        }}
        size={size}
      />
    </div>
  );
}

function CheckmarkBadge() {
  return (
    <span className="absolute bottom-0 right-0 w-[20px] h-[20px] rounded-full bg-primary-orange border-[2px] border-white flex items-center justify-center">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

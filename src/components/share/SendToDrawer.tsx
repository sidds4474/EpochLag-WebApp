"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../lib/auth/AuthProvider";
import { fetchHomePeople } from "../../lib/home/api";
import { bustUrl } from "../../lib/images";
import {
  buildPublicUrl,
  mintPublicCode,
  type PublicLinkKind,
} from "../../lib/share/publicLink";
import type { GroupSummary, PersonSummary } from "../../types/home";
import SuccessCelebration from "../SuccessCelebration";

// One canonical Send-to sheet. Right drawer on desktop (>= md), bottom
// sheet on mobile. Callers pass previewContent (a card/thumbnail) when the
// share has a subject; otherwise the sheet renders the plain "Send to"
// contact list only. Mirrors the mobile app's polymorphic
// ShareToContactsModal — same prop surface.

export type ShareContext = "story" | "prompt" | "moment" | "album" | "lag";

// Story/prompt/moment can mint a public share URL for the external chips;
// album isn't functional on web yet.
export type ShareTarget =
  | { kind: PublicLinkKind; id: string }
  // | { kind: "album"; id: string } // Album share not functional yet — see
  //   src/lib/share/publicLink.ts.
  ;

export type SendResult = {
  success: boolean;
  names?: string[];
};

export type SendHandler = (
  userIds: string[],
  groupIds: string[],
  note: string
) => Promise<SendResult | void>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSend: SendHandler;
  shareContext: ShareContext;
  /** Card/thumbnail rendered above the search — pass null to omit. */
  previewContent?: ReactNode;
  /** Show the multi-line note textarea between contacts and chips. */
  showMessageInput?: boolean;
  /** Show the Groups section under Suggested. Off by default in v1. */
  showGroups?: boolean;
  /** Pre-select these userIds on open. */
  selectedUsers?: string[];
  prefillGroupIds?: string[];
  /** Users already on the share (thread participants etc.). Filtered out
   *  of the picker. */
  existingMembers?: string[];
  existingGroupIds?: string[];
  /** Resource to mint a public link for. Chips fall back to the store
   *  blurb when this is absent or the mint fails. */
  shareTarget?: ShareTarget;
};

const NOTE_MAX = 150;

const SUCCESS_TITLE: Record<ShareContext, string> = {
  story: "Story Sent",
  prompt: "Prompt Sent",
  moment: "Moment Sent",
  album: "Album Sent",
  lag: "Lag Sent",
};

// Message templates verbatim from mobile parity.
// Minted (public URL available):
//   "{firstName} shared a {noun} with you! Click to see the full story.
//
//    {url}"
// Not minted (store-blurb fallback):
//   "Wanted to share this {noun} with you on Epoch Lag.
//
//    Download our Play Store app from here:
//    <play>
//
//    Download our App Store app from here:
//    <apple>"
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.epoch.epochlag";
const APP_STORE_URL = "https://apps.apple.com/us/app/epoch-lag/id6745345209";

function nounFor(context: ShareContext): string {
  switch (context) {
    case "story":
      return "story";
    case "prompt":
      return "prompt";
    case "moment":
      return "moment";
    case "album":
      return "album";
    default:
      return "lag";
  }
}

function buildStoreBlurb(context: ShareContext): string {
  return `Wanted to share this ${nounFor(context)} with you on Epoch Lag.

Download our Play Store app from here:
${PLAY_STORE_URL}

Download our App Store app from here:
${APP_STORE_URL}`;
}

function buildShareMessage(
  context: ShareContext,
  url: string | null,
  firstName?: string
): string {
  if (!url) return buildStoreBlurb(context);
  const noun = nounFor(context);
  const who = firstName?.trim() ? firstName.trim() : "Someone";
  return `${who} shared a ${noun} with you! Click to see the full ${noun}.

${url}`;
}

export default function SendToDrawer({
  open,
  onClose,
  onSend,
  shareContext,
  previewContent,
  showMessageInput = false,
  showGroups = false,
  selectedUsers,
  prefillGroupIds,
  existingMembers,
  existingGroupIds,
  shareTarget,
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
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const publicCodeMintingRef = useRef(false);
  const { user } = useAuth();
  const sharerFirstName = user?.firstName?.trim() || undefined;

  // Load contacts + groups on open. Cached across mounts by the fetch
  // layer's own caching; a fresh call every open is cheap.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchHomePeople()
      .then((people) => {
        if (cancelled) return;
        setUsers(people.users ?? []);
        setGroups(people.groups ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setUsers([]);
        setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Lazy mint on open. In-flight guard prevents double-fire from React's
  // strict-mode double invoke.
  useEffect(() => {
    if (!open || !shareTarget || publicCode || publicCodeMintingRef.current) {
      return;
    }
    publicCodeMintingRef.current = true;
    mintPublicCode(shareTarget.kind, shareTarget.id)
      .then((code) => {
        if (code) setPublicCode(code);
      })
      .finally(() => {
        publicCodeMintingRef.current = false;
      });
  }, [open, shareTarget, publicCode]);

  // Reset transient state when the sheet closes.
  useEffect(() => {
    if (open) return;
    setQuery("");
    setNote("");
    setSent(false);
    setSelectedContacts(new Set(selectedUsers ?? []));
    setSelectedGroups(new Set(prefillGroupIds ?? []));
  }, [open, selectedUsers, prefillGroupIds]);

  const existingUserSet = useMemo(
    () => new Set(existingMembers ?? []),
    [existingMembers]
  );
  const existingGroupSet = useMemo(
    () => new Set(existingGroupIds ?? []),
    [existingGroupIds]
  );

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    const list = users.filter((u) => !existingUserSet.has(u._id));
    if (!q) return list;
    return list.filter((u) => {
      const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [users, query, existingUserSet]);

  const filteredGroups = useMemo(() => {
    if (!showGroups || !groups) return [];
    const q = query.trim().toLowerCase();
    const list = groups.filter((g) => !existingGroupSet.has(g._id));
    if (!q) return list;
    return list.filter((g) => (g.name ?? "").toLowerCase().includes(q));
  }, [showGroups, groups, query, existingGroupSet]);

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedNames = useMemo(() => {
    if (!users) return [];
    return Array.from(selectedContacts)
      .map((id) => users.find((u) => u._id === id)?.firstName)
      .filter((n): n is string => !!n);
  }, [users, selectedContacts]);

  const totalSelected = selectedContacts.size + selectedGroups.size;
  const canSend = totalSelected > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await onSend(
        Array.from(selectedContacts),
        Array.from(selectedGroups),
        note.trim()
      );
      setSent(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not send. Please try again.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const publicUrl = shareTarget
    ? buildPublicUrl(shareTarget.kind, publicCode)
    : null;

  // External-chip handlers. Copy uses clipboard; the rest open URL schemes.
  // Native share sheet on More when available.
  const shareMessage = buildShareMessage(
    shareContext,
    publicUrl,
    sharerFirstName
  );

  const handleCopyLink = async () => {
    const text = publicUrl ?? shareMessage;
    // Modern async Clipboard API is the happy path but fails on:
    //   - insecure origins (http:// on a LAN IP)
    //   - Safari without an active user-gesture token
    //   - a drawer-open state where the backdrop stole document focus
    // Fall through to the legacy execCommand path in those cases before
    // toasting failure.
    const okViaAsync =
      typeof navigator !== "undefined" &&
      !!navigator.clipboard &&
      (await navigator.clipboard
        .writeText(text)
        .then(() => true)
        .catch(() => false));
    if (okViaAsync) {
      toast.success("Link copied");
      return;
    }
    if (typeof document !== "undefined") {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
      if (ok) {
        toast.success("Link copied");
        return;
      }
    }
    toast.error("Could not copy link");
  };

  const handleWhatsapp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener");
  };

  const handleMessenger = () => {
    // Deeplinks into Messenger app if installed. Silent no-op on desktop
    // without the app — same graceful-degrade as invite/ShareDrawer.
    const target = publicUrl ?? "https://epochlag.com";
    const url = `fb-messenger://share?link=${encodeURIComponent(target)}`;
    window.open(url, "_blank", "noopener");
  };

  const handleFacebook = () => {
    // Public Facebook Sharer Dialog — no App ID required. `u` for the URL,
    // `quote` for the caption.
    const target = publicUrl ?? "https://epochlag.com";
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(target)}&quote=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel — mobile bottom sheet, desktop right drawer */}
      <div
        role="dialog"
        aria-label="Send to"
        aria-modal="true"
        className={`fixed z-50 bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-300 ease-out
          left-0 right-0 bottom-0 rounded-t-[24px] max-h-[92vh]
          md:left-auto md:right-0 md:top-0 md:bottom-0 md:rounded-t-none md:rounded-l-[24px] md:w-[430px] md:max-h-none md:h-full
          ${
            open
              ? "translate-y-0 md:translate-x-0"
              : "translate-y-full md:translate-y-0 md:translate-x-full"
          }`}
      >
        {/* Mobile grab handle — tap to close so the user always has a way
            out even when the sheet stretches to full 92vh and the backdrop
            gets pushed off-screen behind the browser chrome. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="md:hidden flex justify-center pt-[10px] pb-[6px] cursor-pointer"
        >
          <span className="w-[40px] h-[4px] rounded-full bg-black/[0.2]" />
        </button>

        {/* Close button — desktop absolute top-right */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="hidden md:flex absolute top-[20px] right-[20px] cursor-pointer w-[32px] h-[32px] rounded-full bg-[#EDEDED] items-center justify-center text-primary-blue hover:bg-black/[0.08] transition-colors z-10"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6l-12 12"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Mobile: X close button in the header row (visible even when the
            sheet takes full 92vh and the backdrop gets pushed off-screen). */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="md:hidden absolute top-[10px] right-[16px] cursor-pointer w-[32px] h-[32px] rounded-full bg-[#EDEDED] flex items-center justify-center text-primary-blue z-10"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6l12 12M18 6l-12 12"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </button>

        {sent ? (
          <SentState
            title={SUCCESS_TITLE[shareContext]}
            onDone={onClose}
          />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-[20px] pt-[24px] pb-[8px]">
              <h2 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px]">
                Send to
              </h2>

              {previewContent && (
                <div className="mt-[16px]">{previewContent}</div>
              )}

              {/* Search */}
              <div className="mt-[16px] flex items-center gap-[8px] rounded-full bg-[#EDEDED] px-[14px] h-[40px]">
                <input
                  id="send-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="flex-1 bg-transparent border-0 outline-none font-montserrat text-primary-blue text-[14px] placeholder:text-primary-blue/50"
                />
                <SearchGlyph />
              </div>

              {/* Contact list — vertical scroll on desktop, horizontal on
                  mobile per Figma. */}
              <p className="mt-[18px] font-montserrat font-bold text-primary-blue text-[14px]">
                {previewContent ? "Share on Epoch Lag" : "Suggested"}
              </p>

              {/* When a preview card is present, both breakpoints render
                  the horizontal row (with a Search chip as the first item);
                  otherwise desktop shows the vertical list. */}
              {previewContent ? (
                <div className="mt-[10px] -mx-[4px] flex gap-[16px] overflow-x-auto scrollbar-hide pb-[8px]">
                  {filteredUsers.slice(0, 30).map((u) => (
                    <MobileContactChip
                      key={u._id}
                      user={u}
                      selected={selectedContacts.has(u._id)}
                      onToggle={() => toggleContact(u._id)}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {/* Mobile: horizontal row */}
                  <div className="md:hidden mt-[10px] -mx-[4px] flex gap-[16px] overflow-x-auto scrollbar-hide pb-[8px]">
                    {filteredUsers.slice(0, 30).map((u) => (
                      <MobileContactChip
                        key={u._id}
                        user={u}
                        selected={selectedContacts.has(u._id)}
                        onToggle={() => toggleContact(u._id)}
                      />
                    ))}
                  </div>

                  {/* Desktop: vertical list */}
                  <ul className="hidden md:flex mt-[10px] flex-col">
                    {filteredUsers.map((u) => (
                      <DesktopContactRow
                        key={u._id}
                        user={u}
                        selected={selectedContacts.has(u._id)}
                        onToggle={() => toggleContact(u._id)}
                      />
                    ))}
                  </ul>
                </>
              )}

              {showGroups && filteredGroups.length > 0 && (
                <>
                  <p className="mt-[18px] font-montserrat font-bold text-primary-blue text-[14px]">
                    Groups
                  </p>
                  <ul className="mt-[10px] flex flex-col">
                    {filteredGroups.map((g) => (
                      <DesktopGroupRow
                        key={g._id}
                        group={g}
                        selected={selectedGroups.has(g._id)}
                        onToggle={() => toggleGroup(g._id)}
                      />
                    ))}
                  </ul>
                </>
              )}

              {showMessageInput && (
                <div className="mt-[16px] bg-[#EDEDED] rounded-[16px] px-[14px] py-[10px]">
                  <label
                    htmlFor="send-note"
                    className="block font-montserrat text-primary-blue/60 text-[11px] mb-[4px]"
                  >
                    Note
                  </label>
                  <textarea
                    id="send-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={NOTE_MAX}
                    className="w-full bg-transparent border-0 outline-none resize-none font-montserrat text-primary-blue text-[13px]"
                  />
                </div>
              )}

              {/* External chips — Figma set: Copy Link / WhatsApp /
                  Messenger / Facebook. Messenger uses the fb-messenger://
                  deeplink (silent no-op on desktop without app); Facebook
                  uses the public Sharer Dialog (no App ID needed). */}
              <div className="mt-[20px] pt-[16px] border-t border-black/[0.06] flex items-start justify-around gap-[12px]">
                <ChannelChip
                  label="Copy Link"
                  bg="#EDEDED"
                  fg="#092E4A"
                  onTap={handleCopyLink}
                  icon={<LinkGlyph />}
                />
                <ChannelChip
                  label="Whatsapp"
                  bg="#25D366"
                  onTap={handleWhatsapp}
                  icon={<WhatsappGlyph />}
                />
                <ChannelChip
                  label="Messenger"
                  bg="linear-gradient(135deg, #00B2FF 0%, #006AFF 25%, #7A2FFA 60%, #FF3A6C 100%)"
                  onTap={handleMessenger}
                  icon={<MessengerGlyph />}
                />
                <ChannelChip
                  label="Facebook"
                  bg="#1877F2"
                  onTap={handleFacebook}
                  icon={<FacebookGlyph />}
                />
              </div>
            </div>

            {/* Sticky footer: names pill + Send. Empty selection collapses
                the pill and centers a full-width Send. */}
            <div className="border-t border-black/[0.06] px-[20px] py-[14px]">
              {selectedNames.length > 0 ? (
                <div className="flex items-center gap-[8px] rounded-full bg-[#EDEDED] pl-[16px] pr-[6px] h-[48px]">
                  <span className="flex-1 min-w-0 font-montserrat text-primary-blue text-[14px] truncate">
                    {selectedNames.join(", ")}
                  </span>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="cursor-pointer h-[36px] px-[20px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[14px] hover:brightness-95 transition-[filter] disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="cursor-pointer w-full h-[48px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[15px] hover:brightness-95 transition-[filter] disabled:opacity-60"
                >
                  Send
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SentState({ title, onDone }: { title: string; onDone: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-[24px] pb-[40px]">
      <div className="w-full max-w-[360px] flex flex-col items-center">
        <SuccessCelebration
          title={title}
          titleClassName="font-montserrat font-medium text-primary-blue text-[24px] leading-tight text-center"
          titleMarginTop={16}
          childrenClassName="w-full mt-[16px]"
        >
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onDone}
              className="cursor-pointer bg-primary-orange text-white font-montserrat font-semibold text-[14px] rounded-full px-[48px] py-[12px] hover:brightness-95 transition-[filter]"
            >
              Done
            </button>
          </div>
        </SuccessCelebration>
      </div>
    </div>
  );
}

function DesktopContactRow({
  user,
  selected,
  onToggle,
}: {
  user: PersonSummary;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-[12px] py-[8px] cursor-pointer text-left"
      >
        <Avatar user={user} size={40} />
        <span className="flex-1 min-w-0 font-montserrat font-semibold text-primary-blue text-[14px] truncate">
          {user.firstName} {user.lastName}
        </span>
        <Radio selected={selected} />
      </button>
    </li>
  );
}

function DesktopGroupRow({
  group,
  selected,
  onToggle,
}: {
  group: GroupSummary;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-[12px] py-[8px] cursor-pointer text-left"
      >
        <div className="w-[40px] h-[40px] rounded-full bg-primary-blue/10 overflow-hidden shrink-0">
          {group.groupPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bustUrl(group.groupPhotoUrl, null)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
        <span className="flex-1 min-w-0 font-montserrat font-semibold text-primary-blue text-[14px] truncate">
          {group.name}
        </span>
        <Radio selected={selected} />
      </button>
    </li>
  );
}

function MobileContactChip({
  user,
  selected,
  onToggle,
}: {
  user: PersonSummary;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="shrink-0 flex flex-col items-center gap-[6px] cursor-pointer w-[64px]"
    >
      <div className="relative">
        <Avatar user={user} size={56} />
        {selected && (
          <span className="absolute -bottom-[2px] -right-[2px] w-[20px] h-[20px] rounded-full bg-primary-orange border-2 border-white flex items-center justify-center text-white">
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12l5 5L20 7"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>
      <span className="font-montserrat font-semibold text-primary-blue text-[12px] truncate max-w-full">
        {user.firstName}
      </span>
    </button>
  );
}

function Avatar({ user, size }: { user: PersonSummary; size: number }) {
  const src = user.profilePicture ? bustUrl(user.profilePicture, null) : null;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = (user.firstName || "?").charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected
          ? "bg-primary-orange border-primary-orange text-white"
          : "border-primary-blue/30 bg-transparent"
      }`}
    >
      {selected && (
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12l5 5L20 7"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function ChannelChip({
  label,
  bg,
  fg,
  onTap,
  icon,
}: {
  label: string;
  bg: string;
  fg?: string;
  onTap: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex flex-col items-center gap-[6px] cursor-pointer"
    >
      <span
        className="w-[48px] h-[48px] rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.10)] hover:opacity-90 transition-opacity"
        style={{ background: bg, color: fg ?? "#FFFFFF" }}
      >
        {icon}
      </span>
      <span className="font-montserrat text-primary-blue/70 text-[11px]">
        {label}
      </span>
    </button>
  );
}

function SearchGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <circle
        cx={11}
        cy={11}
        r={7}
        stroke="#092E4A"
        strokeWidth={2}
        fill="none"
      />
      <path
        d="M20 20l-3.5-3.5"
        stroke="#092E4A"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <path
        d="M10 14a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 10a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsappGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  );
}

function MessengerGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.34.27.55l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.16-.07.34-.09.51-.04 1.15.31 2.37.48 3.63.48 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm5.99 7.42l-2.94 4.66c-.47.74-1.47.93-2.18.4l-2.34-1.75a.6.6 0 00-.72 0l-3.16 2.4c-.42.32-.97-.18-.68-.62l2.94-4.66c.47-.74 1.47-.93 2.18-.4l2.34 1.75a.6.6 0 00.72 0l3.16-2.4c.42-.32.97.18.68.62z" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

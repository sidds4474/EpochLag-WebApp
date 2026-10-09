"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { bustUrl } from "../../../../lib/images";
import {
  getCachedDockingCard,
  markNotificationSeen,
  respondToFriendRequest,
} from "../../../../lib/notifications/api";
import { updateDockingItemProgress } from "../../../../lib/home/api";
import type { Notification } from "../../../../types/home";
import { getTimeDifference } from "../../../../lib/notifications/api";
import { PersonIcon } from "../icons";

type Props = {
  notification: Notification;
  onSeenChange: (id: string, seen: boolean) => void;
  onNavigate?: () => void; // called when the row triggers navigation (e.g. close dropdown)
};

type ConnectionState = "pending" | "accepted" | "declined";

// Docking-card payload lives at navigation.dockingDetails for in-app
// (/api/notifications) rows, but web-push payloads come in flat at the root
// (`{ type, cardType, cardId, action, imageUrl }`). Normalize both so the
// router doesn't care which shape it got.
type DockingPayload = { cardId?: string; cardType?: string };

function pickDocking(n: Notification): DockingPayload {
  const nested = n.navigation?.dockingDetails ?? {};
  const flat = n as unknown as DockingPayload;
  return {
    cardId: nested.cardId || flat.cardId,
    cardType: nested.cardType || flat.cardType,
  };
}

// The generic per-cardType fallback when docking enrichment resolved to null.
function fallbackDockingLabel(cardType?: string): string {
  switch (cardType) {
    case "challenge":
      return "New challenge available";
    case "prompt":
      return "Prompt of the day";
    case "moment":
      return "Moment reminder";
    default:
      return "You have a new card";
  }
}

// Bold helper — the design bolds names/titles inside a soft-weight sentence.
function b(text: string | undefined | null) {
  if (!text) return null;
  return <span className="font-montserrat font-bold">{text}</span>;
}

export default function NotificationRow({
  notification: n,
  onSeenChange,
  onNavigate,
}: Props) {
  const router = useRouter();
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    "pending"
  );
  const [respondBusy, setRespondBusy] = useState(false);

  const user = n.profileDetails?.user;
  const firstName = user?.firstName?.trim() || "Someone";
  const relative = getTimeDifference(n.timeStamp || n.createdAt);

  const rendered = renderContent(n, firstName);
  if (!rendered) return null; // unknown type — skip silently

  const avatarNode = renderAvatar(n);

  const handleTap = async () => {
    onNavigate?.();
    if (!n.seen) {
      onSeenChange(n._id, true);
      markNotificationSeen(n._id).catch(() => {
        /* silent — 404 tolerated in the api layer */
      });
    }
    const route = await resolveRoute(n);
    if (route) router.push(route);
  };

  const respond = async (accept: boolean) => {
    const requestId =
      n.profileDetails?.requestId || n.navigation?.requestId;
    if (!requestId || respondBusy) return;
    setRespondBusy(true);
    try {
      await respondToFriendRequest(requestId, accept);
      setConnectionState(accept ? "accepted" : "declined");
      onSeenChange(n._id, true);
      markNotificationSeen(n._id).catch(() => {});
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not update the request. Please try again.";
      toast.error(message);
    } finally {
      setRespondBusy(false);
    }
  };

  const inlineActions = renderInlineActions(
    n,
    connectionState,
    respondBusy,
    respond,
    handleTap
  );

  const dot = !n.seen ? (
    <span
      aria-hidden
      className="absolute right-[20px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full bg-[#d95f3b]"
    />
  ) : null;

  // Non-navigating rows (system, moderation) render as a div; the rest as a
  // button so keyboard users get the same tap behavior as the click handler.
  const clickable = rendered.clickable !== false;

  // Row is tappable but can contain inline action buttons (friend request
  // Accept/Decline). Nested <button> inside <button> is invalid HTML and
  // throws a hydration error, so we render the row as a div with
  // role="button" + keyboard handling instead.
  return (
    <li className="relative">
      <div
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? handleTap : undefined}
        onKeyDown={
          clickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTap();
                }
              }
            : undefined
        }
        className={`w-full text-left flex items-center gap-[12px] px-[16px] py-[12px] pr-[40px] rounded-[10px] transition-colors ${
          clickable
            ? "cursor-pointer hover:bg-black/[0.03]"
            : "cursor-default"
        }`}
      >
        <div className="shrink-0">{avatarNode}</div>
        <div className="min-w-0 flex-1">
          <p className="font-montserrat font-medium text-[13px] leading-[18px] text-primary-blue">
            {rendered.copy}{" "}
            {relative && (
              <span className="font-montserrat font-medium text-[13px] text-[#9a9a9a] whitespace-nowrap">
                {relative}
              </span>
            )}
          </p>
          {inlineActions && (
            <div className="mt-[8px] flex items-center gap-[8px]">
              {inlineActions}
            </div>
          )}
        </div>
      </div>
      {dot}
    </li>
  );
}

function renderAvatar(n: Notification): ReactNode {
  const user = n.profileDetails?.user;
  const src = user?.profilePicture
    ? bustUrl(user.profilePicture, null)
    : null;

  // For docking rows we prefer the enriched card image if available.
  if (n.type === "docking_station_card") {
    const cardId = n.navigation?.dockingDetails?.cardId;
    const card = cardId ? getCachedDockingCard(cardId) : undefined;
    const dockingSrc =
      card?.imagePath || n.navigation?.dockingDetails?.imageUrl || null;
    if (dockingSrc) {
      return (
        <div className="relative w-[44px] h-[44px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dockingSrc}
            alt=""
            className="w-full h-full rounded-full object-cover"
          />
          {/* Concentric orange badge overlay in bottom-right — matches the
              mobile app design for card/prompt notifications. */}
          <span
            aria-hidden
            className="absolute -bottom-[1px] -right-[1px] w-[16px] h-[16px] rounded-full bg-[#FCE1BE] border-2 border-white flex items-center justify-center"
          >
            <span className="w-[7px] h-[7px] rounded-full bg-[#EF9849]" />
          </span>
        </div>
      );
    }
  }

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="w-[44px] h-[44px] rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-[44px] h-[44px] rounded-full bg-primary-blue/10 text-primary-blue flex items-center justify-center">
      <PersonIcon width={20} height={20} />
    </div>
  );
}

type Rendered = { copy: ReactNode; clickable?: boolean };

function renderContent(n: Notification, firstName: string): Rendered | null {
  const details = n.profileDetails;
  switch (n.type) {
    case "received_prompt": {
      const group = details?.groupName;
      return {
        copy: (
          <>
            You received a prompt from {b(firstName)}
            {group ? <> via {b(group)}</> : null}.
          </>
        ),
      };
    }
    case "received_story":
      return {
        copy: (
          <>
            {b(firstName)} shared a story with you
          </>
        ),
      };
    case "loved_story":
      return { copy: <>{b(firstName)} loved your story.</> };
    case "commented_story":
      return { copy: <>{b(firstName)} commented on your Story.</> };
    case "accept_request":
    case "accepted_request":
      return {
        copy: <>{b(firstName)} accepted your connection request.</>,
      };
    case "rejected_request":
      return { copy: <>{b(firstName)} declined your connection request.</> };
    case "birthday":
      return {
        copy: <>Today is {b(firstName)}&rsquo;s birthday!</>,
      };
    case "connection_request":
      return { copy: <>{b(firstName)} wants to connect</> };
    case "birthday_prompt":
      return { copy: <>Today is {b(firstName)}&rsquo;s Birthday!</> };
    case "schedule_prompt":
      return {
        copy: (
          <>
            {b(firstName)} {n.title || "sent you a scheduled prompt"}
          </>
        ),
      };
    case "added_to_group":
      return (
        details?.groupName
          ? {
              copy: (
                <>
                  {b(firstName)} added you to {b(details.groupName)}
                </>
              ),
            }
          : { copy: <>{b(firstName)} added you to a group</> }
      );
    case "member_added_to_group":
      return {
        copy: (
          <>
            {b(firstName)} added {b(details?.newMemberName || "a new member")}{" "}
            to {b(details?.groupName || "the group")}
          </>
        ),
      };
    case "member_left_group":
      return {
        copy: (
          <>
            {b(firstName)} left {b(details?.groupName || "the group")}
          </>
        ),
      };
    case "album_user_added":
      return {
        copy: (
          <>
            {b(details?.addedByName || firstName)} added you to the album{" "}
            {b(details?.albumTitle || "an album")}
          </>
        ),
      };
    case "story_added_to_album":
      return {
        copy: (
          <>
            {b(details?.addedByName || firstName)} added &ldquo;
            {details?.threadTitle || "a story"}&rdquo; to the album{" "}
            {b(details?.albumTitle || "an album")}
          </>
        ),
      };
    case "album_deleted":
      return {
        copy: (
          <>
            Album &ldquo;{details?.albumTitle || "Untitled"}&rdquo; was deleted
            by {b(details?.fullName || firstName)}
          </>
        ),
        clickable: false,
      };
    case "moment_invite":
      return {
        copy: (
          <>
            {b(firstName)} invited you to a moment{" "}
            {details?.momentTitle ? b(details.momentTitle) : null}
          </>
        ),
      };
    case "moment_invite_accepted":
      return {
        copy: (
          <>
            {b(firstName)} accepted your invite to{" "}
            {b(details?.momentTitle || "a moment")}
          </>
        ),
      };
    case "moment_today":
      return {
        copy: (
          <>
            Today is {b(details?.momentTitle || "a special")} moment
          </>
        ),
      };
    case "family_invite": {
      const familyDetails = details?.familyDetails as
        | { relationshipSlug?: string; storyCount?: number }
        | undefined;
      const rel = familyDetails?.relationshipSlug;
      const count = familyDetails?.storyCount;
      return {
        copy: (
          <>
            {b(firstName)} added you as their {b(rel || "family")}
            {typeof count === "number" && count > 0
              ? ` and shared ${count} ${count === 1 ? "story" : "stories"}`
              : ""}
          </>
        ),
      };
    }
    case "family_invite_accepted":
      return {
        copy: <>{b(firstName)} accepted your family invitation</>,
      };
    case "lag_reminder":
      return {
        copy: <>Lag your day &mdash; take a moment to capture it.</>,
      };
    case "content_moderated":
      // No ContentRemoved screen on web — leave the row visible but
      // unclickable so users see the message without a dead-end tap.
      return {
        copy: <>Your content was removed for violating our guidelines.</>,
        clickable: false,
      };
    case "account_banned":
      return {
        copy: (
          <>Your account has been banned for violating the guidelines.</>
        ),
        clickable: false,
      };
    case "content_reported":
      return {
        copy: (
          <>
            Your content{" "}
            {details?.subjectSnippet
              ? `"${details.subjectSnippet}" `
              : null}
            has been reported.
          </>
        ),
        clickable: false,
      };
    case "weekly_prompts":
      return { copy: <>Your prompts have arrived!</> };
    case "docking_station_card": {
      const cardId = n.navigation?.dockingDetails?.cardId;
      const card = cardId ? getCachedDockingCard(cardId) : undefined;
      if (card === undefined) {
        return {
          copy: (
            <span className="inline-block w-[160px] h-[14px] rounded bg-black/[0.06] align-middle" />
          ),
        };
      }
      const label =
        card?.title ||
        fallbackDockingLabel(n.navigation?.dockingDetails?.cardType);
      return { copy: <>{b(label)}</> };
    }
    default:
      return null;
  }
}

function renderInlineActions(
  n: Notification,
  state: ConnectionState,
  busy: boolean,
  respond: (accept: boolean) => void,
  handleTap: () => void
): ReactNode {
  if (n.type === "connection_request") {
    if (state === "accepted")
      return (
        <span className="font-montserrat font-medium text-[13px] text-primary-blue/70">
          Accepted
        </span>
      );
    if (state === "declined")
      return (
        <span className="font-montserrat font-medium text-[13px] text-primary-blue/70">
          Declined
        </span>
      );
    return (
      <>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            respond(false);
          }}
          className="cursor-pointer border border-primary-blue text-primary-blue rounded-full px-[16px] h-[26px] font-montserrat font-medium text-[13px] hover:bg-primary-blue/[0.04] transition-colors disabled:opacity-60"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            respond(true);
          }}
          className="cursor-pointer bg-[#ef9849] text-white rounded-full px-[16px] h-[26px] font-montserrat font-medium text-[13px] hover:brightness-95 transition-[filter] disabled:opacity-60"
        >
          Confirm
        </button>
      </>
    );
  }
  if (n.type === "schedule_prompt") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleTap();
        }}
        className="cursor-pointer bg-[#ef9849] text-white rounded-full px-[16px] h-[26px] font-montserrat font-medium text-[13px] hover:brightness-95 transition-[filter]"
      >
        View Request
      </button>
    );
  }
  return null;
}

// BE has shipped moment invite payloads under several keys — read each.
function extractMomentId(n: Notification): string | null {
  const nav = n.navigation as Record<string, unknown> | undefined;
  const prof = n.profileDetails as Record<string, unknown> | undefined;
  const top = n as unknown as Record<string, unknown>;
  const asId = (v: unknown): string | null =>
    typeof v === "string" && v ? v : null;
  const fromDetails = (v: unknown): string | null => {
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      // BE uses momentId as the primary key on the details object; older
      // payloads may still carry _id or id.
      return asId(o.momentId) || asId(o._id) || asId(o.id);
    }
    return null;
  };
  return (
    fromDetails(nav?.momentDetails) ||
    fromDetails(prof?.momentDetails) ||
    asId(nav?.momentId) ||
    asId(prof?.momentId) ||
    asId(top.momentId) ||
    null
  );
}

// Stash notification payload so /moments/invite/:id can render synchronously
// without an extra network round trip. Invitees can't GET /api/moments/:id
// until they've accepted, so the notification body is our source of truth.
type InviteStash = {
  moment: Record<string, unknown> | null;
  sender: Record<string, unknown> | null;
};
export function stashInvitePayload(momentId: string, payload: InviteStash) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `momentInvite:${momentId}`,
      JSON.stringify(payload)
    );
  } catch {
    /* storage full — ignore */
  }
}

// Route resolvers. Prompt-typed notifications need a lookup before we know
// whether the tap opens an existing story thread or the composer.
async function resolveRoute(n: Notification): Promise<string | null> {
  switch (n.type) {
    case "received_prompt":
    case "birthday_prompt":
    case "schedule_prompt": {
      // Payload shape confirmed live:
      //   received_prompt → nav.promptDetails.promptId (direct string)
      //   received_story  → nav.promptDetails.prompt._id + prompt.threadId
      // Different shapes for different notification types, so we read both.
      // No network wait — mobile's 3-layer cache doesn't exist on web, so a
      // network round-trip here was the "very delayed" complaint. If the
      // payload inlines a thread id, go straight to the thread; otherwise
      // land on the prompt detail page (which can itself redirect to a
      // thread when one exists).
      const pDetails = n.navigation?.promptDetails as
        | { promptId?: string; prompt?: { _id?: string; threadId?: string } }
        | undefined;
      const promptId = pDetails?.promptId || pDetails?.prompt?._id;
      if (!promptId) return null;
      const inlineThreadId = pDetails?.prompt?.threadId;
      if (inlineThreadId) return `/thread/${inlineThreadId}`;
      return `/prompt/detail/${encodeURIComponent(promptId)}`;
    }
    case "connection_request": {
      // Row has inline Accept/Decline, but tapping the row body outside those
      // buttons was dead-ending because this case was missing from the
      // resolver. Mobile sends you to the requester's profile.
      const userId = n.profileDetails?.user?._id;
      return userId ? `/profile/${userId}` : "/profile";
    }
    case "received_story":
    case "loved_story":
    case "commented_story": {
      // BE actually puts the thread id nested at
      //   navigation.promptDetails.prompt.threadId
      // (confirmed via live payload probe). The top-level nav.threadId
      // path we used to check is never populated for these types. Keep
      // the other fallbacks as defensive scraps in case BE changes shape.
      const promptObj = n.navigation?.promptDetails?.prompt as
        | { threadId?: string }
        | undefined;
      const threadId =
        promptObj?.threadId ||
        n.navigation?.threadId ||
        n.navigation?.storyId ||
        n.profileDetails?.threadId ||
        n.relatedId ||
        null;
      if (threadId) return `/thread/${threadId}`;
      return null;
    }
    case "accept_request":
    case "accepted_request":
    case "rejected_request":
    case "birthday": {
      const userId = n.profileDetails?.user?._id;
      return userId ? `/profile/${userId}` : "/profile";
    }
    case "moment_today": {
      const momentId = extractMomentId(n);
      return momentId ? `/moments/${momentId}` : null;
    }
    case "family_invite":
    case "family_invite_accepted":
      // No dedicated tree tab on web — closest surface is the F&F page.
      return "/friends-and-family";
    case "lag_reminder":
      // Closest to mobile's LagYourDayEntry — the quick-create entry point.
      return "/new-lag";
    case "album_deleted":
      // Row is `clickable: false` in renderContent, so this is defensive —
      // if the row ever becomes tappable, land on the Albums tab.
      return "/lags/albums";
    case "content_moderated":
    case "content_reported":
    case "account_banned":
      // No ContentRemoved screen on web; row is marked unclickable in
      // renderContent so this branch is only hit if BE changes copy later.
      return null;
    case "added_to_group":
    case "member_added_to_group":
    case "member_left_group": {
      // Groups live under /friends-and-family/groups/<id> on web; the old
      // top-level /groups/<id> was a dead link.
      const groupId =
        n.navigation?.groupId || n.profileDetails?.groupId || null;
      return groupId ? `/friends-and-family/groups/${groupId}` : null;
    }
    case "album_user_added":
    case "story_added_to_album": {
      // Albums are live again (Lags → Albums tab), so these route to the
      // album instead of dead-ending.
      const albumId =
        n.navigation?.albumId || n.profileDetails?.albumId || null;
      return albumId ? `/lags/albums/${albumId}` : "/lags/albums";
    }
    case "moment_invite": {
      const momentId = extractMomentId(n);
      if (!momentId) return null;
      const rawMoment =
        (n.navigation?.momentDetails as Record<string, unknown> | undefined) ||
        (n.profileDetails?.momentDetails as
          | Record<string, unknown>
          | undefined) ||
        null;
      const sender = (n.profileDetails?.user as Record<string, unknown> | undefined) || null;
      stashInvitePayload(momentId, { moment: rawMoment, sender });
      const senderFirst = (sender?.firstName as string | undefined) || "";
      const params = new URLSearchParams();
      params.set("from", n._id);
      if (senderFirst) params.set("sender", senderFirst);
      return `/moments/invite/${momentId}?${params.toString()}`;
    }
    case "moment_invite_accepted": {
      const momentId = extractMomentId(n);
      return momentId ? `/moments/${momentId}` : null;
    }
    case "weekly_prompts":
      // Mobile routes to FindInspiration — the Inspiration tab, not Home.
      return "/inspiration";
    case "docking_station_card": {
      // Previously everything collapsed to /home — meaning a tap on an inspo-
      // card notification did nothing. Mirror mobile's handleDockingAction
      // dispatcher: branch on cardType, fall back to Home only for unknowns.
      const { cardId, cardType } = pickDocking(n);
      if (!cardId) return "/home";
      switch (cardType) {
        case "prompt":
          return `/prompt/detail/${encodeURIComponent(cardId)}`;
        case "moment":
          return `/moments/${encodeURIComponent(cardId)}`;
        case "challenge":
          // Fire-and-forget progress tick so BE tracks the start regardless
          // of whether the user actually completes the challenge afterwards.
          // Web has no dedicated /challenges/<id> surface yet; land on the
          // Inspiration grid with a highlight hint.
          updateDockingItemProgress(cardId, {
            status: "started",
            cardType: "challenge",
          }).catch(() => {
            /* non-blocking telemetry */
          });
          return `/inspiration?card=${encodeURIComponent(cardId)}`;
        default:
          // Unknown cardType — live traffic ships values like "WHITE" that
          // aren't in the mobile spec's enum. Rather than dumping users on
          // /home (where they'd see no indication of which card the
          // notification was about), land on /inspiration with the cardId
          // hint so the grid can scroll/highlight it.
          return `/inspiration?card=${encodeURIComponent(cardId)}`;
      }
    }
    default:
      // Unknown/new notification type — the BE can ship types faster than the
      // client knows them. Rather than dead-end the tap, route on whatever
      // unambiguous navigation id the payload carries. Order matters: thread >
      // album > group > prompt.
      {
        const nav = n.navigation;
        const threadId =
          nav?.threadId || nav?.storyId || n.profileDetails?.threadId;
        if (threadId) return `/thread/${threadId}`;
        const albumId = nav?.albumId || n.profileDetails?.albumId;
        if (albumId) return `/lags/albums/${albumId}`;
        const groupId = nav?.groupId || n.profileDetails?.groupId;
        if (groupId) return `/friends-and-family/groups/${groupId}`;
        const promptId = nav?.promptDetails?.prompt?._id;
        if (promptId) {
          return `/new-story?promptId=${encodeURIComponent(promptId)}`;
        }
        return null;
      }
  }
}


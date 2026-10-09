"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import DownloadModal from "../../views/StoryPage/components/DownloadModal";
import { storeFamilyInviteToken } from "../../lib/familyInvite/token";
import {
  FAMILY_INVITE_FETCH_STATUS,
  fetchFamilyInvitePreview,
} from "../../lib/familyInviteApi";
import { detectPlatform } from "../../lib/platform";
import { getInitials } from "../../lib/formatters";
import { APP_STORE_URL, PLAY_STORE_URL } from "../../utils/storeLinks";
import type {
  PublicFamilyInviteMember,
  PublicFamilyInvitePreview,
} from "../../types/familyInvite";

const PEACH = "#FCD6A5";
const ORANGE_FILL = "#EF9849";
const TERRACOTTA = "#D95F3B";

// Hybrid-layout decision: parent-shaped relationships go in the top beige
// card, everything else goes in the bottom flat row. Case-insensitive +
// trimmed so BE can ship "Mom" / "mom " / "MOM" and they all match.
const PARENT_WORDS = /^(mom|mum|mother|dad|father|parent|guardian|stepmom|stepdad|stepparent)$/i;
function isParentish(rel: string | undefined | null): boolean {
  if (!rel) return false;
  return PARENT_WORDS.test(rel.trim());
}

// Bright palette for initials-fallback avatars — saturated, cheerful
// colors with enough contrast against white text. Order chosen so
// adjacent indices sit far apart in hue, since consecutive hash values
// tend to land in neighbors.
const AVATAR_PALETTE = [
  "#FF8A3D", // vivid orange
  "#2BCBBA", // bright teal
  "#A55EEA", // vivid purple
  "#FD79A8", // bright pink
  "#4B7BEC", // vivid blue
  "#26DE81", // bright green
  "#FF6B6B", // coral red
  "#F5B931", // golden yellow
];

// djb2-ish hash → palette index. Same seed always picks the same color
// (so refreshes don't shuffle avatar colors), different names differ.
function pickAvatarColor(seed: string): string {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// Shared id so a rapid retry only ever surfaces one toast at a time —
// 60/min/IP is shared with the public story endpoints, so a user bouncing
// between surfaces could trip it.
const RATE_LIMIT_TOAST_ID = "family-invite-rate-limited";
function surfaceRateLimitToast() {
  toast("Too many requests — try again in a minute.", {
    id: RATE_LIMIT_TOAST_ID,
    duration: 4000,
  });
}

// Preview state the UI branches on.
//   loading  → BE call in flight; render skeleton (static mock, slightly dimmed)
//   ok       → render dynamic hybrid layout from data
//   not_found→ render InvalidInviteState (404/400 collapse here)
//   fallback → render the static mock + generic copy (429 or 5xx — the invite
//              may still be valid; keep the user moving)
type PreviewState =
  | { kind: "loading" }
  | { kind: "ok"; data: PublicFamilyInvitePreview }
  | { kind: "not_found" }
  | { kind: "fallback" };

// Token is opaque; only sanity-check length and character set to avoid
// stashing obvious junk. Never log the raw value.
function isPlausibleToken(raw: string | null): raw is string {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 128) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export default function FamilyInviteClient() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams?.get("token") ?? null;
  const hasValidToken = useMemo(() => isPlausibleToken(tokenParam), [tokenParam]);
  const [stashed, setStashed] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ kind: "loading" });

  // Stash the token + kick off the preview fetch together. Reading the
  // preview does NOT consume the token (BE spec), so firing on every mount
  // is safe. Clean up with a cancellation flag so a Fast Refresh doesn't
  // double-apply state.
  useEffect(() => {
    if (!hasValidToken || !tokenParam) return;
    const token = tokenParam.trim();
    storeFamilyInviteToken(token);
    setStashed(true);

    let cancelled = false;
    fetchFamilyInvitePreview(token).then((result) => {
      if (cancelled) return;
      if (result.status === FAMILY_INVITE_FETCH_STATUS.OK) {
        setPreview({ kind: "ok", data: result.data });
      } else if (result.status === FAMILY_INVITE_FETCH_STATUS.NOT_FOUND) {
        setPreview({ kind: "not_found" });
      } else if (result.status === FAMILY_INVITE_FETCH_STATUS.RATE_LIMITED) {
        surfaceRateLimitToast();
        setPreview({ kind: "fallback" });
      } else {
        setPreview({ kind: "fallback" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasValidToken, tokenParam]);

  if (!hasValidToken) return <InvalidInviteState />;
  if (preview.kind === "not_found") return <InvalidInviteState />;
  return <ValidInviteState ready={stashed} preview={preview} />;
}

function ValidInviteState({
  ready,
  preview,
}: {
  ready: boolean;
  preview: Exclude<PreviewState, { kind: "not_found" }>;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleDownload = () => {
    const platform = detectPlatform(
      typeof navigator !== "undefined" ? navigator.userAgent : ""
    );
    if (platform === "ios") {
      window.location.href = APP_STORE_URL;
    } else if (platform === "android") {
      window.location.href = PLAY_STORE_URL;
    } else {
      setModalOpen(true);
    }
  };

  // Headline + illustration both key off the preview state.
  //   ok       → inviter's real name
  //   loading  → neutral placeholder (keeps page from flashing)
  //   fallback → generic copy, user never sees "undefined" or empty names
  const headline =
    preview.kind === "ok"
      ? `${preview.data.inviter.firstName} added you to a family tree on Epoch Lag!`
      : "You've been added to a family tree on Epoch Lag!";

  return (
    <main
      className="min-h-screen bg-warm-cream flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <section className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-10">
        <div className="w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] flex flex-col items-center">
          {preview.kind === "loading" ? (
            // Headline skeleton — avoids the layout shift of the real
            // headline replacing a placeholder of a different length.
            <div className="animate-pulse flex flex-col items-center gap-2 w-full max-w-[280px]">
              <div className="h-5 w-5/6 rounded-md bg-black/[0.08]" />
              <div className="h-5 w-2/3 rounded-md bg-black/[0.08]" />
            </div>
          ) : (
            <h1 className="font-lora font-medium text-[#151515] text-[20px] md:text-[22px] leading-[130%] text-center max-w-[300px]">
              {headline}
            </h1>
          )}

          <div className="mt-[36px] md:mt-[44px] w-full flex justify-center">
            {preview.kind === "ok" ? (
              <DynamicFamilyTree preview={preview.data} />
            ) : preview.kind === "loading" ? (
              // Neutral skeleton — grey circles + grey name bars. Deliberately
              // does NOT reuse the static PNG mock so users don't misread it
              // as their actual family while BE is still responding.
              <FamilyTreeSkeleton />
            ) : (
              // 429 / 5xx fallback: the invite may still be valid, so keep
              // the brand-y static illustration up rather than dumping the
              // user on a blank area.
              <FamilyTreeIllustration />
            )}
          </div>

          <p className="mt-[36px] md:mt-[44px] font-plus-jakarta text-black text-[16px] leading-[20px] text-center max-w-[260px]">
            Sign up to see the stories your family has shared with you.
          </p>
        </div>
      </section>

      <footer className="w-full px-5 sm:px-8 pb-8 md:pb-10">
        <div className="mx-auto w-full max-w-[380px] md:max-w-[420px] flex flex-col items-center gap-3">
          <a
            href="/signup"
            aria-disabled={!ready}
            className={`w-full bg-primary-orange text-primary-white font-plus-jakarta text-[16px] px-6 py-[16px] rounded-full text-center hover:opacity-90 active:opacity-80 transition-opacity leading-none ${
              ready ? "" : "opacity-70 pointer-events-none"
            }`}
          >
            Sign up
          </a>
          <button
            type="button"
            onClick={handleDownload}
            className="font-plus-jakarta text-[#2c2c2c] text-[15px] py-2 hover:opacity-70 transition-opacity"
          >
            Download Epoch Lag
          </button>
        </div>
      </footer>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trackEvent="family_invite_download_clicked"
        position="family_invite"
      />
    </main>
  );
}

function FamilyTreeIllustration() {
  return (
    <div className="relative w-[300px] h-[232px]">
      {/* Parents beige card */}
      <div
        className="absolute bg-[#E8E6DF] rounded-[16px]"
        style={{ left: 20, top: 0, width: 236, height: 113 }}
      />

      {/* Louise avatar + name */}
      <PhotoAvatar
        src="/family-invite/louise.png"
        alt=""
        style={{ left: 46, top: 16 }}
      />
      <PersonLabel
        name="Louise"
        relation="Mom"
        style={{ left: 36, top: 70, width: 67 }}
      />

      {/* Glenn avatar + name */}
      <PhotoAvatar
        src="/family-invite/glenn.png"
        alt=""
        style={{ left: 155, top: 16 }}
      />
      <PersonLabel
        name="Glenn"
        relation="Dad"
        style={{ left: 145, top: 70, width: 67 }}
      />

      {/* + button on right of parent card */}
      <OrangePlus style={{ left: 266, top: 46 }} />

      {/* Connecting lines (SVG) */}
      <svg
        className="absolute"
        style={{ left: 0, top: 113, width: 300, height: 70 }}
        viewBox="0 0 300 70"
        fill="none"
        aria-hidden="true"
      >
        {/* vertical from parent card down to junction */}
        <line x1="138" y1="0" x2="138" y2="25" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        {/* horizontal split */}
        <line x1="98" y1="25" x2="178" y2="25" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        {/* vertical down to Me */}
        <line x1="98" y1="25" x2="98" y2="52" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        {/* vertical down to Alex */}
        <line x1="178" y1="25" x2="178" y2="52" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
      </svg>

      {/* Me avatar + name */}
      <PhotoAvatar
        src="/family-invite/me.png"
        alt=""
        style={{ left: 74, top: 160 }}
      />
      <PersonLabel
        name="Me"
        style={{ left: 64, top: 214, width: 67 }}
      />

      {/* Alex initials avatar + name */}
      <InitialsAvatar initials="AS" style={{ left: 154, top: 160 }} />
      <PersonLabel
        name="Alex"
        relation="Brother"
        style={{ left: 144, top: 214, width: 67 }}
      />

      {/* + button on right of children row */}
      <OrangePlus style={{ left: 220, top: 174 }} />
    </div>
  );
}

// Hybrid dynamic layout driven by BE's familyTree[]:
//   - Parent-shaped relationships (Mom/Dad/…) fill the top beige card (≤ 2).
//   - Everything else fills a flat row below (≤ 3 avatars + optional +N chip).
//   - Beige card + connecting lines only render when at least one parent is
//     present AND at least one non-parent exists to connect to.
//   - Empty familyTree[] still renders — "you + inviter" two-avatar line.
// Flex-based layout so variable member counts don't need re-tuned
// absolute coordinates.
function DynamicFamilyTree({ preview }: { preview: PublicFamilyInvitePreview }) {
  // Partition BE's joined relatives into the top beige card (parent-shaped
  // relationships) and the bottom flat row (everyone else).
  const parents: PublicFamilyInviteMember[] = [];
  const others: PublicFamilyInviteMember[] = [];
  for (const m of preview.familyTree) {
    if (isParentish(m.relationship)) parents.push(m);
    else others.push(m);
  }

  // Clamp per-row display counts.
  const parentsShown = parents.slice(0, 2);
  const parentsCut = Math.max(0, parents.length - parentsShown.length);
  // Leave one slot on the bottom row for the invitee ("You"), so cap others
  // at 3 to keep the row to 4 items max.
  const othersShown = others.slice(0, 3);
  const othersCut = Math.max(0, others.length - othersShown.length);
  // familyTreeOverflow is "joined relatives beyond the 5 shown" from BE;
  // add any we additionally trimmed on the client.
  const overflow = preview.familyTreeOverflow + parentsCut + othersCut;

  const showParentsCard = parentsShown.length > 0;
  // Connector draws down from the parents card to the invitee + siblings
  // row below it. Only when both exist.
  const showConnector = showParentsCard;

  // Compose the bottom row: invitee first (always shown, labeled "You" with
  // the relationship BE got from the inviter), then any siblings/spouse/etc.
  // Combines into a single flex-wrap row so variable member counts don't
  // overflow the max-w container.
  const bottomRow: Array<
    | { kind: "invitee" }
    | { kind: "member"; member: PublicFamilyInviteMember }
    | { kind: "overflow"; count: number }
  > = [{ kind: "invitee" }];
  for (const m of othersShown) bottomRow.push({ kind: "member", member: m });
  if (overflow > 0) bottomRow.push({ kind: "overflow", count: overflow });

  return (
    <div className="w-full max-w-[340px] flex flex-col items-center">
      {showParentsCard && (
        <div className="relative w-full flex justify-center">
          <div className="bg-[#E8E6DF] rounded-[16px] px-5 py-4 flex items-start justify-center gap-6 max-w-[280px]">
            {parentsShown.map((p, i) => (
              <AvatarWithLabel
                key={`parent-${i}-${p.firstName}`}
                firstName={p.firstName}
                relationship={p.relationship}
                profilePicture={p.profilePicture}
              />
            ))}
          </div>
          <div className="absolute right-[-2px] top-1/2 -translate-y-1/2">
            <OrangePlusInline />
          </div>
        </div>
      )}

      {showConnector && (
        <svg
          className="w-full"
          style={{ height: 36 }}
          viewBox="0 0 300 36"
          fill="none"
          aria-hidden="true"
        >
          <line x1="150" y1="0" x2="150" y2="18" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
          <line x1="80" y1="18" x2="220" y2="18" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
          <line x1="80" y1="18" x2="80" y2="30" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
          <line x1="220" y1="18" x2="220" y2="30" stroke="#092E4A" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
        </svg>
      )}

      <div className="relative w-full flex justify-center">
        <div className="flex items-start justify-center flex-wrap gap-x-4 gap-y-3 max-w-[320px]">
          {bottomRow.map((item, i) => {
            if (item.kind === "invitee") {
              return (
                <AvatarWithLabel
                  key="you"
                  firstName="You"
                  // Only show the relationship suffix when BE provided one.
                  relationship={preview.invitee.relationship || ""}
                  profilePicture={null}
                  // Hash on the real first name so the "You" chip has a
                  // stable color per invitee, independent of the "You" label.
                  colorSeed={preview.invitee.firstName}
                />
              );
            }
            if (item.kind === "overflow") {
              return <OverflowChip key="overflow" count={item.count} />;
            }
            return (
              <AvatarWithLabel
                key={`other-${i}-${item.member.firstName}`}
                firstName={item.member.firstName}
                relationship={item.member.relationship}
                profilePicture={item.member.profilePicture}
              />
            );
          })}
        </div>
        {/* "+" affordance to the right of the row — hidden when the overflow
            chip is already consuming that space. */}
        {overflow === 0 && (
          <div className="absolute right-[-2px] top-[14px]">
            <OrangePlusInline />
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarWithLabel({
  firstName,
  relationship,
  profilePicture,
  colorSeed,
}: {
  firstName: string;
  relationship: string;
  profilePicture: string | null;
  // Optional hash seed for the initials-fallback color. Lets the invitee
  // label show "You" but still get a stable per-person color driven off
  // their real first name.
  colorSeed?: string;
}) {
  const initials = getInitials(firstName);
  const bg = pickAvatarColor(colorSeed || firstName);
  return (
    <div className="flex flex-col items-center" style={{ width: 72 }}>
      {profilePicture ? (
        <div className="w-[47px] h-[47px] rounded-full overflow-hidden bg-[#F1F1F1]">
          <img
            src={profilePicture}
            alt={firstName}
            className="w-full h-full object-cover"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fall back to initials when the hosted image fails (e.g. a
              // google-user-content URL throttled on localhost). Removes the
              // broken-image glyph browsers show by default.
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) parent.classList.add("avatar-fallback");
            }}
          />
        </div>
      ) : (
        <div
          className="w-[47px] h-[47px] rounded-full flex items-center justify-center"
          style={{ backgroundColor: bg }}
        >
          <span className="font-montserrat font-medium text-white text-[16px] leading-none">
            {initials || "?"}
          </span>
        </div>
      )}
      <span className="mt-2 font-plus-jakarta text-[#2C2C2C] text-[14px] leading-[18px] text-center truncate w-full">
        {firstName}
      </span>
      {relationship ? (
        <span className="mt-[2px] font-montserrat font-medium text-[#848484] text-[11px] leading-[14px] text-center">
          {relationship}
        </span>
      ) : null}
    </div>
  );
}

function OverflowChip({ count }: { count: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ width: 48 }}
      aria-label={`${count} more joined family members`}
    >
      <div className="w-[47px] h-[47px] rounded-full bg-[#E8E6DF] flex items-center justify-center">
        <span className="font-montserrat font-semibold text-[#2C2C2C] text-[13px]">
          +{count}
        </span>
      </div>
    </div>
  );
}

function FamilyTreeSkeleton() {
  // Shape mirrors the dynamic layout: a top card with two avatars + a bottom
  // row of three. Grey neutrals so users don't mistake it for real content
  // during the fetch window.
  const AvatarBlock = () => (
    <div className="flex flex-col items-center" style={{ width: 72 }}>
      <div className="w-[47px] h-[47px] rounded-full bg-black/[0.08]" />
      <div className="mt-2 h-3 w-10 rounded bg-black/[0.08]" />
      <div className="mt-1.5 h-2.5 w-8 rounded bg-black/[0.06]" />
    </div>
  );
  return (
    <div className="w-full max-w-[320px] flex flex-col items-center animate-pulse">
      <div className="bg-[#E8E6DF] rounded-[16px] px-5 py-4 flex items-start justify-center gap-6 max-w-[280px]">
        <AvatarBlock />
        <AvatarBlock />
      </div>
      <svg
        className="w-full"
        style={{ height: 36 }}
        viewBox="0 0 300 36"
        fill="none"
        aria-hidden="true"
      >
        <line x1="150" y1="0" x2="150" y2="18" stroke="#092E4A" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
        <line x1="80" y1="18" x2="220" y2="18" stroke="#092E4A" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
        <line x1="80" y1="18" x2="80" y2="30" stroke="#092E4A" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
        <line x1="220" y1="18" x2="220" y2="30" stroke="#092E4A" strokeOpacity="0.15" strokeWidth="1" strokeLinecap="round" />
      </svg>
      <div className="flex items-start justify-center gap-4">
        <AvatarBlock />
        <AvatarBlock />
        <AvatarBlock />
      </div>
    </div>
  );
}

function OrangePlusInline() {
  // Flow-friendly version of OrangePlus (no absolute positioning).
  return (
    <div
      className="w-[20px] h-[20px] rounded-full flex items-center justify-center"
      style={{ backgroundColor: ORANGE_FILL }}
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2v8M2 6h8"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

type PositionStyle = { left: number; top: number; width?: number };

function PhotoAvatar({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style: PositionStyle;
}) {
  return (
    <div
      className="absolute w-[47px] h-[47px] rounded-full overflow-hidden bg-[#F1F1F1]"
      style={style}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        decoding="async"
      />
    </div>
  );
}

function InitialsAvatar({
  initials,
  style,
}: {
  initials: string;
  style: PositionStyle;
}) {
  return (
    <div
      className="absolute w-[47px] h-[47px] rounded-full bg-[#2C2C2C] flex items-center justify-center"
      style={style}
    >
      <span className="font-montserrat font-medium text-white text-[18px] leading-none">
        {initials}
      </span>
    </div>
  );
}

function PersonLabel({
  name,
  relation,
  style,
}: {
  name: string;
  relation?: string;
  style: PositionStyle;
}) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: style.left, top: style.top, width: style.width }}
    >
      <span className="font-plus-jakarta text-[#2C2C2C] text-[16px] leading-[20px]">
        {name}
      </span>
      {relation ? (
        <span className="mt-[6px] font-montserrat font-medium text-[#848484] text-[12px] leading-[16px]">
          {relation}
        </span>
      ) : null}
    </div>
  );
}

function OrangePlus({ style }: { style: PositionStyle }) {
  // Overlay + button (used both on parent card and children row)
  return (
    <div
      className="absolute w-[20px] h-[20px] rounded-full flex items-center justify-center"
      style={{ ...style, backgroundColor: ORANGE_FILL }}
      aria-hidden="true"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M6 2v8M2 6h8"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function InvalidInviteState() {
  const [modalOpen, setModalOpen] = useState(false);

  const handleExit = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <main
      className="min-h-screen bg-warm-cream flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <section className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8">
        <div className="w-full max-w-[340px] sm:max-w-[400px] flex flex-col items-center">
          <div
            style={{ width: 100, height: 100, position: "relative", flexShrink: 0 }}
            aria-hidden="true"
          >
            <svg width={100} height={100} viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="50" fill={PEACH} />
              <circle cx="50" cy="50" r="36" fill={ORANGE_FILL} />
              <circle cx="50" cy="50" r="22" fill={TERRACOTTA} />
              <path d="M40 40 L60 60 M60 40 L40 60" stroke="white" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          <h1 className="mt-6 font-lora font-medium text-[#151515] text-[24px] md:text-[28px] leading-[120%] text-center max-w-[300px]">
            Invitation link is invalid or expired
          </h1>

          <p className="mt-[14px] md:mt-[18px] font-plus-jakarta text-black text-[16px] leading-[150%] text-center max-w-[320px]">
            Ask the person who invited you to send a fresh link.
          </p>
        </div>
      </section>

      <footer className="w-full px-5 sm:px-8 pb-8 md:pb-10">
        <div className="mx-auto w-full max-w-[380px] md:max-w-[420px] flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleExit}
            className="w-full bg-primary-orange text-primary-white font-plus-jakarta text-[16px] px-6 py-[16px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity leading-none"
          >
            Exit
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="font-plus-jakarta text-[#2c2c2c] text-[15px] py-2 hover:opacity-70 transition-opacity"
          >
            Download Epoch Lag
          </button>
        </div>
      </footer>

      <DownloadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        trackEvent="family_invite_download_clicked"
        position="family_invite_invalid"
      />
    </main>
  );
}

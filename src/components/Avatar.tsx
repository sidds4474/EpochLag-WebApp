"use client";

import { useAppSelector } from "../lib/onboarding/store";
import {
  bustUrl,
  colorForName,
  getInitial,
  hasProfilePicture,
} from "../lib/avatar";

// Mirror of mobile Avatar.js. Renders the user's profile picture if
// present, otherwise a deterministic colored circle with their first
// initial. Colors + hash formula are shared with mobile — same user
// gets the same color across web, iOS, and Android.
//
// For self-view (`isSelf`), the cache-buster is read from the Redux
// profile slice's updatedAt instead of the passed-in user, which may
// be a stale summary from an older list payload.

export type AvatarUser = {
  firstName?: string | null;
  profilePicture?: string | null;
  updatedAt?: string | null;
};

type Props = {
  user: AvatarUser | null | undefined;
  size?: number;
  className?: string;
  /** Read updatedAt from the Redux profile slice for cache-busting. Use
   *  this when rendering the current signed-in user's avatar so a fresh
   *  upload replaces the cached image immediately. */
  isSelf?: boolean;
  /** Override the border radius. Defaults to full circle. */
  rounded?: string;
};

export default function Avatar({
  user,
  size = 40,
  className = "",
  isSelf = false,
  rounded = "9999px",
}: Props) {
  const selfUpdatedAt = useAppSelector((s) =>
    isSelf ? s.profile.raw?.updatedAt ?? null : null
  );

  const firstName = user?.firstName ?? null;
  const profilePicture = user?.profilePicture ?? null;
  const version = isSelf
    ? selfUpdatedAt ?? user?.updatedAt ?? null
    : user?.updatedAt ?? null;

  if (hasProfilePicture(profilePicture)) {
    return (
      // Plain img so we don't need per-usage width/height typing gymnastics
      // for arbitrary sizes. next/image would need explicit sizes anyway
      // for user-uploaded content on Cloudinary.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bustUrl(profilePicture as string, version)}
        alt={firstName ?? ""}
        width={size}
        height={size}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: rounded,
          objectFit: "cover",
        }}
      />
    );
  }

  const initial = getInitial(firstName);
  const color = colorForName(firstName);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        background: color,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        fontSize: Math.max(10, Math.round(size * 0.4)),
        lineHeight: 1,
        userSelect: "none",
        flexShrink: 0,
      }}
      aria-label={firstName ?? undefined}
    >
      {initial}
    </div>
  );
}

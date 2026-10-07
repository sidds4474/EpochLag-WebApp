"use client";

import { useEffect, useState } from "react";
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

  // The remote image can be slow or intermittently 429. Render the initial
  // circle as a *placeholder behind* the photo so that:
  //   • while the photo loads, the coloured initial shows (not a broken-image
  //     glyph), and
  //   • the <img> carries alt="" so the name never prints over it during load.
  // On error we drop the <img> entirely and the placeholder stays.
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [profilePicture, version]);

  const initial = getInitial(firstName);
  const color = colorForName(firstName);
  const showImg = hasProfilePicture(profilePicture) && !imgError;

  return (
    <div
      className={className}
      style={{
        position: "relative",
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
        overflow: "hidden",
      }}
      aria-label={firstName ?? undefined}
    >
      {initial}
      {showImg && (
        // Plain img (user-uploaded Cloudinary content; next/image would need
        // explicit sizes). alt="" — the name is on the container's aria-label,
        // and an empty alt stops the filename/name printing while it loads.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bustUrl(profilePicture as string, version)}
          alt=""
          width={size}
          height={size}
          onError={() => setImgError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: size,
            height: size,
            borderRadius: rounded,
            objectFit: "cover",
          }}
        />
      )}
    </div>
  );
}

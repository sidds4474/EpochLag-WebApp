"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { fetchMyProfile } from "../../../../lib/profile/api";
import { bustUrl } from "../../../../lib/images";
import Avatar from "../../../../components/Avatar";
import {
  BookmarkIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  PencilIcon,
  CalendarIcon,
} from "../icons";
import AvatarUploadModal from "./AvatarUploadModal";
import CoverPickerModal from "./CoverPickerModal";

// Studio is now a profile hub: hero (cover + avatar + name + meta + bio)
// followed by two sand-colored navigation cards that link out to the
// supporting surfaces (Bookmarks, Drafts, Moments, Interactions, My Days,
// Why Epoch Lag?, Notifications, Accounts). The dense paginated tabs
// have moved to their own routes.
export default function StudioPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);

  // Silent profile refresh on mount so the hero's name / bio / cover
  // stay current without waiting for AuthProvider's cache to expire.
  useEffect(() => {
    let cancelled = false;
    fetchMyProfile()
      .then((next) => {
        if (!cancelled) updateUser(next);
      })
      .catch(() => {
        /* keep cached user */
      });
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  const fullName =
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "…";
  const cover = bustUrl(user?.backgroundPicture ?? null, user?.updatedAt);
  const location = user?.city || user?.state || user?.country || null;
  const dob = formatDob(user?.dateOfBirth ?? null);
  const bio = user?.bio ?? null;

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-[#f3f1eb]">
      <div className="px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] md:pt-[24px] pb-[100px] md:pb-[48px] max-w-[1400px] mx-auto w-full">
        {/* Page title row: back + "Studio" title (left), settings gear (right) */}
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

        {/* Hero: cover banner with avatar overlapping bottom-left */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCoverModalOpen(true)}
            aria-label="Change cover"
            className="cursor-pointer relative w-full aspect-[16/6] md:aspect-[1056/212] rounded-[18px] overflow-hidden bg-gradient-to-br from-[#f2a45c] via-[#e18248] to-[#4a2a2f] hover:brightness-95 transition-[filter]"
          >
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </button>

          {/* Avatar — overlaps cover bottom-left on md+, centered on mobile */}
          <div className="absolute left-1/2 -translate-x-1/2 md:left-[38px] md:translate-x-0 -bottom-[46px] md:-bottom-[62px]">
            <div className="relative">
              <div className="rounded-full border-[4px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.10)] md:hidden">
                <Avatar user={user} size={110} isSelf />
              </div>
              <div className="rounded-full border-[4px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.10)] hidden md:block">
                <Avatar user={user} size={136} isSelf />
              </div>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(true)}
                aria-label="Change photo"
                className="cursor-pointer absolute right-[2px] bottom-[2px] w-[32px] h-[32px] md:w-[34px] md:h-[34px] rounded-full bg-white text-[#232323] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)] hover:brightness-95 transition-[filter]"
              >
                <CameraIcon width={18} height={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Name + meta + bio */}
        <div className="mt-[60px] md:mt-[16px] md:pl-[200px] md:pr-[12px]">
          <div className="flex flex-col md:flex-row md:items-start md:gap-[24px]">
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="inline-flex items-center gap-[10px]">
                <h2 className="font-ivy font-normal text-[#232323] text-[24px] md:text-[32px] leading-tight">
                  {fullName}
                </h2>
                <Link
                  href="/studio/edit"
                  aria-label="Edit profile"
                  className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] text-[#232323] flex items-center justify-center hover:brightness-95 transition-[filter]"
                >
                  <PencilIcon width={15} height={15} />
                </Link>
              </div>
              {(location || dob) && (
                <div className="mt-[8px] flex items-center gap-[16px] font-montserrat text-[#848484] text-[14px] justify-center md:justify-start">
                  {location && (
                    <span className="inline-flex items-center gap-[6px]">
                      <MapPinIcon width={14} height={14} />
                      {location}
                    </span>
                  )}
                  {dob && (
                    <span className="inline-flex items-center gap-[6px]">
                      <CalendarIcon width={14} height={14} />
                      {dob}
                    </span>
                  )}
                </div>
              )}
            </div>

            {bio && (
              <p className="mt-[12px] md:mt-[6px] md:max-w-[440px] font-montserrat text-[#092e4a] text-[14px] md:text-[16px] leading-[20px] whitespace-pre-wrap text-center md:text-left">
                {bio}
              </p>
            )}
          </div>
        </div>

        {/* Nav cards — indented past the avatar on md+ so they start at
            the right edge of the avatar column, matching the Figma.
            items-start keeps each card's height tied to its own rows
            instead of stretching to match the taller sibling. */}
        <div className="mt-[20px] md:mt-[24px] md:pl-[200px] md:pr-[12px] grid grid-cols-1 lg:grid-cols-2 gap-[16px] max-w-full items-start">
          <NavCard
            items={[
              {
                icon: <BookmarkIcon width={16} height={18} />,
                label: "Bookmarks",
                href: "/studio/bookmarks",
              },
              {
                icon: <DraftsSvg width={18} height={18} />,
                label: "Drafts",
                href: "/studio/drafts",
              },
              {
                icon: <MomentsSvg width={18} height={18} />,
                label: "Moments",
                href: "/moments",
              },
              {
                icon: <InteractionsSvg width={18} height={18} />,
                label: "Interactions",
                href: "/interactions",
              },
              {
                icon: <MyDaysSvg width={20} height={20} />,
                label: "My Days",
                href: "/my-days",
              },
            ]}
          />
          <NavCard
            items={[
              {
                icon: <WhyEpochSvg width={20} height={20} />,
                label: "Why Epoch Lag?",
                href: "/why-epoch-lag",
              },
              {
                icon: <NotificationsSvg width={18} height={19} />,
                label: "Notifications",
                href: "/studio/notifications",
              },
              {
                icon: <AccountsSvg width={20} height={20} />,
                label: "Accounts",
                href: "/settings",
              },
            ]}
          />
        </div>
      </div>

      <AvatarUploadModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
      <CoverPickerModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
      />
    </div>
  );
}

type NavItem = {
  icon: ReactNode;
  label: string;
  href: string;
  count?: number;
};

function NavCard({ items }: { items: NavItem[] }) {
  return (
    <div className="bg-[#E8E6DF] rounded-[14px] px-[16px] py-[2px]">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.href}
          prefetch={false}
          className="flex items-center gap-[14px] py-[11px] border-b border-black/10 last:border-b-0 hover:opacity-80 transition-opacity"
        >
          <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center text-[#232323]">
            {it.icon}
          </span>
          <span className="flex-1 min-w-0 font-montserrat text-[#232323] text-[14px]">
            {it.label}
          </span>
          {typeof it.count === "number" && it.count > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-primary-orange text-white font-montserrat font-medium text-[11px] px-[6px]">
              {it.count}
            </span>
          )}
          <ChevronRightIcon
            width={11}
            height={11}
            className="shrink-0 text-[#848484]"
          />
        </Link>
      ))}
    </div>
  );
}

function formatDob(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function GearIcon({ width = 22, height = 22 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.078 1.5c-.784 0-1.44.578-1.545 1.353L9.4 3.964a8.5 8.5 0 00-1.585.657l-1.02-.674a1.56 1.56 0 00-2.03.26l-1.302 1.42a1.56 1.56 0 00-.148 1.972l.706 1.024a8.5 8.5 0 00-.638 1.605l-1.163.204A1.56 1.56 0 001 10.75v1.5c0 .784.578 1.44 1.353 1.545l1.11.15c.155.567.37 1.109.638 1.615l-.665.968a1.56 1.56 0 00.194 1.99l1.302 1.36c.55.575 1.442.65 2.08.176l.985-.732a8.5 8.5 0 001.583.66l.157 1.116c.105.775.761 1.353 1.545 1.353h1.844c.784 0 1.44-.578 1.545-1.353l.157-1.116a8.5 8.5 0 001.583-.66l.985.732a1.56 1.56 0 002.08-.176l1.302-1.36a1.56 1.56 0 00.194-1.99l-.665-.968a8.5 8.5 0 00.638-1.615l1.11-.15A1.56 1.56 0 0023 12.25v-1.5c0-.784-.578-1.44-1.353-1.545l-1.163-.204a8.5 8.5 0 00-.638-1.605l.706-1.024a1.56 1.56 0 00-.148-1.972l-1.302-1.42a1.56 1.56 0 00-2.03-.26l-1.02.674a8.5 8.5 0 00-1.585-.657l-.133-1.111A1.56 1.56 0 0013.844 1.5h-1.767a1.56 1.56 0 00-.999 0zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      />
    </svg>
  );
}

type SvgProps = { width?: number; height?: number };

function DraftsSvg({ width = 18, height = 18 }: SvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 19"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.75 17.8711H18.75" />
      <path d="M14.25 1.37132C14.6478 0.973496 15.1874 0.75 15.75 0.75C16.0286 0.75 16.3044 0.80487 16.5618 0.911476C16.8192 1.01808 17.053 1.17434 17.25 1.37132C17.447 1.5683 17.6032 1.80216 17.7098 2.05953C17.8165 2.3169 17.8713 2.59274 17.8713 2.87132C17.8713 3.1499 17.8165 3.42574 17.7098 3.68311C17.6032 3.94048 17.447 4.17434 17.25 4.37132L4.75 16.8713L0.75 17.8713L1.75 13.8713L14.25 1.37132Z" />
    </svg>
  );
}

function MomentsSvg({ width = 18, height = 18 }: SvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.75 2.75H16.75C17.8546 2.75 18.75 3.64543 18.75 4.75V18.75C18.75 19.8546 17.8546 20.75 16.75 20.75H2.75C1.64543 20.75 0.75 19.8546 0.75 18.75V4.75C0.75 3.64543 1.64543 2.75 2.75 2.75Z" />
      <path d="M13.75 0.75V4.75" />
      <path d="M5.75 0.75V4.75" />
      <path d="M0.75 8.75H18.75" />
    </svg>
  );
}

function InteractionsSvg({ width = 18, height = 18 }: SvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18.75 9.25003C18.7534 10.5699 18.4451 11.8719 17.85 13.05C17.1444 14.4618 16.0598 15.6492 14.7174 16.4793C13.3751 17.3094 11.8282 17.7494 10.25 17.75C8.93013 17.7535 7.62812 17.4451 6.45 16.85L0.75 18.75L2.65 13.05C2.05493 11.8719 1.74656 10.5699 1.75 9.25003C1.75061 7.67179 2.19061 6.12488 3.02072 4.78258C3.85083 3.44028 5.03825 2.3556 6.45 1.65003C7.62812 1.05496 8.93013 0.746587 10.25 0.750028H10.75C12.8343 0.86502 14.803 1.74479 16.2791 3.22089C17.7552 4.69699 18.635 6.66568 18.75 8.75003V9.25003Z" />
    </svg>
  );
}

function MyDaysSvg({ width = 20, height = 20 }: SvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z" />
      <path d="M12 1V3" />
      <path d="M12 21V23" />
      <path d="M4.21875 4.21875L5.63875 5.63875" />
      <path d="M18.3594 18.3594L19.7794 19.7794" />
      <path d="M1 12H3" />
      <path d="M21 12H23" />
      <path d="M4.21875 19.7794L5.63875 18.3594" />
      <path d="M18.3594 5.63875L19.7794 4.21875" />
    </svg>
  );
}

function WhyEpochSvg({ width = 20, height = 20 }: SvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.75 10.75C20.75 16.2728 16.2728 20.75 10.75 20.75C5.22715 20.75 0.75 16.2728 0.75 10.75C0.75 5.22715 5.22715 0.75 10.75 0.75C16.2728 0.75 20.75 5.22715 20.75 10.75Z" />
      <path d="M10.75 14.75V10.75" />
      <path d="M10.75 6.75H10.76" />
    </svg>
  );
}

function NotificationsSvg({ width = 18, height = 19 }: SvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 21"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.75 6.75C15.75 5.1587 15.1179 3.63258 13.9926 2.50736C12.8674 1.38214 11.3413 0.75 9.75 0.75C8.1587 0.75 6.63258 1.38214 5.50736 2.50736C4.38214 3.63258 3.75 5.1587 3.75 6.75C3.75 13.75 0.75 15.75 0.75 15.75H18.75C18.75 15.75 15.75 13.75 15.75 6.75Z" />
      <path d="M11.4795 18.75C11.3037 19.0531 11.0514 19.3047 10.7478 19.4795C10.4441 19.6544 10.0999 19.7465 9.74953 19.7465C9.39915 19.7465 9.05492 19.6544 8.7513 19.4795C8.44769 19.3047 8.19534 19.0531 8.01953 18.75" />
    </svg>
  );
}

function AccountsSvg({ width = 20, height = 20 }: SvgProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" />
      <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" />
    </svg>
  );
}

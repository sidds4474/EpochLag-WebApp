"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "../../../../types/user";
import { bustUrl } from "../../../../lib/images";
import Avatar from "../../../../components/Avatar";
import {
  CalendarIcon,
  MapPinIcon,
  PersonIcon,
} from "../icons";

type Props = {
  user: User | null;
  onOpenAvatar: () => void;
  onOpenCover: () => void;
};

// Profile header block. Layout matches Figma:
//   • Cover strip with an Edit pencil overlaid on the top-right on
//     mobile (desktop puts the pencil next to Edit Profile).
//   • Avatar disc overlapping the cover's bottom-left, with a small
//     camera badge to trigger the avatar picker.
//   • Name + location/DOB meta row.
//   • Full bio (no truncation — user preference).
//   • Actions row: connections pill + Edit Profile pill + Settings gear
//     on desktop; connections pill + Settings gear only on mobile
//     (mobile's Edit is the floating pencil on the cover).
export default function StudioHeader({
  user,
  onOpenAvatar,
  onOpenCover,
}: Props) {
  const router = useRouter();
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "…";
  const cover = bustUrl(user?.backgroundPicture ?? null, user?.updatedAt);
  const location = user?.city || user?.state || user?.country || null;
  const dob = formatDob(user?.dateOfBirth ?? null);
  const bio = user?.bio ?? null;
  const connectionsCount = user?.friendsDetails?.length ?? user?.friends?.length ?? 0;

  return (
    <div className="w-full">
      {/* Mobile-only heading row (title + Settings icon). Tablet+ uses
          the dashboard's Header for navigation and the desktop Studio h1
          below — so this row only shows below md to avoid a duplicate
          heading + big empty gap on iPad. */}
      <div className="md:hidden flex items-center justify-between mb-[12px]">
        <h1 className="font-montserrat font-bold text-primary-blue text-[22px] leading-tight">
          Studio
        </h1>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          aria-label="Settings"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
        >
          <SettingsIcon width={18} height={18} />
        </button>
      </div>
      <h1 className="hidden md:block font-montserrat font-bold text-primary-blue text-[28px] leading-tight mb-[16px]">
        Studio
      </h1>

      {/* Cover + avatar composite. Cover is a wide rounded strip; the
          avatar disc sits at its bottom-left, overlapping. */}
      <div className="relative">
        <button
          type="button"
          onClick={onOpenCover}
          aria-label="Change cover"
          className="cursor-pointer relative w-full aspect-[16/6] md:aspect-[16/5] lg:aspect-[1028/212] rounded-[20px] overflow-hidden bg-gradient-to-br from-[#f2a45c] via-[#e18248] to-[#4a2a2f] hover:brightness-95 transition-[filter]"
        >
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </button>

        {/* Avatar disc overlapping the cover bottom-left. */}
        <div className="absolute left-[16px] md:left-[24px] -bottom-[40px] md:-bottom-[50px]">
          <div className="relative">
            <div className="rounded-full border-[4px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.10)] md:hidden">
              <Avatar user={user} size={110} isSelf />
            </div>
            <div className="rounded-full border-[4px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.10)] hidden md:block">
              <Avatar user={user} size={129} isSelf />
            </div>
            <button
              type="button"
              onClick={onOpenAvatar}
              aria-label="Change photo"
              className="cursor-pointer absolute right-[2px] bottom-[2px] w-[32px] h-[32px] md:w-[34px] md:h-[34px] rounded-full bg-white text-primary-blue flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)] hover:brightness-95 transition-[filter]"
            >
              <CameraIcon width={24} height={24} />
            </button>
          </div>
        </div>

      </div>

      {/* Mobile-only edit pencil — sits BELOW the cover, right-aligned.
          The avatar disc overhangs into this row's left side, so the
          right-align keeps the pencil clear of it. */}
      <div className="md:hidden mt-[10px] flex justify-end">
        <button
          type="button"
          onClick={() => router.push("/studio/edit")}
          aria-label="Edit profile"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] text-primary-blue flex items-center justify-center hover:brightness-95 transition-[filter]"
        >
          <EditPencilIcon width={20} height={20} />
        </button>
      </div>

      {/* Tablet + desktop actions row — sits BELOW the cover, right-
          aligned. Connections pill + Edit studio pill + Settings gear.
          pl-[160px] leaves room for the avatar's overhang on the left. */}
      <div className="hidden md:flex mt-[16px] items-center justify-end gap-[10px] pl-[160px]">
        <ConnectionsPill
          count={connectionsCount}
          onClick={() => router.push("/friends-and-family")}
        />
        <Link
          href="/studio/edit"
          className="cursor-pointer border-[1.5px] border-primary-blue text-primary-blue rounded-full h-[44px] px-[20px] font-montserrat font-medium text-[14px] hover:bg-primary-blue/[0.04] transition-colors inline-flex items-center gap-[8px]"
        >
          <EditPencilIcon width={18} height={18} />
          Edit studio
        </Link>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          aria-label="Settings"
          className="cursor-pointer w-[40px] h-[40px] rounded-full text-primary-blue hover:bg-black/[0.06] flex items-center justify-center transition-colors"
        >
          <SettingsIcon width={22} height={22} />
        </button>
      </div>

      {/* Name + meta */}
      <div className="mt-[16px] lg:mt-[8px] px-[4px] md:px-[8px]">
        <h2 className="font-montserrat font-bold text-primary-blue text-[20px] md:text-[24px] leading-tight">
          {fullName}
        </h2>
        {(location || dob) && (
          <div className="mt-[6px] flex items-center gap-[14px] font-montserrat text-primary-blue/70 text-[13px]">
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
        {bio && (
          <p className="mt-[10px] font-montserrat text-primary-blue text-[14px] leading-[20px] whitespace-pre-wrap">
            {bio}
          </p>
        )}
      </div>

      {/* Mobile-only connections pill (single row under the meta). Edit
          moved to the floating cover pencil; Settings is in the top bar.
          Hidden on md+ where the tablet/desktop actions row covers it. */}
      <div className="md:hidden mt-[14px] px-[4px]">
        <ConnectionsPill
          count={connectionsCount}
          onClick={() => router.push("/friends-and-family")}
        />
      </div>
    </div>
  );
}

function ConnectionsPill({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  const label =
    count === 0
      ? "Add friends"
      : count === 1
      ? "1 connection"
      : `${count} connections`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer inline-flex items-center gap-[8px] bg-primary-orange text-white rounded-full h-[40px] px-[18px] font-montserrat font-medium text-[14px] hover:brightness-95 transition-[filter]"
    >
      <PersonIcon width={16} height={16} />
      {label}
    </button>
  );
}

function formatDob(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Mobile-only edit-profile pencil (floating on the cover's top-right).
// Different silhouette from the generic PencilIcon used inside inputs —
// this one has the diagonal line-and-eraser strokes matching the Figma.
function EditPencilIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.9667 3.40018L12.7391 2.62778C14.0188 1.34803 16.0937 1.34803 17.3735 2.62778C18.6532 3.90754 18.6532 5.98243 17.3735 7.26218L16.6011 8.03458M11.9667 3.40018C11.9667 3.40018 12.0632 5.04153 13.5115 6.48978C14.9597 7.93803 16.6011 8.03458 16.6011 8.03458M16.6011 8.03458L9.50004 15.1356C9.01907 15.6166 8.77859 15.8571 8.51343 16.0639C8.20064 16.3079 7.8622 16.517 7.50411 16.6877C7.20054 16.8324 6.87789 16.9399 6.23261 17.155L3.49823 18.0665L2.82983 18.2893C2.51228 18.3951 2.16217 18.3125 1.92549 18.0758C1.6888 17.8391 1.60615 17.489 1.712 17.1714L1.9348 16.503L2.84626 13.7687C3.06136 13.1234 3.1689 12.8007 3.31358 12.4972C3.48424 12.1391 3.6934 11.8006 3.93737 11.4878C4.14419 11.2227 4.38468 10.9822 4.86565 10.5012L11.9667 3.40018M3.49823 18.0665L1.9348 16.503"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CameraIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 30"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.0936 25.9741H17.5907C21.4509 25.9741 23.381 25.9741 24.7675 25.0645C25.3677 24.6707 25.8831 24.1648 26.2841 23.5755C27.2105 22.2142 27.2105 20.3192 27.2105 16.5291C27.2105 12.7391 27.2105 10.8441 26.2841 9.48279C25.8831 8.89347 25.3677 8.38749 24.7675 7.99372C23.8766 7.40926 22.7612 7.20035 21.0535 7.12568C20.2386 7.12568 19.537 6.51941 19.3772 5.73486C19.1375 4.55804 18.0851 3.71094 16.8627 3.71094H12.8215C11.5992 3.71094 10.5468 4.55804 10.307 5.73486C10.1472 6.51941 9.44559 7.12568 8.63069 7.12568C6.92303 7.20035 5.80767 7.40926 4.91676 7.99372C4.31653 8.38749 3.80118 8.89347 3.40012 9.48279C2.47369 10.8441 2.47369 12.7391 2.47369 16.5291C2.47369 20.3192 2.47369 22.2142 3.40012 23.5755C3.80118 24.1648 4.31653 24.6707 4.91676 25.0645C6.30325 25.9741 8.23336 25.9741 12.0936 25.9741ZM14.8421 11.4693C11.9959 11.4693 9.68861 13.7347 9.68861 16.5291C9.68861 19.3236 11.9959 21.5889 14.8421 21.5889C17.6883 21.5889 19.9956 19.3236 19.9956 16.5291C19.9956 13.7347 17.6883 11.4693 14.8421 11.4693ZM14.8421 13.4932C13.1344 13.4932 11.75 14.8524 11.75 16.5291C11.75 18.2058 13.1344 19.565 14.8421 19.565C16.5498 19.565 17.9342 18.2058 17.9342 16.5291C17.9342 14.8524 16.5498 13.4932 14.8421 13.4932ZM20.6828 12.4813C20.6828 11.9224 21.1442 11.4693 21.7135 11.4693H23.0877C23.657 11.4693 24.1184 11.9224 24.1184 12.4813C24.1184 13.0402 23.657 13.4932 23.0877 13.4932H21.7135C21.1442 13.4932 20.6828 13.0402 20.6828 12.4813Z"
      />
    </svg>
  );
}

function SettingsIcon({ width = 20, height = 20 }: { width?: number; height?: number }) {
  // Filled gear — cog silhouette with a hole in the middle for the
  // center pip. Matches the Studio spec calling for a solid glyph
  // instead of the outlined variant used elsewhere.
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  fetchMyMoments,
  fetchMyProfile,
  uploadProfilePicture,
} from "../../../../lib/profile/api";
import { bustUrl, compressImage } from "../../../../lib/images";
import type { Moment } from "../../../../types/moment";
import type { User } from "../../../../types/user";
import {
  CakeIcon,
  CalendarIcon,
  CameraIcon,
  MapPinIcon,
  PencilIcon,
  PersonIcon,
} from "../icons";
import EditProfileModal from "./EditProfileModal";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [editing, setEditing] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([fetchMyProfile(), fetchMyMoments()]).then(
      ([profileRes, momentsRes]) => {
        if (cancelled) return;
        if (profileRes.status === "fulfilled") updateUser(profileRes.value);
        setMoments(
          momentsRes.status === "fulfilled" ? sortMoments(momentsRes.value) : []
        );
      }
    );
    return () => {
      cancelled = true;
    };
    // updateUser is stable via useCallback; user is populated on first mount
    // by AuthProvider, we just refresh with the latest server value here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarFile = useCallback(
    async (file: File) => {
      setAvatarUploading(true);
      try {
        let payload: File;
        try {
          payload = await compressImage(file);
        } catch {
          payload = file;
        }
        const next = await uploadProfilePicture(payload);
        updateUser(next);
        toast.success("Profile photo updated");
      } catch {
        toast.error("Couldn't update photo");
      } finally {
        setAvatarUploading(false);
      }
    },
    [updateUser]
  );

  const handleEditSuccess = useCallback(
    (next: User) => {
      updateUser(next);
      setEditing(false);
      toast.success("Profile updated");
    },
    [updateUser]
  );

  if (!user) {
    return <ProfileSkeleton />;
  }

  const location = [user.city, user.state, user.country]
    .filter(Boolean)
    .join(", ");
  const birthday = formatBirthday(user.dateOfBirth);
  const displayName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const bgSrc = bustUrl(user.backgroundPicture, user.updatedAt);
  const avatarSrc = bustUrl(user.profilePicture, user.updatedAt);

  return (
    <div className="pb-[60px]">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleAvatarFile(f);
          e.target.value = "";
        }}
      />
      <div className="relative h-[200px] md:h-[240px] w-full overflow-hidden bg-gradient-to-br from-primary-cream to-primary-cream-dkr">
        {bgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      <div className="relative bg-white rounded-t-[32px] md:rounded-t-[40px] -mt-[32px] md:-mt-[40px] pt-[80px] md:pt-[90px]">
        <div className="absolute inset-x-0 -top-[100px] md:-top-[110px] flex justify-center pointer-events-none">
          <div className="relative pointer-events-auto">
            <div className="w-[140px] h-[140px] md:w-[160px] md:h-[160px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center border-[5px] border-white shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : user.firstName ? (
                <span className="font-montserrat font-bold text-[52px]">
                  {user.firstName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <PersonIcon width={60} height={60} />
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Change profile photo"
              className="absolute bottom-[6px] right-[6px] cursor-pointer w-[38px] h-[38px] rounded-full bg-primary-orange text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] flex items-center justify-center hover:brightness-105 transition disabled:opacity-60"
            >
              {avatarUploading ? (
                <Spinner light />
              ) : (
                <CameraIcon width={18} height={18} />
              )}
            </button>
          </div>
        </div>

        <div className="max-w-[640px] mx-auto px-[24px] flex flex-col items-center text-center">
        <h1 className="font-montserrat font-bold text-primary-blue text-[26px] md:text-[30px] leading-[1.2]">
          {displayName || "Your Profile"}
        </h1>

        {(location || birthday) && (
          <div className="mt-[14px] flex flex-wrap items-center justify-center gap-x-[16px] gap-y-[6px] text-primary-blue/80 font-montserrat text-[14px]">
            {location && (
              <span className="inline-flex items-center gap-[6px]">
                <MapPinIcon width={15} height={15} />
                {location}
              </span>
            )}
            {location && birthday && (
              <span className="text-primary-blue/30">·</span>
            )}
            {birthday && (
              <span className="inline-flex items-center gap-[6px]">
                <CakeIcon width={15} height={15} />
                {birthday}
              </span>
            )}
          </div>
        )}

        {user.bio && (
          <p className="mt-[18px] font-montserrat text-primary-blue/85 text-[15px] leading-[22px] whitespace-pre-line">
            {user.bio}
          </p>
        )}

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="cursor-pointer mt-[22px] inline-flex items-center gap-[8px] bg-primary-blue text-white font-montserrat font-semibold text-[14px] rounded-full px-[20px] py-[10px] hover:opacity-90 transition-opacity"
        >
          <PencilIcon width={14} height={14} />
          Edit profile
        </button>
      </div>

      <section className="max-w-[720px] mx-auto px-[24px] mt-[44px]">
        <h2 className="font-montserrat font-bold text-primary-blue text-[18px] md:text-[20px] mb-[14px]">
          Your Moments
        </h2>

        {moments === null ? (
          <div className="flex flex-col gap-[10px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[76px] rounded-[16px] bg-black/[0.04] animate-pulse"
              />
            ))}
          </div>
        ) : moments.length === 0 ? (
          <div className="rounded-[20px] bg-primary-cream/50 border border-primary-cream-dkr/60 px-[24px] py-[32px] text-center">
            <p className="font-montserrat text-primary-blue/70 text-[14px]">
              No moments yet. Life&apos;s little milestones will land here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-[10px]">
            {moments.map((m) => (
              <MomentRow key={m._id} moment={m} />
            ))}
          </ul>
        )}
      </section>
      </div>

      {editing && (
        <EditProfileModal
          user={user}
          onClose={() => setEditing(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

function MomentRow({ moment }: { moment: Moment }) {
  const dateLabel = formatMomentDate(moment.date);
  const relative = formatRelative(moment.date);

  return (
    <li className="bg-white rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] border border-black/[0.04] px-[14px] py-[14px] flex items-center gap-[14px]">
      <div className="shrink-0 w-[44px] h-[44px] rounded-[12px] bg-primary-cream flex items-center justify-center text-primary-orange">
        <CalendarIcon width={22} height={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-montserrat font-semibold text-primary-blue text-[15px] leading-[20px] truncate">
          {moment.title || capitalize(moment.type)}
        </p>
        <p className="mt-[2px] font-montserrat text-primary-blue/60 text-[13px] leading-[18px]">
          {dateLabel}
          {relative && ` · ${relative}`}
        </p>
      </div>
    </li>
  );
}

function ProfileSkeleton() {
  return (
    <div className="pb-[60px]">
      <div className="h-[200px] md:h-[240px] bg-gradient-to-br from-primary-cream to-primary-cream-dkr" />
      <div className="relative bg-white rounded-t-[32px] md:rounded-t-[40px] -mt-[32px] md:-mt-[40px] pt-[80px] md:pt-[90px]">
        <div className="absolute inset-x-0 -top-[100px] md:-top-[110px] flex justify-center">
          <div className="w-[140px] h-[140px] md:w-[160px] md:h-[160px] rounded-full bg-black/[0.06] border-[5px] border-white animate-pulse" />
        </div>
        <div className="max-w-[640px] mx-auto px-[24px] flex flex-col items-center gap-[12px]">
          <div className="h-[28px] w-[220px] bg-black/[0.06] rounded animate-pulse" />
          <div className="h-[16px] w-[140px] bg-black/[0.06] rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`w-[16px] h-[16px] border-[2px] rounded-full animate-spin ${
        light
          ? "border-white/40 border-t-white"
          : "border-primary-blue/20 border-t-primary-blue"
      }`}
    />
  );
}

function sortMoments(list: Moment[]): Moment[] {
  return [...list].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatBirthday(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatMomentDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const diff = Math.round((d.getTime() - now.setHours(0, 0, 0, 0)) / dayMs);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

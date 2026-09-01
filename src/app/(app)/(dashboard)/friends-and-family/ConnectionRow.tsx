"use client";

import { useRouter } from "next/navigation";
import { ChevronRightIcon } from "../icons";
import Avatar from "../../../../components/Avatar";

type Props = {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  updatedAt?: string;
  subtitle?: string;
};

export default function ConnectionRow({
  id,
  firstName,
  lastName,
  profilePicture,
  updatedAt,
  subtitle,
}: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/profile/${id}`)}
      // Warm /profile/[id]'s chunk on hover/focus so the click feels
      // instant. Prefetch is a background side-effect — safe to call
      // repeatedly; Next dedupes.
      onMouseEnter={() => router.prefetch(`/profile/${id}`)}
      onFocus={() => router.prefetch(`/profile/${id}`)}
      className="cursor-pointer bg-[#EDEDED] rounded-[16px] p-[12px] flex items-center gap-[12px] hover:brightness-95 transition text-left w-full"
    >
      <Avatar
        user={{ firstName, profilePicture, updatedAt }}
        size={48}
      />
      <div className="flex-1 min-w-0">
        <p className="font-montserrat font-bold text-primary-blue text-[15px] truncate">
          {[firstName, lastName].filter(Boolean).join(" ") || "Unknown"}
        </p>
        {subtitle ? (
          <p className="font-montserrat text-primary-blue/60 text-[12px] truncate">
            {subtitle}
          </p>
        ) : null}
      </div>
      <ChevronRightIcon
        width={18}
        height={18}
        className="text-primary-blue/40 shrink-0"
      />
    </button>
  );
}

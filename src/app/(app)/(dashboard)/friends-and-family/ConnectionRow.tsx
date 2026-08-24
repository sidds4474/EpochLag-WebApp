"use client";

import { useRouter } from "next/navigation";
import { ChevronRightIcon } from "../icons";
import { bustUrl } from "../../../../lib/images";

type Props = {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  updatedAt?: string;
  subtitle?: string;
};

function initial(first?: string | null) {
  return first?.[0]?.toUpperCase() ?? "?";
}

export default function ConnectionRow({
  id,
  firstName,
  lastName,
  profilePicture,
  updatedAt,
  subtitle,
}: Props) {
  const router = useRouter();
  const url = bustUrl(profilePicture ?? null, updatedAt);
  return (
    <button
      type="button"
      onClick={() => router.push(`/profile/${id}`)}
      className="cursor-pointer bg-[#EDEDED] rounded-[16px] p-[12px] flex items-center gap-[12px] hover:brightness-95 transition text-left w-full"
    >
      <div className="w-[48px] h-[48px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[16px] shrink-0">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={firstName ?? ""}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initial(firstName)}</span>
        )}
      </div>
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

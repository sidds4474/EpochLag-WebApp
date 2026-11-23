"use client";

import Link from "next/link";
import Avatar from "../../../../components/Avatar";
import { ChevronRightIcon, PlusIcon } from "../icons";
import type { CircleGroupSummary } from "../../../../lib/circle/api";

type Props = {
  groups: CircleGroupSummary[];
  onCreateGroup?: () => void;
};

export default function GroupsPanel({ groups, onCreateGroup }: Props) {
  return (
    <section className="bg-[#E6E3D9] rounded-[20px] p-[20px] md:p-[24px] min-w-0">
      <header className="flex items-center justify-between pb-[16px]">
        <h2 className="font-ivy text-[#2C2C2C] text-[20px] md:text-[22px]">
          Groups
        </h2>
        <button
          type="button"
          onClick={onCreateGroup}
          aria-label="Create group"
          className="w-[32px] h-[32px] rounded-full bg-white text-[#2C2C2C] flex items-center justify-center hover:bg-black/[0.05] transition-colors"
        >
          <PlusIcon width={16} height={16} strokeWidth={2} />
        </button>
      </header>

      {groups.length === 0 ? (
        <p className="font-montserrat text-[#848484] text-[13px] py-[16px]">
          No groups yet.
        </p>
      ) : (
        <ul>
          {groups.map((g, i) => (
            <li key={g._id}>
              <Link
                href={`/circle/group/${g._id}`}
                className={`flex items-center gap-[12px] py-[12px] md:py-[14px] hover:opacity-85 transition-opacity ${
                  i !== groups.length - 1
                    ? "border-b border-[#C9C9C9]/60"
                    : ""
                }`}
              >
                <AvatarStack
                  photo={g.groupPhotoUrl}
                  members={g.members ?? []}
                  memberCount={g.memberCount}
                />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="font-ivy text-[#2C2C2C] text-[15px] md:text-[16px] truncate">
                    {g.name}
                  </p>
                  <p className="mt-[2px] font-montserrat text-[#848484] text-[12px] md:text-[13px]">
                    {g.memberCount} people · {g.lagCount} Lags
                  </p>
                </div>
                <ChevronRightIcon
                  width={16}
                  height={16}
                  className="text-[#848484] shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AvatarStack({
  photo,
  members,
  memberCount,
}: {
  photo: string | null | undefined;
  members: NonNullable<CircleGroupSummary["members"]>;
  memberCount: number;
}) {
  // Prefer the dedicated group photo when BE provided one. Otherwise show up
  // to three member avatars overlapped, with a "+N" badge for the remainder.
  if (photo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={photo}
        alt=""
        className="w-[44px] h-[44px] rounded-full object-cover shrink-0"
      />
    );
  }

  const stacked = members.slice(0, 3);
  const extra = Math.max(0, memberCount - stacked.length);
  return (
    <div className="flex items-center shrink-0">
      {stacked.map((m, i) => (
        <span
          key={m._id || i}
          className={`w-[28px] h-[28px] rounded-full ring-2 ring-white overflow-hidden ${
            i > 0 ? "-ml-[10px]" : ""
          }`}
        >
          <Avatar
            user={{
              firstName: m.firstName || "",
              profilePicture: m.profilePicture || null,
            }}
            size={28}
          />
        </span>
      ))}
      {extra > 0 && (
        <span className="w-[28px] h-[28px] -ml-[10px] rounded-full ring-2 ring-white bg-[#848484] text-white font-montserrat text-[10px] flex items-center justify-center">
          +{extra}
        </span>
      )}
    </div>
  );
}

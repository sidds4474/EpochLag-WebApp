"use client";

import Avatar from "../../../../components/Avatar";
import type { GroupSummary } from "../../../../types/home";

function MemberAvatar({
  member,
  offset,
}: {
  member: GroupSummary["members"][number];
  offset?: boolean;
}) {
  return (
    <div
      className={`rounded-full border-2 border-white overflow-hidden ${
        offset ? "-ml-[12px]" : ""
      }`}
    >
      <Avatar
        user={{
          firstName: member.firstName,
          profilePicture: member.profilePicture,
        }}
        size={40}
      />
    </div>
  );
}

export default function GroupTile({
  group,
  onClick,
}: {
  group: GroupSummary;
  onClick: (group: GroupSummary) => void;
}) {
  const [a, b] = group.members ?? [];
  return (
    <button
      type="button"
      onClick={() => onClick(group)}
      className="cursor-pointer w-[180px] shrink-0 rounded-[16px] bg-[#EDEDED] flex flex-col items-center py-[16px] gap-[6px] hover:brightness-95 transition"
    >
      <div className="flex items-center">
        {a ? <MemberAvatar member={a} /> : null}
        {b ? <MemberAvatar member={b} offset /> : null}
        {!a && !b ? (
          <div className="w-[40px] h-[40px] rounded-full bg-primary-blue/15 flex items-center justify-center font-montserrat font-semibold text-primary-blue">
            {group.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        ) : null}
      </div>
      <span className="font-montserrat font-bold text-primary-blue text-[14px] truncate max-w-[160px]">
        {group.name}
      </span>
      <span className="font-montserrat text-primary-blue/60 text-[12px]">
        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
      </span>
    </button>
  );
}

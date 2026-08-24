"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { fetchHomePeople } from "../../../../../../lib/home/api";
import type { GroupSummary } from "../../../../../../types/home";
import { ChevronLeftIcon } from "../../../icons";
import GroupAvatarStack from "../../GroupAvatarStack";
import FilteredStoriesGrid from "../../FilteredStoriesGrid";

export default function GroupStoriesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const [group, setGroup] = useState<GroupSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHomePeople()
      .then((p) => {
        if (cancelled) return;
        setGroup(p.groups.find((g) => g._id === groupId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setGroup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-[12px] mb-[16px]">
        <Link
          href="/lags/people"
          aria-label="Back to People"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#ededed] hover:bg-[#e0e0e0] text-primary-blue flex items-center justify-center transition-colors shrink-0"
        >
          <ChevronLeftIcon width={16} height={16} />
        </Link>
        {group ? (
          <GroupAvatarStack group={group} size={36} />
        ) : (
          <div className="w-[36px] h-[36px] rounded-full bg-[#C8D1DA] shrink-0" />
        )}
        <div className="min-w-0">
          <h2 className="font-montserrat font-bold text-primary-blue text-[18px] md:text-[22px] truncate">
            {group?.name ?? "Group"}
          </h2>
          {group && group.memberCount > 0 && (
            <p className="font-montserrat text-primary-blue/60 text-[12px]">
              {group.memberCount}{" "}
              {group.memberCount === 1 ? "member" : "members"}
            </p>
          )}
        </div>
      </div>
      <FilteredStoriesGrid filter={{ groupId }} />
    </div>
  );
}

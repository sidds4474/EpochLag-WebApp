"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { bustUrl } from "../../../../../../lib/images";
import {
  fetchStoriesFilters,
  type FilterPerson,
} from "../../../../../../lib/library/api";
import { ChevronLeftIcon } from "../../../icons";
import FilteredStoriesGrid from "../../FilteredStoriesGrid";

function personDisplayName(p: FilterPerson): string {
  const full = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return full || p.epochlagID || "Friend";
}

function personInitial(p?: FilterPerson): string {
  const first = (p?.firstName ?? "").trim();
  return first.charAt(0).toUpperCase() || "?";
}

export default function PersonStoriesPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const [person, setPerson] = useState<FilterPerson | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStoriesFilters()
      .then((f) => {
        if (cancelled) return;
        setPerson(f.people.find((p) => p._id === userId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setPerson(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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
        {person?.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bustUrl(person.profilePicture, undefined) ?? undefined}
            alt=""
            className="w-[36px] h-[36px] rounded-full object-cover bg-[#C8D1DA] shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-[36px] h-[36px] rounded-full bg-[#C8D1DA] flex items-center justify-center font-montserrat font-bold text-white text-[14px] shrink-0">
            {personInitial(person ?? undefined)}
          </div>
        )}
        <h2 className="font-montserrat font-bold text-primary-blue text-[18px] md:text-[22px] truncate">
          {person ? personDisplayName(person) : "Stories"}
        </h2>
      </div>
      <FilteredStoriesGrid filter={{ personId: userId }} />
    </div>
  );
}

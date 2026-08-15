"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo } from "react";
import { hydrate, useMomentsState } from "../../../../../../lib/moments/cache";
import { bustUrl } from "../../../../../../lib/images";
import type { Moment } from "../../../../../../types/moment";
import { ChevronLeftIcon, ChevronRightIcon } from "../../../icons";
import { fallbackGradient } from "../../momentTypeIcon";

export default function MobileMomentPeoplePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { byFilter, countdown } = useMomentsState();

  useEffect(() => {
    hydrate();
  }, []);

  const moment = useMemo<Moment | null>(() => {
    const seen = new Map<string, Moment>();
    for (const src of [byFilter.upcoming, byFilter.past, byFilter.all, countdown]) {
      if (!src) continue;
      for (const m of src) if (!seen.has(m._id)) seen.set(m._id, m);
    }
    return seen.get(id) ?? null;
  }, [byFilter, countdown, id]);

  if (!moment) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <p className="font-montserrat text-primary-blue/60 text-[14px]">
          Loading…
        </p>
      </div>
    );
  }

  const cover = moment.coverImageUrl;
  const people = moment.participants ?? [];
  const canManage = moment.role === "author";

  return (
    <div className="lg:hidden fixed inset-0 z-40 bg-white flex flex-col">
      <div
        className="relative flex-1 min-h-0"
        style={
          !cover ? { backgroundImage: fallbackGradient(moment.type) } : undefined
        }
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer absolute top-[max(env(safe-area-inset-top),16px)] left-[16px] w-[36px] h-[36px] rounded-full bg-white text-primary-blue flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>
      </div>

      <div className="relative -mt-[24px] rounded-t-[24px] bg-white px-[24px] pt-[28px] pb-[32px] flex flex-col gap-[16px]">
        {people.length === 0 ? (
          <p className="py-[24px] text-center font-montserrat text-primary-blue/50 text-[14px]">
            No one tagged yet
          </p>
        ) : (
          <ul className="flex flex-col gap-[16px]">
            {people.map((p) => (
              <li key={p.userId._id}>
                <Link
                  href={`/profile/${p.userId._id}`}
                  className="flex items-center gap-[16px]"
                >
                  <div className="w-[48px] h-[48px] rounded-full overflow-hidden border-[3px] border-white bg-primary-blue/15 text-primary-blue flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                    {p.userId.profilePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bustUrl(p.userId.profilePicture, undefined)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-montserrat font-semibold text-[16px]">
                        {(p.userId.firstName || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="flex-1 font-montserrat font-medium text-black text-[16px] truncate">
                    {[p.userId.firstName, p.userId.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                  {p.status === "pending" && (
                    <span className="font-montserrat text-primary-blue/50 text-[11px] uppercase tracking-[0.05em]">
                      pending
                    </span>
                  )}
                  <ChevronRightIcon
                    width={14}
                    height={14}
                    className="text-primary-blue/40"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <Link
            href={`/moments/${moment._id}/edit?tab=people`}
            className="cursor-pointer w-full bg-primary-orange text-white rounded-full py-[12px] flex items-center justify-center font-montserrat font-medium text-[16px] hover:brightness-[1.03] transition"
          >
            Add people
          </Link>
        )}
      </div>
    </div>
  );
}

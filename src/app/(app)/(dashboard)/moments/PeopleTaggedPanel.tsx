"use client";

import Link from "next/link";
import type { Moment } from "../../../../types/moment";
import { bustUrl } from "../../../../lib/images";
import { ChevronRightIcon } from "../icons";

export default function PeopleTaggedPanel({
  moment,
  onDone,
}: {
  moment: Moment;
  onDone: () => void;
}) {
  const people = moment.participants ?? [];
  const canManage = moment.role === "author";

  return (
    <div className="rounded-[20px] bg-white shadow-[0_1px_8px_rgba(0,0,0,0.06)] p-[20px] flex flex-col gap-[16px]">
      <h3 className="font-montserrat font-semibold text-primary-blue text-[16px]">
        People Tagged
      </h3>

      {people.length === 0 ? (
        <p className="py-[24px] text-center font-montserrat text-primary-blue/50 text-[13px]">
          No one tagged yet
        </p>
      ) : (
        <ul className="flex flex-col gap-[6px]">
          {people.map((p) => (
            <li key={p.userId._id}>
              <Link
                href={`/profile/${p.userId._id}`}
                className="flex items-center gap-[10px] px-[6px] py-[6px] rounded-[12px] hover:bg-black/[0.04] transition-colors"
              >
                <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center shrink-0">
                  {p.userId.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bustUrl(p.userId.profilePicture, undefined)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-montserrat font-semibold text-[13px]">
                      {(p.userId.firstName || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="flex-1 font-montserrat font-medium text-primary-blue text-[14px] truncate">
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

      <div className="flex flex-col gap-[10px] mt-[6px]">
        {canManage && (
          <Link
            href={`/moments/${moment._id}/edit?tab=people`}
            className="cursor-pointer w-full bg-primary-orange text-white rounded-full py-[12px] flex items-center justify-center font-montserrat font-semibold text-[14px] hover:brightness-[1.03] transition"
          >
            Add people
          </Link>
        )}
        <button
          type="button"
          onClick={onDone}
          className="cursor-pointer w-full bg-white text-primary-blue rounded-full py-[12px] border border-black/[0.12] font-montserrat font-semibold text-[14px] hover:bg-black/[0.03] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

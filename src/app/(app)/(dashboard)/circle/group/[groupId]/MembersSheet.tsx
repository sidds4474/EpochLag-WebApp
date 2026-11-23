"use client";

// Group members sheet — opens from a tap on the avatar stack on the group
// profile. Right-side drawer listing every member of the group with a tap
// target to the member's profile. Your own row is inert.

import Link from "next/link";
import { useEffect } from "react";
import Avatar from "../../../../../../components/Avatar";
import { ChevronRightIcon, CloseIcon } from "../../../icons";
import type { CircleGroupMember } from "../../../../../../lib/circle/api";

type Props = {
  open: boolean;
  members: CircleGroupMember[];
  currentUserId?: string;
  onClose: () => void;
};

export default function MembersSheet({
  open,
  members,
  currentUserId,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex justify-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[440px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
      >
        <header className="flex items-center justify-between px-[24px] pt-[24px] pb-[16px]">
          <h2 className="font-ivy text-[#2C2C2C] text-[22px]">Group Members</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <ul className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px]">
          {members.length === 0 && (
            <li className="font-montserrat text-[#848484] text-[14px] py-[16px]">
              No members yet.
            </li>
          )}
          {members.map((m) => {
            const name =
              [m.firstName, m.lastName].filter(Boolean).join(" ").trim() ||
              m.epochlagID ||
              "Someone";
            const isMe = !!currentUserId && m._id === currentUserId;
            const row = (
              <div className="flex items-center gap-[12px] py-[12px] border-b last:border-b-0 border-[#C9C9C9]/40">
                <Avatar
                  user={{
                    firstName: m.firstName || "",
                    profilePicture: m.profilePicture ?? null,
                  }}
                  size={44}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0 leading-tight">
                  <p className="font-ivy text-[#2C2C2C] text-[15px] truncate">
                    {name}
                    {isMe && (
                      <span className="ml-[6px] font-montserrat text-[#848484] text-[12px]">
                        (You)
                      </span>
                    )}
                  </p>
                  {m.epochlagID && (
                    <p className="font-montserrat text-[#848484] text-[12px] truncate">
                      {m.epochlagID}
                    </p>
                  )}
                </div>
                {!isMe && (
                  <ChevronRightIcon
                    width={16}
                    height={16}
                    className="text-[#848484] shrink-0"
                  />
                )}
              </div>
            );
            if (isMe) {
              return <li key={m._id}>{row}</li>;
            }
            return (
              <li key={m._id}>
                <Link
                  href={`/profile/${m._id}`}
                  onClick={onClose}
                  className="block hover:bg-black/[0.02] transition-colors"
                >
                  {row}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

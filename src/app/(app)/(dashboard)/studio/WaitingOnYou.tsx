"use client";

import { useRouter } from "next/navigation";
import type { UserCard } from "../../../../types/home";
import SharedAvatar from "../../../../components/Avatar";
import {
  friendRequestName,
  type FriendRequest,
} from "../../../../lib/studio/api";

type Props = {
  requests: FriendRequest[];
  unansweredPrompts: UserCard[];
};

// Desktop-only side panel. Aggregates two lists into a single "things
// waiting on you" card:
//   1. Pending friend requests (Waiting for you to accept/decline)
//   2. Prompts someone sent you that you haven't answered yet
// The count badge = sum of both lists. Rendered nowhere on mobile — the
// spec says the panel disappears entirely, no badge substitute.
export default function WaitingOnYou({
  requests,
  unansweredPrompts,
}: Props) {
  const router = useRouter();
  const total = requests.length + unansweredPrompts.length;
  if (total === 0) return null;
  return (
    <section className="bg-[#EDEDED] rounded-[20px] p-[18px]">
      <header className="flex items-center justify-between">
        <h3 className="font-montserrat font-semibold text-primary-blue text-[16px]">
          Waiting on you
        </h3>
        <span className="w-[26px] h-[26px] rounded-full bg-[#D95F3B] border-[2px] border-white text-white flex items-center justify-center font-montserrat font-semibold text-[12px]">
          {total}
        </span>
      </header>

      <ul className="mt-[14px] flex flex-col gap-[6px]">
        {requests.map((req) => {
          const person = req.from || req.sender;
          const name = friendRequestName(req);
          return (
            <li key={`req-${req._id}`}>
              <button
                type="button"
                onClick={() => router.push("/friends-and-family")}
                className="cursor-pointer w-full text-left flex items-center gap-[10px] p-[10px] rounded-[14px] hover:bg-black/[0.03] transition-colors"
              >
                <Avatar src={person?.profilePicture} name={name} />
                <span className="flex-1 min-w-0 font-montserrat text-primary-blue text-[13px] leading-[18px]">
                  You have a pending connection request from{" "}
                  <span className="font-semibold">{name}</span>
                </span>
              </button>
            </li>
          );
        })}

        {unansweredPrompts.map((card) => {
          const senderName =
            card.author?.firstName ||
            (card.shareWith && card.shareWith[0]?.firstName) ||
            "Someone";
          return (
            <li key={`prompt-${card._id}`}>
              <button
                type="button"
                onClick={() =>
                  router.push(`/new-lag?promptId=${encodeURIComponent(card._id)}`)
                }
                className="cursor-pointer w-full text-left flex items-center gap-[10px] p-[10px] rounded-[14px] bg-[#D9D9D9] hover:brightness-95 transition-[filter]"
              >
                <Avatar src={card.author?.profilePicture} name={senderName} />
                <span className="flex-1 min-w-0 font-montserrat text-primary-blue text-[13px] leading-[18px]">
                  <span className="font-semibold">{senderName}</span> sent you a
                  prompt, answer it!
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Avatar({ src, name }: { src?: string | null; name: string }) {
  return (
    <SharedAvatar
      user={{ firstName: name, profilePicture: src ?? null }}
      size={40}
    />
  );
}

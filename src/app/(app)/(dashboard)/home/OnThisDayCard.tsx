"use client";

import Link from "next/link";
import type { RecentStory } from "../../../../lib/home/api";

export default function OnThisDayCard({
  story,
  yearsAgo,
}: {
  story: RecentStory | null;
  yearsAgo: number;
}) {
  if (!story) return null;
  const cover =
    story.coverImage ||
    story.promptCard?.imageUrl ||
    story.latestStory?.media?.[0]?.url ||
    null;
  const title =
    story.promptCard?.title || story.latestStory?.content || "Untitled";
  return (
    <Link
      href={`/thread/${story._id}`}
      className="md:hidden mt-[20px] relative block rounded-[24px] overflow-hidden aspect-[16/10] bg-primary-blue/10"
    >
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0) 100%)",
        }}
      />
      <div className="absolute inset-x-0 top-0 p-[16px] text-white">
        <p className="font-montserrat font-semibold uppercase text-[11px] tracking-[0.08em] opacity-90">
          On This Day {yearsAgo} Year{yearsAgo === 1 ? "" : "s"} Ago
        </p>
        <h3 className="mt-[4px] font-montserrat font-bold text-[20px] leading-[26px] line-clamp-2">
          {title}
        </h3>
      </div>
    </Link>
  );
}

"use client";

import Link from "next/link";
import Avatar from "../../../../components/Avatar";
import type {
  HomeConversationCard,
  HomeConversationsResponse,
} from "../../../../lib/home/api";

// Conversations — up to 2 rows, driven by GET /api/user-card?type=conversation.
// Four row kinds determine the subtitle + destination route:
//   askedYou      → "{name} asked"   → /thread/{card._id}?mode=received
//   sharedStory   → "{name} shared"  → /thread/{storyThread._id}
//   repliedToMine → "{name} replied" → /thread/{storyThread._id}
//   ownStory      → "You wrote"      → /thread/{storyThread._id}
//
// Section HIDES when the user has conversations but the list is empty-but-not-
// cold; a dedicated "cold start" card renders only when the user has never had
// a conversation (conversationSource === "received" but no cards AND no history).

type RowKind = "askedYou" | "sharedStory" | "repliedToMine" | "ownStory";

type Props = {
  data: HomeConversationsResponse | null;
  loading?: boolean;
  currentUserId?: string;
};

function displayName(a: HomeConversationCard["author"]): string {
  if (!a) return "";
  return [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
}

function kindOf(
  card: HomeConversationCard,
  source: HomeConversationsResponse["conversationSource"],
  currentUserId?: string,
): RowKind {
  const isOwnAuthor = currentUserId && card.author?._id === currentUserId;
  if (card.promptType === "own_story" || isOwnAuthor) return "ownStory";
  if (!card.storyThread || !card.storyThread._id) return "askedYou";
  if ((card.storyThread.totalStories ?? 0) === 0) return "askedYou";
  if (source === "own_stories") return "repliedToMine";
  return "sharedStory";
}

function subtitleFor(kind: RowKind, card: HomeConversationCard): string {
  const name = displayName(card.author) || "Someone";
  switch (kind) {
    case "askedYou":
      return `${name} asked`;
    case "sharedStory":
      return `${name} shared`;
    case "repliedToMine":
      return `${name} replied`;
    case "ownStory":
      return "You wrote";
  }
}

function hrefFor(kind: RowKind, card: HomeConversationCard): string {
  if (kind === "askedYou") {
    return `/thread/${card._id}?mode=received`;
  }
  const tid = card.storyThread?._id;
  return tid ? `/thread/${tid}` : `/thread/${card._id}`;
}

function titleOf(card: HomeConversationCard): string {
  return (
    card.title?.trim() ||
    card.content?.trim() ||
    "Untitled"
  );
}

function thumbOf(card: HomeConversationCard): string | null {
  return card.coverImageUrl || card.imageUrl || null;
}

function dateOf(card: HomeConversationCard): string {
  const iso = card.lastActivityAt || card.createdAt;
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-[22px] h-[22px]"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function viewAllHref(source: HomeConversationsResponse["conversationSource"]) {
  return source === "own_stories" ? "/lags" : "/interactions?initial=received";
}

export default function ConversationsList({
  data,
  loading,
  currentUserId,
}: Props) {
  const cards = data?.cards ?? [];
  // Laptop (lg+) shows up to 4 rows; smaller screens hide the 3rd/4th via
  // the Tailwind `hidden lg:block` class on those items.
  const items = cards.slice(0, 4);
  const source = data?.conversationSource ?? "received";
  const showEmpty = !loading && cards.length === 0;

  // When loading with no cached data → skeleton
  if (loading && cards.length === 0) {
    return (
      <section aria-labelledby="home-conversations" className="min-w-0">
        <header className="flex items-end justify-between gap-[12px] pb-[18px] border-b border-black/10">
          <h2
            id="home-conversations"
            className="font-ivy font-normal text-[#2C2C2C] text-[20px] sm:text-[22px] md:text-[24px] leading-[1.1]"
          >
            Conversations
          </h2>
          <span className="font-montserrat text-[#848484] text-[12px] md:text-[13px] whitespace-nowrap">
            View all
          </span>
        </header>
        <ul className="mt-[8px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className={`${i >= 2 ? "hidden sm:flex" : "flex"} items-center gap-[20px] md:gap-[28px] py-[18px] md:py-[22px] border-b last:border-b-0 border-[#C9C9C9]/60`}
            >
              <div className="shrink-0 w-[84px] h-[88px] bg-white shadow-[0_3px_4px_rgba(0,0,0,0.18)] p-[6px]">
                <div className="w-full h-full bg-black/5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 space-y-[10px]">
                <div className="h-[14px] w-[120px] bg-black/5 rounded animate-pulse" />
                <div className="h-[20px] w-[70%] bg-black/5 rounded animate-pulse" />
                <div className="h-[12px] w-[90px] bg-black/5 rounded animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Cold state — render a one-off "No conversations yet" card
  if (showEmpty) {
    return (
      <section aria-labelledby="home-conversations" className="min-w-0">
        <header className="flex items-end justify-between gap-[12px] pb-[18px] border-b border-black/10">
          <h2
            id="home-conversations"
            className="font-ivy font-normal text-[#2C2C2C] text-[20px] sm:text-[22px] md:text-[24px] leading-[1.1]"
          >
            Conversations
          </h2>
        </header>
        <div className="mt-[16px] bg-white rounded-[16px] shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-[24px] py-[36px] md:py-[48px] flex flex-col items-center text-center">
          <h3 className="font-ivy font-normal text-[#2C2C2C] text-[20px] md:text-[22px] leading-[1.2]">
            No conversations yet
          </h3>
          <p className="mt-[8px] font-montserrat text-[#848484] text-[14px] md:text-[15px] max-w-[320px]">
            Send a prompt to someone to start a meaningful conversation.
          </p>
          <div className="mt-[20px] flex items-center gap-[10px]">
            <Link
              href="/new-ask"
              className="inline-flex items-center gap-[8px] bg-primary-orange text-white rounded-full px-[18px] py-[12px] font-montserrat text-[14px] md:text-[15px] hover:opacity-90 transition-opacity"
            >
              Create
            </Link>
            <Link
              href="/connections"
              className="inline-flex items-center gap-[8px] text-[#2C2C2C] rounded-full px-[18px] py-[12px] border border-[#092E4A]/80 font-montserrat text-[14px] md:text-[15px] hover:bg-black/[0.03] transition-colors"
            >
              Add People
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="home-conversations" className="min-w-0">
      <header className="flex items-end justify-between gap-[12px] pb-[18px] border-b border-black/10">
        <h2
          id="home-conversations"
          className="font-ivy font-normal text-[#2C2C2C] text-[20px] sm:text-[22px] md:text-[24px] leading-[1.1]"
        >
          Conversations
        </h2>
        <Link
          href={viewAllHref(source)}
          className="font-montserrat text-[#2C2C2C] text-[12px] md:text-[13px] hover:text-primary-orange whitespace-nowrap transition-colors"
        >
          View all
        </Link>
      </header>

      <ul className="mt-[8px]">
        {items.map((card, i) => {
          const kind = kindOf(card, source, currentUserId);
          const subtitle = subtitleFor(kind, card);
          const isVoice = !!card.voice?.url;
          const thumb = thumbOf(card);
          const date = dateOf(card);
          const isLast = i === items.length - 1;

          // Mobile (<sm) only ever shows the first 2 rows — the narrow
          // phone column makes extra items feel cramped. Tablet + up gets
          // all 4, since the single-column layout has room for them and the
          // laptop 2-col layout keeps them visible too.
          const hideOnSmall = i >= 2;

          return (
            <li key={card._id} className={hideOnSmall ? "hidden sm:block" : ""}>
              <Link
                href={hrefFor(kind, card)}
                className={`group flex items-center gap-[20px] md:gap-[28px] py-[18px] md:py-[22px] hover:opacity-90 transition-opacity ${
                  !isLast ? "border-b border-[#C9C9C9]/60" : ""
                }`}
              >
                <div className="relative shrink-0 w-[84px] h-[88px] md:w-[94px] md:h-[100px] bg-white shadow-[0_3px_4px_rgba(0,0,0,0.18)] p-[6px] overflow-hidden">
                  {thumb ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-black/5" />
                  )}
                  {isVoice && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="w-[32px] h-[32px] rounded-full bg-black/55 text-white flex items-center justify-center">
                        <PlayIcon />
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[10px] text-[12px]">
                    <Avatar
                      user={{
                        firstName: card.author?.firstName || "",
                        profilePicture: card.author?.profilePicture || null,
                      }}
                      size={28}
                      className="shrink-0"
                    />
                    <span className="font-montserrat text-[#848484] truncate">
                      {subtitle}
                    </span>
                  </div>
                  <p className="mt-[4px] font-ivy text-[#232323] text-[14px] sm:text-[15px] md:text-[16px] leading-[1.25] line-clamp-2">
                    {titleOf(card)}
                  </p>
                  {date && (
                    <p className="mt-[3px] font-montserrat text-[#848484] text-[11px] md:text-[12px]">
                      {date}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GroupDetail } from "../../../../lib/connections/api";
import { bustUrl } from "../../../../lib/images";
import type {
  PersonSearchResult,
  PromptSearchResult,
} from "../../../../lib/search/api";
import { SearchIcon } from "../icons";

type Props = {
  query: string;
  loading: boolean;
  hasSearched: boolean;
  hasResults: boolean;
  prompts: PromptSearchResult[];
  people: PersonSearchResult[];
  groups: GroupDetail[];
  emptyHint?: string;
  showPeopleAndGroups?: boolean;
  onNavigate?: () => void;
  variant?: "dropdown" | "page";
};

function promptTitle(p: PromptSearchResult): string {
  const pc = p.promptCard;
  if (pc?.isTitleAvailable && pc.title) return pc.title;
  return (
    pc?.content ||
    pc?.title ||
    p.latestStory?.title ||
    p.title ||
    "Untitled"
  );
}

function promptImage(p: PromptSearchResult): string | null {
  return p.coverImage || p.promptCard?.imageUrl || null;
}

function personName(u: PersonSearchResult): string {
  const first = (u.firstName || "").trim();
  const last = (u.lastName || "").trim();
  const full = `${first} ${last}`.trim();
  return full || u.username || u.epochlagID || "User";
}

function personHandle(u: PersonSearchResult): string | null {
  const handle = u.username || u.epochlagID;
  return handle ? `@${handle}` : null;
}

function initial(name: string): string {
  return (name.charAt(0) || "?").toUpperCase();
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="font-montserrat font-medium text-primary-blue/45 text-[11px] uppercase px-[16px] pt-[16px] pb-[8px]"
      style={{ letterSpacing: "0.8px" }}
    >
      {label}
    </p>
  );
}

function PromptRow({
  p,
  onNavigate,
}: {
  p: PromptSearchResult;
  onNavigate?: () => void;
}) {
  const img = promptImage(p);
  const title = promptTitle(p);
  const router = useRouter();
  const hasThread = (p.totalStories ?? 0) > 0;
  const href = hasThread
    ? `/thread/${p._id}`
    : `/new-story?promptId=${encodeURIComponent(p.promptCard?._id ?? p._id)}`;

  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        router.push(href);
      }}
      className="cursor-pointer w-full flex items-center gap-[12px] px-[16px] py-[10px] hover:bg-black/[0.03] text-left transition-colors"
    >
      <div className="w-[48px] h-[48px] rounded-[10px] overflow-hidden bg-primary-blue/10 shrink-0">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <p className="font-montserrat text-primary-blue text-[14px] leading-[20px] line-clamp-2 flex-1">
        {title}
      </p>
    </button>
  );
}

function PersonRow({
  u,
  onNavigate,
}: {
  u: PersonSearchResult;
  onNavigate?: () => void;
}) {
  const name = personName(u);
  const handle = personHandle(u);
  const pic = u.profilePicture ? bustUrl(u.profilePicture, u.updatedAt) : null;

  return (
    <Link
      href={`/profile/${u._id}`}
      onClick={onNavigate}
      className="w-full flex items-center gap-[12px] px-[16px] py-[10px] hover:bg-black/[0.03] transition-colors"
    >
      <div className="w-[44px] h-[44px] rounded-full overflow-hidden bg-primary-blue/15 shrink-0 flex items-center justify-center">
        {pic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pic} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-montserrat font-semibold text-primary-blue text-[15px]">
            {initial(name)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-montserrat font-medium text-primary-blue text-[14px] truncate">
          {name}
        </p>
        {handle && (
          <p className="font-montserrat text-primary-blue/55 text-[12px] truncate">
            {handle}
          </p>
        )}
      </div>
    </Link>
  );
}

function GroupRow({
  g,
  onNavigate,
}: {
  g: GroupDetail;
  onNavigate?: () => void;
}) {
  const pic = g.groupPhotoUrl || null;
  const count = g.memberCount ?? g.members?.length ?? 0;

  return (
    <Link
      href={`/lags/groups/${g._id}`}
      onClick={onNavigate}
      className="w-full flex items-center gap-[12px] px-[16px] py-[10px] hover:bg-black/[0.03] transition-colors"
    >
      <div className="w-[44px] h-[44px] rounded-full overflow-hidden bg-primary-blue/10 shrink-0">
        {pic && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pic} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-montserrat font-medium text-primary-blue text-[14px] truncate">
          {g.name}
        </p>
        <p className="font-montserrat text-primary-blue/55 text-[12px] truncate">
          {count} {count === 1 ? "member" : "members"}
        </p>
      </div>
    </Link>
  );
}

export default function SearchResults({
  query,
  loading,
  hasSearched,
  hasResults,
  prompts,
  people,
  groups,
  emptyHint = "Search for prompts and people",
  showPeopleAndGroups = true,
  onNavigate,
  variant = "page",
}: Props) {
  const isDropdown = variant === "dropdown";
  const trimmed = query.trim();

  if (!trimmed) {
    if (isDropdown) return null;
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-[#092E4A]">
        <SearchIcon width={48} height={48} />
        <p className="mt-[16px] font-montserrat text-[14px]">{emptyHint}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-[40px]">
        <div className="w-[24px] h-[24px] rounded-full border-2 border-primary-blue/20 border-t-primary-blue animate-spin" />
      </div>
    );
  }

  if (hasSearched && !hasResults) {
    return (
      <div className="py-[40px] text-center">
        <p className="font-montserrat text-primary-blue/50 text-[14px]">
          No results for &ldquo;{trimmed}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {prompts.length > 0 && (
        <div>
          <SectionHeader label="Prompts" />
          {prompts.map((p) => (
            <PromptRow key={p._id} p={p} onNavigate={onNavigate} />
          ))}
        </div>
      )}
      {showPeopleAndGroups && people.length > 0 && (
        <div>
          <SectionHeader label="People" />
          {people.map((u) => (
            <PersonRow key={u._id} u={u} onNavigate={onNavigate} />
          ))}
        </div>
      )}
      {showPeopleAndGroups && groups.length > 0 && (
        <div>
          <SectionHeader label="Groups" />
          {groups.map((g) => (
            <GroupRow key={g._id} g={g} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bustUrl } from "../../../../../lib/images";
import { fetchHomePeople } from "../../../../../lib/home/api";
import {
  fetchStoriesFilters,
  personStoryCount,
  type FilterPerson,
} from "../../../../../lib/library/api";
import type { GroupSummary } from "../../../../../types/home";
import { PlusIcon, SearchIcon } from "../../icons";
import GroupAvatarStack from "../GroupAvatarStack";
import { useSelectMode } from "../selectMode";

// Module-scoped caches so re-visiting the tab renders instantly.
let groupsCache: GroupSummary[] | null = null;
let peopleCache: FilterPerson[] | null = null;

const norm = (s: string | null | undefined) =>
  String(s || "").trim().toLowerCase();

function personDisplayName(p: FilterPerson): string {
  const full = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return full || p.epochlagID || "Friend";
}

function personInitial(p: FilterPerson): string {
  const first = (p.firstName ?? "").trim();
  return first.charAt(0).toUpperCase() || "?";
}

export default function LagsPeoplePage() {
  const router = useRouter();
  const { setHeaderRight } = useSelectMode();
  const [groups, setGroups] = useState<GroupSummary[] | null>(groupsCache);
  const [people, setPeople] = useState<FilterPerson[] | null>(peopleCache);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Registers the tab's header actions: search icon (mobile heading
  // row only, per Figma) + Select. LagsHeading renders headerRight on
  // mobile; LagsTabs renders it on desktop.
  useEffect(() => {
    setHeaderRight(
      <>
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label={searchOpen ? "Close search" : "Search"}
          className="cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue hover:bg-black/[0.05] flex items-center justify-center transition-colors"
        >
          <SearchIcon width={18} height={18} />
        </button>
        <button
          type="button"
          className="cursor-pointer font-montserrat text-black text-[14px] hover:opacity-80 transition-opacity"
        >
          Select
        </button>
      </>
    );
    return () => setHeaderRight(null);
  }, [searchOpen, setHeaderRight]);

  // Reset search when it's closed so re-opening starts fresh.
  useEffect(() => {
    if (!searchOpen) setQuery("");
  }, [searchOpen]);
  useEffect(() => {
    let cancelled = false;
    const needGroups = groupsCache === null;
    const needPeople = peopleCache === null;
    if (!needGroups && !needPeople) return;
    Promise.allSettled([
      needGroups ? fetchHomePeople() : Promise.resolve(null),
      needPeople ? fetchStoriesFilters() : Promise.resolve(null),
    ]).then(([g, f]) => {
      if (cancelled) return;
      if (g.status === "fulfilled" && g.value) {
        groupsCache = g.value.groups ?? [];
        setGroups(groupsCache);
      } else if (g.status === "rejected") {
        setError(
          g.reason instanceof Error ? g.reason.message : "Couldn't load groups"
        );
      }
      if (f.status === "fulfilled" && f.value) {
        peopleCache = f.value.people ?? [];
        setPeople(peopleCache);
      } else if (f.status === "rejected" && !error) {
        setError(
          f.reason instanceof Error ? f.reason.message : "Couldn't load people"
        );
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = norm(query);
  const searching = searchOpen && q.length > 0;

  const visibleGroups = useMemo(() => {
    const list = groups ?? [];
    const filtered = searching
      ? list.filter((g) => norm(g.name).includes(q))
      : list;
    return [...filtered].sort((a, b) =>
      norm(a.name).localeCompare(norm(b.name))
    );
  }, [groups, searching, q]);

  const visiblePeople = useMemo(() => {
    const list = people ?? [];
    const filtered = searching
      ? list.filter((p) => norm(personDisplayName(p)).includes(q))
      : list;
    return [...filtered].sort((a, b) =>
      norm(personDisplayName(a)).localeCompare(norm(personDisplayName(b)))
    );
  }, [people, searching, q]);

  const loading = groups === null || people === null;
  const hasGroups = (groups?.length ?? 0) > 0;
  const hasPeople = (people?.length ?? 0) > 0;
  const totallyEmpty = !loading && !hasGroups && !hasPeople;

  if (error && !hasGroups && !hasPeople) {
    return (
      <div className="pt-[24px]">
        <p className="font-montserrat text-primary-orange text-[14px]">
          {error}
        </p>
      </div>
    );
  }

  if (totallyEmpty) {
    return (
      <div className="flex flex-col items-center justify-center pt-[80px] px-[24px] text-center">
        <p className="font-montserrat text-primary-blue/60 text-[15px] leading-[22px] max-w-[360px]">
          Sync contacts or invite your friends to join Epoch Lag.
        </p>
        <button
          type="button"
          onClick={() => router.push("/friends-and-family")}
          className="mt-[20px] inline-flex items-center gap-[6px] bg-primary-orange text-white font-montserrat font-semibold text-[13px] px-[18px] py-[10px] rounded-full hover:opacity-90 transition-opacity cursor-pointer"
        >
          <PlusIcon width={14} height={14} />
          Invite friends
        </button>
      </div>
    );
  }

  return (
    <div className="pt-[16px] pb-[40px] overflow-y-auto scrollbar-hide h-full min-h-0">
      {searchOpen && (
        <div className="flex items-center gap-[10px] bg-[#f0f0f0] rounded-full px-[14px] py-[8px] mb-[16px] max-w-[420px]">
          <SearchIcon width={14} height={14} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups and people"
            autoFocus
            className="flex-1 bg-transparent border-0 outline-none font-montserrat text-primary-blue text-[14px] placeholder:text-primary-blue/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="cursor-pointer text-primary-blue/60 hover:text-primary-blue"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-[8px] md:gap-[12px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#f0f0f0] rounded-[12px] h-[130px] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {visibleGroups.length > 0 && (
            <section className="mb-[24px]">
              <h3 className="font-montserrat font-bold text-primary-blue text-[15px] mb-[10px]">
                Groups
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-[8px] md:gap-[12px]">
                {visibleGroups.map((g) => (
                  <Link
                    key={g._id}
                    href={`/lags/groups/${g._id}`}
                    className="flex flex-col items-center bg-[#f0f0f0] rounded-[12px] px-[6px] py-[20px] text-center hover:bg-black/[0.08] transition-colors cursor-pointer"
                  >
                    <GroupAvatarStack group={g} size={52} />
                    <div className="mt-[10px] font-montserrat font-medium text-primary-blue text-[13px] leading-tight line-clamp-2 px-[4px]">
                      {g.name || "Group"}
                    </div>
                    {g.memberCount > 0 && (
                      <div className="mt-[2px] font-montserrat text-primary-blue/50 text-[11px]">
                        {g.memberCount}{" "}
                        {g.memberCount === 1 ? "member" : "members"}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {visiblePeople.length > 0 && (
            <section>
              <h3 className="font-montserrat font-bold text-primary-blue text-[15px] mb-[10px]">
                People
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-[8px] md:gap-[12px]">
                {visiblePeople.map((p) => {
                  const name = personDisplayName(p);
                  const count = personStoryCount(p);
                  return (
                    <Link
                      key={p._id}
                      href={`/lags/people/${p._id}`}
                      className="flex flex-col items-center bg-[#f0f0f0] rounded-[12px] px-[6px] py-[20px] text-center hover:bg-black/[0.08] transition-colors cursor-pointer"
                    >
                      {p.profilePicture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bustUrl(p.profilePicture, undefined) ?? undefined}
                          alt=""
                          className="w-[52px] h-[52px] rounded-full object-cover bg-[#C8D1DA]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-[52px] h-[52px] rounded-full bg-[#C8D1DA] flex items-center justify-center font-montserrat font-bold text-white text-[20px]">
                          {personInitial(p)}
                        </div>
                      )}
                      <div className="mt-[10px] font-montserrat font-medium text-primary-blue text-[13px] leading-tight line-clamp-1 px-[4px]">
                        {name}
                      </div>
                      {typeof count === "number" && count > 0 && (
                        <div className="mt-[2px] font-montserrat text-primary-blue/50 text-[11px]">
                          {count} {count === 1 ? "Story" : "Stories"}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

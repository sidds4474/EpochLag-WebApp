"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ChevronRightIcon, PlusIcon, SearchIcon } from "../../icons";
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
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Focus the input when the pill expands. autoFocus only fires on mount,
  // so we do it imperatively on each open.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Registers the tab's header actions: an inline search pill that morphs
  // between a 36px icon button (closed) and a 280px input row (open). Width
  // transitions smoothly because the input stays mounted in both states.
  useEffect(() => {
    setHeaderRight(
      <div
        className={`flex items-center rounded-full overflow-hidden transition-[width,background-color] duration-300 ease-out ${
          searchOpen
            ? "w-[200px] md:w-[280px] bg-[#f0f0f0] pl-[14px] pr-[4px] gap-[8px]"
            : "w-[36px] bg-transparent hover:bg-black/[0.05]"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (!searchOpen) setSearchOpen(true);
          }}
          aria-label="Search"
          tabIndex={searchOpen ? -1 : 0}
          className={`shrink-0 flex items-center justify-center text-primary-blue ${
            searchOpen ? "w-[18px] h-[36px] cursor-default" : "w-[36px] h-[36px] cursor-pointer"
          }`}
        >
          <SearchIcon width={18} height={18} />
        </button>
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search groups and people"
          tabIndex={searchOpen ? 0 : -1}
          className={`flex-1 min-w-0 bg-transparent border-0 outline-none font-montserrat text-primary-blue text-[14px] placeholder:text-primary-blue/40 transition-opacity duration-200 ${
            searchOpen ? "opacity-100 delay-100" : "opacity-0"
          }`}
        />
        {searchOpen && (
          <button
            type="button"
            onClick={() => {
              if (query) setQuery("");
              else setSearchOpen(false);
            }}
            aria-label={query ? "Clear search" : "Close search"}
            className="shrink-0 cursor-pointer w-[28px] h-[28px] rounded-full flex items-center justify-center text-primary-blue/60 hover:text-primary-blue"
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
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
    );
    return () => setHeaderRight(null);
  }, [searchOpen, query, setHeaderRight]);

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
    // Match groups by name OR by any member's name/epochlagID — so typing a
    // friend's name surfaces the groups they belong to.
    const filtered = searching
      ? list.filter((g) => {
          if (norm(g.name).includes(q)) return true;
          return (g.members ?? []).some((m) => {
            const full = `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim();
            return (
              norm(full).includes(q) ||
              norm(m.firstName).includes(q) ||
              norm(m.lastName).includes(q) ||
              norm(m.epochlagID).includes(q)
            );
          });
        })
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
    <div className="pt-[8px] pb-[40px] overflow-y-auto scrollbar-hide h-full min-h-0">
      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-[10px] md:gap-[12px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[12px] h-[160px] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-[16px] lg:gap-[20px]">
          {/* People grid */}
          <div className="flex-1 min-w-0">
            {visiblePeople.length > 0 && (
              <div className="grid grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4 gap-[10px] md:gap-[12px]">
                {visiblePeople.map((p) => {
                  const name = personDisplayName(p);
                  const count = personStoryCount(p);
                  return (
                    <Link
                      key={p._id}
                      href={`/lags/people/${p._id}`}
                      className="flex flex-col items-center justify-center gap-[6px] bg-white rounded-[12px] px-[12px] py-[18px] text-center hover:bg-black/[0.02] transition-colors cursor-pointer"
                    >
                      {p.profilePicture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bustUrl(p.profilePicture, undefined) ?? undefined}
                          alt=""
                          className="w-[64px] h-[64px] md:w-[70px] md:h-[70px] rounded-full object-cover bg-[#C8D1DA]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-[64px] h-[64px] md:w-[70px] md:h-[70px] rounded-full bg-[#C8D1DA] flex items-center justify-center font-montserrat font-bold text-white text-[22px]">
                          {personInitial(p)}
                        </div>
                      )}
                      <div className="mt-[4px] font-montserrat font-normal text-[#232323] text-[15px] md:text-[16px] leading-tight line-clamp-1 px-[2px]">
                        {name}
                      </div>
                      {typeof count === "number" && count > 0 && (
                        <div className="font-montserrat font-medium text-[#A5A5A5] text-[12px] md:text-[13px]">
                          {count} {count === 1 ? "Story" : "Stories"}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Groups — right panel on desktop, below the grid on mobile */}
          {visibleGroups.length > 0 && (
            <aside className="lg:w-[340px] xl:w-[370px] shrink-0">
              <div className="bg-[#E6E3D9] rounded-[16px] px-[20px] py-[18px]">
                <h3 className="font-ivy font-normal text-[#232323] text-[22px] md:text-[24px] mb-[4px]">
                  Groups
                </h3>
                <div className="flex flex-col">
                  {visibleGroups.map((g) => {
                    const members = g.members ?? [];
                    const shown = members.slice(0, 2);
                    const extra = Math.max(0, (g.memberCount ?? members.length) - shown.length);
                    return (
                      <Link
                        key={g._id}
                        href={`/lags/groups/${g._id}`}
                        className="flex items-center gap-[12px] py-[14px] border-b border-black/10 last:border-b-0 hover:opacity-80 transition-opacity"
                      >
                        <div className="shrink-0 flex items-center">
                          {shown.map((m, i) => (
                            <div
                              key={m._id ?? i}
                              style={{ marginLeft: i === 0 ? 0 : -14 }}
                              className="w-[42px] h-[42px] rounded-full border-[2.5px] border-white overflow-hidden bg-[#C8D1DA] shrink-0"
                            >
                              {m.profilePicture ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={bustUrl(m.profilePicture, undefined) ?? undefined}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-montserrat font-bold text-white text-[13px]">
                                  {(m.firstName ?? "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          ))}
                          {extra > 0 && (
                            <div
                              style={{ marginLeft: shown.length === 0 ? 0 : -14 }}
                              className="w-[28px] h-[28px] rounded-full border-[2.5px] border-white bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] flex items-center justify-center font-montserrat font-semibold text-[#2c2c2c] text-[11px] shrink-0"
                            >
                              +{extra}
                            </div>
                          )}
                          {shown.length === 0 && extra === 0 && (
                            <GroupAvatarStack group={g} size={42} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-montserrat font-medium text-[#232323] text-[16px] leading-tight truncate">
                            {g.name || "Group"}
                          </p>
                          <p className="font-montserrat font-medium text-[#848484] text-[12px] mt-[2px]">
                            {g.memberCount}{" "}
                            {g.memberCount === 1 ? "person" : "people"}
                          </p>
                        </div>
                        <ChevronRightIcon
                          width={14}
                          height={14}
                          className="shrink-0 text-[#848484]"
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

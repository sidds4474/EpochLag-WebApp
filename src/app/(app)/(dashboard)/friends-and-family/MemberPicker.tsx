"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { CloseIcon, SearchIcon } from "../icons";
import SharedAvatar from "../../../../components/Avatar";
import { searchUsers } from "../../../../lib/connections/api";
import type { UserSearchResult } from "../../../../lib/connections/api";
import type { PersonSummary } from "../../../../types/home";

type PickerUser = {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
  updatedAt?: string;
  epochlagID?: string;
};

type Props = {
  suggested: PersonSummary[];
  selected: PickerUser[];
  onChange: (next: PickerUser[]) => void;
  excludeIds?: string[];
  loading?: boolean;
};


export default function MemberPicker({
  suggested,
  selected,
  onChange,
  excludeIds = [],
  loading = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await searchUsers(q);
        setResults(list);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Search failed";
        toast.error(msg);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s._id)),
    [selected]
  );
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const listUsers: PickerUser[] = useMemo(() => {
    if (query.trim()) {
      return results
        .filter((u) => !excludeSet.has(u._id))
        .map((u) => ({
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          profilePicture: u.profilePicture ?? null,
          updatedAt: u.updatedAt,
          epochlagID: u.epochlagID,
        }));
    }
    return suggested
      .filter((u) => !excludeSet.has(u._id))
      .map((u) => ({
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        profilePicture: u.profilePicture ?? null,
        epochlagID: u.epochlagID,
      }));
  }, [query, results, suggested, excludeSet]);

  function toggle(u: PickerUser) {
    if (selectedIds.has(u._id)) {
      onChange(selected.filter((s) => s._id !== u._id));
    } else {
      onChange([...selected, u]);
    }
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full bg-[#ededed] rounded-full h-[44px] pl-[16px] pr-[44px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/50 outline-none"
        />
        <SearchIcon
          width={18}
          height={18}
          className="absolute right-[14px] top-1/2 -translate-y-1/2 text-primary-blue/50"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-[8px]">
          {selected.map((u) => (
            <span
              key={u._id}
              className="bg-[#F3EFE9] rounded-full h-[32px] pl-[4px] pr-[8px] flex items-center gap-[6px]"
            >
              <SharedAvatar
                user={{
                  firstName: u.firstName,
                  profilePicture: u.profilePicture,
                  updatedAt: u.updatedAt,
                }}
                size={24}
              />
              <span className="font-montserrat text-primary-blue text-[13px] font-semibold">
                {u.firstName ?? ""}
              </span>
              <button
                type="button"
                onClick={() => toggle(u)}
                aria-label={`Remove ${u.firstName ?? "user"}`}
                className="cursor-pointer text-primary-blue/60 hover:text-primary-blue"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-[8px]">
        <p className="font-montserrat font-semibold text-primary-blue/70 text-[13px]">
          {query.trim() ? "Results" : "Suggested"}
        </p>
        {searching && (
          <p className="font-montserrat text-primary-blue/50 text-[13px]">
            Searching…
          </p>
        )}
        {loading && !query.trim() && (
          <div className="flex flex-col gap-[8px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-[12px] p-[10px] rounded-[12px]"
              >
                <div className="w-[40px] h-[40px] rounded-full bg-[#f3f3f3] animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-[6px]">
                  <div className="h-[12px] w-[45%] bg-[#f3f3f3] animate-pulse rounded" />
                  <div className="h-[10px] w-[30%] bg-[#f3f3f3] animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && !searching && listUsers.length === 0 && (
          <p className="font-montserrat text-primary-blue/50 text-[13px]">
            {query.trim() ? "No matches" : "No connections yet"}
          </p>
        )}
        {(!loading || query.trim()) && listUsers.map((u) => {
          const active = selectedIds.has(u._id);
          return (
            <button
              type="button"
              key={u._id}
              onClick={() => toggle(u)}
              className="cursor-pointer flex items-center gap-[12px] p-[10px] rounded-[12px] hover:bg-black/[0.03] transition text-left"
            >
              <SharedAvatar
                user={{
                  firstName: u.firstName,
                  profilePicture: u.profilePicture,
                  updatedAt: u.updatedAt,
                }}
                size={40}
              />
              <div className="flex-1 min-w-0">
                <p className="font-montserrat font-semibold text-primary-blue text-[14px] truncate">
                  {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    "Unknown"}
                </p>
                {u.epochlagID ? (
                  <p className="font-montserrat text-primary-blue/50 text-[12px] truncate">
                    @{u.epochlagID}
                  </p>
                ) : null}
              </div>
              <span
                className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 ${
                  active
                    ? "bg-primary-orange border-primary-orange text-white"
                    : "border-primary-blue/30"
                }`}
              >
                {active ? (
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

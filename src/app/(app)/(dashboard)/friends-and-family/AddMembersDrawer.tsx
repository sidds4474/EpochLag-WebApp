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
  open: boolean;
  onClose: () => void;
  suggested: PersonSummary[];
  excludeIds?: string[];
  onAdd: (picked: PickerUser[]) => Promise<void> | void;
  busy?: boolean;
};


export default function AddMembersDrawer({
  open,
  onClose,
  suggested,
  excludeIds = [],
  onAdd,
  busy = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickerUser[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setPicked([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

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
    () => new Set(picked.map((s) => s._id)),
    [picked]
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
      setPicked((prev) => prev.filter((s) => s._id !== u._id));
    } else {
      setPicked((prev) => [...prev, u]);
    }
  }

  const summary = picked
    .map((p) => p.firstName ?? "")
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={`fixed inset-0 z-[50] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => (!busy ? onClose() : null)}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[440px] md:w-[460px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Add members"
      >
        <div className="flex items-start justify-end px-[24px] pt-[24px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={busy}
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center hover:brightness-95 transition disabled:opacity-50"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>
        <div className="px-[24px] pt-[8px]">
          <h2 className="font-montserrat font-bold text-primary-blue text-[22px] leading-tight">
            Add Members
          </h2>
        </div>

        <div className="px-[24px] pt-[16px]">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-[#EDEDED] rounded-full h-[44px] pl-[16px] pr-[44px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/50 outline-none"
            />
            <SearchIcon
              width={18}
              height={18}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-primary-blue/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-[24px] pt-[16px] pb-[16px]">
          <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[8px]">
            {query.trim() ? "Results" : "Suggested"}
          </p>
          {searching && (
            <p className="font-montserrat text-primary-blue/50 text-[13px]">
              Searching…
            </p>
          )}
          {!searching && listUsers.length === 0 && (
            <p className="font-montserrat text-primary-blue/50 text-[13px]">
              {query.trim() ? "No matches" : "No connections yet"}
            </p>
          )}
          <div className="flex flex-col">
            {listUsers.map((u) => {
              const active = selectedIds.has(u._id);
              return (
                <button
                  type="button"
                  key={u._id}
                  onClick={() => toggle(u)}
                  className="cursor-pointer flex items-center gap-[12px] py-[10px] rounded-[10px] hover:bg-black/[0.03] transition text-left"
                >
                  <SharedAvatar
                    user={{
                      firstName: u.firstName,
                      profilePicture: u.profilePicture,
                      updatedAt: u.updatedAt,
                    }}
                    size={40}
                  />
                  <span className="flex-1 font-montserrat font-semibold text-primary-blue text-[15px] truncate">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") ||
                      "Unknown"}
                  </span>
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

        <div className="px-[16px] pb-[24px] pt-[8px]">
          <div className="flex items-center bg-white rounded-full h-[52px] pl-[18px] pr-[6px] gap-[10px] shadow-[0_0_23.2px_0_rgba(0,0,0,0.15)]">
            <span className="flex-1 min-w-0 truncate font-montserrat text-primary-blue/70 text-[14px]">
              {summary || "Select connections"}
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await onAdd(picked);
                  setPicked([]);
                  onClose();
                } catch {
                  /* parent handles error toast; leave drawer open */
                }
              }}
              disabled={picked.length === 0 || busy}
              className="cursor-pointer bg-primary-orange text-white rounded-full h-[40px] px-[24px] font-montserrat font-semibold text-[14px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {busy ? "…" : "Add"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

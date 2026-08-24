"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { CloseIcon, SearchIcon } from "../icons";
import { bustUrl } from "../../../../lib/images";
import { createGroup, searchUsers } from "../../../../lib/connections/api";
import type { UserSearchResult } from "../../../../lib/connections/api";
import { fetchHomePeople } from "../../../../lib/home/api";
import type { GroupSummary, PersonSummary } from "../../../../types/home";

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
  onCreated: (group: GroupSummary) => void;
};

function initial(first?: string | null) {
  return first?.[0]?.toUpperCase() ?? "?";
}

function Avatar({
  url,
  first,
  size = 40,
}: {
  url: string | null;
  first?: string | null;
  size?: number;
}) {
  return (
    <div
      className="rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{initial(first)}</span>
      )}
    </div>
  );
}

export default function CreateGroupDrawer({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [suggested, setSuggested] = useState<PersonSummary[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickerUser[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setQuery("");
      setResults([]);
      setPicked([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggested(true);
    (async () => {
      try {
        const data = await fetchHomePeople();
        if (!cancelled) setSuggested(data?.users ?? []);
      } catch {
        // silent — search still works
      } finally {
        if (!cancelled) setLoadingSuggested(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

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

  const listUsers: PickerUser[] = useMemo(() => {
    if (query.trim()) {
      return results.map((u) => ({
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        profilePicture: u.profilePicture ?? null,
        updatedAt: u.updatedAt,
        epochlagID: u.epochlagID,
      }));
    }
    return suggested.map((u) => ({
      _id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      profilePicture: u.profilePicture ?? null,
      epochlagID: u.epochlagID,
    }));
  }, [query, results, suggested]);

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

  const canSubmit =
    name.trim().length > 0 && picked.length > 0 && !submitting;

  async function handleCreate() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const memberIds = picked
        .map((p) => p.epochlagID || p._id)
        .filter((v): v is string => !!v);
      const created = await createGroup({
        name: name.trim(),
        memberIds,
        file: null,
      });
      toast.success("Group created");
      const summaryGroup: GroupSummary = {
        _id: created._id,
        name: created.name,
        groupPhotoUrl: created.groupPhotoUrl ?? null,
        memberCount: created.memberCount ?? picked.length,
        newStory: false,
        members: picked.map((p) => ({
          _id: p._id,
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          profilePicture: p.profilePicture ?? null,
          epochlagID: p.epochlagID,
          isOwner: false,
          joinedAt: new Date().toISOString(),
        })),
      };
      onCreated(summaryGroup);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create group";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[50] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => (!submitting ? onClose() : null)}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[440px] md:w-[460px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Create group"
      >
        <div className="flex items-start justify-end px-[24px] pt-[24px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#EDEDED] text-primary-blue flex items-center justify-center hover:brightness-95 transition disabled:opacity-50"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <div className="px-[24px] pt-[8px]">
          <h2 className="font-montserrat font-bold text-primary-blue text-[22px] leading-tight">
            Create Group
          </h2>
        </div>

        <div className="px-[24px] pt-[16px]">
          <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[6px]">
            Group Name
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            placeholder="name"
            className="w-full bg-[#EDEDED] rounded-full h-[44px] px-[16px] font-montserrat text-[14px] text-primary-blue placeholder:text-primary-blue/50 outline-none"
          />
        </div>

        <div className="px-[24px] pt-[16px]">
          <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[6px]">
            Add connections
          </p>
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
          {loadingSuggested && !query.trim() && (
            <div className="flex flex-col gap-[8px]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-[12px] py-[10px]"
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
          {!loadingSuggested && !searching && listUsers.length === 0 && (
            <p className="font-montserrat text-primary-blue/50 text-[13px]">
              {query.trim() ? "No matches" : "No connections yet"}
            </p>
          )}
          {(!loadingSuggested || query.trim()) && (
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
                    <Avatar
                      url={bustUrl(u.profilePicture ?? null, u.updatedAt)}
                      first={u.firstName}
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
          )}
        </div>

        <div className="px-[16px] pb-[24px] pt-[8px]">
          <div className="flex items-center bg-white rounded-full h-[52px] pl-[18px] pr-[6px] gap-[10px] shadow-[0_0_23.2px_0_rgba(0,0,0,0.15)]">
            <span className="flex-1 min-w-0 truncate font-montserrat text-primary-blue/70 text-[14px]">
              {summary || "Select connections"}
            </span>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canSubmit}
              className="cursor-pointer bg-primary-orange text-white rounded-full h-[40px] px-[20px] font-montserrat font-semibold text-[14px] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {submitting ? "…" : "Create Group"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

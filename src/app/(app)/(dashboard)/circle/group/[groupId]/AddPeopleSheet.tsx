"use client";

// Add People — right-side sheet for adding members to an existing group.
// Reuses the fetchFriends list, filters out people already in the group,
// lets the user multi-select, and submits via addUsersToGroup.

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import Avatar from "../../../../../../components/Avatar";
import { CloseIcon } from "../../../icons";
import { ApiError } from "../../../../../../lib/api/client";
import { fetchFriends } from "../../../../../../lib/home/api";
import { addUsersToGroup } from "../../../../../../lib/connections/api";
import type {
  CircleGroupMember,
} from "../../../../../../lib/circle/api";
import type { PersonSummary } from "../../../../../../types/home";

type Props = {
  open: boolean;
  groupId: string;
  existingMemberIds: Set<string>;
  onClose: () => void;
  onAdded: (added: CircleGroupMember[]) => void;
};

export default function AddPeopleSheet({
  open,
  groupId,
  existingMemberIds,
  onClose,
  onAdded,
}: Props) {
  const [friends, setFriends] = useState<PersonSummary[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Map<string, PersonSummary>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Reset state each open so a stale selection from last time doesn't leak.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchFriends()
      .then((list) => {
        if (cancelled) return;
        setFriends(list as PersonSummary[]);
      })
      .catch(() => {
        if (!cancelled) setFriends([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, busy]);

  const addable = useMemo(
    () => friends.filter((f) => !existingMemberIds.has(f._id)),
    [friends, existingMemberIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return addable;
    return addable.filter((p) => {
      const full = [p.firstName, p.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return full.includes(q);
    });
  }, [addable, query]);

  function toggle(p: PersonSummary) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(p._id)) next.delete(p._id);
      else next.set(p._id, p);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      const picked = Array.from(selected.values());
      // BE's addUsersToGroup expects epochlagIDs, not Mongo _ids. Skip any
      // user that's missing one (shouldn't happen for friends, but guards
      // against a malformed payload).
      const epochlagIDs = picked
        .map((p) => p.epochlagID)
        .filter((id): id is string => !!id);
      if (epochlagIDs.length === 0) {
        throw new Error("No valid Epoch Lag IDs to add");
      }
      await addUsersToGroup(groupId, epochlagIDs);
      toast.success("Members Added");
      onAdded(
        picked.map((p) => ({
          _id: p._id,
          firstName: p.firstName,
          lastName: p.lastName,
          profilePicture: p.profilePicture ?? null,
          epochlagID: p.epochlagID,
        })),
      );
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.message
          ? err.message
          : "Couldn't add members",
      );
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex justify-end"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[480px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
      >
        <header className="flex items-center justify-between px-[24px] pt-[24px] pb-[16px]">
          <h2 className="font-ivy text-[#2C2C2C] text-[22px]">Add People</h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <div className="px-[24px] pb-[12px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search People"
            className="w-full bg-white border border-black/10 rounded-full px-[16px] py-[12px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px]">
          {loading ? (
            <div className="flex items-center justify-center py-[32px]">
              <div className="w-[22px] h-[22px] border-[2.5px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-[24px] font-montserrat text-[#848484] text-[14px] text-center">
              {query.trim()
                ? "No matching people."
                : "Everyone in your circle is already in this group."}
            </p>
          ) : (
            <ul>
              {filtered.map((p) => {
                const checked = selected.has(p._id);
                const name =
                  [p.firstName, p.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || "Someone";
                return (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      className="w-full flex items-center gap-[12px] py-[12px] text-left hover:bg-black/[0.02] border-b last:border-b-0 border-[#C9C9C9]/40"
                    >
                      <Avatar
                        user={{
                          firstName: p.firstName,
                          profilePicture: p.profilePicture ?? null,
                        }}
                        size={44}
                        className="shrink-0"
                      />
                      <div className="flex-1 min-w-0 leading-tight">
                        <p className="font-ivy text-[#2C2C2C] text-[15px] truncate">
                          {name}
                        </p>
                        {p.epochlagID && (
                          <p className="font-montserrat text-[#848484] text-[12px] truncate">
                            {p.epochlagID}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center border-[1.5px] ${
                          checked
                            ? "bg-primary-orange border-primary-orange text-white"
                            : "border-black/20"
                        }`}
                      >
                        {checked && (
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 12l5 5 9-11"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-black/5 px-[24px] py-[16px]">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected.size === 0 || busy}
            className="w-full bg-primary-orange text-white rounded-full py-[12px] font-montserrat font-semibold text-[14px] hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {busy
              ? "Adding…"
              : selected.size > 0
                ? `Add ${selected.size} ${selected.size === 1 ? "person" : "people"}`
                : "Add People"}
          </button>
        </div>
      </div>
    </div>
  );
}

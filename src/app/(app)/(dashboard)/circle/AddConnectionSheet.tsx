"use client";

// Add Connection — right-side drawer triggered by the center "+" on the
// Relationship ring view. Search pattern mirrors the Studio CoverPickerModal
// shell.
//
// v1 scope:
//   - Search /api/users/search with 300ms debounce
//   - Per-row button states: Add / Request Sent / Connected
//   - "Add" → POST /api/friend-requests/:userId; silently idempotent on
//     "already sent" / "already exists" errors
//   - Invite CTA at bottom → routes to the existing /invite flow
//   - "People you may know" browse mode deferred (mobile derives from Redux;
//     we don't have that here yet)

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import Avatar from "../../../../components/Avatar";
import {
  sendFriendRequest,
} from "../../../../lib/connections/api";
import {
  searchUsers,
  normalizeQuery,
  type PersonSearchResult,
} from "../../../../lib/search/api";
import { CloseIcon } from "../icons";

type Props = {
  open: boolean;
  onClose: () => void;
};

// BE sometimes includes isFriend on the search result; track it inline.
type DecoratedResult = PersonSearchResult & { isFriend?: boolean };

export default function AddConnectionSheet({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DecoratedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on close so reopening starts fresh (less confusing than carrying
  // a stale query across sessions).
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  // Lock scroll + ESC-to-close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Debounced search — 300ms matches mobile.
  useEffect(() => {
    if (!open) return;
    const q = normalizeQuery(query);
    if (!q) {
      setResults([]);
      setLoading(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchUsers(q)
        .then((list) => {
          setResults(list as DecoratedResult[]);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const handleAdd = useCallback(
    async (userId: string) => {
      if (pendingUserId) return;
      setPendingUserId(userId);
      // Optimistic flip to "Request Sent".
      setRequestedIds((prev) => new Set(prev).add(userId));
      try {
        await sendFriendRequest(userId);
        toast.success("Request Sent");
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message?.toLowerCase() || "" : "";
        // BE returns an error message when a request already exists — treat
        // it as success and leave the row as "Request Sent".
        if (message.includes("already sent") || message.includes("already exists")) {
          toast.success("Request Sent");
        } else {
          // Rollback and surface the real error.
          setRequestedIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
          toast.error(
            err instanceof ApiError && err.message
              ? err.message
              : "Unable to Send Request",
          );
        }
      } finally {
        setPendingUserId(null);
      }
    },
    [pendingUserId],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex justify-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[480px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
      >
        <header className="flex items-center justify-between px-[24px] pt-[24px] pb-[16px]">
          <h2 className="font-ivy text-[#2C2C2C] text-[22px]">
            Add Connection
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <div className="px-[24px] pb-[16px]">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search an Epoch Lag user"
              className="w-full bg-white border border-black/10 rounded-full pl-[40px] pr-[16px] py-[12px] font-montserrat text-[14px] text-[#2C2C2C] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/30"
              autoFocus
            />
            <svg
              className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#848484]"
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
              <path
                d="M20 20l-3-3"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px]">
          {query.trim() === "" && !loading ? (
            <div className="mt-[48px] flex flex-col items-center text-center px-[16px]">
              <span className="w-[48px] h-[48px] rounded-full bg-[#F3F1EB] text-[#848484] flex items-center justify-center mb-[12px]">
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx={11} cy={11} r={7} stroke="currentColor" strokeWidth={2} />
                  <path
                    d="M20 20l-3-3"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <p className="font-montserrat text-[#848484] text-[14px]">
                Look up someone to connect
              </p>
            </div>
          ) : null}

          {loading && (
            <div className="flex items-center justify-center py-[32px]">
              <div className="w-[22px] h-[22px] border-[2.5px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
            </div>
          )}

          {!loading && query.trim() !== "" && results.length === 0 && (
            <p className="mt-[24px] font-montserrat text-[#848484] text-[14px] text-center">
              No users found
            </p>
          )}

          <ul className="mt-[12px]">
            {results.map((u) => {
              const name =
                [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
                u.epochlagID ||
                "Someone";
              const requested = requestedIds.has(u._id);
              const connected = !!u.isFriend;
              const isPending = pendingUserId === u._id;
              return (
                <li
                  key={u._id}
                  className="flex items-center gap-[12px] py-[12px] border-b last:border-b-0 border-[#C9C9C9]/40"
                >
                  <Avatar
                    user={{
                      firstName: u.firstName || "",
                      profilePicture: u.profilePicture || null,
                      updatedAt: u.updatedAt,
                    }}
                    size={44}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0 leading-tight">
                    <p className="font-ivy text-[#2C2C2C] text-[15px] truncate">
                      {name}
                    </p>
                    {u.epochlagID && (
                      <p className="font-montserrat text-[#848484] text-[12px] truncate">
                        {u.epochlagID}
                      </p>
                    )}
                  </div>
                  <AddButton
                    state={
                      connected
                        ? "connected"
                        : requested
                          ? "requested"
                          : "addable"
                    }
                    pending={isPending}
                    onClick={() => handleAdd(u._id)}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-black/5 px-[24px] py-[16px]">
          <Link
            href="/invite"
            onClick={onClose}
            className="block w-full rounded-full py-[12px] bg-primary-orange text-white text-center font-montserrat font-semibold text-[14px] hover:opacity-90 transition-opacity"
          >
            Invite contact to join Epoch Lag
          </Link>
        </div>
      </div>
    </div>
  );
}

function AddButton({
  state,
  pending,
  onClick,
}: {
  state: "addable" | "requested" | "connected";
  pending: boolean;
  onClick: () => void;
}) {
  if (state === "requested") {
    return (
      <span className="font-montserrat text-[#848484] text-[12px] shrink-0">
        Request Sent
      </span>
    );
  }
  if (state === "connected") {
    return (
      <span className="font-montserrat text-[#848484] text-[12px] shrink-0">
        Connected
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="shrink-0 bg-primary-blue text-white rounded-full px-[18px] py-[8px] font-montserrat font-semibold text-[13px] hover:opacity-90 transition-opacity disabled:opacity-60"
    >
      {pending ? "…" : "Add"}
    </button>
  );
}

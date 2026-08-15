"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchFriends, type FriendUser } from "../../../../lib/home/api";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { CloseIcon, SearchIcon } from "../icons";

type Props = {
  open: boolean;
  initialSelected: FriendUser[];
  onClose: () => void;
  // Fired AFTER the sheet's close animation completes so parent can safely
  // open a follow-up modal without a two-modals-overlap freeze.
  onConfirm: (selected: FriendUser[]) => void;
};

// Local, client-only tag-people sheet. See the spec: taggedPeople is
// never sent to the story endpoints (BE rejects it) — the IDs live in
// composer state and are handed to the celebration screen to pre-select
// in the share modal.
export default function TagPeopleSheet({
  open,
  initialSelected,
  onClose,
  onConfirm,
}: Props) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<FriendUser[]>(initialSelected);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Deferred-commit dance: the pendingActionRef holds the confirm callback
  // and only fires once the exit transition finishes. See spec.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setSelected(initialSelected);
      setQuery("");
      // next tick — let the initial (hidden) frame render, then flip visible
      // so the CSS transition animates in.
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open, initialSelected]);

  useEffect(() => {
    if (!open) return;
    if (friends.length > 0) return;
    let cancelled = false;
    setLoading(true);
    fetchFriends()
      .then((list) => {
        if (!cancelled) setFriends(list);
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
  }, [open, friends.length]);

  const selectedIds = useMemo(
    () => new Set(selected.map((u) => u._id)),
    [selected]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return friends.filter((u) => {
      const uid = String(u._id || u.epochlagID || "");
      if (!uid) return false;
      if (selectedIds.has(uid)) return false;
      if (user && uid === user._id) return false;
      const name = `${u.firstName || ""} ${u.lastName || ""}`
        .trim()
        .toLowerCase();
      const display = (u.displayName || "").toLowerCase();
      return name.includes(q) || display.includes(q);
    });
  }, [query, friends, selectedIds, user]);

  function pick(u: FriendUser) {
    setSelected((prev) => [...prev, u]);
    setQuery("");
  }

  function unpick(id: string) {
    setSelected((prev) => prev.filter((u) => u._id !== id));
  }

  function handleDone() {
    const snapshot = selected;
    pendingActionRef.current = () => onConfirm(snapshot);
    setVisible(false);
  }

  function handleTransitionEnd() {
    if (visible) return;
    // Sheet finished closing. Fire deferred confirm if pending, otherwise
    // just tell the parent we're done.
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setMounted(false);
    if (action) {
      // 100ms cushion mirrors the mobile app — lets the CSS repaint before
      // the parent potentially opens another modal.
      setTimeout(action, 100);
    } else {
      onClose();
    }
  }

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-[16px] transition-colors duration-200 ${
        visible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={() => setVisible(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={handleTransitionEnd}
        className={`w-full max-w-[480px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden transition-[opacity,transform] duration-200 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
        style={{ maxHeight: "70vh" }}
      >
        <div className="shrink-0 flex items-center justify-between px-[20px] pt-[16px] pb-[8px]">
          <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
            Tag People
          </h3>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        <div className="shrink-0 px-[20px] pb-[10px]">
          <div className="bg-[#ededed] rounded-full pl-[14px] pr-[16px] py-[10px] flex items-center gap-[10px]">
            <SearchIcon
              width={16}
              height={16}
              className="text-primary-blue/60 shrink-0"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends"
              autoFocus
              className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px]"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[20px] pb-[10px]">
          {loading && (
            <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px] text-center">
              Loading friends…
            </p>
          )}

          {!loading && query.trim() && searchResults.length === 0 && (
            <p className="font-montserrat text-primary-blue/50 text-[13px] py-[10px]">
              No matches.
            </p>
          )}

          {!loading &&
            searchResults.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => pick(u)}
                className="cursor-pointer w-full flex items-center gap-[10px] py-[8px] px-[6px] rounded-[10px] hover:bg-black/[0.04] transition-colors text-left"
              >
                <Avatar user={u} size={36} />
                <span className="min-w-0 truncate font-montserrat font-medium text-primary-blue text-[14px]">
                  {displayName(u)}
                </span>
              </button>
            ))}

          {selected.length > 0 && (
            <>
              {(!query.trim() || searchResults.length > 0) && (
                <div className="h-px bg-black/[0.06] my-[8px]" />
              )}
              {selected.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center gap-[10px] py-[8px] px-[6px]"
                >
                  <Avatar user={u} size={40} />
                  <span className="flex-1 min-w-0 truncate font-montserrat font-medium text-primary-blue text-[14px]">
                    {displayName(u)}
                  </span>
                  <button
                    type="button"
                    onClick={() => unpick(u._id)}
                    aria-label={`Remove ${displayName(u)}`}
                    className="cursor-pointer w-[30px] h-[30px] rounded-full text-primary-blue/60 hover:bg-black/[0.06] flex items-center justify-center transition-colors"
                  >
                    <CloseIcon width={12} height={12} />
                  </button>
                </div>
              ))}
            </>
          )}

          {!loading && !query.trim() && selected.length === 0 && (
            <p className="font-montserrat text-primary-blue/50 text-[13px] py-[20px] text-center">
              Search for a friend to tag.
            </p>
          )}
        </div>

        <div className="shrink-0 px-[20px] pt-[8px] pb-[20px]">
          <button
            type="button"
            onClick={handleDone}
            className="cursor-pointer w-full h-[48px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[15px] hover:brightness-95 transition-[filter]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function displayName(u: FriendUser): string {
  if (u.displayName) return u.displayName;
  const n = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return n || u.epochlagID || "Friend";
}

function Avatar({ user, size }: { user: FriendUser; size: number }) {
  const name = displayName(user);
  const initial = name.charAt(0).toUpperCase() || "?";
  return (
    <span
      className="shrink-0 rounded-full overflow-hidden bg-primary-blue/[0.08] text-primary-blue flex items-center justify-center font-montserrat font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {user.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profilePicture}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

export { displayName as tagPeopleDisplayName };

"use client";

// Invites — incoming friend requests. Row shows avatar + name + an inline
// "Accept" pill (declines moved to the detail-pane 3-dot menu to match the
// Figma, where the row chrome stays minimal). Accept/decline fire
// optimistically; rollback on BE error.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Avatar from "../../../../components/Avatar";
import {
  fetchReceivedRequests,
  respondToFriendRequest,
  type FriendRequest,
} from "../../../../lib/connections/api";
import { SkeletonList, EmptyState } from "./ConnectionsTab";

type Props = {
  query: string;
  selectedUserId: string | null;
  onSelect: (userId: string, requestId: string) => void;
  mobile: boolean;
  onCountChange?: (count: number) => void;
  // Lets the parent request an acceptance or decline from the detail pane.
  onReady?: (api: RequestsApi) => void;
};

export type RequestsApi = {
  accept: (userId: string) => Promise<void>;
  decline: (userId: string) => Promise<void>;
};

export default function RequestsTab({
  query,
  selectedUserId,
  onSelect,
  mobile,
  onCountChange,
  onReady,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FriendRequest[]>([]);
  // Optimistic row state so the UI reflects accept/decline before BE confirms.
  const [acted, setActed] = useState<Record<string, "accepted" | "declined">>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchReceivedRequests();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled)
          toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => items.filter((r) => !acted[r._id]),
    [items, acted],
  );

  useEffect(() => {
    onCountChange?.(visible.length);
  }, [visible.length, onCountChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((req) => {
      const p = req.requester;
      if (!p) return false;
      const full = `${p.firstName ?? ""} ${p.lastName ?? ""}`.toLowerCase();
      return (
        full.includes(q) || (p.epochlagID ?? "").toLowerCase().includes(q)
      );
    });
  }, [visible, query]);

  useEffect(() => {
    if (!mobile && !selectedUserId && filtered.length > 0 && filtered[0].requester) {
      onSelect(filtered[0].requester._id, filtered[0]._id);
    }
  }, [mobile, filtered, selectedUserId, onSelect]);

  async function respond(req: FriendRequest, accept: boolean) {
    if (acted[req._id]) return;
    setActed((cur) => ({
      ...cur,
      [req._id]: accept ? "accepted" : "declined",
    }));
    try {
      await respondToFriendRequest(req._id, accept);
      toast.success(accept ? "Invitation accepted" : "Request declined");
    } catch (e) {
      // Rollback.
      setActed((cur) => {
        const next = { ...cur };
        delete next[req._id];
        return next;
      });
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  // Expose an API to the parent so the detail pane's Accept / Decline
  // buttons can act on the currently selected request without the row.
  useEffect(() => {
    if (!onReady) return;
    onReady({
      accept: async (userId) => {
        const match = items.find((r) => r.requester?._id === userId);
        if (match) await respond(match, true);
      },
      decline: async (userId) => {
        const match = items.find((r) => r.requester?._id === userId);
        if (match) await respond(match, false);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, onReady]);

  if (loading) return <SkeletonList />;

  if (filtered.length === 0) {
    return <EmptyState caption={query ? "No users found" : "No invitations yet"} />;
  }

  return (
    <ul className="flex flex-col">
      {filtered.map((req) => {
        const s = req.requester;
        if (!s) return null;
        const name =
          [s.firstName, s.lastName].filter(Boolean).join(" ") || "Someone";
        const selected = !mobile && selectedUserId === s._id;
        return (
          <li key={req._id}>
            <div
              className={`w-full flex items-center gap-[12px] py-[10px] px-[12px] rounded-[12px] transition-colors ${
                selected ? "bg-[#F6E8D5]" : "hover:bg-black/[0.03]"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (mobile) router.push(`/circle/person/${s._id}`);
                  else onSelect(s._id, req._id);
                }}
                className="flex items-center gap-[12px] flex-1 min-w-0 text-left"
              >
                <Avatar
                  user={{
                    firstName: s.firstName,
                    profilePicture: s.profilePicture,
                  }}
                  size={40}
                />
                <span className="flex-1 min-w-0 font-ivy text-[#2C2C2C] text-[15px] truncate">
                  {name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => respond(req, true)}
                className="shrink-0 bg-primary-orange text-white rounded-full h-[32px] px-[16px] font-montserrat font-semibold text-[12px] hover:opacity-90 transition"
              >
                Accept
              </button>
            </div>
            <div className="h-px bg-[#C9C9C9]/40 mx-[12px] last:hidden" />
          </li>
        );
      })}
    </ul>
  );
}

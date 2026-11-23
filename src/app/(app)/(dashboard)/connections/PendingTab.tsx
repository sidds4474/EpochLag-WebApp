"use client";

// Pending — outgoing requests you sent that haven't been accepted. Row
// shows a muted "Pending" pill; revocation happens from the detail pane.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Avatar from "../../../../components/Avatar";
import {
  fetchSentRequests,
  type FriendRequest,
} from "../../../../lib/connections/api";
import { SkeletonList, EmptyState } from "./ConnectionsTab";

type Props = {
  query: string;
  selectedUserId: string | null;
  onSelect: (userId: string, requestId: string) => void;
  mobile: boolean;
  onCountChange?: (count: number) => void;
};

export default function PendingTab({
  query,
  selectedUserId,
  onSelect,
  mobile,
  onCountChange,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FriendRequest[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSentRequests();
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

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((req) => {
      const r = req.recipient;
      if (!r) return false;
      const full = `${r.firstName ?? ""} ${r.lastName ?? ""}`.toLowerCase();
      return (
        full.includes(q) || (r.epochlagID ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  useEffect(() => {
    if (!mobile && !selectedUserId && filtered.length > 0 && filtered[0].recipient) {
      onSelect(filtered[0].recipient._id, filtered[0]._id);
    }
  }, [mobile, filtered, selectedUserId, onSelect]);

  if (loading) return <SkeletonList />;

  if (filtered.length === 0) {
    return <EmptyState caption={query ? "No users found" : "No pending requests"} />;
  }

  return (
    <ul className="flex flex-col">
      {filtered.map((req) => {
        const r = req.recipient;
        if (!r) return null;
        const name =
          [r.firstName, r.lastName].filter(Boolean).join(" ") || "Someone";
        const selected = !mobile && selectedUserId === r._id;
        return (
          <li key={req._id}>
            <button
              type="button"
              onClick={() => {
                if (mobile) router.push(`/circle/person/${r._id}`);
                else onSelect(r._id, req._id);
              }}
              className={`w-full flex items-center gap-[12px] py-[10px] px-[12px] rounded-[12px] text-left transition-colors ${
                selected ? "bg-[#F6E8D5]" : "hover:bg-black/[0.03]"
              }`}
            >
              <Avatar
                user={{
                  firstName: r.firstName,
                  profilePicture: r.profilePicture,
                }}
                size={40}
              />
              <span className="flex-1 min-w-0 font-ivy text-[#2C2C2C] text-[15px] truncate">
                {name}
              </span>
              <span className="shrink-0 bg-[#EDEDED] text-[#848484] rounded-full h-[28px] px-[14px] inline-flex items-center font-montserrat text-[12px]">
                Pending
              </span>
            </button>
            <div className="h-px bg-[#C9C9C9]/40 mx-[12px] last:hidden" />
          </li>
        );
      })}
    </ul>
  );
}

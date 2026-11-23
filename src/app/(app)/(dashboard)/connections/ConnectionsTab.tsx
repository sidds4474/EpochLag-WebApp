"use client";

// All connections — accepted friends. Fetched once per tab visit via
// fetchHomePeople (same payload that powers Home / Sidebar). Sorted
// alphabetically, filtered client-side against the shared search query.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Avatar from "../../../../components/Avatar";
import { ChevronRightIcon } from "../icons";
import { fetchHomePeople } from "../../../../lib/home/api";
import type { PersonSummary } from "../../../../types/home";

type Props = {
  query: string;
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
  // Mobile: tapping a row routes to the person detail. Desktop leaves this
  // null and the split-pane detail renders instead.
  mobile: boolean;
};

export default function ConnectionsTab({
  query,
  selectedUserId,
  onSelect,
  mobile,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<PersonSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchHomePeople();
        if (cancelled) return;
        setUsers(data?.users ?? []);
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const sorted = [...users].sort((a, b) =>
      (a.firstName ?? "").localeCompare(b.firstName ?? ""),
    );
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      const tag = (u.epochlagID ?? "").toLowerCase();
      return name.includes(q) || tag.includes(q);
    });
  }, [users, query]);

  // Pick the first row on mount so the detail pane isn't empty.
  useEffect(() => {
    if (!mobile && !selectedUserId && filtered.length > 0) {
      onSelect(filtered[0]._id);
    }
  }, [mobile, filtered, selectedUserId, onSelect]);

  if (loading) {
    return <SkeletonList />;
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        caption={query ? "No users found" : "No connections yet"}
        showInvite
        onInvite={() => router.push("/connections/invite")}
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {filtered.map((u) => {
        const name =
          [u.firstName, u.lastName].filter(Boolean).join(" ") || "Someone";
        const selected = !mobile && selectedUserId === u._id;
        return (
          <li key={u._id}>
            <button
              type="button"
              onClick={() => {
                if (mobile) {
                  router.push(`/circle/person/${u._id}`);
                } else {
                  onSelect(u._id);
                }
              }}
              onMouseEnter={() =>
                router.prefetch(`/circle/person/${u._id}`)
              }
              className={`w-full flex items-center gap-[12px] py-[12px] px-[12px] rounded-[12px] text-left transition-colors ${
                selected
                  ? "bg-[#F6E8D5]"
                  : "hover:bg-black/[0.03]"
              }`}
            >
              <Avatar
                user={{
                  firstName: u.firstName,
                  profilePicture: u.profilePicture,
                }}
                size={40}
              />
              <span className="flex-1 min-w-0 font-ivy text-[#2C2C2C] text-[15px] truncate">
                {name}
              </span>
              <ChevronRightIcon
                width={16}
                height={16}
                className="text-[#848484] shrink-0"
              />
            </button>
            <div className="h-px bg-[#C9C9C9]/40 mx-[12px] last:hidden" />
          </li>
        );
      })}
    </ul>
  );
}

export function SkeletonList() {
  return (
    <div className="flex flex-col gap-[8px] py-[8px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-black/[0.04] animate-pulse rounded-[12px] h-[60px]"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  caption,
  showInvite,
  onInvite,
}: {
  caption: string;
  showInvite?: boolean;
  onInvite?: () => void;
}) {
  return (
    <div className="mt-[24px] flex flex-col items-center gap-[12px] py-[24px]">
      <p className="font-montserrat text-[#848484] text-[14px] text-center">
        {caption}
      </p>
      {showInvite && (
        <button
          type="button"
          onClick={onInvite}
          className="bg-primary-orange text-white rounded-full h-[40px] px-[20px] font-montserrat font-semibold text-[13px] hover:opacity-90 transition"
        >
          Invite to Epoch Lag
        </button>
      )}
    </div>
  );
}

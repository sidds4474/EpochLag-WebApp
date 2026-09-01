"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Avatar from "../../../../components/Avatar";
import { fetchSentRequests } from "../../../../lib/connections/api";
import type { FriendRequest } from "../../../../lib/connections/api";


function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function SkeletonRow() {
  return <div className="bg-[#f3f3f3] animate-pulse rounded-[16px] h-[76px]" />;
}

export default function PendingTab({ query }: { query: string }) {
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
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to load";
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return items;
    return items.filter((req) => {
      const p = req.recipient;
      if (!p) return false;
      const haystack = normalize(
        [
          `${p.firstName ?? ""} ${p.lastName ?? ""}`,
          p.email ?? "",
          p.phone ?? "",
          p.epochlagID ?? "",
        ].join(" ")
      );
      return haystack.includes(q);
    });
  }, [items, query]);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-[10px] mt-[8px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="mt-[24px] font-montserrat text-primary-blue/60 text-[14px] text-center">
        No pending requests found
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[10px] mt-[8px]">
      {filtered.map((req) => {
        const r = req.recipient;
        if (!r) return null;
        return (
          <div
            key={req._id}
            className="bg-[#EDEDED] rounded-[16px] p-[12px] flex items-center gap-[12px]"
          >
            <button
              type="button"
              onClick={() => router.push(`/profile/${r._id}`)}
              onMouseEnter={() => router.prefetch(`/profile/${r._id}`)}
              onFocus={() => router.prefetch(`/profile/${r._id}`)}
              className="cursor-pointer flex items-center gap-[12px] flex-1 min-w-0 text-left hover:opacity-80 transition"
            >
              <Avatar
                user={{
                  firstName: r.firstName,
                  profilePicture: r.profilePicture,
                  updatedAt: r.updatedAt,
                }}
                size={44}
              />
              <p className="font-montserrat font-bold text-primary-blue text-[15px] truncate">
                {[r.firstName, r.lastName].filter(Boolean).join(" ") ||
                  "Unknown"}
              </p>
            </button>
            <span
              className="rounded-[22px] h-[36px] px-[14px] inline-flex items-center font-montserrat font-semibold text-[13px] shrink-0"
              style={{ backgroundColor: "#C9C9C9", color: "#636363" }}
            >
              Invitation Sent
            </span>
          </div>
        );
      })}
    </div>
  );
}

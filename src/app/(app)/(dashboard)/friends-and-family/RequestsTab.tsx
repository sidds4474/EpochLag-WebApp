"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { bustUrl } from "../../../../lib/images";
import {
  fetchReceivedRequests,
  respondToFriendRequest,
} from "../../../../lib/connections/api";
import type { FriendRequest } from "../../../../lib/connections/api";

type RowState = "accepted" | "declined" | null;

function initial(first?: string | null) {
  return first?.[0]?.toUpperCase() ?? "?";
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function SkeletonRow() {
  return <div className="bg-[#f3f3f3] animate-pulse rounded-[16px] h-[76px]" />;
}

export default function RequestsTab({ query }: { query: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FriendRequest[]>([]);
  const [status, setStatus] = useState<Record<string, RowState>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchReceivedRequests();
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
      const p = req.requester;
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

  async function respond(req: FriendRequest, accept: boolean) {
    if (status[req._id]) return;
    setStatus((cur) => ({ ...cur, [req._id]: accept ? "accepted" : "declined" }));
    try {
      await respondToFriendRequest(req._id, accept);
    } catch (e) {
      setStatus((cur) => ({ ...cur, [req._id]: null }));
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-[10px] mt-[8px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="mt-[24px] font-montserrat text-primary-blue/60 text-[14px] text-center">
        No requests found
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-[10px] mt-[8px]">
      {filtered.map((req) => {
        const s = req.requester;
        if (!s) return null;
        const url = bustUrl(s.profilePicture ?? null, s.updatedAt);
        const rowState = status[req._id] ?? null;
        return (
          <div
            key={req._id}
            className="bg-[#EDEDED] rounded-[16px] p-[12px] flex items-center gap-[12px]"
          >
            <button
              type="button"
              onClick={() => router.push(`/profile/${s._id}`)}
              className="cursor-pointer flex items-center gap-[12px] flex-1 min-w-0 text-left hover:opacity-80 transition"
            >
              <div className="w-[44px] h-[44px] rounded-full overflow-hidden bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[15px] shrink-0">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={s.firstName ?? ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initial(s.firstName)}</span>
                )}
              </div>
              <p className="font-montserrat font-bold text-primary-blue text-[15px] truncate">
                {[s.firstName, s.lastName].filter(Boolean).join(" ") ||
                  "Unknown"}
              </p>
            </button>

            {rowState === null && (
              <div className="flex items-center gap-[8px] shrink-0">
                <button
                  type="button"
                  onClick={() => respond(req, false)}
                  className="cursor-pointer border border-primary-blue bg-transparent text-primary-blue rounded-full h-[36px] px-[16px] text-[13px] font-montserrat font-semibold hover:bg-black/[0.03] transition"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => respond(req, true)}
                  className="cursor-pointer bg-[#092E4A] text-white rounded-full h-[36px] px-[16px] text-[13px] font-montserrat font-semibold hover:opacity-90 transition"
                >
                  Confirm
                </button>
              </div>
            )}

            {rowState === "accepted" && (
              <div className="bg-white rounded-full h-[36px] px-[14px] inline-flex items-center gap-[6px] shrink-0">
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary-blue"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="font-montserrat font-semibold text-primary-blue text-[13px]">
                  Connection
                </span>
              </div>
            )}

            {rowState === "declined" && (
              <span className="font-montserrat font-semibold text-primary-blue/30 text-[13px] shrink-0 pr-[8px]">
                Request Declined
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

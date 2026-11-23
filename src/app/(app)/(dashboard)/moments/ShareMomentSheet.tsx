"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { fetchHomePeople } from "../../../../lib/home/api";
import { bustUrl } from "../../../../lib/images";
import { inviteToMoment } from "../../../../lib/moments/api";
import { updateMomentLocal } from "../../../../lib/moments/cache";
import { formatCalendarDay, parseCalendarDay } from "../../../../lib/moments/date";
import { buildChannelShareUrl, type ShareChannel } from "../../../../lib/referral/api";
import type { FriendSearchResult, Moment, MomentParticipant } from "../../../../types/moment";
import { CloseIcon } from "../icons";
import { fallbackGradient } from "./momentTypeIcon";

function splitDay(iso: string): { day: string; month: string } {
  const parts = parseCalendarDay(iso);
  if (!parts) return { day: "--", month: "" };
  return {
    day: String(parts.d).padStart(2, "0"),
    month: formatCalendarDay(iso, { month: "short" }),
  };
}

function Avatar({ user, size = 36 }: { user: FriendSearchResult; size?: number }) {
  return (
    <span
      className="rounded-full overflow-hidden bg-[#C8D1DA] text-white flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {user.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bustUrl(user.profilePicture, undefined)}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="font-montserrat font-semibold text-[13px]">
          {(user.firstName || "?").charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function RadioToggle({ checked }: { checked: boolean }) {
  return (
    <span
      className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center transition-colors ${
        checked
          ? "bg-primary-orange border-primary-orange"
          : "bg-white border-[#2c2c2c]/30"
      }`}
    >
      {checked && (
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

const CHANNELS: Array<{
  key: "copy" | "whatsapp" | "messenger" | "sms";
  label: string;
  bg: string;
  fg: string;
}> = [
  { key: "copy", label: "Copy Link", bg: "#EDEDED", fg: "#232323" },
  { key: "whatsapp", label: "Whatsapp", bg: "#25D366", fg: "#fff" },
  { key: "messenger", label: "Messenger", bg: "#0084FF", fg: "#fff" },
  { key: "sms", label: "Message", bg: "#4CD964", fg: "#fff" },
];

export default function ShareMomentSheet({
  open,
  moment,
  onClose,
}: {
  open: boolean;
  moment: Moment | null;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<FriendSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const people = await fetchHomePeople();
        if (cancelled) return;
        setFriends(
          (people.users ?? []).map((u) => ({
            _id: u._id,
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            epochlagID: u.epochlagID,
            profilePicture: u.profilePicture ?? null,
          })),
        );
      } catch {
        if (!cancelled) setFriends([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIds(new Set());
    }
  }, [open]);

  // Friends who are already participants shouldn't appear.
  const existingParticipantIds = useMemo(() => {
    if (!moment) return new Set<string>();
    return new Set(
      (moment.participants ?? [])
        .map((p) => {
          const u = p.userId as unknown;
          return typeof u === "string"
            ? u
            : (u as { _id?: string } | null)?._id;
        })
        .filter((v): v is string => !!v),
    );
  }, [moment]);

  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    const base = friends.filter((f) => !existingParticipantIds.has(f._id));
    if (!normalized) return base;
    return base.filter((f) =>
      `${f.firstName ?? ""} ${f.lastName ?? ""}`.toLowerCase().includes(normalized),
    );
  }, [friends, existingParticipantIds, normalized]);

  if (!open || !moment) return null;

  const dateIso = moment.nextOccurrence || moment.date;
  const { day, month } = splitDay(dateIso);
  const cover = moment.coverImageUrl;

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedNames = friends
    .filter((f) => selectedIds.has(f._id))
    .map((f) => f.firstName || "User");

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/moments/${moment._id}`
      : `/moments/${moment._id}`;
  const shareMessage = `Check out "${moment.title}" on Epoch Lag`;

  const handleChannel = async (key: typeof CHANNELS[number]["key"]) => {
    if (key === "copy") {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied");
      } catch {
        toast.error("Couldn't copy link");
      }
      return;
    }
    const channel: ShareChannel =
      key === "whatsapp" ? "whatsapp" : key === "messenger" ? "messenger" : "sms";
    const url = buildChannelShareUrl(channel, shareMessage, shareUrl);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSend = async () => {
    if (selectedIds.size === 0 || sending) return;
    const ids = Array.from(selectedIds);
    setSending(true);
    try {
      const results = await Promise.allSettled(
        ids.map((uid) => inviteToMoment(moment._id, uid)),
      );
      const invitedIds = results
        .map((r, i) => (r.status === "fulfilled" ? ids[i] : null))
        .filter((v): v is string => !!v);

      if (invitedIds.length > 0) {
        const additions = invitedIds
          .map((uid) => friends.find((f) => f._id === uid))
          .filter((f): f is FriendSearchResult => !!f)
          .map<MomentParticipant>((f) => ({
            userId: {
              _id: f._id,
              firstName: f.firstName,
              lastName: f.lastName,
              epochlagID: f.epochlagID,
              profilePicture: f.profilePicture,
            },
            status: "pending",
            invitedAt: new Date().toISOString(),
            respondedAt: null,
          }));
        updateMomentLocal({
          ...moment,
          participants: [...(moment.participants ?? []), ...additions],
        });
      }

      const failed = results.length - invitedIds.length;
      if (failed === 0) {
        toast.success(
          `Added ${invitedIds.length} ${invitedIds.length === 1 ? "person" : "people"}`,
        );
        onClose();
      } else {
        toast.error(`Couldn't add ${failed} ${failed === 1 ? "person" : "people"}`);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't add people";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share Moment"
        className="absolute right-0 top-0 h-full w-full md:max-w-[440px] bg-white flex flex-col md:rounded-l-[24px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center justify-between px-[24px] pt-[24px] pb-[12px]">
          <h2 className="font-ivy font-normal text-[#232323] text-[22px] leading-[1.15]">
            Share Moment
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#EDEDED] text-[#232323] flex items-center justify-center hover:brightness-95 transition"
          >
            <CloseIcon width={12} height={12} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px] flex flex-col gap-[20px]">
          <div className="flex flex-col items-center">
            <div className="relative bg-white p-[8px] pb-[14px] shadow-[0_4px_18px_rgba(0,0,0,0.18)]">
              <div
                className="relative w-[180px] h-[180px] overflow-hidden bg-primary-blue/10"
                style={
                  !cover ? { backgroundImage: fallbackGradient(moment.type) } : undefined
                }
              >
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute top-[14px] left-[14px] bg-white px-[10px] py-[4px] text-center shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
                <div className="font-ivy font-normal text-[#232323] text-[18px] leading-[1]">
                  {day}
                </div>
                <div className="mt-[1px] font-montserrat text-[#2c2c2c]/70 text-[10px]">
                  {month}
                </div>
              </div>
            </div>
            <p className="mt-[8px] font-montserrat text-[#232323] text-[14px]">
              {moment.title}
            </p>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-[#2c2c2c]/50">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx={11} cy={11} r={8} />
                <line x1={21} y1={21} x2={16.65} y2={16.65} />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full h-[44px] rounded-full bg-[#EDEDED] pl-[44px] pr-[20px] font-montserrat text-[14px] text-[#232323] placeholder:text-[#2c2c2c]/40 focus:outline-none"
            />
          </div>

          <div>
            <p className="font-montserrat text-[#232323] text-[13px] mb-[6px]">
              Suggested
            </p>
            {loading && results.length === 0 && (
              <p className="font-montserrat text-[#2c2c2c]/50 text-[13px] py-[12px]">
                Loading…
              </p>
            )}
            {!loading && results.length === 0 && (
              <p className="font-montserrat text-[#2c2c2c]/50 text-[13px] py-[12px]">
                No people to add
              </p>
            )}
            {results.map((u) => {
              const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "User";
              const checked = selectedIds.has(u._id);
              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggle(u._id)}
                  className="cursor-pointer w-full flex items-center gap-[12px] py-[10px] border-b border-black/[0.06] last:border-b-0"
                >
                  <Avatar user={u} />
                  <span className="flex-1 min-w-0 text-left font-montserrat text-[#232323] text-[14px] truncate">
                    {name}
                  </span>
                  <RadioToggle checked={checked} />
                </button>
              );
            })}
          </div>

          <div className="pt-[8px] border-t border-black/[0.08]">
            <p className="font-montserrat text-[#2c2c2c]/70 text-[13px] mb-[12px]">
              Share outside the app
            </p>
            <div className="flex items-start justify-between gap-[8px]">
              {CHANNELS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleChannel(c.key)}
                  className="cursor-pointer flex flex-col items-center gap-[8px] flex-1 min-w-0"
                >
                  <span
                    className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
                    style={{ backgroundColor: c.bg, color: c.fg }}
                  >
                    <ChannelIcon kind={c.key} />
                  </span>
                  <span className="font-montserrat text-[#2c2c2c] text-[11px] text-center leading-[1.2]">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-[24px] pt-[12px] pb-[max(env(safe-area-inset-bottom),20px)] border-t border-black/[0.08] flex items-center gap-[10px] bg-white">
          <div className="flex-1 min-w-0 min-h-[44px] rounded-full bg-[#EDEDED] px-[18px] flex items-center font-montserrat text-[#232323] text-[14px] truncate">
            {selectedNames.length > 0 ? selectedNames.join(", ") : "No one selected"}
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={selectedIds.size === 0 || sending}
            className={`h-[44px] px-[24px] rounded-full font-montserrat font-semibold text-white text-[14px] ${
              selectedIds.size === 0 || sending
                ? "bg-primary-orange/50 cursor-not-allowed"
                : "bg-primary-orange cursor-pointer hover:opacity-90"
            }`}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChannelIcon({ kind }: { kind: typeof CHANNELS[number]["key"] }) {
  const stroke = { width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "copy":
      return (
        <svg {...stroke} viewBox="0 0 24 24" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L12 4.5" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.47-1.46" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M20.52 3.48A11.78 11.78 0 0012.03 0C5.5 0 .22 5.28.22 11.8c0 2.08.55 4.1 1.59 5.88L0 24l6.5-1.7a11.76 11.76 0 005.53 1.4h.01c6.52 0 11.8-5.28 11.8-11.8 0-3.15-1.23-6.12-3.32-8.42zM12.04 21.4h-.01a9.67 9.67 0 01-4.93-1.35l-.35-.21-3.86 1 1.03-3.76-.23-.39a9.68 9.68 0 01-1.48-5.1c0-5.34 4.35-9.69 9.69-9.69 2.58 0 5.01 1 6.84 2.83a9.6 9.6 0 012.84 6.86c0 5.35-4.36 9.7-9.7 9.7z" />
        </svg>
      );
    case "messenger":
      return (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0C5.4 0 0 5 0 11.2c0 3.5 1.7 6.7 4.4 8.7V24l4-2.2c1.1.3 2.3.5 3.6.5 6.6 0 12-5 12-11.2S18.6 0 12 0zm1.3 15l-3-3.2L5 15l6.1-6.5 3.1 3.2L19 8.5 13.3 15z" />
        </svg>
      );
    case "sms":
      return (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6 2 11c0 2.4 1.1 4.6 2.8 6.3L3 22l5-1.6c1.2.4 2.5.6 4 .6 5.52 0 10-4 10-9s-4.48-10-10-10z" />
        </svg>
      );
  }
}

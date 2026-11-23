"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { isPinned, togglePin } from "../../../../lib/moments/cache";
import { formatCalendarDay, parseCalendarDay } from "../../../../lib/moments/date";
import type { Moment } from "../../../../types/moment";
import { ChevronLeftIcon } from "../icons";
import { fallbackGradient } from "./momentTypeIcon";
import RemoveFromCountdownModal from "./RemoveFromCountdownModal";
import ShareMomentSheet from "./ShareMomentSheet";

function formatFullDate(iso: string): string {
  return formatCalendarDay(iso, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function splitDay(iso: string): { day: string; month: string } {
  const parts = parseCalendarDay(iso);
  if (!parts) return { day: "--", month: "" };
  return {
    day: String(parts.d).padStart(2, "0"),
    month: formatCalendarDay(iso, { month: "short" }),
  };
}

export default function MomentDetailCard({
  moment,
  onRequestDelete,
  onClose,
}: {
  moment: Moment;
  onRequestDelete: (m: Moment) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [removePinOpen, setRemovePinOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pinned, setPinned] = useState<boolean>(() => isPinned(moment._id));
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    setPinned(isPinned(moment._id));
  }, [moment._id]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const cover = moment.coverImageUrl;
  const dateIso = moment.nextOccurrence || moment.date;
  const { day, month } = splitDay(dateIso);
  const participants = (moment.participants ?? []).filter((p) => {
    const u = p.userId as unknown;
    if (!u) return false;
    if (typeof u === "string") return false;
    const obj = u as { _id?: string; firstName?: string; lastName?: string };
    return !!(obj._id && (obj.firstName || obj.lastName));
  });
  const isAuthor = moment.role === "author";

  const handleTogglePin = async (next: boolean) => {
    if (pinBusy) return;
    setPinned(next);
    setPinBusy(true);
    try {
      await togglePin(moment, next);
    } catch (err) {
      setPinned(!next);
      const message =
        err instanceof ApiError ? err.message : "Couldn't update countdown";
      toast.error(message);
    } finally {
      setPinBusy(false);
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-[14px]">
      {/* Top row: back + ⋯ */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white hover:bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.08)] text-[#232323] flex items-center justify-center transition-colors"
        >
          <ChevronLeftIcon width={14} height={14} />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="cursor-pointer w-[32px] h-[32px] rounded-full text-[#232323] flex items-center justify-center hover:bg-black/[0.05] transition-colors"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[38px] min-w-[220px] bg-white rounded-[14px] shadow-[0_6px_24px_rgba(0,0,0,0.16)] py-[8px] z-20"
            >
              {isAuthor && (
                <Link
                  href={`/moments/${moment._id}/edit`}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center justify-between gap-[10px] px-[18px] py-[11px] font-montserrat text-[#232323] text-[14px] hover:bg-black/[0.04] transition-colors"
                >
                  <span>Edit</span>
                  <PencilIcon />
                </Link>
              )}
              {pinned && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setRemovePinOpen(true);
                  }}
                  className="cursor-pointer w-full flex items-center justify-between gap-[10px] px-[18px] py-[11px] font-montserrat text-[#232323] text-[14px] hover:bg-black/[0.04] transition-colors text-left"
                >
                  <span>Remove from Countdown</span>
                  <CalendarIcon />
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setShareOpen(true);
                }}
                className="cursor-pointer w-full flex items-center justify-between gap-[10px] px-[18px] py-[11px] font-montserrat text-[#232323] text-[14px] hover:bg-black/[0.04] transition-colors text-left"
              >
                <span>Share</span>
                <SendIcon />
              </button>
              {isAuthor && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onRequestDelete(moment);
                  }}
                  className="cursor-pointer w-full flex items-center justify-between gap-[10px] px-[18px] py-[11px] font-montserrat text-[#D95F3B] text-[14px] hover:bg-black/[0.04] transition-colors text-left"
                >
                  <span>Delete</span>
                  <TrashIcon />
                </button>
              )}
              {!isAuthor && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onRequestDelete(moment);
                  }}
                  className="cursor-pointer w-full flex items-center justify-between gap-[10px] px-[18px] py-[11px] font-montserrat text-[#D95F3B] text-[14px] hover:bg-black/[0.04] transition-colors text-left"
                >
                  <span>Leave</span>
                  <TrashIcon />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title + date */}
      <div className="text-center">
        <h2 className="font-ivy font-normal text-[#232323] text-[26px] md:text-[30px] leading-[1.15]">
          {moment.title}
        </h2>
        <p className="mt-[4px] font-montserrat text-[#848484] text-[13px]">
          {formatFullDate(dateIso)}
        </p>
      </div>

      {/* Polaroid-framed cover with date tile */}
      <div className="flex justify-center mt-[4px]">
        <div className="relative bg-white p-[10px] pb-[18px] shadow-[0_4px_18px_rgba(0,0,0,0.18)]">
          <div
            className="w-full max-w-[280px] aspect-square overflow-hidden bg-primary-blue/10"
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
          {/* Day / month tile top-left */}
          <div className="absolute top-[18px] left-[18px] bg-white px-[12px] py-[6px] text-center shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
            <div className="font-ivy font-normal text-[#232323] text-[22px] leading-[1]">
              {day}
            </div>
            <div className="mt-[1px] font-montserrat text-[#2c2c2c]/70 text-[11px]">
              {month}
            </div>
          </div>
        </div>
      </div>

      {/* Participants */}
      {participants.length > 0 && (
        <div className="mt-[6px] flex flex-col">
          {participants.map((p, i) => {
            const user = p.userId;
            const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "User";
            const initial = (user?.firstName || "?").charAt(0).toUpperCase();
            return (
              <div
                key={user?._id ?? `p:${i}`}
                className="flex items-center justify-between gap-[10px] py-[10px] border-b border-black/10 last:border-b-0"
              >
                <div className="flex items-center gap-[10px] min-w-0">
                  <div className="w-[32px] h-[32px] rounded-full bg-[#C8D1DA] overflow-hidden flex items-center justify-center shrink-0">
                    {user?.profilePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.profilePicture}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-montserrat font-semibold text-white text-[12px]">
                        {initial}
                      </span>
                    )}
                  </div>
                  <span className="font-montserrat text-[#232323] text-[14px] truncate">
                    {name}
                  </span>
                </div>
                {p.status === "accepted" && user && user._id && (
                  <span className="font-montserrat text-[#848484] text-[12px] shrink-0">
                    {isAuthor ? "" : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lag CTA */}
      <button
        type="button"
        onClick={() => router.push(`/new-story?momentId=${encodeURIComponent(moment._id)}`)}
        className="mt-[6px] w-full cursor-pointer bg-primary-orange text-white font-montserrat font-semibold text-[15px] rounded-full py-[12px] hover:opacity-90 transition-opacity"
      >
        Create Lag
      </button>

      <RemoveFromCountdownModal
        open={removePinOpen}
        onClose={() => setRemovePinOpen(false)}
        onConfirm={() => {
          setRemovePinOpen(false);
          handleTogglePin(false);
        }}
      />

      <ShareMomentSheet
        open={shareOpen}
        moment={moment}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

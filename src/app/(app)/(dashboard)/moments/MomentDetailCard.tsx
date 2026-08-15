"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { isPinned, togglePin } from "../../../../lib/moments/cache";
import type { Moment } from "../../../../types/moment";
import { PersonIcon } from "../icons";
import { fallbackGradient, momentTypeIcon } from "./momentTypeIcon";

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Horizontal three-dot icon
function EllipsisIcon({ width = 18, height = 18 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function PencilIconInline({ width = 16, height = 16 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIconInline({ width = 16, height = 16 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function MomentDetailCard({
  moment,
  onRequestDelete,
  onOpenPeopleTagged,
  onClose,
}: {
  moment: Moment;
  onRequestDelete: (m: Moment) => void;
  onOpenPeopleTagged: (m: Moment) => void;
  onClose: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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
  const participantCount = moment.participants?.length ?? 0;

  const handleTogglePin = async () => {
    if (pinBusy) return;
    const next = !pinned;
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
    <div className="relative w-full">
      {/* Cover */}
      <div
        className="relative h-[400px] w-full rounded-[20px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
        style={
          !cover ? { backgroundImage: fallbackGradient(moment.type) } : undefined
        }
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Kebab menu */}
        <div className="absolute top-[14px] right-[14px]" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="cursor-pointer h-[26px] w-[40px] rounded-full bg-white text-primary-blue shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center hover:bg-white transition-colors"
          >
            <EllipsisIcon width={20} height={20} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[40px] min-w-[190px] bg-white rounded-[16px] shadow-[0_6px_24px_rgba(0,0,0,0.16)] py-[6px] z-10"
            >
              {moment.role === "author" && (
                <>
                  <Link
                    href={`/moments/${moment._id}/edit`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center justify-between gap-[10px] px-[18px] py-[12px] font-montserrat font-medium text-primary-blue text-[14px] hover:bg-black/[0.03] transition-colors"
                  >
                    <span>Edit</span>
                    <PencilIconInline width={16} height={16} />
                  </Link>
                  <div className="h-px bg-[#C9C9C9] mx-[18px]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onRequestDelete(moment);
                    }}
                    className="cursor-pointer w-full flex items-center justify-between gap-[10px] px-[18px] py-[12px] font-montserrat font-medium text-primary-blue text-[14px] hover:bg-black/[0.03] transition-colors"
                  >
                    <span>Delete</span>
                    <span className="text-[#e53e3e]">
                      <TrashIconInline width={16} height={16} />
                    </span>
                  </button>
                </>
              )}
              {moment.role === "participant" && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onRequestDelete(moment);
                  }}
                  className="cursor-pointer w-full flex items-center justify-between gap-[10px] px-[18px] py-[12px] font-montserrat font-medium text-primary-blue text-[14px] hover:bg-black/[0.03] transition-colors"
                >
                  <span>Leave</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer card overlaying the cover — same width as the cover */}
      <div className="-mt-[70px] relative z-[1] rounded-[20px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.10)] px-[20px] pt-[22px] pb-[26px]">
        {/* Participant count pill — sits on the top-right of the whitesheet */}
        {participantCount > 0 && (
          <button
            type="button"
            onClick={() => onOpenPeopleTagged(moment)}
            aria-label={`${participantCount} people tagged`}
            className="cursor-pointer absolute top-[14px] right-[14px] inline-flex items-center gap-[4px] bg-[color:var(--color-surface-muted)] rounded-full px-[8px] py-[3px] font-montserrat font-medium text-primary-blue text-[11px]"
          >
            <PersonIcon width={10} height={10} />
            {participantCount}
          </button>
        )}

        <div className="flex flex-col items-center text-center gap-[8px]">
          <div className="w-[36px] h-[36px] rounded-full bg-[color:var(--color-surface-muted)] text-primary-blue flex items-center justify-center">
            {momentTypeIcon(moment.type, 18)}
          </div>
          <h3 className="font-montserrat font-medium text-primary-blue text-[18px] leading-[1.2]">
            {moment.title}
          </h3>
          <p className="font-montserrat text-primary-blue text-[13px]">
            {formatFullDate(moment.nextOccurrence || moment.date)}
          </p>
        </div>

        {/* Add to countdown toggle */}
        <div className="mt-[14px] flex items-center justify-center gap-[12px]">
          <span className="font-montserrat font-medium text-primary-blue text-[14px]">
            Add to countdown
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={pinned}
            onClick={handleTogglePin}
            disabled={pinBusy}
            className={`cursor-pointer relative w-[36px] h-[20px] rounded-full transition-colors ${
              pinned ? "bg-primary-orange" : "bg-black/[0.15]"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform ${
                pinned ? "translate-x-[16px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

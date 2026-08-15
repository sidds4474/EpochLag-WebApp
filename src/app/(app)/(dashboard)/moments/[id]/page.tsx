"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import {
  hydrate,
  isPinned,
  togglePin,
  useMomentsState,
} from "../../../../../lib/moments/cache";
import type { Moment } from "../../../../../types/moment";
import { ChevronLeftIcon, PersonIcon } from "../../icons";
import DeleteMomentModal from "../DeleteMomentModal";
import { fallbackGradient, momentTypeIcon } from "../momentTypeIcon";

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = d.toLocaleDateString(undefined, { month: "long" });
  const year = d.getFullYear();
  return `${month} ${day}${suffix}, ${year}`;
}

function EllipsisIcon({ width = 20 }: { width?: number }) {
  return (
    <svg width={width} height={width} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

function PencilIconInline({ width = 20 }: { width?: number }) {
  return (
    <svg width={width} height={width} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIconInline({ width = 20 }: { width?: number }) {
  return (
    <svg width={width} height={width} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function MobileMomentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { byFilter, countdown } = useMomentsState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Moment | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    hydrate();
  }, []);

  const moment = useMemo<Moment | null>(() => {
    const seen = new Map<string, Moment>();
    for (const src of [byFilter.upcoming, byFilter.past, byFilter.all, countdown]) {
      if (!src) continue;
      for (const m of src) if (!seen.has(m._id)) seen.set(m._id, m);
    }
    return seen.get(id) ?? null;
  }, [byFilter, countdown, id]);

  const [pinned, setPinned] = useState<boolean>(false);
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    setPinned(isPinned(id));
  }, [id]);

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

  if (!moment) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <p className="font-montserrat text-primary-blue/60 text-[14px]">
          Loading…
        </p>
      </div>
    );
  }

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
    <div className="lg:hidden fixed inset-0 z-40 bg-white flex flex-col">
      <div
        className="relative flex-1 min-h-0"
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

        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer absolute top-[max(env(safe-area-inset-top),16px)] left-[16px] w-[36px] h-[36px] rounded-full bg-white text-primary-blue flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
        >
          <ChevronLeftIcon width={16} height={16} />
        </button>

        <div
          className="absolute top-[max(env(safe-area-inset-top),16px)] right-[16px]"
          ref={menuRef}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="cursor-pointer h-[30px] w-[46px] rounded-full bg-white text-primary-blue shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center"
          >
            <EllipsisIcon width={22} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[40px] min-w-[209px] bg-white rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.25)] py-[8px] px-[16px] z-10"
            >
              {moment.role === "author" && (
                <>
                  <Link
                    href={`/moments/${moment._id}/edit`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center justify-between gap-[12px] py-[12px] border-b border-[#C9C9C9] font-montserrat font-medium text-primary-blue text-[16px]"
                  >
                    <span>Edit</span>
                    <PencilIconInline width={20} />
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteTarget(moment);
                    }}
                    className="cursor-pointer w-full flex items-center justify-between gap-[12px] py-[12px] font-montserrat font-medium text-primary-blue text-[16px]"
                  >
                    <span>Delete</span>
                    <span className="text-[#D95F3B]">
                      <TrashIconInline width={20} />
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
                    setDeleteTarget(moment);
                  }}
                  className="cursor-pointer w-full flex items-center justify-between gap-[12px] py-[12px] font-montserrat font-medium text-primary-blue text-[16px]"
                >
                  <span>Leave</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative -mt-[24px] rounded-t-[24px] bg-white px-[24px] pt-[48px] pb-[64px] md:pt-[80px] md:pb-[120px] flex flex-col items-center gap-[36px] md:gap-[48px]">
        {participantCount > 0 && (
          <Link
            href={`/moments/${moment._id}/people`}
            aria-label={`${participantCount} people tagged`}
            className="cursor-pointer absolute top-[16px] right-[16px] inline-flex items-center gap-[5.7px] bg-[#EDEDED] rounded-full px-[10px] py-[5px] font-montserrat font-medium text-primary-blue text-[11.4px]"
          >
            <PersonIcon width={11.4} height={11.4} />
            {participantCount}
          </Link>
        )}

        <div className="flex flex-col items-center gap-[12px]">
          <div className="w-[43px] h-[43px] rounded-full bg-[color:var(--color-surface-muted)] text-primary-blue flex items-center justify-center">
            {momentTypeIcon(moment.type, 22)}
          </div>
          <div className="flex flex-col items-center gap-[8px] text-center">
            <h1 className="font-montserrat font-medium text-black text-[24px] leading-[28px]">
              {moment.title}
            </h1>
            <p className="font-montserrat font-medium text-black text-[16px] leading-[20px]">
              {formatFullDate(moment.nextOccurrence || moment.date)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-[12px]">
          <span className="font-montserrat font-medium text-primary-blue text-[16px]">
            Add to countdown
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={pinned}
            onClick={handleTogglePin}
            disabled={pinBusy}
            className={`cursor-pointer relative w-[40px] h-[22px] rounded-full transition-colors ${
              pinned ? "bg-primary-orange" : "bg-[#C9C9C9] border-[0.6px] border-[#A5A5A5]"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform ${
                pinned ? "translate-x-[18px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <DeleteMomentModal
        moment={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          setDeleteTarget(null);
          router.push("/moments");
        }}
      />
    </div>
  );
}

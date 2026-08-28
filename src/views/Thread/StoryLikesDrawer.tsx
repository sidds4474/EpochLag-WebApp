"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { CloseIcon, HeartIcon } from "../../app/(app)/(dashboard)/icons";
import { bustUrl } from "../../lib/images";
import type { StoryLike } from "../../types/home";

type Props = {
  open: boolean;
  likes: StoryLike[];
  onClose: () => void;
};

// Story-level "Likes" drawer. Mirrors the CommentsModal Loves panel:
// bottom sheet on mobile, right-side drawer on desktop, vertically
// centered drawer sized to the modal on tablet. Row tap routes to
// /profile/:userId per the mobile spec (with a small delay so the
// sheet has time to unmount before navigation).
export default function StoryLikesDrawer({ open, likes, onClose }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  function goToProfile(userId: string) {
    onClose();
    // Match mobile: delay push so drawer unmount finishes first.
    window.setTimeout(() => router.push(`/profile/${userId}`), 120);
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Mobile: bottom sheet */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 top-[35vh] z-[61] bg-white rounded-t-[20px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="pt-[10px] pb-[6px] flex justify-center">
          <div className="w-[78px] h-[4px] rounded-full bg-black/[0.15]" />
        </div>
        <div className="relative pt-[6px] pb-[14px]">
          <h3 className="text-center font-montserrat font-bold text-primary-blue text-[16px]">
            Likes
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-[16px] top-1/2 -translate-y-1/2 cursor-pointer w-[28px] h-[28px] rounded-full text-primary-blue flex items-center justify-center"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-[16px] pb-[16px]">
          <LikesList likes={likes} onRowClick={goToProfile} />
        </div>
      </div>

      {/* Desktop / tablet: right-side drawer.
          Tablet (md): vertically centered, height matches Comments modal.
          Desktop (lg): pinned top/bottom with 24px insets. */}
      <div
        className="hidden md:flex fixed right-[24px] top-[24px] bottom-[24px] w-[320px] lg:w-[360px] z-[61] bg-white rounded-[24px] shadow-[0_4px_33px_rgba(0,0,0,0.25)] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-[24px] py-[18px]">
          <h3 className="font-montserrat font-medium text-primary-blue text-[20px] lg:text-[22px]">
            Likes
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.05] flex items-center justify-center transition-colors"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[20px]">
          <LikesList likes={likes} onRowClick={goToProfile} />
        </div>
      </div>
    </>,
    document.body
  );
}

function LikesList({
  likes,
  onRowClick,
}: {
  likes: StoryLike[];
  onRowClick: (userId: string) => void;
}) {
  if (likes.length === 0) {
    return (
      <p className="mt-[16px] text-center font-montserrat text-primary-blue/50 text-[13px]">
        No likes yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {likes.map((l, i) => {
        const name =
          [l.firstName, l.lastName].filter(Boolean).join(" ") || "Someone";
        const initial = (l.firstName ?? "?").charAt(0).toUpperCase();
        return (
          <li key={`${l._id}-${i}`}>
            {i > 0 && (
              <div className="h-px bg-[#C9C9C9] mx-[4px] my-[10px]" aria-hidden />
            )}
            <button
              type="button"
              onClick={() => onRowClick(l._id)}
              className="w-full flex items-center gap-[12px] py-[6px] cursor-pointer text-left hover:bg-black/[0.02] rounded-[10px] px-[4px] transition-colors"
            >
              <Avatar url={l.profilePicture ?? null} initial={initial} />
              <p className="flex-1 font-montserrat font-medium text-primary-blue text-[14px] lg:text-[15px] truncate">
                {name}
              </p>
              <HeartIcon
                width={16}
                height={16}
                filled
                className="text-[#D95F3B]"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Avatar({ url, initial }: { url: string | null; initial: string }) {
  const size = 36;
  const style = { width: size, height: size };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bustUrl(url, undefined)}
        alt=""
        style={style}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[13px] shrink-0"
    >
      {initial}
    </div>
  );
}

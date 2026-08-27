"use client";

import { useEffect, useRef } from "react";
import type { ThreadResponse } from "../../types/home";
import type { User } from "../../types/user";
import { CloseIcon } from "../../app/(app)/(dashboard)/icons";
import ThreadViewer from "./ThreadViewer";

type Props = {
  open: boolean;
  data: ThreadResponse | null;
  currentUser: User | null;
  onClose: () => void;
};

// Full-screen overlay that renders the composer's current draft through the
// real story viewer. Escape closes; the outer backdrop swallows clicks (the
// user must hit the ✕ to leave preview — matches the "modal" feel).
export default function PreviewOverlay({
  open,
  data,
  currentUser,
  onClose,
}: Props) {
  const musicSlotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // Prevent background page from scrolling while preview is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col">
      <div className="shrink-0 px-[24px] pt-[16px] pb-[8px] flex items-center gap-[12px]">
        <span className="shrink-0 font-montserrat font-semibold text-primary-blue/60 text-[13px] uppercase tracking-[0.5px]">
          Preview
        </span>
        <div
          ref={musicSlotRef}
          className="flex flex-1 min-w-0 items-center justify-center"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="shrink-0 cursor-pointer w-[36px] h-[36px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col relative">
        <ThreadViewer
          data={data}
          activeIndex={0}
          onSelectIndex={() => {}}
          currentUser={currentUser}
          musicPortalRef={musicSlotRef}
          preview
        />
      </div>
    </div>
  );
}

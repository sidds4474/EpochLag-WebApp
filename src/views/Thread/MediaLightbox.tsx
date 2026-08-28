"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeftIcon,
  CloseIcon,
  DownloadIcon,
  FlagIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from "../../app/(app)/(dashboard)/icons";
import OptionsMenu, {
  type OptionsMenuItem,
} from "../../components/OptionsMenu/OptionsMenu";

export type LightboxMediaItem = {
  type: "image";
  url: string;
};

type Props = {
  open: boolean;
  items: LightboxMediaItem[];
  startIndex: number;
  storyTitle?: string;
  canDelete?: boolean;
  onDelete?: (index: number) => void;
  onReport?: (index: number) => void;
  onClose: () => void;
};

export default function MediaLightbox({
  open,
  items,
  startIndex,
  storyTitle,
  canDelete = false,
  onDelete,
  onReport,
  onClose,
}: Props) {
  const [index, setIndex] = useState(startIndex);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight")
        setIndex((i) => Math.min(items.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, items.length, onClose]);

  if (!open || !mounted || items.length === 0) return null;

  const current = items[Math.max(0, Math.min(index, items.length - 1))];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  async function handleDownload() {
    try {
      const res = await fetch(current.url, { mode: "cors" });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${storyTitle || "media"}-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(current.url, "_blank", "noopener,noreferrer");
    }
  }

  const menuItems: OptionsMenuItem[] = [
    {
      label: "Download",
      onClick: handleDownload,
      icon: <DownloadIcon width={18} height={18} />,
    },
    {
      label: "Report",
      onClick: () => onReport?.(index),
      icon: <FlagIcon width={18} height={18} />,
    },
  ];
  if (canDelete) {
    menuItems.push({
      label: "Delete",
      onClick: () => onDelete?.(index),
      destructive: true,
      icon: <TrashIcon width={18} height={18} />,
    });
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/80 flex flex-col"
      onClick={onClose}
    >
      {/* Mobile header (< md): back, centered title, download */}
      <div
        className="md:hidden flex items-center justify-between px-[16px] py-[12px] bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="cursor-pointer w-[36px] h-[36px] flex items-center justify-center text-primary-blue"
        >
          <ChevronLeftIcon width={22} height={22} />
        </button>
        <p className="flex-1 text-center font-montserrat font-bold text-primary-blue text-[15px] truncate px-[8px]">
          {storyTitle || "Story"}
        </p>
        <button
          type="button"
          aria-label="Download"
          onClick={handleDownload}
          className="cursor-pointer w-[36px] h-[36px] flex items-center justify-center text-primary-blue"
        >
          <DownloadIcon width={22} height={22} />
        </button>
      </div>

      {/* Desktop/tablet top bar (md+): X close + ⋯ options */}
      <div
        className="hidden md:flex absolute top-[20px] right-[20px] z-[10] items-center gap-[10px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            aria-label="More options"
            onClick={() => setMenuOpen((v) => !v)}
            className="cursor-pointer w-[40px] h-[40px] rounded-full bg-white/95 hover:bg-white text-primary-blue flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
          >
            <MoreHorizontalIcon width={24} height={24} />
          </button>
          <OptionsMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={menuItems}
            align="right"
          />
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="cursor-pointer w-[40px] h-[40px] rounded-full bg-white/95 hover:bg-white text-primary-blue flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
        >
          <CloseIcon width={22} height={22} />
        </button>
      </div>

      {/* Media stage */}
      <div
        className="flex-1 flex items-center justify-center relative px-[8px] md:px-[80px] py-[16px] md:py-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {items.length > 1 && (
          <button
            type="button"
            aria-label="Previous"
            disabled={!hasPrev}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="hidden md:flex absolute left-[16px] top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-full bg-white/95 hover:bg-white text-primary-blue items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeftIcon width={24} height={24} />
          </button>
        )}

        <div className="w-full h-full max-w-[900px] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={storyTitle || "Story media"}
            className="max-w-full max-h-[calc(100vh-140px)] md:max-h-[calc(100vh-80px)] object-contain rounded-[12px]"
          />
        </div>

        {items.length > 1 && (
          <button
            type="button"
            aria-label="Next"
            disabled={!hasNext}
            onClick={() =>
              setIndex((i) => Math.min(items.length - 1, i + 1))
            }
            className="hidden md:flex absolute right-[16px] top-1/2 -translate-y-1/2 w-[48px] h-[48px] rounded-full bg-white/95 hover:bg-white text-primary-blue items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeftIcon
              width={24}
              height={24}
              style={{ transform: "rotate(180deg)" }}
            />
          </button>
        )}
      </div>

      {/* Mobile bottom-right ⋯ options */}
      <div
        className="md:hidden absolute bottom-[24px] right-[16px] z-[10]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            aria-label="More options"
            onClick={() => setMenuOpen((v) => !v)}
            className="cursor-pointer w-[40px] h-[40px] rounded-full bg-white/95 text-primary-blue flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
          >
            <MoreHorizontalIcon width={22} height={22} />
          </button>
          <OptionsMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={menuItems.filter((m) => m.label !== "Download")}
            align="right"
            direction="up"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

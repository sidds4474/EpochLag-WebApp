"use client";

import { useEffect, useRef, useState } from "react";
import { STORY_TAGS } from "../../../../lib/library/api";
import {
  MicrophoneIcon,
  GalleryIcon,
  VideoCameraAddIcon,
} from "../icons";

export type FilterMode = "recent" | "loved" | "deleted";
export type MediaTypeSlug = "audio" | "gallery" | "video";

export type FilterState = {
  mode: FilterMode;
  categories: string[];
  mediaTypes: MediaTypeSlug[];
};

export const DEFAULT_FILTERS: FilterState = {
  mode: "recent",
  categories: [],
  mediaTypes: [],
};

// Number of active filters distinct from defaults — surfaced on the
// Filters button as a small badge.
export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.mode !== "recent") n += 1;
  if (f.categories.length > 0) n += 1;
  if (f.mediaTypes.length > 0) n += 1;
  return n;
}

const MODE_OPTIONS: Array<{ id: FilterMode; label: string }> = [
  { id: "recent", label: "Recent" },
  { id: "loved", label: "Loved" },
  { id: "deleted", label: "Deleted" },
];

const MEDIA_OPTIONS: Array<{
  id: MediaTypeSlug;
  label: string;
  Icon: (props: { width?: number; height?: number }) => React.ReactElement;
}> = [
  { id: "audio", label: "Audio", Icon: MicrophoneIcon },
  { id: "gallery", label: "Photos", Icon: GalleryIcon },
  { id: "video", label: "Video", Icon: VideoCameraAddIcon },
];

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  applied: FilterState;
  onClose: () => void;
  onApply: (next: FilterState) => void;
};

export default function FiltersPopover({
  open,
  anchorRef,
  applied,
  onClose,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<FilterState>(applied);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Reset draft when popover opens so cancelled changes don't linger.
  useEffect(() => {
    if (open) setDraft(applied);
  }, [open, applied]);

  // Click-outside + Esc to close.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  const toggleCategory = (tag: string) => {
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.includes(tag)
        ? prev.categories.filter((t) => t !== tag)
        : [...prev.categories, tag],
    }));
  };

  const toggleMedia = (slug: MediaTypeSlug) => {
    setDraft((prev) => ({
      ...prev,
      mediaTypes: prev.mediaTypes.includes(slug)
        ? prev.mediaTypes.filter((t) => t !== slug)
        : [...prev.mediaTypes, slug],
    }));
  };

  return (
    <>
      {/* Mobile scrim */}
      <div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/20 md:hidden"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Filters"
        className="fixed left-[16px] right-[16px] bottom-[16px] md:absolute md:left-auto md:right-0 md:bottom-auto md:top-[calc(100%+8px)] md:w-[380px] z-50 bg-white rounded-[20px] shadow-[0_16px_48px_rgba(9,46,74,0.18)] border border-black/[0.06] overflow-hidden"
      >
        <div className="pt-[16px] px-[16px] pb-[4px] max-h-[70vh] md:max-h-none overflow-y-auto scrollbar-hide">
          {/* Mode segmented row */}
          <div className="flex items-center gap-[8px] mb-[14px]">
            {MODE_OPTIONS.map((m) => {
              const active = draft.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setDraft((prev) => ({ ...prev, mode: m.id }))}
                  className={`cursor-pointer px-[16px] py-[6px] rounded-full font-montserrat text-[13px] transition-colors ${
                    active
                      ? "bg-primary-blue text-white font-semibold"
                      : "bg-[#f0f0f0] text-primary-blue font-medium hover:bg-black/[0.08]"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Media Type */}
          <div className="mb-[14px]">
            <div className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[8px]">
              Media Type
            </div>
            <div className="flex items-center gap-[10px]">
              {MEDIA_OPTIONS.map((m) => {
                const active = draft.mediaTypes.includes(m.id);
                const Icon = m.Icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMedia(m.id)}
                    aria-label={m.label}
                    aria-pressed={active}
                    className={`cursor-pointer w-[40px] h-[40px] rounded-full flex items-center justify-center transition-colors ${
                      active
                        ? "bg-primary-blue text-white"
                        : "bg-[#f0f0f0] text-primary-blue hover:bg-black/[0.08]"
                    }`}
                  >
                    <Icon width={20} height={20} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[8px]">
              Categories
            </div>
            <div className="flex flex-wrap gap-[6px]">
              {STORY_TAGS.map((tag) => {
                const active = draft.categories.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleCategory(tag)}
                    aria-pressed={active}
                    className={`cursor-pointer px-[12px] py-[4px] rounded-full font-montserrat text-[12px] transition-colors border ${
                      active
                        ? "bg-primary-blue text-white border-primary-blue font-semibold"
                        : "bg-white text-primary-blue border-black/[0.14] font-medium hover:bg-black/[0.03]"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-[16px] pt-[8px] pb-[14px]">
          <button
            type="button"
            onClick={() => setDraft(DEFAULT_FILTERS)}
            className="cursor-pointer font-montserrat text-primary-blue/60 text-[13px] hover:opacity-80 transition-opacity"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="cursor-pointer bg-primary-orange text-white font-montserrat font-semibold text-[13px] px-[24px] py-[9px] rounded-full hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}

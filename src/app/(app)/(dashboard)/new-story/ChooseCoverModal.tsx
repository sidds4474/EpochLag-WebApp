"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchCardGradients,
  type GradientCover,
} from "../../../../lib/create/api";
import { compressImage } from "../../../../lib/images";
import { CloseIcon, UploadIcon } from "../icons";

// Result the picker returns to the composer. Curated → { imageUrl }, upload
// → { file, preview }. Composer decides how to persist (imageUrl JSON PUT vs
// file multipart PUT on the user-card).
export type CoverPick =
  | { kind: "curated"; imageUrl: string; preview: string }
  | { kind: "upload"; file: File; preview: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (pick: CoverPick) => void;
  /** Optional — highlights the currently-selected curated URL in the grid. */
  selectedUrl?: string | null;
};

// Curated grid module-level cache — the endpoint returns a static list of
// gradient covers, so re-fetching on every open wastes bandwidth. First open
// hydrates; subsequent opens seed synchronously.
let cachedCovers: GradientCover[] | null = null;

export default function ChooseCoverModal({
  open,
  onClose,
  onPick,
  selectedUrl,
}: Props) {
  const [covers, setCovers] = useState<GradientCover[]>(cachedCovers ?? []);
  const [loading, setLoading] = useState(cachedCovers === null);
  const [picked, setPicked] = useState<string | null>(selectedUrl ?? null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (cachedCovers !== null) {
      setCovers(cachedCovers);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchCardGradients()
      .then((list) => {
        if (cancelled) return;
        cachedCovers = list;
        setCovers(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPicked(selectedUrl ?? null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, selectedUrl, onClose]);

  async function handleUpload(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImage(file);
      const preview = URL.createObjectURL(compressed);
      onPick({ kind: "upload", file: compressed, preview });
      onClose();
    } catch {
      const preview = URL.createObjectURL(file);
      onPick({ kind: "upload", file, preview });
      onClose();
    }
  }

  function handleChoose() {
    if (!picked) return;
    onPick({ kind: "curated", imageUrl: picked, preview: picked });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex justify-end" onClick={onClose}>
      <div
        className="w-full lg:max-w-[440px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] pt-[24px] pb-[16px]">
          {/* Mobile mirrors the Figma spec: back arrow + inline title. Desktop
              keeps the panel's original title + close-button layout. */}
          <div className="flex items-center gap-[12px] lg:hidden">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 3l-5 5 5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h2 className="font-montserrat font-bold text-primary-blue text-[18px]">
              Choose Cover
            </h2>
          </div>
          <h2 className="hidden lg:block font-montserrat font-bold text-primary-blue text-[20px]">
            Choose Cover
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="hidden lg:flex cursor-pointer w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px]">
          <div className="grid grid-cols-3 gap-[12px]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer aspect-square rounded-[12px] bg-[#ededed] border border-[#d9d9d9] flex flex-col items-center justify-center gap-[6px] text-primary-blue hover:bg-[#e3e3e3] transition-colors"
            >
              <UploadIcon width={22} height={22} />
              <span className="font-montserrat font-medium text-[13px]">
                Upload
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />

            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[12px] bg-[#f3f3f3] animate-pulse"
                />
              ))}

            {!loading &&
              covers.map((c, i) => {
                const url = c.imageUrl || c.url;
                if (!url) return null;
                const active = picked === url;
                return (
                  <button
                    key={c._id ?? `${url}-${i}`}
                    type="button"
                    onClick={() => setPicked(url)}
                    className={`relative cursor-pointer aspect-square rounded-[12px] overflow-hidden focus:outline-none transition-[box-shadow] ${
                      active
                        ? "ring-[3px] ring-primary-orange"
                        : "ring-1 ring-black/[0.06]"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
          </div>
        </div>

        <div className="px-[24px] pt-[8px] pb-[20px]">
          <button
            type="button"
            onClick={handleChoose}
            disabled={!picked}
            className="cursor-pointer w-full h-[48px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[15px] hover:brightness-95 transition-[filter] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Choose Image
          </button>
        </div>
      </div>
    </div>
  );
}

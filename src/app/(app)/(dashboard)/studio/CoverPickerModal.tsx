"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { uploadBackgroundPicture } from "../../../../lib/profile/api";
import {
  fetchCardGradients,
  type GradientCover,
} from "../../../../lib/create/api";
import { compressImage } from "../../../../lib/images";
import { CloseIcon, UploadIcon } from "../icons";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Reuse the gradient list from the story cover picker — no separate
// banner-cover endpoint exists, and the same landscape gradients read
// fine when cropped to the cover strip's aspect. Module-level cache so
// reopens are instant.
let cachedCovers: GradientCover[] | null = null;

export default function CoverPickerModal({ open, onClose }: Props) {
  const { updateUser } = useAuth();
  const [covers, setCovers] = useState<GradientCover[]>(cachedCovers ?? []);
  const [loading, setLoading] = useState(cachedCovers === null);
  const [uploading, setUploading] = useState(false);
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
  }, [open, onClose]);

  async function uploadFile(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 2000, quality: 0.85 });
      const next = await uploadBackgroundPicture(compressed);
      updateUser(next);
      toast.success("Cover updated");
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Couldn't update cover";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  async function pickCurated(url: string) {
    // BE background endpoint only accepts multipart file — download the
    // gradient client-side, wrap it as a File, then upload. Slower than
    // "PUT URL" but keeps the wire contract identical to user uploads.
    if (uploading) return;
    setUploading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "cover.jpg", { type: blob.type || "image/jpeg" });
      const next = await uploadBackgroundPicture(file);
      updateUser(next);
      toast.success("Cover updated");
      onClose();
    } catch {
      toast.error("Couldn't update cover");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(f: File | null | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    void uploadFile(f);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex justify-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[520px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
      >
        <header className="flex items-center justify-between px-[24px] pt-[24px] pb-[16px]">
          <h2 className="font-montserrat font-bold text-primary-blue text-[20px]">
            Choose Cover
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px]">
          {/* Upload slot + grid. Landscape aspect on tiles so users see
              roughly what a gradient will look like when cropped to the
              header banner. */}
          <div className="grid grid-cols-2 gap-[12px]">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer aspect-[16/9] rounded-[12px] bg-[#ededed] border border-[#d9d9d9] flex flex-col items-center justify-center gap-[6px] text-primary-blue hover:bg-[#e3e3e3] transition-colors disabled:opacity-60"
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
                  className="aspect-[16/9] rounded-[12px] bg-[#f3f3f3] animate-pulse"
                />
              ))}

            {!loading &&
              covers.map((c, i) => {
                const url = c.imageUrl || c.url;
                if (!url) return null;
                return (
                  <button
                    key={c._id ?? `${url}-${i}`}
                    type="button"
                    disabled={uploading}
                    onClick={() => pickCurated(url)}
                    className="relative cursor-pointer aspect-[16/9] rounded-[12px] overflow-hidden ring-1 ring-black/[0.06] hover:brightness-95 transition-[filter] disabled:opacity-60"
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
      </div>
    </div>
  );
}

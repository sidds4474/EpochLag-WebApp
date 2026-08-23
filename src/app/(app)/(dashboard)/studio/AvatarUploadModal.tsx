"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { uploadProfilePicture } from "../../../../lib/profile/api";
import { compressImage } from "../../../../lib/images";
import { CloseIcon, UploadIcon } from "../icons";

type Props = {
  open: boolean;
  onClose: () => void;
};

// Avatar picker + uploader. Provides a native file picker + a client-
// side square-crop preview via a canvas centered-crop pass (browsers
// don't expose a first-party cropper). Users see the preview before
// confirming, then upload runs the picture through compressImage to
// keep payloads under 1 MB.
export default function AvatarUploadModal({ open, onClose }: Props) {
  const { updateUser } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setPreview(null);
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

  useEffect(() => {
    if (!preview) return;
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function pickFile(next: File | null | undefined) {
    if (!next || !next.type.startsWith("image/")) return;
    // 1:1 center-crop pass via canvas so the uploaded avatar always
    // reads circular no matter the source aspect.
    const cropped = await centerSquareCrop(next);
    setFile(cropped);
    setPreview(URL.createObjectURL(cropped));
  }

  async function handleConfirm() {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1000, quality: 0.85 });
      const next = await uploadProfilePicture(compressed);
      updateUser(next);
      toast.success("Photo updated");
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Couldn't update photo";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center px-[16px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
      >
        <header className="flex items-center justify-between px-[20px] pt-[16px] pb-[8px]">
          <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
            Update photo
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <div className="px-[20px] pt-[8px] pb-[20px] flex flex-col items-center gap-[16px]">
          <div className="w-[180px] h-[180px] rounded-full overflow-hidden bg-[#ededed] flex items-center justify-center">
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-montserrat text-primary-blue/50 text-[13px] text-center px-[16px]">
                Pick an image to see the preview
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer inline-flex items-center gap-[8px] bg-[#ededed] text-primary-blue rounded-full h-[44px] px-[20px] font-montserrat font-medium text-[14px] hover:bg-[#e3e3e3] transition-colors"
          >
            <UploadIcon width={16} height={16} />
            {file ? "Choose another" : "Choose photo"}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!file || uploading}
            className="cursor-pointer w-full h-[48px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[15px] hover:brightness-95 transition-[filter] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Canvas-based center square crop. Returns a fresh File with the same
// mime type. Runs off-thread via ImageBitmap where available and falls
// back to <img> loading — both cheap.
async function centerSquareCrop(file: File): Promise<File> {
  const bitmap = await loadBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - size) / 2;
  const sy = (bitmap.height - size) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, size, size);
  const type = file.type || "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.92)
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through to Image */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

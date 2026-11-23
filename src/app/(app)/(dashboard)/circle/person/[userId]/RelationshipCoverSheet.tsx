"use client";

// Right-side slide-in sheet for picking / uploading the pair's shared cover.
// Mirrors /studio/CoverPickerModal's visual pattern (gradient grid + Upload
// tile) but uses the relationship-mode 3-step Cloudinary flow for upload
// and a dedicated "Remove cover" action.

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../../lib/api/client";
import {
  coverErrorMessage,
  fetchCoverUploadParams,
  patchCirclePerson,
  uploadToCloudinaryRaw,
} from "../../../../../../lib/circle/api";
import {
  fetchCardGradients,
  type GradientCover,
} from "../../../../../../lib/create/api";
import { compressImage } from "../../../../../../lib/images";
import { CloseIcon, UploadIcon } from "../../../icons";
import CoverCropModal from "./CoverCropModal";

type Props = {
  open: boolean;
  userId: string;
  hasCurrentCover: boolean;
  onClose: () => void;
  onSaved: (hostedUrl: string | null) => void;
};

// Module-level cache so re-opens are instant across the session.
let cachedCovers: GradientCover[] | null = null;

// Soft gradient fallbacks so a tile is never blank when a curated image is
// slow or 429s — same reasoning as the Studio/Moments pickers.
const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg, #f2d0a4 0%, #d78a5a 55%, #6b3a2a 100%)",
  "linear-gradient(135deg, #a8c5e0 0%, #6d8fb5 55%, #3a5877 100%)",
  "linear-gradient(135deg, #f5b7a1 0%, #d97a5a 55%, #6b3a2a 100%)",
  "linear-gradient(135deg, #d0dae5 0%, #8ca3b7 100%)",
  "linear-gradient(135deg, #f5c9a1 0%, #d78a5a 100%)",
  "linear-gradient(135deg, #cdd7c2 0%, #8fa37a 100%)",
];

export default function RelationshipCoverSheet({
  open,
  userId,
  hasCurrentCover,
  onClose,
  onSaved,
}: Props) {
  const [covers, setCovers] = useState<GradientCover[]>(cachedCovers ?? []);
  const [loading, setLoading] = useState(cachedCovers === null);
  const [busy, setBusy] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (cachedCovers !== null) {
      setCovers(cachedCovers);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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

  // Lock scroll + ESC-to-close while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, busy]);

  // Picked files route through the cropper first. The cropper hands back
  // a blob + filename, which then goes through the 3-step upload.
  function handleFilePick(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/") || busy) return;
    setPendingCrop(file);
  }

  // 3-step upload used for user-picked (and cropped) files:
  //   1. POST /cover/upload-params { fileName, fileSize, mimeType } → params
  //   2. POST uploadUrl (multipart to Cloudinary) → { secure_url }
  //   3. PATCH /api/circles/people/:id with coverImageUrl: secure_url
  async function uploadCroppedBlob(blob: Blob, filename: string) {
    if (busy) return;
    setPendingCrop(null);
    setBusy(true);
    try {
      const compressed = await compressImage(
        new File([blob], filename, { type: blob.type || "image/jpeg" }),
        { maxWidth: 2000, quality: 0.85 },
      );
      const uploadFile = new File([compressed], filename, {
        type: compressed.type || "image/jpeg",
      });
      const paramsResp = await fetchCoverUploadParams(userId, {
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
      });
      if (
        !paramsResp?.uploadUrl ||
        !paramsResp?.cloudinaryParams ||
        !paramsResp?.publicId
      ) {
        throw new Error("Server didn't return upload params");
      }
      const cloudResp = await uploadToCloudinaryRaw(
        paramsResp.uploadUrl,
        paramsResp.cloudinaryParams,
        uploadFile,
      );
      const hostedUrl = cloudResp.secure_url;
      await patchCirclePerson(userId, { coverImageUrl: hostedUrl });
      toast.success("Cover image updated successfully");
      onSaved(hostedUrl);
      onClose();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      toast.error(`Failed to update cover image: ${coverErrorMessage(code)}`);
    } finally {
      setBusy(false);
    }
  }

  // Hosted gradients don't need re-upload — PATCH the URL directly so BE
  // stores it on the relationship. Avoids a client-side CORS fetch against
  // the S3 bucket and matches Studio's curated-URL path.
  async function handleGradientPick(url: string) {
    if (busy) return;
    setBusy(true);
    try {
      await patchCirclePerson(userId, { coverImageUrl: url });
      toast.success("Cover image updated successfully");
      onSaved(url);
      onClose();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      toast.error(`Failed to update cover image: ${coverErrorMessage(code)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!hasCurrentCover || busy) return;
    setBusy(true);
    try {
      await patchCirclePerson(userId, { coverImageUrl: null });
      toast.success("Cover removed");
      onSaved(null);
      onClose();
    } catch {
      toast.error("Couldn't remove cover. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] bg-black/40 flex justify-end"
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full lg:max-w-[520px] h-full bg-white lg:shadow-[-10px_0_40px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden animate-[slide-in-right_200ms_ease-out]"
      >
        <header className="flex items-center justify-between px-[24px] pt-[24px] pb-[16px]">
          <h2 className="font-montserrat font-bold text-primary-blue text-[20px]">
            Relationship Cover
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[16px]">
          <div className="grid grid-cols-2 gap-[12px]">
            <button
              type="button"
              disabled={busy}
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
              onChange={(e) => handleFilePick(e.target.files?.[0])}
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
                    disabled={busy}
                    onClick={() => handleGradientPick(url)}
                    style={{
                      background:
                        FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length],
                    }}
                    className="relative cursor-pointer aspect-[16/9] rounded-[12px] overflow-hidden ring-1 ring-black/[0.06] hover:brightness-95 transition-[filter] disabled:opacity-60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </button>
                );
              })}
          </div>
        </div>

        {hasCurrentCover && (
          <div className="border-t border-black/5 px-[24px] py-[16px]">
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="w-full rounded-full py-[12px] border border-[#2C2C2C]/30 font-montserrat font-semibold text-[14px] text-[#2C2C2C] hover:bg-black/[0.03] disabled:opacity-60"
            >
              Remove cover
            </button>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
            <div className="w-[36px] h-[36px] border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
            <p className="mt-[16px] font-montserrat text-[14px]">
              Uploading your cover…
            </p>
          </div>
        )}
      </div>

      {pendingCrop && (
        <CoverCropModal
          file={pendingCrop}
          onCancel={() => setPendingCrop(null)}
          onConfirm={(blob, filename) => {
            void uploadCroppedBlob(blob, filename);
          }}
        />
      )}
    </div>
  );
}

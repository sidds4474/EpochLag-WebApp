"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, CloseIcon, UploadIcon } from "../icons";
import CameraCapture from "./CameraCapture";

type Props = {
  open: boolean;
  kind: "image" | "video";
  onClose: () => void;
  onFile: (file: File) => void;
};

// Shared modal for the Image and Video pills. Two actions: upload from
// device (native picker + drag-and-drop) or record with the camera
// (opens the in-app CameraCapture surface).
export default function UploadMediaModal({ open, kind, onClose, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset per-open state so a lingering camera view doesn't reappear when
  // the caller flips the modal back to the "video" or "image" pill.
  useEffect(() => {
    if (!open) setCameraOpen(false);
  }, [open]);

  if (!open && !cameraOpen) return null;

  const title = kind === "image" ? "Add images" : "Add videos";
  const accept = kind === "image" ? "image/*" : "video/*";
  const recordLabel = kind === "image" ? "Take photo" : "Record video";

  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    onFile(f);
    onClose();
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[65] bg-black/40 flex items-center justify-center px-[16px]"
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[440px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-[24px] pt-[20px] pb-[8px]">
              <h3 className="font-montserrat font-bold text-primary-blue text-[18px]">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center hover:bg-[#e3e3e3] transition-colors"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>

            <div className="px-[24px] pb-[24px] flex flex-col gap-[12px]">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`rounded-[16px] py-[28px] px-[24px] flex flex-col items-center justify-center gap-[14px] transition-colors ${
                  dragOver
                    ? "bg-primary-orange/10 border-2 border-dashed border-primary-orange"
                    : "bg-[#ededed] border-2 border-dashed border-transparent"
                }`}
              >
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer inline-flex items-center gap-[8px] bg-primary-orange text-white rounded-full h-[44px] px-[24px] font-montserrat font-medium text-[14px] hover:brightness-95 transition-[filter]"
                >
                  <UploadIcon width={16} height={16} />
                  Upload
                </button>
                <p className="font-montserrat text-primary-blue/70 text-[13px] text-center">
                  Choose {kind === "image" ? "an image" : "a video"} or drag and drop it here
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              <div className="flex items-center gap-[10px]">
                <div className="flex-1 h-px bg-black/[0.08]" />
                <span className="font-montserrat text-primary-blue/50 text-[12px]">
                  or
                </span>
                <div className="flex-1 h-px bg-black/[0.08]" />
              </div>

              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="cursor-pointer w-full inline-flex items-center justify-center gap-[8px] bg-white border-[1.5px] border-primary-blue text-primary-blue rounded-full h-[44px] font-montserrat font-medium text-[14px] hover:bg-primary-blue/[0.04] transition-colors"
              >
                <CameraIcon width={16} height={16} />
                {recordLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <CameraCapture
        open={cameraOpen}
        mode={kind}
        onCancel={() => setCameraOpen(false)}
        onCapture={(file) => {
          setCameraOpen(false);
          onFile(file);
          onClose();
        }}
      />
    </>
  );
}

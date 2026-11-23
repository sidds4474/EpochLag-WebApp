"use client";

// Inline cropper used by the Cover sheet. After the user picks a file, this
// shows the image with a draggable/zoomable crop box locked to a landscape
// aspect so the hero banner renders what the user framed (WYSIWYG).
//
// On "Choose", we draw the cropped region into a canvas, export as JPEG
// blob, and hand it back to the parent for upload.

import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const COVER_ASPECT = 16 / 9;

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: Blob, filename: string) => void;
};

export default function CoverCropModal({ file, onCancel, onConfirm }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixelArea, setPixelArea] = useState<Area | null>(null);
  const [exporting, setExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Portal target — only after mount so SSR doesn't trip on `document`.
  useEffect(() => setMounted(true), []);

  // Read the file once into a stable data URL. Object URL would be faster but
  // the Cropper sometimes can't layout before revoke and we end up with a
  // blank frame.
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageSrc(reader.result);
    };
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const onCropComplete = useCallback((_: Area, area: Area) => {
    setPixelArea(area);
  }, []);

  async function handleChoose() {
    if (!imageSrc || !pixelArea || exporting) return;
    setExporting(true);
    try {
      const blob = await drawCropToBlob(imageSrc, pixelArea);
      onConfirm(blob, file.name || "cover.jpg");
    } catch {
      setExporting(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex items-center justify-between px-[16px] py-[12px] text-white">
        <button
          type="button"
          onClick={onCancel}
          disabled={exporting}
          className="font-montserrat text-[14px] disabled:opacity-60"
        >
          Cancel
        </button>
        <h2 className="font-ivy text-[18px]">Crop</h2>
        <button
          type="button"
          onClick={handleChoose}
          disabled={!pixelArea || exporting}
          className="font-montserrat font-semibold text-[14px] text-primary-orange disabled:opacity-60"
        >
          {exporting ? "Processing…" : "Choose"}
        </button>
      </header>
      <div className="relative flex-1">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={COVER_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition
          />
        )}
      </div>
      <div className="px-[24px] py-[20px] bg-black">
        <label className="block text-white/80 font-montserrat text-[12px] mb-[8px]">
          Zoom
        </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-primary-orange"
          disabled={exporting}
        />
      </div>
    </div>,
    document.body,
  );
}

// Load the image into an HTMLImageElement, then draw the cropped pixel
// rectangle into a canvas and read it back as a JPEG blob.
async function drawCropToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.9,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

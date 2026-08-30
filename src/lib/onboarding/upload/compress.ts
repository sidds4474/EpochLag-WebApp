// Media compression before Cloudinary upload.
//
// Fallback semantics (Part 3, §Step 2): on failure, return the source blob
// unchanged rather than blocking the user. Callers should trust the returned
// blob is uploadable.
//
// v1: canvas-based image resize (JPEG re-encode). Video + audio pass
// through unchanged — server-side transcoding covers those for now. If
// bandwidth becomes a problem for long videos, wire ffmpeg.wasm behind a
// dynamic import (keeps the main bundle lean).

import type { MediaCategory } from "./helpers";

export type CompressInput = {
  file: Blob;
  mimeType: string;
  category: MediaCategory;
};

export type CompressResult = {
  blob: Blob;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  compressed: boolean;
};

const IMAGE_MAX_DIM = 2048;
const IMAGE_TARGET_MIME = "image/jpeg";
const IMAGE_QUALITY = 0.82;
const IMAGE_MIN_SIZE_FOR_COMPRESSION = 300 * 1024; // <300KB → pass through

export async function compressMedia({
  file,
  mimeType,
  category,
}: CompressInput): Promise<CompressResult> {
  const originalSize = file.size;

  // Video / audio → pass through unchanged (server-side transcoding covers).
  if (category === "video" || category === "audio") {
    return {
      blob: file,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      compressed: false,
    };
  }

  // Tiny images → pass through.
  if (file.size < IMAGE_MIN_SIZE_FOR_COMPRESSION) {
    return {
      blob: file,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      compressed: false,
    };
  }

  // HEIC images: browsers can't decode them via <img> directly. Skip
  // compression — the server can transcode.
  if (
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    mimeType === "image/heic-sequence"
  ) {
    return {
      blob: file,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      compressed: false,
    };
  }

  try {
    const compressed = await compressImage(file);
    // If compression made it BIGGER (rare — small images with high entropy
    // sometimes do), prefer the source.
    if (compressed.size >= file.size) {
      return {
        blob: file,
        mimeType,
        originalSize,
        compressedSize: originalSize,
        compressed: false,
      };
    }
    return {
      blob: compressed,
      mimeType: IMAGE_TARGET_MIME,
      originalSize,
      compressedSize: compressed.size,
      compressed: true,
    };
  } catch {
    // Any decode / canvas / encode failure → source wins.
    return {
      blob: file,
      mimeType,
      originalSize,
      compressedSize: originalSize,
      compressed: false,
    };
  }
}

async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, IMAGE_MAX_DIM);
  const canvas = getCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  drawBitmap(ctx, bitmap, width, height);
  releaseBitmap(bitmap);
  return canvasToBlob(canvas, IMAGE_TARGET_MIME, IMAGE_QUALITY);
}

// ---- helpers (kept below so the top of the file stays readable) ----

type Bitmap =
  | ImageBitmap
  | (HTMLImageElement & { close?: () => void });

async function createBitmap(file: Blob): Promise<Bitmap> {
  if (typeof createImageBitmap === "function") {
    return await createImageBitmap(file);
  }
  // Fallback via <img>.
  return await new Promise<Bitmap>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img as unknown as Bitmap);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

function releaseBitmap(bitmap: Bitmap): void {
  if ("close" in bitmap && typeof bitmap.close === "function") {
    bitmap.close();
  }
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = Math.min(max / w, max / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function getCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") {
    // OffscreenCanvas keeps compression off the main thread when future
    // callers move this into a worker. For now we still run on main; the
    // difference is zero-cost.
    return new OffscreenCanvas(w, h) as unknown as HTMLCanvasElement;
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function drawBitmap(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  bitmap: Bitmap,
  w: number,
  h: number
): void {
  (ctx as CanvasRenderingContext2D).drawImage(bitmap as CanvasImageSource, 0, 0, w, h);
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mimeType: string,
  quality: number
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: mimeType, quality });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      mimeType,
      quality
    );
  });
}

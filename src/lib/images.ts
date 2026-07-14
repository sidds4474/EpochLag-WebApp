// Append a cache-bust query param derived from the user's updatedAt so that
// image caches (browser, CDN) refetch when the underlying S3 object has been
// overwritten. Our BE keys profile/background pictures by userId, so the URL
// itself never changes — clients would serve stale bytes indefinitely without
// this. Mirrors the mobile app's pattern; both platforms use updatedAt as the
// server-owned version key.
//
// When updatedAt is missing or unparseable (e.g. nested user summaries from
// the BE that don't include it), returns the URL unchanged — best-effort
// stale is the accepted trade-off there.
type BustVersion = string | number | Date | null | undefined;

export function bustUrl(url: string, version: BustVersion): string;
export function bustUrl(url: null | undefined, version: BustVersion): null;
export function bustUrl(
  url: string | null | undefined,
  version: BustVersion
): string | null;
export function bustUrl(
  url: string | null | undefined,
  version: BustVersion
): string | null {
  if (!url) return null;
  const key =
    typeof version === "number"
      ? version
      : version instanceof Date
        ? version.getTime()
        : version
          ? Date.parse(version)
          : NaN;
  if (!key || Number.isNaN(key)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${key}`;
}

export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
};

// Resize + re-encode a browser File to keep upload payloads under the BE limit.
// Matches the project's manual pattern (see 2000px @ q80 in git history).
export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.8,
    mimeType = "image/jpeg",
  } = opts;

  if (!file.type.startsWith("image/")) return file;

  const img = await loadImage(file);
  const { width, height } = fitWithin(img.width, img.height, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: mimeType, lastModified: Date.now() });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    image.src = url;
  });
}

function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) return { width, height };
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

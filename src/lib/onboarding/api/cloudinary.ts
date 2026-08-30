// Direct-to-Cloudinary uploader. Client sends compressed bytes + pre-signed
// params straight to Cloudinary (never proxied through our BE — defeats the
// point of pre-signed uploads). Progress via XHR.upload.onprogress.
//
// v1: single-shot upload. Cloudinary accepts up to 100MB in one POST. If we
// see failures on long videos in production, wire chunked upload via
// X-Unique-Upload-Id + Content-Range (see Part 3 §Step 4).

export type CloudinaryUploadParams = {
  api_key: string;
  timestamp: number | string;
  signature: string;
  folder?: string;
  public_id?: string;
  resource_type?: string;
  eager_async?: boolean | string;
  notification_url?: string;
  [key: string]: unknown;
};

export type CloudinaryUploadResponse = {
  public_id?: string;
  secure_url?: string;
  url?: string;
  bytes?: number;
  resource_type?: string;
  [key: string]: unknown;
};

export type UploadProgress = {
  loaded: number;
  total: number;
  percent: number; // 0-100
};

export type CloudinaryUploadArgs = {
  uploadUrl: string;
  uploadParams: CloudinaryUploadParams;
  file: Blob;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
};

export function uploadToCloudinary(
  args: CloudinaryUploadArgs
): Promise<CloudinaryUploadResponse> {
  const { uploadUrl, uploadParams, file, onProgress, signal } = args;

  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(uploadParams)) {
      if (v === undefined || v === null) continue;
      form.append(k, typeof v === "string" ? v : String(v));
    }
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    // Cloudinary rejects credentials/Authorization headers on the upload
    // endpoint — do not set either.

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        const percent = evt.total > 0 ? Math.round((evt.loaded / evt.total) * 100) : 0;
        onProgress({ loaded: evt.loaded, total: evt.total, percent });
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
          resolve(parsed);
        } catch {
          resolve({} as CloudinaryUploadResponse);
        }
      } else {
        reject(
          new Error(
            `Cloudinary upload failed: ${xhr.status} ${xhr.statusText || ""}`
          )
        );
      }
    };

    xhr.onerror = () => reject(new Error("Cloudinary upload network error"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(form);
  });
}

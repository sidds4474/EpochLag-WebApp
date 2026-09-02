"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "../icons";

type Props = {
  open: boolean;
  mode: "image" | "video";
  onCancel: () => void;
  onCapture: (file: File) => void;
};

// In-app camera preview for photos + videos. Uses getUserMedia for the
// live stream, canvas.toBlob for photo capture, and MediaRecorder for
// video capture. Mobile fills the viewport; tablet + desktop dock the
// preview inside a centered rounded card so the layout doesn't stretch
// awkwardly on large screens.
export default function CameraCapture({
  open,
  mode,
  onCancel,
  onCapture,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  // Only expose the flip-camera button when the device actually has more
  // than one video input. On single-camera desktops the button would
  // otherwise be a no-op that just mirrored the preview via CSS, which
  // reads as "flip is broken."
  useEffect(() => {
    if (!open) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    let cancelled = false;
    // enumerateDevices requires a granted permission to return labels, but
    // it always returns the *count*, which is what we need here.
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        const cams = devices.filter((d) => d.kind === "videoinput").length;
        setHasMultipleCameras(cams > 1);
      })
      .catch(() => {
        if (!cancelled) setHasMultipleCameras(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, stream]);

  const stopStream = useCallback(() => {
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
    }
  }, [stream]);

  const startStream = useCallback(async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: mode === "video",
      });
      setStream(s);
      const el = videoRef.current;
      if (el) {
        el.srcObject = s;
        // Safari needs playsInline + muted for autoplay to succeed.
        el.muted = true;
        el.playsInline = true;
        await el.play().catch(() => {});
      }
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera access was blocked. Enable it in your browser settings and try again."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No camera was found on this device."
            : "Couldn't access the camera. Try again.";
      setError(message);
    }
  }, [facingMode, mode]);

  // Boot / teardown the stream around open + facing-mode changes. Preview
  // suppresses the live stream so we can show the captured artifact.
  useEffect(() => {
    if (!open) return;
    if (preview) return;
    void startStream();
    return () => {
      stopStream();
      setStream(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode, preview]);

  // Reset per-open state when the modal closes.
  useEffect(() => {
    if (open) return;
    setRecording(false);
    setElapsedMs(0);
    setPreview((p) => {
      if (p?.url) URL.revokeObjectURL(p.url);
      return null;
    });
    setError(null);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const doCapturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const url = URL.createObjectURL(file);
        setPreview({ file, url });
        stopStream();
        setStream(null);
      },
      "image/jpeg",
      0.92
    );
  }, [stream, stopStream]);

  const startRecording = useCallback(() => {
    if (!stream || recording) return;
    // Prefer webm first (universally supported by Chromium + Firefox for
    // MediaRecorder) with mp4 as a Safari-only fallback. Reversing this
    // order caused Chrome to pick mp4 and produce clips with an unusable
    // duration atom, so the <video> preview loaded but never advanced past
    // 0:00 or drew the first frame.
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    const mimeType = candidates.find(
      (t) =>
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(t)
    );
    const rec = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const type = rec.mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `video-${Date.now()}.${ext}`, { type });
      const url = URL.createObjectURL(file);
      setPreview({ file, url });
      stopStream();
      setStream(null);
    };
    recorderRef.current = rec;
    rec.start();
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setRecording(true);
    tickRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 250);
  }, [stream, recording, stopStream]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (rec.state !== "inactive") rec.stop();
    recorderRef.current = null;
    setRecording(false);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const retake = useCallback(() => {
    setPreview((p) => {
      if (p?.url) URL.revokeObjectURL(p.url);
      return null;
    });
    setElapsedMs(0);
  }, []);

  const usePreview = useCallback(() => {
    if (!preview) return;
    onCapture(preview.file);
    // URL revocation is deferred so the composer's block preview can keep
    // using it if the caller wraps it — safe because addMediaBlock reads
    // the File and creates its own preview URL.
    URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview, onCapture]);

  if (!open || !mounted) return null;

  const isVideo = mode === "video";
  const timer = formatTimer(elapsedMs);

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center md:px-[24px]">
      <div
        className="relative w-full h-full md:h-[85vh] md:max-h-[760px] md:max-w-[560px] lg:max-w-[640px] bg-black md:rounded-[24px] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Preview / live camera */}
        <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center">
          {error ? (
            <div className="text-center px-[24px] py-[40px]">
              <p className="font-montserrat text-white text-[14px] leading-[20px] mb-[16px]">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void startStream()}
                className="cursor-pointer bg-primary-orange text-white rounded-full h-[40px] px-[20px] font-montserrat font-medium text-[14px] hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
            </div>
          ) : preview ? (
            isVideo ? (
              <video
                key={preview.url}
                src={preview.url}
                className="w-full h-full object-contain"
                controls
                playsInline
                preload="auto"
                // MediaRecorder-generated webm blobs don't have a duration
                // atom, so Chrome initially reports duration = Infinity and
                // never draws a first frame. Seeking to a huge time and
                // back forces the browser to walk the file, compute the
                // real duration, and render frame 0.
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (!Number.isFinite(el.duration)) {
                    const restore = () => {
                      el.currentTime = 0;
                      el.removeEventListener("timeupdate", restore);
                    };
                    el.addEventListener("timeupdate", restore);
                    el.currentTime = 1e9;
                  }
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <video
              ref={videoRef}
              className={`w-full h-full object-contain ${
                facingMode === "user" ? "scale-x-[-1]" : ""
              }`}
              playsInline
              muted
              autoPlay
            />
          )}

          {/* Top-right close */}
          <button
            type="button"
            onClick={() => {
              stopRecording();
              stopStream();
              onCancel();
            }}
            aria-label="Close"
            className="absolute top-[16px] right-[16px] w-[36px] h-[36px] rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
          >
            <CloseIcon width={14} height={14} />
          </button>

          {/* Timer overlay while recording */}
          {isVideo && recording && !preview && (
            <div className="absolute top-[16px] left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-[12px] py-[6px] flex items-center gap-[8px]">
              <span className="w-[8px] h-[8px] rounded-full bg-[#D95F3B] animate-pulse" />
              <span className="font-montserrat font-medium text-white text-[13px] tabular-nums">
                {timer}
              </span>
            </div>
          )}

          {/* Camera flip — only rendered when the device exposes more than
              one video input. Prevents the button from becoming a CSS-only
              mirror on single-camera desktops. */}
          {!preview && !error && hasMultipleCameras && (
            <button
              type="button"
              onClick={() =>
                setFacingMode((m) => (m === "user" ? "environment" : "user"))
              }
              aria-label="Flip camera"
              className="absolute top-[16px] left-[16px] w-[36px] h-[36px] rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
            >
              <FlipCameraIcon />
            </button>
          )}
        </div>

        {/* Controls bar */}
        <div className="shrink-0 bg-black/85 md:bg-black flex items-center justify-center gap-[24px] px-[24px] py-[20px]">
          {preview ? (
            <>
              <button
                type="button"
                onClick={retake}
                className="cursor-pointer bg-white/10 border border-white/40 text-white rounded-full h-[44px] px-[24px] font-montserrat font-medium text-[14px] hover:bg-white/20 transition-colors"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={usePreview}
                className="cursor-pointer bg-primary-orange text-white rounded-full h-[44px] px-[28px] font-montserrat font-semibold text-[14px] hover:opacity-90 transition-opacity"
              >
                Use this {isVideo ? "video" : "photo"}
              </button>
            </>
          ) : isVideo ? (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={!stream}
              aria-label={recording ? "Stop recording" : "Start recording"}
              className="cursor-pointer w-[72px] h-[72px] rounded-full border-[4px] border-white flex items-center justify-center transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span
                className={`bg-[#D95F3B] transition-all ${
                  recording
                    ? "w-[26px] h-[26px] rounded-[6px]"
                    : "w-[56px] h-[56px] rounded-full"
                }`}
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={doCapturePhoto}
              disabled={!stream}
              aria-label="Take photo"
              className="cursor-pointer w-[72px] h-[72px] rounded-full bg-white border-[4px] border-white flex items-center justify-center hover:brightness-95 transition-[filter] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="w-[56px] h-[56px] rounded-full bg-white border-[2px] border-black/40" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function formatTimer(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString();
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function FlipCameraIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 8h4l2-3h6l2 3h4v11H3V8z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11a3 3 0 1 0 3 3"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        d="M15 11h-2v-2"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  CloseIcon,
  PauseIcon,
  PlayIcon,
} from "../icons";

export type MediaKind = "image" | "video" | "audio";
export type UploadState = "uploading" | "done" | "error";

export type StoryMedia = {
  id: string;
  // Null for items already on the server (edit mode hydrating from a saved
  // story). Present for newly-picked files awaiting upload.
  file: File | null;
  preview: string;
  kind: MediaKind;
  uploadState: UploadState;
  progress: number;
  uploadedUrl?: string;
  errorMessage?: string;
  waveform?: number[];
  durationMs?: number;
};

export function MediaThumb({
  media,
  onRemove,
}: {
  media: StoryMedia;
  onRemove: () => void;
}) {
  const uploading = media.uploadState === "uploading";
  const errored = media.uploadState === "error";
  const pct = Math.round(media.progress * 100);

  return (
    <div className="relative shrink-0 w-[80px] h-[80px] rounded-[10px] overflow-hidden bg-black/[0.06]">
      {media.kind === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.preview}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      {media.kind === "video" && (
        <video
          src={media.preview}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      )}

      {uploading && (
        <div className="pointer-events-none absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
          <span className="font-montserrat font-semibold text-white text-[13px] tabular-nums">
            {pct}%
          </span>
          <div className="mt-[6px] w-[52px] h-[3px] rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white transition-[width] duration-100"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {errored && (
        <div
          className="pointer-events-none absolute inset-0 bg-red-500/40 flex items-center justify-center"
          title={media.errorMessage}
        >
          <span className="font-montserrat font-semibold text-white text-[11px] px-[4px] text-center">
            Failed
          </span>
        </div>
      )}

      <button
        type="button"
        aria-label={`Remove ${media.kind}`}
        onClick={onRemove}
        className="cursor-pointer absolute top-[4px] right-[4px] w-[20px] h-[20px] bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors z-10"
      >
        <CloseIcon width={11} height={11} />
      </button>
    </div>
  );
}

export function UploadRing({ pct }: { pct: number }) {
  const R = 14;
  const C = 2 * Math.PI * R;
  const offset = C - (Math.max(0, Math.min(100, pct)) / 100) * C;
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-primary-blue/15"
      />
      <circle
        cx="16"
        cy="16"
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform="rotate(-90 16 16)"
        className="text-primary-orange transition-[stroke-dashoffset] duration-100"
      />
    </svg>
  );
}

export function AudioPill({
  media,
  onRemove,
}: {
  media: StoryMedia;
  onRemove: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(media.durationMs ?? 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onLoaded = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDurationMs(el.duration * 1000);
      }
    };
    const onTime = () => setPositionMs(el.currentTime * 1000);
    const onEnded = () => {
      setPlaying(false);
      setPositionMs(0);
    };
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const DISPLAY_BARS = 80;
  const rawWaveform =
    media.waveform && media.waveform.length > 0
      ? media.waveform
      : Array(DISPLAY_BARS).fill(0.35);
  const peak = Math.max(...rawWaveform, 0.01);
  const waveform: number[] = [];
  for (let i = 0; i < DISPLAY_BARS; i++) {
    const idx = Math.min(
      rawWaveform.length - 1,
      Math.round((i / (DISPLAY_BARS - 1)) * (rawWaveform.length - 1))
    );
    waveform.push(rawWaveform[idx] / peak);
  }
  const secondsRemaining = Math.max(0, (durationMs - positionMs) / 1000);
  const mm = Math.floor(secondsRemaining / 60);
  const ss = String(Math.floor(secondsRemaining % 60)).padStart(2, "0");

  const uploading = media.uploadState === "uploading";
  const errored = media.uploadState === "error";
  const uploadPct = Math.round(media.progress * 100);

  return (
    <div
      className={`w-full flex items-center gap-[12px] rounded-full pl-[6px] pr-[14px] py-[6px] ${
        errored ? "bg-red-500/10" : "bg-black/[0.06]"
      }`}
    >
      {uploading ? (
        <div className="shrink-0 w-[36px] h-[36px] rounded-full bg-white flex items-center justify-center">
          <UploadRing pct={uploadPct} />
        </div>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={errored}
          aria-label={playing ? "Pause" : "Play"}
          className="cursor-pointer shrink-0 w-[36px] h-[36px] rounded-full bg-white text-primary-blue flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {playing ? (
            <PauseIcon width={16} height={16} />
          ) : (
            <PlayIcon width={16} height={16} />
          )}
        </button>
      )}

      <div className="flex-1 min-w-0 flex items-center justify-between h-[36px] overflow-hidden">
        {waveform.map((v, i) => {
          const played = i / waveform.length < progress;
          const height = Math.max(4, Math.min(36, 4 + v * 32));
          const barColor = errored
            ? "bg-red-500/40"
            : uploading
              ? "bg-primary-blue/20"
              : played
                ? "bg-primary-orange"
                : "bg-primary-blue/35";
          return (
            <span
              key={i}
              className={`w-[2px] rounded-full shrink-0 ${barColor}`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      <span className="shrink-0 font-montserrat text-primary-blue/70 text-[13px] tabular-nums">
        {mm}:{ss}
      </span>

      <button
        type="button"
        aria-label="Remove audio"
        onClick={onRemove}
        className="cursor-pointer shrink-0 w-[24px] h-[24px] rounded-full text-primary-blue/60 hover:bg-black/[0.06] flex items-center justify-center transition-colors"
      >
        <CloseIcon width={14} height={14} />
      </button>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={media.preview} preload="metadata" />
    </div>
  );
}

export function ContentTypeButton({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`cursor-pointer w-[44px] h-[44px] rounded-full flex items-center justify-center transition-colors ${
        active
          ? "bg-primary-blue text-white"
          : "bg-[#ededed] text-primary-blue hover:bg-[#e0e0e0]"
      }`}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`cursor-pointer relative w-[44px] h-[24px] rounded-full transition-colors ${
        checked ? "bg-primary-orange" : "bg-black/[0.2]"
      }`}
    >
      <span
        className={`absolute top-[2px] w-[20px] h-[20px] rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

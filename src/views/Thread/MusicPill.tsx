"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { claimPlayback, releasePlayback } from "../../lib/audioSingleton";
import {
  MusicNoteIcon,
  PauseIcon,
  PlayIcon,
} from "../../app/(app)/(dashboard)/icons";

type Music = {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl?: string;
};

const MARQUEE_MS_PER_PX = 22;
const MARQUEE_START_DELAY_MS = 800;
const MARQUEE_GAP_PX = 24;

export default function MusicPill({ music }: { music: Music | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track which URIs the pill has already tried to autoplay (avoid re-fighting
  // Chrome autoplay policy on each render) and which URIs the USER paused
  // (so a track change re-enables autoplay while a user pause is respected).
  const autoplayedUriRef = useRef<string | null>(null);
  const userPausedUriRef = useRef<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const trackName = music?.trackName?.trim() || "";
  const artistName = music?.artistName?.trim() || "";
  const previewUrl = music?.previewUrl || "";
  const artworkUrl = music?.artworkUrl || "";
  const label = artistName ? `${trackName} — ${artistName}` : trackName;

  // Build (or rebuild) the audio element whenever previewUrl changes. Reset
  // autoplay + user-paused refs so a new track can autoplay again.
  useEffect(() => {
    if (!previewUrl) {
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }
    autoplayedUriRef.current = null;
    userPausedUriRef.current = null;

    const audio = new Audio(previewUrl);
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    // Try autoplay once per URI. Browsers may block without a prior user
    // gesture — that's fine, the tap-to-play button still works.
    if (autoplayedUriRef.current !== previewUrl) {
      autoplayedUriRef.current = previewUrl;
      claimPlayback(audio);
      audio.play().catch(() => {
        // Autoplay blocked; release the slot so another source can claim it.
        releasePlayback(audio);
      });
    }

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      try {
        audio.pause();
      } catch {
        // ignore
      }
      releasePlayback(audio);
      audioRef.current = null;
    };
  }, [previewUrl]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    if (audio.paused) {
      userPausedUriRef.current = null;
      claimPlayback(audio);
      audio.play().catch(() => {
        releasePlayback(audio);
      });
    } else {
      userPausedUriRef.current = previewUrl;
      audio.pause();
      releasePlayback(audio);
    }
  }

  if (!trackName) return null;

  const disabled = !previewUrl;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={isPlaying ? `Pause ${trackName}` : `Play ${trackName}`}
      className="cursor-pointer inline-flex items-center gap-[8px] bg-[#ededed] rounded-full pl-[4px] pr-[10px] py-[4px] max-w-[220px] hover:bg-[#e3e3e3] transition-colors disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className="shrink-0 w-[24px] h-[24px] rounded-[6px] bg-primary-orange/15 overflow-hidden flex items-center justify-center text-primary-orange">
        {artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <MusicNoteIcon width={14} height={14} />
        )}
      </span>

      <Marquee text={label} className="font-montserrat text-primary-blue text-[12px] leading-[16px]" />

      {!disabled &&
        (isPlaying ? (
          <PauseIcon width={12} height={12} />
        ) : (
          <PlayIcon width={12} height={12} />
        ))}
    </button>
  );
}

// Text marquee — measures the actual text width against its container and
// only animates when overflowing. Duplicates content so the loop reads
// continuously with a gap between repeats. Speed matches mobile spec
// (~22ms per pixel of scroll) with an 800ms pause before each loop.
function Marquee({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [overflow, setOverflow] = useState<null | {
    scrollPx: number;
    durationMs: number;
  }>(null);

  useLayoutEffect(() => {
    function measure() {
      const c = containerRef.current;
      const t = textRef.current;
      if (!c || !t) return;
      const containerWidth = c.clientWidth;
      const textWidth = t.scrollWidth;
      if (textWidth > containerWidth + 1) {
        const scrollPx = textWidth + MARQUEE_GAP_PX;
        setOverflow({
          scrollPx,
          durationMs: scrollPx * MARQUEE_MS_PER_PX,
        });
      } else {
        setOverflow(null);
      }
    }
    measure();
    // Re-measure when the pill resizes (window resize, layout shifts).
    const c = containerRef.current;
    if (!c || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(c);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-w-0 overflow-hidden"
      style={{ maskImage: overflow ? "linear-gradient(to right, transparent, black 8px, black calc(100% - 12px), transparent)" : undefined, WebkitMaskImage: overflow ? "linear-gradient(to right, transparent, black 8px, black calc(100% - 12px), transparent)" : undefined }}
    >
      {overflow ? (
        <div
          className={`flex items-center whitespace-nowrap ${className}`}
          style={{
            animation: `epoch-marquee ${overflow.durationMs}ms linear ${MARQUEE_START_DELAY_MS}ms infinite`,
            // CSS custom prop gives the keyframe its per-instance travel.
            ["--marquee-shift" as string]: `-${overflow.scrollPx}px`,
          }}
        >
          <span ref={textRef}>{text}</span>
          <span style={{ width: MARQUEE_GAP_PX, display: "inline-block" }} />
          <span aria-hidden="true">{text}</span>
        </div>
      ) : (
        <span
          ref={textRef}
          className={`block truncate ${className}`}
        >
          {text}
        </span>
      )}

      {/* Scoped keyframes. Repeating this per pill is cheap and avoids the
          need for a global stylesheet edit. */}
      <style>{`
        @keyframes epoch-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(var(--marquee-shift)); }
        }
      `}</style>
    </div>
  );
}

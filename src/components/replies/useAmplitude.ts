"use client";

import { useEffect, useRef, useState } from "react";

// Reads the live mic amplitude via AudioContext + AnalyserNode, so UI
// elements (the pulsing rings in the composer) can scale with the user's
// actual voice level instead of a simulated random walk.
//
// The hook requests mic access while `active` is true, tears everything
// down on `active=false` or unmount, and exposes a `getLevel()` callback
// that consumers call from their own rAF loop. We deliberately avoid
// setState from inside the read loop — React re-renders every frame would
// burn CPU for no visible benefit. The component drawing the rings already
// runs rAF and can read the level in-place.
//
// Amplitude math mirrors the mobile prototype:
//   level = prev * 0.4 + sqrt(mean((v-128)/128)^2) * 5 * 0.6
//   clamp to [0, 1]
// The *5 scales typical speech RMS (~0.1-0.2) into the useful 0.5-1.0 band.

export type UseAmplitudeResult = {
  /** True once the AudioContext + mic stream are live. Flips back to false
   *  on teardown. Consumers can gate UI off this if they want to indicate
   *  that mic metering is unavailable. */
  active: boolean;
  /** True if the browser can even try: `navigator.mediaDevices` + the
   *  `AudioContext` / `webkitAudioContext` constructors both present. */
  supported: boolean;
  /** Read the latest smoothed amplitude in [0, 1]. Returns 0 when the
   *  analyser isn't active yet (e.g. mic prompt still open, or Firefox). */
  getLevel: () => number;
};

type AmplitudeInternals = {
  stream: MediaStream | null;
  audioCtx: AudioContext | null;
  analyser: AnalyserNode | null;
  buffer: Uint8Array<ArrayBuffer> | null;
  smoothed: number;
};

function makeInternals(): AmplitudeInternals {
  return {
    stream: null,
    audioCtx: null,
    analyser: null,
    buffer: null,
    smoothed: 0,
  };
}

function hasSupport(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
  if (!nav.mediaDevices?.getUserMedia) return false;
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return !!(w.AudioContext || w.webkitAudioContext);
}

export function useAmplitude({ active }: { active: boolean }): UseAmplitudeResult {
  const [supported, setSupported] = useState(false);
  const [running, setRunning] = useState(false);
  const refs = useRef<AmplitudeInternals>(makeInternals());

  useEffect(() => {
    setSupported(hasSupport());
  }, []);

  useEffect(() => {
    if (!active || !supported) return;

    let cancelled = false;

    (async () => {
      try {
        const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
        const stream = await nav.mediaDevices!.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const w = window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        };
        const Ctor = w.AudioContext || w.webkitAudioContext!;
        const ctx = new Ctor();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);

        refs.current.stream = stream;
        refs.current.audioCtx = ctx;
        refs.current.analyser = analyser;
        refs.current.buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        refs.current.smoothed = 0;
        setRunning(true);
      } catch {
        // User denied mic, or something else went wrong. getLevel() stays
        // at 0; the ring will fall back to its idle pulse.
      }
    })();

    return () => {
      cancelled = true;
      const cur = refs.current;
      cur.stream?.getTracks().forEach((t) => t.stop());
      cur.audioCtx?.close().catch(() => {});
      refs.current = makeInternals();
      setRunning(false);
    };
  }, [active, supported]);

  const getLevel = (): number => {
    const cur = refs.current;
    const analyser = cur.analyser;
    const buffer = cur.buffer;
    if (!analyser || !buffer) return 0;
    analyser.getByteTimeDomainData(buffer);
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    // Smooth: 40% last value + 60% current scaled RMS. The *5 push keeps
    // typical voice in the mid-range of [0,1] instead of hugging zero.
    const next = Math.min(1, cur.smoothed * 0.4 + rms * 5 * 0.6);
    cur.smoothed = next;
    return next;
  };

  return {
    active: running,
    supported,
    getLevel,
  };
}

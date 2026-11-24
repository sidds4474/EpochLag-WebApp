"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Thin wrapper around `MediaRecorder` for the composer's recording phase.
// Handles pause/resume + timer accounting + blob assembly so the composer
// only talks about `isRecording / blob / elapsedMs`.
//
// Kept separate from `useLiveTranscription` and `useAmplitude` — each
// hook owns one responsibility, callers compose them together. The dev
// page at /dev/composer-ring is the reference composition.

type RecorderInternals = {
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  mimeType: string;
  /** Monotonic timestamp at the current recording segment's start. Reset
   *  on start / resume. */
  segStartMs: number;
  /** Elapsed from all prior segments (accumulates on pause). */
  accumMs: number;
  /** The timer interval handle. */
  timerId: ReturnType<typeof setInterval> | null;
};

function makeInternals(): RecorderInternals {
  return {
    stream: null,
    recorder: null,
    chunks: [],
    mimeType: "audio/webm",
    segStartMs: 0,
    accumMs: 0,
    timerId: null,
  };
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  // Chrome / Firefox support webm; Safari prefers mp4. Fall through to the
  // UA default if neither is explicitly supported — MediaRecorder will
  // still pick something sensible on its own.
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

export type AudioRecorderState = {
  /** True while the MediaRecorder is actively capturing (not paused, not
   *  stopped). The composer's ring + status row read from this. */
  isRecording: boolean;
  /** True while paused — blob not yet finalized, resume returns us to
   *  recording. */
  isPaused: boolean;
  /** Milliseconds captured across all segments so far. Updates every
   *  100ms while recording. */
  elapsedMs: number;
  /** Finalized audio blob — populated after `stop()` finishes building. */
  blob: Blob | null;
  /** Object URL for the blob, for an inline `<audio>` player. Revoked
   *  automatically on `reset()`. */
  blobUrl: string | null;
  /** Human-readable error (mic denied, codec missing, etc.). */
  error: string | null;
};

export type AudioRecorderController = AudioRecorderState & {
  /** Start a fresh recording. Opens the mic, resets elapsed + blob. */
  start: () => Promise<void>;
  /** Pause the current recording — blob not finalized yet, accumulated
   *  elapsed time is preserved. */
  pause: () => void;
  /** Resume after pause. */
  resume: () => void;
  /** Stop recording and finalize the blob. After this `blob` is set and
   *  `isRecording` is false. */
  stop: () => Promise<Blob | null>;
  /** Discard everything — tears down the stream, drops the blob, resets
   *  the timer. Use when the user taps the trash button. */
  reset: () => void;
};

export function useAudioRecorder(): AudioRecorderController {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    elapsedMs: 0,
    blob: null,
    blobUrl: null,
    error: null,
  });
  const refs = useRef<RecorderInternals>(makeInternals());

  const clearTimer = useCallback(() => {
    const cur = refs.current;
    if (cur.timerId !== null) {
      clearInterval(cur.timerId);
      cur.timerId = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    const cur = refs.current;
    cur.segStartMs = performance.now();
    cur.timerId = setInterval(() => {
      const c = refs.current;
      const live = performance.now() - c.segStartMs;
      setState((s) => ({ ...s, elapsedMs: c.accumMs + live }));
    }, 100);
  }, [clearTimer]);

  const start = useCallback(async () => {
    const cur = refs.current;
    // Reset any prior state first — fresh recording.
    clearTimer();
    cur.stream?.getTracks().forEach((t) => t.stop());
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    refs.current = makeInternals();
    setState({
      isRecording: false,
      isPaused: false,
      elapsedMs: 0,
      blob: null,
      blobUrl: null,
      error: null,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) refs.current.chunks.push(e.data);
      };

      refs.current.stream = stream;
      refs.current.recorder = recorder;
      refs.current.chunks = [];
      refs.current.mimeType = recorder.mimeType || "audio/webm";
      refs.current.accumMs = 0;

      recorder.start();
      startTimer();
      setState((s) => ({ ...s, isRecording: true, isPaused: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        error:
          err instanceof Error
            ? err.message
            : "Couldn't access the microphone.",
      }));
    }
  }, [clearTimer, startTimer, state.blobUrl]);

  const pause = useCallback(() => {
    const cur = refs.current;
    if (!cur.recorder || cur.recorder.state !== "recording") return;
    clearTimer();
    cur.accumMs += performance.now() - cur.segStartMs;
    cur.recorder.pause();
    setState((s) => ({
      ...s,
      isRecording: false,
      isPaused: true,
      elapsedMs: cur.accumMs,
    }));
  }, [clearTimer]);

  const resume = useCallback(() => {
    const cur = refs.current;
    if (!cur.recorder || cur.recorder.state !== "paused") return;
    cur.recorder.resume();
    startTimer();
    setState((s) => ({ ...s, isRecording: true, isPaused: false }));
  }, [startTimer]);

  const stop = useCallback((): Promise<Blob | null> => {
    const cur = refs.current;
    const recorder = cur.recorder;
    if (!recorder || recorder.state === "inactive") {
      return Promise.resolve(null);
    }
    clearTimer();
    if (recorder.state === "recording") {
      cur.accumMs += performance.now() - cur.segStartMs;
    }
    const totalMs = cur.accumMs;

    return new Promise<Blob | null>((resolve) => {
      const handleStop = () => {
        recorder.removeEventListener("stop", handleStop);
        const blob = new Blob(cur.chunks, { type: cur.mimeType });
        const blobUrl = URL.createObjectURL(blob);
        cur.stream?.getTracks().forEach((t) => t.stop());
        cur.stream = null;
        setState({
          isRecording: false,
          isPaused: false,
          elapsedMs: totalMs,
          blob,
          blobUrl,
          error: null,
        });
        resolve(blob);
      };
      recorder.addEventListener("stop", handleStop);
      recorder.stop();
    });
  }, [clearTimer]);

  const reset = useCallback(() => {
    const cur = refs.current;
    clearTimer();
    if (cur.recorder && cur.recorder.state !== "inactive") {
      cur.recorder.ondataavailable = null;
      try {
        cur.recorder.stop();
      } catch {
        // ignore
      }
    }
    cur.stream?.getTracks().forEach((t) => t.stop());
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    refs.current = makeInternals();
    setState({
      isRecording: false,
      isPaused: false,
      elapsedMs: 0,
      blob: null,
      blobUrl: null,
      error: null,
    });
  }, [clearTimer, state.blobUrl]);

  // Cleanup on unmount — stop mic and revoke any dangling object URL.
  useEffect(() => {
    return () => {
      const cur = refs.current;
      if (cur.timerId !== null) clearInterval(cur.timerId);
      cur.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    ...state,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}

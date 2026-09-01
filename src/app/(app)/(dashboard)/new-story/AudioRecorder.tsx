"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { MicrophoneIcon, PauseIcon } from "../icons";
import MicPermissionSheet, {
  classifyMicError,
  type MicErrorKind,
} from "../../../../components/MicPermissionSheet";

const BAR_COUNT = 32;
// Sample every 100ms of recording — fine enough granularity to catch voice
// dynamics without ballooning memory on long clips.
const SAMPLE_INTERVAL_MS = 100;

type Props = {
  onSave: (file: File, waveform: number[], durationMs: number) => void;
};

export default function AudioRecorder({ onSave }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(0)
  );

  const [micErrorKind, setMicErrorKind] = useState<MicErrorKind | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const waveformSamplesRef = useRef<number[]>([]);
  const sampleTimerRef = useRef<number | null>(null);
  const finalDurationRef = useRef<number>(0);

  useEffect(() => {
    return () => teardown();
  }, []);

  function teardown() {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (sampleTimerRef.current !== null) {
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    waveformSamplesRef.current = [];
    setLevels(Array(BAR_COUNT).fill(0));
  }

  function chooseMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    for (const type of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(type)
      ) {
        return type;
      }
    }
    return "";
  }

  async function start() {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = chooseMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const ext =
          type.includes("mp4") || type.includes("m4a")
            ? "m4a"
            : type.includes("ogg")
              ? "ogg"
              : "webm";
        const file = new File([blob], `recording-${Date.now()}.${ext}`, {
          type,
        });
        // Downsample captured levels to BAR_COUNT for a stable preview
        // waveform regardless of clip length.
        const samples = waveformSamplesRef.current;
        const preview: number[] = [];
        if (samples.length > 0) {
          const step = samples.length / BAR_COUNT;
          for (let i = 0; i < BAR_COUNT; i++) {
            const idx = Math.floor(i * step);
            preview.push(samples[idx] ?? 0);
          }
        }
        onSave(file, preview, finalDurationRef.current);
        teardown();
        setElapsedMs(0);
      };

      recorder.start(250);
      startedAtRef.current = performance.now();
      waveformSamplesRef.current = [];
      finalDurationRef.current = 0;
      setElapsedMs(0);
      setRecording(true);

      timerRef.current = window.setInterval(() => {
        const now = performance.now() - startedAtRef.current;
        finalDurationRef.current = now;
        setElapsedMs(now);
      }, 100);

      // Periodic waveform capture for the saved preview. Time-domain peak
      // gives real amplitude — averaging frequency bins flattens voice into
      // a nearly-constant value and produces uniform-height bars.
      sampleTimerRef.current = window.setInterval(() => {
        const analyser = analyserRef.current;
        if (!analyser) return;
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128);
          if (v > peak) peak = v;
        }
        waveformSamplesRef.current.push(peak / 128);
      }, SAMPLE_INTERVAL_MS);

      tickWaveform();
    } catch (err) {
      const kind = classifyMicError(err);
      // Only the mic-permission path opens the sheet — other failures (e.g.
      // MediaRecorder mimeType issues after the stream was granted) fall
      // back to the toast so we don't nag with a misleading "enable mic"
      // sheet when the mic is fine.
      if (kind === "denied" || kind === "insecure" || kind === "unsupported") {
        setMicErrorKind(kind);
      } else {
        toast.error("Could not start recording.");
      }
      teardown();
    }
  }

  function tickWaveform() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    const step = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      const bucketSize = Math.max(1, Math.floor(bins / BAR_COUNT));
      const bars: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < bucketSize; j++) {
          sum += data[i * bucketSize + j] || 0;
        }
        bars.push(sum / bucketSize / 255);
      }
      setLevels(bars);
      rafRef.current = requestAnimationFrame(step);
    };
    step();
  }

  function stop() {
    if (!recording) return;
    setRecording(false);
    recorderRef.current?.stop();
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = String(totalSeconds % 60).padStart(2, "0");

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-[18px] py-[24px]">
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-label={recording ? "Stop recording" : "Start recording"}
        className="cursor-pointer w-[72px] h-[72px] rounded-full bg-primary-orange text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
      >
        {recording ? (
          <PauseIcon width={26} height={26} />
        ) : (
          <MicrophoneIcon width={32} height={32} />
        )}
      </button>

      <div className="font-montserrat font-semibold text-primary-blue text-[22px] tabular-nums">
        {mm}:{ss}
      </div>

      {recording ? (
        <div className="flex items-center gap-[3px] h-[48px]">
          {levels.map((v, i) => (
            <span
              key={i}
              className="w-[3px] bg-primary-orange rounded-full"
              style={{ height: `${Math.max(4, v * 48)}px` }}
            />
          ))}
        </div>
      ) : (
        <p className="font-montserrat text-primary-blue/60 text-[14px]">
          Tap to record
        </p>
      )}
      <MicPermissionSheet
        open={micErrorKind !== null}
        kind={micErrorKind ?? "other"}
        onClose={() => setMicErrorKind(null)}
        onRetry={() => {
          setMicErrorKind(null);
          void start();
        }}
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { COMPOSER_GEOMETRY } from "./useComposerPhase";

// The compose-phase body — three independently-removable blocks stacked
// vertically: audio pill, transcript textarea, free-form text block. Each
// cascades in on reveal using the composer geometry delays. The composer
// owns the data (blobUrl, transcript text, text body) and passes mutations
// back via callbacks.

export type ComposeBodyProps = {
  /** True while the compose layer is visible — triggers the cascade. Pass
   *  `derived.isCompose` from `useComposerPhase`. */
  visible: boolean;
  /** Blob URL of captured audio (from `useAudioRecorder`), or null if the
   *  user hasn't recorded / has removed the audio. */
  audioUrl: string | null;
  /** Elapsed ms for the captured audio — shown as the duration on the
   *  pill. Ignored when `audioUrl` is null. */
  audioElapsedMs: number;
  /** Transcript text — editable in-place. Null means the block isn't
   *  shown. */
  transcript: string | null;
  /** Free-form text block. Null means the "Add text" affordance is shown
   *  instead. */
  textBody: string | null;
  onRemoveAudio: () => void;
  onRemoveTranscript: () => void;
  onChangeTranscript: (next: string) => void;
  onAddText: () => void;
  onRemoveText: () => void;
  onChangeText: (next: string) => void;
};

export function ComposeBody({
  visible,
  audioUrl,
  audioElapsedMs,
  transcript,
  textBody,
  onRemoveAudio,
  onRemoveTranscript,
  onChangeTranscript,
  onAddText,
  onRemoveText,
  onChangeText,
}: ComposeBodyProps) {
  return (
    <div className="flex flex-col gap-[12px]">
      {audioUrl && (
        <CascadeBlock visible={visible} delayMs={COMPOSER_GEOMETRY.COMPOSE_AUDIO_DELAY_MS}>
          <AudioPill url={audioUrl} elapsedMs={audioElapsedMs} onRemove={onRemoveAudio} />
        </CascadeBlock>
      )}

      {transcript !== null && (
        <CascadeBlock visible={visible} delayMs={COMPOSER_GEOMETRY.COMPOSE_TRANSCRIPT_DELAY_MS}>
          <TranscriptCard
            value={transcript}
            onChange={onChangeTranscript}
            onRemove={onRemoveTranscript}
          />
        </CascadeBlock>
      )}

      {textBody !== null ? (
        <CascadeBlock visible={visible} delayMs={COMPOSER_GEOMETRY.COMPOSE_TEXT_DELAY_MS}>
          <TextBlock
            value={textBody}
            onChange={onChangeText}
            onRemove={onRemoveText}
          />
        </CascadeBlock>
      ) : (
        <CascadeBlock visible={visible} delayMs={COMPOSER_GEOMETRY.COMPOSE_TEXT_DELAY_MS}>
          <button
            type="button"
            onClick={onAddText}
            className="w-full py-[12px] rounded-[12px] border border-dashed border-[#2B2B2B]/25 text-[#2B2B2B]/60 font-montserrat text-[13px] hover:bg-black/[0.03] transition-colors"
          >
            + Add a note
          </button>
        </CascadeBlock>
      )}
    </div>
  );
}

// ---------- Internal pieces ----------

function CascadeBlock({
  visible,
  delayMs,
  children,
}: {
  visible: boolean;
  delayMs: number;
  children: React.ReactNode;
}) {
  // Mount-and-fade pattern — on visible=true we fade in with the cascade
  // delay; on visible=false we fade out together (no delay).
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: `opacity ${COMPOSER_GEOMETRY.LAYER_FADE_MS}ms ${COMPOSER_GEOMETRY.EASING}, transform ${COMPOSER_GEOMETRY.LAYER_FADE_MS}ms ${COMPOSER_GEOMETRY.EASING}`,
        transitionDelay: visible ? `${delayMs}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function AudioPill({
  url,
  elapsedMs,
  onRemove,
}: {
  url: string;
  elapsedMs: number;
  onRemove: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Pause & reset when the URL changes (e.g. user recorded over the top).
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setIsPlaying(false);
  }, [url]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setIsPlaying(true);
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="bg-white rounded-[16px] p-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-[12px]">
      <button
        type="button"
        onClick={toggle}
        className="w-[36px] h-[36px] rounded-full bg-primary-orange text-white flex items-center justify-center flex-shrink-0 hover:brightness-95 transition"
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0 font-montserrat text-[13px]">
        <div className="font-medium text-[#2B2B2B]">Audio</div>
        <div className="text-[#2B2B2B]/60 tabular-nums">
          {formatElapsed(elapsedMs)}
        </div>
      </div>
      <RemoveButton onClick={onRemove} label="Remove audio" />
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
    </div>
  );
}

function TranscriptCard({
  value,
  onChange,
  onRemove,
}: {
  value: string;
  onChange: (next: string) => void;
  onRemove: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="bg-white rounded-[16px] p-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-[6px]">
        <div className="font-montserrat font-semibold text-[11px] uppercase tracking-[0.06em] text-[#969696]">
          Transcript
        </div>
        <RemoveButton onClick={onRemove} label="Remove transcript" />
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        className="w-full font-montserrat text-[13px] text-[#2B2B2B] leading-[1.45] bg-transparent resize-none outline-none placeholder:text-[#2B2B2B]/40"
        placeholder="Transcript will appear here…"
      />
    </div>
  );
}

function TextBlock({
  value,
  onChange,
  onRemove,
}: {
  value: string;
  onChange: (next: string) => void;
  onRemove: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(48, el.scrollHeight)}px`;
  }, [value]);

  return (
    <div className="bg-white rounded-[16px] p-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-[6px]">
        <div className="font-montserrat font-semibold text-[11px] uppercase tracking-[0.06em] text-[#969696]">
          Note
        </div>
        <RemoveButton onClick={onRemove} label="Remove note" />
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full font-montserrat text-[13px] text-[#2B2B2B] leading-[1.45] bg-transparent resize-none outline-none placeholder:text-[#2B2B2B]/40"
        placeholder="Add a thought…"
      />
    </div>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-[24px] h-[24px] rounded-full text-[#2B2B2B]/40 hover:text-[#D95F3B] hover:bg-[#D95F3B]/10 flex items-center justify-center transition-colors flex-shrink-0"
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

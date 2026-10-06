'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RecordingCircles } from '@/components/replies/RecordingCircles';
import { useLiveTranscription } from '@/components/replies/useLiveTranscription';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { blob: Blob; durationSecs: number; transcript: string }) => void;
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Modal recorder for use inside StepCompose — same visual language as
 * StepRecord (circles, live transcript, pause button) but overlaid rather
 * than owning the whole screen. User records, stops, then decides to save
 * or discard before the modal returns to the composer.
 */
export default function InlineRecorder({ isOpen, onClose, onSave }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [permissionError, setPermissionError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const {
    supported: transcriptionSupported,
    finalText: transcriptFinal,
    interimText: transcriptInterim,
    reset: resetTranscript,
  } = useLiveTranscription({ active: isRecording && isOpen });

  const resetAll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsedSeconds(0);
    setAudioBlob(null);
    setAudioDuration(0);
    setPermissionError('');
    resetTranscript();
  }, [resetTranscript]);

  // Reset when the modal closes so re-opening is a fresh state
  useEffect(() => {
    if (!isOpen) resetAll();
  }, [isOpen, resetAll]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    setPermissionError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration((prev) => (prev === 0 ? elapsedSeconds : prev));
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      setIsRecording(true);
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setPermissionError(
        'Microphone access denied. Please allow mic access and try again.'
      );
    }
  }, [elapsedSeconds]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (audioBlob) return; // Already have audio; use Save/Discard buttons
    if (isRecording) stopRecording();
    else startRecording();
  }, [audioBlob, isRecording, startRecording, stopRecording]);

  const handleSave = () => {
    if (!audioBlob) return;
    onSave({
      blob: audioBlob,
      durationSecs: audioDuration,
      transcript: transcriptFinal.trim(),
    });
    onClose();
  };

  // Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasAudio = audioBlob !== null;
  const transcriptHasContent =
    transcriptFinal.trim() || transcriptInterim.trim();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Record audio"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[460px] bg-warm-cream rounded-t-[24px] sm:rounded-[24px] shadow-[0_-4px_24px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]"
      >
        {/* Header: close */}
        <div className="flex items-center justify-end px-4 pt-3 pb-1">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-primary-blue hover:opacity-90 active:opacity-80 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body: circles + state label + transcript */}
        <div className="flex-1 flex flex-col items-center px-4 pb-4 overflow-y-auto">
          <div className={hasAudio ? 'scale-[0.75]' : ''}>
            <RecordingCircles isRecording={isRecording} onToggle={handleToggle} />
          </div>

          {permissionError && (
            <p className="mt-2 font-plus-jakarta text-[13px] text-red-600 text-center bg-red-50 px-4 py-2 rounded-[12px]">
              {permissionError}
            </p>
          )}

          {!isRecording && !hasAudio && !permissionError && (
            <p className="mt-4 font-plus-jakarta text-[16px] text-[#848484] text-center">
              Tap to start recording
            </p>
          )}

          {isRecording && (
            <div className="mt-2 flex flex-col items-center gap-1">
              <p className="font-plus-jakarta font-medium text-[14px] text-primary-orange">
                Recording
              </p>
              <p className="font-plus-jakarta text-[16px] text-primary-blue tabular-nums">
                {formatDuration(elapsedSeconds)}
              </p>
            </div>
          )}

          {hasAudio && !isRecording && (
            <p className="mt-2 font-plus-jakarta text-[14px] text-primary-blue tabular-nums">
              {formatDuration(audioDuration)}
            </p>
          )}

          {(isRecording || hasAudio) && transcriptionSupported && (
            <div className="w-full mt-4 bg-white rounded-[14px] px-4 py-3 shadow-[0_1px_6px_rgba(9,46,74,0.06)] min-h-[88px] max-h-[160px] overflow-y-auto">
              {transcriptHasContent ? (
                <p className="font-plus-jakarta text-[14px] text-primary-blue leading-[150%] whitespace-pre-line">
                  {transcriptFinal}
                  {transcriptInterim && (
                    <span className="text-primary-blue/50">
                      {' '}
                      {transcriptInterim}
                    </span>
                  )}
                </p>
              ) : (
                <p className="font-plus-jakarta text-[14px] text-[#848484]">
                  {isRecording ? 'Listening…' : 'No transcript captured.'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer: either big pause button (recording) OR Save/Discard (stopped) */}
        <div className="flex-shrink-0 px-4 pb-5 pt-2 flex items-center justify-center gap-3">
          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Stop recording"
              className="w-14 h-14 rounded-full bg-primary-orange text-white flex items-center justify-center shadow-[0_4px_14px_rgba(239,152,73,0.4)] hover:opacity-90 active:opacity-80 transition-opacity"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </button>
          )}

          {hasAudio && !isRecording && (
            // Single Next button — discard is already available via the close
            // X in the header. Keeps the stopped state visually clean.
            <button
              type="button"
              onClick={handleSave}
              className="font-plus-jakarta font-semibold text-[16px] text-primary-blue hover:opacity-70 active:opacity-50 transition-opacity px-3 flex items-center gap-2"
            >
              Next
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

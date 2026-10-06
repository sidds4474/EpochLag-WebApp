'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ReplyShell } from '@/components/replies/ReplyShell';
import { RecordingCircles } from '@/components/replies/RecordingCircles';
import { useLiveTranscription } from '@/components/replies/useLiveTranscription';
import type { LocationValue, MusicValue } from '@/app/(app)/(dashboard)/new-story/pickers';
import type { ReplyTargetType } from '@/lib/replies/publicReplies';

type MediaMode = 'video' | 'image' | 'calendar' | 'music' | 'location';

type RecordingResult = {
  audioBlob?: Blob;
  transcript?: string;
  openPicker?: 'date' | 'music' | 'location' | 'image' | 'video';
};

type Props = {
  senderName: string;
  targetType: ReplyTargetType;
  draftToken: string;
  onNext: (result: RecordingResult) => void;
  onBack: () => void;
  // Lifted picker state (from ReplyFlow — survives step transitions)
  dateOfStory: string | null;
  location: LocationValue | null;
  music: MusicValue | null;
  onDateChange: (next: string | null) => void;
  onLocationChange: (next: LocationValue | null) => void;
  onMusicChange: (next: MusicValue | null) => void;
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function StepRecord({
  senderName,
  targetType,
  onNext,
  onBack,
  dateOfStory,
  location,
  music,
  onDateChange,
  onLocationChange,
  onMusicChange,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [permissionError, setPermissionError] = useState('');

  // Live transcription — Web Speech API runs alongside MediaRecorder.
  // On unsupported browsers (Firefox) `supported` is false and the transcript
  // box simply doesn't render; audio capture still works.
  const {
    supported: transcriptionSupported,
    finalText: transcriptFinal,
    interimText: transcriptInterim,
    reset: resetTranscript,
  } = useLiveTranscription({ active: isRecording });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
        // Snapshot the elapsed time at stop so the audio pill shows the real
        // recording length — the elapsed counter stops but we want the value
        // frozen for display even if we reset on re-record.
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
      setPermissionError('Microphone access denied. Please allow mic access and try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Discard audio + transcript, return to idle so the user can start fresh.
  const handleDiscard = useCallback(() => {
    setAudioBlob(null);
    setAudioDuration(0);
    setElapsedSeconds(0);
    resetTranscript();
  }, [resetTranscript]);

  // Re-record = discard and immediately start a new recording.
  const handleReRecord = useCallback(() => {
    handleDiscard();
    startRecording();
  }, [handleDiscard, startRecording]);

  const handleMediaMode = (mode: MediaMode) => {
    // Advance to compose and request the matching picker to auto-open on
    // mount. For 'image'/'video' this opens the UploadMediaModal (capture
    // or upload chooser) on StepCompose.
    const openPicker =
      mode === 'calendar'
        ? 'date'
        : mode === 'music' || mode === 'location' || mode === 'image' || mode === 'video'
          ? mode
          : undefined;
    onNext({ audioBlob: audioBlob ?? undefined, openPicker });
  };

  const handleNext = () => {
    onNext({
      audioBlob: audioBlob ?? undefined,
      transcript: transcriptFinal || undefined,
    });
  };

  // Figma breaks the title before the possessive, keeping "<name>'s prompt"
  // on one line. `whitespace-nowrap` on the trailing span enforces that even
  // when the container is narrow enough that the browser would otherwise
  // break between "<name>'s" and "prompt".
  const headingLead =
    targetType === 'story' ? 'Start talking about' : 'Start talking to answer';
  const headingTail =
    targetType === 'story'
      ? senderName
        ? `${senderName}'s story`
        : 'this story'
      : senderName
        ? `${senderName}'s prompt`
        : 'this prompt';

  const hasAudio = audioBlob !== null;
  const transcriptHasContent = transcriptFinal.trim() || transcriptInterim.trim();

  return (
    <ReplyShell>
      {/* Header: back arrow only — Next lives at the bottom in the stopped state */}
      <div className="flex items-center justify-between pt-4 sm:pt-8 pb-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] text-primary-blue hover:opacity-90 active:opacity-80 transition-opacity"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="w-9" aria-hidden="true" />
      </div>

      <main className="flex-1 flex flex-col items-center px-4 pt-6 pb-6">
        {/* Title — only visible in the idle state (Figma: title gone once we're
            recording or have audio) */}
        {!isRecording && !hasAudio && (
          <h2 className="font-lora text-[20px] text-[#151515] text-center leading-[130%] max-w-[280px] pt-6">
            {headingLead}{' '}
            <span className="whitespace-nowrap">{headingTail}</span>
          </h2>
        )}

        {/* Circles — large & centered when idle/recording, smaller & nudged
            up when the user has audio (per Figma Screen 3) */}
        <div className={hasAudio && !isRecording ? 'mt-4 scale-[0.75]' : 'mt-10 flex-1 flex items-center justify-center'}>
          <RecordingCircles
            isRecording={isRecording}
            onToggle={isRecording ? stopRecording : hasAudio ? () => {} : startRecording}
          />
        </div>

        {permissionError && (
          <p className="mt-4 font-plus-jakarta text-[13px] text-red-600 text-center bg-red-50 px-4 py-2 rounded-[12px]">
            {permissionError}
          </p>
        )}

        {/* Idle: "Tap to start recording" caption below the circles */}
        {!isRecording && !hasAudio && !permissionError && (
          <p className="mt-6 font-plus-jakarta text-[16px] text-[#848484] text-center">
            Tap to start recording
          </p>
        )}

        {/* Recording: Orange "Recording" label + timer below circles */}
        {isRecording && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <p className="font-plus-jakarta font-medium text-[14px] text-primary-orange">
              Recording
            </p>
            <p className="font-plus-jakarta text-[16px] text-primary-blue tabular-nums">
              {formatDuration(elapsedSeconds)}
            </p>
          </div>
        )}

        {/* Stopped: Audio pill with play / waveform / duration / trash */}
        {hasAudio && !isRecording && audioBlob && (
          <AudioPreviewPill
            blob={audioBlob}
            durationSecs={audioDuration}
            onDiscard={handleDiscard}
          />
        )}

        {/* Transcript box — visible once there's anything to show (while
            recording, interim text is shown dimmed; once stopped, final only).
            Falls back silently on Firefox / unsupported browsers. */}
        {(isRecording || hasAudio) && transcriptionSupported && (
          <div className="w-full max-w-[420px] mt-5 bg-white rounded-[16px] px-5 py-4 shadow-[0_1px_6px_rgba(9,46,74,0.06)] min-h-[120px] max-h-[220px] overflow-y-auto">
            {transcriptHasContent ? (
              <p className="font-plus-jakarta text-[14px] text-primary-blue leading-[150%] whitespace-pre-line">
                {transcriptFinal}
                {transcriptInterim && (
                  <span className="text-primary-blue/50"> {transcriptInterim}</span>
                )}
              </p>
            ) : (
              <p className="font-plus-jakarta text-[14px] text-[#848484]">
                {isRecording ? 'Listening…' : 'No transcript captured.'}
              </p>
            )}
          </div>
        )}
      </main>

      {/* ============ Footer: different per state ============ */}

      {/* IDLE: "You can also..." + pill row */}
      {!isRecording && !hasAudio && (
        <footer className="pb-16 sm:pb-20">
          <p className="font-plus-jakarta text-[16px] text-black text-center mb-4 px-4 max-w-[320px] mx-auto leading-[130%]">
            You can also open your camera, add images, write text and add dates.
          </p>
          <div className="overflow-x-auto no-scrollbar pl-2 pr-4">
            <div className="flex gap-1.5 w-max mx-auto">
              <ToolbarButton label="Image" onClick={() => handleMediaMode('image')}>
                <ImageIcon />
              </ToolbarButton>
              <ToolbarButton label="Video" onClick={() => handleMediaMode('video')}>
                <VideoIcon />
              </ToolbarButton>
              <ToolbarButton label="Date" active={dateOfStory !== null} onClick={() => handleMediaMode('calendar')}>
                <CalendarIcon />
              </ToolbarButton>
              <ToolbarButton label="Music" active={music !== null} onClick={() => handleMediaMode('music')}>
                <MusicIcon />
              </ToolbarButton>
              <ToolbarButton label="Location" active={location !== null} onClick={() => handleMediaMode('location')}>
                <LocationIcon />
              </ToolbarButton>
            </div>
          </div>
        </footer>
      )}

      {/* RECORDING: big pause button at bottom */}
      {isRecording && (
        <footer className="pb-10 flex justify-center">
          <button
            type="button"
            onClick={stopRecording}
            aria-label="Stop recording"
            className="w-16 h-16 rounded-full bg-primary-orange text-white flex items-center justify-center shadow-[0_4px_14px_rgba(239,152,73,0.4)] hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </footer>
      )}

      {/* STOPPED (has audio): mic centered + Next on the right */}
      {hasAudio && !isRecording && (
        <footer className="pb-10 relative flex items-center justify-end px-2">
          <button
            type="button"
            onClick={handleReRecord}
            aria-label="Re-record"
            className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary-orange text-white flex items-center justify-center shadow-[0_2px_8px_rgba(239,152,73,0.35)] hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <svg width={18} height={18} viewBox="0 0 50 50" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.0007 4.16797C18.3847 4.16797 13.0215 9.53122 13.0215 16.1471V22.3971C13.0215 29.013 18.3847 34.3763 25.0007 34.3763C31.087 34.3763 36.1132 29.8373 36.8788 23.9596L27.084 23.9596C26.221 23.9596 25.5215 23.2601 25.5215 22.3971C25.5215 21.5342 26.221 20.8346 27.084 20.8346L36.9798 20.8346V17.7096H27.084C26.221 17.7096 25.5215 17.0101 25.5215 16.1471C25.5215 15.2842 26.221 14.5846 27.084 14.5846H36.8788C36.1132 8.707 31.087 4.16797 25.0007 4.16797Z" fill="white" />
              <path fillRule="evenodd" clipRule="evenodd" d="M8.33398 18.7513C9.19693 18.7513 9.89648 19.4509 9.89648 20.3138V22.3971C9.89648 30.7389 16.6589 37.5013 25.0007 37.5013C33.3425 37.5013 40.1048 30.7389 40.1048 22.3971V20.3138C40.1048 19.4509 40.8044 18.7513 41.6673 18.7513C42.5303 18.7513 43.2298 19.4509 43.2298 20.3138V22.3971C43.2298 31.9385 35.8994 39.7677 26.5632 40.5603V45.3138C26.5632 46.1767 25.8636 46.8763 25.0007 46.8763C24.1377 46.8763 23.4382 46.1767 23.4382 45.3138V40.5603C14.1019 39.7677 6.77148 31.9385 6.77148 22.3971V20.3138C6.77148 19.4509 7.47104 18.7513 8.33398 18.7513Z" fill="white" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="font-plus-jakarta font-semibold text-[16px] text-primary-blue hover:opacity-70 active:opacity-50 transition-opacity px-3 flex items-center gap-2"
          >
            Next
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </footer>
      )}
    </ReplyShell>
  );
}

// Static waveform heights — decorative only; matches the StoryViewing style.
const WAVEFORM_HEIGHTS = Array.from({ length: 32 }, (_, i) =>
  Math.round(8 + Math.abs(Math.sin(i * 0.7) + Math.cos(i * 0.4)) * 10)
);

function AudioPreviewPill({
  blob,
  durationSecs,
  onDiscard,
}: {
  blob: Blob;
  durationSecs: number;
  onDiscard: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(durationSecs);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    return () => {
      URL.revokeObjectURL(url);
      urlRef.current = null;
    };
  }, [blob]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setActualDuration(audio.duration);
      }
    };
    const onEnd = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const progress = actualDuration > 0 ? currentTime / actualDuration : 0;
  const playedBars = Math.round(progress * WAVEFORM_HEIGHTS.length);

  return (
    <div className="w-full max-w-[420px] mt-5 bg-white rounded-[16px] h-[64px] px-4 flex items-center gap-3 shadow-[0_1px_6px_rgba(9,46,74,0.06)]">
      {urlRef.current && <audio ref={audioRef} src={urlRef.current} preload="metadata" />}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-9 h-9 rounded-full bg-primary-orange text-white flex items-center justify-center flex-shrink-0 hover:opacity-90 active:opacity-80 transition-opacity"
      >
        {isPlaying ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="flex-1 h-full flex items-center justify-between">
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full ${i < playedBars ? 'bg-primary-orange' : 'bg-primary-blue'}`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
      <span className="font-plus-jakarta font-medium text-[14px] text-[#565656] tabular-nums flex-shrink-0">
        {formatDuration(Math.round(actualDuration))}
      </span>
      <button
        type="button"
        onClick={onDiscard}
        aria-label="Discard recording"
        className="w-7 h-7 rounded-full bg-primary-orange/10 text-primary-orange flex items-center justify-center flex-shrink-0 hover:bg-primary-orange/20 active:bg-primary-orange/30 transition-colors"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
        </svg>
      </button>
    </div>
  );
}

type ToolbarButtonProps = {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
};

function ToolbarButton({ children, label, onClick, active = false }: ToolbarButtonProps) {
  // Keep the pill white regardless — picked state surfaces via chips elsewhere.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="w-[82px] h-16 rounded-full bg-white text-[#2c2c2c] shadow-[0_1px_6px_rgba(9,46,74,0.08)] flex items-center justify-center hover:opacity-90 active:opacity-70 transition-opacity"
    >
      {children}
    </button>
  );
}

function VideoIcon() {
  return (
    <svg width={32} height={32} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M25.5 14.2483L26.4875 13.7546C29.4064 12.2952 30.8658 11.5654 31.9329 12.2249C33 12.8845 33 14.5161 33 17.7795V18.2172C33 21.4805 33 23.1122 31.9329 23.7717C30.8658 24.4312 29.4064 23.7015 26.4875 22.2421L25.5 21.7483V14.2483Z" stroke="currentColor" strokeWidth="1.99998" />
      <path d="M3 17.25C3 12.3188 3 9.85317 4.36194 8.19364C4.61126 7.88984 4.88984 7.61126 5.19364 7.36194C6.85317 6 9.31878 6 14.25 6C19.1812 6 21.6468 6 23.3064 7.36194C23.6102 7.61126 23.8887 7.88984 24.1381 8.19364C25.5 9.85317 25.5 12.3188 25.5 17.25V18.75C25.5 23.6812 25.5 26.1468 24.1381 27.8064C23.8887 28.1102 23.6102 28.3887 23.3064 28.6381C21.6468 30 19.1812 30 14.25 30C9.31878 30 6.85317 30 5.19364 28.6381C4.88984 28.3887 4.61126 28.1102 4.36194 27.8064C3 26.1468 3 23.6812 3 18.75V17.25Z" stroke="currentColor" strokeWidth="1.99998" />
      <path d="M10.9766 23.1963L10.9766 12.8037L19.9766 18L10.9766 23.1963Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.63672 15.8185C2.63672 9.60457 2.63672 6.49758 4.56715 4.56715C6.49758 2.63672 9.60457 2.63672 15.8185 2.63672C22.0325 2.63672 25.1395 2.63672 27.0699 4.56715C29.0004 6.49758 29.0004 9.60457 29.0004 15.8185C29.0004 22.0325 29.0004 25.1395 27.0699 27.0699C25.1395 29.0004 22.0325 29.0004 15.8185 29.0004C9.60457 29.0004 6.49758 29.0004 4.56715 27.0699C2.63672 25.1395 2.63672 22.0325 2.63672 15.8185Z" stroke="currentColor" strokeWidth="1.97727" />
      <circle cx="21.0914" cy="10.5465" r="2.63636" stroke="currentColor" strokeWidth="1.97727" />
      <path d="M2.63672 16.4775L4.94563 14.4572C6.14685 13.4061 7.95726 13.4664 9.0859 14.595L14.7405 20.2497C15.6464 21.1556 17.0724 21.2791 18.1206 20.5425L18.5137 20.2662C20.022 19.2062 22.0627 19.329 23.433 20.5623L27.6822 24.3865" stroke="currentColor" strokeWidth="1.97727" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.666 18.6654C23.4024 18.6654 23.9993 18.0684 23.9993 17.332C23.9993 16.5957 23.4024 15.9987 22.666 15.9987C21.9296 15.9987 21.3327 16.5957 21.3327 17.332C21.3327 18.0684 21.9296 18.6654 22.666 18.6654Z" fill="currentColor" />
      <path d="M22.666 23.9987C23.4024 23.9987 23.9993 23.4017 23.9993 22.6654C23.9993 21.929 23.4024 21.332 22.666 21.332C21.9296 21.332 21.3327 21.929 21.3327 22.6654C21.3327 23.4017 21.9296 23.9987 22.666 23.9987Z" fill="currentColor" />
      <path d="M17.3327 17.332C17.3327 18.0684 16.7357 18.6654 15.9994 18.6654C15.263 18.6654 14.666 18.0684 14.666 17.332C14.666 16.5957 15.263 15.9987 15.9994 15.9987C16.7357 15.9987 17.3327 16.5957 17.3327 17.332Z" fill="currentColor" />
      <path d="M17.3327 22.6654C17.3327 23.4017 16.7357 23.9987 15.9994 23.9987C15.263 23.9987 14.666 23.4017 14.666 22.6654C14.666 21.929 15.263 21.332 15.9994 21.332C16.7357 21.332 17.3327 21.929 17.3327 22.6654Z" fill="currentColor" />
      <path d="M9.33268 18.6654C10.0691 18.6654 10.666 18.0684 10.666 17.332C10.666 16.5957 10.0691 15.9987 9.33268 15.9987C8.5963 15.9987 7.99935 16.5957 7.99935 17.332C7.99935 18.0684 8.5963 18.6654 9.33268 18.6654Z" fill="currentColor" />
      <path d="M9.33268 23.9987C10.0691 23.9987 10.666 23.4017 10.666 22.6654C10.666 21.929 10.0691 21.332 9.33268 21.332C8.5963 21.332 7.99935 21.929 7.99935 22.6654C7.99935 23.4017 8.5963 23.9987 9.33268 23.9987Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M9.33268 2.33203C9.88497 2.33203 10.3327 2.77975 10.3327 3.33203V4.34899C11.2153 4.33201 12.1878 4.33202 13.2573 4.33203H18.7412C19.8108 4.33202 20.7833 4.33201 21.666 4.34899V3.33203C21.666 2.77975 22.1137 2.33203 22.666 2.33203C23.2183 2.33203 23.666 2.77975 23.666 3.33203V4.43481C24.0126 4.46124 24.3408 4.49446 24.6514 4.53621C26.2146 4.74638 27.4799 5.1892 28.4777 6.18702C29.4755 7.18484 29.9183 8.4501 30.1285 10.0133C30.3327 11.5323 30.3327 13.4731 30.3327 15.9234V18.7406C30.3327 21.1909 30.3327 23.1318 30.1285 24.6507C29.9183 26.214 29.4755 27.4792 28.4777 28.477C27.4799 29.4749 26.2146 29.9177 24.6514 30.1279C23.1324 30.3321 21.1916 30.3321 18.7413 30.332H13.2575C10.8071 30.3321 8.86626 30.3321 7.34732 30.1279C5.78409 29.9177 4.51882 29.4749 3.52101 28.477C2.52319 27.4792 2.08037 26.214 1.8702 24.6507C1.66598 23.1318 1.666 21.1909 1.66602 18.7406V15.9235C1.666 13.4731 1.66598 11.5323 1.8702 10.0133C2.08037 8.4501 2.52319 7.18484 3.52101 6.18702C4.51882 5.1892 5.78409 4.74638 7.34732 4.53621C7.65789 4.49446 7.98609 4.46124 8.33268 4.43481V3.33203C8.33268 2.77975 8.7804 2.33203 9.33268 2.33203ZM7.61382 6.51838C6.27236 6.69873 5.4995 7.03696 4.93522 7.60124C4.37094 8.16551 4.03272 8.93838 3.85236 10.2798C3.82182 10.507 3.79628 10.7462 3.77493 10.9987H28.2238C28.2024 10.7462 28.1769 10.507 28.1463 10.2798C27.966 8.93838 27.6278 8.16551 27.0635 7.60124C26.4992 7.03696 25.7263 6.69873 24.3849 6.51838C23.0147 6.33416 21.2084 6.33203 18.666 6.33203H13.3327C10.7903 6.33203 8.98403 6.33416 7.61382 6.51838ZM3.66602 15.9987C3.66602 14.86 3.66644 13.869 3.68346 12.9987H28.3152C28.3323 13.869 28.3327 14.86 28.3327 15.9987V18.6654C28.3327 21.2078 28.3306 23.014 28.1463 24.3842C27.966 25.7257 27.6278 26.4985 27.0635 27.0628C26.4992 27.6271 25.7263 27.9653 24.3849 28.1457C23.0147 28.3299 21.2084 28.332 18.666 28.332H13.3327C10.7903 28.332 8.98403 28.3299 7.61381 28.1457C6.27236 27.9653 5.4995 27.6271 4.93522 27.0628C4.37094 26.4985 4.03272 25.7257 3.85236 24.3842C3.66814 23.014 3.66602 21.2078 3.66602 18.6654V15.9987Z" fill="currentColor" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9.5" r="2.6" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M23.3414 4.58518C22.5445 4.72701 21.4956 5.07411 19.9653 5.58421L14.9653 7.25088C14.1198 7.53272 13.5608 7.72054 13.149 7.91212C12.7591 8.09353 12.5905 8.23952 12.4824 8.3894C12.3744 8.53927 12.2892 8.74538 12.2404 9.17269C12.1889 9.62395 12.1875 10.2137 12.1875 11.1049V13.7004L25.3125 9.3254C25.3123 7.77341 25.3073 6.7015 25.1926 5.91946C25.0784 5.14043 24.8826 4.85992 24.6636 4.70211C24.4447 4.5443 24.1166 4.44722 23.3414 4.58518ZM27.1753 7.50111C27.1599 6.79548 27.1254 6.17665 27.0478 5.6474C26.9025 4.65657 26.5792 3.77153 25.7599 3.18103C24.9407 2.59053 23.9988 2.56372 23.0129 2.73919C22.0645 2.90798 20.8847 3.30127 19.4449 3.78127L14.323 5.48855C13.5401 5.74951 12.8784 5.97003 12.3581 6.21208C11.8051 6.46935 11.3252 6.78822 10.9614 7.29307C10.5975 7.79791 10.4467 8.35398 10.3775 8.96001C10.3422 9.2695 10.3261 9.6165 10.3187 10.0011H10.3125V10.9501C10.3125 10.9841 10.3125 11.0184 10.3125 11.0529L10.3125 20.0008C9.52907 19.4123 8.55526 19.0636 7.5 19.0636C4.91117 19.0636 2.8125 21.1623 2.8125 23.7511C2.8125 26.3399 4.91117 28.4386 7.5 28.4386C10.0888 28.4386 12.1875 26.3399 12.1875 23.7511V15.6768L25.3125 11.3018V17.5008C24.5291 16.9123 23.5553 16.5636 22.5 16.5636C19.9112 16.5636 17.8125 18.6623 17.8125 21.2511C17.8125 23.8399 19.9112 25.9386 22.5 25.9386C25.0888 25.9386 27.1875 23.8399 27.1875 21.2511V9.36183C27.1875 9.31722 27.1875 9.27285 27.1875 9.22872V7.50111H27.1753ZM25.3125 21.2511C25.3125 19.6978 24.0533 18.4386 22.5 18.4386C20.9467 18.4386 19.6875 19.6978 19.6875 21.2511C19.6875 22.8044 20.9467 24.0636 22.5 24.0636C24.0533 24.0636 25.3125 22.8044 25.3125 21.2511ZM10.3125 23.7511C10.3125 22.1978 9.0533 20.9386 7.5 20.9386C5.9467 20.9386 4.6875 22.1978 4.6875 23.7511C4.6875 25.3044 5.9467 26.5636 7.5 26.5636C9.0533 26.5636 10.3125 25.3044 10.3125 23.7511Z" fill="currentColor" />
    </svg>
  );
}

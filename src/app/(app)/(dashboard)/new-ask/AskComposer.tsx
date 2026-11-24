"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import {
  createUserCard,
  fetchCardGradients,
  shareUserCard,
  type GradientCover,
} from "../../../../lib/create/api";
import { compressImage } from "../../../../lib/images";
import SendToDrawer from "../../../../components/share/SendToDrawer";
import ChooseCoverModal, { type CoverPick } from "../new-story/ChooseCoverModal";
import { RecordingCircles } from "../../../../components/replies/RecordingCircles";
import { uploadPromptVoiceWithRetry } from "../../../../lib/create/promptVoice";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { ChevronLeftIcon, EyeIcon, HelpIcon, PencilIcon } from "../icons";

// Cream + Lora composer for the Prompt-mode flow. Entry point is the
// Lag/Prompt toggle on `/new-lag` — tapping Prompt navigates here. Keeps
// the publish wiring from the old AskComposer (createUserCard →
// shareUserCard via SendToDrawer) but swaps the chrome for the shared
// story-composer aesthetic so the mode toggle feels native.

type CoverState = {
  file: File | null;
  imageUrl: string | null;
  preview: string | null;
};
const EMPTY_COVER: CoverState = { file: null, imageUrl: null, preview: null };

// Cache gradient list across mounts — same pattern as ChooseCoverModal.
let cachedCovers: GradientCover[] | null = null;

type Props = {
  onBack: () => void;
  /** Pre-populate the question field (Inspiration entry point). */
  prefillQuestion?: string | null;
  /** Chrome variant. "create" = user composing a new question; the
   *  header reads "Create" and Lag/Prompt toggle shows. "inspiration"
   *  = user answering a prompt from the Inspiration feed; header
   *  reads "Inspiration", toggle is hidden, and the question is
   *  displayed as a large read-only hero above the ring. */
  variant?: "create" | "inspiration";
};

export default function AskComposer({
  onBack,
  prefillQuestion = null,
  variant = "create",
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const authorName =
    user?.firstName || user?.lastName
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : "You";
  const authorAvatar = user?.profilePicture ?? null;
  const isInspiration = variant === "inspiration";
  const [question, setQuestion] = useState(prefillQuestion ?? "");
  const [cover, setCover] = useState<CoverState>(EMPTY_COVER);
  const [, setCovers] = useState<GradientCover[]>(cachedCovers ?? []);
  const [allowShare, setAllowShare] = useState(true);
  const [creating, setCreating] = useState(false);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [sentThisSession, setSentThisSession] = useState(false);
  // Mobile-only second step — Next from compose routes here so the
  // user can pick a cover (desktop keeps the picker in the right rail).
  const [mobileAtPreview, setMobileAtPreview] = useState(false);

  // Voice question — tapping the ring opens the mic, records audio via
  // MediaRecorder, and eagerly uploads the blob to Cloudinary the moment
  // the user stops. By the time they hit "Send Prompt", `voiceStatus`
  // is "ready" and we just attach the publicId. Prompt mode skips live
  // transcription (no Web Speech) — the audio IS the question, and the
  // text field is only used when the user wants to type instead of
  // speak, or both.
  type VoiceStatus = "idle" | "pending" | "ready" | "failed";
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voicePublicId, setVoicePublicId] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  // Snapshot of the amplitude samples at the moment of stop — drives the
  // waveform preview inside the finalized audio pill.
  const [recordedLevels, setRecordedLevels] = useState<number[]>([]);

  // Recorder refs — not state, to avoid re-renders.
  const recorderRef = useRef<{
    recorder: MediaRecorder;
    chunks: Blob[];
    stream: MediaStream;
    audioCtx: AudioContext;
    analyser: AnalyserNode;
    source: MediaStreamAudioSourceNode;
  } | null>(null);
  const ampRafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const elapsedStartRef = useRef<number>(0);
  // Ticket counter — invalidates stale uploads when the user re-records.
  // Each commit increments it; after upload resolves we bail if the
  // ticket no longer matches current.
  const voiceInFlightRef = useRef(0);

  function startAmplitudePoll() {
    const tick = () => {
      const rec = recorderRef.current;
      if (!rec) return;
      const buf = new Uint8Array(rec.analyser.fftSize);
      rec.analyser.getByteTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / buf.length);
      const scaled = Math.min(1, rms * 3.5);
      setAmplitude(scaled);
      // Buffer the sample so the waveform bars animate. Cap the array
      // so long recordings don't balloon memory — the Waveform component
      // only renders the trailing N samples anyway.
      setLevels((prev) => {
        const next = [...prev, rms];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
      ampRafRef.current = requestAnimationFrame(tick);
    };
    ampRafRef.current = requestAnimationFrame(tick);
  }
  function stopAmplitudePoll() {
    if (ampRafRef.current !== null) {
      cancelAnimationFrame(ampRafRef.current);
      ampRafRef.current = null;
    }
  }
  function startElapsedPoll() {
    elapsedStartRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsedSec(
        Math.floor((Date.now() - elapsedStartRef.current) / 1000),
      );
    }, 250);
  }
  function stopElapsedPoll() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function startRecording() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(
        "Microphone access denied. Enable it in your browser settings.",
      );
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioCtx = new AudioCtx();
    if (audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {
        /* non-fatal */
      }
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    // Terminate into a muted gain so Chrome pumps samples through.
    const muted = audioCtx.createGain();
    muted.gain.value = 0;
    analyser.connect(muted);
    muted.connect(audioCtx.destination);

    recorderRef.current = {
      recorder,
      chunks,
      stream,
      audioCtx,
      analyser,
      source,
    };
    recorder.start(100);
    setElapsedSec(0);
    setAmplitude(0);
    setLevels([]);
    setIsRecording(true);
    setIsPaused(false);
    startAmplitudePoll();
    startElapsedPoll();
  }

  function pauseRecording() {
    const rec = recorderRef.current;
    if (!rec || rec.recorder.state !== "recording") return;
    rec.recorder.pause();
    stopAmplitudePoll();
    stopElapsedPoll();
    setAmplitude(0);
    setIsPaused(true);
  }
  function resumeRecording() {
    const rec = recorderRef.current;
    if (!rec || rec.recorder.state !== "paused") return;
    rec.recorder.resume();
    setIsPaused(false);
    startAmplitudePoll();
    startElapsedPoll();
  }

  function teardownRecorder() {
    const rec = recorderRef.current;
    if (!rec) return;
    try {
      rec.stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    try {
      void rec.audioCtx.close();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    stopAmplitudePoll();
    stopElapsedPoll();
    setAmplitude(0);
  }

  async function stopAndUpload() {
    const rec = recorderRef.current;
    if (!rec) return;
    stopAmplitudePoll();
    stopElapsedPoll();

    const duration = Math.max(
      1,
      Math.round((Date.now() - elapsedStartRef.current) / 1000),
    );

    // Await the recorder's final ondataavailable before assembling.
    const blob = await new Promise<Blob | null>((resolve) => {
      const r = rec.recorder;
      r.onstop = () => {
        try {
          const b = new Blob(rec.chunks, { type: r.mimeType || "audio/webm" });
          resolve(b);
        } catch {
          resolve(null);
        }
      };
      try {
        r.stop();
      } catch {
        resolve(null);
      }
    });

    teardownRecorder();
    setIsRecording(false);
    setIsPaused(false);

    if (!blob || blob.size === 0) {
      toast.error("Recording failed. Please try again.");
      return;
    }

    // Revoke the previous object URL before overwriting.
    if (voiceUri) URL.revokeObjectURL(voiceUri);

    const uri = URL.createObjectURL(blob);
    setVoiceBlob(blob);
    setVoiceUri(uri);
    setVoiceDuration(duration);
    setVoicePublicId(null);
    setVoiceStatus("pending");
    setRecordedLevels(levels);

    // Ticket pattern — invalidates stale uploads on re-record.
    const ticket = ++voiceInFlightRef.current;
    void (async () => {
      try {
        const publicId = await uploadPromptVoiceWithRetry({ blob, duration });
        if (ticket !== voiceInFlightRef.current) return;
        setVoicePublicId(publicId);
        setVoiceStatus("ready");
      } catch (err) {
        if (ticket !== voiceInFlightRef.current) return;
        const e = err as { code?: string | null; message?: string };
        setVoiceStatus("failed");
        toast.error(
          e?.code === "VOICE_NOT_AUDIO"
            ? "That file isn't audio. Please re-record."
            : "Voice upload failed. Please re-record.",
        );
      }
    })();
  }

  function discardVoice() {
    // Bump ticket FIRST so any in-flight upload bails before we clear
    // state it would otherwise set.
    voiceInFlightRef.current++;
    // If we're still recording, tear the mic down too.
    if (recorderRef.current) {
      try {
        if (recorderRef.current.recorder.state !== "inactive") {
          recorderRef.current.recorder.stop();
        }
      } catch {
        /* ignore */
      }
      teardownRecorder();
    }
    if (voiceUri) URL.revokeObjectURL(voiceUri);
    setVoiceBlob(null);
    setVoiceUri(null);
    setVoiceDuration(0);
    setVoicePublicId(null);
    setVoiceStatus("idle");
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSec(0);
    setLevels([]);
    setRecordedLevels([]);
  }

  function handleRingTap() {
    if (isRecording) {
      void stopAndUpload();
      return;
    }
    // Big ring is only shown when there's no active recording AND no
    // saved voice (the pill replaces it after stop). So tapping it
    // always starts a fresh recording.
    void startRecording();
  }

  // Cleanup on unmount — stop mic, revoke blob URL, bump ticket.
  useEffect(() => {
    return () => {
      voiceInFlightRef.current++;
      teardownRecorder();
      if (voiceUri) URL.revokeObjectURL(voiceUri);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cachedCovers !== null) return;
    let cancelled = false;
    fetchCardGradients()
      .then((list) => {
        if (cancelled) return;
        cachedCovers = list;
        setCovers(list);
      })
      .catch(() => {
        /* non-fatal — picker modal has its own fetch */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The user can submit if they've either typed a question OR recorded
  // a voice clip. Pure-voice prompts are valid — the audio IS the
  // question.
  const canProceed = question.trim().length > 0 || voiceStatus === "ready";
  // Voice-specific gating — if they recorded but upload is still in
  // flight or failed, block Send so we don't publish without the
  // publicId.
  const voiceBlocking =
    voiceStatus === "pending" || voiceStatus === "failed";

  async function ensurePromptId(): Promise<string | null> {
    if (promptId) return promptId;
    try {
      const card = await createUserCard({
        content: question.trim(),
        type: "WHITE",
        file: cover.file,
        imageUrl: cover.file ? undefined : (cover.imageUrl ?? undefined),
        voicePublicId: voicePublicId ?? undefined,
      });
      setPromptId(card._id);
      return card._id;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
      return null;
    }
  }

  async function handleOpenShare() {
    if (!canProceed || creating) return;
    if (voiceBlocking) {
      toast.error(
        voiceStatus === "pending"
          ? "Voice is still uploading. Please wait."
          : "Voice upload failed. Please re-record.",
      );
      return;
    }
    setCreating(true);
    const id = await ensurePromptId();
    setCreating(false);
    if (id) setShareOpen(true);
  }

  async function handleShareSubmit(
    userIds: string[],
    groupIds: string[],
    note: string,
  ) {
    if (!promptId) return;
    try {
      await shareUserCard(promptId, {
        shareWith: userIds,
        groupIds,
        sendSeparately: false,
        note,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      throw new Error(message);
    }
  }

  const handleShareDrawerClose = () => {
    setShareOpen(false);
    if (sentThisSession) {
      setSentThisSession(false);
      router.push("/interactions?tab=sent");
    }
  };
  const wrappedSend: typeof handleShareSubmit = async (u, g, n) => {
    await handleShareSubmit(u, g, n);
    setSentThisSession(true);
  };

  function handleCoverPicked(pick: CoverPick) {
    if (pick.kind === "curated") {
      setCover({ file: null, imageUrl: pick.imageUrl, preview: pick.preview });
    } else {
      setCover({ file: pick.file, imageUrl: null, preview: pick.preview });
    }
  }

  async function handleUploadFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImage(file);
      const preview = URL.createObjectURL(compressed);
      setCover({ file: compressed, imageUrl: null, preview });
    } catch {
      const preview = URL.createObjectURL(file);
      setCover({ file, imageUrl: null, preview });
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#F3F1EC]">
      {/* Header */}
      <div className="shrink-0 px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] pb-[14px] flex items-center justify-between gap-[12px] relative">
        <div className="flex items-center gap-[16px] min-w-0">
          <button
            type="button"
            onClick={() => {
              if (mobileAtPreview) {
                setMobileAtPreview(false);
                return;
              }
              onBack();
            }}
            aria-label="Back"
            className="lg:hidden cursor-pointer w-[36px] h-[36px] rounded-full bg-white text-[#2B2B2B] flex items-center justify-center hover:brightness-95 transition-[filter] shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <h1 className="hidden lg:block font-ivy text-[#2B2B2B] text-[32px] leading-none">
            {isInspiration ? "Inspiration" : "Create"}
          </h1>
          {/* Lag / Prompt toggle — only in Create variant. Inspiration
              users came from a specific prompt and can't flip modes. */}
          {!isInspiration && (
            <div className="hidden lg:flex items-center gap-[4px] bg-white rounded-full p-[4px]">
              <button
                type="button"
                onClick={() => router.push("/new-lag")}
                className="px-[18px] h-[32px] rounded-full font-montserrat text-[13px] font-medium text-[#2B2B2B] hover:bg-black/[0.04] transition-colors"
              >
                Lag
              </button>
              <button
                type="button"
                className="px-[18px] h-[32px] rounded-full font-montserrat text-[13px] font-medium bg-[#2B2B2B] text-white"
              >
                Prompt
              </button>
            </div>
          )}
        </div>
        {/* Mobile centered toggle — Create variant only. */}
        {!isInspiration && (
          <div className="lg:hidden flex items-center gap-[4px] bg-white rounded-full p-[4px] absolute left-1/2 -translate-x-1/2">
            <button
              type="button"
              onClick={() => router.push("/new-lag")}
              className="px-[16px] h-[28px] rounded-full font-montserrat text-[12px] font-medium text-[#2B2B2B]"
            >
              Lag
            </button>
            <button
              type="button"
              className="px-[16px] h-[28px] rounded-full font-montserrat text-[12px] font-medium bg-[#2B2B2B] text-white"
            >
              Prompt
            </button>
          </div>
        )}
        {isInspiration && (
          <h1 className="lg:hidden absolute left-1/2 -translate-x-1/2 font-ivy text-[#2B2B2B] text-[20px] leading-none">
            Inspiration
          </h1>
        )}

        <div className="flex items-center gap-[10px] lg:gap-[12px] shrink-0">
          <button
            type="button"
            aria-label="Help"
            className="hidden lg:inline-flex cursor-pointer w-[32px] h-[32px] rounded-full text-[#2B2B2B] items-center justify-center hover:bg-black/[0.04] transition-colors"
          >
            <HelpIcon width={20} height={20} />
          </button>
          <button
            type="button"
            className="hidden lg:flex cursor-pointer items-center justify-center gap-[8px] border border-[#2B2B2B]/50 text-[#2B2B2B] rounded-full h-[40px] px-[22px] font-montserrat font-medium text-[14px] hover:bg-black/[0.03] transition-colors"
          >
            <EyeIcon width={16} height={16} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={handleOpenShare}
            disabled={!canProceed || creating}
            className="hidden lg:flex cursor-pointer items-center justify-center bg-primary-orange text-white rounded-full h-[40px] px-[26px] font-montserrat font-medium text-[14px] hover:brightness-95 transition-[filter] disabled:opacity-60"
          >
            {creating
              ? "Sending…"
              : voiceStatus === "pending"
                ? "Uploading voice…"
                : voiceStatus === "failed"
                  ? "Re-record voice"
                  : "Send Prompt"}
          </button>
        </div>
      </div>
      <div className="mx-[16px] md:mx-[24px] lg:mx-[40px] h-px bg-[#E5E3DD]" />

      {/* Desktop body */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_300px] flex-1 min-h-0 gap-[32px] px-[40px] pt-[16px] pb-[24px]">
        <div className="flex flex-col min-w-0 min-h-0 relative">
          {/* Question input — centered italic serif underline. */}
          <div className="shrink-0 mt-[8px]">
            {isInspiration ? (
              <QuestionHero text={question} />
            ) : (
              <QuestionInput value={question} onChange={setQuestion} />
            )}
          </div>
          {/* Ring + caption cluster, roughly centered. */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
            <RecordingStage
              isRecording={isRecording}
              isPaused={isPaused}
              amplitude={amplitude}
              levels={levels}
              elapsedSec={elapsedSec}
              voiceStatus={voiceStatus}
              hasVoice={!!voiceUri}
              voiceUri={voiceUri}
              voiceDuration={voiceDuration}
              recordedLevels={recordedLevels}
              onStartOrRestart={handleRingTap}
              onPauseResume={isPaused ? resumeRecording : pauseRecording}
              onStop={() => void stopAndUpload()}
              onTrash={discardVoice}
            />
          </div>
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-[20px] w-full">
          <CoverPanel
            preview={cover.preview}
            onOpen={() => setCoverModalOpen(true)}
          />
          <ShareToggleRow value={allowShare} onChange={setAllowShare} />
          <SecureBox />
        </aside>
      </div>

      {/* Mobile body — step 1 (compose) or step 2 (preview with cover) */}
      {!mobileAtPreview ? (
        <div className="lg:hidden flex-1 min-h-0 flex flex-col px-[16px] pb-[96px]">
          <div className="shrink-0 mt-[8px]">
            {isInspiration ? (
              <QuestionHero text={question} />
            ) : (
              <QuestionInput value={question} onChange={setQuestion} />
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
            <RecordingStage
              isRecording={isRecording}
              isPaused={isPaused}
              amplitude={amplitude}
              levels={levels}
              elapsedSec={elapsedSec}
              voiceStatus={voiceStatus}
              hasVoice={!!voiceUri}
              voiceUri={voiceUri}
              voiceDuration={voiceDuration}
              recordedLevels={recordedLevels}
              onStartOrRestart={handleRingTap}
              onPauseResume={isPaused ? resumeRecording : pauseRecording}
              onStop={() => void stopAndUpload()}
              onTrash={discardVoice}
            />
          </div>
        </div>
      ) : (
        <div className="lg:hidden flex-1 min-h-0 overflow-y-auto px-[20px] pt-[6px] pb-[120px]">
          {/* Author row */}
          <div className="flex items-center gap-[10px]">
            {authorAvatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={authorAvatar}
                alt=""
                className="w-[40px] h-[40px] rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-[40px] h-[40px] rounded-full bg-[#2B2B2B] text-white flex items-center justify-center font-montserrat font-semibold text-[14px] shrink-0">
                {authorName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex flex-col leading-tight">
              <div className="font-montserrat text-[12px] text-[#848484]">
                From
              </div>
              <div className="font-montserrat font-semibold text-[15px] text-[#2B2B2B] truncate">
                {authorName}
              </div>
            </div>
          </div>

          {/* Question text — large Lora serif, matching Figma */}
          {question.trim() && (
            <h2 className="mt-[18px] font-ivy font-normal text-[#2B2B2B] text-[28px] leading-[1.2]">
              {question}
            </h2>
          )}

          {/* Audio pill (if a voice was recorded) */}
          {voiceUri && (
            <div className="mt-[18px]">
              <RecordedPill
                uri={voiceUri}
                durationSec={voiceDuration}
                levels={recordedLevels}
                status={voiceStatus}
                onRemove={discardVoice}
              />
            </div>
          )}

          {/* Polaroid-style cover — equal white border, pencil edit
              icon in the top-right corner. Tap anywhere to open the
              cover modal. */}
          <div className="mt-[22px] flex justify-center">
            <button
              type="button"
              onClick={() => setCoverModalOpen(true)}
              className="relative w-full max-w-[400px] aspect-square bg-white rounded-[4px] shadow-[0_8px_28px_rgba(0,0,0,0.08)] p-[14px] overflow-hidden"
              aria-label={cover.preview ? "Change cover" : "Choose cover"}
            >
              {cover.preview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover.preview}
                    alt=""
                    className="absolute inset-[14px] w-[calc(100%-28px)] h-[calc(100%-28px)] object-cover rounded-[2px]"
                  />
                </>
              ) : (
                <div className="absolute inset-[14px] flex flex-col items-center justify-center gap-[12px] rounded-[2px] bg-[#F2F0EA]">
                  <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#848484" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="9" cy="9" r="1.6" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span className="font-montserrat text-[13px] text-[#2B2B2B] border border-[#2B2B2B]/40 rounded-full px-[14px] py-[6px]">
                    Choose Cover
                  </span>
                </div>
              )}
              <span className="absolute top-[22px] right-[22px] w-[34px] h-[34px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12)] text-[#2B2B2B] flex items-center justify-center">
                <PencilIcon width={14} height={14} />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile sticky action bar — Next on step 1, Send Prompt on step 2 */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-[16px] pb-[16px] pt-[12px] bg-[#F3F1EC] border-t border-[#E5E3DD]">
        {!mobileAtPreview ? (
          <button
            type="button"
            onClick={() => setMobileAtPreview(true)}
            disabled={!canProceed}
            className="w-full h-[48px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[14px] hover:brightness-95 transition-[filter] disabled:opacity-60"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenShare}
            disabled={!canProceed || creating}
            className="w-full h-[48px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[14px] hover:brightness-95 transition-[filter] disabled:opacity-60"
          >
            {creating
              ? "Sending…"
              : voiceStatus === "pending"
                ? "Uploading voice…"
                : voiceStatus === "failed"
                  ? "Re-record voice"
                  : "Send"}
          </button>
        )}
      </div>

      {/* Cover modal — shared with StoryComposer; owns curated gradients
          + upload-from-device + crop. Covers both empty and change
          actions. */}
      <ChooseCoverModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        onPick={(pick) => {
          handleCoverPicked(pick);
          setCoverModalOpen(false);
        }}
        selectedUrl={cover.imageUrl}
      />

      {/* Share drawer — owns the celebration + send button. */}
      <SendToDrawer
        open={shareOpen}
        onClose={handleShareDrawerClose}
        onSend={wrappedSend}
        shareContext="prompt"
        showMessageInput
        shareTarget={promptId ? { kind: "prompt", id: promptId } : undefined}
      />
    </div>
  );
}

// -------- Local components --------

// Read-only display of the prompt question — used when the user arrives
// from Inspiration with the text pre-seeded. Centered Lora, no underline,
// a size up from the typed QuestionInput so it reads as the hero.
function QuestionHero({ text }: { text: string }) {
  return (
    <div className="w-full max-w-[620px] mx-auto px-[12px] text-center">
      <h2 className="font-ivy text-[#2B2B2B] text-[24px] lg:text-[28px] leading-[1.25]">
        {text}
      </h2>
    </div>
  );
}

function QuestionInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="w-full max-w-[520px] mx-auto">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="What would you like to know?"
        className="w-full bg-transparent pt-[8px] pb-[10px] text-center font-ivy font-normal text-[#2B2B2B] text-[20px] placeholder:font-ivy placeholder:font-normal placeholder:text-[#848484] border-b border-[#D6D3CA] focus:outline-none focus:border-[#2B2B2B]"
      />
    </div>
  );
}

function CoverPanel({
  preview,
  onOpen,
}: {
  preview: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="font-montserrat text-[14px] text-[#2B2B2B]">
        Cover image
      </div>
      <div className="relative w-full aspect-square rounded-[18px] bg-white border border-[#E5E3DD] overflow-hidden">
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={onOpen}
              aria-label="Change cover"
              className="absolute top-[10px] right-[10px] w-[32px] h-[32px] rounded-full bg-white/90 text-[#2B2B2B] flex items-center justify-center hover:bg-white transition-colors"
            >
              <PencilIcon width={14} height={14} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="w-full h-full flex flex-col items-center justify-center gap-[12px] hover:bg-[#fafaf7] transition-colors"
          >
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#2B2B2B" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="9" cy="9" r="1.6" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="font-montserrat text-[13px] text-[#2B2B2B] border border-[#2B2B2B]/40 rounded-full px-[14px] py-[6px]">
              Choose Cover
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function ShareToggleRow({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-montserrat text-[14px] text-[#2B2B2B]">
        Allow others to share
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-[36px] h-[20px] rounded-full transition-colors ${
          value ? "bg-primary-orange" : "bg-[#D6D3CA]"
        }`}
      >
        <span
          className="absolute top-[2px] left-[2px] w-[16px] h-[16px] rounded-full bg-white transition-transform"
          style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function SecureBox() {
  return (
    <div className="bg-white rounded-[14px] p-[14px] flex gap-[10px]">
      <span className="shrink-0 text-primary-orange mt-[2px]">
        <LockIcon />
      </span>
      <div className="flex flex-col gap-[2px] min-w-0">
        <div className="font-montserrat font-semibold text-[13px] text-[#2B2B2B]">
          Secure and Private
        </div>
        <div className="font-montserrat text-[12px] text-[#848484] leading-[1.35]">
          Only you can add people to this thread
        </div>
      </div>
    </div>
  );
}

// The recording stage mirrors the Lag composer's layout: idle shows the
// big ring + caption, active shows a waveform + status + MM:SS timer +
// trash / pause / continue controls, with the ring morphing down into a
// smaller button at the bottom. One unified component so pause ↔ record
// transitions stay smooth.
function RecordingStage({
  isRecording,
  isPaused,
  amplitude,
  levels,
  elapsedSec,
  voiceStatus,
  hasVoice,
  voiceUri,
  voiceDuration,
  recordedLevels,
  onStartOrRestart,
  onPauseResume,
  onStop,
  onTrash,
}: {
  isRecording: boolean;
  isPaused: boolean;
  amplitude: number;
  levels: number[];
  elapsedSec: number;
  voiceStatus: "idle" | "pending" | "ready" | "failed";
  hasVoice: boolean;
  voiceUri: string | null;
  voiceDuration: number;
  recordedLevels: number[];
  onStartOrRestart: () => void;
  onPauseResume: () => void;
  onStop: () => void;
  onTrash: () => void;
}) {
  const isActive = isRecording || isPaused;
  // Three mutually-exclusive visual states driven by (isActive, hasVoice):
  //   active        → waveform + timer + controls
  //   hasVoice      → audio pill (play / waveform / duration / X)
  //   neither       → big idle ring + caption
  const showIdle = !isActive && !hasVoice;
  const showRecorded = !isActive && hasVoice;
  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Idle layer — big ring + caption. Only shown when there's no
          recording yet; once the user has a clip, this is replaced by
          the audio pill below. */}
      <div
        className="w-full flex flex-col items-center transition-opacity duration-[320ms]"
        style={{
          opacity: showIdle ? 1 : 0,
          pointerEvents: showIdle ? "auto" : "none",
          position: showIdle ? "relative" : "absolute",
          inset: showIdle ? undefined : 0,
        }}
      >
        <RecordingCircles
          isRecording={false}
          onToggle={onStartOrRestart}
          amplitudeSource={() => amplitude}
          scale={0.72}
        />
        <div className="mt-[16px] font-montserrat text-[14px] text-[#848484] text-center">
          Click to start recording your Lag
        </div>
      </div>

      {/* Recorded layer — audio pill. Tap X to discard and surface the
          big ring again. Shown only after a successful stop. */}
      <div
        className="w-full max-w-[480px] transition-opacity duration-[320ms]"
        style={{
          opacity: showRecorded ? 1 : 0,
          pointerEvents: showRecorded ? "auto" : "none",
          position: showRecorded ? "relative" : "absolute",
          inset: showRecorded ? undefined : 0,
        }}
      >
        <RecordedPill
          uri={voiceUri}
          durationSec={voiceDuration}
          levels={recordedLevels}
          status={voiceStatus}
          onRemove={onTrash}
        />
      </div>

      {/* Active layer — waveform, status, timer, controls, small ring. */}
      <div
        className="w-full flex flex-col items-center gap-[14px] transition-opacity duration-[380ms]"
        style={{
          opacity: isActive ? 1 : 0,
          pointerEvents: isActive ? "auto" : "none",
          transitionDelay: isActive ? "260ms" : "0ms",
          position: !isActive ? "absolute" : "relative",
          inset: !isActive ? 0 : undefined,
        }}
      >
        <Waveform levels={levels} paused={isPaused} />
        <div
          className={`font-montserrat text-[13px] ${
            isPaused ? "text-[#848484]" : "text-[#D95F3B]"
          }`}
        >
          {isPaused ? "Paused" : "Recording"}
        </div>
        <div className="flex items-center gap-[22px]">
          <button
            type="button"
            onClick={onTrash}
            aria-label="Discard recording"
            className="w-[36px] h-[36px] rounded-full text-[#D95F3B] flex items-center justify-center hover:bg-[#D95F3B]/10 transition-colors"
          >
            <TrashIcon />
          </button>
          <div className="font-montserrat text-[22px] font-medium text-[#2B2B2B] tabular-nums min-w-[60px] text-center">
            {fmtTime(elapsedSec)}
          </div>
          <button
            type="button"
            onClick={onStop}
            aria-label="Continue"
            disabled={elapsedSec < 1}
            className="w-[36px] h-[36px] rounded-full border border-[#2B2B2B] text-[#2B2B2B] flex items-center justify-center hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {/* Small ring / pause-resume control at the bottom */}
        <div className="mt-[6px] relative">
          <div className="pointer-events-none">
            <RecordingCircles
              isRecording={isRecording && !isPaused}
              onToggle={() => { /* click handled by overlay below */ }}
              amplitudeSource={() => amplitude}
              scale={0.46}
            />
          </div>
          <button
            type="button"
            onClick={onPauseResume}
            aria-label={isPaused ? "Resume" : "Pause"}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] rounded-full text-white flex items-center justify-center focus:outline-none"
          >
            {isPaused ? (
              <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// The finalized voice clip card. Shown after stop; the user can
// preview-play, see the duration, and tap × to discard and surface the
// idle big-ring again. Status chip surfaces the upload state so the
// user knows when it's safe to Send.
function RecordedPill({
  uri,
  durationSec,
  levels,
  status,
  onRemove,
}: {
  uri: string | null;
  durationSec: number;
  levels: number[];
  status: "idle" | "pending" | "ready" | "failed";
  onRemove: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };
  return (
    <div className="flex items-start gap-[8px]">
      <div className="flex-1 min-w-0 bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-[14px] py-[12px] flex items-center gap-[12px]">
        <button
          type="button"
          onClick={toggle}
          disabled={!uri}
          className="shrink-0 w-[36px] h-[36px] rounded-full bg-primary-orange text-white flex items-center justify-center hover:brightness-95 transition-[filter] disabled:opacity-50"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
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
        <div className="flex-1 min-w-0 h-[28px] flex items-center justify-center gap-[2px]">
          {(levels.length > 0 ? levels : new Array(40).fill(0.1))
            .slice(-60)
            .map((lvl, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full bg-[#2B2B2B]"
                style={{ height: Math.max(3, Math.min(28, lvl * 28 + 3)) }}
              />
            ))}
        </div>
        <div className="shrink-0 font-montserrat text-[12px] text-[#848484] tabular-nums">
          {fmtTime(durationSec)}
        </div>
        {status === "pending" && (
          <span className="shrink-0 font-montserrat text-[11px] text-[#848484]">
            Uploading…
          </span>
        )}
        {status === "failed" && (
          <span className="shrink-0 font-montserrat text-[11px] text-[#D95F3B]">
            Failed
          </span>
        )}
        {uri && (
          <audio
            ref={audioRef}
            src={uri}
            preload="metadata"
            onEnded={() => setPlaying(false)}
          />
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove recording"
        className="shrink-0 mt-[16px] w-[24px] h-[24px] rounded-full text-[#2B2B2B]/40 hover:text-[#D95F3B] hover:bg-[#D95F3B]/10 flex items-center justify-center transition-colors"
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function Waveform({
  levels,
  paused,
}: {
  levels: number[];
  paused: boolean;
}) {
  const BAR_COUNT = 48;
  const tail = levels.slice(-BAR_COUNT);
  const padCount = Math.max(0, BAR_COUNT - tail.length);
  const bars: number[] = new Array(padCount).fill(0).concat(tail);
  return (
    <div
      className="flex items-end justify-center gap-[3px] h-[72px] w-full max-w-[440px] mx-auto"
      aria-hidden
    >
      {bars.map((level, i) => {
        const h = Math.max(4, Math.min(72, level * 72 + 4));
        return (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: h,
              background: paused ? "#B9B6AD" : "#2B2B2B",
              transition: "height 90ms linear, background 180ms linear",
            }}
          />
        );
      })}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

function LockIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 1 1 6 0v3H9z" />
    </svg>
  );
}

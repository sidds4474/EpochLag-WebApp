"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { attachAlbumThreads } from "../../../../lib/library/api";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import {
  createStory,
  createUserCard,
  getUploadToken,
  publishStory,
  setThreadPrivacy,
  shareUserCard,
  updateStory,
  updateUserCard,
  uploadToCloudinaryWithProgress,
} from "../../../../lib/create/api";
import { serializeBlocksToContent } from "../../../../lib/create/content";
import { buildPreviewThread } from "../../../../lib/create/preview";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import PreviewOverlay from "../../../../views/Thread/PreviewOverlay";
import type { ThreadResponse } from "../../../../types/home";
import {
  fetchInspirationFeed,
  toggleCardBookmark,
} from "../../../../lib/home/api";
import type { UserCard } from "../../../../types/home";
import { compressImage } from "../../../../lib/images";
import ReplyEditor from "../interactions/ReplyEditor";
import AudioRecorder from "./AudioRecorder";
import StoryCreatedOverlay from "./StoryCreated";
import {
  DateChip,
  LocationChip,
  type LocationValue,
  MusicChip,
  type MusicValue,
} from "./pickers";
import SendToDrawer from "../../../../components/share/SendToDrawer";
import PromptPreviewCard from "../../../../components/share/PromptPreviewCard";
import {
  AudioPill,
  ContentTypeButton,
  MediaThumb,
  type MediaKind,
  type StoryMedia,
  Toggle,
} from "./shared";
import {
  ArrowRightIcon,
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  GalleryIcon,
  HelpIcon,
  ImageIcon,
  MicrophoneIcon,
  PencilIcon,
  SendIcon,
  UploadIcon,
  VideoCameraAddIcon,
} from "../icons";

type Mode = "tell" | "ask" | "inspire";
type ContentType = "text" | "audio" | "video" | "image";

const MODE_CARDS: Array<{
  id: Mode;
  title: string;
  description: string;
  cover: string;
}> = [
  {
    id: "tell",
    title: "Tell a Story",
    description: "Capture the stories only you can tell.",
    cover: "/empty-state-cards/card1/coverimage-card1.png",
  },
  {
    id: "ask",
    title: "Ask a Question",
    description:
      "The people you love have stories you've never heard. Ask.",
    cover: "/empty-state-cards/card1/kid-cake.jpg",
  },
  {
    id: "inspire",
    title: "Find Inspiration",
    description: "Browse questions that bring the stories you love to life.",
    cover: "/empty-state-cards/card1/girl.jpg",
  },
];

type TellDraft = {
  title: string;
  text: string;
  contentType: ContentType;
  coverFile: File | null;
  coverPreview: string | null;
  allowShare: boolean;
  media: StoryMedia[];
  promptId: string | null;
  storyId: string | null;
  dateOfStory: string | null;
  location: LocationValue | null;
  music: MusicValue | null;
};

type AskDraft = {
  question: string;
  coverFile: File | null;
  coverPreview: string | null;
};

const EMPTY_TELL: TellDraft = {
  title: "",
  text: "",
  contentType: "text",
  coverFile: null,
  coverPreview: null,
  allowShare: false,
  media: [],
  promptId: null,
  storyId: null,
  dateOfStory: null,
  location: null,
  music: null,
};

const EMPTY_ASK: AskDraft = {
  question: "",
  coverFile: null,
  coverPreview: null,
};

export default function NewStoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Album-context entry point: /new-story?mode=tell&albumId=<id> comes from
  // "Album → Create new story". When albumId is present, skip the landing +
  // sidebar mode picker and drop straight into the Tell flow; on publish,
  // attach the new thread to the album and land back inside it.
  const albumId = searchParams.get("albumId");
  const paramMode = searchParams.get("mode");
  // Deep-link entry from /inspiration → "Answer yourself". Drops the user
  // straight into ReplyEditor without the mode picker or landing view.
  const replyTo = searchParams.get("replyTo");
  const initialMode: Mode | null = replyTo ? "inspire" : null;

  const [mode, setMode] = useState<Mode | null>(initialMode);

  // Legacy deep link `?mode=tell&albumId=…` (from Album → Create new story) —
  // route to the new dedicated /new-lag page.
  useEffect(() => {
    if (paramMode === "tell") {
      const qs = albumId ? `?albumId=${albumId}` : "";
      router.replace(`/new-lag${qs}`);
    }
  }, [paramMode, albumId, router]);
  const [step, setStep] = useState<1 | 2>(1);
  const [tell, setTell] = useState<TellDraft>(EMPTY_TELL);
  const [ask, setAsk] = useState<AskDraft>(EMPTY_ASK);
  const [inspireReplyId, setInspireReplyId] = useState<string | null>(
    replyTo || null
  );

  // Listen for the Sidebar Create button dispatching a reset — Next's App
  // Router doesn't remount on same-route link clicks, so we can't rely on
  // mount to reset state. On event: bail out of any composer + drafts.
  useEffect(() => {
    function onReset() {
      setMode(null);
      setStep(1);
      setInspireReplyId(null);
      setTell(EMPTY_TELL);
      setAsk(EMPTY_ASK);
    }
    window.addEventListener("new-story:reset", onReset);
    return () => window.removeEventListener("new-story:reset", onReset);
  }, []);

  function selectMode(next: Mode) {
    if (next === "inspire") {
      router.push("/inspiration");
      return;
    }
    if (next === "tell") {
      router.push("/new-lag");
      return;
    }
    if (next === "ask") {
      router.push("/new-ask");
      return;
    }
    if (next === mode) return;
    setMode(next);
    setStep(1);
    setInspireReplyId(null);
  }

  if (mode === null && !albumId) {
    return (
      <div className="h-full flex flex-col px-[16px] md:px-[24px] lg:px-[40px] pt-[16px] pb-[24px] min-h-0 overflow-y-auto scrollbar-hide">
        <h1 className="font-montserrat font-bold text-primary-blue text-[24px] md:text-[28px] leading-tight mb-[20px]">
          Create
        </h1>

        {/* Tablet + desktop (md+): 3 vertical cards in a row, image on top.
            Cards flex to share available width — no persistent sidebar until
            lg, so tablet has enough room for the same three-up layout. */}
        <div className="hidden md:flex gap-[16px] lg:gap-[20px]">
          {MODE_CARDS.map((card) => (
            <LandingModeCard
              key={card.id}
              card={card}
              onClick={() => selectMode(card.id)}
            />
          ))}
        </div>

        {/* Mobile (< md): stacked horizontal cards, image on left. */}
        <div className="flex md:hidden flex-col gap-[8px] w-full max-w-[560px] mx-auto">
          {MODE_CARDS.map((card) => (
            <HorizontalModeCard
              key={card.id}
              card={card}
              onClick={() => selectMode(card.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex min-h-0">
      {!albumId && (
        <section className="w-[360px] shrink-0 flex flex-col px-[24px] pt-[16px] min-h-0">
          <h1 className="font-montserrat font-bold text-primary-blue text-[24px] md:text-[28px] leading-tight mb-[16px]">
            Create
          </h1>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide -mx-[20px] px-[20px] pt-[6px] pb-[24px]">
            <ul className="flex flex-col gap-[12px]">
              {MODE_CARDS.map((card) => (
                <li key={card.id}>
                  <ModeCard
                    card={card}
                    active={mode === card.id}
                    onClick={() => selectMode(card.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {mode === "ask" && step === 1 && (
          <AskStep1
            draft={ask}
            onChange={setAsk}
            onNext={() => setStep(2)}
          />
        )}
        {mode === "ask" && step === 2 && (
          <AskStep2
            draft={ask}
            onChange={setAsk}
            onBack={() => setStep(1)}
            onComplete={() => router.push("/interactions?tab=sent")}
          />
        )}
        {mode === "inspire" && !inspireReplyId && (
          <InspirationCarousel onCardTap={(id) => setInspireReplyId(id)} />
        )}
        {mode === "inspire" && inspireReplyId && (
          <ReplyEditor
            promptId={inspireReplyId}
            onBack={() => setInspireReplyId(null)}
            onPublished={(threadId) => {
              setInspireReplyId(null);
              if (threadId) router.push(`/thread/${threadId}`);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ModeCard({
  card,
  active,
  onClick,
}: {
  card: (typeof MODE_CARDS)[number];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left cursor-pointer bg-white rounded-[20px] shadow-[0_0_12.5px_rgba(0,0,0,0.15)] pt-[6px] px-[6px] pb-[6px] flex gap-[12px] transition-colors ${
        active
          ? "border-[3px] border-primary-orange"
          : "border-[3px] border-transparent"
      }`}
    >
      <div className="relative w-[96px] h-[96px] rounded-[14px] overflow-hidden bg-primary-blue/10 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-[6px] pr-[8px]">
        <div className="flex flex-col gap-[4px] min-w-0">
          <p className="font-montserrat font-bold text-primary-blue text-[15px] leading-[18px]">
            {card.title}
          </p>
          <p className="font-montserrat text-primary-blue/70 text-[12px] leading-[16px]">
            {card.description}
          </p>
        </div>
        <div className="flex justify-end text-primary-blue/60">
          <ArrowRightIcon width={16} height={16} />
        </div>
      </div>
    </button>
  );
}

// Larger vertical variant used on the Create landing view — cover on top,
// text below, arrow bottom-right. Same content as ModeCard.
function LandingModeCard({
  card,
  onClick,
}: {
  card: (typeof MODE_CARDS)[number];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-0 lg:max-w-[320px] text-left cursor-pointer bg-white rounded-[20px] shadow-[0_0_12.5px_rgba(0,0,0,0.15)] p-[6px] pb-[14px] flex flex-col hover:shadow-[0_2px_16px_rgba(0,0,0,0.18)] transition-shadow"
    >
      <div className="relative aspect-[4/3] rounded-t-[14px] overflow-hidden bg-primary-blue/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="mt-[12px] px-[8px] flex flex-col gap-[4px]">
        <p className="font-montserrat font-bold text-primary-blue text-[15px] leading-[19px]">
          {card.title}
        </p>
        <p className="font-montserrat text-primary-blue/70 text-[12px] leading-[16px]">
          {card.description}
        </p>
      </div>
      <div className="mt-auto pt-[12px] px-[8px] flex justify-end">
        <span className="w-[28px] h-[28px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center">
          <ArrowRightIcon width={14} height={14} />
        </span>
      </div>
    </button>
  );
}

// Tablet + mobile variant. Mirrors the mobile Figma spec: 140-square image on
// the left (rounded on the leading edge only), title + description stacked on
// the right, and a circular arrow pinned to the bottom-right of the text area.
// The card width flexes to the container; the parent caps it on tablet so it
// doesn't stretch across a wide screen.
function HorizontalModeCard({
  card,
  onClick,
}: {
  card: (typeof MODE_CARDS)[number];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left cursor-pointer bg-white rounded-[16px] shadow-[0_0_12.5px_rgba(0,0,0,0.15)] p-[6px] flex gap-[16px] hover:shadow-[0_2px_16px_rgba(0,0,0,0.18)] transition-shadow"
    >
      <div className="relative w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-l-[12px] overflow-hidden bg-primary-blue/10 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.cover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center py-[6px] pr-[8px]">
        <p className="font-montserrat font-medium text-primary-blue text-[16px] leading-[20px]">
          {card.title}
        </p>
        <p className="mt-[4px] font-montserrat font-medium text-primary-blue/50 text-[14px] leading-[16px]">
          {card.description}
        </p>
        <div className="mt-auto pt-[8px] flex justify-end">
          <span className="w-[24px] h-[24px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center">
            <ArrowRightIcon width={12} height={12} />
          </span>
        </div>
      </div>
    </button>
  );
}

function PanelHeader({
  title,
  onBack,
  onPreview,
}: {
  title: string;
  onBack?: () => void;
  onPreview?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-[16px] mb-[16px]">
      <div className="flex items-center gap-[10px] min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
        )}
        <h2 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[26px] leading-tight truncate">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-[8px] text-primary-blue shrink-0">
        <button
          type="button"
          aria-label="Help"
          className="cursor-pointer w-[32px] h-[32px] rounded-full bg-primary-blue text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <HelpIcon width={16} height={16} />
        </button>
        <button
          type="button"
          onClick={onPreview}
          disabled={!onPreview}
          aria-label="Preview story"
          className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <EyeIcon width={18} height={18} />
        </button>
      </div>
    </div>
  );
}

function TitlePill({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-[#ededed] rounded-full pl-[14px] pr-[16px] py-[10px] flex items-center gap-[10px]">
      <PencilIcon
        width={16}
        height={16}
        className="text-primary-blue/60 shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Title your story"
        className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[15px]"
      />
    </div>
  );
}

function TellStep1({
  draft,
  onChange,
  onNext,
}: {
  draft: TellDraft;
  onChange: React.Dispatch<React.SetStateAction<TellDraft>>;
  onNext: () => void;
}) {
  const { user } = useAuth();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [addingKind, setAddingKind] = useState<"image" | "video" | null>(null);
  const [previewData, setPreviewData] = useState<ThreadResponse | null>(null);

  function openPreview() {
    if (!user) return;
    setPreviewData(
      buildPreviewThread({
        currentUser: user,
        title: draft.title,
        text: draft.text,
        media: draft.media,
        dateOfStory: draft.dateOfStory,
        location: draft.location,
        music: draft.music,
        coverPreview: draft.coverPreview,
        prompt: null,
      })
    );
  }

  // Refs survive re-renders and avoid stale-closure bugs during async work.
  const abortHandlesRef = useRef<Map<string, () => void>>(new Map());
  const setupPromiseRef = useRef<Promise<{
    promptId: string;
    storyId: string;
  }> | null>(null);
  const promptIdRef = useRef<string | null>(draft.promptId);
  const storyIdRef = useRef<string | null>(draft.storyId);
  const titleRef = useRef<string>(draft.title);
  useEffect(() => {
    promptIdRef.current = draft.promptId;
    storyIdRef.current = draft.storyId;
    titleRef.current = draft.title;
  });

  async function ensureSetup(): Promise<{ promptId: string; storyId: string }> {
    if (promptIdRef.current && storyIdRef.current) {
      return {
        promptId: promptIdRef.current,
        storyId: storyIdRef.current,
      };
    }
    if (setupPromiseRef.current) return setupPromiseRef.current;

    const promise = (async () => {
      // In reply mode the prompt already exists (from URL param) — reuse it.
      // Otherwise, create an empty placeholder user-card owned by this user.
      let promptId = promptIdRef.current;
      if (!promptId) {
        const card = await createUserCard({ content: "", type: "WHITE" });
        promptId = card._id;
        promptIdRef.current = promptId;
      }
      // Placeholder title if user hasn't typed one yet; real title patched
      // via updateStory in the Create story handler.
      const initialTitle = titleRef.current.trim() || "Untitled";
      const story = await createStory({
        title: initialTitle,
        content: "",
        status: "draft",
        promptId,
      });
      storyIdRef.current = story._id;
      onChange((prev) => ({
        ...prev,
        promptId,
        storyId: story._id,
      }));
      return { promptId, storyId: story._id };
    })();

    setupPromiseRef.current = promise;
    // Clear on failure so a retry can create a fresh setup.
    promise.catch(() => {
      setupPromiseRef.current = null;
    });
    return promise;
  }

  async function startUpload(media: StoryMedia) {
    if (!media.file) return;
    const file = media.file;
    try {
      const { storyId } = await ensureSetup();
      const token = await getUploadToken(storyId, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      const { promise, abort } = uploadToCloudinaryWithProgress(
        token,
        file,
        (fraction) => {
          onChange((prev) => ({
            ...prev,
            media: prev.media.map((m) =>
              m.id === media.id ? { ...m, progress: fraction } : m
            ),
          }));
        }
      );
      abortHandlesRef.current.set(media.id, abort);
      const result = await promise;
      abortHandlesRef.current.delete(media.id);
      onChange((prev) => ({
        ...prev,
        media: prev.media.map((m) =>
          m.id === media.id
            ? {
                ...m,
                uploadState: "done",
                progress: 1,
                uploadedUrl: result.secure_url,
              }
            : m
        ),
      }));
    } catch (err) {
      abortHandlesRef.current.delete(media.id);
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed";
      // Aborts are user-initiated (removal) — swallow silently.
      if (message.toLowerCase().includes("abort")) return;
      onChange((prev) => {
        if (!prev.media.some((m) => m.id === media.id)) return prev;
        return {
          ...prev,
          media: prev.media.map((m) =>
            m.id === media.id
              ? { ...m, uploadState: "error", errorMessage: message }
              : m
          ),
        };
      });
    }
  }

  async function handleMediaPicked(
    kind: "image" | "video",
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;
    setAddingKind(kind);
    try {
      const picked: StoryMedia[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith(`${kind}/`)) continue;
        let processed = file;
        if (kind === "image") {
          try {
            processed = await compressImage(file);
          } catch {
            // fall back to original if compression fails
          }
        }
        picked.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: processed,
          preview: URL.createObjectURL(processed),
          kind,
          uploadState: "uploading",
          progress: 0,
        });
      }
      if (picked.length === 0) return;
      onChange((prev) => ({ ...prev, media: [...prev.media, ...picked] }));
      for (const item of picked) void startUpload(item);
    } finally {
      setAddingKind(null);
      const ref = kind === "image" ? imageInputRef : videoInputRef;
      if (ref.current) ref.current.value = "";
    }
  }

  function handleAudioSave(
    file: File,
    waveform: number[],
    durationMs: number
  ) {
    const media: StoryMedia = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
      kind: "audio",
      uploadState: "uploading",
      progress: 0,
      waveform,
      durationMs,
    };
    onChange((prev) => ({
      ...prev,
      media: [...prev.media, media],
      contentType: "text",
    }));
    void startUpload(media);
  }

  function removeMedia(id: string) {
    const abort = abortHandlesRef.current.get(id);
    if (abort) {
      abort();
      abortHandlesRef.current.delete(id);
    }
    onChange((prev) => {
      const removed = prev.media.find((m) => m.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return { ...prev, media: prev.media.filter((m) => m.id !== id) };
    });
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col px-[40px] pt-[16px] pb-[16px] min-h-0 overflow-y-auto scrollbar-hide">
      <PanelHeader title="New Story" onPreview={openPreview} />
      <PreviewOverlay
        open={previewData !== null}
        data={previewData}
        currentUser={user}
        onClose={() => setPreviewData(null)}
      />

      <div className="mb-[14px]">
        <TitlePill
          value={draft.title}
          onChange={(v) => onChange({ ...draft, title: v })}
        />
      </div>

      <div
        className={`flex-1 rounded-[20px] p-[16px] flex flex-col gap-[12px] ${
          draft.contentType === "audio" ? "bg-white" : "bg-[#ededed]"
        }`}
      >
        {draft.contentType === "audio" ? (
          <AudioRecorder onSave={handleAudioSave} />
        ) : (
          <textarea
            value={draft.text}
            onChange={(e) => onChange({ ...draft, text: e.target.value })}
            placeholder="Text"
            className="flex-1 min-h-[140px] resize-none bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[15px] leading-[22px]"
          />
        )}
        {draft.contentType !== "audio" &&
          draft.media.some((m) => m.kind === "audio") && (
            <div className="shrink-0 flex flex-col gap-[8px]">
              {draft.media
                .filter((m) => m.kind === "audio")
                .map((m) => (
                  <AudioPill
                    key={m.id}
                    media={m}
                    onRemove={() => removeMedia(m.id)}
                  />
                ))}
            </div>
          )}
        {draft.contentType !== "audio" &&
          draft.media.some(
            (m) => m.kind === "image" || m.kind === "video"
          ) && (
            <div className="shrink-0 h-[88px] flex gap-[8px] overflow-x-auto scrollbar-hide">
              {draft.media
                .filter((m) => m.kind === "image" || m.kind === "video")
                .map((m) => (
                  <MediaThumb
                    key={m.id}
                    media={m}
                    onRemove={() => removeMedia(m.id)}
                  />
                ))}
            </div>
          )}
      </div>

      <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
        <LocationChip
          value={draft.location}
          onChange={(v) => onChange({ ...draft, location: v })}
        />
        <MusicChip
          value={draft.music}
          onChange={(v) => onChange({ ...draft, music: v })}
        />
        <DateChip
          value={draft.dateOfStory}
          onChange={(v) => onChange({ ...draft, dateOfStory: v })}
        />
      </div>

      <div className="mt-[16px] flex items-center justify-center gap-[16px]">
        <ContentTypeButton
          active={draft.contentType === "text"}
          onClick={() => onChange({ ...draft, contentType: "text" })}
          ariaLabel="Text"
        >
          <span className="font-montserrat font-bold text-[15px]">Aa</span>
        </ContentTypeButton>
        <ContentTypeButton
          active={draft.contentType === "audio"}
          onClick={() => onChange({ ...draft, contentType: "audio" })}
          ariaLabel="Audio"
        >
          <MicrophoneIcon width={24} height={24} />
        </ContentTypeButton>
        <ContentTypeButton
          active={addingKind === "video"}
          onClick={() => videoInputRef.current?.click()}
          ariaLabel="Video"
        >
          <VideoCameraAddIcon width={24} height={24} />
        </ContentTypeButton>
        <ContentTypeButton
          active={addingKind === "image"}
          onClick={() => imageInputRef.current?.click()}
          ariaLabel="Image"
        >
          <GalleryIcon width={24} height={24} />
        </ContentTypeButton>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleMediaPicked("image", e.target.files)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => handleMediaPicked("video", e.target.files)}
      />
      <button
        type="button"
        onClick={onNext}
        className="cursor-pointer mt-[16px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity"
      >
        Next
      </button>
    </div>
  );
}


function TellStep2({
  draft,
  onChange,
  onBack,
  albumId,
}: {
  draft: TellDraft;
  onChange: React.Dispatch<React.SetStateAction<TellDraft>>;
  onBack: () => void;
  albumId?: string | null;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [createdStory, setCreatedStory] = useState<{
    storyId: string;
    threadId: string | null;
  } | null>(null);
  const [previewData, setPreviewData] = useState<ThreadResponse | null>(null);

  function openPreview() {
    if (!user) return;
    setPreviewData(
      buildPreviewThread({
        currentUser: user,
        title: draft.title,
        text: draft.text,
        media: draft.media,
        dateOfStory: draft.dateOfStory,
        location: draft.location,
        music: draft.music,
        coverPreview: draft.coverPreview,
        prompt: null,
      })
    );
  }

  const pendingUploads = draft.media.filter((m) => m.uploadState === "uploading");
  const erroredUploads = draft.media.filter((m) => m.uploadState === "error");
  const hasPendingUploads = pendingUploads.length > 0;
  const hasErroredUploads = erroredUploads.length > 0;

  const canSubmit =
    draft.title.trim().length > 0 &&
    draft.coverFile !== null &&
    !submitting &&
    !hasPendingUploads &&
    !hasErroredUploads;

  async function handleCreate() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Eager upload path — media was uploaded to Cloudinary as the user
      // picked each file, and setup created the user-card + draft story
      // upstream. Here we just finalize: attach cover (fresh only),
      // patch content, publish.
      if (!draft.storyId) {
        // Fallback: user reached step 2 without picking any media, so
        // setup never ran. Reuse the pre-set promptId (reply mode) or
        // create a fresh user-card.
        let promptId = draft.promptId;
        if (!promptId) {
          const card = await createUserCard({ content: "", type: "WHITE" });
          promptId = card._id;
        }
        const story = await createStory({
          title: draft.title.trim(),
          content: "",
          status: "draft",
          promptId,
        });
        onChange((prev) => ({
          ...prev,
          promptId,
          storyId: story._id,
        }));
        draft = { ...draft, promptId, storyId: story._id };
      }

      // Attach the cover image to the user-card ONLY in fresh Tell mode.
      // In reply mode the prompt-owner already set the card's cover and
      // we don't want to overwrite it.
      if (draft.coverFile) {
        await updateUserCard(draft.promptId!, { file: draft.coverFile });
      }

      // Patch story with the real title + serialized content built from the
      // already-uploaded media URLs.
      const uploadedBlocks = draft.media
        .filter((m) => m.uploadState === "done" && m.uploadedUrl)
        .map((m) => ({
          type: m.kind as "image" | "video" | "audio",
          url: m.uploadedUrl!,
        }));
      const finalContent = serializeBlocksToContent([
        { type: "text", text: draft.text },
        ...uploadedBlocks,
      ]);
      // Mobile V4 rule: always send location + music keys (with null when
      // cleared) so the BE can drop a previously-attached value on edit.
      await updateStory(draft.storyId!, {
        title: draft.title.trim() || undefined,
        content: finalContent,
        dateOfStory: draft.dateOfStory ?? undefined,
        location: draft.location ?? null,
        music: draft.music ?? null,
      });

      // /publish rejects isPrivate (Joi 422). BE default is private, so we
      // only call /privacy when the user has opted IN to sharing.
      const published = await publishStory(draft.storyId!, {
        shareWith: [],
        sendSeparately: false,
      });
      const threadId = published.storyThread ?? published._id;
      if (threadId && draft.allowShare) {
        try {
          await setThreadPrivacy(threadId, { isPrivate: false });
        } catch {
          // non-fatal — story is published; user can change privacy later
        }
      }
      // Album context: mirror mobile's post-publish attach so the new
      // thread shows up inside the album. Best-effort — a failure here
      // shouldn't undo the successful publish.
      if (albumId && threadId) {
        try {
          await attachAlbumThreads(albumId, [threadId]);
        } catch {
          toast.error("Story published but couldn't add it to the album");
        }
      }
      setCreatedStory({ storyId: draft.storyId!, threadId: threadId ?? null });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col px-[40px] pt-[16px] pb-[16px] min-h-0 overflow-y-auto scrollbar-hide">
      {createdStory && (
        <StoryCreatedOverlay
          storyId={createdStory.storyId}
          onDone={() => {
            if (albumId) {
              router.push(`/lags`);
              return;
            }
            if (createdStory.threadId) {
              router.push(`/thread/${createdStory.threadId}`);
            } else {
              toast.error("Story created but could not open thread");
              setCreatedStory(null);
            }
          }}
        />
      )}
      <PanelHeader title="New Story" onBack={onBack} onPreview={openPreview} />
      <PreviewOverlay
        open={previewData !== null}
        data={previewData}
        currentUser={user}
        onClose={() => setPreviewData(null)}
      />

      <div className="mb-[14px]">
        <TitlePill
          value={draft.title}
          onChange={(v) => onChange({ ...draft, title: v })}
        />
      </div>

      <CoverUploadZone
        preview={draft.coverPreview}
        onFile={(file, preview) =>
          onChange({ ...draft, coverFile: file, coverPreview: preview })
        }
      />

      <div className="mt-[16px] flex items-center justify-between gap-[12px] px-[4px]">
        <span className="font-montserrat font-semibold text-primary-blue text-[14px]">
          Allow others to share
        </span>
        <Toggle
          checked={draft.allowShare}
          onChange={(v) => onChange({ ...draft, allowShare: v })}
          ariaLabel="Allow others to share"
        />
      </div>

      <div className="mt-[12px] bg-white rounded-[14px] shadow-[0_0_10px_rgba(0,0,0,0.08)] px-[14px] py-[12px] flex items-start gap-[10px]">
        <div className="shrink-0 w-[22px] h-[22px] flex items-center justify-center text-primary-blue">
          <LockIcon width={16} height={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-montserrat font-semibold text-primary-blue text-[13px] leading-[16px]">
            Secure and Private
          </p>
          <p className="font-montserrat text-primary-blue/70 text-[12px] leading-[16px] mt-[2px]">
            {draft.allowShare
              ? "Recipients can invite others to this thread."
              : "Only you can add people to this thread."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={!canSubmit}
        className="cursor-pointer mt-[16px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Creating…"
          : hasErroredUploads
            ? "Fix failed uploads to continue"
            : hasPendingUploads
              ? `Uploading… ${pendingUploads.length} left`
              : "Create story"}
      </button>
    </div>
  );
}

function AskStep1({
  draft,
  onChange,
  onNext,
}: {
  draft: AskDraft;
  onChange: (next: AskDraft) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-[40px] pt-[16px] pb-[16px] min-h-0">
      <div className="w-full max-w-[420px] flex flex-col">
        <h2 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[24px] leading-tight text-center mb-[20px]">
          What would you like to know?
        </h2>

        <div className="bg-[#ededed] rounded-full pl-[14px] pr-[16px] py-[12px] flex items-center gap-[10px]">
          <PencilIcon
            width={16}
            height={16}
            className="text-primary-blue/60 shrink-0"
          />
          <input
            type="text"
            value={draft.question}
            onChange={(e) => onChange({ ...draft, question: e.target.value })}
            placeholder="What's your favorite memory?"
            className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[15px]"
          />
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={draft.question.trim().length === 0}
          className="cursor-pointer mt-[16px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function AskStep2({
  draft,
  onChange,
  onBack,
  onComplete,
}: {
  draft: AskDraft;
  onChange: (next: AskDraft) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleNext() {
    if (creating) return;
    setCreating(true);
    try {
      let id = promptId;
      if (!id) {
        const card = await createUserCard({
          content: draft.question.trim(),
          type: "WHITE",
          file: draft.coverFile,
        });
        id = card._id;
        setPromptId(id);
      }
      setModalOpen(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  // Drawer owns the celebration ("Prompt Sent"). On Done we hand off to
  // onComplete which finishes the composer step.
  const [askSentThisSession, setAskSentThisSession] = useState(false);
  async function handleShareSend(
    userIds: string[],
    groupIds: string[],
    note: string
  ) {
    if (!promptId) return;
    try {
      await shareUserCard(promptId, {
        shareWith: userIds,
        groupIds,
        // sendSeparately dropped in v1 — see share drawer migration notes.
        sendSeparately: false,
        note,
      });
      setAskSentThisSession(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      throw new Error(message);
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col px-[40px] pt-[16px] pb-[16px] min-h-0 overflow-y-auto scrollbar-hide">
      <div className="flex items-center gap-[10px] mb-[16px]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <h2 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[26px] leading-tight">
          Add a cover image
        </h2>
      </div>

      <CoverUploadZone
        preview={draft.coverPreview}
        onFile={(file, preview) =>
          onChange({ ...draft, coverFile: file, coverPreview: preview })
        }
        prompt="Choose an image or drag and drop here"
        showUploadButton
      />

      <button
        type="button"
        onClick={handleNext}
        disabled={creating}
        className="cursor-pointer mt-[16px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? "Preparing…" : "Next"}
      </button>

      <SendToDrawer
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          if (askSentThisSession) {
            setAskSentThisSession(false);
            onComplete();
          }
        }}
        onSend={handleShareSend}
        shareContext="prompt"
        showMessageInput
        shareTarget={promptId ? { kind: "prompt", id: promptId } : undefined}
      />
    </div>
  );
}

function CoverUploadZone({
  preview,
  onFile,
  prompt = "Click to upload a cover photo",
  showUploadButton = false,
}: {
  preview: string | null;
  onFile: (file: File, preview: string) => void;
  prompt?: string;
  showUploadButton?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      onFile(compressed, url);
    } catch {
      const url = URL.createObjectURL(file);
      onFile(file, url);
    }
  }

  return (
    <div
      className={`flex-1 min-h-[240px] rounded-[20px] bg-[#ededed] flex items-center justify-center relative overflow-hidden cursor-pointer transition-colors ${
        dragging ? "bg-[#e2e2e2]" : ""
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-[10px] text-primary-blue/60 pointer-events-none">
          <ImageIcon width={36} height={36} />
          <p className="font-montserrat text-[13px] text-center max-w-[220px]">
            {prompt}
          </p>
          {showUploadButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="pointer-events-auto mt-[6px] cursor-pointer bg-white text-primary-blue font-montserrat font-semibold text-[13px] rounded-full px-[16px] py-[8px] border border-primary-blue/20 flex items-center gap-[8px] hover:bg-black/[0.03] transition-colors"
            >
              <UploadIcon width={14} height={14} />
              Upload
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}


function LockIcon(props: { width?: number; height?: number }) {
  return (
    <svg
      width={props.width ?? 16}
      height={props.height ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" ry="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}


function useInspirationBookmark(cardId: string, initial: boolean) {
  const [bookmarked, setBookmarked] = useState(initial);
  const pendingRef = useRef(false);

  const toggle = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const previous = bookmarked;
    setBookmarked(!previous);
    try {
      await toggleCardBookmark(cardId);
    } catch {
      setBookmarked(previous);
      toast.error("Couldn't update bookmark");
    } finally {
      pendingRef.current = false;
    }
  }, [cardId, bookmarked]);

  return { bookmarked, toggle };
}

function InspirationCarousel({ onCardTap }: { onCardTap: (id: string) => void }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCard, setShareCard] = useState<UserCard | null>(null);

  async function handleShareSend(
    userIds: string[],
    groupIds: string[],
    note: string
  ) {
    if (!shareCard) return;
    try {
      await shareUserCard(shareCard._id, {
        shareWith: userIds,
        groupIds,
        // sendSeparately dropped in v1 — see share drawer migration notes.
        sendSeparately: false,
        note,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not share. Please try again.";
      throw new Error(message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { cards: fetched } = await fetchInspirationFeed(1, 20);
        if (cancelled) return;
        const unique = Array.from(
          new Map(fetched.map((c) => [c._id, c])).values()
        );
        setCards(unique);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Couldn't load inspiration cards.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    const step = first ? first.offsetWidth + 16 : 252;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el || cards.length === 0) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    const step = first ? first.offsetWidth + 16 : 252;
    const index = Math.round(el.scrollLeft / step);
    setActiveIndex(Math.min(Math.max(index, 0), cards.length - 1));
  };

  const showControls = !loading && !error && cards.length > 0;

  return (
    <div className="flex-1 min-w-0 flex flex-col px-[40px] pt-[16px] pb-[16px] min-h-0">
      <h2 className="font-montserrat font-medium text-primary-blue text-[24px] leading-[28px] mb-[16px]">
        Inspiration cards
      </h2>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 -mx-[40px] px-[40px] py-[16px] -my-[16px] overflow-x-auto scrollbar-hide"
      >
        {loading ? (
          <InspirationSkeletonRail />
        ) : error ? (
          <p className="font-montserrat text-primary-blue/60 text-[14px]">
            {error}
          </p>
        ) : cards.length === 0 ? (
          <p className="font-montserrat text-primary-blue/50 text-[14px]">
            No inspiration cards yet.
          </p>
        ) : (
          <ul className="flex gap-[16px] items-start">
            {cards.map((card) => (
              <li key={card._id} data-card className="shrink-0">
                <InspirationCard
                  card={card}
                  onTap={() => onCardTap(card._id)}
                  onShare={() => setShareCard(card)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {showControls && (
        <div className="mt-[16px] flex items-center justify-center gap-[16px]">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollByCard(-1)}
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-black/[0.06] text-primary-blue flex items-center justify-center hover:bg-black/[0.1] transition-colors"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>

          <div className="flex items-center gap-[6px]">
            {cards.map((card, i) => (
              <span
                key={card._id}
                className={`h-[11px] w-[11px] rounded-full transition-colors ${
                  i === activeIndex ? "bg-primary-orange" : "bg-black/[0.15]"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollByCard(1)}
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-primary-orange text-white flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <ChevronRightIcon width={16} height={16} />
          </button>
        </div>
      )}

      <SendToDrawer
        open={shareCard !== null}
        onClose={() => setShareCard(null)}
        onSend={handleShareSend}
        shareContext="prompt"
        showMessageInput
        shareTarget={shareCard ? { kind: "prompt", id: shareCard._id } : undefined}
        previewContent={shareCard ? <PromptPreviewCard card={shareCard} /> : undefined}
      />
    </div>
  );
}

function InspirationSkeletonRail() {
  return (
    <div className="flex gap-[16px] items-start">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="shrink-0 w-[260px] h-[420px] bg-white rounded-[24px] shadow-[0_0_13px_rgba(0,0,0,0.25)] pt-[10px] px-[10px] pb-[18px] flex flex-col gap-[14px]"
        >
          <div className="flex-1 rounded-t-[18px] bg-black/[0.06] animate-pulse" />
          <div className="h-[14px] w-2/3 mx-auto bg-black/[0.06] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function InspirationCard({
  card,
  onTap,
  onShare,
}: {
  card: UserCard;
  onTap: () => void;
  onShare: () => void;
}) {
  const { bookmarked, toggle } = useInspirationBookmark(
    card._id,
    card.isBookmarked
  );
  const tag = card.tags?.[0];
  const caption = card.content || card.title || "Untitled";
  const imageSrc = card.imageUrl;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      }}
      className="cursor-pointer w-[260px] h-[420px] bg-white rounded-[24px] shadow-[0_0_13px_rgba(0,0,0,0.25)] pt-[10px] px-[10px] pb-[18px] flex flex-col gap-[14px] hover:shadow-[0_0_18px_rgba(0,0,0,0.28)] transition-shadow"
    >
      <div className="relative flex-1 min-h-0 rounded-t-[18px] overflow-hidden bg-primary-blue/10">
        {imageSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="relative flex items-start justify-between pt-[14px] pl-[14px] pr-[12px]">
          {tag ? (
            <div className="bg-white rounded-full px-[10px] py-[4px] font-montserrat font-medium text-primary-blue text-[13px] leading-[16px] capitalize">
              {tag}
            </div>
          ) : (
            <span />
          )}
          <div className="flex flex-col items-center gap-[10px] text-primary-blue">
            <button
              type="button"
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <BookmarkIcon width={13} height={15} filled={bookmarked} />
            </button>
            <button
              type="button"
              aria-label="Send"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="cursor-pointer w-[32px] h-[32px] rounded-full bg-white flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <SendIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
      <p className="font-montserrat font-medium text-primary-blue text-[14px] leading-[18px] text-center px-[8px] line-clamp-3">
        {caption}
      </p>
    </div>
  );
}

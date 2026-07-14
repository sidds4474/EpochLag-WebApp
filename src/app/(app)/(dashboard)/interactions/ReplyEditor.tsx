"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import {
  createStory,
  getUploadToken,
  publishStory,
  setThreadPrivacy,
  updateStory,
  uploadToCloudinaryWithProgress,
} from "../../../../lib/create/api";
import { serializeBlocksToContent } from "../../../../lib/create/content";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { buildPreviewThread } from "../../../../lib/create/preview";
import { fetchUserCard } from "../../../../lib/home/api";
import type { ThreadResponse } from "../../../../types/home";
import PreviewOverlay from "../../../../views/Thread/PreviewOverlay";
import { compressImage } from "../../../../lib/images";
import type { UserCard } from "../../../../types/home";
import AudioRecorder from "../new-story/AudioRecorder";
import StoryCreatedOverlay from "../new-story/StoryCreated";
import {
  DateChip,
  LocationChip,
  type LocationValue,
  MusicChip,
  type MusicValue,
} from "../new-story/pickers";
import {
  AudioPill,
  ContentTypeButton,
  MediaThumb,
  type MediaKind,
  type StoryMedia,
  Toggle,
} from "../new-story/shared";
import {
  ChevronLeftIcon,
  EyeIcon,
  GalleryIcon,
  MicrophoneIcon,
  PencilIcon,
  VideoCameraAddIcon,
} from "../icons";

type Props = {
  promptId: string;
  onPublished: (threadId?: string) => void;
  onBack?: () => void;
  /** When set, the new story is appended to this existing thread (Add more
   * to this Story flow). When null, a brand-new thread is created. */
  appendToThreadId?: string | null;
};

export default function ReplyEditor({
  promptId,
  onPublished,
  onBack,
  appendToThreadId = null,
}: Props) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<UserCard | null>(null);
  const [previewData, setPreviewData] = useState<ThreadResponse | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [media, setMedia] = useState<StoryMedia[]>([]);
  const [contentType, setContentType] = useState<
    "text" | "audio" | "video" | "image"
  >("text");
  const [submitting, setSubmitting] = useState(false);
  const [dateOfStory, setDateOfStory] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [music, setMusic] = useState<MusicValue | null>(null);
  const [allowShare, setAllowShare] = useState(false);
  const [createdStory, setCreatedStory] = useState<{
    storyId: string;
    threadId: string | null;
  } | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [addingKind, setAddingKind] = useState<"image" | "video" | null>(null);

  // Refs for async orchestration — survive re-renders + avoid stale closures.
  const storyIdRef = useRef<string | null>(null);
  const setupPromiseRef = useRef<Promise<string> | null>(null);
  const abortHandlesRef = useRef<Map<string, () => void>>(new Map());
  const titleRef = useRef(title);
  const promptIdRef = useRef(promptId);
  useEffect(() => {
    titleRef.current = title;
    promptIdRef.current = promptId;
  });

  // Fetch the prompt card for the pill.
  useEffect(() => {
    let cancelled = false;
    setPrompt(null);
    setPromptError(null);
    (async () => {
      try {
        const card = await fetchUserCard(promptId);
        if (!cancelled) setPrompt(card);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Couldn't load prompt details.";
        setPromptError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [promptId]);

  // Reset draft when the selected prompt changes.
  useEffect(() => {
    setTitle("");
    setText("");
    setContentType("text");
    setDateOfStory(null);
    setLocation(null);
    setMusic(null);
    setAllowShare(false);
    // Media urls are session-scoped — revoke them to release memory.
    setMedia((prev) => {
      for (const m of prev) URL.revokeObjectURL(m.preview);
      return [];
    });
    // Cancel any in-flight uploads for the previous prompt.
    for (const abort of abortHandlesRef.current.values()) abort();
    abortHandlesRef.current.clear();
    storyIdRef.current = null;
    setupPromiseRef.current = null;
  }, [promptId]);

  async function ensureStory(): Promise<string> {
    if (storyIdRef.current) return storyIdRef.current;
    if (setupPromiseRef.current) return setupPromiseRef.current;

    const promise = (async () => {
      const initialTitle = titleRef.current.trim() || "Untitled";
      const story = await createStory({
        title: initialTitle,
        content: "",
        status: "draft",
        promptId: promptIdRef.current,
        threadId: appendToThreadId ?? undefined,
      });
      storyIdRef.current = story._id;
      return story._id;
    })();

    setupPromiseRef.current = promise;
    promise.catch(() => {
      setupPromiseRef.current = null;
    });
    return promise;
  }

  async function startUpload(item: StoryMedia) {
    if (!item.file) return;
    const file = item.file;
    try {
      const storyId = await ensureStory();
      const token = await getUploadToken(storyId, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      const { promise, abort } = uploadToCloudinaryWithProgress(
        token,
        file,
        (fraction) => {
          setMedia((prev) =>
            prev.map((m) =>
              m.id === item.id ? { ...m, progress: fraction } : m
            )
          );
        }
      );
      abortHandlesRef.current.set(item.id, abort);
      const result = await promise;
      abortHandlesRef.current.delete(item.id);
      setMedia((prev) =>
        prev.map((m) =>
          m.id === item.id
            ? {
                ...m,
                uploadState: "done",
                progress: 1,
                uploadedUrl: result.secure_url,
              }
            : m
        )
      );
    } catch (err) {
      abortHandlesRef.current.delete(item.id);
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed";
      if (message.toLowerCase().includes("abort")) return;
      setMedia((prev) => {
        if (!prev.some((m) => m.id === item.id)) return prev;
        return prev.map((m) =>
          m.id === item.id
            ? { ...m, uploadState: "error", errorMessage: message }
            : m
        );
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
            // keep original if compression fails
          }
        }
        picked.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file: processed,
          preview: URL.createObjectURL(processed),
          kind: kind as MediaKind,
          uploadState: "uploading",
          progress: 0,
        });
      }
      if (picked.length === 0) return;
      setMedia((prev) => [...prev, ...picked]);
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
    const item: StoryMedia = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      preview: URL.createObjectURL(file),
      kind: "audio",
      uploadState: "uploading",
      progress: 0,
      waveform,
      durationMs,
    };
    setMedia((prev) => [...prev, item]);
    setContentType("text");
    void startUpload(item);
  }

  function removeMedia(id: string) {
    const abort = abortHandlesRef.current.get(id);
    if (abort) {
      abort();
      abortHandlesRef.current.delete(id);
    }
    setMedia((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((m) => m.id !== id);
    });
  }

  const pendingUploads = media.filter((m) => m.uploadState === "uploading");
  const erroredUploads = media.filter((m) => m.uploadState === "error");
  const hasContent =
    title.trim().length > 0 || text.trim().length > 0 || media.length > 0;
  const canSubmit =
    hasContent &&
    !submitting &&
    pendingUploads.length === 0 &&
    erroredUploads.length === 0;

  function openPreview() {
    if (!user) return;
    setPreviewData(
      buildPreviewThread({
        currentUser: user,
        title,
        text,
        media,
        dateOfStory,
        location,
        music,
        // Reply flow may have a real prompt (Answer-a-Prompt) — pass through
        // so the pill renders; Tell-mode prompts have isTitleAvailable=true
        // and the helper falls back to hiding the pill.
        prompt,
      })
    );
  }

  async function handlePublish() {
    if (!canSubmit) {
      if (!hasContent) toast("Add some content before saving");
      return;
    }
    setSubmitting(true);
    try {
      const storyId = await ensureStory();

      const uploadedBlocks = media
        .filter((m) => m.uploadState === "done" && m.uploadedUrl)
        .map((m) => ({
          type: m.kind as "image" | "video" | "audio",
          url: m.uploadedUrl!,
        }));
      const finalContent = serializeBlocksToContent([
        { type: "text", text },
        ...uploadedBlocks,
      ]);

      // Mobile V4 rule: always send location + music keys (with null when
      // cleared) so the BE can drop a previously-attached value on edit.
      // For brand-new creation we still send them explicitly for consistency.
      await updateStory(storyId, {
        title: title.trim() || "Untitled",
        content: finalContent,
        dateOfStory: dateOfStory ?? undefined,
        location: location ?? null,
        music: music ?? null,
      });

      const published = await publishStory(storyId, {
        shareWith: [],
        sendSeparately: false,
      });
      const threadId = published.storyThread ?? published._id;

      if (threadId && allowShare) {
        try {
          await setThreadPrivacy(threadId, { isPrivate: false });
        } catch {
          // non-fatal — story is published; privacy can be changed later
        }
      }

      setCreatedStory({ storyId, threadId: threadId ?? null });
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
          onDone={() => onPublished(createdStory.threadId ?? undefined)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-[16px] mb-[16px]">
        <div className="flex items-center gap-[10px] min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors shrink-0"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
          )}
          <h2 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[26px] leading-tight truncate">
            New Story
          </h2>
        </div>
        <button
          type="button"
          onClick={openPreview}
          disabled={!user}
          aria-label="Preview story"
          className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <EyeIcon width={18} height={18} />
        </button>
      </div>

      <PreviewOverlay
        open={previewData !== null}
        data={previewData}
        currentUser={user}
        onClose={() => setPreviewData(null)}
      />

      {/* Prompt pill */}
      {/* Tell-a-Story prompts have no meaningful question content — the pill
          would read as "X asked (empty)". Hide it in that case. */}
      {prompt?.isTitleAvailable !== true && (
        <PromptPill prompt={prompt} errorMessage={promptError} />
      )}

      {/* Title */}
      <div className="mb-[14px]">
        <div className="bg-[#ededed] rounded-full pl-[14px] pr-[16px] py-[10px] flex items-center gap-[10px]">
          <PencilIcon
            width={16}
            height={16}
            className="text-primary-blue/60 shrink-0"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title your story"
            className="flex-1 min-w-0 bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[15px]"
          />
        </div>
      </div>

      {/* Body */}
      <div
        className={`flex-1 rounded-[20px] p-[16px] flex flex-col gap-[12px] ${
          contentType === "audio" ? "bg-white" : "bg-[#ededed]"
        }`}
      >
        {contentType === "audio" ? (
          <AudioRecorder onSave={handleAudioSave} />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text"
            className="flex-1 min-h-[140px] resize-none bg-transparent focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[15px] leading-[22px]"
          />
        )}
        {contentType !== "audio" &&
          media.some((m) => m.kind === "audio") && (
            <div className="shrink-0 flex flex-col gap-[8px]">
              {media
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
        {contentType !== "audio" &&
          media.some((m) => m.kind === "image" || m.kind === "video") && (
            <div className="shrink-0 h-[88px] flex gap-[8px] overflow-x-auto scrollbar-hide">
              {media
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

      {/* Chip row: Location + Music + Date */}
      <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
        <LocationChip value={location} onChange={setLocation} />
        <MusicChip value={music} onChange={setMusic} />
        <DateChip value={dateOfStory} onChange={setDateOfStory} />
      </div>

      {/* Allow others to share */}
      <div className="mt-[14px] flex items-center justify-between gap-[12px] px-[4px]">
        <span className="font-montserrat font-semibold text-primary-blue text-[14px]">
          Allow others to share
        </span>
        <Toggle
          checked={allowShare}
          onChange={setAllowShare}
          ariaLabel="Allow others to share"
        />
      </div>

      {/* Content type buttons */}
      <div className="mt-[16px] flex items-center justify-center gap-[16px]">
        <ContentTypeButton
          active={contentType === "text"}
          onClick={() => setContentType("text")}
          ariaLabel="Text"
        >
          <span className="font-montserrat font-bold text-[15px]">Aa</span>
        </ContentTypeButton>
        <ContentTypeButton
          active={contentType === "audio"}
          onClick={() => setContentType("audio")}
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
        onClick={handlePublish}
        disabled={!canSubmit}
        className="cursor-pointer mt-[16px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Publishing…"
          : erroredUploads.length > 0
            ? "Fix failed uploads to continue"
            : pendingUploads.length > 0
              ? `Uploading… ${pendingUploads.length} left`
              : "Next"}
      </button>
    </div>
  );
}

function PromptPill({
  prompt,
  errorMessage,
}: {
  prompt: UserCard | null;
  errorMessage: string | null;
}) {
  if (errorMessage) {
    return (
      <div className="mb-[12px] px-[14px] py-[8px] rounded-[14px] bg-red-500/10 font-montserrat text-red-600 text-[13px]">
        {errorMessage}
      </div>
    );
  }
  if (!prompt) {
    return (
      <div className="mb-[12px] flex items-center gap-[10px] px-[14px] py-[10px] rounded-[14px] bg-black/[0.04] animate-pulse">
        <div className="w-[32px] h-[32px] rounded-full bg-black/[0.08]" />
        <div className="flex-1 h-[12px] rounded-full bg-black/[0.08]" />
      </div>
    );
  }
  const author = prompt.author;
  const authorName = author
    ? [author.firstName, author.lastName].filter(Boolean).join(" ").trim()
    : "";
  const initial = (authorName || "?").charAt(0).toUpperCase();

  return (
    <div className="mb-[12px] flex items-center gap-[10px]">
      <div className="w-[36px] h-[36px] rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-primary-blue/15">
        {author?.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.profilePicture}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : authorName ? (
          <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[13px]">
            {initial}
          </div>
        ) : (
          // No author on the prompt → inspiration card. Show Epoch Lag logo.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo.svg"
            alt="Epoch Lag"
            className="w-full h-full object-contain bg-white"
          />
        )}
      </div>
      <div className="flex-1 min-w-0 bg-[#ededed] rounded-[14px] px-[14px] py-[10px]">
        {authorName && (
          <p className="font-montserrat font-semibold text-primary-blue text-[13px] mb-[2px]">
            {authorName} asked
          </p>
        )}
        <p className="font-montserrat text-primary-blue text-[14px] leading-[19px] line-clamp-2">
          {prompt.content || "Replying to prompt"}
        </p>
      </div>
    </div>
  );
}


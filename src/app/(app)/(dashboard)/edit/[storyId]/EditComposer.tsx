"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../lib/api/client";
import {
  getUploadToken,
  setThreadPrivacy,
  updateStory,
  uploadToCloudinaryWithProgress,
} from "../../../../../lib/create/api";
import { serializeBlocksToContent } from "../../../../../lib/create/content";
import { compressImage } from "../../../../../lib/images";
import type { ContentBlock } from "../../../../../types/story";
import AudioRecorder from "../../new-story/AudioRecorder";
import {
  DateChip,
  LocationChip,
  type LocationValue,
  MusicChip,
  type MusicValue,
} from "../../new-story/pickers";
import {
  AudioPill,
  ContentTypeButton,
  MediaThumb,
  type MediaKind,
  type StoryMedia,
  Toggle,
} from "../../new-story/shared";
import {
  ChevronLeftIcon,
  EyeIcon,
  GalleryIcon,
  MicrophoneIcon,
  PencilIcon,
  VideoCameraAddIcon,
} from "../../icons";

type StoryLocation = {
  formattedAddress?: string;
  city?: string;
  country?: string;
} | null;

type StoryMusic = {
  trackName?: string;
  artistName?: string;
} | null;

type Props = {
  storyId: string;
  threadId: string;
  threadIsPrivate: boolean;
  initialTitle: string;
  initialBlocks: ContentBlock[];
  initialDateOfStory: string | null;
  initialLocation: StoryLocation;
  initialMusic: StoryMusic;
  onSaved: () => void;
  onCancel: () => void;
};

export default function EditComposer({
  storyId,
  threadId,
  threadIsPrivate,
  initialTitle,
  initialBlocks,
  initialDateOfStory,
  initialLocation,
  initialMusic,
  onSaved,
  onCancel,
}: Props) {
  // Hydrate composer state from parsed content blocks + story fields.
  const initialText = initialBlocks
    .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  const initialMedia: StoryMedia[] = initialBlocks
    .filter(
      (b): b is Extract<ContentBlock, { type: "image" | "video" | "audio" }> =>
        b.type === "image" || b.type === "video" || b.type === "audio"
    )
    .map((b, i) => ({
      id: `existing-${i}-${Math.random().toString(36).slice(2, 8)}`,
      file: null,
      preview: b.url,
      kind: b.type as MediaKind,
      uploadState: "done" as const,
      progress: 1,
      uploadedUrl: b.url,
    }));
  const initialLocationValue: LocationValue | null = initialLocation
    ? {
        formattedAddress: initialLocation.formattedAddress ?? "",
        placeId: "",
        city: initialLocation.city ?? initialLocation.formattedAddress ?? "",
      }
    : null;
  const initialMusicValue: MusicValue | null = initialMusic
    ? {
        trackName: initialMusic.trackName ?? "",
        artistName: initialMusic.artistName ?? "",
        previewUrl: "",
        artworkUrl: "",
      }
    : null;

  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [media, setMedia] = useState<StoryMedia[]>(initialMedia);
  const [contentType, setContentType] = useState<
    "text" | "audio" | "video" | "image"
  >("text");
  const [dateOfStory, setDateOfStory] = useState<string | null>(
    initialDateOfStory
  );
  const [location, setLocation] = useState<LocationValue | null>(
    initialLocationValue
  );
  const [music, setMusic] = useState<MusicValue | null>(initialMusicValue);
  const [allowShare, setAllowShare] = useState(!threadIsPrivate);
  const [submitting, setSubmitting] = useState(false);
  const [addingKind, setAddingKind] = useState<"image" | "video" | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const abortHandlesRef = useRef<Map<string, () => void>>(new Map());

  // Revoke blob URLs on unmount to release memory.
  useEffect(() => {
    return () => {
      for (const m of media) {
        if (m.file) URL.revokeObjectURL(m.preview);
      }
      for (const abort of abortHandlesRef.current.values()) abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startUpload(item: StoryMedia) {
    if (!item.file) return;
    const file = item.file;
    try {
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
      // Only revoke blob URLs we created. Existing items use CDN URLs.
      if (target?.file) URL.revokeObjectURL(target.preview);
      return prev.filter((m) => m.id !== id);
    });
  }

  const pendingUploads = media.filter((m) => m.uploadState === "uploading");
  const erroredUploads = media.filter((m) => m.uploadState === "error");
  const canSave =
    !submitting &&
    pendingUploads.length === 0 &&
    erroredUploads.length === 0;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const blocks = media
        .filter((m) => m.uploadState === "done" && m.uploadedUrl)
        .map((m) => ({
          type: m.kind as "image" | "video" | "audio",
          url: m.uploadedUrl!,
        }));
      const finalContent = serializeBlocksToContent([
        { type: "text", text },
        ...blocks,
      ]);

      await updateStory(storyId, {
        title: title.trim() || "Untitled",
        content: finalContent,
        dateOfStory: dateOfStory ?? undefined,
        location: location ?? null,
        music: music ?? null,
      });

      // If the share-privacy toggle changed, sync it. Suppressed errors — the
      // story text/media edit already succeeded; user can change privacy again.
      const desiredPrivate = !allowShare;
      if (desiredPrivate !== threadIsPrivate) {
        try {
          await setThreadPrivacy(threadId, { isPrivate: desiredPrivate });
        } catch {
          // non-fatal
        }
      }

      toast.success("Story updated");
      onSaved();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Couldn't save. Try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col px-[40px] pt-[16px] pb-[16px] min-h-0 overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between gap-[16px] mb-[16px]">
        <div className="flex items-center gap-[10px] min-w-0">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Back"
            className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors shrink-0"
          >
            <ChevronLeftIcon width={18} height={18} />
          </button>
          <h2 className="font-montserrat font-bold text-primary-blue text-[22px] md:text-[26px] leading-tight truncate">
            Edit Story
          </h2>
        </div>
        <button
          type="button"
          aria-label="Visibility"
          className="cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors shrink-0"
        >
          <EyeIcon width={18} height={18} />
        </button>
      </div>

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

      {/* Chip row */}
      <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
        <LocationChip value={location} onChange={setLocation} />
        <MusicChip value={music} onChange={setMusic} />
        <DateChip value={dateOfStory} onChange={setDateOfStory} />
      </div>

      {/* Allow share */}
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
        onClick={handleSave}
        disabled={!canSave}
        className="cursor-pointer mt-[16px] w-full bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[14px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Saving…"
          : erroredUploads.length > 0
            ? "Fix failed uploads to continue"
            : pendingUploads.length > 0
              ? `Uploading… ${pendingUploads.length} left`
              : "Save changes"}
      </button>
    </div>
  );
}

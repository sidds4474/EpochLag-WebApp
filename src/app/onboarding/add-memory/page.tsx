"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "../../../lib/onboarding/components/OnboardingShell";
import { urlForScreen } from "../../../lib/onboarding";
import {
  GalleryIcon,
  MicrophoneIcon,
  VideoCameraAddIcon,
} from "../../(app)/(dashboard)/icons";
import { useAppDispatch, useAppSelector } from "../../../lib/onboarding/store";
import {
  apiCreateAnonDraft,
  apiGetAnonDraft,
  apiSaveAnonDraft,
} from "../../../lib/onboarding/api/anonEndpoints";
import { setDraftToken } from "../../../lib/onboarding/storage/secureTokenStore";
import {
  setHasDraftToken,
  setLastStep,
} from "../../../lib/onboarding/store/slices/anonDraftSlice";
import {
  hydrateFromServerDraft,
  addVideo,
  removeVideoByMediaId,
  addExtraImages,
  removeExtraImageByMediaId,
  addAudio,
  removeAudio,
  setTextBody as setTextBodyAction,
} from "../../../lib/onboarding/store/slices/createALagSlice";
import { useAnonMediaUpload } from "../../../lib/onboarding/upload/useAnonMediaUpload";
import { useUploads, useUploadStatus } from "../../../lib/onboarding/upload/UploadContext";
import { makeBlockId } from "../../../lib/onboarding/upload/helpers";
import toast from "react-hot-toast";
import AudioRecorder from "../../(app)/(dashboard)/new-story/AudioRecorder";
import exifr from "exifr";
import {
  setDate,
  setLocation,
  setDateOfStoryFromExif,
  setLocationFromExif,
} from "../../../lib/onboarding/store/slices/createALagSlice";
import type { LagLocation } from "../../../lib/onboarding/store/slices/createALagSlice";

type FlipState = null | "editor";

const TITLE = "Start by adding one of\nyour favorite memories";
const HELPER = "Complete your story by adding text,\nvoice messages or videos";
const FLIP_HINT = "Tap to flip";
const COVER_EMPTY_DESKTOP = "Upload an image";
const COVER_EMPTY_MOBILE = "Tap to upload a photo";
const COVER_CAPTION = "My favorite memory";

export default function AddMemoryPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hasDraftToken = useAppSelector((s) => s.anonDraft.hasDraftToken);
  const hydrated = useAppSelector((s) => s.anonDraft.hydrated);
  const [flipped, setFlipped] = useState<FlipState>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null);
  const reduxTextBody = useAppSelector((s) => s.createALag.textBody);
  const reduxCoverUri = useAppSelector((s) => s.createALag.coverUri);
  const textBody = reduxTextBody;
  const setTextBody = (v: string) => dispatch(setTextBodyAction(v));
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const mintedRef = useRef(false);
  const { startUpload } = useAnonMediaUpload();
  const { cancel: cancelUpload } = useUploads();

  // Debounced BE persist for content typing so refresh mid-typing doesn't lose text.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mintedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      apiSaveAnonDraft({ content: reduxTextBody }).catch(() => {});
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [reduxTextBody]);

  // Reflect hydrated cover from server draft into the local preview state.
  useEffect(() => {
    if (reduxCoverUri && !coverUrl) setCoverUrl(reduxCoverUri);
  }, [reduxCoverUri, coverUrl]);

  const videos = useAppSelector((s) => s.createALag.videos);
  const extraImages = useAppSelector((s) => s.createALag.extraImages);
  const audios = useAppSelector((s) => s.createALag.audios);
  const existingDate = useAppSelector((s) => s.createALag.date);
  const existingLocation = useAppSelector((s) => s.createALag.location);

  // Mount effect — mint anon draft (or hydrate if resuming), then mark step reached.
  useEffect(() => {
    if (!hydrated || mintedRef.current) return;
    mintedRef.current = true;
    (async () => {
      try {
        const wasResuming = hasDraftToken;
        if (!wasResuming) {
          const { draftToken } = await apiCreateAnonDraft();
          await setDraftToken(draftToken);
          dispatch(setHasDraftToken(true));
        }
        if (wasResuming) {
          const serverDraft = await apiGetAnonDraft();
          if (serverDraft) dispatch(hydrateFromServerDraft(serverDraft));
        }
        // AddMemory is index 1 in PHASE_A_SCREEN_INDEX (WhatsALag=0).
        dispatch(setLastStep(1));
        // Seed the anon story with a default title so the server-side
        // record doesn't ship as "Untitled" if the user leaves it blank.
        apiSaveAnonDraft({
          title: "My Favorite Memory",
          screensReached: 1,
        }).catch(() => {});
      } catch {
        // Silent — mint failures are logged upstream; UI stays usable and
        // will surface an error at upload time.
      }
    })();
  }, [dispatch, hasDraftToken, hydrated]);

  const goNext = () => {
    if (!coverUrl) {
      toast.error("A cover image is required");
      return;
    }
    if (!textBody.trim()) {
      toast.error("Please add some content");
      return;
    }
    apiSaveAnonDraft({ content: textBody }).catch(() => {});
    router.push(urlForScreen("AddTimePlace"));
  };
  const flipTo = (target: FlipState) => setFlipped(target);
  const flipBack = () => setFlipped(null);

  const openImagePicker = () => imageInputRef.current?.click();
  const openVideoPicker = () => videoInputRef.current?.click();
  const openAudioModal = () => setAudioModalOpen(true);

  const onImagesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const picked = files.map((file) => {
      const mediaId = makeBlockId("image");
      const uri = URL.createObjectURL(file);
      startUpload({
        file,
        mimeType: file.type || "image/jpeg",
        category: "image",
        mediaId,
        onError: () => {
          toast.error("Couldn't add that photo. Please try a different photo.");
          dispatch(removeExtraImageByMediaId(mediaId));
        },
      }).catch(() => {});
      return { mediaId, uri };
    });
    dispatch(addExtraImages(picked));
  };

  const onVideoPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const mediaId = makeBlockId("video");
    const uri = URL.createObjectURL(file);
    const posterUri = await generateVideoPoster(uri).catch(() => null);
    dispatch(addVideo({ mediaId, uri, posterUri }));
    startUpload({
      file,
      mimeType: file.type || "video/mp4",
      category: "video",
      mediaId,
      onError: () => {
        toast.error("Couldn't add that video. Please try a different video.");
        dispatch(removeVideoByMediaId(mediaId));
      },
    }).catch(() => {});
  };

  const onAudioSaved = async (file: File, _wave: number[], durationMs: number) => {
    setAudioModalOpen(false);
    const mediaId = makeBlockId("audio");
    const uri = URL.createObjectURL(file);
    dispatch(addAudio({ mediaId, uri, duration: durationMs / 1000 }));
    startUpload({
      file,
      mimeType: file.type || "audio/webm",
      category: "audio",
      mediaId,
      onError: () => {
        toast.error("Couldn't add that recording. Please try recording again.");
        dispatch(removeAudio(mediaId));
      },
    }).catch(() => {});
  };

  const removeVideo = (mediaId: string) => {
    cancelUpload(mediaId);
    dispatch(removeVideoByMediaId(mediaId));
  };
  const removeImage = (mediaId: string) => {
    cancelUpload(mediaId);
    dispatch(removeExtraImageByMediaId(mediaId));
  };
  const removeAudioAt = (mediaId: string) => {
    cancelUpload(mediaId);
    dispatch(removeAudio(mediaId));
  };

  const openCoverPicker = () => coverInputRef.current?.click();
  const onCoverPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isFirstCover = coverUrl === null;
    setCoverUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });

    // Cancel prior in-flight cover upload if user re-picks mid-upload.
    if (coverMediaId) cancelUpload(coverMediaId);
    const mediaId = makeBlockId("cover");
    setCoverMediaId(mediaId);

    startUpload({
      file,
      mimeType: file.type || "image/jpeg",
      category: "cover",
      mediaId,
      onError: () => {
        toast.error("Couldn't upload that cover. Please pick a different photo.");
        setCoverUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setCoverMediaId(null);
      },
    }).catch(() => {
      // startUpload wraps its own errors; onError fires. This catch swallows
      // any pre-enqueue throw (token mint, compression) so it doesn't crash.
    });

    resolveExif(file, { existingDate, existingLocation, dispatch });

    if (isFirstCover) setTimeout(() => setFlipped("editor"), 200);
  };
  useEffect(() => {
    return () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [coverUrl]);

  return (
    <>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onCoverPicked}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onImagesPicked}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onVideoPicked}
      />
      {audioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center" onClick={() => setAudioModalOpen(false)}>
          <div className="bg-primary-white w-full md:w-[420px] md:rounded-[20px] rounded-t-[20px] p-[20px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-[12px]">
              <h3 className="font-montserrat font-bold text-[16px] text-primary-blue">Record audio</h3>
              <button type="button" onClick={() => setAudioModalOpen(false)} className="cursor-pointer text-primary-blue/60 hover:text-primary-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>
            <AudioRecorder onSave={onAudioSaved} />
          </div>
        </div>
      )}
    <OnboardingShell
      onNext={goNext}
      hideMobileNext
      desktopContent={
        <div className="flex flex-col items-center text-primary-blue w-full">
          <PeachDot />
          <h1 className="mt-[16px] font-montserrat font-bold text-[20px] lg:text-[17px] leading-[130%] text-center whitespace-pre-line">
            {TITLE}
          </h1>

          <FlipCard
            flipped={flipped !== null}
            front={<CoverFront empty={COVER_EMPTY_DESKTOP} coverUrl={coverUrl} onPick={openCoverPicker} />}
            back={
              <EditorBack
                value={textBody}
                onChange={setTextBody}
                onDone={flipBack}
                videos={videos}
                images={extraImages}
                audios={audios}
                onRemoveVideo={removeVideo}
                onRemoveImage={removeImage}
                onRemoveAudio={removeAudioAt}
              />
            }
            heightClass="h-[380px] lg:h-[320px]"
            widthClass="w-full max-w-[420px] lg:max-w-[340px]"
          />

          <SubCardSlot flipped={flipped !== null} onFlipBack={flipBack} />

          <PillRow
            flipped={flipped !== null}
            onText={() => flipTo("editor")}
            onVoice={() => {
              flipTo("editor");
              setTimeout(openAudioModal, 250);
            }}
            onVideo={() => {
              flipTo("editor");
              setTimeout(openVideoPicker, 250);
            }}
            onImage={() => {
              flipTo("editor");
              setTimeout(openImagePicker, 250);
            }}
          />
        </div>
      }
      mobileContent={
        <div className="flex flex-col min-h-screen px-[24px] pt-[56px] pb-[140px] text-primary-blue">
          <div className="flex flex-col items-center">
            <PeachDot />
            <h1 className="mt-[18px] font-montserrat font-bold text-[22px] leading-[128%] text-center whitespace-pre-line">
              {TITLE}
            </h1>
          </div>

          <FlipCard
            flipped={flipped !== null}
            front={<CoverFront empty={COVER_EMPTY_MOBILE} coverUrl={coverUrl} onPick={openCoverPicker} mobile />}
            back={
              <EditorBack
                value={textBody}
                onChange={setTextBody}
                onDone={flipBack}
                mobile
                videos={videos}
                images={extraImages}
                audios={audios}
                onRemoveVideo={removeVideo}
                onRemoveImage={removeImage}
                onRemoveAudio={removeAudioAt}
              />
            }
            heightClass="h-[400px]"
            widthClass="w-full"
            wrapClass="mt-[32px]"
          />

          <SubCardSlot flipped={flipped !== null} onFlipBack={flipBack} mobile />

          <PillRow
            flipped={flipped !== null}
            onText={() => flipTo("editor")}
            onVoice={() => {
              flipTo("editor");
              setTimeout(openAudioModal, 250);
            }}
            onVideo={() => {
              flipTo("editor");
              setTimeout(openVideoPicker, 250);
            }}
            onImage={() => {
              flipTo("editor");
              setTimeout(openImagePicker, 250);
            }}
            mobile
          />

          <div className="fixed bottom-0 left-0 right-0 z-30 px-[24px] pb-[24px] pt-[16px] bg-warm-cream">
            <button
              type="button"
              onClick={goNext}
              className="w-full cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[16px] rounded-full py-[16px] hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          </div>
        </div>
      }
    />
    </>
  );
}

function PeachDot() {
  return (
    <span
      className="block h-[14px] w-[14px] rounded-full"
      style={{ backgroundColor: "#D95F3B" }}
    />
  );
}

function FlipCard({
  flipped,
  front,
  back,
  heightClass,
  widthClass,
  wrapClass = "mt-[24px]",
}: {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  heightClass: string;
  widthClass: string;
  wrapClass?: string;
}) {
  return (
    <div
      className={`${wrapClass} ${widthClass} ${heightClass} relative`}
      style={{ perspective: "1000px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ backfaceVisibility: "hidden" }}
        >
          {front}
        </div>
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}

function CoverFront({
  empty,
  coverUrl,
  onPick,
  mobile = false,
}: {
  empty: string;
  coverUrl: string | null;
  onPick: () => void;
  mobile?: boolean;
}) {
  return (
    <div className="w-full h-full bg-primary-white rounded-[20px] p-[16px] flex flex-col shadow-[0_10px_30px_rgba(9,46,74,0.10)]">
      <button
        type="button"
        onClick={onPick}
        className="flex-1 w-full rounded-[14px] bg-[#E6E6E6] overflow-hidden flex flex-col items-center justify-center gap-[10px] cursor-pointer hover:bg-[#DEDEDE] transition-colors"
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : mobile ? (
          <>
            <GalleryIcon width={44} height={44} />
            <span className="font-montserrat text-[16px] text-primary-blue">{empty}</span>
          </>
        ) : (
          <>
            <UploadGlyph />
            <span className="font-montserrat text-[14px] text-primary-blue">{empty}</span>
          </>
        )}
      </button>
      <div className={`mt-[12px] text-center font-montserrat ${mobile ? "text-[16px]" : "text-[14px]"} text-primary-blue`}>
        {COVER_CAPTION}
      </div>
    </div>
  );
}

type EditorBackProps = {
  value: string;
  onChange: (v: string) => void;
  onDone: () => void;
  mobile?: boolean;
  videos: Array<{ mediaId: string; uri: string; posterUri: string | null }>;
  images: Array<{ mediaId: string; uri: string }>;
  audios: Array<{ mediaId: string; uri: string; duration: number }>;
  onRemoveVideo: (mediaId: string) => void;
  onRemoveImage: (mediaId: string) => void;
  onRemoveAudio: (mediaId: string) => void;
};

function EditorBack({
  value,
  onChange,
  onDone: _onDone,
  mobile = false,
  videos,
  images,
  audios,
  onRemoveVideo,
  onRemoveImage,
  onRemoveAudio,
}: EditorBackProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <div className="w-full h-full bg-primary-white rounded-[20px] p-[16px] flex flex-col shadow-[0_10px_30px_rgba(9,46,74,0.10)]">
      <div
        onClick={() => textareaRef.current?.focus()}
        className="flex-1 w-full rounded-[14px] bg-[#E6E6E6] p-[16px] overflow-y-auto cursor-text [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your story…"
          rows={2}
          className={`w-full resize-none outline-none bg-transparent overflow-hidden font-montserrat ${mobile ? "text-[15px]" : "text-[14px]"} leading-[160%] text-primary-blue placeholder:text-primary-blue/40`}
        />
        {(videos.length > 0 || images.length > 0) && (
          <div className="mt-[12px] flex flex-wrap gap-[8px]">
            {videos.map((v) => (
              <ThumbTile key={v.mediaId} mediaId={v.mediaId} src={v.posterUri || v.uri} isVideo onRemove={onRemoveVideo} />
            ))}
            {images.map((img) => (
              <ThumbTile key={img.mediaId} mediaId={img.mediaId} src={img.uri} onRemove={onRemoveImage} />
            ))}
          </div>
        )}
        {audios.length > 0 && (
          <div className="mt-[12px] flex flex-col gap-[8px]">
            {audios.map((a) => (
              <AudioRow key={a.mediaId} mediaId={a.mediaId} uri={a.uri} onRemove={onRemoveAudio} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThumbTile({
  mediaId,
  src,
  isVideo = false,
  onRemove,
}: {
  mediaId: string;
  src: string;
  isVideo?: boolean;
  onRemove: (mediaId: string) => void;
}) {
  const status = useUploadStatus(mediaId);
  const busy = status.status === "queued" || status.status === "compressing" || status.status === "uploading";
  const failed = status.status === "error";
  return (
    <div className="relative w-[64px] h-[64px] rounded-[8px] overflow-hidden bg-primary-blue/10">
      <img src={src} alt="" className="w-full h-full object-cover" />
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45">
          <span className="h-[16px] w-[16px] rounded-full border-2 border-white border-t-transparent animate-spin" />
        </span>
      )}
      {failed && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-montserrat text-[9px] text-center px-[4px]">
          Upload failed
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemove(mediaId)}
        aria-label="Remove"
        className="absolute top-[2px] right-[2px] h-[18px] w-[18px] rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}

function AudioRow({ mediaId, uri, onRemove }: { mediaId: string; uri: string; onRemove: (mediaId: string) => void }) {
  const status = useUploadStatus(mediaId);
  const busy = status.status === "queued" || status.status === "compressing" || status.status === "uploading";
  const failed = status.status === "error";
  return (
    <div className="flex items-center gap-[8px] bg-[#E2E2E2] rounded-[10px] px-[10px] py-[8px]">
      <audio src={uri} controls className="flex-1 h-[28px]" />
      {busy && <span className="h-[12px] w-[12px] rounded-full border-2 border-primary-blue border-t-transparent animate-spin" />}
      {failed && <span className="font-montserrat text-[11px] text-red-600">Upload failed</span>}
      <button
        type="button"
        onClick={() => onRemove(mediaId)}
        aria-label="Remove"
        className="h-[20px] w-[20px] rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>
    </div>
  );
}

function SubCardSlot({
  flipped,
  onFlipBack,
  mobile = false,
}: {
  flipped: boolean;
  onFlipBack: () => void;
  mobile?: boolean;
}) {
  const height = mobile ? "h-[96px]" : "h-[68px]";
  return (
    <div className={`${height} w-full flex items-center justify-center`}>
      {flipped ? (
        <button
          type="button"
          onClick={onFlipBack}
          className={`cursor-pointer flex items-center gap-[8px] px-[14px] py-[8px] rounded-full font-montserrat ${mobile ? "text-[14px]" : "text-[13px]"} text-primary-blue`}
          style={{ backgroundColor: "#FFE0BB" }}
        >
          <FlipGlyph />
          {FLIP_HINT}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-[8px]">
          <p className={`text-center font-montserrat ${mobile ? "text-[14px]" : "text-[13px]"} leading-[150%] text-primary-blue/75 whitespace-pre-line`}>
            {HELPER}
          </p>
          {mobile && <DownArrowGlyph />}
        </div>
      )}
    </div>
  );
}

function DownArrowGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-primary-blue/70">
      <path d="M12 4v16" />
      <path d="M6 14l6 6 6-6" />
    </svg>
  );
}

function PillRow({
  flipped,
  onText,
  onVoice,
  onVideo,
  onImage,
  mobile = false,
}: {
  flipped: boolean;
  onText: () => void;
  onVoice: () => void;
  onVideo: () => void;
  onImage: () => void;
  mobile?: boolean;
}) {
  const wrap = mobile ? "w-full" : "w-full max-w-[420px] lg:max-w-[340px]";
  const iconSize = mobile ? 32 : 30;
  const textSize = mobile ? "text-[20px]" : "text-[19px]";
  return (
    <div className={`${wrap} flex items-center gap-[10px] mt-[8px]`}>
      <Pill filled={flipped} onClick={onText} ariaLabel="Add text" mobile={mobile}>
        <TextGlyph filled={flipped} size={textSize} />
      </Pill>
      <Pill filled={false} onClick={onVoice} ariaLabel="Record audio" mobile={mobile}>
        <MicrophoneIcon width={iconSize} height={iconSize} />
      </Pill>
      <Pill filled={false} onClick={onVideo} ariaLabel="Add video" mobile={mobile}>
        <VideoCameraAddIcon width={iconSize} height={iconSize} />
      </Pill>
      <Pill filled={false} onClick={onImage} ariaLabel="Add image" mobile={mobile}>
        <GalleryIcon width={iconSize} height={iconSize} />
      </Pill>
    </div>
  );
}

function Pill({
  filled,
  onClick,
  ariaLabel,
  children,
  mobile = false,
}: {
  filled: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex-1 ${mobile ? "h-[60px]" : "h-[60px] lg:h-[52px]"} rounded-full flex items-center justify-center cursor-pointer transition-colors ${
        filled
          ? "bg-primary-blue text-primary-white"
          : "bg-primary-white text-primary-blue hover:bg-primary-white/90"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Icons ---------- */

function UploadGlyph() {
  return (
    <svg width="40" height="40" viewBox="0 0 43 43" fill="none" className="text-primary-blue">
      <path d="M30.3123 16.051C34.1905 16.0726 36.2908 16.2446 37.6609 17.6147C39.2276 19.1814 39.2276 21.703 39.2276 26.7463V28.5294C39.2276 33.5726 39.2276 36.0942 37.6609 37.661C36.0941 39.2277 33.5725 39.2277 28.5293 39.2277H14.2648C9.22151 39.2277 6.69988 39.2277 5.13314 37.661C3.56641 36.0942 3.56641 33.5726 3.56641 28.5294L3.56641 26.7463C3.56641 21.703 3.56641 19.1814 5.13315 17.6147C6.50322 16.2446 8.60351 16.0726 12.4817 16.051" stroke="currentColor" strokeWidth="2.67459" strokeLinecap="round" />
      <path d="M21.3961 26.746L21.3961 3.56618M16.0469 9.8069L21.3961 3.56618L26.7452 9.8069" stroke="currentColor" strokeWidth="2.67459" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlipGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function TextGlyph({ filled, size = "text-[18px]" }: { filled: boolean; size?: string }) {
  return (
    <span className={`font-montserrat font-bold ${size} ${filled ? "text-primary-white" : "text-primary-blue"}`}>
      Aa
    </span>
  );
}

async function resolveExif(
  file: File,
  {
    existingDate,
    existingLocation,
    dispatch,
  }: {
    existingDate: string | null;
    existingLocation: LagLocation | null;
    dispatch: ReturnType<typeof useAppDispatch>;
  }
): Promise<void> {
  let dateOfStory: string | null = null;
  let location: LagLocation | null = null;
  try {
    const parsed = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "DateTime", "CreateDate"],
    });
    if (parsed) {
      const rawDate = parsed.DateTimeOriginal || parsed.CreateDate || parsed.DateTime;
      if (rawDate) {
        const iso = rawDate instanceof Date ? rawDate.toISOString() : String(rawDate);
        if (!existingDate && !Number.isNaN(Date.parse(iso))) {
          dateOfStory = new Date(iso).toISOString();
          dispatch(setDate(dateOfStory));
          dispatch(setDateOfStoryFromExif(true));
        }
      }
    }
    // GPS needs the dedicated helper — the `pick` list above drops the GPS block.
    const gps = await exifr.gps(file);
    const lat: number | undefined = gps?.latitude;
    const lng: number | undefined = gps?.longitude;
    const locationAlreadyResolved =
      !!existingLocation &&
      (!!existingLocation.formattedAddress ||
        !!existingLocation.city ||
        !!existingLocation.country ||
        !!existingLocation.placeId);
    if (typeof lat === "number" && typeof lng === "number" && !locationAlreadyResolved) {
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        location = geo;
        dispatch(setLocation(location));
        dispatch(setLocationFromExif(true));
      }
    }
  } catch {
    // EXIF parse failures are non-fatal — user can still pick manually.
  }
  if (dateOfStory || location) {
    apiSaveAnonDraft({
      dateOfStory: dateOfStory ?? undefined,
      location: location ?? undefined,
      exifResolved: true,
    }).catch(() => {});
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<LagLocation | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
    );
    const json = await res.json();
    const result = json?.results?.[0];
    if (!result) return null;
    const components: Array<{ long_name: string; types: string[] }> = result.address_components || [];
    const pickType = (type: string) => components.find((c) => c.types.includes(type))?.long_name || null;
    return {
      city: pickType("locality") || pickType("administrative_area_level_2") || null,
      country: pickType("country"),
      formattedAddress: result.formatted_address || null,
      placeId: result.place_id || null,
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

function generateVideoPoster(uri: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = uri;
    video.crossOrigin = "anonymous";
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };
    video.onloadeddata = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        cleanup();
        resolve(dataUrl);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}


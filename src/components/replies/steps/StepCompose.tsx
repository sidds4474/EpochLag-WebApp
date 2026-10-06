'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ReplyShell } from '@/components/replies/ReplyShell';
import {
  apiGetAnonUploadToken,
  apiGetMediaStatus,
  apiSaveAnonDraft,
} from '@/lib/onboarding/api/anonEndpoints';
import {
  DateModal,
  MusicPickerModal,
  type LocationValue,
  type MusicValue,
} from '@/app/(app)/(dashboard)/new-story/pickers';
import UploadMediaModal from '@/app/(app)/(dashboard)/new-story/UploadMediaModal';
import ChooseCoverModal, { type CoverPick } from '@/app/(app)/(dashboard)/new-story/ChooseCoverModal';
import InlineRecorder from '@/components/replies/InlineRecorder';
import { fetchCardGradients } from '@/lib/create/api';
import type { ReplyAs } from '@/lib/replies/publicReplies';

const LazyLocationPicker = dynamic(
  () => import('@/components/replies/LocationPickerPortal'),
  { ssr: false }
);

type AudioBlock = {
  id: string;
  kind: 'audio';
  blob: Blob;
  durationSecs: number;
  uploading: boolean;
};

type TextBlock = {
  id: string;
  kind: 'text';
  text: string;
};

type MediaBlock = {
  id: string;
  kind: 'image' | 'video';
  file: File;
  previewUrl: string;
  uploading: boolean;
};

type ContentBlock = AudioBlock | TextBlock | MediaBlock;

type Props = {
  senderName: string;
  draftToken: string;
  replyAs?: ReplyAs;
  onBack: () => void;
  onSubmit: () => void;
  audioBlob?: Blob;
  transcript?: string;
  // Inline error surfaced from ReplyFlow (e.g. REPLY_ALREADY_SENT)
  submitError?: string;
  // Lifted picker state (shared with StepRecord via ReplyFlow)
  dateOfStory: string | null;
  location: LocationValue | null;
  music: MusicValue | null;
  onDateChange: (next: string | null) => void;
  onLocationChange: (next: LocationValue | null) => void;
  onMusicChange: (next: MusicValue | null) => void;
  // Set by StepRecord when the user tapped a pill there — StepCompose
  // auto-opens the corresponding modal on mount. `image`/`video` open the
  // UploadMediaModal (capture-or-upload chooser from new-lag).
  openPickerOnMount?: 'date' | 'music' | 'location' | 'image' | 'video';
};

function uid() {
  return Math.random().toString(36).slice(2);
}

async function uploadBlobToCloudinary(
  file: Blob,
  filename: string,
  mimeType: string,
  draftToken: string,
  onDone: () => void
) {
  try {
    const tokenRes = await apiGetAnonUploadToken(
      { fileName: filename, fileSize: file.size, mimeType },
      draftToken
    );

    const formData = new FormData();
    formData.append('file', file, filename);
    Object.entries(tokenRes.uploadParams).forEach(([k, v]) => {
      if (v != null) formData.append(k, String(v));
    });

    await fetch(tokenRes.uploadUrl, { method: 'POST', body: formData });

    // Poll until backend confirms the upload landed
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const status = await apiGetMediaStatus(draftToken);
      if (status.pendingUploads.length === 0) break;
    }
  } finally {
    onDone();
  }
}

export function StepCompose({
  senderName,
  draftToken,
  onBack,
  onSubmit,
  audioBlob,
  transcript,
  submitError,
  dateOfStory,
  location,
  music,
  onDateChange,
  onLocationChange,
  onMusicChange,
  openPickerOnMount,
}: Props) {
  const [title, setTitle] = useState('');
  // Seed with one empty text block so users land on a ready-to-type composer.
  // The Aa pill in the toolbar appends additional text blocks on tap.
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => [
    { id: uid(), kind: 'text', text: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [openPicker, setOpenPicker] = useState<null | 'date' | 'location' | 'music'>(
    openPickerOnMount === 'date' ||
      openPickerOnMount === 'location' ||
      openPickerOnMount === 'music'
      ? openPickerOnMount
      : null
  );
  const [mediaChooser, setMediaChooser] = useState<null | 'image' | 'video'>(
    openPickerOnMount === 'image' || openPickerOnMount === 'video'
      ? openPickerOnMount
      : null
  );
  const [coverChooserOpen, setCoverChooserOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [cover, setCover] = useState<null | {
    previewUrl: string;
    imageUrl: string | null;   // Curated: direct URL. Upload: null until Cloudinary returns.
    uploading: boolean;
  }>(null);
  const didPreselectCover = useRef(false);
  const [coverLoading, setCoverLoading] = useState(true);

  // Pre-select the first available curated gradient so the composer never
  // mounts with a blank cover slot. Users can still change it via the chooser.
  useEffect(() => {
    if (didPreselectCover.current) return;
    didPreselectCover.current = true;
    fetchCardGradients()
      .then((covers) => {
        // eslint-disable-next-line no-console
        console.log('[StepCompose] fetched gradients', {
          count: covers.length,
          urls: covers.map((c) => c.imageUrl || c.url),
        });
        if (covers.length === 0) return;
        // Prefer `gradient-image-18` as the default — picked by product for a
        // pleasant neutral look. Fall back to the first gradient if that
        // specific one isn't in the catalog.
        const preferred = covers.find((c) => {
          const url = c.imageUrl || c.url || '';
          return url.includes('gradient-image-18');
        });
        const pick = preferred || covers[0];
        const pickUrl = pick?.imageUrl || pick?.url;
        if (pickUrl) {
          // eslint-disable-next-line no-console
          console.log('[StepCompose] preselected cover', pickUrl);
          setCover((prev) => prev ?? {
            previewUrl: pickUrl,
            imageUrl: pickUrl,
            uploading: false,
          });
        }
      })
      .finally(() => {
        setCoverLoading(false);
      });
  }, []);

  const didAddAudio = useRef(false);

  const handleCoverPicked = (pick: CoverPick) => {
    // Revoke any previously-held blob URL to avoid leaks
    if (cover && cover.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(cover.previewUrl);
    }
    if (pick.kind === 'curated') {
      // eslint-disable-next-line no-console
      console.log('[StepCompose] cover picked (curated)', {
        imageUrl: pick.imageUrl,
      });
      setCover({ previewUrl: pick.preview, imageUrl: pick.imageUrl, uploading: false });
      // TODO: persist via apiSaveAnonDraft once BE adds a `cover` field.
      // For now the imageUrl is held in local state only and would need to
      // be sent at submit time or via a cover-specific endpoint.
    } else {
      // eslint-disable-next-line no-console
      console.log('[StepCompose] cover picked (upload)', {
        name: pick.file.name,
        size: pick.file.size,
        type: pick.file.type,
      });
      // Uploaded file — show preview immediately, upload in the background,
      // then stamp the final imageUrl once Cloudinary confirms.
      setCover({ previewUrl: pick.preview, imageUrl: null, uploading: true });
      uploadBlobToCloudinary(
        pick.file,
        pick.file.name,
        pick.file.type || 'image/jpeg',
        draftToken,
        () => {
          // The anon draft doesn't yet surface the uploaded media URL back to
          // us — polling just confirms Cloudinary landed. Flip uploading off;
          // backend owns the association from here.
          setCover((prev) => (prev ? { ...prev, uploading: false } : prev));
        }
      );
    }
  };

  const addMediaBlockFromFile = (kind: 'image' | 'video', file: File) => {
    const blockId = uid();
    const previewUrl = URL.createObjectURL(file);
    const newBlock: MediaBlock = {
      id: blockId,
      kind,
      file,
      previewUrl,
      uploading: true,
    };
    setBlocks((prev) => [...prev, newBlock]);
    uploadBlobToCloudinary(
      file,
      file.name,
      file.type || (kind === 'image' ? 'image/jpeg' : 'video/mp4'),
      draftToken,
      () => {
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, uploading: false } : b))
        );
      }
    );
  };

  // Save payload from InlineRecorder — append audio block (and transcript
  // text block, if captured) to the end of the composer, same pattern as the
  // initial record→compose handoff.
  const handleRecorderSave = ({
    blob,
    durationSecs,
    transcript: liveTranscript,
  }: {
    blob: Blob;
    durationSecs: number;
    transcript: string;
  }) => {
    const audioBlockId = uid();
    const audioEntry: AudioBlock = {
      id: audioBlockId,
      kind: 'audio',
      blob,
      durationSecs,
      uploading: true,
    };
    setBlocks((prev) => {
      const trimmed = liveTranscript.trim();
      if (trimmed) {
        const transcriptBlock: TextBlock = {
          id: uid(),
          kind: 'text',
          text: trimmed,
        };
        return [...prev, audioEntry, transcriptBlock];
      }
      return [...prev, audioEntry];
    });

    uploadBlobToCloudinary(
      blob,
      'recording.webm',
      blob.type || 'audio/webm',
      draftToken,
      () => {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === audioBlockId ? { ...b, uploading: false } : b
          )
        );
      }
    );
  };

  // When an audio blob arrives from the recording step, add it as a block
  // and kick off the Cloudinary upload immediately in the background.
  useEffect(() => {
    if (!audioBlob || didAddAudio.current) return;
    didAddAudio.current = true;

    const blockId = uid();

    const audioCtx = new AudioContext();
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;
      audioCtx.decodeAudioData(
        e.target.result as ArrayBuffer,
        (buffer) => {
          const durationSecs = Math.round(buffer.duration);
          const newBlock: AudioBlock = {
            id: blockId,
            kind: 'audio',
            blob: audioBlob,
            durationSecs,
            uploading: true,
          };
          setBlocks((prev) => {
            // Insert the audio block at the top. If StepRecord captured a
            // live transcript, drop it in as a text block immediately below
            // the audio pill so the user sees what they said in context (and
            // can edit it before sending).
            const trimmedTranscript = transcript?.trim();
            if (trimmedTranscript) {
              const transcriptBlock: TextBlock = {
                id: uid(),
                kind: 'text',
                text: trimmedTranscript,
              };
              return [newBlock, transcriptBlock, ...prev];
            }
            return [newBlock, ...prev];
          });

          // Start background upload
          uploadBlobToCloudinary(
            audioBlob,
            'recording.webm',
            audioBlob.type || 'audio/webm',
            draftToken,
            () => {
              setBlocks((prev) =>
                prev.map((b) =>
                  b.id === blockId ? { ...b, uploading: false } : b
                )
              );
            }
          );

          audioCtx.close();
        }
      );
    };
    reader.readAsArrayBuffer(audioBlob);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);


  const addTextBlock = () =>
    setBlocks((prev) => [...prev, { id: uid(), kind: 'text', text: '' }]);

  const updateTextBlock = (id: string, text: string) =>
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.kind === 'text' ? { ...b, text } : b))
    );

  const removeBlock = (id: string) =>
    setBlocks((prev) => {
      const victim = prev.find((b) => b.id === id);
      if (victim && (victim.kind === 'image' || victim.kind === 'video')) {
        URL.revokeObjectURL(victim.previewUrl);
      }
      return prev.filter((b) => b.id !== id);
    });

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // If audio is still uploading give it a few extra seconds before we save
      const hasUploading = blocks.some(
        (b) => b.kind === 'audio' && b.uploading
      );
      if (hasUploading) {
        await new Promise((r) => setTimeout(r, 2500));
      }

      // Save text content + title to the draft so the backend has something to merge
      const textContent = blocks
        .filter((b): b is TextBlock => b.kind === 'text')
        .map((b) => b.text.trim())
        .filter(Boolean)
        .join('\n\n');

      // eslint-disable-next-line no-console
      console.log('[StepCompose] PUT /api/onboarding/anon/draft', {
        title: title.trim() || undefined,
        contentPreview: (textContent || '').slice(0, 100),
        contentLength: textContent.length,
        coverImageUrl: cover?.imageUrl ?? null,
        blockCounts: {
          text: blocks.filter((b) => b.kind === 'text').length,
          audio: blocks.filter((b) => b.kind === 'audio').length,
          image: blocks.filter((b) => b.kind === 'image').length,
          video: blocks.filter((b) => b.kind === 'video').length,
        },
        uploadingBlocks: blocks.filter(
          (b) => (b.kind === 'audio' || b.kind === 'image' || b.kind === 'video') && b.uploading
        ).length,
        draftTokenPrefix: draftToken?.slice(0, 10) + '…',
      });

      await apiSaveAnonDraft(
        {
          title: title.trim() || undefined,
          content: textContent || undefined,
          cover: cover?.imageUrl ? { imageUrl: cover.imageUrl } : undefined,
        },
        draftToken
      );
    } catch {
      // Save failing shouldn't block the submit — proceed anyway
    }

    // Let ReplyFlow own the actual submit + error handling
    onSubmit();
    setSubmitting(false);
  }, [submitting, blocks, title, draftToken, onSubmit, cover]);

  const buttonLabel = senderName ? `Reply to ${senderName}` : 'Send reply';

  return (
    <ReplyShell>
      {/* Header */}
      <div className="relative flex items-center justify-between pt-4 sm:pt-8 pb-0 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="p-2 -ml-2 text-primary-blue hover:opacity-70 transition-opacity"
        >
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="w-8" aria-hidden="true" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a title…"
          className="w-full font-plus-jakarta text-[18px] font-semibold text-primary-blue bg-transparent border-b border-primary-blue/15 pb-3 mb-4 outline-none placeholder:opacity-40"
        />

        {/* Cover — tap to open ChooseCoverModal (upload or curated gradient) */}
        <div className="mb-4">
          <p className="font-plus-jakarta text-[12px] text-primary-blue opacity-50 uppercase tracking-wide mb-2">
            Cover
          </p>
          <button
            type="button"
            onClick={() => setCoverChooserOpen(true)}
            className="relative w-full max-w-[320px] sm:max-w-[380px] mx-auto aspect-[4/3] rounded-[16px] overflow-hidden bg-primary-cream flex items-center justify-center hover:opacity-90 active:opacity-80 transition-opacity"
          >
            {cover ? (
              <>
                <img
                  src={cover.previewUrl}
                  alt="Cover"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {cover.uploading ? (
                  <div className="absolute top-2 right-2 bg-black/60 text-white font-plus-jakarta text-[11px] px-2 py-1 rounded-full">
                    Uploading…
                  </div>
                ) : (
                  <div
                    aria-label="Change cover"
                    className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M14.7566 2.62145C16.5852 0.792851 19.55 0.792851 21.3786 2.62145C23.2072 4.45005 23.2072 7.41479 21.3786 9.24339L11.8933 18.7287C11.3514 19.2706 11.0323 19.5897 10.6774 19.8665C10.2592 20.1927 9.80655 20.4725 9.32766 20.7007C8.92136 20.8943 8.49334 21.037 7.76623 21.2793L4.43511 22.3897L3.63303 22.6571C2.98247 22.8739 2.26522 22.7046 1.78032 22.2197C1.29542 21.7348 1.1261 21.0175 1.34296 20.367L2.72068 16.2338C2.96303 15.5067 3.10568 15.0787 3.29932 14.6724C3.52755 14.1935 3.80727 13.7409 4.13354 13.3226C4.41035 12.9677 4.72939 12.6487 5.27137 12.1067L14.7566 2.62145ZM4.40051 20.8201L7.24203 19.8729C8.03314 19.6092 8.36927 19.4958 8.68233 19.3466C9.06287 19.1653 9.42252 18.943 9.75492 18.6837C10.0284 18.4704 10.2801 18.2205 10.8698 17.6308L18.4393 10.0614C17.6506 9.78321 16.6346 9.26763 15.6835 8.31651C14.7324 7.36538 14.2168 6.34939 13.9387 5.56075L6.36917 13.1302C5.77951 13.7199 5.52959 13.9716 5.3163 14.2451C5.05704 14.5775 4.83476 14.9371 4.65341 15.3177C4.50421 15.6307 4.3908 15.9669 4.12709 16.758L3.17992 19.5995L4.40051 20.8201ZM15.1554 4.34404C15.1896 4.519 15.2474 4.75684 15.3438 5.03487C15.561 5.66083 15.9712 6.48288 16.7442 7.25585C17.5171 8.02881 18.3392 8.43903 18.9651 8.6562C19.2432 8.75266 19.481 8.81046 19.656 8.84466L20.3179 8.18272C21.5607 6.93991 21.5607 4.92492 20.3179 3.68211C19.0751 2.4393 17.0601 2.4393 15.8173 3.68211L15.1554 4.34404Z" fill="#1C274C" />
                    </svg>
                  </div>
                )}
              </>
            ) : coverLoading ? (
              <svg
                className="animate-spin text-primary-blue/50"
                width={26}
                height={26}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <span className="font-plus-jakarta text-[13px] text-primary-blue opacity-40">
                Tap to add cover image
              </span>
            )}
          </button>
        </div>

        {/* Content blocks */}
        <div className="flex flex-col gap-3">
          {blocks.map((block) => (
            <div key={block.id} className="flex gap-2 items-start">
              <div className="mt-3 text-primary-blue opacity-25 cursor-grab flex-shrink-0" aria-hidden="true">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>

              <div className="flex-1">
                {block.kind === 'audio' && (
                  <ComposerAudioBlock
                    blob={block.blob}
                    durationSecs={block.durationSecs}
                    uploading={block.uploading}
                  />
                )}

                {block.kind === 'text' && (
                  <textarea
                    value={block.text}
                    onChange={(e) => updateTextBlock(block.id, e.target.value)}
                    placeholder="Write your story…"
                    rows={3}
                    className="w-full font-plus-jakarta text-[15px] text-primary-blue bg-primary-white rounded-[14px] px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-primary-blue/20 shadow-[0_2px_8px_rgba(9,46,74,0.06)] placeholder:opacity-40"
                    style={{ minHeight: 80 }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                  />
                )}

                {(block.kind === 'image' || block.kind === 'video') && (
                  <div className="relative rounded-[14px] overflow-hidden bg-primary-cream shadow-[0_2px_8px_rgba(9,46,74,0.06)]">
                    {block.kind === 'image' ? (
                      <img
                        src={block.previewUrl}
                        alt="Attached"
                        className="w-full h-auto max-h-[320px] object-cover"
                      />
                    ) : (
                      <video
                        src={block.previewUrl}
                        controls
                        preload="metadata"
                        className="w-full h-auto max-h-[320px] bg-black"
                      />
                    )}
                    {block.uploading && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white font-plus-jakarta text-[11px] px-2 py-1 rounded-full">
                        Uploading…
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                aria-label="Remove block"
                className="mt-3 text-primary-blue opacity-25 hover:opacity-60 transition-opacity flex-shrink-0"
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add more media — pills match the StepRecord toolbar style */}
        <div className="mt-6 mb-3">
          <p className="font-plus-jakarta text-[14px] text-black mb-3">
            Add more medias to your story
          </p>
          <div className="overflow-x-auto no-scrollbar pl-0 pr-2 -mx-1">
            <div className="flex gap-1.5 w-max">
              <ToolbarButton label="Voice" onClick={() => setVoiceRecorderOpen(true)}>
                <VoiceIcon />
              </ToolbarButton>
              <ToolbarButton label="Image" onClick={() => setMediaChooser('image')}>
                <ImageIcon />
              </ToolbarButton>
              <ToolbarButton label="Video" onClick={() => setMediaChooser('video')}>
                <VideoIcon />
              </ToolbarButton>
              <ToolbarButton
                label="Music"
                active={music !== null}
                onClick={() => setOpenPicker('music')}
              >
                <MusicIcon />
              </ToolbarButton>
              <ToolbarButton
                label="Date"
                active={dateOfStory !== null}
                onClick={() => setOpenPicker('date')}
              >
                <CalendarIcon />
              </ToolbarButton>
              <ToolbarButton label="Text" onClick={addTextBlock}>
                <span className="font-plus-jakarta font-medium text-[22px] text-[#2c2c2c] leading-none">Aa</span>
              </ToolbarButton>
              <ToolbarButton
                label="Location"
                active={location !== null}
                onClick={() => setOpenPicker('location')}
              >
                <LocationIcon />
              </ToolbarButton>
            </div>
          </div>

          {/* Picked chips — only renders when at least one of date/music/location
              is set. Each chip label reopens the picker; X clears via onChange. */}
          {(dateOfStory !== null || music !== null || location !== null) && (
            <div className="overflow-x-auto no-scrollbar mt-3 -mx-1 pr-2">
              <div className="flex gap-2 w-max">
                {dateOfStory !== null && (
                  <PickedChip
                    label={formatDateLabel(dateOfStory)}
                    onClick={() => setOpenPicker('date')}
                    onClear={() => onDateChange(null)}
                  />
                )}
                {music !== null && (
                  <PickedChip
                    label={formatMusicLabel(music)}
                    onClick={() => setOpenPicker('music')}
                    onClear={() => onMusicChange(null)}
                  />
                )}
                {location !== null && (
                  <PickedChip
                    label={location.city || 'Location'}
                    onClick={() => setOpenPicker('location')}
                    onClear={() => onLocationChange(null)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="flex-shrink-0 pb-6 sm:pb-10 bg-warm-cream pt-3 border-t border-primary-blue/8">
        <p className="font-plus-jakarta text-[12px] text-primary-blue opacity-60 text-center mb-4">
          This reply is public — anyone with the link can read it.
        </p>

        {submitError && (
          <p className="font-plus-jakarta text-[13px] text-red-500 text-center mb-3">
            {submitError}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-primary-orange text-primary-white font-plus-jakarta font-semibold text-[16px] sm:text-[17px] px-6 py-[18px] sm:py-[20px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-60 disabled:cursor-wait leading-none"
        >
          {submitting ? 'Sending…' : buttonLabel}
        </button>
      </div>

      {/* Inline voice recorder — same visual language as StepRecord */}
      <InlineRecorder
        isOpen={voiceRecorderOpen}
        onClose={() => setVoiceRecorderOpen(false)}
        onSave={handleRecorderSave}
      />

      {/* Cover chooser (shared with new-lag) — upload or pick a curated gradient */}
      <ChooseCoverModal
        open={coverChooserOpen}
        onClose={() => setCoverChooserOpen(false)}
        onPick={(pick) => {
          handleCoverPicked(pick);
          setCoverChooserOpen(false);
        }}
        selectedUrl={cover?.imageUrl ?? null}
      />

      {/* Capture-or-upload chooser for Image/Video (shared with new-lag) */}
      <UploadMediaModal
        open={mediaChooser !== null}
        kind={mediaChooser ?? 'image'}
        onClose={() => setMediaChooser(null)}
        onFile={(file) => {
          const kind = mediaChooser ?? 'image';
          addMediaBlockFromFile(kind, file);
          setMediaChooser(null);
        }}
      />

      {/* Picker modals — same wiring pattern as StepRecord */}
      {openPicker === 'date' && (
        <DateModal
          initial={dateOfStory}
          onClose={() => setOpenPicker(null)}
          onSubmit={(iso) => {
            onDateChange(iso);
            setOpenPicker(null);
          }}
        />
      )}
      {openPicker === 'music' && (
        <MusicPickerModal
          onClose={() => setOpenPicker(null)}
          onSelect={(v) => {
            onMusicChange(v);
            setOpenPicker(null);
          }}
        />
      )}
      {openPicker === 'location' && (
        <LazyLocationPicker
          initial={location}
          onClose={() => setOpenPicker(null)}
          onSubmit={(v) => {
            onLocationChange(v);
            setOpenPicker(null);
          }}
        />
      )}
    </ReplyShell>
  );
}

type ToolbarButtonProps = {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
};
function ToolbarButton({ children, label, onClick, active = false }: ToolbarButtonProps) {
  // Picked state is already shown via the chip row below the toolbar — the
  // pill itself stays white regardless so the toolbar never feels "busy".
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="w-[82px] h-16 rounded-full bg-white text-[#2c2c2c] shadow-[0_1px_6px_rgba(9,46,74,0.08)] flex items-center justify-center flex-shrink-0 hover:opacity-90 active:opacity-70 transition-opacity"
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

function MusicIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M23.3414 4.58518C22.5445 4.72701 21.4956 5.07411 19.9653 5.58421L14.9653 7.25088C14.1198 7.53272 13.5608 7.72054 13.149 7.91212C12.7591 8.09353 12.5905 8.23952 12.4824 8.3894C12.3744 8.53927 12.2892 8.74538 12.2404 9.17269C12.1889 9.62395 12.1875 10.2137 12.1875 11.1049V13.7004L25.3125 9.3254C25.3123 7.77341 25.3073 6.7015 25.1926 5.91946C25.0784 5.14043 24.8826 4.85992 24.6636 4.70211C24.4447 4.5443 24.1166 4.44722 23.3414 4.58518ZM27.1753 7.50111C27.1599 6.79548 27.1254 6.17665 27.0478 5.6474C26.9025 4.65657 26.5792 3.77153 25.7599 3.18103C24.9407 2.59053 23.9988 2.56372 23.0129 2.73919C22.0645 2.90798 20.8847 3.30127 19.4449 3.78127L14.323 5.48855C13.5401 5.74951 12.8784 5.97003 12.3581 6.21208C11.8051 6.46935 11.3252 6.78822 10.9614 7.29307C10.5975 7.79791 10.4467 8.35398 10.3775 8.96001C10.3422 9.2695 10.3261 9.6165 10.3187 10.0011H10.3125V10.9501C10.3125 10.9841 10.3125 11.0184 10.3125 11.0529L10.3125 20.0008C9.52907 19.4123 8.55526 19.0636 7.5 19.0636C4.91117 19.0636 2.8125 21.1623 2.8125 23.7511C2.8125 26.3399 4.91117 28.4386 7.5 28.4386C10.0888 28.4386 12.1875 26.3399 12.1875 23.7511V15.6768L25.3125 11.3018V17.5008C24.5291 16.9123 23.5553 16.5636 22.5 16.5636C19.9112 16.5636 17.8125 18.6623 17.8125 21.2511C17.8125 23.8399 19.9112 25.9386 22.5 25.9386C25.0888 25.9386 27.1875 23.8399 27.1875 21.2511V9.36183C27.1875 9.31722 27.1875 9.27285 27.1875 9.22872V7.50111H27.1753ZM25.3125 21.2511C25.3125 19.6978 24.0533 18.4386 22.5 18.4386C20.9467 18.4386 19.6875 19.6978 19.6875 21.2511C19.6875 22.8044 20.9467 24.0636 22.5 24.0636C24.0533 24.0636 25.3125 22.8044 25.3125 21.2511ZM10.3125 23.7511C10.3125 22.1978 9.0533 20.9386 7.5 20.9386C5.9467 20.9386 4.6875 22.1978 4.6875 23.7511C4.6875 25.3044 5.9467 26.5636 7.5 26.5636C9.0533 26.5636 10.3125 25.3044 10.3125 23.7511Z" fill="currentColor" />
    </svg>
  );
}

function ComposerAudioBlock({
  blob,
  durationSecs,
  uploading,
}: {
  blob: Blob;
  durationSecs: number;
  uploading: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(durationSecs);
  const urlRef = useRef<string | null>(null);

  // Build one Object URL per blob and tear it down on unmount. Prevents the
  // "double-play" issue the inline onClick had — we reuse the same <audio>
  // element instead of constructing a new one on every tap.
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
  const BAR_COUNT = 48;
  const playedBars = Math.round(progress * BAR_COUNT);

  const dur = Math.round(actualDuration || durationSecs);
  const durLabel = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}`;

  return (
    <div className="bg-primary-white rounded-[14px] px-4 py-3 flex items-center gap-3 shadow-[0_2px_8px_rgba(9,46,74,0.06)]">
      {urlRef.current && <audio ref={audioRef} src={urlRef.current} preload="metadata" />}
      <button
        type="button"
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-primary-orange text-primary-white flex items-center justify-center flex-shrink-0 hover:opacity-90 active:opacity-80 transition-opacity"
      >
        {isPlaying ? (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3l14 9-14 9V3z" />
          </svg>
        )}
      </button>
      <div className="flex items-center justify-between flex-1 h-full">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full ${i < playedBars ? 'bg-primary-orange' : 'bg-primary-orange/35'}`}
            style={{
              height: `${8 + Math.abs(Math.sin(i * 0.7) + Math.cos(i * 0.4)) * 10}px`,
            }}
          />
        ))}
      </div>
      <span className="font-plus-jakarta text-[12px] text-primary-blue opacity-60 tabular-nums flex-shrink-0">
        {durLabel}
      </span>
      {uploading && (
        <span className="font-plus-jakarta text-[11px] text-primary-blue opacity-40">
          Uploading…
        </span>
      )}
    </div>
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

function VoiceIcon() {
  return (
    <svg width={30} height={30} viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.59375 11C8.59375 6.6335 12.1335 3.09375 16.5 3.09375C20.8665 3.09375 24.4062 6.6335 24.4062 11V15.125C24.4062 19.4915 20.8665 23.0312 16.5 23.0312C12.1335 23.0312 8.59375 19.4915 8.59375 15.125V11ZM16.5 5.15625C13.2726 5.15625 10.6562 7.77259 10.6562 11V15.125C10.6562 18.3524 13.2726 20.9688 16.5 20.9688C19.3755 20.9688 21.766 18.8918 22.253 16.1563L17.875 16.1562C17.3055 16.1562 16.8438 15.6945 16.8438 15.125C16.8438 14.5555 17.3055 14.0938 17.875 14.0938L22.3438 14.0938V12.0313H17.875C17.3055 12.0313 16.8438 11.5695 16.8438 11C16.8438 10.4305 17.3055 9.96875 17.875 9.96875H22.253C21.766 7.23318 19.3755 5.15625 16.5 5.15625ZM5.5 12.7188C6.06954 12.7188 6.53125 13.1805 6.53125 13.75V15.125C6.53125 20.6306 10.9944 25.0938 16.5 25.0938C22.0056 25.0938 26.4688 20.6306 26.4688 15.125V13.75C26.4688 13.1805 26.9305 12.7188 27.5 12.7188C28.0695 12.7188 28.5312 13.1805 28.5312 13.75V15.125C28.5312 21.4223 23.6932 26.5896 17.5312 27.1127V30.25C17.5312 30.8195 17.0695 31.2812 16.5 31.2812C15.9305 31.2812 15.4688 30.8195 15.4688 30.25V27.1127C9.30682 26.5896 4.46875 21.4223 4.46875 15.125V13.75C4.46875 13.1805 4.93046 12.7188 5.5 12.7188Z" fill="currentColor" />
    </svg>
  );
}

// ---- picked-chip helpers --------------------------------------------------

function formatDateLabel(iso: string): string {
  // "2025-09-25" → "Sept 25, 2025". Guard against malformed dates.
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMusicLabel(music: MusicValue): string {
  if (music.trackName && music.artistName) {
    return `${music.trackName} — ${music.artistName}`;
  }
  return music.trackName || music.artistName || 'Music';
}

function PickedChip({
  label,
  onClick,
  onClear,
}: {
  label: string;
  onClick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="shrink-0 inline-flex items-center h-9 rounded-full bg-[#E6E3D9] pl-4 pr-1 gap-2">
      <button
        type="button"
        onClick={onClick}
        className="font-plus-jakarta text-[13px] text-primary-blue hover:opacity-80 active:opacity-60 transition-opacity whitespace-nowrap max-w-[200px] truncate"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label}`}
        className="w-7 h-7 rounded-full bg-white/70 text-primary-blue/70 hover:bg-white hover:text-primary-blue active:opacity-70 transition-colors flex items-center justify-center"
      >
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

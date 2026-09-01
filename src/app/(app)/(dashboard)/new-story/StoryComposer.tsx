"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import TooltipImg1 from "../../../../assets/images/Question-mark_tooltip/img1.jpg";
import TooltipImg2 from "../../../../assets/images/Question-mark_tooltip/img2.jpg";
import { toast } from "react-hot-toast";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ApiError } from "../../../../lib/api/client";
import {
  createStory,
  createUserCard,
  deleteStoryMedia,
  getUploadToken,
  publishStory,
  setThreadPrivacy,
  updateStory,
  updateUserCard,
  uploadToCloudinary,
} from "../../../../lib/create/api";
import { serializeBlocksToContent, type StoryBlock } from "../../../../lib/create/content";
import {
  clearAllMedia,
  deleteMedia,
  getMedia,
  putMedia,
} from "../../../../lib/create/media-storage";
import { buildPreviewThread } from "../../../../lib/create/preview";
import { fetchUserCard, getCachedUserCard } from "../../../../lib/home/api";
import { fetchDraftDetail } from "../../../../lib/studio/api";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import type { ThreadResponse, UserCard } from "../../../../types/home";
import type { ContentBlock } from "../../../../types/story";
import PreviewOverlay from "../../../../views/Thread/PreviewOverlay";
import ChooseCoverModal, { type CoverPick } from "./ChooseCoverModal";
import StoryCreatedOverlay from "./StoryCreated";
import TagPeopleSheet, { tagPeopleDisplayName } from "./TagPeopleSheet";
import UploadMediaModal from "./UploadMediaModal";
import type { FriendUser } from "../../../../lib/home/api";
import {
  DateChip,
  LocationChip,
  MusicChip,
  type LocationValue,
  type MusicValue,
} from "./pickers";
import {
  CalendarIcon,
  ChevronLeftIcon,
  CloseIcon,
  EyeIcon,
  HelpIcon,
  ImageIcon,
  MapPinIcon,
  MicIcon,
  MusicNoteIcon,
  PauseIcon,
  PencilIcon,
  PersonIcon,
  PlayIcon,
  CameraIcon,
} from "../icons";

// Cover state — either a curated remote URL or a browser-uploaded file. We
// track both because the persist path differs (imageUrl JSON PUT vs file
// multipart PUT). preview is what we show in the UI in both cases.
type CoverState = {
  file: File | null;
  imageUrl: string | null;
  preview: string | null;
};

const EMPTY_COVER: CoverState = { file: null, imageUrl: null, preview: null };

// Ordered block content model — mirrors mobile V4 story blocks. Text and
// media are interleaved in a single list so the display order matches what
// the author saw in the composer. Media stays local (file + blob preview)
// until publish, when we upload each block to Cloudinary and swap in the
// remote URL before serializing to `<type>URL</type>` markup.
type EditorBlock =
  | { id: string; type: "text"; text: string }
  | {
      id: string;
      type: "image" | "video";
      // file/preview may be null briefly during IDB hydration on refresh —
      // the block is drawn as a small skeleton until the blob comes back.
      file: File | null;
      preview: string | null;
      uploadedUrl?: string;
    }
  | {
      id: string;
      type: "audio";
      // Both null while the mic is live and we haven't finalized the clip yet.
      // Populated when the user stops the recording (or on file-upload).
      file: File | null;
      preview: string | null;
      uploadedUrl?: string;
      recording?: boolean;
      /** Sampled bar-waveform snapshot captured during recording, so the
       * finalized player renders the same visual instead of a flat bar. */
      waveform?: number[];
      /** Clip length in seconds. Used by the finalized-audio row for the
       * "0:21" label without needing to load metadata first. */
      duration?: number;
    };

let blockIdCounter = 0;
function makeBlockId(prefix: string): string {
  blockIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${blockIdCounter}`;
}

function emptyTextBlock(): EditorBlock {
  return { id: makeBlockId("text"), type: "text", text: "" };
}

function isEmptyText(b: EditorBlock | undefined): boolean {
  return !!b && b.type === "text" && b.text.trim().length === 0;
}

// Refresh-persistence helpers. Draft lives in localStorage under a key
// namespaced by the entry context (prompt/album/blank) so different
// composer sessions don't clobber each other. Media Files can't be
// serialized — only text + selected meta survive a reload.
// Ordered block descriptors for the persisted draft. Media entries are just
// pointers — the actual Blob lives in IndexedDB under the same id. On
// hydration we read the blob back and re-attach a fresh blob URL. Any
// media block that lost its IDB blob (quota purge, user cleared browser
// data) is dropped at hydration time.
type PersistedBlock =
  | { kind: "text"; id: string; text: string }
  | {
      kind: "media";
      id: string;
      type: "image" | "video" | "audio";
      waveform?: number[];
      duration?: number;
    };

type PersistedDraft = {
  title: string;
  blocks: PersistedBlock[];
  coverImageUrl: string | null;
  dateOfStory: string | null;
  location: LocationValue | null;
  music: MusicValue | null;
  allowShare: boolean;
};

function draftKeyFor(
  promptId?: string | null,
  albumId?: string | null
): string {
  if (promptId) return `story-composer-draft-v1:prompt:${promptId}`;
  if (albumId) return `story-composer-draft-v1:album:${albumId}`;
  return "story-composer-draft-v1:blank";
}

function readDraft(key: string): PersistedDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const d = parsed as Partial<PersistedDraft> & {
      // Old drafts (pre-media-persistence) stored blocks as `string[]`.
      // Migrate on read so users don't lose in-progress text.
      blocks?: unknown;
    };
    let blocks: PersistedBlock[] = [];
    if (Array.isArray(d.blocks)) {
      blocks = d.blocks
        .map((b): PersistedBlock | null => {
          if (typeof b === "string") {
            return { kind: "text", id: makeBlockId("text"), text: b };
          }
          if (b && typeof b === "object" && "kind" in b) {
            return b as PersistedBlock;
          }
          return null;
        })
        .filter((b): b is PersistedBlock => b !== null);
    }
    return {
      title: typeof d.title === "string" ? d.title : "",
      blocks,
      coverImageUrl: d.coverImageUrl ?? null,
      dateOfStory: d.dateOfStory ?? null,
      location: (d.location as LocationValue | null | undefined) ?? null,
      music: (d.music as MusicValue | null | undefined) ?? null,
      allowShare: !!d.allowShare,
    };
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: PersistedDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* quota exceeded / private mode — non-fatal */
  }
}

function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

type Props = {
  /** Album context (from `/new-story?mode=tell&albumId=…`). When set, on
   *  publish we attach the new thread to this album and route back into it. */
  albumId?: string | null;
  /** Answer-a-Prompt entry point (from `/inspiration` → Answer yourself). When
   *  set, we skip the lazy white-card create and instead reply against this
   *  existing prompt; the prompt strip renders above the title. */
  promptId?: string | null;
  /** Draft-resume entry point (from Studio → Draft tab). When set, we hydrate
   *  the composer from the server-side draft (title, cover, meta) so the user
   *  picks up where they left off. Media blocks land as URLs — the composer
   *  can't reattach the underlying Files, but URL-only media still uploads
   *  again fine on publish because we skip un-uploaded blocks with no file. */
  draftId?: string | null;
  onBack: () => void;
  /** Edit-mode entry (from Open Story → Edit Lag). Seeds every field from
   *  the existing story so the composer opens with everything pre-populated.
   *  Save path takes a different branch (update, no create/publish flow). */
  mode?: "new" | "edit";
  initialTitle?: string;
  initialBlocks?: ContentBlock[];
  initialCoverImageUrl?: string | null;
  initialLocation?: LocationValue | null;
  initialDateOfStory?: string | null;
  initialMusic?: MusicValue | null;
  initialTaggedPeople?: FriendUser[];
  existingStoryId?: string;
  existingPromptId?: string;
  existingThreadId?: string;
  existingThreadIsPrivate?: boolean;
  existingStoryStatus?: "draft" | "published";
  /** Answer-a-Prompt edit — the shared prompt card is read-only for cover
   *  edits (would clobber other answerers). Locks the cover picker. */
  isInspoEdit?: boolean;
  onSaved?: () => void;
  /** Reply flow (Add Story to an existing thread). When set, the composer:
   *   - locks the cover to `replyThreadCoverUrl` (no picker)
   *   - creates the story draft with `threadId` bound so BE appends it to
   *     the existing thread and reuses its participants
   *   - publishes with an EMPTY body (BE auto-shares — see api.ts note)
   *   - hides the share/privacy controls (thread already owns them)
   *   - primary button reads "Finish" */
  replyThreadId?: string | null;
  replyThreadCoverUrl?: string | null;
  /** Tell-a-Story reply — hide the prompt strip. The prompt id is still
   *  needed for createStory but there's nothing to render at the top. */
  hidePromptStrip?: boolean;
};

export default function StoryComposer({
  albumId,
  promptId: replyPromptId,
  draftId,
  onBack,
  mode = "new",
  initialTitle,
  initialBlocks,
  initialCoverImageUrl,
  initialLocation,
  initialDateOfStory,
  initialMusic,
  initialTaggedPeople,
  existingStoryId,
  existingPromptId,
  existingThreadId,
  existingThreadIsPrivate,
  existingStoryStatus,
  isInspoEdit = false,
  onSaved,
  replyThreadId = null,
  replyThreadCoverUrl = null,
  hidePromptStrip = false,
}: Props) {
  const isEdit = mode === "edit";
  const isReplyFlow = !isEdit && !!replyThreadId;
  const router = useRouter();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<UserCard | null>(() =>
    replyPromptId ? getCachedUserCard(replyPromptId) : null
  );

  // Refresh-persistence: hydrate from a localStorage draft on first render.
  // Media (image/video/audio) can't survive a page reload — File objects and
  // blob URLs are lost — so we only persist text blocks + meta. See
  // `readDraft`/`writeDraft` below for the shape.
  const draftKey = draftKeyFor(replyPromptId, albumId);
  const initialDraft = useMemo(() => readDraft(draftKey), [draftKey]);
  // Edit-mode seed for the block editor. Existing media blocks land with
  // `uploadedUrl` already set + `file: null` so publish/save skips the
  // upload phase for them entirely.
  const editSeededBlocks = useMemo<EditorBlock[] | null>(() => {
    if (!isEdit || !initialBlocks || initialBlocks.length === 0) return null;
    return initialBlocks.map((b, i): EditorBlock => {
      if (b.type === "text") {
        return {
          id: makeBlockId("text") + `-seed-${i}`,
          type: "text",
          text: b.text,
        };
      }
      if (b.type === "audio") {
        return {
          id: makeBlockId("audio") + `-seed-${i}`,
          type: "audio",
          file: null,
          preview: b.url,
          uploadedUrl: b.url,
        };
      }
      return {
        id: makeBlockId(b.type) + `-seed-${i}`,
        type: b.type,
        file: null,
        preview: b.url,
        uploadedUrl: b.url,
      };
    });
  }, [isEdit, initialBlocks]);
  const [title, setTitle] = useState(
    isEdit ? (initialTitle ?? "") : (initialDraft?.title ?? "")
  );
  // Sync-hydrate blocks from the draft. Media blocks come back with null
  // file/preview — a separate effect below reads the Blob out of IndexedDB
  // and patches state to attach the file + fresh blob URL.
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => {
    if (editSeededBlocks) {
      // Ensure a trailing empty text block so the user can keep typing at
      // the end of the story without hunting for the picker.
      const last = editSeededBlocks[editSeededBlocks.length - 1];
      if (last && last.type === "text") return editSeededBlocks;
      return [...editSeededBlocks, emptyTextBlock()];
    }
    if (!initialDraft || initialDraft.blocks.length === 0) return [emptyTextBlock()];
    return initialDraft.blocks.map((b): EditorBlock => {
      if (b.kind === "text") {
        return { id: b.id, type: "text", text: b.text };
      }
      if (b.type === "audio") {
        return {
          id: b.id,
          type: "audio",
          file: null,
          preview: null,
          waveform: b.waveform,
          duration: b.duration,
        };
      }
      return {
        id: b.id,
        type: b.type,
        file: null,
        preview: null,
      };
    });
  });
  const [cover, setCover] = useState<CoverState>(() => {
    if (isEdit && initialCoverImageUrl) {
      return {
        file: null,
        imageUrl: initialCoverImageUrl,
        preview: initialCoverImageUrl,
      };
    }
    // Reply flow: thread's cover is inherited and locked. Never sent to BE
    // on publish — /api/stories/:id/publish reuses the thread cover.
    if (replyThreadId && replyThreadCoverUrl) {
      return {
        file: null,
        imageUrl: replyThreadCoverUrl,
        preview: replyThreadCoverUrl,
      };
    }
    if (initialDraft?.coverImageUrl) {
      return {
        file: null,
        imageUrl: initialDraft.coverImageUrl,
        preview: initialDraft.coverImageUrl,
      };
    }
    // Answer-a-Prompt seeds the composer with the source prompt's cover so
    // the user sees it pre-selected. The cover isn't sent back to the BE at
    // publish time (see publish path), it's purely visual continuity.
    const seededPromptCover = replyPromptId
      ? getCachedUserCard(replyPromptId)?.imageUrl ?? null
      : null;
    if (seededPromptCover) {
      return {
        file: null,
        imageUrl: seededPromptCover,
        preview: seededPromptCover,
      };
    }
    return EMPTY_COVER;
  });
  const [dateOfStory, setDateOfStory] = useState<string | null>(
    isEdit
      ? (initialDateOfStory ?? null)
      : (initialDraft?.dateOfStory ?? null)
  );
  const [location, setLocation] = useState<LocationValue | null>(
    isEdit ? (initialLocation ?? null) : (initialDraft?.location ?? null)
  );
  const [music, setMusic] = useState<MusicValue | null>(
    isEdit ? (initialMusic ?? null) : (initialDraft?.music ?? null)
  );
  const [allowShare, setAllowShare] = useState(
    isEdit
      ? !existingThreadIsPrivate
      : (initialDraft?.allowShare ?? false)
  );
  // taggedPeople is client-only — never sent to /api/stories. Snapshot at
  // publish time and hand to the celebration screen to pre-check them in
  // the share modal. Edit mode seeds from the story's existing tagged
  // people (also UI-only, mobile explicitly doesn't persist this).
  const [taggedPeople, setTaggedPeople] = useState<FriendUser[]>(
    isEdit ? (initialTaggedPeople ?? []) : []
  );
  const [showTagPeople, setShowTagPeople] = useState(false);

  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Mobile-only two-step flow. Desktop (lg+) renders both columns at once and
  // ignores this state. Step 1 = title/content, Step 2 = cover + share opts.
  const [mobileStep, setMobileStep] = useState<"content" | "cover">("content");
  const [submitting, setSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<ThreadResponse | null>(null);
  const [createdStory, setCreatedStory] = useState<{
    storyId: string;
    threadId: string | null;
    taggedPeopleIds: string[];
  } | null>(null);

  // BE IDs are created lazily — we only spend the round-trips when the user
  // actually publishes (or on draft-save at unmount). The refs mirror state
  // so the unmount effect below can read them without stale closures.
  // Answer-a-Prompt seeds promptIdRef with the existing prompt so we reply
  // to it instead of minting a fresh white card.
  const promptIdRef = useRef<string | null>(
    existingPromptId ?? replyPromptId ?? null
  );
  // Draft-resume seeds storyIdRef so publish PUTs the existing draft
  // record instead of creating a brand-new story. The draft's own
  // promptId (if any) is hydrated in the effect below. Edit mode
  // seeds directly with the existing story's id.
  const storyIdRef = useRef<string | null>(
    existingStoryId ?? draftId ?? null
  );

  // Edit-mode preservation refs. Mobile spec: if a chip is untouched (state
  // remains equal to original), the save handler falls back to the original
  // value rather than sending null (which BE treats as "wipe this field").
  const originalDateRef = useRef<string | null>(initialDateOfStory ?? null);
  const originalLocationRef = useRef<LocationValue | null>(
    initialLocation ?? null
  );
  const originalMusicRef = useRef<MusicValue | null>(initialMusic ?? null);
  const originalStatusRef = useRef<"draft" | "published" | null>(
    existingStoryStatus ?? null
  );
  // Snapshot of the ordered media-only URLs at edit mount. On save, any URL
  // in the snapshot that's no longer present in current blocks = removed;
  // send DELETE /api/stories/:id/media/:index for it (descending order).
  const initialMediaSnapshotRef = useRef<Array<{ url: string }>>(
    isEdit && initialBlocks
      ? initialBlocks
          .filter(
            (b): b is Extract<ContentBlock, { type: "image" | "video" | "audio" }> =>
              b.type !== "text"
          )
          .map((b) => ({ url: b.url }))
      : []
  );

  // Background media uploads — kicked off the moment a user adds a photo,
  // video, or finishes a voice recording. Publish awaits any still in flight
  // instead of doing the upload synchronously, making Publish feel instant
  // for stories where everything already uploaded in the background.
  const uploadPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    if (isEdit) return; // edit-mode owns its own prompt/cover seeding
    if (!replyPromptId) return;
    let cancelled = false;
    fetchUserCard(replyPromptId)
      .then((card) => {
        if (cancelled) return;
        setPrompt(card);
        // Late-seed the cover if the user hasn't picked one yet — mirrors
        // the sync-hydrate branch above but for the network path when the
        // cache was cold on mount.
        if (card.imageUrl) {
          setCover((prev) =>
            prev.file || prev.imageUrl
              ? prev
              : { file: null, imageUrl: card.imageUrl, preview: card.imageUrl }
          );
        }
      })
      .catch(() => {
        /* prompt strip is a nice-to-have — publish still works without it */
      });
    return () => {
      cancelled = true;
    };
  }, [replyPromptId]);

  // Draft-resume hydration. On mount (if the URL carried a draftId),
  // pull the server-side draft and seed title + cover + a single text
  // block from the persisted content. We don't try to re-parse the
  // serialized content back into individual blocks — that's a heavier
  // operation and drafts on the web are always follow-up edits; the
  // user typically wants to keep writing, not re-drag media.
  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await fetchDraftDetail(draftId);
        if (cancelled) return;
        if (detail.title) setTitle(detail.title);
        if (detail.promptId) promptIdRef.current = detail.promptId;
        if (detail.coverImage) {
          setCover((prev) =>
            prev.file || prev.imageUrl
              ? prev
              : { file: null, imageUrl: detail.coverImage!, preview: detail.coverImage! }
          );
        }
        if (typeof detail.dateOfStory === "string") setDateOfStory(detail.dateOfStory);
        if (detail.content && detail.content.trim().length > 0) {
          // Replace the initial empty text block with the draft's saved
          // text. Only fires if we don't already have user-typed content
          // from a browser refresh restoring localStorage.
          setBlocks((prev) => {
            const hasTyped = prev.some(
              (b) => b.type === "text" && b.text.trim().length > 0
            );
            if (hasTyped) return prev;
            return [
              {
                id: makeBlockId("text"),
                type: "text",
                text: detail.content!,
              },
              emptyTextBlock(),
            ];
          });
        }
      } catch {
        /* silent — draft may have been deleted or ID is stale */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  const dirtyRef = useRef(false);
  const draftSavingRef = useRef(false);

  // Free blob URLs for any in-memory media on real unmount so we don't leak
  // ObjectURLs. Ref-tracked so the effect can read latest without deps.
  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);
  useEffect(() => {
    return () => {
      for (const b of blocksRef.current) {
        if (b.type !== "text" && b.preview) URL.revokeObjectURL(b.preview);
      }
    };
  }, []);

  // Track any change that would make a draft worth saving. Cover changes
  // don't count on their own — the whole point of the draft save is to keep
  // the user's typed content across a nav-away. Media blocks count as dirty
  // too (they're lost on unmount because we only serialize uploaded URLs).
  useEffect(() => {
    const hasText = blocks.some(
      (b) => b.type === "text" && b.text.trim().length > 0
    );
    const hasMedia = blocks.some((b) => b.type !== "text");
    if (title.trim() || hasText || hasMedia) dirtyRef.current = true;
  }, [title, blocks]);

  // Refresh-persistence: mirror composer state to localStorage on every
  // meaningful change so a browser reload doesn't wipe the user's work.
  // The draft stores ORDERED block descriptors — text blocks inline, media
  // blocks as `{ kind: "media", id, type }` pointers into IndexedDB. On
  // reload we hydrate from localStorage synchronously, then patch media
  // blocks with their Blobs (see the IDB hydration effect).
  useEffect(() => {
    if (createdStory) return; // published — cleanup happens below
    if (isEdit) return; // edit sessions never persist a new-story draft
    const persistedBlocks: PersistedBlock[] = blocks
      .filter(
        (b) =>
          // In-progress recording has no file yet — nothing worth persisting.
          !(b.type === "audio" && b.recording === true)
      )
      .map((b): PersistedBlock => {
        if (b.type === "text") {
          return { kind: "text", id: b.id, text: b.text };
        }
        if (b.type === "audio") {
          return {
            kind: "media",
            id: b.id,
            type: "audio",
            waveform: b.waveform,
            duration: b.duration,
          };
        }
        return { kind: "media", id: b.id, type: b.type };
      });
    const hasText = persistedBlocks.some(
      (b) => b.kind === "text" && b.text.trim().length > 0
    );
    const hasMedia = persistedBlocks.some((b) => b.kind === "media");
    const hasAnything =
      title.trim().length > 0 ||
      hasText ||
      hasMedia ||
      cover.imageUrl !== null ||
      dateOfStory !== null ||
      location !== null ||
      music !== null ||
      allowShare;
    if (!hasAnything) {
      clearDraft(draftKey);
      return;
    }
    writeDraft(draftKey, {
      title,
      blocks: persistedBlocks,
      coverImageUrl: cover.imageUrl,
      dateOfStory,
      location,
      music,
      allowShare,
    });
  }, [
    title,
    blocks,
    cover.imageUrl,
    dateOfStory,
    location,
    music,
    allowShare,
    createdStory,
    draftKey,
  ]);

  // Media hydration from IndexedDB. Runs once on mount — for any block that
  // came out of the draft without a file/preview, fetch the stored Blob and
  // rebuild a fresh blob URL. Blocks whose Blob is gone (browser data
  // cleared, quota purge) are dropped so we don't render broken skeletons.
  useEffect(() => {
    const idsToHydrate = blocks
      .filter(
        (b) =>
          (b.type === "image" || b.type === "video" || b.type === "audio") &&
          b.file === null &&
          !b.uploadedUrl &&
          // Live-recording audio blocks are null-file on purpose — skip them.
          !(b.type === "audio" && b.recording === true)
      )
      .map((b) => b.id);
    if (idsToHydrate.length === 0) return;
    let cancelled = false;
    (async () => {
      const resolved = await Promise.all(
        idsToHydrate.map(async (id) => ({ id, file: await getMedia(id) }))
      );
      if (cancelled) return;
      setBlocks((prev) => {
        const missing = new Set<string>();
        const next = prev.map((b) => {
          const hit = resolved.find((r) => r.id === b.id);
          if (!hit) return b;
          if (!hit.file) {
            missing.add(b.id);
            return b;
          }
          if (b.type === "text") return b;
          const preview = URL.createObjectURL(hit.file);
          return { ...b, file: hit.file, preview };
        });
        if (missing.size === 0) return next;
        return next.filter((b) => !missing.has(b.id));
      });
      // Kick off background uploads for blocks whose files were just
      // restored from IDB — matches the fresh-add path so a resumed draft
      // publishes just as fast.
      for (const { id, file } of resolved) {
        if (file) startBackgroundUpload(id, file);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally single-shot on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draft save on unmount. Best-effort — we fire and forget so nav isn't
  // blocked. Skip if nothing to save, if a publish already completed, or if
  // the composer never saw material input.
  useEffect(() => {
    return () => {
      if (draftSavingRef.current) return;
      if (createdStory) return; // published — no draft dance needed
      // CRITICAL: edit mode must never touch storyIdRef via draft-save —
      // that would call updateStory on the real published story with only
      // the serialized text (wiping every media block and downgrading it
      // to draft) any time the user backs out.
      if (isEdit) return;
      if (!dirtyRef.current) return;
      draftSavingRef.current = true;
      // Draft save only persists text — media blocks stay in-memory to keep
      // the unmount fast (uploads take seconds; nav shouldn't wait). Users
      // who want media saved must publish.
      const draftText = blocks
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n\n");
      void saveDraftSilently({
        title,
        text: draftText,
        promptIdRef,
        storyIdRef,
      });
    };
    // Intentionally not tracking title/text/createdStory — we only want the
    // teardown to fire on real unmount, using whatever values live in the
    // refs at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPreview() {
    if (!user) return;
    // Convert editor blocks → serializable blocks. For un-uploaded media we
    // fall back to the blob preview URL so the viewer can render it in-place.
    const previewBlocks: StoryBlock[] = blocks
      .map((b): StoryBlock | null => {
        if (b.type === "text") {
          return b.text.trim() ? { type: "text", text: b.text } : null;
        }
        const url = b.uploadedUrl || b.preview;
        return url ? { type: b.type, url } : null;
      })
      .filter((b): b is StoryBlock => b !== null);

    setPreviewData(
      buildPreviewThread({
        currentUser: user,
        title,
        text: "",
        media: [],
        blocks: previewBlocks,
        dateOfStory,
        location,
        music,
        coverPreview: cover.preview,
        prompt,
      })
    );
  }

  async function ensureIds(): Promise<{ promptId: string; storyId: string }> {
    let promptId = promptIdRef.current;
    if (!promptId) {
      const card = await createUserCard({ content: "", type: "WHITE" });
      promptId = card._id;
      promptIdRef.current = promptId;
    }
    let storyId = storyIdRef.current;
    if (!storyId) {
      const story = await createStory({
        title: title.trim() || "",
        content: "",
        status: "draft",
        promptId,
        // Reply flow: bind the draft to the existing thread so BE appends
        // the new story into it (reusing cover + participants). No BE
        // /reply endpoint exists — this single field is what routes it.
        threadId: replyThreadId ?? undefined,
      });
      storyId = story._id;
      storyIdRef.current = storyId;
    }
    return { promptId, storyId };
  }

  // Fire-and-forget media upload. Tracked in `uploadPromisesRef` so publish
  // can await any still in flight. On success, stamps `uploadedUrl` on the
  // block so publish skips re-upload; on failure, silently drops the tracker
  // and publish's fallback loop will retry synchronously.
  function startBackgroundUpload(blockId: string, file: File) {
    const promise = (async () => {
      const { storyId } = await ensureIds();
      const token = await getUploadToken(storyId, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      const uploaded = await uploadToCloudinary(token, file);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId && b.type !== "text"
            ? { ...b, uploadedUrl: uploaded.secure_url }
            : b
        )
      );
    })().catch(() => {
      // Swallow — publish's fallback loop will re-upload if needed.
    });
    uploadPromisesRef.current.set(blockId, promise);
    void promise.finally(() => {
      uploadPromisesRef.current.delete(blockId);
    });
  }

  async function handlePublish() {
    if (submitting) return;
    if (!title.trim()) {
      toast.error("Give your story a title");
      return;
    }
    const hasContent = blocks.some((b) =>
      b.type === "text" ? b.text.trim().length > 0 : true
    );
    if (!hasContent) {
      toast.error("Add some text or media to your story");
      return;
    }
    // Answering a prompt or adding to an existing thread inherits the
    // source cover — don't force a pick.
    if (!replyPromptId && !isReplyFlow && !cover.file && !cover.imageUrl) {
      toast.error("Choose a cover image");
      return;
    }
    if (recording) {
      toast.error("Stop the recording before publishing");
      return;
    }
    setSubmitting(true);
    try {
      const { promptId, storyId } = await ensureIds();

      // Cover attach — file wins over imageUrl. Only fire when we're
      // publishing against a *fresh* prompt we just minted. In Answer-a-Prompt
      // (replyPromptId set) or an Add-Story reply (replyThreadId set), the
      // promptId points to a card the author doesn't own — hitting
      // `PUT /api/user-card/:id` returns "Card not found" (403 masked as
      // 404). Both flows inherit the source/thread cover, so skip attach.
      if (!replyPromptId && !isReplyFlow) {
        if (cover.file) {
          await updateUserCard(promptId, { file: cover.file });
        } else if (cover.imageUrl) {
          await updateUserCard(promptId, { imageUrl: cover.imageUrl });
        }
      }

      // Wait for any background uploads still in flight before touching the
      // block list — they may stamp `uploadedUrl` and skip work below.
      if (uploadPromisesRef.current.size > 0) {
        await Promise.all(uploadPromisesRef.current.values());
      }

      // Phase-2 block content: upload any un-uploaded media in parallel, then
      // serialize with the returned URLs. Uploaded blocks are cached in a
      // Map so retries after a mid-flight failure don't re-upload.
      const uploadedByBlock = new Map<string, string>();
      const pendingUploads: Array<Promise<void>> = [];
      // Read fresh from the ref — background uploads may have stamped
      // `uploadedUrl` on blocks after this handler captured its closure.
      const currentBlocks = blocksRef.current;
      for (const b of currentBlocks) {
        if (b.type === "text") continue;
        if (b.uploadedUrl) {
          uploadedByBlock.set(b.id, b.uploadedUrl);
          continue;
        }
        // Any media block can be null-file (audio: mid-record; image/video/
        // audio: hydration in flight or IDB blob lost). The publish guard
        // above blocks the in-record case; the rest we just skip.
        if (!b.file) continue;
        const file = b.file;
        const blockId = b.id;
        pendingUploads.push(
          (async () => {
            const token = await getUploadToken(storyId, {
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
            });
            const uploaded = await uploadToCloudinary(token, file);
            uploadedByBlock.set(blockId, uploaded.secure_url);
          })()
        );
      }
      await Promise.all(pendingUploads);

      // Reflect the new URLs back into state so a subsequent failed
      // publish doesn't re-upload.
      setBlocks((prev) =>
        prev.map((b) =>
          b.type === "text" || !uploadedByBlock.has(b.id)
            ? b
            : { ...b, uploadedUrl: uploadedByBlock.get(b.id)! }
        )
      );

      const serializable: StoryBlock[] = currentBlocks
        .map((b): StoryBlock | null => {
          if (b.type === "text") {
            return b.text.trim() ? { type: "text", text: b.text } : null;
          }
          const url = uploadedByBlock.get(b.id);
          return url ? { type: b.type, url } : null;
        })
        .filter((b): b is StoryBlock => b !== null);

      const content = serializeBlocksToContent(serializable);

      // Mobile V4 rule: always send location + music keys (with null when
      // cleared) so BE drops a stale value on edit.
      await updateStory(storyId, {
        title: title.trim(),
        content,
        dateOfStory: dateOfStory ?? undefined,
        location: location ?? null,
        music: music ?? null,
      });

      // Reply flow publishes with an empty body — BE auto-fans out to the
      // thread's existing participants. Non-reply keeps the old contract.
      const published = await publishStory(
        storyId,
        isReplyFlow ? {} : { shareWith: [], sendSeparately: false }
      );
      const threadId = published.storyThread ?? published._id ?? null;

      // /publish rejects isPrivate. BE default is private → only call
      // /privacy when user opted in. Reply flow inherits thread privacy
      // — the thread already owns that setting.
      if (!isReplyFlow && threadId && allowShare) {
        try {
          await setThreadPrivacy(threadId, { isPrivate: false });
        } catch {
          /* non-fatal — story is published */
        }
      }

      // Snapshot tagged IDs *before* we exit — draft state gets torn down as
      // soon as we unmount, so we can't read taggedPeople later.
      const taggedPeopleIds = taggedPeople
        .map((u) => u._id || u.epochlagID || "")
        .filter(Boolean);
      clearDraft(draftKey);
      // Nuke all persisted media Blobs — the story is now on the server so
      // the composer's local copies are dead weight.
      void clearAllMedia();
      // Reply flow skips the StoryCreated celebration (which drives a share
      // step). BE already fanned out to thread participants — route straight
      // back to the thread the user was replying into.
      if (isReplyFlow) {
        router.replace(`/thread/${replyThreadId}`);
        return;
      }
      setCreatedStory({ storyId, threadId, taggedPeopleIds });
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

  // Edit-mode privacy toggle — fires the PUT immediately (not on Save).
  // Mobile's ManageStoryParticipantsModal owns this endpoint on a separate
  // flow; the web edit view surfaces the toggle inline but the call is
  // still independent of the Save button. Optimistic + rollback on failure.
  async function handleAllowShareChange(next: boolean) {
    setAllowShare(next);
    if (!isEdit || !existingThreadId) return;
    try {
      await setThreadPrivacy(existingThreadId, { isPrivate: !next });
    } catch {
      setAllowShare(!next);
      toast.error("Couldn't update sharing. Try again.");
    }
  }

  // Edit-mode save — matches mobile's ChooseCoverV4Screen orchestration.
  // Order matters:
  //   1. Guard on media in flight (blob URLs would poison the content string).
  //   2. Cover attach (skipped on inspo edits — shared prompt card is R/O).
  //   3. Diff current media vs the mount-time snapshot to detect removals.
  //   4. If ANY removals AND story was published, downgrade to draft first.
  //      DELETEs are rejected on published stories; adding new media without
  //      removals auto-downgrades server-side, so pure-add skips this step.
  //   5. DELETE removed media by index in DESCENDING order (sequential —
  //      BE bumps __v on every media mutation → parallel fanout conflicts).
  //   6. Upload any NEW media (background uploads may already have stamped
  //      uploadedUrl).
  //   7. PUT /stories/:id with content/title/date/location/music.
  //      Untouched date/location/music fall back to the original snapshot so
  //      the caller doesn't accidentally wipe a field it didn't touch.
  //   8. Best-effort re-publish. Swallow ALL errors — if BE didn't downgrade,
  //      this 400s ("already published") and that's a no-op.
  async function handleSaveEdit() {
    if (submitting) return;
    const storyId = storyIdRef.current;
    if (!storyId) return;
    if (!title.trim()) {
      toast.error("Give your story a title");
      return;
    }
    const hasContent = blocksRef.current.some((b) =>
      b.type === "text" ? b.text.trim().length > 0 : true
    );
    if (!hasContent) {
      toast.error("Add some text or media to your story");
      return;
    }
    if (recording) {
      toast.error("Stop the recording before saving");
      return;
    }
    // Wait on any background uploads still in flight. If those uploads
    // FAILED (background upload swallows errors), the block keeps its
    // `file` with no `uploadedUrl` — the fallback loop below will retry
    // the upload synchronously instead of blocking the user.
    if (uploadPromisesRef.current.size > 0) {
      await Promise.all(uploadPromisesRef.current.values());
    }

    setSubmitting(true);
    try {
      // 1. Cover attach — skip on inspo edits (shared prompt card is R/O).
      const promptId = promptIdRef.current;
      if (!isInspoEdit && promptId) {
        if (cover.file) {
          await updateUserCard(promptId, { file: cover.file });
        } else if (
          cover.imageUrl &&
          cover.imageUrl !== initialCoverImageUrl
        ) {
          await updateUserCard(promptId, { imageUrl: cover.imageUrl });
        }
      }

      // 2. Media diff. Snapshot = media at mount; current = uploaded URLs
      // still present in blocks. Anything in snapshot missing from current
      // = removed. Original indices come from snapshot order.
      const currentBlocks = blocksRef.current;
      const currentUrls = new Set(
        currentBlocks
          .filter((b) => b.type !== "text" && !!b.uploadedUrl)
          .map((b) => (b as { uploadedUrl?: string }).uploadedUrl!)
      );
      const removedIndices: number[] = [];
      initialMediaSnapshotRef.current.forEach((snap, idx) => {
        if (!currentUrls.has(snap.url)) removedIndices.push(idx);
      });

      // 3. Downgrade guard — BE rejects both DELETEs and new-media uploads
      // on published stories ("Cannot add media to published stories").
      // Mobile relies on a BE-side auto-downgrade for pure-add edits; web BE
      // doesn't do that, so we downgrade explicitly whenever there's any
      // media mutation (adds OR removals). Re-publish at the end flips it
      // back — if BE never downgraded, that call 400s harmlessly.
      const hasNewUploads = currentBlocks.some(
        (b) => b.type !== "text" && !b.uploadedUrl && !!b.file
      );
      if (
        (removedIndices.length > 0 || hasNewUploads) &&
        originalStatusRef.current === "published"
      ) {
        await updateStory(storyId, { status: "draft" });
      }

      // 4. DELETE removed media in descending index order, sequential.
      const descending = [...removedIndices].sort((a, b) => b - a);
      for (const idx of descending) {
        try {
          await deleteStoryMedia(storyId, idx);
        } catch {
          // Non-fatal — if a media entry is already gone BE will 404. The
          // content string we send in step 6 is authoritative for the
          // final block order anyway.
        }
      }

      // 5. Upload any NEW media that snuck in without a background upload.
      const uploadedByBlock = new Map<string, string>();
      const pendingUploads: Array<Promise<void>> = [];
      for (const b of currentBlocks) {
        if (b.type === "text") continue;
        if (b.uploadedUrl) {
          uploadedByBlock.set(b.id, b.uploadedUrl);
          continue;
        }
        if (!b.file) continue;
        const file = b.file;
        const blockId = b.id;
        pendingUploads.push(
          (async () => {
            const token = await getUploadToken(storyId, {
              fileName: file.name,
              fileSize: file.size,
              mimeType: file.type,
            });
            const uploaded = await uploadToCloudinary(token, file);
            uploadedByBlock.set(blockId, uploaded.secure_url);
          })()
        );
      }
      await Promise.all(pendingUploads);

      // 6. Serialize + update.
      const serializable: StoryBlock[] = currentBlocks
        .map((b): StoryBlock | null => {
          if (b.type === "text") {
            return b.text.trim() ? { type: "text", text: b.text } : null;
          }
          const url = uploadedByBlock.get(b.id);
          return url ? { type: b.type, url } : null;
        })
        .filter((b): b is StoryBlock => b !== null);
      const content = serializeBlocksToContent(serializable);

      // Preserve-untouched pattern: if chip state is null but original was
      // set, don't overwrite the original.
      const nextDate = dateOfStory ?? originalDateRef.current ?? undefined;
      const nextLocation = location ?? originalLocationRef.current ?? null;
      const nextMusic = music ?? originalMusicRef.current ?? null;

      await updateStory(storyId, {
        title: title.trim(),
        content,
        dateOfStory: nextDate ?? undefined,
        location: nextLocation,
        music: nextMusic,
      });

      // 7. Best-effort re-publish. Swallow everything — if BE didn't
      // downgrade, this 400s and that's fine.
      try {
        await publishStory(storyId, {
          shareWith: [],
          sendSeparately: false,
        });
      } catch {
        /* silent — fire-and-forget insurance */
      }

      toast.success("Story updated");
      onSaved?.();
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

  const [uploadModal, setUploadModal] = useState<"image" | "video" | null>(null);
  // Live recording session — mirrors the block that's currently being
  // recorded into. seconds/levels update at 60fps via a RAF loop, so we
  // keep them here (not on the block) to avoid noisy history in blocks state.
  const [recording, setRecording] = useState<{
    blockId: string;
    seconds: number;
    levels: number[];
    paused: boolean;
  } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Track which block is currently focused. All Aa/media insertions key off
  // this — pills insert *after* the focused block, or append if none.
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  // Newly-created text blocks flag themselves as "focus me next tick" so the
  // Aa pill can drop the user directly into the fresh block without a manual
  // click. Consumed & cleared by the block's mount effect.
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);

  // Empty-state gate: shows a 2×2 tile picker in place of the block editor +
  // bottom pill row when the composer body has no meaningful content. Mirrors
  // TellAStoryV4Screen.js:3460's `isPureEmptyState`. Title / cover / metadata
  // chips / share toggle are intentionally ignored — this is a *body-content*
  // picker. A single trailing empty text block does NOT count as content.
  const isPureEmptyState = useMemo(() => {
    if (editingBlockId) return false;
    if (recording) return false;
    const hasContent = blocks.some(
      (b) => b.type !== "text" || b.text.trim().length > 0
    );
    return !hasContent;
  }, [blocks, editingBlockId, recording]);

  // Dev-only visibility into which signal killed the grid — matches the mobile
  // `[EmptyStateGate] hidden — reasons:` log so debugging stays symmetrical
  // when the grid unexpectedly fails to re-appear on delete-all.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (isPureEmptyState) return;
    const reasons: string[] = [];
    if (editingBlockId) reasons.push("editing");
    if (recording) reasons.push("recording");
    if (blocks.some((b) => b.type !== "text" || b.text.trim().length > 0)) {
      reasons.push("hasContent");
    }
    if (reasons.length > 0) {
      // eslint-disable-next-line no-console
      console.log("[EmptyStateGate] hidden — reasons:", reasons.join(","));
    }
  }, [isPureEmptyState, editingBlockId, recording, blocks]);

  // Trailing-empty-text invariant: exactly one empty text block must always
  // exist somewhere in the list — usually at the end so the caret has a
  // landing spot. Mirror of TellAStoryV4Screen.js:449-481. See spec.
  useEffect(() => {
    const emptyIndices: number[] = [];
    for (let i = 0; i < blocks.length; i++) {
      if (isEmptyText(blocks[i])) emptyIndices.push(i);
    }
    if (emptyIndices.length > 1) {
      const focusedIdx = editingBlockId
        ? blocks.findIndex((b) => b.id === editingBlockId)
        : -1;
      const keepIdx =
        focusedIdx >= 0 && isEmptyText(blocks[focusedIdx])
          ? focusedIdx
          : emptyIndices[emptyIndices.length - 1];
      setBlocks((prev) =>
        prev.filter((_, i) => !emptyIndices.includes(i) || i === keepIdx)
      );
      return;
    }
    if (emptyIndices.length === 0) {
      setBlocks((prev) => [...prev, emptyTextBlock()]);
    }
  }, [blocks, editingBlockId]);

  function insertAfterFocus(newBlocks: EditorBlock[]) {
    setBlocks((prev) => {
      const idx = editingBlockId
        ? prev.findIndex((b) => b.id === editingBlockId)
        : -1;
      if (idx < 0) return [...prev, ...newBlocks];
      const next = [...prev];
      next.splice(idx + 1, 0, ...newBlocks);
      return next;
    });
  }

  function addMediaBlock(kind: "image" | "video", file: File) {
    const id = makeBlockId(kind);
    const preview = URL.createObjectURL(file);
    const block: EditorBlock = { id, type: kind, file, preview };
    insertAfterFocus([block]);
    // Persist the blob so it survives a refresh. Fire-and-forget — the IDB
    // write is ~ms and the composer stays interactive while it flushes.
    void putMedia(id, file);
    // Kick off the upload immediately so publish just has to write metadata.
    startBackgroundUpload(id, file);
    // Invariant effect appends a trailing empty text block next tick — no
    // need to add one here.
  }

  async function startRecording() {
    if (recording) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Microphone permission denied");
      return;
    }
    streamRef.current = stream;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;

    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(200);
    recorderRef.current = rec;

    // Insert a placeholder audio block that renders as the inline recorder.
    const id = makeBlockId("audio");
    insertAfterFocus([
      { id, type: "audio", file: null, preview: null, recording: true },
    ]);
    setRecording({ blockId: id, seconds: 0, levels: [], paused: false });
    tickWaveform();
    startTimer();
  }

  function tickWaveform() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    // Time-domain samples (0..255, centered at 128). RMS of the deviation
    // gives a proper amplitude read that stays non-zero for quiet audio and
    // scales smoothly with volume — unlike averaged FFT bins, which sit
    // near zero for typical voice and produced a visually flat line.
    const buf = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / buf.length);
      setRecording((prev) => {
        if (!prev) return prev;
        const next = [...prev.levels, rms];
        // Cap length — finalized playback re-samples down to fit the row.
        return {
          ...prev,
          levels: next.length > 200 ? next.slice(next.length - 200) : next,
        };
      });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  function pauseWaveform() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRecording((prev) => (prev ? { ...prev, seconds: prev.seconds + 1 } : prev));
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function togglePauseRecording() {
    const rec = recorderRef.current;
    if (!rec || !recording) return;
    if (recording.paused) {
      rec.resume();
      tickWaveform();
      startTimer();
      setRecording({ ...recording, paused: false });
    } else {
      rec.pause();
      pauseWaveform();
      stopTimer();
      setRecording({ ...recording, paused: true });
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (!rec || !recording) return;
    const blockId = recording.blockId;
    const finalLevels = recording.levels;
    const finalSeconds = recording.seconds;
    pauseWaveform();
    stopTimer();
    rec.onstop = () => {
      const type = rec.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "m4a" : "webm";
      const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
      const preview = URL.createObjectURL(blob);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId && b.type === "audio"
            ? {
                ...b,
                file,
                preview,
                recording: false,
                waveform: finalLevels,
                duration: finalSeconds,
              }
            : b
        )
      );
      // Persist finalized voice note to IDB so it survives a refresh.
      void putMedia(blockId, file);
      // Kick off the upload immediately so publish is fast.
      startBackgroundUpload(blockId, file);
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => undefined);
      streamRef.current = null;
      recorderRef.current = null;
      audioCtxRef.current = null;
      analyserRef.current = null;
      setRecording(null);
    };
    rec.stop();
  }

  function cancelRecording() {
    const rec = recorderRef.current;
    const blockId = recording?.blockId;
    pauseWaveform();
    stopTimer();
    try {
      if (rec && rec.state !== "inactive") rec.stop();
    } catch {
      /* ignore */
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => undefined);
    streamRef.current = null;
    recorderRef.current = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
    chunksRef.current = [];
    if (blockId) {
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      void deleteMedia(blockId);
    }
    setRecording(null);
  }

  function handleAddTextBlock() {
    // Aa reuses a trailing empty text block instead of stacking duplicates.
    // 1) If a block is focused and the block after it is already empty, jump
    //    there. 2) Else if nothing focused and the last block is empty, jump
    //    there. 3) Otherwise insert a new empty text block after the focus
    //    (or at end) and focus it.
    const idx = editingBlockId
      ? blocks.findIndex((b) => b.id === editingBlockId)
      : -1;
    if (idx >= 0) {
      const after = blocks[idx + 1];
      if (isEmptyText(after)) {
        setPendingFocusId(after.id);
        return;
      }
    } else {
      const last = blocks[blocks.length - 1];
      if (isEmptyText(last)) {
        setPendingFocusId(last.id);
        return;
      }
    }
    const fresh = emptyTextBlock();
    if (idx >= 0) {
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, fresh);
        return next;
      });
    } else {
      setBlocks((prev) => [...prev, fresh]);
    }
    setPendingFocusId(fresh.id);
  }

  // Empty-state Text tile wrapper: `handleAddTextBlock` only sets
  // pendingFocusId, which is enough once BlocksEditor is mounted. But in the
  // empty state BlocksEditor is unmounted (grid is rendered instead), so we
  // must also flip editingBlockId here to move the gate off the grid — then
  // the fresh mount of the block picks up pendingFocusId and grabs focus.
  function handleEmptyStateAddText() {
    const currentBlocks = blocksRef.current;
    const last = currentBlocks[currentBlocks.length - 1];
    if (isEmptyText(last)) {
      setEditingBlockId(last.id);
      setPendingFocusId(last.id);
      return;
    }
    const fresh = emptyTextBlock();
    setBlocks((prev) => [...prev, fresh]);
    setEditingBlockId(fresh.id);
    setPendingFocusId(fresh.id);
  }

  function updateBlock(id: string, patch: Partial<EditorBlock>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...patch } as EditorBlock) : b))
    );
  }

  function removeBlock(id: string) {
    setBlocks((prev) => {
      const next = prev.filter((b) => {
        if (b.id !== id) return true;
        if (b.type !== "text" && b.preview) URL.revokeObjectURL(b.preview);
        return false;
      });
      // Invariant effect will append a trailing empty text block if we ended
      // up with zero blocks — no explicit fallback needed.
      return next;
    });
    // Drop the IDB copy too — otherwise the entry lingers until publish.
    void deleteMedia(id);
  }

  function reorderBlocks(fromId: string, toId: string) {
    if (fromId === toId) return;
    setBlocks((prev) => {
      const fromIdx = prev.findIndex((b) => b.id === fromId);
      const toIdx = prev.findIndex((b) => b.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      return arrayMove(prev, fromIdx, toIdx);
    });
  }

  function handleCoverPicked(pick: CoverPick) {
    if (pick.kind === "curated") {
      setCover({ file: null, imageUrl: pick.imageUrl, preview: pick.preview });
    } else {
      setCover({ file: pick.file, imageUrl: null, preview: pick.preview });
    }
  }

  if (createdStory) {
    return (
      <StoryCreatedOverlay
        storyId={createdStory.storyId}
        preselectedUserIds={createdStory.taggedPeopleIds}
        onDone={() => {
          // Replace, don't push — the composer route shouldn't sit on the
          // back stack after a successful publish. From the thread page,
          // Back should return to Lags (or wherever they came from), not
          // drop them back into a stale composer session.
          if (albumId) {
            router.replace(`/lags`);
            return;
          }
          if (createdStory.threadId) {
            router.replace(`/thread/${createdStory.threadId}`);
          } else {
            router.replace("/lags");
          }
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-y-auto bg-[#FFEFDC] lg:bg-transparent">
      {/* Header row — desktop (lg+) shows left title + Preview/Create actions;
          mobile shows centered title with icon-only Help + Preview on the right. */}
      <div className="shrink-0 px-[16px] md:px-[24px] lg:px-[40px] pt-[12px] pb-[12px] flex items-center justify-between gap-[12px] relative">
        <div className="flex items-center gap-[12px] min-w-0">
          <button
            type="button"
            onClick={() => {
              if (mobileStep === "cover") {
                setMobileStep("content");
                return;
              }
              onBack();
            }}
            aria-label="Back"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white lg:bg-[#ededed] text-primary-blue flex items-center justify-center hover:brightness-95 lg:hover:bg-[#e3e3e3] transition-[filter] shrink-0"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <h1 className="hidden lg:block font-montserrat font-bold text-primary-blue text-[28px] leading-tight truncate">
            {isEdit ? "Edit Lag" : "New Lag"}
          </h1>
        </div>
        {/* Mobile-only centered title */}
        <h1 className="lg:hidden absolute left-1/2 -translate-x-1/2 font-montserrat font-bold text-primary-blue text-[18px] leading-tight">
          New Lag
        </h1>
        <div className="flex items-center gap-[8px] lg:gap-[12px] shrink-0">
          {/* Mobile: icon-only help + preview */}
          <div className="lg:hidden relative">
            <button
              type="button"
              aria-label="Help"
              onClick={() => setShowHelp((v) => !v)}
              className={`cursor-pointer w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors ${
                showHelp
                  ? "bg-primary-blue text-white"
                  : "text-primary-blue hover:bg-black/[0.04]"
              }`}
            >
              <HelpIcon width={20} height={20} />
            </button>
            {showHelp && (
              <HelpTooltip
                variant="mobile"
                onClose={() => setShowHelp(false)}
              />
            )}
          </div>
          <button
            type="button"
            onClick={openPreview}
            aria-label="Preview"
            className="lg:hidden cursor-pointer w-[32px] h-[32px] rounded-full text-primary-blue flex items-center justify-center hover:bg-black/[0.04] transition-colors"
          >
            <EyeIcon width={20} height={20} />
          </button>
          {/* Desktop: full Preview + Create buttons */}
          <div className="hidden lg:block relative">
            <button
              type="button"
              aria-label="Help"
              onClick={() => setShowHelp((v) => !v)}
              className={`cursor-pointer w-[32px] h-[32px] rounded-full flex items-center justify-center transition-colors ${
                showHelp
                  ? "bg-primary-blue text-white"
                  : "text-primary-blue hover:bg-black/[0.04]"
              }`}
            >
              <HelpIcon width={20} height={20} />
            </button>
            {showHelp && (
              <HelpTooltip
                variant="desktop"
                onClose={() => setShowHelp(false)}
              />
            )}
          </div>
          <button
            type="button"
            onClick={openPreview}
            className="hidden lg:flex cursor-pointer items-center justify-center gap-[8px] border-[1.5px] border-primary-blue text-primary-blue rounded-full h-[44px] px-[40px] font-montserrat font-medium text-[15px] hover:bg-primary-blue/[0.04] transition-colors"
          >
            <EyeIcon width={16} height={16} />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={isEdit ? handleSaveEdit : handlePublish}
            disabled={submitting}
            className="hidden lg:flex cursor-pointer items-center justify-center bg-primary-orange text-white rounded-full h-[44px] px-[44px] font-montserrat font-medium text-[15px] hover:brightness-95 transition-[filter] disabled:opacity-60"
          >
            {submitting
              ? isEdit
                ? "Saving…"
                : isReplyFlow
                  ? "Finishing…"
                  : "Creating…"
              : isEdit
                ? "Save"
                : isReplyFlow
                  ? "Finish"
                  : "Create Story"}
          </button>
        </div>
      </div>
      <div className="mx-[16px] md:mx-[24px] lg:mx-[40px] h-px bg-[#d9d9d9]" />

      {/* Desktop (lg+) two-column body — unchanged. Mobile renders a separate
          step-based layout below. */}
      <div className="hidden lg:flex flex-1 min-h-0 flex-row gap-[32px] px-[40px] pt-[20px] pb-[120px]">
        {/* MAIN COLUMN */}
        <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
          {prompt && !hidePromptStrip && <PromptStrip prompt={prompt} />}
          <TitleInput value={title} onChange={setTitle} />
          {isPureEmptyState ? (
            <EmptyStateGrid
              onVoice={startRecording}
              onPhoto={() => setUploadModal("image")}
              onVideo={() => setUploadModal("video")}
              onText={handleEmptyStateAddText}
            />
          ) : (
            <BlocksEditor
              blocks={blocks}
              editingBlockId={editingBlockId}
              pendingFocusId={pendingFocusId}
              recording={recording}
              onUpdate={updateBlock}
              onRemove={removeBlock}
              onReorder={reorderBlocks}
              onFocusBlock={setEditingBlockId}
              onFocusHandled={() => setPendingFocusId(null)}
              onStopRecording={stopRecording}
              onTogglePauseRecording={togglePauseRecording}
              onCancelRecording={cancelRecording}
            />
          )}
        </div>

        {/* RIGHT RAIL (desktop only) */}
        <div className="w-[300px] shrink-0 flex flex-col gap-[10px]">
          <MetaChip
            icon={<MapPinIcon width={16} height={16} />}
            label="Add Location"
          >
            <LocationChip value={location} onChange={setLocation} />
          </MetaChip>
          <MetaChip
            icon={<CalendarIcon width={16} height={16} />}
            label="Add Date"
          >
            <DateChip value={dateOfStory} onChange={setDateOfStory} />
          </MetaChip>
          <MetaChip
            icon={<MusicNoteIcon width={16} height={16} />}
            label="Add Music"
          >
            <MusicChip value={music} onChange={setMusic} />
          </MetaChip>
          <TagPeopleChip
            selected={taggedPeople}
            onOpen={() => setShowTagPeople(true)}
          />

          <div className="h-[2px] w-full bg-[#d9d9d9] my-[8px] shrink-0" />

          <div>
            <p className="font-montserrat font-medium text-primary-blue text-[15px] mb-[10px]">
              {isReplyFlow ? "Thread Cover" : "Add Cover image"}
            </p>
            <button
              type="button"
              onClick={() => {
                if (isReplyFlow) return;
                setShowCoverModal(true);
              }}
              disabled={isReplyFlow}
              className={`relative w-full aspect-square rounded-[16px] bg-[#ffefdc] overflow-hidden flex items-center justify-center transition-[filter] ${
                isReplyFlow ? "cursor-default" : "cursor-pointer hover:brightness-[0.98]"
              }`}
            >
              {cover.preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.preview}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-[12px] text-primary-blue">
                  <ImageIcon width={36} height={36} />
                  <span className="border-[1.5px] border-primary-blue rounded-full px-[16px] py-[8px] font-montserrat font-medium text-[14px]">
                    Choose Cover
                  </span>
                </div>
              )}
            </button>
            {isReplyFlow && (
              <p className="mt-[8px] font-montserrat text-primary-blue/60 text-[12px] leading-[16px]">
                Reusing the thread cover.
              </p>
            )}
          </div>

          {!isReplyFlow && (
            <>
              <div className="flex items-center justify-between">
                <span className="font-montserrat font-medium text-primary-blue text-[15px]">
                  Allow others to share
                </span>
                <ToggleSwitch
                  checked={allowShare}
                  onChange={handleAllowShareChange}
                  ariaLabel="Allow others to share"
                />
              </div>

              <div className="bg-white border border-black/[0.06] rounded-[16px] shadow-[0_0_8.9px_rgba(0,0,0,0.15)] p-[16px] flex items-start gap-[12px]">
                <LockIcon />
                <div>
                  <p className="font-montserrat font-semibold text-primary-blue text-[14px]">
                    Secure and Private
                  </p>
                  <p className="mt-[4px] font-montserrat text-primary-blue text-[13px] leading-[18px]">
                    Only you can add people to this thread
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="h-[40px] shrink-0" aria-hidden />
        </div>
      </div>

      {/* Mobile body (< lg). Two-step flow: content, then cover. */}
      <div className="lg:hidden flex-1 min-h-0 flex flex-col gap-[16px] px-[16px] md:px-[24px] pt-[16px] pb-[160px]">
        {mobileStep === "content" ? (
          <>
            {prompt && !hidePromptStrip && <PromptStrip prompt={prompt} />}
            <TitleInput value={title} onChange={setTitle} />
            <MobileMetaChipRow
              location={location}
              onLocation={setLocation}
              dateOfStory={dateOfStory}
              onDate={setDateOfStory}
              music={music}
              onMusic={setMusic}
              taggedPeople={taggedPeople}
              onOpenTagPeople={() => setShowTagPeople(true)}
            />
            {isPureEmptyState ? (
              <EmptyStateGrid
                onVoice={startRecording}
                onPhoto={() => setUploadModal("image")}
                onVideo={() => setUploadModal("video")}
                onText={handleEmptyStateAddText}
              />
            ) : (
              <BlocksEditor
                blocks={blocks}
                editingBlockId={editingBlockId}
                pendingFocusId={pendingFocusId}
                recording={recording}
                onUpdate={updateBlock}
                onRemove={removeBlock}
                onReorder={reorderBlocks}
                onFocusBlock={setEditingBlockId}
                onFocusHandled={() => setPendingFocusId(null)}
                onStopRecording={stopRecording}
                onTogglePauseRecording={togglePauseRecording}
                onCancelRecording={cancelRecording}
              />
            )}
          </>
        ) : (
          <>
            <TitleInput value={title} onChange={setTitle} />
            <div>
              <button
                type="button"
                onClick={() => setShowCoverModal(true)}
                className="cursor-pointer relative w-full aspect-[4/3] rounded-[20px] bg-white border border-black/[0.06] overflow-hidden flex items-center justify-center hover:brightness-[0.98] transition-[filter]"
              >
                {cover.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover.preview}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-[12px] text-primary-blue">
                    <ImageIcon width={44} height={44} />
                    <span className="font-montserrat font-medium text-[14px] text-center">
                      Click to upload a
                      <br />
                      cover photo
                    </span>
                  </div>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-[8px]">
              <span className="font-montserrat font-medium text-primary-blue text-[15px]">
                Allow others to share
              </span>
              <ToggleSwitch
                checked={allowShare}
                onChange={handleAllowShareChange}
                ariaLabel="Allow others to share"
              />
            </div>
            <div className="bg-white border border-black/[0.06] rounded-[16px] shadow-[0_0_8.9px_rgba(0,0,0,0.15)] p-[16px] flex items-start gap-[12px]">
              <LockIcon />
              <div>
                <p className="font-montserrat font-semibold text-primary-blue text-[14px]">
                  Secure and Private
                </p>
                <p className="mt-[4px] font-montserrat text-primary-blue text-[13px] leading-[18px]">
                  Only you can add people to this thread
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile sticky bottom action bar. Step 1 shows Next; step 2 shows
          Create Story. The floating BlockPicker is only visible in step 1 —
          rendered below with a step-aware `visible` prop. */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-[16px] pb-[16px] pt-[12px] bg-[#FFEFDC]">
        <button
          type="button"
          onClick={() => {
            if (isEdit) {
              void handleSaveEdit();
              return;
            }
            // Reply flow skips the cover step — jump straight to publish.
            if (isReplyFlow) {
              void handlePublish();
              return;
            }
            if (mobileStep === "content") setMobileStep("cover");
            else void handlePublish();
          }}
          disabled={submitting}
          className="cursor-pointer w-full h-[52px] rounded-full bg-primary-orange text-white font-montserrat font-semibold text-[15px] hover:brightness-95 transition-[filter] disabled:opacity-60"
        >
          {isEdit
            ? submitting
              ? "Saving…"
              : "Save"
            : isReplyFlow
              ? submitting
                ? "Finishing…"
                : "Finish"
              : mobileStep === "content"
                ? "Next"
                : submitting
                  ? "Creating…"
                  : "Create Story"}
        </button>
      </div>

      {!isPureEmptyState && (
        <BlockPicker
          onAddText={handleAddTextBlock}
          onAddImage={() => setUploadModal("image")}
          onAddVideo={() => setUploadModal("video")}
          onAddAudio={recording ? stopRecording : startRecording}
          recording={recording !== null}
          mobileStep={mobileStep}
        />
      )}

      <UploadMediaModal
        open={uploadModal !== null}
        kind={uploadModal ?? "image"}
        onClose={() => setUploadModal(null)}
        onFile={(file) => addMediaBlock(uploadModal === "video" ? "video" : "image", file)}
      />

      <PreviewOverlay
        open={previewData !== null}
        data={previewData}
        currentUser={user}
        onClose={() => setPreviewData(null)}
      />
      <ChooseCoverModal
        open={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        onPick={handleCoverPicked}
        selectedUrl={cover.imageUrl}
      />
      <TagPeopleSheet
        open={showTagPeople}
        initialSelected={taggedPeople}
        onClose={() => setShowTagPeople(false)}
        onConfirm={(next) => {
          setTaggedPeople(next);
          setShowTagPeople(false);
        }}
      />
    </div>
  );
}

// 2×2 body-content picker shown in place of the block editor + bottom pill
// row when the composer body is empty. Matches Figma node 15254:49310 —
// Voice / Photo / Video / Text pills, centered in the block area.
function EmptyStateGrid({
  onVoice,
  onPhoto,
  onVideo,
  onText,
}: {
  onVoice: () => void;
  onPhoto: () => void;
  onVideo: () => void;
  onText: () => void;
}) {
  return (
    <div className="flex-1 min-h-[240px] flex items-center justify-center">
      <div className="w-full max-w-[416px] lg:max-w-[372px] grid grid-cols-2 gap-[15px] lg:gap-[12px]">
        <EmptyStateTile
          onClick={onVoice}
          ariaLabel="Add voice"
          icon={<MicIcon width={32} height={32} />}
          label="Voice"
        />
        <EmptyStateTile
          onClick={onPhoto}
          ariaLabel="Add photo"
          icon={<ImageIcon width={32} height={32} />}
          label="Photo"
        />
        <EmptyStateTile
          onClick={onVideo}
          ariaLabel="Add video"
          icon={<CameraIcon width={36} height={36} />}
          label="Video"
        />
        <EmptyStateTile
          onClick={onText}
          ariaLabel="Add text"
          icon={
            <span className="font-montserrat font-medium text-primary-blue text-[28px] leading-none">
              Aa
            </span>
          }
          label="Text"
        />
      </div>
    </div>
  );
}

function EmptyStateTile({
  onClick,
  ariaLabel,
  icon,
  label,
}: {
  onClick: () => void;
  ariaLabel: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="cursor-pointer flex flex-col items-center justify-center gap-[6px] lg:gap-[4px] min-h-[97px] lg:min-h-[86px] rounded-[48px] bg-white lg:bg-[#ededed] text-primary-blue hover:brightness-[0.97] active:opacity-85 transition-[filter,opacity]"
    >
      <span className="flex items-center justify-center h-[36px] lg:h-[28px] lg:scale-[0.82] origin-center">
        {icon}
      </span>
      <span className="font-montserrat font-medium text-[16px] leading-[20px]">
        {label}
      </span>
    </button>
  );
}

// Bottom-of-composer block-type picker matching the Figma spec — active
// pill is dark blue (currently the text block since Phase 1 is text-only);
// audio/image/video pills are visible but non-functional until Phase 2
// wires up the block content model.
// Floating block-type picker per Figma spec. Positioned absolute at the
// composer's bottom center — a single white pill with 4 icon slots and a
// smaller "Add Text" tag floating above the active slot. Phase 1 keeps only
// Text active; audio/image/video pills toast "Coming soon" until the block
// content model lands in Phase 2.
function BlockPicker({
  onAddText,
  onAddImage,
  onAddVideo,
  onAddAudio,
  recording,
  mobileStep,
}: {
  onAddText: () => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onAddAudio: () => void;
  recording: boolean;
  /** On mobile the picker is hidden during the cover step. Desktop ignores. */
  mobileStep: "content" | "cover";
}) {
  // Below lg, hide the picker when the user is on the cover step (no block
  // editing there). Bottom offset is bumped to sit above the sticky Next bar.
  const hiddenMobile = mobileStep === "cover";
  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[84px] lg:bottom-[20px] flex justify-center z-40 ${
        hiddenMobile ? "hidden lg:flex" : ""
      }`}
    >
      <div className="pointer-events-auto flex items-center gap-[8px] rounded-full p-[6px] lg:bg-white lg:shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
        <BlockPillWithLabel label="Add Text" active onClick={onAddText} ariaLabel="Text block">
          <span className="font-montserrat font-semibold text-[18px] leading-none">
            Aa
          </span>
        </BlockPillWithLabel>
        <BlockPillWithLabel
          label={recording ? "Recording…" : "Add Audio"}
          active={recording}
          onClick={onAddAudio}
          ariaLabel="Audio block"
        >
          <MicIcon width={26} height={26} />
        </BlockPillWithLabel>
        <BlockPillWithLabel label="Add Image" onClick={onAddImage} ariaLabel="Image block">
          <ImageIcon width={24} height={24} />
        </BlockPillWithLabel>
        <BlockPillWithLabel label="Add Video" onClick={onAddVideo} ariaLabel="Video block">
          <CameraIcon width={28} height={28} />
        </BlockPillWithLabel>
      </div>
    </div>
  );
}

function BlockPillWithLabel({
  label,
  active,
  onClick,
  ariaLabel,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-[32px] font-montserrat font-medium text-primary-blue text-[13px] bg-white rounded-full px-[14px] py-[4px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {label}
      </span>
      <BlockPill active={active} onClick={onClick} ariaLabel={ariaLabel}>
        {children}
      </BlockPill>
    </div>
  );
}

function BlockPill({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`cursor-pointer h-[48px] px-[30px] rounded-full flex items-center justify-center transition-colors ${
        active
          ? "bg-primary-blue text-white"
          : "bg-white lg:bg-[#ededed] text-primary-blue hover:brightness-95 lg:hover:bg-[#e3e3e3] shadow-[0_2px_6px_rgba(0,0,0,0.08)] lg:shadow-none"
      }`}
    >
      {children}
    </button>
  );
}

// Small header row shown at the top of the composer when the user is
// answering a specific prompt (Inspiration → Answer yourself). Bulb icon +
// the prompt text — no card chrome, matches Figma spec.
function PromptStrip({ prompt }: { prompt: UserCard }) {
  const text = prompt.content || prompt.title || "";
  if (!text) return null;
  return (
    <div className="flex items-start gap-[10px] text-primary-blue">
      <span className="mt-[2px] shrink-0" aria-hidden>
        <BulbIcon />
      </span>
      <p className="font-montserrat font-semibold text-primary-blue text-[16px] leading-[22px]">
        {text}
      </p>
    </div>
  );
}

function BulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M6.5 13h5M7.25 15h3.5M9 2.25A5 5 0 0 0 5.75 10.7c.55.45.9 1.1.9 1.8H11.35c0-.7.35-1.35.9-1.8A5 5 0 0 0 9 2.25Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TitleInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative block">
      <span className="absolute left-[18px] top-1/2 -translate-y-1/2 text-primary-blue/60 pointer-events-none">
        <PencilIcon width={18} height={18} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Title your story"
        className="w-full h-[48px] bg-white lg:bg-[#ededed] rounded-full pl-[46px] pr-[16px] font-montserrat font-medium text-primary-blue text-[16px] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/15"
      />
    </label>
  );
}

// Ordered block editor built on dnd-kit. Only the drag handle on the left
// initiates a drag (250ms activation on touch, 6px on mouse) so tapping a
// block still routes to edit/focus. The active block gets a subtle lift +
// shadow via useSortable's transform.
type RecordingState = {
  blockId: string;
  seconds: number;
  levels: number[];
  paused: boolean;
} | null;

function BlocksEditor({
  blocks,
  editingBlockId,
  pendingFocusId,
  recording,
  onUpdate,
  onRemove,
  onReorder,
  onFocusBlock,
  onFocusHandled,
  onStopRecording,
  onTogglePauseRecording,
  onCancelRecording,
}: {
  blocks: EditorBlock[];
  editingBlockId: string | null;
  pendingFocusId: string | null;
  recording: RecordingState;
  onUpdate: (id: string, patch: Partial<EditorBlock>) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onFocusBlock: (id: string | null) => void;
  onFocusHandled: () => void;
  onStopRecording: () => void;
  onTogglePauseRecording: () => void;
  onCancelRecording: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  const singleton = blocks.length === 1 && blocks[0]?.type === "text";

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-[10px]">
          {blocks.map((block, idx) => (
            <SortableBlockRow
              key={block.id}
              block={block}
              index={idx}
              draggable={!singleton}
              isOnly={singleton}
              isEditing={editingBlockId === block.id}
              autoFocus={pendingFocusId === block.id}
              recording={
                recording && recording.blockId === block.id ? recording : null
              }
              onUpdate={onUpdate}
              onRemove={onRemove}
              onFocusBlock={onFocusBlock}
              onFocusHandled={onFocusHandled}
              onStopRecording={onStopRecording}
              onTogglePauseRecording={onTogglePauseRecording}
              onCancelRecording={onCancelRecording}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableBlockRow({
  block,
  index,
  draggable,
  isOnly,
  isEditing,
  autoFocus,
  recording,
  onUpdate,
  onRemove,
  onFocusBlock,
  onFocusHandled,
  onStopRecording,
  onTogglePauseRecording,
  onCancelRecording,
}: {
  block: EditorBlock;
  index: number;
  draggable: boolean;
  isOnly: boolean;
  isEditing: boolean;
  autoFocus: boolean;
  recording: RecordingState;
  onUpdate: (id: string, patch: Partial<EditorBlock>) => void;
  onRemove: (id: string) => void;
  onFocusBlock: (id: string | null) => void;
  onFocusHandled: () => void;
  onStopRecording: () => void;
  onTogglePauseRecording: () => void;
  onCancelRecording: () => void;
}) {
  const isRecordingBlock =
    block.type === "audio" && block.recording === true && !!recording;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !draggable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging
      ? "0 12px 24px rgba(0,0,0,0.15)"
      : undefined,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-start gap-[10px] rounded-[16px]"
    >
      {draggable && (
        <div className="shrink-0 mt-[14px] flex flex-col items-center gap-[6px]">
          <button
            type="button"
            aria-label="Drag to reorder"
            title="Drag to reorder"
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing w-[20px] h-[20px] rounded-[6px] text-primary-blue/45 hover:text-primary-blue hover:bg-black/[0.04] flex items-center justify-center transition-colors touch-none"
          >
            <DragHandleIcon />
          </button>
          {isRecordingBlock && (
            <button
              type="button"
              onClick={onCancelRecording}
              aria-label="Discard recording"
              className="cursor-pointer w-[20px] h-[20px] rounded-[6px] text-primary-orange hover:bg-primary-orange/10 flex items-center justify-center transition-colors"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0 relative">
        {block.type === "text" ? (
          <TextBlockView
            value={block.text}
            onChange={(v) => onUpdate(block.id, { text: v })}
            placeholder={index === 0 ? "Text" : "Tell your story"}
            isOnly={isOnly}
            isEditing={isEditing}
            autoFocus={autoFocus}
            onFocus={() => onFocusBlock(block.id)}
            onBlur={() => onFocusBlock(null)}
            onFocusHandled={onFocusHandled}
          />
        ) : isRecordingBlock && recording ? (
          <InlineRecorderView
            session={recording}
            onStop={onStopRecording}
          />
        ) : block.type === "audio" && block.preview ? (
          <AudioPlayerRow
            src={block.preview}
            waveform={block.waveform ?? []}
            duration={block.duration}
            onRemove={() => onRemove(block.id)}
          />
        ) : (
          <MediaBlockView block={block} onRemove={() => onRemove(block.id)} />
        )}
      </div>
    </div>
  );
}

function TextBlockView({
  value,
  onChange,
  placeholder,
  isOnly,
  autoFocus,
  onFocus,
  onBlur,
  onFocusHandled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  isOnly: boolean;
  isEditing: boolean;
  autoFocus: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onFocusHandled: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  // Aa pill sets pendingFocusId; when it matches this block, snap focus
  // here on mount / re-render.
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // Move caret to end so the user can just keep typing.
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
      onFocusHandled();
    }
  }, [autoFocus, onFocusHandled]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full resize-none bg-white lg:bg-[#ededed] rounded-[20px] p-[16px] font-montserrat font-medium text-primary-blue text-[16px] leading-[22px] placeholder:text-[#848484] focus:outline-none focus:ring-2 focus:ring-primary-blue/15 ${
        isOnly ? "min-h-[320px] md:min-h-[386px]" : "min-h-[80px]"
      }`}
    />
  );
}

function MediaBlockView({
  block,
  onRemove,
}: {
  block: Extract<EditorBlock, { type: "image" | "video" | "audio" }>;
  onRemove: () => void;
}) {
  // Null preview means we're hydrating from IDB. Show a lightweight skeleton
  // in-place so the layout doesn't shift when the blob arrives ~ms later.
  if (!block.preview) {
    return (
      <div className="relative w-full aspect-[16/9] rounded-[20px] overflow-hidden bg-[#ededed] animate-pulse" />
    );
  }
  return (
    <div className="relative w-full rounded-[20px] overflow-hidden bg-[#ededed]">
      {block.type === "image" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.preview}
          alt=""
          className="block w-full max-h-[420px] object-contain bg-[#ededed]"
        />
      )}
      {block.type === "video" && (
        <video
          src={block.preview}
          controls
          className="block w-full max-h-[420px] bg-black"
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove block"
        className="cursor-pointer absolute top-[10px] right-[10px] w-[28px] h-[28px] rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
      >
        <CloseIcon width={12} height={12} />
      </button>
    </div>
  );
}

// Inline audio recorder — replaces the finalized <audio> preview while the
// mic is live. Layout matches Figma: red pulse + timer left, orange bar
// waveform, pause/resume button right. Stop is exposed via the composer's
// block-picker mic pill (which turns active while recording) so the row
// stays compact.
function InlineRecorderView({
  session,
  onStop,
}: {
  session: {
    seconds: number;
    levels: number[];
    paused: boolean;
  };
  onStop: () => void;
}) {
  const mm = String(Math.floor(session.seconds / 60)).padStart(2, "0");
  const ss = String(session.seconds % 60).padStart(2, "0");
  return (
    <div className="w-full bg-white lg:bg-[#ededed] rounded-full px-[16px] py-[10px] flex items-center gap-[12px]">
      <span
        className={`w-[10px] h-[10px] rounded-full shrink-0 ${
          session.paused ? "bg-primary-blue/40" : "bg-primary-orange animate-pulse"
        }`}
      />
      <span className="font-montserrat font-semibold text-primary-blue text-[15px] tabular-nums shrink-0">
        {mm}:{ss}
      </span>
      <RecorderBars levels={session.levels} paused={session.paused} />
      <button
        type="button"
        onClick={onStop}
        aria-label="Stop recording"
        className="cursor-pointer w-[36px] h-[36px] rounded-full bg-primary-blue text-white flex items-center justify-center hover:brightness-110 transition-[filter]"
      >
        <span className="block w-[12px] h-[12px] rounded-[2px] bg-white" />
      </button>
    </div>
  );
}

// Finalized audio player row per Figma spec: rounded pill, small play/pause
// button on the left, bar-waveform in the middle (progress fills orange to
// blue as playback advances), mm:ss to the right, X to remove.
function AudioPlayerRow({
  src,
  waveform,
  duration,
  onRemove,
}: {
  src: string;
  waveform: number[];
  duration?: number;
  onRemove: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [len, setLen] = useState(duration ?? 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setT(el.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setT(0);
    };
    const onMeta = () => {
      if (!Number.isNaN(el.duration) && Number.isFinite(el.duration)) {
        setLen(el.duration);
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    el.addEventListener("loadedmetadata", onMeta);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  }

  // Playback progress ∈ [0,1]; used to two-tone the bar waveform.
  const progress = len > 0 ? Math.min(1, t / len) : 0;

  const remaining = Math.max(0, Math.floor((len || 0) - t));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  // Resample the captured levels down to ~64 bars and normalize to the
  // clip's own peak so quiet recordings don't render as a flat line. If
  // there's no captured waveform (uploaded audio file), fall back to a
  // decorative pattern so the row still reads as audio.
  const bars = useMemo(() => {
    if (waveform.length === 0) {
      return Array.from({ length: 40 }, (_, i) =>
        0.35 + 0.45 * Math.abs(Math.sin(i * 0.6))
      );
    }
    const BAR_COUNT = 48;
    const step = waveform.length / BAR_COUNT;
    const buckets: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      const from = Math.floor(i * step);
      const to = Math.max(from + 1, Math.floor((i + 1) * step));
      let peak = 0;
      for (let j = from; j < Math.min(to, waveform.length); j++) {
        if (waveform[j] > peak) peak = waveform[j];
      }
      buckets.push(peak);
    }
    const max = buckets.reduce((m, v) => (v > m ? v : m), 0);
    if (max <= 0.0001) return buckets.map(() => 0.25);
    return buckets.map((v) => Math.min(1, v / max));
  }, [waveform]);

  return (
    <div className="w-full bg-white lg:bg-[#ededed] rounded-full pl-[10px] pr-[14px] py-[8px] flex items-center gap-[10px]">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="cursor-pointer w-[36px] h-[36px] rounded-full bg-[#ededed] lg:bg-white text-primary-orange flex items-center justify-center hover:bg-[#e3e3e3] lg:hover:brightness-95 lg:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-colors"
      >
        {playing ? (
          <PauseIcon width={14} height={14} />
        ) : (
          <PlayIcon width={14} height={14} />
        )}
      </button>
      <div className="flex-1 min-w-0 h-[28px] flex items-center gap-[3px] overflow-hidden">
        {bars.map((lvl, i) => {
          const pos = bars.length > 1 ? i / (bars.length - 1) : 0;
          const played = pos <= progress;
          return (
            <span
              key={i}
              className={`shrink-0 w-[3px] rounded-full ${
                played ? "bg-primary-blue/60" : "bg-primary-orange"
              }`}
              style={{ height: `${Math.max(4, lvl * 28)}px` }}
            />
          );
        })}
      </div>
      <span className="shrink-0 font-montserrat font-semibold text-primary-blue text-[13px] tabular-nums">
        {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove audio"
        className="cursor-pointer shrink-0 w-[22px] h-[22px] rounded-full text-primary-blue/50 hover:bg-black/[0.06] flex items-center justify-center transition-colors"
      >
        <CloseIcon width={12} height={12} />
      </button>
    </div>
  );
}

// Live recorder bars. Shows a fixed 40-slot window normalized to the
// window's peak so quiet voice still produces varied heights (raw RMS for
// speech is around 0.02 — without normalization every bar clamps to the
// min height and the row looks flat). shrink-0 on each bar keeps them from
// getting squished when the parent flex grows.
function RecorderBars({ levels, paused }: { levels: number[]; paused: boolean }) {
  const BAR_COUNT = 40;
  const window = levels.slice(-BAR_COUNT);
  const max = window.reduce((m, v) => (v > m ? v : m), 0);
  return (
    <div className="flex-1 min-w-0 h-[28px] flex items-center justify-end gap-[3px] overflow-hidden">
      {window.map((lvl, i) => {
        const normalized = max > 0.0001 ? Math.min(1, lvl / max) : 0;
        return (
          <span
            key={i}
            className={`shrink-0 w-[3px] rounded-full ${
              paused ? "bg-primary-blue/40" : "bg-primary-orange"
            }`}
            style={{ height: `${Math.max(3, normalized * 28)}px` }}
          />
        );
      })}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 4.5h8M5.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M4 4.5l.5 6a1.5 1.5 0 001.5 1.4h2A1.5 1.5 0 009.5 10.5l.5-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="3" r="1.4" fill="currentColor" />
      <circle cx="10" cy="3" r="1.4" fill="currentColor" />
      <circle cx="4" cy="7" r="1.4" fill="currentColor" />
      <circle cx="10" cy="7" r="1.4" fill="currentColor" />
      <circle cx="4" cy="11" r="1.4" fill="currentColor" />
      <circle cx="10" cy="11" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Help tooltip popover anchored to the header's ? button. Two positioning
// modes so the same content works on both breakpoints:
//   • desktop → floating card, right-aligned under the button, ~360px wide
//   • mobile  → wider card that spans most of the viewport, centered under
//     the ? button (aligned right to hug the button column)
// The parent wraps the ? button in a `relative` container so the popover's
// absolute positioning anchors correctly.
function HelpTooltip({
  variant,
  onClose,
}: {
  variant: "desktop" | "mobile";
  onClose: () => void;
}) {
  // Close on outside click / Escape. Ref sits on the popover; clicks that
  // originate outside both the popover and the anchor button close it. The
  // anchor button toggles via its own onClick, so we exclude it here by
  // checking the closest ancestor's `data-help-anchor` attr.
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!ref.current || !target) return;
      if (ref.current.contains(target)) return;
      // Clicking the anchor button toggles; let its own handler run.
      if (target.closest("[aria-label='Help']")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const isDesktop = variant === "desktop";
  return (
    <div
      ref={ref}
      className={
        isDesktop
          ? "absolute top-[calc(100%+12px)] right-0 z-50 w-[380px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.18)] p-[20px]"
          : "absolute top-[calc(100%+12px)] right-[-40px] z-50 w-[calc(100vw-32px)] max-w-[440px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.18)] p-[20px]"
      }
    >
      {/* Triangle pointing up to the ? button */}
      <span
        className={
          isDesktop
            ? "absolute -top-[8px] right-[8px] w-[16px] h-[16px] bg-white rotate-45 rounded-[2px]"
            : "absolute -top-[8px] right-[48px] w-[16px] h-[16px] bg-white rotate-45 rounded-[2px]"
        }
        aria-hidden
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="cursor-pointer absolute top-[12px] right-[12px] w-[24px] h-[24px] rounded-full text-primary-blue/60 hover:bg-black/[0.06] flex items-center justify-center transition-colors"
      >
        <CloseIcon width={12} height={12} />
      </button>

      <div className="pt-[4px]">
        <HelpRow
          icon={
            <span className="font-montserrat font-semibold text-primary-blue text-[20px] leading-none">
              Aa
            </span>
          }
          label="Write (or voice to text)"
        />
        <div className="h-px bg-black/[0.06]" />
        <HelpRow
          icon={<MicIcon width={22} height={22} />}
          label="Record Voice Messages"
        />
        <div className="h-px bg-black/[0.06]" />
        <HelpRow
          icon={<CameraIcon width={22} height={22} />}
          label="Film or photograph a moment"
        />
        <div className="h-px bg-black/[0.06]" />
        <HelpRow
          icon={<ImageIcon width={22} height={22} />}
          label="Add images or videos from your camera roll"
        />

        <p className="mt-[16px] font-montserrat text-primary-blue text-[14px] leading-[20px]">
          <span className="font-bold">Tip:</span> Mix and match media types to
          create unique stories
        </p>

        <div className="mt-[14px] bg-[#f2f2f2] rounded-[16px] p-[14px] flex flex-col gap-[10px]">
          <p className="font-montserrat text-primary-blue text-[12px] leading-[17px]">
            The trip itself was mostly a disaster. It rained for three days,
            the tent leaked, your sister got a tick, and we ate cold beans out
            of the can on the second night because the camp stove wouldn&apos;t
            light.
          </p>
          <div className="grid grid-cols-2 gap-[8px]">
            <div className="relative aspect-[4/3] rounded-[10px] overflow-hidden">
              <Image
                src={TooltipImg1}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
              />
              <span
                className="absolute top-[6px] right-[6px] w-[18px] h-[18px] rounded-full bg-white text-primary-blue flex items-center justify-center"
                aria-hidden
              >
                <CloseIcon width={8} height={8} />
              </span>
            </div>
            <div className="relative aspect-[4/3] rounded-[10px] overflow-hidden">
              <Image
                src={TooltipImg2}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
              />
              <span
                className="absolute top-[6px] right-[6px] w-[18px] h-[18px] rounded-full bg-white text-primary-blue flex items-center justify-center"
                aria-hidden
              >
                <CloseIcon width={8} height={8} />
              </span>
            </div>
          </div>
          <p className="font-montserrat text-primary-blue text-[12px] leading-[17px]">
            But on the last night the sky cleared and your dad took you both
            out on the dock to look at the stars.
          </p>
          <div className="bg-white rounded-full pl-[8px] pr-[12px] py-[6px] flex items-center gap-[8px]">
            <span className="w-[28px] h-[28px] rounded-full bg-[#ededed] text-primary-blue flex items-center justify-center shrink-0">
              <PlayIcon width={10} height={10} />
            </span>
            <MiniWaveform />
            <span className="font-montserrat font-semibold text-primary-blue text-[11px] tabular-nums shrink-0">
              0:05
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-[14px] py-[10px] text-primary-blue">
      <span className="shrink-0 w-[26px] flex items-center justify-center">
        {icon}
      </span>
      <span className="font-montserrat font-medium text-[14px] leading-[18px]">
        {label}
      </span>
    </div>
  );
}

// Decorative bar-waveform for the tooltip's example audio pill. Static
// pattern — no audio driving it — so we just render a fixed sequence of
// varied bar heights that visually reads as audio.
function MiniWaveform() {
  const bars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) =>
        0.35 + 0.5 * Math.abs(Math.sin(i * 0.9 + i * 0.15))
      ),
    []
  );
  return (
    <div className="flex-1 min-w-0 h-[18px] flex items-center gap-[2px] overflow-hidden">
      {bars.map((lvl, i) => (
        <span
          key={i}
          className="shrink-0 w-[2px] rounded-full bg-primary-blue/70"
          style={{ height: `${Math.max(3, lvl * 18)}px` }}
        />
      ))}
    </div>
  );
}

// Mobile-only horizontally scrolling meta chip row. Reuses the same picker
// components as the desktop rail (so opening a chip pops the same modal) —
// each is wrapped in a shrink-0 fixed-width slot so ChipShell's `w-full`
// resolves to a compact pill instead of stretching to the row width.
function MobileMetaChipRow({
  location,
  onLocation,
  dateOfStory,
  onDate,
  music,
  onMusic,
  taggedPeople,
  onOpenTagPeople,
}: {
  location: LocationValue | null;
  onLocation: (v: LocationValue | null) => void;
  dateOfStory: string | null;
  onDate: (v: string | null) => void;
  music: MusicValue | null;
  onMusic: (v: MusicValue | null) => void;
  taggedPeople: FriendUser[];
  onOpenTagPeople: () => void;
}) {
  const peopleLabel =
    taggedPeople.length === 0
      ? "Tag People"
      : taggedPeople.length === 1
      ? tagPeopleDisplayName(taggedPeople[0])
      : `${tagPeopleDisplayName(taggedPeople[0])} + ${taggedPeople.length - 1}`;
  const peopleActive = taggedPeople.length > 0;
  return (
    <div className="-mx-[16px] px-[16px] py-[6px] min-h-[48px] overflow-x-auto overflow-y-visible scrollbar-hide shrink-0">
      <div className="flex gap-[10px] w-max">
        <LocationChip value={location} onChange={onLocation} variant="compact" />
        <DateChip value={dateOfStory} onChange={onDate} variant="compact" />
        <MusicChip value={music} onChange={onMusic} variant="compact" />
        <button
          type="button"
          onClick={onOpenTagPeople}
          className="cursor-pointer shrink-0 rounded-full bg-white px-[16px] h-[36px] inline-flex items-center gap-[8px] font-montserrat font-medium text-[14px] text-primary-blue shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:brightness-95 transition-[filter]"
        >
          <span className="whitespace-nowrap">{peopleLabel}</span>
          <span className="shrink-0 text-primary-blue">
            <PersonIcon width={16} height={16} />
          </span>
          {peopleActive && (
            <span className="shrink-0 text-primary-blue/50 text-[11px]">
              ({taggedPeople.length})
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// Composer's tagged-people pill. Empty state mirrors the disabled MetaChip
// placeholder (grey text + person icon). With selections, we render an
// avatar stack + count + first-name label so the row communicates who's on.
function TagPeopleChip({
  selected,
  onOpen,
}: {
  selected: FriendUser[];
  onOpen: () => void;
}) {
  const empty = selected.length === 0;
  const label = empty
    ? "Tag People"
    : selected.length === 1
    ? tagPeopleDisplayName(selected[0])
    : `${tagPeopleDisplayName(selected[0])} + ${selected.length - 1} more`;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`cursor-pointer w-full rounded-full bg-[#ededed] px-[26px] py-[14px] flex items-center gap-[12px] font-montserrat font-medium text-[15px] ${
        empty ? "text-[#848484]" : "text-primary-blue"
      } hover:bg-[#e3e3e3] transition-colors`}
    >
      {empty ? (
        <span className="shrink-0 text-[#848484]">
          <PersonIcon width={16} height={16} />
        </span>
      ) : (
        <AvatarStack users={selected.slice(0, 3)} />
      )}
      <span className="min-w-0 truncate text-left">{label}</span>
    </button>
  );
}

function AvatarStack({ users }: { users: FriendUser[] }) {
  return (
    <span className="shrink-0 flex -space-x-[8px]">
      {users.map((u, i) => {
        const initial = tagPeopleDisplayName(u).charAt(0).toUpperCase() || "?";
        return (
          <span
            key={u._id}
            className="w-[24px] h-[24px] rounded-full bg-primary-blue/[0.08] text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[10px] ring-2 ring-[#ededed] overflow-hidden"
            style={{ zIndex: users.length - i }}
          >
            {u.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={u.profilePicture}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              initial
            )}
          </span>
        );
      })}
    </span>
  );
}

function MetaChip({
  icon,
  label,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  // When a picker child is provided, delegate rendering to it — the picker
  // owns its own active state (dark pill when set) via its ChipShell. This
  // placeholder is only rendered when `children` is absent, i.e. features
  // deferred to phase 2 (e.g. Add People).
  if (children) return <>{children}</>;
  return (
    <div
      aria-disabled={disabled}
      className={`w-full rounded-full bg-[#ededed] px-[26px] py-[14px] flex items-center gap-[12px] font-montserrat font-medium text-[15px] text-[#848484] ${
        disabled ? "cursor-not-allowed" : ""
      }`}
    >
      <span className="shrink-0 text-[#848484]">{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`cursor-pointer relative w-[52px] h-[30px] rounded-full transition-colors ${
        checked ? "bg-primary-orange" : "bg-[#d9d9d9]"
      }`}
    >
      <span
        className={`absolute top-[3px] w-[24px] h-[24px] rounded-full bg-white shadow transition-[left] ${
          checked ? "left-[25px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className="shrink-0 text-primary-blue mt-[1px]"
    >
      <rect
        x="3.5"
        y="7.5"
        width="11"
        height="8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M6 7.5V5.5a3 3 0 016 0v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}

// Fire-and-forget draft save. Not awaited from the unmount effect — nav is
// already happening. Failures are silent because there's no UI left to
// display them on.
async function saveDraftSilently({
  title,
  text,
  promptIdRef,
  storyIdRef,
}: {
  title: string;
  text: string;
  promptIdRef: React.MutableRefObject<string | null>;
  storyIdRef: React.MutableRefObject<string | null>;
}) {
  try {
    if (!title.trim() && !text.trim()) return;
    let promptId = promptIdRef.current;
    if (!promptId) {
      const card = await createUserCard({ content: "", type: "WHITE" });
      promptId = card._id;
    }
    let storyId = storyIdRef.current;
    if (!storyId) {
      const story = await createStory({
        title: title.trim() || "",
        content: "",
        status: "draft",
        promptId,
      });
      storyId = story._id;
    }
    const content = serializeBlocksToContent([{ type: "text", text }]);
    await updateStory(storyId, {
      title: title.trim() || undefined,
      content,
      status: "draft",
    });
  } catch {
    /* best-effort */
  }
}

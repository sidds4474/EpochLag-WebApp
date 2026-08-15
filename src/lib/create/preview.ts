// Builds a synthetic ThreadResponse from live composer state so the Eye
// button can render the draft through the same ThreadViewer that shows
// published stories — with zero BE side effects. Media URLs stay as blob
// URLs (or existing CDN URLs for edit mode); browsers accept both as
// <img>/<video>/<audio> src, so the viewer works identically.

import type {
  Story,
  ThreadResponse,
  UserCard,
} from "../../types/home";
import type { User } from "../../types/user";
import { serializeBlocksToContent, type StoryBlock } from "./content";
import type { LocationValue, MusicValue } from "../../app/(app)/(dashboard)/new-story/pickers";
import type { StoryMedia } from "../../app/(app)/(dashboard)/new-story/shared";

export type PreviewInput = {
  currentUser: User;
  title: string;
  text: string;
  media: StoryMedia[];
  /** Phase-2 override: when set, `text` and `media` are ignored and the
   * synthetic thread's content is built directly from this ordered list.
   * Preserves inline block ordering (text → image → text → audio, etc). */
  blocks?: StoryBlock[];
  dateOfStory: string | null;
  location: LocationValue | null;
  music: MusicValue | null;
  /** Blob URL (fresh Tell mode cover) or CDN URL (edit / reply mode). */
  coverPreview?: string | null;
  /** The real prompt when replying or editing an Answer-a-Prompt story.
   * For fresh Tell mode this is null — we synthesize a Tell-style placeholder
   * with isTitleAvailable=true so the pill stays hidden. */
  prompt?: UserCard | null;
};

const PREVIEW_STORY_ID = "preview-story";
const PREVIEW_THREAD_ID = "preview-thread";
const PREVIEW_PROMPT_ID = "preview-prompt";

export function buildPreviewThread(input: PreviewInput): ThreadResponse {
  const {
    currentUser,
    title,
    text,
    media,
    blocks,
    dateOfStory,
    location,
    music,
    coverPreview,
    prompt,
  } = input;

  // Author uses the current user — matches the mobile spec.
  const author = {
    _id: currentUser._id,
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    profilePicture: currentUser.profilePicture ?? null,
  };

  // Build media blocks — mirror the composer's publish flow but tolerate
  // in-flight uploads by falling back to the local blob preview.
  const mediaBlocks: StoryBlock[] = media
    .map((m): StoryBlock | null => {
      const url = m.uploadedUrl || m.preview;
      if (!url) return null;
      if (m.kind === "image") return { type: "image", url };
      if (m.kind === "video") return { type: "video", url };
      if (m.kind === "audio") return { type: "audio", url };
      return null;
    })
    .filter((b): b is StoryBlock => b !== null);

  const content = blocks
    ? serializeBlocksToContent(blocks)
    : serializeBlocksToContent([{ type: "text", text }, ...mediaBlocks]);

  const now = new Date();
  const createdAt = dateOfStory
    ? `${dateOfStory}T00:00:00.000Z`
    : now.toISOString();

  const story: Story = {
    _id: PREVIEW_STORY_ID,
    title: title || null,
    content,
    author,
    dateOfStory: dateOfStory ?? undefined,
    createdAt,
    updatedAt: createdAt,
    likesCount: 0,
    commentsCount: 0,
    isLikedByMe: false,
    isPrivate: true,
    viewers: [],
    location: location
      ? {
          formattedAddress: location.formattedAddress,
          city: location.city,
        }
      : null,
    music: music
      ? {
          trackName: music.trackName,
          artistName: music.artistName,
          previewUrl: music.previewUrl,
          artworkUrl: music.artworkUrl,
        }
      : null,
  };

  // Preview prompt: for Answer-a-Prompt (real prompt exists), pass through
  // with isTitleAvailable=false so the pill renders. For Tell mode, we
  // synthesize a placeholder with isTitleAvailable=true so ThreadViewer
  // skips the pill. imageUrl carries the cover for the header artwork.
  const previewPrompt = prompt
    ? {
        _id: prompt._id,
        content: prompt.content,
        title: prompt.title,
        imageUrl: prompt.imageUrl ?? coverPreview ?? null,
        isTitleAvailable: !!prompt.isTitleAvailable,
        note: prompt.note ?? null,
        author: prompt.author
          ? {
              _id: prompt.author._id,
              firstName: prompt.author.firstName,
              lastName: prompt.author.lastName,
              profilePicture: prompt.author.profilePicture ?? null,
            }
          : null,
      }
    : {
        _id: PREVIEW_PROMPT_ID,
        content: null,
        title: title || null,
        imageUrl: coverPreview ?? null,
        isTitleAvailable: true,
        note: null,
        author: {
          _id: author._id,
          firstName: author.firstName,
          lastName: author.lastName,
          profilePicture: author.profilePicture,
        },
      };

  return {
    thread: {
      _id: PREVIEW_THREAD_ID,
      prompt: previewPrompt,
      participants: [
        {
          _id: author._id,
          firstName: author.firstName,
          lastName: author.lastName,
          profilePicture: author.profilePicture,
          role: "author",
        },
      ],
      isPrivate: true,
    },
    stories: [story],
    isBookmarked: false,
  };
}

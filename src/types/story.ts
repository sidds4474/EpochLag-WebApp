export type StoryAuthor = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string | null;
};

export type StoryMedia = {
  type: "image" | "video" | "audio";
  url: string;
};

export type Story = {
  _id?: string;
  title?: string;
  content?: string;
  createdAt?: string;
  dateOfStory?: string;
  location?: string;
  music?: string;
  media?: StoryMedia[];
  // Replies (and new-ask flow) attach cover separately from media so it isn't
  // rendered inline in the body. Prompt-authored covers still arrive at
  // prompt.imageUrl.
  coverImageUrl?: string | null;
  author?: StoryAuthor;
  // Engagement counts + viewer state — populated by GET /api/public/story/:code.
  // `isLoved` reflects the viewer's like; always false when the viewer is
  // signed out (regardless of whether they've liked it elsewhere).
  totalLikes?: number;
  totalComments?: number;
  isLoved?: boolean;
};

export type StoryPrompt = {
  content?: string;
  imageUrl?: string | null;
  isTitleAvailable?: boolean;
  author?: StoryAuthor;
};

// Avatar-stack entry — intentionally stripped to display fields only.
export type PublicParticipant = {
  _id: string;
  firstName: string;
  profilePicture: string | null;
};

// `sender` is only non-null when someone other than the prompt's author shared
// the link. No _id — we can't deep-link to their profile from a public page.
export type PublicSender = {
  firstName: string;
  profilePicture: string | null;
};

export type PublicStoryData = {
  prompt?: StoryPrompt;
  stories?: Story[];
  threadId?: string;
  participants?: PublicParticipant[];
  participantsOverflow?: number;
  participantCount?: number;
  sender?: PublicSender | null;
};

// -- Public comments (GET /api/public/story/:code/stories/:storyId/comments) --

export type PublicCommentAuthor = {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
};

export type PublicCommentLiker = {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  likedAt: string;
};

export type PublicComment = {
  _id: string;
  // Spec field name is `story`, not `storyId` — kept verbatim.
  story: string;
  author: PublicCommentAuthor;
  content: string;
  totalLikes: number;
  likes: PublicCommentLiker[];
  isLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommentPagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
};

export type PublicCommentListResponse = {
  comments: PublicComment[];
  pagination: CommentPagination;
};

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; url: string }
  | { type: "video"; url: string }
  | { type: "audio"; url: string };

export type Platform = "ios" | "android" | "desktop";

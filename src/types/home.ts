export type PersonSummary = {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  epochlagID?: string;
  newStory?: boolean;
};

export type GroupSummary = {
  _id: string;
  name: string;
  groupPhotoUrl: string | null;
  memberCount: number;
  newStory: boolean;
  members: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    epochlagID?: string;
    profilePicture: string | null;
    isOwner: boolean;
    joinedAt: string;
  }>;
};

export type HomePeople = {
  users: PersonSummary[];
  groups: GroupSummary[];
};

export type UserCard = {
  _id: string;
  type: string;
  content: string | null;
  title: string | null;
  isTitleAvailable: boolean;
  imageUrl: string | null;
  isBookmarked: boolean;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
    isArchived?: boolean;
  } | null;
  birthdayDetails: unknown;
  note: string | null;
  tags: string[];
  privateCard?: boolean;
  shareWith?: PersonSummary[];
  storyThread: unknown;
  newStory?: boolean;
  promptType?: "received" | "sent" | "generated";
  cardType: "INSPO" | string;
  isSent?: boolean;
  isReceived?: boolean;
  isGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
  sharedViaGroups?: unknown[];
};

export type StoryAuthor = {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  isArchived?: boolean;
  id?: string;
};

export type StoryMedia = {
  _id?: string;
  type?: "image" | "video" | "audio" | string;
  url?: string | null;
  cover?: string | null;
  thumbnail?: string | null;
  [key: string]: unknown;
};

export type Story = {
  _id: string;
  title?: string | null;
  content?: string | null;
  author?: StoryAuthor | null;
  dateOfStory?: string | null;
  createdAt?: string;
  updatedAt?: string;
  cover?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  media?: StoryMedia[];
  likesCount?: number;
  commentsCount?: number;
  isLikedByMe?: boolean;
  isPrivate?: boolean;
  viewers?: PersonSummary[];
  location?: {
    formattedAddress?: string;
    city?: string;
    country?: string;
  } | null;
  music?: {
    trackName?: string;
    artistName?: string;
    // Present when the story was authored via the composer's iTunes picker.
    // Older stories may not have these — pill falls back to a static icon
    // and disables playback when previewUrl is missing.
    previewUrl?: string;
    artworkUrl?: string;
    durationMs?: number;
  } | null;
};

export type ThreadParticipant = {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  profilePicture?: string | null;
  role?: "author" | "recipient" | string;
};

export type ThreadPromptAuthor = {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  profilePicture?: string | null;
};

export type Thread = {
  _id: string;
  prompt?: {
    _id?: string;
    content?: string | null;
    title?: string | null;
    imageUrl?: string | null;
    isTitleAvailable?: boolean;
    note?: string | null;
    author?: ThreadPromptAuthor | null;
  };
  participants?: ThreadParticipant[];
  isPrivate?: boolean;
  publicCode?: string | null;
};

export type ThreadResponse = {
  thread: Thread;
  stories: Story[];
  isBookmarked: boolean;
};

export type NotificationDockingCardType =
  | "challenge"
  | "prompt"
  | "moment"
  | "other"
  | string;

export type NotificationNavigation = {
  tab?: string;
  screen?: string;
  requestId?: string;
  dockingDetails?: {
    cardId?: string;
    cardType?: NotificationDockingCardType;
    imageUrl?: string | null;
    title?: string | null;
    [k: string]: unknown;
  };
  momentDetails?: {
    _id?: string;
    title?: string | null;
    [k: string]: unknown;
  };
  promptDetails?: {
    prompt?: {
      _id?: string;
      content?: string | null;
      title?: string | null;
      imageUrl?: string | null;
    };
  };
  threadId?: string;
  storyId?: string;
  albumId?: string;
  groupId?: string;
  [k: string]: unknown;
};

export type NotificationProfileDetails = {
  user?: Partial<PersonSummary> & { _id?: string };
  requestId?: string;
  isConnection?: boolean;
  groupName?: string;
  groupId?: string;
  albumTitle?: string;
  albumId?: string;
  threadTitle?: string;
  threadId?: string;
  momentTitle?: string;
  momentDetails?: { _id?: string; title?: string | null };
  newMemberName?: string;
  addedByName?: string;
  fullName?: string;
  subjectSnippet?: string;
  [k: string]: unknown;
};

// Discriminator lives in `type`. See spec — 20+ known types plus unknown.
// We keep the type field as `string` so BE can ship new ones without a client
// release; the row renderer skips unknowns silently.
export type Notification = {
  _id: string;
  userId?: string;
  type: string;
  createdAt?: string;
  timeStamp: string;
  seen: boolean;
  sectionTitle?: string;
  title?: string;
  content?: string;
  relatedId?: string;
  navigation?: NotificationNavigation;
  profileDetails?: NotificationProfileDetails;
};

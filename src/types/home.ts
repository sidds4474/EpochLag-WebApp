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

export type Notification = {
  _id: string;
  userId: string;
  type: string;
  timeStamp: string;
  seen: boolean;
  sectionTitle?: string;
  navigation?: { tab: string; screen: string };
  profileDetails?: {
    user: PersonSummary;
    requestId?: string;
    isConnection?: boolean;
  };
};

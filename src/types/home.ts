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
  content: string;
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

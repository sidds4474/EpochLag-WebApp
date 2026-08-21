export type MomentType =
  | "Birthday"
  | "Wedding"
  | "Anniversary"
  | "Graduation"
  | "Travel"
  | "NewBaby"
  | "FirstHome"
  | "Retirement"
  | "Loss"
  | "Other"
  | string;

export type MomentFrequency = "yearly" | "monthly" | "weekly" | "daily";

export type MomentRole = "author" | "participant" | null;

export type MomentParticipantStatus = "pending" | "accepted" | "declined";

export type MomentParticipantUser = {
  _id: string;
  firstName: string;
  lastName: string;
  epochlagID?: string;
  profilePicture?: string | null;
};

export type MomentParticipant = {
  userId: MomentParticipantUser;
  status: MomentParticipantStatus;
  invitedAt: string;
  respondedAt: string | null;
};

export type Moment = {
  _id: string;
  id?: string;
  type: MomentType;
  title: string;
  date: string;

  // BE-computed — do not recompute for display
  nextOccurrence: string | null;
  lastOccurrence: string | null;
  daysUntil: number | null;
  isPast: boolean;
  hasOccurred: boolean;

  isRecurring: boolean;
  frequency: MomentFrequency | null;

  coverImageUrl: string | null;
  note: string | null;

  role: MomentRole;

  createdAt: string;
  addedToCountdownAt?: string | null;

  participants: MomentParticipant[];
};

export type MomentEventTypeOption = {
  slug: string;
  displayName: string;
  order: number;
};

export type MomentFrequencyOption = {
  slug: MomentFrequency;
  displayName: string;
};

export type MomentOptions = {
  eventTypes: MomentEventTypeOption[];
  frequencies: MomentFrequencyOption[];
  defaultFrequency: MomentFrequency;
};

export type MomentFilter = "upcoming" | "past" | "all";

export type MomentDraft = {
  type: string | null;
  title: string;
  date: string | null;
  coverBlob: Blob | null;
  coverLocalPreview: string | null;
  coverImageUrl: string | null;
  isRecurring: boolean;
  recurrenceFrequency: MomentFrequency | null;
  addToCountdown: boolean;
  taggedUserIds: string[];
  sendInviteToTagged: boolean;
  note: string | null;
};

export type PublicMomentAuthor = {
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
};

export type PublicMomentData = {
  title?: string;
  type?: MomentType;
  date?: string;
  note?: string | null;
  coverImageUrl?: string | null;
  isRecurring?: boolean;
  frequency?: MomentFrequency | null;
  nextOccurrence?: string | null;
  daysUntil?: number;
  participantCount?: number;
  author?: PublicMomentAuthor;
};

export type FriendSearchResult = {
  _id: string;
  firstName: string;
  lastName: string;
  epochlagID?: string;
  profilePicture: string | null;
};

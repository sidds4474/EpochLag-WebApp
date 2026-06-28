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
  author?: StoryAuthor;
};

export type StoryPrompt = {
  content?: string;
  imageUrl?: string | null;
  isTitleAvailable?: boolean;
  author?: StoryAuthor;
};

export type PublicStoryData = {
  prompt?: StoryPrompt;
  stories?: Story[];
  threadId?: string;
};

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; url: string }
  | { type: "video"; url: string }
  | { type: "audio"; url: string };

export type Platform = "ios" | "android" | "desktop";

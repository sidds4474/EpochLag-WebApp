import type { MomentFrequency } from "../../../../../types/moment";

export type Draft = {
  type: string | null;
  title: string;
  date: string | null;
  isRecurring: boolean;
  frequency: MomentFrequency | null;
  addToCountdown: boolean;
  coverFile: Blob | null;
  coverLocalUri: string | null;
  coverImageUrl: string | null;
  taggedUserIds: string[];
  sendInvites: boolean;
};

export const emptyDraft: Draft = {
  type: null,
  title: "",
  date: null,
  isRecurring: false,
  frequency: null,
  addToCountdown: true,
  coverFile: null,
  coverLocalUri: null,
  coverImageUrl: null,
  taggedUserIds: [],
  sendInvites: true,
};

export const EVENT_TYPES: Array<{ value: string; label: string }> = [
  { value: "Birthday", label: "Birthday" },
  { value: "Wedding", label: "Wedding" },
  { value: "Anniversary", label: "Anniversary" },
  { value: "Graduation", label: "Graduation" },
  { value: "Travel", label: "Travel" },
  { value: "NewBaby", label: "New Baby" },
  { value: "FirstHome", label: "First Home" },
  { value: "Retirement", label: "Retirement" },
  { value: "Loss", label: "Loss" },
  { value: "Other", label: "Other" },
];

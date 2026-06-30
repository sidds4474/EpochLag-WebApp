import { api } from "../api/client";
import type { ThreadResponse, UserCard } from "../../types/home";

export type InteractionType = "received" | "sent";

export type Pagination = {
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type CardsEnvelope = {
  success: boolean;
  message?: string;
  data: UserCard[];
  pagination?: Pagination;
};

export async function fetchInteractionCards(
  type: InteractionType,
  page = 1,
  limit = 20
): Promise<{
  cards: UserCard[];
  pagination: Pagination | null;
  envelope: CardsEnvelope;
}> {
  const res = await api.get<CardsEnvelope>(
    `/api/user-card?page=${page}&limit=${limit}&type=${type}`
  );
  return {
    cards: res.data ?? [],
    pagination: res.pagination ?? null,
    envelope: res,
  };
}

type ThreadEnvelope = {
  success: boolean;
  message?: string;
  data: ThreadResponse;
  pagination?: Pagination;
};

type LikeEnvelope = {
  success: boolean;
  message?: string;
  data?: { isLikedByMe?: boolean; likesCount?: number } | null;
};

export async function toggleStoryLike(storyId: string): Promise<void> {
  await api.post<LikeEnvelope>(`/api/stories/${storyId}/likes`);
}

export async function fetchThread(
  threadId: string,
  page = 1,
  limit = 20
): Promise<{ data: ThreadResponse; envelope: ThreadEnvelope }> {
  const res = await api.get<ThreadEnvelope>(
    `/api/stories/thread/${threadId}?page=${page}&limit=${limit}`
  );
  const data = res.data;
  if (data?.thread?.prompt && data.thread.prompt.isTitleAvailable === undefined) {
    data.thread.prompt.isTitleAvailable = !data.thread.prompt.content;
  }
  return { data, envelope: res };
}

import { api } from "../api/client";

type Envelope<T> = { success: boolean; message?: string; data: T };

export type CommentAuthor = {
  _id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
};

// BE quirk: like entries carry the liker's id in BOTH `_id` and `user`
// fields. Keep both so downstream code can key off either without a lookup.
export type CommentLike = {
  _id: string;
  firstName?: string;
  user?: string;
};

export type StoryComment = {
  _id: string;
  content: string;
  author: CommentAuthor;
  likes: CommentLike[];
  isLiked: boolean;
  createdAt: string;
};

type CommentsPagination = {
  totalPages: number;
  totalItems?: number;
  currentPage?: number;
};

export type CommentsPage = {
  comments: StoryComment[];
  pagination: CommentsPagination;
};

export async function fetchComments(
  storyId: string,
  page = 1,
  limit = 10
): Promise<CommentsPage> {
  const res = await api.get<Envelope<CommentsPage>>(
    `/api/stories/${storyId}/comments?page=${page}&limit=${limit}`
  );
  return res.data;
}

// BE expects application/x-www-form-urlencoded — URLSearchParams triggers
// the correct Content-Type on the shared API client.
export async function postComment(
  storyId: string,
  content: string
): Promise<StoryComment> {
  const body = new URLSearchParams({ content });
  const res = await api.post<Envelope<{ comment: StoryComment }>>(
    `/api/stories/${storyId}/comments`,
    body
  );
  return res.data.comment;
}

// BE PUT response shape is inconsistent (sometimes envelope-wrapped, sometimes
// bare, sometimes 204). Caller already knows the content it sent — no reason
// to depend on the response body. Void return.
export async function updateComment(
  storyId: string,
  commentId: string,
  content: string
): Promise<void> {
  const body = new URLSearchParams({ content });
  await api.put<unknown>(
    `/api/stories/${storyId}/comments/${commentId}`,
    body
  );
}

export async function deleteComment(
  storyId: string,
  commentId: string
): Promise<void> {
  await api.delete<Envelope<unknown>>(
    `/api/stories/${storyId}/comments/${commentId}`
  );
}

export async function toggleCommentLike(
  storyId: string,
  commentId: string
): Promise<void> {
  await api.post<Envelope<unknown>>(
    `/api/stories/${storyId}/comments/${commentId}/likes`
  );
}

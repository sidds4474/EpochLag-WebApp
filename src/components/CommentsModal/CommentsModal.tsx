"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../lib/api/client";
import {
  deleteComment,
  fetchComments,
  postComment,
  toggleCommentLike,
  updateComment,
  type StoryComment,
} from "../../lib/comments/api";
import { formatRelativeTime } from "../../lib/formatters";
import { bustUrl } from "../../lib/images";
import type { User } from "../../types/user";
import { CloseIcon, HeartIcon } from "../../app/(app)/(dashboard)/icons";
import OptionsMenu, { type OptionsMenuItem } from "../OptionsMenu/OptionsMenu";

type Props = {
  open: boolean;
  storyId: string | null;
  currentUser: User | null;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  /** Fires with the definitive comment count whenever the modal knows it —
   * on first load (from BE pagination.totalItems), and again after each
   * successful post/delete. Lets the parent render an accurate counter that
   * self-heals if the thread response's commentsCount was stale. */
  onTotalKnown?: (total: number) => void;
};

const PAGE_SIZE = 10;

export default function CommentsModal({
  open,
  storyId,
  currentUser,
  onClose,
  onCommentAdded,
  onCommentDeleted,
  onTotalKnown,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [updating, setUpdating] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  const loadingMoreRef = useRef(false);
  // Definitive count once known. null until first load succeeds.
  const knownTotalRef = useRef<number | null>(null);

  function updateKnownTotal(next: number) {
    knownTotalRef.current = next;
    onTotalKnown?.(next);
  }

  const currentUserId = currentUser?._id ?? "";

  // Load page 1 whenever the modal opens for a story. Reset local state on
  // close so the next open shows a clean slate — matches the mobile spec
  // that refetches per-open (no polling).
  useEffect(() => {
    if (!open || !storyId) return;
    let cancelled = false;
    setLoading(true);
    setComments([]);
    setPage(1);
    setHasMore(false);
    setEditingId(null);
    setEditContent("");
    (async () => {
      try {
        const { comments: fetched, pagination } = await fetchComments(
          storyId,
          1,
          PAGE_SIZE
        );
        if (cancelled) return;
        setComments(fetched);
        setHasMore((pagination.currentPage ?? 1) < pagination.totalPages);
        setPage(1);
        // Prefer BE-provided totalItems. Otherwise trust the loaded page
        // only when there's a single page (nothing hidden). Anything else
        // stays null so the parent falls back to its own bookkeeping.
        knownTotalRef.current = null;
        if (typeof pagination.totalItems === "number") {
          updateKnownTotal(pagination.totalItems);
        } else if (pagination.totalPages <= 1) {
          updateKnownTotal(fetched.length);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : "Couldn't load comments";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, storyId]);

  // Reset composer when the modal closes.
  useEffect(() => {
    if (open) return;
    setNewComment("");
    setEditingId(null);
    setEditContent("");
  }, [open]);

  const loadMore = useCallback(async () => {
    if (!storyId || !hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setFetchingMore(true);
    try {
      const nextPage = page + 1;
      const { comments: fetched, pagination } = await fetchComments(
        storyId,
        nextPage,
        PAGE_SIZE
      );
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c._id));
        return [...prev, ...fetched.filter((c) => !seen.has(c._id))];
      });
      setPage(nextPage);
      setHasMore((pagination.currentPage ?? nextPage) < pagination.totalPages);
    } catch {
      // silent — the user can scroll again to retry
    } finally {
      loadingMoreRef.current = false;
      setFetchingMore(false);
    }
  }, [storyId, hasMore, page]);

  // Infinite scroll via IntersectionObserver on a sentinel.
  useEffect(() => {
    if (!open || !hasMore) return;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { root, rootMargin: "200px 0px", threshold: 0 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [open, hasMore, loadMore]);

  async function handleSubmit() {
    if (!storyId || !newComment.trim() || sending) return;
    setSending(true);
    const content = newComment.trim();
    try {
      const created = await postComment(storyId, content);
      setComments((prev) => [created, ...prev]);
      setNewComment("");
      onCommentAdded?.();
      if (knownTotalRef.current !== null) {
        updateKnownTotal(knownTotalRef.current + 1);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to post comment";
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  async function handleLike(comment: StoryComment) {
    if (!storyId || !currentUserId) return;
    const wasLiked = comment.isLiked;
    // Optimistic — synthetic like carries the current user's id in both
    // _id and user slots so downstream "liked by" logic works pre-refetch.
    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== comment._id) return c;
        if (wasLiked) {
          return {
            ...c,
            isLiked: false,
            likes: c.likes.filter(
              (l) => l._id !== currentUserId && l.user !== currentUserId
            ),
          };
        }
        return {
          ...c,
          isLiked: true,
          likes: [
            ...c.likes,
            {
              _id: currentUserId,
              firstName: currentUser?.firstName,
              user: currentUserId,
            },
          ],
        };
      })
    );
    try {
      await toggleCommentLike(storyId, comment._id);
    } catch {
      // Match mobile — trust server; keep optimistic state and log only.
    }
  }

  async function handleUpdate(commentId: string) {
    if (!storyId || !editContent.trim() || updating) return;
    setUpdating(true);
    const content = editContent.trim();
    try {
      await updateComment(storyId, commentId, content);
      // Patch locally from the input — the BE PUT response shape isn't
      // guaranteed. What we sent is what got saved.
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, content } : c))
      );
      setEditingId(null);
      setEditContent("");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to update comment";
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!storyId) return;
    // Optimistic remove; restore on failure. Mobile behavior — no confirm.
    const previous = comments;
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    try {
      await deleteComment(storyId, commentId);
      toast.success("Comment deleted");
      onCommentDeleted?.();
      if (knownTotalRef.current !== null) {
        updateKnownTotal(Math.max(0, knownTotalRef.current - 1));
      }
    } catch (err) {
      setComments(previous);
      const message =
        err instanceof ApiError ? err.message : "Failed to delete comment";
      toast.error(message);
    }
  }

  function startEdit(comment: StoryComment) {
    setEditingId(comment._id);
    setEditContent(comment.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-[16px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] h-[80vh] max-h-[720px] bg-white rounded-[24px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pt-[10px] pb-[6px] flex justify-center">
          <div className="w-[40px] h-[4px] rounded-full bg-black/[0.15]" />
        </div>
        <div className="relative pb-[12px] border-b border-black/[0.06]">
          <h3 className="text-center font-montserrat font-bold text-primary-blue text-[17px]">
            Comments
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-[16px] top-1/2 -translate-y-1/2 cursor-pointer w-[28px] h-[28px] rounded-full text-primary-blue/60 hover:bg-black/[0.05] flex items-center justify-center transition-colors"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-[16px] py-[8px]"
        >
          {loading ? (
            <div className="flex flex-col gap-[12px] py-[8px]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[60px] rounded-[12px] bg-black/[0.04] animate-pulse"
                />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="font-montserrat text-primary-blue/50 text-[13px]">
                No comments yet — be the first.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-[16px] py-[8px]">
              {comments.map((c) => (
                <li key={c._id}>
                  <CommentRow
                    comment={c}
                    currentUserId={currentUserId}
                    currentUserFirstName={currentUser?.firstName}
                    editing={editingId === c._id}
                    editContent={editContent}
                    onEditContent={setEditContent}
                    onLike={() => handleLike(c)}
                    onStartEdit={() => startEdit(c)}
                    onCancelEdit={cancelEdit}
                    onConfirmEdit={() => handleUpdate(c._id)}
                    onDelete={() => handleDelete(c._id)}
                    updating={updating}
                  />
                </li>
              ))}
              {hasMore && (
                <li
                  ref={sentinelRef}
                  className="h-[40px] flex items-center justify-center"
                >
                  {fetchingMore && (
                    <div className="w-[20px] h-[20px] rounded-full border-[2px] border-black/[0.08] border-t-primary-blue animate-spin" />
                  )}
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Composer (hidden while editing — the edit UI lives inside the row) */}
        {editingId === null && (
          <div className="shrink-0 px-[16px] py-[12px] border-t border-black/[0.06] flex items-end gap-[10px]">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Add a comment…"
              rows={1}
              className="flex-1 min-w-0 bg-[#ededed] rounded-[18px] px-[14px] py-[10px] resize-none focus:outline-none font-montserrat text-primary-blue placeholder:text-primary-blue/40 text-[14px] leading-[20px] max-h-[100px]"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!newComment.trim() || sending || !currentUser}
              className="cursor-pointer bg-primary-orange text-primary-white font-montserrat font-semibold text-[13px] rounded-full px-[16px] py-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? "…" : "Post"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Row ============

function CommentRow(props: {
  comment: StoryComment;
  currentUserId: string;
  currentUserFirstName?: string;
  editing: boolean;
  editContent: string;
  onEditContent: (v: string) => void;
  onLike: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
  onDelete: () => void;
  updating: boolean;
}) {
  const {
    comment,
    currentUserId,
    currentUserFirstName,
    editing,
    editContent,
    onEditContent,
    onLike,
    onStartEdit,
    onCancelEdit,
    onConfirmEdit,
    onDelete,
    updating,
  } = props;

  const isMine = comment.author._id === currentUserId;
  const initial = (comment.author.firstName || "?").charAt(0).toUpperCase();

  const menuItems: OptionsMenuItem[] = [
    { label: "Edit", onClick: onStartEdit },
    { label: "Delete", onClick: onDelete, destructive: true },
  ];

  return (
    <div className="flex items-start gap-[10px]">
      <Avatar
        url={comment.author.profilePicture}
        initial={initial}
        size={32}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px]">
          <span className="font-montserrat font-semibold text-primary-blue text-[13px] truncate">
            {[comment.author.firstName, comment.author.lastName]
              .filter(Boolean)
              .join(" ")}
          </span>
          <span className="font-montserrat text-primary-blue/50 text-[11px]">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>

        {editing ? (
          <div className="mt-[6px] flex items-end gap-[8px]">
            <textarea
              value={editContent}
              onChange={(e) => onEditContent(e.target.value)}
              rows={1}
              className="flex-1 min-w-0 bg-[#ededed] rounded-[12px] px-[10px] py-[8px] resize-none focus:outline-none font-montserrat text-primary-blue text-[14px] leading-[20px] max-h-[120px]"
              autoFocus
            />
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel edit"
              disabled={updating}
              className="cursor-pointer w-[28px] h-[28px] rounded-[8px] bg-black/[0.06] text-primary-blue hover:bg-black/[0.09] flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <CloseIcon width={12} height={12} />
            </button>
            <button
              type="button"
              onClick={onConfirmEdit}
              aria-label="Save edit"
              disabled={updating || !editContent.trim()}
              className="cursor-pointer w-[28px] h-[28px] rounded-[8px] bg-primary-orange text-white hover:opacity-90 flex items-center justify-center transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        ) : (
          <p className="mt-[2px] font-montserrat text-primary-blue text-[14px] leading-[20px] whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        )}

        {!editing && comment.likes.length > 0 && (
          <p className="mt-[4px] font-montserrat text-primary-blue/60 text-[12px]">
            {formatLikedBy(comment, currentUserId, currentUserFirstName)}
          </p>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-[4px] shrink-0">
          <button
            type="button"
            onClick={onLike}
            aria-label={comment.isLiked ? "Unlike" : "Like"}
            className={`cursor-pointer w-[28px] h-[28px] rounded-full flex items-center justify-center transition-colors ${
              comment.isLiked
                ? "text-red-500 hover:bg-red-500/[0.08]"
                : "text-primary-blue/70 hover:bg-black/[0.05]"
            }`}
          >
            <HeartIcon width={16} height={16} filled={comment.isLiked} />
          </button>
          {isMine && <OwnCommentMenu items={menuItems} />}
        </div>
      )}
    </div>
  );
}

function OwnCommentMenu({ items }: { items: OptionsMenuItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Comment actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="cursor-pointer w-[28px] h-[28px] rounded-full text-primary-blue/70 hover:bg-black/[0.05] flex items-center justify-center transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      <OptionsMenu open={open} onClose={() => setOpen(false)} items={items} />
    </div>
  );
}

function Avatar({
  url,
  initial,
  size,
}: {
  url: string | null;
  initial: string;
  size: number;
}) {
  const style = { width: size, height: size };
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={bustUrl(url, undefined)}
        alt=""
        style={style}
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-primary-blue/15 text-primary-blue flex items-center justify-center font-montserrat font-semibold text-[12px] shrink-0"
    >
      {initial}
    </div>
  );
}

function formatLikedBy(
  comment: StoryComment,
  currentUserId: string,
  currentUserFirstName?: string
): string {
  const isLiked = comment.isLiked;
  const others = comment.likes.filter(
    (l) => l._id !== currentUserId && l.user !== currentUserId
  );
  const otherFirst = others[0]?.firstName;
  if (isLiked && otherFirst) return `Liked by you and ${otherFirst}`;
  if (isLiked) return "Liked by you";
  if (otherFirst) {
    // Only render if we know at least one name to avoid empty "Liked by".
    if (others.length > 1) {
      return `Liked by ${otherFirst} and ${others.length - 1} other${others.length - 1 > 1 ? "s" : ""}`;
    }
    return `Liked by ${otherFirst}`;
  }
  // No known likers — silence rather than "Liked by ".
  void currentUserFirstName;
  return "";
}

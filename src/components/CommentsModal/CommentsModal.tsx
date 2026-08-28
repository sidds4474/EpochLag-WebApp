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
import { parseContentToBlocks } from "../../lib/parseStoryContent";
import type { User } from "../../types/user";
import {
  CloseIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "../../app/(app)/(dashboard)/icons";
import OptionsMenu, { type OptionsMenuItem } from "../OptionsMenu/OptionsMenu";

type StoryAuthorLite = {
  firstName?: string | null;
  lastName?: string | null;
  profilePicture?: string | null;
};

type Props = {
  open: boolean;
  storyId: string | null;
  currentUser: User | null;
  onClose: () => void;
  onCommentAdded?: () => void;
  onCommentDeleted?: () => void;
  onTotalKnown?: (total: number) => void;
  /** Optional story recap embedded inside the modal on md+ (desktop/tablet). */
  storyTitle?: string;
  storyAuthor?: StoryAuthorLite | null;
  storyCreatedAt?: string;
  storyContent?: string;
  storyCoverUrl?: string | null;
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
  storyTitle,
  storyAuthor,
  storyCreatedAt,
  storyContent,
  storyCoverUrl,
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
  const [likesPanelFor, setLikesPanelFor] = useState<StoryComment | null>(null);

  const scrollRefDesktop = useRef<HTMLDivElement | null>(null);
  const scrollRefMobile = useRef<HTMLDivElement | null>(null);
  const sentinelRefDesktop = useRef<HTMLLIElement | null>(null);
  const sentinelRefMobile = useRef<HTMLLIElement | null>(null);
  const loadingMoreRef = useRef(false);
  const knownTotalRef = useRef<number | null>(null);

  function updateKnownTotal(next: number) {
    knownTotalRef.current = next;
    onTotalKnown?.(next);
  }

  const currentUserId = currentUser?._id ?? "";

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
        knownTotalRef.current = null;
        if (typeof pagination.totalItems === "number") {
          updateKnownTotal(pagination.totalItems);
        } else if (pagination.totalPages <= 1) {
          updateKnownTotal(fetched.length);
        }
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError ? err.message : "Couldn't load comments";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, storyId]);

  useEffect(() => {
    if (open) return;
    setNewComment("");
    setEditingId(null);
    setEditContent("");
    setLikesPanelFor(null);
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

  useEffect(() => {
    if (!open || !hasMore) return;
    const dispose: Array<() => void> = [];
    for (const [root, sentinel] of [
      [scrollRefDesktop.current, sentinelRefDesktop.current],
      [scrollRefMobile.current, sentinelRefMobile.current],
    ] as const) {
      if (!root || !sentinel) continue;
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) loadMore();
        },
        { root, rootMargin: "200px 0px", threshold: 0 }
      );
      io.observe(sentinel);
      dispose.push(() => io.disconnect());
    }
    return () => dispose.forEach((fn) => fn());
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

  const recapAvailable = !!storyTitle;
  const recapText = storyContent
    ? parseContentToBlocks(storyContent)
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n\n")
    : "";
  const authorFullName = storyAuthor
    ? [storyAuthor.firstName, storyAuthor.lastName].filter(Boolean).join(" ")
    : "";

  const commentList = (
    variant: "desktop" | "mobile"
  ) => (
    <>
      {loading ? (
        <div className="flex flex-col gap-[12px] py-[8px]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[64px] rounded-[16px] bg-black/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-[24px] flex items-center justify-center">
          <p className="font-montserrat text-primary-blue/50 text-[13px]">
            No comments yet — be the first.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {comments.map((c, i) => (
            <li key={c._id}>
              {i > 0 && (
                <div
                  className={`h-px ${
                    variant === "mobile" ? "bg-[#E5E5E5]" : "bg-[#C9C9C9]"
                  } my-[16px] md:my-[20px]`}
                  aria-hidden
                />
              )}
              <CommentRow
                variant={variant}
                comment={c}
                currentUserId={currentUserId}
                currentUserFirstName={currentUser?.firstName}
                editing={editingId === c._id}
                editContent={editContent}
                onEditContent={setEditContent}
                onLike={() => handleLike(c)}
                onOpenLikes={() => setLikesPanelFor(c)}
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
              ref={variant === "desktop" ? sentinelRefDesktop : sentinelRefMobile}
              className="h-[40px] flex items-center justify-center"
            >
              {fetchingMore && (
                <div className="w-[20px] h-[20px] rounded-full border-[2px] border-black/[0.08] border-t-primary-blue animate-spin" />
              )}
            </li>
          )}
        </ul>
      )}
    </>
  );

  const composer = (
    <div className="flex items-end gap-[10px]">
      <Avatar
        url={currentUser?.profilePicture ?? null}
        initial={(currentUser?.firstName ?? "?").charAt(0).toUpperCase()}
        size={29}
      />
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Comment"
        rows={1}
        className="flex-1 min-w-0 bg-[#F1F1F1] rounded-full px-[16px] py-[10px] resize-none focus:outline-none font-montserrat text-primary-blue placeholder:text-black/30 text-[14px] leading-[20px] max-h-[100px]"
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
  );

  return (
    <>
      {/* Backdrop + layout — separate roots for mobile sheet vs md+ card */}
      <div
        className="fixed inset-0 z-[55] bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Mobile bottom sheet (< md) */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 top-[35vh] z-[56] bg-white rounded-t-[20px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="pt-[10px] pb-[6px] flex justify-center">
          <div className="w-[78px] h-[4px] rounded-full bg-black/[0.15]" />
        </div>
        <div className="pt-[6px] pb-[14px]">
          <h3 className="text-center font-montserrat font-bold text-primary-blue text-[16px]">
            Comments
          </h3>
        </div>
        <div
          ref={scrollRefMobile}
          className="flex-1 min-h-0 overflow-y-auto px-[16px] pb-[8px]"
        >
          {commentList("mobile")}
        </div>
        <div className="shrink-0 border-t border-black/[0.06] px-[16px] py-[12px]">
          {composer}
        </div>
      </div>

      {/* Desktop / tablet centered card (md+) */}
      <div
        className="hidden md:flex fixed inset-0 z-[56] items-center justify-center px-[24px] pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-[720px] lg:max-w-[880px] h-[90vh] max-h-[1000px] bg-white rounded-[32px] lg:rounded-[48px] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={scrollRefDesktop}
            className="flex-1 min-h-0 overflow-y-auto"
          >
            {recapAvailable && (
              <div className="px-[32px] lg:px-[40px] pt-[24px] lg:pt-[32px]">
                {storyCoverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={storyCoverUrl}
                    alt=""
                    className="w-full aspect-[16/11] object-cover rounded-[24px] lg:rounded-[32px]"
                  />
                )}
                <h2 className="mt-[24px] lg:mt-[32px] font-montserrat font-bold text-primary-blue text-[24px] lg:text-[28px] leading-tight">
                  {storyTitle}
                </h2>
                {(authorFullName || storyCreatedAt) && (
                  <div className="mt-[12px] flex items-center gap-[12px]">
                    <Avatar
                      url={storyAuthor?.profilePicture ?? null}
                      initial={
                        (storyAuthor?.firstName ?? "?").charAt(0).toUpperCase()
                      }
                      size={40}
                    />
                    <div>
                      {authorFullName && (
                        <p className="font-montserrat font-medium text-primary-blue text-[16px] lg:text-[18px] leading-tight">
                          {authorFullName}
                        </p>
                      )}
                      {storyCreatedAt && (
                        <p className="font-montserrat text-[#848484] text-[12px] lg:text-[13px] mt-[2px]">
                          {formatRelativeTime(storyCreatedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {recapText && (
                  <p className="mt-[18px] font-montserrat text-primary-blue text-[15px] lg:text-[16px] leading-[22px] whitespace-pre-line">
                    {recapText}
                  </p>
                )}
                <div className="mt-[24px] lg:mt-[28px] h-px bg-[#C9C9C9]" />
              </div>
            )}
            <div className="px-[32px] lg:px-[40px] py-[20px] lg:py-[24px]">
              {commentList("desktop")}
            </div>
          </div>
          <div className="shrink-0 border-t border-black/[0.06] px-[32px] lg:px-[40px] py-[16px]">
            {composer}
          </div>
        </div>

        {/* Close button pinned to viewport corner on md+ */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pointer-events-auto cursor-pointer absolute top-[20px] right-[20px] w-[40px] h-[40px] rounded-full bg-white hover:bg-white text-primary-blue flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
        >
          <CloseIcon width={20} height={20} />
        </button>
      </div>

      {/* Likes panel — right-side drawer on md+, bottom sheet on mobile */}
      {likesPanelFor && (
        <LikesPanel
          comment={likesPanelFor}
          currentUserId={currentUserId}
          currentUserAvatar={currentUser?.profilePicture ?? null}
          onClose={() => setLikesPanelFor(null)}
        />
      )}
    </>
  );
}

// ============ Comment Row ============

function CommentRow(props: {
  variant: "desktop" | "mobile";
  comment: StoryComment;
  currentUserId: string;
  currentUserFirstName?: string;
  editing: boolean;
  editContent: string;
  onEditContent: (v: string) => void;
  onLike: () => void;
  onOpenLikes: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
  onDelete: () => void;
  updating: boolean;
}) {
  const {
    variant,
    comment,
    currentUserId,
    currentUserFirstName,
    editing,
    editContent,
    onEditContent,
    onLike,
    onOpenLikes,
    onStartEdit,
    onCancelEdit,
    onConfirmEdit,
    onDelete,
    updating,
  } = props;
  const [menuOpen, setMenuOpen] = useState(false);

  const isMine = comment.author._id === currentUserId;
  const initial = (comment.author.firstName || "?").charAt(0).toUpperCase();
  const likedByText = formatLikedBy(comment, currentUserId, currentUserFirstName);

  const menuItems: OptionsMenuItem[] = [
    {
      label: "Edit comment",
      onClick: onStartEdit,
      icon: <PencilIcon width={18} height={18} />,
    },
    {
      label: "Delete comment",
      onClick: onDelete,
      destructive: true,
      icon: <TrashIcon width={18} height={18} />,
    },
  ];

  if (editing) {
    return (
      <div className="flex items-start gap-[10px]">
        <Avatar
          url={comment.author.profilePicture}
          initial={initial}
          size={37}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[8px]">
            <span className="font-montserrat font-semibold text-primary-blue text-[14px] truncate">
              {[comment.author.firstName, comment.author.lastName]
                .filter(Boolean)
                .join(" ")}
            </span>
            <span className="font-montserrat text-black/40 text-[12px]">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <div className="mt-[8px] flex items-start gap-[12px]">
            <textarea
              value={editContent}
              onChange={(e) => onEditContent(e.target.value)}
              rows={3}
              autoFocus
              className="flex-1 min-w-0 bg-[#EDEDED] rounded-[24px] px-[16px] py-[12px] resize-none focus:outline-none font-montserrat text-black text-[15px] leading-[22px] max-h-[200px]"
            />
            <div className="flex flex-col gap-[8px] shrink-0">
              <button
                type="button"
                onClick={onCancelEdit}
                aria-label="Cancel edit"
                disabled={updating}
                className="cursor-pointer w-[31px] h-[31px] rounded-full border border-primary-blue bg-white text-primary-blue hover:bg-black/[0.03] flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <CloseIcon width={14} height={14} />
              </button>
              <button
                type="button"
                onClick={onConfirmEdit}
                aria-label="Save edit"
                disabled={updating || !editContent.trim()}
                className="cursor-pointer w-[31px] h-[31px] rounded-full bg-[#EF9849] text-white hover:opacity-90 flex items-center justify-center transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckSvg />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "mobile") {
    return (
      <div className="flex items-start gap-[11px] relative">
        <Avatar
          url={comment.author.profilePicture}
          initial={initial}
          size={37}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[6px] pr-[28px]">
            <span className="font-montserrat font-semibold text-primary-blue text-[14px] truncate">
              {[comment.author.firstName, comment.author.lastName]
                .filter(Boolean)
                .join(" ")}
            </span>
            <span className="font-montserrat text-black/40 text-[12px]">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="mt-[4px] font-montserrat text-black text-[14px] leading-[20px] whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          {likedByText && (
            <button
              type="button"
              onClick={onOpenLikes}
              className="mt-[6px] cursor-pointer font-montserrat font-medium text-primary-blue text-[12px] hover:underline"
            >
              {likedByText}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onLike}
          aria-label={comment.isLiked ? "Unlike" : "Like"}
          className={`absolute bottom-0 right-0 cursor-pointer w-[24px] h-[24px] flex items-center justify-center ${
            comment.isLiked ? "text-[#D95F3B]" : "text-primary-blue"
          }`}
        >
          <HeartIcon width={20} height={20} filled={comment.isLiked} />
        </button>
        {isMine && (
          <div className="absolute top-0 right-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Comment actions"
              className="cursor-pointer w-[24px] h-[24px] flex items-center justify-center text-primary-blue"
            >
              <MoreHorizontalIcon width={18} height={18} />
            </button>
            <OptionsMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              items={menuItems}
              align="right"
            />
          </div>
        )}
      </div>
    );
  }

  // desktop / tablet
  return (
    <div className="flex items-start gap-[12px]">
      <Avatar
        url={comment.author.profilePicture}
        initial={initial}
        size={37}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px]">
          <span className="font-montserrat font-semibold text-primary-blue text-[14px] truncate">
            {[comment.author.firstName, comment.author.lastName]
              .filter(Boolean)
              .join(" ")}
          </span>
          <span className="font-montserrat text-black/40 text-[12px]">
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <p className="mt-[6px] font-montserrat text-black text-[14px] leading-[20px] whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        <div className="mt-[8px] flex items-center gap-[14px]">
          <button
            type="button"
            onClick={onLike}
            aria-label={comment.isLiked ? "Unlike" : "Like"}
            className={`cursor-pointer flex items-center gap-[6px] ${
              comment.isLiked ? "text-[#D95F3B]" : "text-primary-blue"
            }`}
          >
            <HeartIcon width={18} height={18} filled={comment.isLiked} />
          </button>
          {likedByText && (
            <button
              type="button"
              onClick={onOpenLikes}
              className="cursor-pointer font-montserrat font-medium text-primary-blue text-[12px] hover:underline"
            >
              {likedByText}
            </button>
          )}
        </div>
      </div>
      {isMine && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Comment actions"
            className="cursor-pointer w-[32px] h-[32px] rounded-full bg-[#F1F1F1] hover:bg-[#E7E7E7] text-primary-blue flex items-center justify-center transition-colors"
          >
            <MoreHorizontalIcon width={18} height={18} />
          </button>
          <OptionsMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={menuItems}
            align="right"
          />
        </div>
      )}
    </div>
  );
}

function CheckSvg() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ============ Likes Panel ============

function LikesPanel({
  comment,
  currentUserId,
  currentUserAvatar,
  onClose,
}: {
  comment: StoryComment;
  currentUserId: string;
  currentUserAvatar: string | null;
  onClose: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
        aria-hidden
      />
      {/* Mobile: bottom sheet */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 top-[35vh] z-[61] bg-white rounded-t-[20px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="pt-[10px] pb-[6px] flex justify-center">
          <div className="w-[78px] h-[4px] rounded-full bg-black/[0.15]" />
        </div>
        <div className="relative pt-[6px] pb-[14px]">
          <h3 className="text-center font-montserrat font-bold text-primary-blue text-[16px]">
            Loves
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-[16px] top-1/2 -translate-y-1/2 cursor-pointer w-[28px] h-[28px] rounded-full text-primary-blue flex items-center justify-center"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-[16px] pb-[16px]">
          <LikesList
            comment={comment}
            currentUserId={currentUserId}
            currentUserAvatar={currentUserAvatar}
          />
        </div>
      </div>
      {/* Desktop / tablet: right-side drawer */}
      <div
        className="hidden md:flex fixed right-[24px] top-1/2 -translate-y-1/2 h-[90vh] max-h-[1000px] w-[320px] lg:top-[24px] lg:bottom-[24px] lg:translate-y-0 lg:h-auto lg:max-h-none lg:w-[360px] z-[61] bg-white rounded-[24px] shadow-[0_4px_33px_rgba(0,0,0,0.25)] flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-[28px] py-[20px]">
          <h3 className="font-montserrat font-medium text-primary-blue text-[22px] lg:text-[24px]">
            Loves
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer w-[36px] h-[36px] rounded-full text-primary-blue hover:bg-black/[0.05] flex items-center justify-center transition-colors"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-[28px] pb-[24px]">
          <LikesList
            comment={comment}
            currentUserId={currentUserId}
            currentUserAvatar={currentUserAvatar}
            large
          />
        </div>
      </div>
    </>
  );
}

function LikesList({
  comment,
  currentUserId,
  currentUserAvatar,
  large = false,
}: {
  comment: StoryComment;
  currentUserId: string;
  currentUserAvatar: string | null;
  large?: boolean;
}) {
  const rows = comment.likes.map((l) => {
    const isMe = l._id === currentUserId || l.user === currentUserId;
    return {
      id: l._id || l.user || "",
      name: l.firstName || (isMe ? "You" : "Someone"),
      avatar: isMe ? currentUserAvatar : null,
    };
  });
  if (rows.length === 0) {
    return (
      <p className="mt-[16px] text-center font-montserrat text-primary-blue/50 text-[13px]">
        No likes yet.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-[16px]">
      {rows.map((r, i) => (
        <li key={`${r.id}-${i}`} className="flex items-center gap-[12px]">
          <Avatar
            url={r.avatar}
            initial={(r.name || "?").charAt(0).toUpperCase()}
            size={large ? 36 : 32}
          />
          <p
            className={`flex-1 font-montserrat font-medium text-primary-blue ${
              large ? "text-[14px] lg:text-[15px]" : "text-[13px]"
            }`}
          >
            {r.name}
          </p>
          <HeartIcon
            width={large ? 16 : 14}
            height={large ? 16 : 14}
            filled
            className="text-[#D95F3B]"
          />
        </li>
      ))}
    </ul>
  );
}

// ============ Avatar ============

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
    if (others.length > 1) {
      return `Liked by ${otherFirst} and ${others.length - 1} other${
        others.length - 1 > 1 ? "s" : ""
      }`;
    }
    return `Liked by ${otherFirst}`;
  }
  void currentUserFirstName;
  return "";
}

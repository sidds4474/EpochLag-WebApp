"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import CommentsModal from "../../components/CommentsModal/CommentsModal";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import OptionsMenu, {
  type OptionsMenuItem,
} from "../../components/OptionsMenu/OptionsMenu";
import { ApiError } from "../../lib/api/client";
import { deleteStory } from "../../lib/create/api";
import {
  formatShortDayTime,
  formatStoryHeaderDate,
} from "../../lib/formatters";
import { toggleStoryLike } from "../../lib/interactions/api";
import { bustUrl } from "../../lib/images";
import { parseContentToBlocks } from "../../lib/parseStoryContent";
import type { ContentBlock } from "../../types/story";
import type {
  Story,
  StoryAuthor,
  StoryMedia as StoryMediaItem,
  ThreadParticipant,
  ThreadResponse,
} from "../../types/home";
import type { User } from "../../types/user";
import StoryMedia from "../StoryPage/components/StoryMedia";
import MusicPill from "./MusicPill";
import ShareModal from "../../app/(app)/(dashboard)/new-story/ShareModal";
import {
  ChatIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MoreHorizontalIcon,
  SparkleIcon,
} from "../../app/(app)/(dashboard)/icons";
import { shareStory } from "../../lib/create/api";

type ThreadViewerProps = {
  data: ThreadResponse;
  activeIndex: number;
  onSelectIndex: (i: number) => void;
  currentUser: User | null;
  /** Compact title row variant: title left, author avatar+name+date stacked on right. */
  compactAuthorRow?: boolean;
  /** Parent-managed slide removal. When set, ThreadViewer calls this after a
   * successful delete so the parent can drop the slide from its stories list
   * and adjust activeIndex. When absent, ThreadViewer falls back to router.back(). */
  onStoryDeleted?: (storyId: string) => void;
  /** Preview mode — renders the same layout with no BE side effects. Hides
   * the Add Story chip + 3-dot menu, and no-ops likes/deletes/shares. Used
   * by the composer's Eye button to show authors what their draft will look
   * like when published. */
  preview?: boolean;
};

export default function ThreadViewer({
  data,
  activeIndex,
  onSelectIndex,
  currentUser,
  compactAuthorRow = false,
  onStoryDeleted,
  preview = false,
}: ThreadViewerProps) {
  const currentUserId = currentUser?._id ?? "";
  const stories = data.stories ?? [];
  const total = stories.length;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0));
  const story: Story | undefined = stories[safeIndex];
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < total - 1;

  const [likeOverrides, setLikeOverrides] = useState<
    Record<string, { liked: boolean; count: number }>
  >({});
  const likePendingRef = useRef<Record<string, boolean>>({});
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const storyId = story?._id ?? "";
  const override = storyId ? likeOverrides[storyId] : undefined;
  const isLiked = override?.liked ?? !!story?.isLikedByMe;
  const likeCount = override?.count ?? story?.likesCount ?? 0;

  const handleLikeToggle = useCallback(async () => {
    if (preview) return;
    if (!storyId) return;
    if (likePendingRef.current[storyId]) return;
    likePendingRef.current[storyId] = true;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
    setLikeOverrides((m) => ({
      ...m,
      [storyId]: { liked: nextLiked, count: nextCount },
    }));
    try {
      await toggleStoryLike(storyId);
    } catch {
      setLikeOverrides((m) => ({
        ...m,
        [storyId]: { liked: prevLiked, count: prevCount },
      }));
      toast.error("Couldn't update like");
    } finally {
      likePendingRef.current[storyId] = false;
    }
  }, [storyId, isLiked, likeCount, preview]);

  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Definitive count reported by CommentsModal once known — trumps
  // story.commentsCount from the thread response (which can be stale).
  // Falls back to a delta bump if BE doesn't ship pagination.totalItems.
  const [commentTotalOverride, setCommentTotalOverride] = useState<
    number | null
  >(null);
  const [commentCountDelta, setCommentCountDelta] = useState(0);

  // Swiping to a new slide resets modal + counter overrides so state from
  // story A doesn't leak into story B.
  useEffect(() => {
    setCommentTotalOverride(null);
    setCommentCountDelta(0);
    setCommentsOpen(false);
  }, [storyId]);

  const prompt = data.thread.prompt;
  const participants: ThreadParticipant[] = data.thread.participants ?? [];
  const threadId = data.thread._id;
  const isPrivateThread = !!data.thread.isPrivate;
  const promptId = prompt?._id ?? null;
  const isSent = !!(
    story?.author?._id && currentUserId && story.author._id === currentUserId
  );
  const canShare = isSent || !isPrivateThread;

  function handleAddStory() {
    if (!promptId) {
      toast.error("Missing prompt");
      return;
    }
    router.push(`/reply/${promptId}?thread=${threadId}`);
  }

  function handleEdit() {
    if (!storyId) return;
    router.push(`/edit/${storyId}?thread=${threadId}`);
  }

  async function handleDeleteConfirmed() {
    if (!storyId) return;
    try {
      await deleteStory(storyId);
      toast.success(isSent ? "Story deleted" : "Removed from your feed");
      setDeleteConfirmOpen(false);
      // Recipient removing themselves loses thread access → always navigate
      // back. Author on a multi-story thread: hand off to parent to drop the
      // slide and reindex. Fallback (no callback): navigate back.
      if (!isSent || total <= 1 || !onStoryDeleted) {
        router.back();
        return;
      }
      onStoryDeleted(storyId);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Couldn't delete. Try again.";
      toast.error(msg);
    }
  }

  async function handleShareSend(
    userIds: string[],
    sendSeparately: boolean,
    _note: string,
    _isPrivate: boolean,
    groupIds: string[]
  ) {
    if (!storyId) return;
    try {
      await shareStory(storyId, { userIds, groupIds, sendSeparately });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      throw new Error(message);
    }
  }

  // ShareModal cardData — memoize-equivalent inline (participants list is
  // stable per render). We shape prompt + participants so the modal excludes
  // them from the picker + shows them in "Currently on this share".
  const shareCardData = prompt
    ? {
        _id: prompt._id,
        author: prompt.author ? { _id: prompt.author._id } : null,
        note: prompt.note ?? null,
      }
    : null;
  const existingMembers = participants
    .filter((p) => p._id && p._id !== currentUserId)
    .map((p) => ({
      _id: p._id!,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      profilePicture: p.profilePicture ?? null,
    }));

  const menuItems: OptionsMenuItem[] = [];
  if (isSent && storyId) {
    menuItems.push({ label: "Edit", onClick: handleEdit });
  }
  if (canShare) {
    menuItems.push({ label: "Share", onClick: () => setShareOpen(true) });
  }
  if (isSent && storyId) {
    menuItems.push({
      label: "Delete",
      onClick: () => setDeleteConfirmOpen(true),
      destructive: true,
    });
  } else if (!isSent && storyId) {
    menuItems.push({
      label: "Delete for Me",
      onClick: () => setDeleteConfirmOpen(true),
      destructive: true,
    });
  }

  const hasPrompt =
    !!(prompt?.content || prompt?.imageUrl) && !prompt?.isTitleAvailable;

  const promptCreator = prompt?.author ?? null;
  const creatorName =
    promptCreator?.firstName || promptCreator?.username || null;
  const isOwnPrompt = promptCreator?._id === currentUserId;
  const showStarIcon = isOwnPrompt || !promptCreator || !creatorName;

  const noteAuthor = participants.find((p) => p?.role === "author") || null;
  const noteAuthorFirst =
    noteAuthor?.firstName || noteAuthor?.username || null;
  const promptNote = prompt?.note || "";
  const hasPromptNote = hasPrompt && !!promptNote && !!noteAuthorFirst;

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-[24px] py-[24px]">
        <p className="font-montserrat text-primary-blue/60 text-[14px] text-center max-w-[360px]">
          No stories yet — be the first to respond.
        </p>
      </div>
    );
  }

  const firstCoverMedia = story?.media?.find(
    (m: StoryMediaItem) =>
      m?.type === "image" &&
      typeof m?.url === "string" &&
      m.url.includes("_cover.jpg")
  );
  const coverUrl =
    prompt?.imageUrl ||
    firstCoverMedia?.url ||
    story?.coverImage ||
    story?.cover ||
    story?.imageUrl ||
    null;

  const blocks = parseContentToBlocks(story?.content || "");

  const viewerSource: ThreadParticipant[] =
    (story?.viewers as ThreadParticipant[] | undefined)?.length
      ? (story!.viewers as ThreadParticipant[])
      : participants;

  // Mobile has no fallback when story.author is null — we improve on that by
  // falling back to the current user (matches mobile's intent for "own" stories
  // where BE omits the author).
  const resolvedAuthor: StoryAuthor | null = story?.author
    ? story.author
    : currentUser
      ? {
          _id: currentUser._id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          profilePicture: currentUser.profilePicture ?? null,
        }
      : null;

  const authorName = resolvedAuthor
    ? [resolvedAuthor.firstName, resolvedAuthor.lastName]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <>
      {total > 1 && canPrev && (
        <button
          type="button"
          aria-label="Previous story"
          onClick={() => onSelectIndex(safeIndex - 1)}
          className="cursor-pointer absolute left-[8px] top-1/2 -translate-y-1/2 z-10 w-[36px] h-[36px] rounded-full bg-[#ededed] flex items-center justify-center text-primary-blue hover:bg-[#e3e3e3] transition-colors"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
      )}
      {total > 1 && canNext && (
        <button
          type="button"
          aria-label="Next story"
          onClick={() => onSelectIndex(safeIndex + 1)}
          className="cursor-pointer absolute right-[8px] top-1/2 -translate-y-1/2 z-10 w-[36px] h-[36px] rounded-full bg-[#ededed] flex items-center justify-center text-primary-blue hover:bg-[#e3e3e3] transition-colors"
        >
          <ChevronRightIcon width={18} height={18} />
        </button>
      )}

      <div
        className="flex-1 min-w-0 overflow-y-auto scrollbar-hide px-[40px] pt-[16px]"
        onTouchStart={(e) => {
          if (total <= 1) return;
          touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
          };
        }}
        onTouchEnd={(e) => {
          if (total <= 1) return;
          const start = touchStartRef.current;
          touchStartRef.current = null;
          if (!start) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          // Require the gesture to be primarily horizontal + past a
          // reasonable threshold so vertical scrolls don't page.
          if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
          if (dx < 0 && canNext) onSelectIndex(safeIndex + 1);
          else if (dx > 0 && canPrev) onSelectIndex(safeIndex - 1);
        }}
      >
        <div className="flex items-center justify-between gap-[16px] mb-[12px]">
          {preview ? (
            <span className="shrink-0 w-[1px]" aria-hidden />
          ) : (
            <button
              type="button"
              onClick={handleAddStory}
              disabled={!promptId}
              className="cursor-pointer bg-[#ededed] border border-white rounded-full px-[14px] py-[7px] flex items-center gap-[8px] font-montserrat font-medium text-primary-blue text-[14px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Add Story
              <span className="text-[16px] leading-none">+</span>
            </button>
          )}
          <div className="flex-1 min-w-0 flex justify-center">
            {story?.music?.trackName && <MusicPill music={story.music} />}
          </div>
          {preview ? (
            <span className="shrink-0 w-[1px]" aria-hidden />
          ) : (
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                disabled={menuItems.length === 0}
                className="cursor-pointer bg-[#f1f1f1] rounded-full w-[36px] h-[36px] flex items-center justify-center text-primary-blue hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MoreHorizontalIcon width={20} height={20} />
              </button>
              <OptionsMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                items={menuItems}
              />
            </div>
          )}
        </div>

        {hasPrompt && prompt && (
          <PromptPill
            promptContent={prompt.content || ""}
            showStarIcon={showStarIcon}
            creatorName={creatorName}
            creatorAvatar={promptCreator?.profilePicture ?? null}
          />
        )}
        {hasPromptNote && noteAuthor && (
          <NotePill
            note={promptNote}
            authorFirstName={noteAuthorFirst!}
            authorAvatar={noteAuthor.profilePicture ?? null}
          />
        )}

        {total >= 2 && (
          <div className="flex items-center gap-[6px] mt-[12px] mb-[14px]">
            {stories.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to story ${i + 1}`}
                onClick={() => onSelectIndex(i)}
                className={`h-[3px] flex-1 rounded-full transition-colors ${
                  i <= safeIndex
                    ? "bg-primary-blue"
                    : "bg-[#dbdbdb] hover:bg-primary-blue/30"
                }`}
              />
            ))}
          </div>
        )}

        <div className="relative rounded-[24px] overflow-hidden bg-primary-blue/10 h-[260px] mb-[20px] mt-[8px]">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
        </div>

        {compactAuthorRow ? (
          <CompactTitleAuthorRow
            title={story?.title || ""}
            authorName={authorName}
            authorAvatar={resolvedAuthor?.profilePicture ?? null}
            authorInitial={(resolvedAuthor?.firstName || "?")
              .charAt(0)
              .toUpperCase()}
            dateLabel={formatStoryHeaderDate(story?.createdAt)}
          />
        ) : (
          <>
            {(story?.title || story?.createdAt) && (
              <div className="flex items-start justify-between gap-[12px]">
                {story?.title ? (
                  <h2 className="font-montserrat font-semibold text-primary-blue text-[22px] md:text-[26px] leading-[30px] flex-1 min-w-0">
                    {story.title}
                  </h2>
                ) : (
                  <span />
                )}
                <span className="font-montserrat text-primary-blue/50 text-[13px] shrink-0 mt-[8px]">
                  {formatShortDayTime(story?.createdAt)}
                </span>
              </div>
            )}

            {resolvedAuthor && (
              <div className="flex items-center gap-[10px] mt-[10px]">
                <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
                  {resolvedAuthor.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bustUrl(
                        resolvedAuthor.profilePicture,
                        resolvedAuthor._id === currentUser?._id
                          ? currentUser?.updatedAt
                          : undefined
                      )}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[13px]">
                      {(resolvedAuthor.firstName || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-montserrat font-medium text-primary-blue text-[15px]">
                  {authorName}
                </span>
              </div>
            )}
          </>
        )}

        <div className="mt-[18px] mb-[24px] flex flex-col gap-[16px]">
          {blocks.map((block, i) => (
            <BodyBlock
              key={i}
              block={block}
              storyTitle={story?.title || undefined}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 px-[40px] py-[14px] border-t border-black/[0.06] bg-white flex items-center justify-between text-primary-blue/80 font-montserrat">
        <ViewerStack viewers={viewerSource} />
        <div className="flex items-center gap-[18px]">
          {(() => {
            const commentCount =
              commentTotalOverride ??
              Math.max(0, (story?.commentsCount ?? 0) + commentCountDelta);
            return (
              <button
                type="button"
                aria-label="Comments"
                onClick={() => setCommentsOpen(true)}
                disabled={!storyId || preview}
                className="cursor-pointer flex items-center gap-[6px] text-primary-blue hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChatIcon width={20} height={20} />
                {commentCount > 0 && (
                  <span className="text-[14px] font-medium">
                    {commentCount}
                  </span>
                )}
              </button>
            );
          })()}
          <button
            type="button"
            onClick={handleLikeToggle}
            aria-label={isLiked ? "Unlike" : "Like"}
            className={`cursor-pointer flex items-center gap-[6px] transition-opacity hover:opacity-80 ${
              isLiked ? "text-[#e53e3e]" : "text-primary-blue"
            }`}
          >
            <HeartIcon width={20} height={20} filled={isLiked} />
            {likeCount > 0 && (
              <span className="text-[14px] font-medium">{likeCount}</span>
            )}
          </button>
        </div>
      </div>

      <ConfirmationModal
        open={deleteConfirmOpen}
        title={isSent ? "Delete this story?" : "Remove from your feed?"}
        body={
          isSent
            ? "This story will be permanently removed for everyone on this thread."
            : "You'll no longer see this story. Others on the thread will still see it."
        }
        confirmLabel={isSent ? "Delete" : "Remove"}
        destructive
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
      />

      <ShareModal
        open={shareOpen}
        title="Send story to"
        shareContext="story"
        showMessageInput={false}
        cardData={shareCardData}
        existingMembers={existingMembers}
        onClose={() => setShareOpen(false)}
        onSend={handleShareSend}
      />

      <CommentsModal
        open={commentsOpen}
        storyId={storyId || null}
        currentUser={currentUser}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => setCommentCountDelta((d) => d + 1)}
        onCommentDeleted={() => setCommentCountDelta((d) => d - 1)}
        onTotalKnown={(total) => setCommentTotalOverride(total)}
      />
    </>
  );
}

function CompactTitleAuthorRow({
  title,
  authorName,
  authorAvatar,
  authorInitial,
  dateLabel,
}: {
  title: string;
  authorName: string;
  authorAvatar: string | null;
  authorInitial: string;
  dateLabel: string;
}) {
  const hasAuthor = !!authorName;
  const hasRightCol = hasAuthor || !!dateLabel;
  if (!title && !hasRightCol) return null;

  return (
    <div className="flex items-center justify-between gap-[16px]">
      {title ? (
        <h2 className="font-montserrat font-semibold text-primary-blue text-[22px] md:text-[26px] leading-[30px] flex-1 min-w-0">
          {title}
        </h2>
      ) : (
        <span className="flex-1" />
      )}
      {hasRightCol && (
        <div className="flex items-center gap-[10px] shrink-0">
          {hasAuthor && (
            <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
              {authorAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={authorAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[13px]">
                  {authorInitial}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col leading-tight items-end">
            {hasAuthor && (
              <span className="font-montserrat font-medium text-primary-blue text-[14px]">
                {authorName}
              </span>
            )}
            {dateLabel && (
              <span className="font-montserrat text-primary-blue/50 text-[12px]">
                {dateLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PromptPill({
  promptContent,
  showStarIcon,
  creatorName,
  creatorAvatar,
}: {
  promptContent: string;
  showStarIcon: boolean;
  creatorName: string | null;
  creatorAvatar: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-[4px] mb-[6px] flex items-center gap-[10px]">
      {showStarIcon ? (
        <div className="w-[32px] h-[32px] rounded-full bg-primary-orange/15 text-primary-orange flex items-center justify-center shrink-0">
          <SparkleIcon width={18} height={18} />
        </div>
      ) : (
        <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
          {creatorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creatorAvatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[12px]">
              {(creatorName || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer flex-1 min-w-0 bg-[#ededed] rounded-[14px] px-[14px] py-[10px] flex items-start justify-between gap-[10px] hover:bg-[#e3e3e3] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {expanded ? (
            <>
              {creatorName && !showStarIcon && (
                <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[4px]">
                  {creatorName}
                </p>
              )}
              <p className="font-montserrat text-primary-blue text-[14px] leading-[20px] whitespace-pre-line">
                {promptContent}
              </p>
            </>
          ) : (
            <p className="font-montserrat text-primary-blue text-[14px]">
              {showStarIcon || !creatorName ? (
                "View prompt"
              ) : (
                <>
                  View{" "}
                  <span className="font-semibold">{creatorName}</span>
                  &apos;s prompt
                </>
              )}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-primary-blue/60 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon width={16} height={16} />
        </span>
      </button>
    </div>
  );
}

function NotePill({
  note,
  authorFirstName,
  authorAvatar,
}: {
  note: string;
  authorFirstName: string;
  authorAvatar: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-[4px] mb-[6px] flex items-center gap-[10px]">
      <div className="w-[32px] h-[32px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
        {authorAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={authorAvatar}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[12px]">
            {authorFirstName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer flex-1 min-w-0 bg-[#ededed] rounded-[14px] px-[14px] py-[10px] flex items-start justify-between gap-[10px] hover:bg-[#e3e3e3] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          {expanded ? (
            <>
              <p className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[4px]">
                {authorFirstName}
              </p>
              <p className="font-montserrat text-primary-blue text-[14px] leading-[20px] whitespace-pre-line">
                {note}
              </p>
            </>
          ) : (
            <p className="font-montserrat text-primary-blue text-[14px]">
              View{" "}
              <span className="font-semibold">{authorFirstName}</span>
              &apos;s note
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-primary-blue/60 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon width={16} height={16} />
        </span>
      </button>
    </div>
  );
}

function ViewerStack({ viewers }: { viewers: ThreadParticipant[] }) {
  const visible = viewers.slice(0, 4);
  const extra = Math.max(0, viewers.length - visible.length);
  if (visible.length === 0) return <span />;
  return (
    <div className="flex items-center gap-[8px]">
      <div className="flex -space-x-[8px]">
        {visible.map((p) => (
          <div
            key={p._id}
            className="w-[26px] h-[26px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white"
            title={[p.firstName, p.lastName].filter(Boolean).join(" ")}
          >
            {p.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bustUrl(p.profilePicture, undefined)}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[10px]">
                {(p.firstName || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
      </div>
      {extra > 0 && (
        <span className="font-montserrat font-medium text-primary-blue/70 text-[13px]">
          +{extra}
        </span>
      )}
    </div>
  );
}

function BodyBlock({
  block,
  storyTitle,
}: {
  block: ContentBlock;
  storyTitle?: string;
}) {
  if (block.type === "text") {
    return (
      <p className="font-montserrat text-primary-blue text-[15px] leading-[22px] whitespace-pre-line">
        {block.text}
      </p>
    );
  }
  if (block.type === "audio") {
    return (
      <div className="mx-auto max-w-[300px] md:max-w-[420px] w-full">
        <audio src={block.url} controls preload="metadata" className="w-full">
          <track kind="captions" />
        </audio>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[300px] md:max-w-[420px] w-full">
      <StoryMedia
        item={{ type: block.type, url: block.url }}
        storyTitle={storyTitle}
      />
    </div>
  );
}

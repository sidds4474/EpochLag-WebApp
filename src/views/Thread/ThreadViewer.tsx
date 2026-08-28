"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import CommentsModal from "../../components/CommentsModal/CommentsModal";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import OptionsMenu, {
  type OptionsMenuItem,
} from "../../components/OptionsMenu/OptionsMenu";
import { ApiError } from "../../lib/api/client";
import { deleteStory } from "../../lib/create/api";
import { formatStoryHeaderDate } from "../../lib/formatters";
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
import MediaLightbox, { type LightboxMediaItem } from "./MediaLightbox";
import MusicPill from "./MusicPill";
import StoryLikesDrawer from "./StoryLikesDrawer";
import ShareModal from "../../app/(app)/(dashboard)/new-story/ShareModal";
import {
  ChatIcon,
  NoteIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PromptIcon,
  SendIcon,
  TrashIcon,
} from "../../app/(app)/(dashboard)/icons";
import { shareStory } from "../../lib/create/api";

type ThreadViewerProps = {
  data: ThreadResponse;
  activeIndex: number;
  onSelectIndex: (i: number) => void;
  currentUser: User | null;
  /** Parent-managed slide removal. When set, ThreadViewer calls this after a
   * successful delete so the parent can drop the slide from its stories list
   * and adjust activeIndex. When absent, ThreadViewer falls back to router.back(). */
  onStoryDeleted?: (storyId: string) => void;
  /** Preview mode — renders the same layout with no BE side effects. Hides
   * the Add Story chip + 3-dot menu, and no-ops likes/deletes/shares. Used
   * by the composer's Eye button to show authors what their draft will look
   * like when published. */
  preview?: boolean;
  /** Desktop-only: page-level DOM slot to portal the Add Story + ⋯ actions
   * into, so they render on the same row as the page's "Story" title (matches
   * Figma). Below `lg`, the actions render inline at the top of the story
   * column as they do today. */
  actionsPortalRef?: RefObject<HTMLDivElement | null>;
  /** Desktop-only: page-level DOM slot to portal the Music pill into, so it
   * sits centered between the "Story" title and the actions on the header
   * row. Below `lg`, the pill renders inline at the top of the story column. */
  musicPortalRef?: RefObject<HTMLDivElement | null>;
  /** Mobile-only: page-level DOM slot to portal just the ⋯ menu into. */
  mobileMenuPortalRef?: RefObject<HTMLDivElement | null>;
};

export default function ThreadViewer({
  data,
  activeIndex,
  onSelectIndex,
  currentUser,
  onStoryDeleted,
  preview = false,
  actionsPortalRef,
  musicPortalRef,
  mobileMenuPortalRef,
}: ThreadViewerProps) {
  // Portal target is a client-only DOM node — wait for mount before rendering
  // the portalled actions to avoid SSR hydration mismatches.
  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => {
    setPortalMounted(true);
  }, []);
  const currentUserId = currentUser?._id ?? "";
  const stories = data.stories ?? [];
  const total = stories.length;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0));
  const story: Story | undefined = stories[safeIndex];
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < total - 1;

  const [likeOverrides, setLikeOverrides] = useState<
    Record<
      string,
      {
        liked: boolean;
        count: number;
        // Optimistic snapshot for the Likes drawer. Seeded from story.likes
        // on toggle so the drawer reflects the tap instantly instead of
        // waiting for a refetch.
        likes?: import("../../types/home").StoryLike[];
      }
    >
  >({});
  const likePendingRef = useRef<Record<string, boolean>>({});
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  // Mobile bottom-sheet state: story enters in "close" (cover full-bleed, sheet
  // peeks up from bottom). Dragging the handle transitions to "open" (sheet
  // fills viewport). Desktop ignores this.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{
    y: number;
    x: number;
    open: boolean;
  } | null>(null);
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const handleSheetDragStart = useCallback(
    (e: React.TouchEvent) => {
      // When sheet is open and content is scrolled, defer to native scroll —
      // sheet drag would fight vertical scrolling.
      if (sheetOpen && (sheetScrollRef.current?.scrollTop ?? 0) > 0) return;
      dragStartRef.current = {
        y: e.touches[0].clientY,
        x: e.touches[0].clientX,
        open: sheetOpen,
      };
      setDragging(true);
    },
    [sheetOpen]
  );
  const handleSheetDragMove = useCallback((e: React.TouchEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dy = e.touches[0].clientY - start.y;
    const dx = e.touches[0].clientX - start.x;
    // Primarily horizontal gesture — abort so the story-swipe handler wins.
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      dragStartRef.current = null;
      setDragOffset(0);
      setDragging(false);
      return;
    }
    // Prevent overdragging past the natural snap positions.
    if (start.open && dy < 0) return setDragOffset(0);
    if (!start.open && dy > 0) return setDragOffset(0);
    setDragOffset(dy);
  }, []);
  const handleSheetDragEnd = useCallback(() => {
    const start = dragStartRef.current;
    if (!start) {
      setDragging(false);
      return;
    }
    const THRESHOLD = 60;
    if (start.open && dragOffset > THRESHOLD) setSheetOpen(false);
    else if (!start.open && dragOffset < -THRESHOLD) setSheetOpen(true);
    setDragOffset(0);
    setDragging(false);
    dragStartRef.current = null;
  }, [dragOffset]);

  const storyId = story?._id ?? "";
  const override = storyId ? likeOverrides[storyId] : undefined;
  // Prefer deriving from story.likes[] — BE sometimes returns the like list
  // populated but leaves isLikedByMe stale/false, which flipped the heart to
  // "unliked" after refresh even though the user was in the list. Only fall
  // back to isLikedByMe when likes[] isn't present.
  const derivedLiked =
    story?.likes && currentUserId
      ? story.likes.some((l) => l._id === currentUserId)
      : !!story?.isLikedByMe;
  const isLiked = override?.liked ?? derivedLiked;
  // Match mobile OpenStory count fallback: totalLikes → likes.length → likesCount → 0.
  const likeCount =
    override?.count ??
    story?.totalLikes ??
    story?.likes?.length ??
    story?.likesCount ??
    0;

  const handleLikeToggle = useCallback(async () => {
    if (preview) return;
    if (!storyId) return;
    if (likePendingRef.current[storyId]) return;
    likePendingRef.current[storyId] = true;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    const prevLikes = override?.likes ?? story?.likes ?? [];
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
    const nextLikes = nextLiked
      ? currentUser
        ? [
            ...prevLikes.filter((l) => l._id !== currentUser._id),
            {
              _id: currentUser._id,
              firstName: currentUser.firstName,
              lastName: currentUser.lastName,
              profilePicture: currentUser.profilePicture ?? null,
            },
          ]
        : prevLikes
      : prevLikes.filter((l) => l._id !== currentUserId);
    setLikeOverrides((m) => ({
      ...m,
      [storyId]: { liked: nextLiked, count: nextCount, likes: nextLikes },
    }));
    try {
      await toggleStoryLike(storyId);
    } catch {
      setLikeOverrides((m) => ({
        ...m,
        [storyId]: { liked: prevLiked, count: prevCount, likes: prevLikes },
      }));
      toast.error("Couldn't update like");
    } finally {
      likePendingRef.current[storyId] = false;
    }
  }, [storyId, isLiked, likeCount, preview, override, story?.likes, currentUser, currentUserId]);

  const router = useRouter();
  // Two separate open states because both the desktop portal and the mobile
  // portal render an OptionsMenu — sharing state would mean the invisible
  // menu's click-outside listener closes the visible one on mousedown before
  // the button's click event ever fires.
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [likesDrawerOpen, setLikesDrawerOpen] = useState(false);
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
    menuItems.push({
      label: "Edit Lag",
      onClick: handleEdit,
      icon: <PencilIcon width={18} height={18} />,
    });
  }
  if (isSent && storyId) {
    menuItems.push({
      label: "Delete Lag",
      onClick: () => setDeleteConfirmOpen(true),
      destructive: true,
      icon: <TrashIcon width={18} height={18} />,
    });
  } else if (!isSent && storyId) {
    menuItems.push({
      label: "Delete for Me",
      onClick: () => setDeleteConfirmOpen(true),
      destructive: true,
      icon: <TrashIcon width={18} height={18} />,
    });
  }
  if (canShare) {
    menuItems.push({
      label: "Share Story",
      onClick: () => setShareOpen(true),
      icon: <SendIcon width={18} height={18} />,
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

  // Desktop prompt strip identity: prefer the prompt's author; fall back to
  // the note author so the strip still reads as "someone asked" when the
  // prompt is system-generated but a person left a note on it.
  const askerAvatar =
    promptCreator?.profilePicture ?? noteAuthor?.profilePicture ?? null;
  const askerName = creatorName ?? noteAuthorFirst;
  const askerId = promptCreator?._id ?? noteAuthor?._id;

  // Note popover state for the desktop prompt strip.
  const [notePopoverOpen, setNotePopoverOpen] = useState(false);
  const notePopoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!notePopoverOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!notePopoverRef.current?.contains(e.target as Node)) {
        setNotePopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [notePopoverOpen]);

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

  const lightboxItems: LightboxMediaItem[] = blocks
    .filter((b): b is Extract<ContentBlock, { type: "image" }> => b.type === "image")
    .map((b) => ({ type: b.type, url: b.url }));
  const mediaBlockIndexToLightboxIndex = new Map<number, number>();
  {
    let li = 0;
    blocks.forEach((b, bi) => {
      if (b.type === "image") {
        mediaBlockIndexToLightboxIndex.set(bi, li++);
      }
    });
  }

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

  // Desktop-only: portalled copy of Add Story + and ⋯ that render alongside
  // the page's "Story" title. Rendered here (not in the top action row) so
  // they sit outside the story column, matching Figma. Preview mode omits.
  const portalActions =
    portalMounted && !preview && actionsPortalRef?.current
      ? createPortal(
          <>
            <button
              type="button"
              onClick={handleAddStory}
              disabled={!promptId}
              className="cursor-pointer bg-[#ededed] border border-white rounded-full px-[16px] py-[8px] flex items-center gap-[8px] font-montserrat font-medium text-primary-blue text-[14px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Add Story
              <span className="text-[16px] leading-none">+</span>
            </button>
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                disabled={menuItems.length === 0}
                className="cursor-pointer bg-[#ededed] rounded-full h-[18px] px-[4px] flex items-center justify-center text-primary-blue hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MoreHorizontalIcon width={28} height={24} />
              </button>
              <OptionsMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                items={menuItems}
              />
            </div>
          </>,
          actionsPortalRef.current
        )
      : null;

  // Desktop-only music pill portal — sits centered in the page header row
  // between the "Story" title and the Add Story + / ⋯ actions.
  const portalMusic =
    portalMounted && musicPortalRef?.current && story?.music?.trackName
      ? createPortal(<MusicPill music={story.music} />, musicPortalRef.current)
      : null;

  const portalMobileMenu =
    portalMounted && !preview && mobileMenuPortalRef?.current
      ? createPortal(
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              disabled={menuItems.length === 0}
              className="cursor-pointer bg-[#f1f1f1] rounded-full w-[36px] h-[36px] flex items-center justify-center text-primary-blue hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MoreHorizontalIcon width={28} height={24} />
            </button>
            <OptionsMenu
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              items={menuItems}
            />
          </div>,
          mobileMenuPortalRef.current
        )
      : null;

  return (
    <>
      {portalActions}
      {portalMusic}
      {portalMobileMenu}

      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden lg:overflow-visible">
        {/* Mobile cover backdrop — full-bleed behind the sheet in Close state.
            Hidden on desktop (desktop shows cover inline inside the scroll
            container with its own aspect ratio). */}
        <div className="lg:hidden absolute inset-0 z-0 overflow-hidden bg-primary-blue/10">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : null}
        </div>

        {/* Desktop gutter arrows — live OUTSIDE the scroll container so
            they don't get clipped by its implicit overflow-x. Positioned
            against this relative wrapper which spans the full page width. */}
        {total > 1 && canPrev && (
          <button
            type="button"
            aria-label="Previous story"
            onClick={() => onSelectIndex(safeIndex - 1)}
            className="hidden xl:flex cursor-pointer absolute top-1/2 -translate-y-1/2 z-20 rounded-full bg-[#ededed] hover:bg-[#e3e3e3] transition-colors items-center justify-center text-primary-blue w-[52px] h-[52px] left-[16px] 2xl:left-[40px]"
          >
            <ChevronLeftIcon width={22} height={22} />
          </button>
        )}
        {total > 1 && canNext && (
          <button
            type="button"
            aria-label="Next story"
            onClick={() => onSelectIndex(safeIndex + 1)}
            className="hidden xl:flex cursor-pointer absolute top-1/2 -translate-y-1/2 z-20 rounded-full bg-[#ededed] hover:bg-[#e3e3e3] transition-colors items-center justify-center text-primary-blue w-[52px] h-[52px] right-[16px] 2xl:right-[40px]"
          >
            <ChevronRightIcon width={22} height={22} />
          </button>
        )}

      {/* Mobile bottom sheet (lg:contents = layout-inert on desktop, so scroll
          container + footer behave as direct flex children of the outer wrapper
          above lg). Below lg, this is an absolute-positioned sheet that
          translates between Close (top: 55%) and Open (top: 0). */}
      <div
        className="lg:contents absolute inset-x-0 bottom-0 z-10 flex flex-col bg-white shadow-[0_-6px_24px_rgba(0,0,0,0.08)] overflow-hidden"
        style={{
          // Animate `top` directly so `bottom: 0` stays pinned to the viewport
          // during drag — using `translateY` here would shift both edges and
          // reveal the cover backdrop below the sheet.
          top: `calc(${sheetOpen ? "0%" : "55%"} + ${dragOffset}px)`,
          borderTopLeftRadius: sheetOpen ? 0 : 24,
          borderTopRightRadius: sheetOpen ? 0 : 24,
          transition: dragging
            ? "none"
            : "top 320ms cubic-bezier(0.32, 0.72, 0, 1), border-radius 200ms ease-out",
        }}
        onTouchStart={handleSheetDragStart}
        onTouchMove={handleSheetDragMove}
        onTouchEnd={handleSheetDragEnd}
        onTouchCancel={handleSheetDragEnd}
      >
        {/* Drag handle — visual affordance only; the whole sheet is draggable. */}
        <div className="lg:hidden shrink-0 pt-[10px] pb-[6px] select-none">
          <div className="w-[40px] h-[4px] rounded-full bg-black/20 mx-auto" />
        </div>

      <div
        ref={sheetScrollRef}
        className={`flex-1 min-w-0 scrollbar-hide px-[24px] pt-[16px] lg:px-[40px] lg:max-w-[880px] lg:mx-auto lg:w-full ${sheetOpen ? "overflow-y-auto" : "overflow-hidden lg:overflow-y-auto"}`}
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
        {/* Mobile prompt pill — collapsible, matches mobile Figma. Hidden on
            Close state per Figma; shown once the sheet is Open. */}
        {hasPrompt && prompt && sheetOpen && (
          <div className="lg:hidden">
            <PromptPill
              promptContent={prompt.content || ""}
              showStarIcon={showStarIcon}
              creatorName={creatorName}
              creatorAvatar={promptCreator?.profilePicture ?? null}
            />
          </div>
        )}
        {/* Desktop prompt strip — always-visible horizontal bar: asker on left
            (avatar + name + note-indicator when a note exists), prompt content
            with star icon on right. Matches Figma "Open Story" frame. */}
        {hasPrompt && prompt && (
          <div className="hidden lg:flex items-center gap-[12px] rounded-full bg-[#f2f2f2] px-[16px] py-[10px] mb-[12px]">
            {askerName && (
              <div className="flex items-center gap-[10px] min-w-0">
                <div className="w-[36px] h-[36px] rounded-full overflow-hidden bg-primary-blue/15 shrink-0">
                  {askerAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bustUrl(
                        askerAvatar,
                        askerId === currentUser?._id
                          ? currentUser?.updatedAt
                          : undefined
                      )}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[13px]">
                      {askerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-montserrat font-semibold text-primary-blue text-[15px] truncate">
                  {askerName}
                </span>
                {hasPromptNote && (
                  <div className="relative shrink-0" ref={notePopoverRef}>
                    <button
                      type="button"
                      aria-label="View note"
                      aria-expanded={notePopoverOpen}
                      onClick={() => setNotePopoverOpen((v) => !v)}
                      className="cursor-pointer inline-flex items-center justify-center text-primary-blue hover:opacity-80 transition-opacity"
                    >
                      <NoteIcon width={19} height={19} />
                    </button>
                    {notePopoverOpen && (
                      <div className="absolute top-full left-0 mt-[10px] z-30 w-[280px] rounded-[16px] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.12)] border border-black/[0.06] p-[14px]">
                        <div className="font-montserrat font-semibold text-primary-blue text-[14px] mb-[6px]">
                          {noteAuthorFirst}&apos;s note
                        </div>
                        <div className="font-montserrat text-primary-blue text-[13px] leading-[18px] whitespace-pre-wrap">
                          {promptNote}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className={`flex items-center gap-[10px] min-w-0 ${askerName ? "ml-auto" : ""}`}>
              <PromptIcon width={22} height={22} />
              <span className="font-montserrat text-primary-blue text-[15px] truncate">
                {prompt.content}
              </span>
            </div>
          </div>
        )}
        {/* Mobile only — desktop shows the note via a popover from the
            prompt strip's NoteIcon button (above). Hidden on Close per Figma. */}
        {hasPromptNote && noteAuthor && sheetOpen && (
          <div className="lg:hidden">
            <NotePill
              note={promptNote}
              authorFirstName={noteAuthorFirst!}
              authorAvatar={noteAuthor.profilePicture ?? null}
            />
          </div>
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
                  i === safeIndex
                    ? "bg-primary-blue"
                    : "bg-[#dbdbdb] hover:bg-primary-blue/30"
                }`}
              />
            ))}
          </div>
        )}

        <div className="hidden lg:block relative mb-[20px] mt-[8px]">
          <div className="relative rounded-[24px] overflow-hidden bg-primary-blue/10 lg:h-auto lg:aspect-[802/509]">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : null}
          </div>
          {/* Prev/Next arrows — overlap cover corners on smaller viewports;
              move into the page gutters on xl+ (52×52 grey circles). */}
          {total > 1 && canPrev && (
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => onSelectIndex(safeIndex - 1)}
              className="xl:hidden cursor-pointer absolute top-1/2 -translate-y-1/2 z-10 rounded-full bg-[#ededed] flex items-center justify-center text-primary-blue hover:bg-[#e3e3e3] transition-colors w-[36px] h-[36px] left-[8px]"
            >
              <ChevronLeftIcon width={18} height={18} />
            </button>
          )}
          {total > 1 && canNext && (
            <button
              type="button"
              aria-label="Next story"
              onClick={() => onSelectIndex(safeIndex + 1)}
              className="xl:hidden cursor-pointer absolute top-1/2 -translate-y-1/2 z-10 rounded-full bg-[#ededed] flex items-center justify-center text-primary-blue hover:bg-[#e3e3e3] transition-colors w-[36px] h-[36px] right-[8px]"
            >
              <ChevronRightIcon width={18} height={18} />
            </button>
          )}
        </div>

        {/* Mobile Open — Figma layout: author row on top (avatar + name /
            location) with Add Story pill on the right; title below. */}
            <div className="lg:hidden">
              {resolvedAuthor && (
                <div className="flex items-center gap-[12px]">
                  <div className="w-[40px] h-[40px] rounded-full overflow-hidden bg-primary-blue/15 shrink-0">
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
                      <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[14px]">
                        {(resolvedAuthor.firstName || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-montserrat font-semibold text-primary-blue text-[16px] leading-[20px] truncate">
                      {authorName}
                    </div>
                    {(() => {
                      // Per Figma: Close = timestamp, Open = location.
                      const subtitle = sheetOpen
                        ? story?.location?.city ||
                          story?.location?.formattedAddress ||
                          story?.location?.country ||
                          ""
                        : formatStoryHeaderDate(story?.createdAt);
                      if (!subtitle) return null;
                      return (
                        <div className="font-montserrat text-[#848484] text-[13px] leading-[16px] truncate">
                          {subtitle}
                        </div>
                      );
                    })()}
                  </div>
                  {!preview && (
                    <button
                      type="button"
                      onClick={handleAddStory}
                      disabled={!promptId}
                      className="cursor-pointer bg-[#ededed] rounded-full px-[14px] py-[8px] flex items-center gap-[6px] font-montserrat font-medium text-primary-blue text-[13px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      Add Story
                      <span className="text-[15px] leading-none">+</span>
                    </button>
                  )}
                </div>
              )}
              {story?.title && (
                <h2 className="font-montserrat font-bold text-primary-blue text-[22px] leading-[28px] mt-[16px]">
                  {story.title}
                </h2>
              )}
            </div>

            {/* Desktop (lg+) — Figma layout: title standalone (H4), author row
                below with avatar 53 + name (H5 Medium 24) + subtitle stacked
                (timestamp, with · location appended when set). */}
            <div className="hidden lg:block">
              {story?.title && (
                <h2 className="font-montserrat font-bold text-primary-blue text-[24px] leading-[32px]">
                  {story.title}
                </h2>
              )}
              {resolvedAuthor && (
                <div className="flex items-center gap-[12px] mt-[14px]">
                  <div className="w-[42px] h-[42px] rounded-full overflow-hidden bg-primary-blue/15 border-[2px] border-white shrink-0">
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
                      <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[16px]">
                        {(resolvedAuthor.firstName || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-montserrat font-medium text-primary-blue text-[18px] leading-[24px] truncate">
                      {authorName}
                    </div>
                    {(() => {
                      const time = formatStoryHeaderDate(story?.createdAt);
                      const loc =
                        story?.location?.city ||
                        story?.location?.formattedAddress ||
                        story?.location?.country ||
                        "";
                      const subtitle = loc ? `${time} · ${loc}` : time;
                      if (!subtitle) return null;
                      return (
                        <div className="font-montserrat text-[#848484] text-[12px] leading-[16px] mt-[2px] truncate">
                          {subtitle}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

        <div className="mt-[18px] mb-[24px] flex flex-col gap-[16px]">
          {blocks.map((block, i) => {
            const li = mediaBlockIndexToLightboxIndex.get(i);
            return (
              <BodyBlock
                key={i}
                block={block}
                storyTitle={story?.title || undefined}
                onOpenMedia={
                  li !== undefined ? () => setLightboxIndex(li) : undefined
                }
              />
            );
          })}
        </div>
      </div>

      <div className={`shrink-0 px-[24px] lg:px-[40px] py-[14px] border-t border-black/[0.06] bg-white items-center justify-between text-primary-blue/80 font-montserrat lg:max-w-[880px] lg:mx-auto lg:w-full ${sheetOpen ? "flex" : "hidden lg:flex"}`}>
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
          <div className="flex items-center gap-[6px]">
            <button
              type="button"
              onClick={handleLikeToggle}
              aria-label={isLiked ? "Unlike" : "Like"}
              className={`cursor-pointer flex items-center transition-opacity hover:opacity-80 ${
                isLiked ? "text-[#D95F3B]" : "text-primary-blue"
              }`}
            >
              <HeartIcon width={20} height={20} filled={isLiked} />
            </button>
            {likeCount > 0 && (
              <button
                type="button"
                onClick={() => setLikesDrawerOpen(true)}
                aria-label="See who liked this"
                className={`cursor-pointer text-[14px] font-medium hover:underline ${
                  isLiked ? "text-[#D95F3B]" : "text-primary-blue"
                }`}
              >
                {likeCount}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
      </div>

      <ConfirmationModal
        open={deleteConfirmOpen}
        title={isSent ? "Delete Lag" : "Remove from your feed"}
        body={
          isSent
            ? "Deleted stories are stored for 30 days"
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

      <MediaLightbox
        open={lightboxIndex !== null}
        items={lightboxItems}
        startIndex={lightboxIndex ?? 0}
        storyTitle={story?.title || undefined}
        canDelete={isSent}
        onClose={() => setLightboxIndex(null)}
      />

      <StoryLikesDrawer
        open={likesDrawerOpen}
        likes={override?.likes ?? story?.likes ?? []}
        onClose={() => setLikesDrawerOpen(false)}
      />

      <CommentsModal
        open={commentsOpen}
        storyId={storyId || null}
        currentUser={currentUser}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => setCommentCountDelta((d) => d + 1)}
        onCommentDeleted={() => setCommentCountDelta((d) => d - 1)}
        onTotalKnown={(total) => setCommentTotalOverride(total)}
        storyTitle={story?.title ?? undefined}
        storyAuthor={
          resolvedAuthor
            ? {
                firstName: resolvedAuthor.firstName,
                lastName: resolvedAuthor.lastName,
                profilePicture: resolvedAuthor.profilePicture,
              }
            : null
        }
        storyCreatedAt={story?.createdAt}
        storyContent={story?.content ?? undefined}
        storyCoverUrl={coverUrl}
      />
    </>
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
        <div className="w-[32px] h-[32px] flex items-center justify-center shrink-0 text-primary-blue">
          <PromptIcon width={28} height={28} />
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
  onOpenMedia,
}: {
  block: ContentBlock;
  storyTitle?: string;
  onOpenMedia?: () => void;
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
    <div
      className={`mx-auto max-w-[300px] md:max-w-[420px] w-full ${
        onOpenMedia ? "cursor-pointer" : ""
      }`}
      onClick={onOpenMedia}
      role={onOpenMedia ? "button" : undefined}
      tabIndex={onOpenMedia ? 0 : undefined}
      onKeyDown={
        onOpenMedia
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onOpenMedia();
            }
          : undefined
      }
    >
      <StoryMedia
        item={{ type: block.type, url: block.url }}
        storyTitle={storyTitle}
      />
    </div>
  );
}

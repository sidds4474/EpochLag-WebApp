"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Avatar from "../../components/Avatar";
import CommentsModal from "../../components/CommentsModal/CommentsModal";
import ConfirmationModal from "../../components/ConfirmationModal/ConfirmationModal";
import OptionsMenu, {
  type OptionsMenuItem,
} from "../../components/OptionsMenu/OptionsMenu";
import SendToDrawer from "../../components/share/SendToDrawer";
import { ApiError } from "../../lib/api/client";
import { deleteStory, shareStory } from "../../lib/create/api";
import { toggleStoryLike } from "../../lib/interactions/api";
import { parseContentToBlocks } from "../../lib/parseStoryContent";
import MusicPill from "./MusicPill";
import { threadHasRealPrompt } from "./threadPrompt";
import type { ContentBlock } from "../../types/story";
import type {
  Story,
  StoryAuthor,
  ThreadParticipant,
  ThreadResponse,
} from "../../types/home";
import type { User } from "../../types/user";
import MediaLightbox, { type LightboxMediaItem } from "./MediaLightbox";
import StoryLikesDrawer from "./StoryLikesDrawer";
import ManageStoryParticipantsModal from "./ManageStoryParticipantsModal";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatIcon,
  HeartIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  TrashIcon,
} from "../../app/(app)/(dashboard)/icons";

// ThreadViewerV2 — matches the designer's Figma for the Lag view.
// The old ThreadViewer (carousel-oriented, 1300 lines) stays intact until
// this one is approved end-to-end. Scope: Figma-pixel layout + rewire the
// same handlers against the same modals (CommentsModal, StoryLikesDrawer,
// OptionsMenu, SendToDrawer, ConfirmationModal, MediaLightbox,
// ManageStoryParticipantsModal). All of those stay as-is.
//
// What's deliberately simpler than V1:
//   - No horizontal swipe between stories; parent still owns activeIndex.
//   - No portalled music/actions; everything lives in the single scroll.
//   - No bottom-sheet drag on mobile; the layout flows naturally instead.
//   - No chain-depth back; router.back() is good enough on web.

type Props = {
  data: ThreadResponse;
  activeIndex: number;
  onSelectIndex: (i: number) => void;
  currentUser: User | null;
  onStoryDeleted?: (storyId: string) => void;
  preview?: boolean;
};

export default function ThreadViewerV2({
  data,
  activeIndex,
  onSelectIndex,
  currentUser,
  onStoryDeleted,
  preview = false,
}: Props) {
  const router = useRouter();
  const currentUserId = currentUser?._id ?? "";
  const stories = data.stories ?? [];
  const total = stories.length;
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(total - 1, 0));
  const story: Story | undefined = stories[safeIndex];
  const threadId = data.thread?._id ?? "";
  const participants: ThreadParticipant[] = data.thread?.participants ?? [];
  const isPrivateThread = data.thread?.isPrivate === true;
  const storyId = story?._id ?? "";
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < total - 1;

  // -------------------- derived state --------------------
  const isSent = !!(
    currentUserId &&
    (story?.author?._id === currentUserId || (!story?.author && !preview))
  );
  const canShare = isSent || !isPrivateThread;

  // -------------------- modal state --------------------
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likesDrawerOpen, setLikesDrawerOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [commentTotalOverride, setCommentTotalOverride] = useState<
    number | null
  >(null);
  const [commentCountDelta, setCommentCountDelta] = useState(0);

  useEffect(() => {
    setCommentsOpen(false);
    setCommentTotalOverride(null);
    setCommentCountDelta(0);
  }, [storyId]);

  // -------------------- likes --------------------
  const [likeOverrides, setLikeOverrides] = useState<
    Record<
      string,
      {
        liked: boolean;
        count: number;
        likes?: import("../../types/home").StoryLike[];
      }
    >
  >({});
  const likePending = useRef<Record<string, boolean>>({});

  const override = storyId ? likeOverrides[storyId] : undefined;
  const isLiked =
    override?.liked ??
    (story?.isLikedByMe === true ||
      (!!story?.likes?.length &&
        !!currentUserId &&
        story.likes.some((l) => l._id === currentUserId)));
  const likeCount =
    override?.count ??
    story?.totalLikes ??
    story?.likes?.length ??
    story?.likesCount ??
    0;

  const handleLikeToggle = useCallback(async () => {
    if (preview || !storyId) return;
    if (likePending.current[storyId]) return;
    likePending.current[storyId] = true;
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
      toast.error("Couldn’t update like");
    } finally {
      likePending.current[storyId] = false;
    }
  }, [
    preview,
    storyId,
    isLiked,
    likeCount,
    override,
    story?.likes,
    currentUser,
    currentUserId,
  ]);

  // -------------------- comments --------------------
  const commentsCount =
    commentTotalOverride ??
    Math.max(0, (story?.commentsCount ?? 0) + commentCountDelta);

  // -------------------- handlers --------------------
  function handleEdit() {
    if (!storyId) return;
    router.push(`/edit/${storyId}?thread=${threadId}`);
  }

  async function handleDeleteConfirmed() {
    if (!storyId) return;
    try {
      await deleteStory(storyId);
      toast.success(isSent ? "Lag deleted" : "Removed from your feed");
      setDeleteConfirmOpen(false);
      if (!isSent || total <= 1 || !onStoryDeleted) {
        router.back();
        return;
      }
      onStoryDeleted(storyId);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Couldn’t delete. Try again.";
      toast.error(msg);
    }
  }

  async function handleShareSend(
    userIds: string[],
    groupIds: string[],
    _note: string,
  ) {
    if (!storyId) return;
    try {
      await shareStory(storyId, {
        userIds,
        groupIds,
        sendSeparately: false,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send. Please try again.";
      throw new Error(message);
    }
  }

  // -------------------- menu items --------------------
  const menuItems: OptionsMenuItem[] = [];
  if (!preview && isSent && storyId) {
    menuItems.push({
      label: "Edit Lag",
      onClick: handleEdit,
      icon: <PencilIcon width={18} height={18} />,
    });
  }
  if (!preview && isSent && storyId) {
    menuItems.push({
      label: "Delete Lag",
      onClick: () => setDeleteConfirmOpen(true),
      destructive: true,
      icon: <TrashIcon width={18} height={18} />,
    });
  } else if (!preview && !isSent && storyId) {
    menuItems.push({
      label: "Delete for Me",
      onClick: () => setDeleteConfirmOpen(true),
      destructive: true,
      icon: <TrashIcon width={18} height={18} />,
    });
  }
  if (!preview && canShare && storyId) {
    menuItems.push({
      label: "Share Story",
      onClick: () => setShareOpen(true),
      icon: <SendIcon width={18} height={18} />,
    });
  }

  // -------------------- content parsing --------------------
  const blocks = useMemo(
    () => parseContentToBlocks(story?.content || ""),
    [story?.content],
  );

  const imageBlocks = useMemo(
    () =>
      blocks.filter(
        (b): b is Extract<ContentBlock, { type: "image" }> =>
          b.type === "image",
      ),
    [blocks],
  );

  const lightboxItems: LightboxMediaItem[] = imageBlocks.map((b) => ({
    type: b.type,
    url: b.url,
  }));
  const imageIndexMap = useMemo(() => {
    const m = new Map<number, number>();
    let li = 0;
    blocks.forEach((b, bi) => {
      if (b.type === "image") {
        m.set(bi, li++);
      }
    });
    return m;
  }, [blocks]);

  // -------------------- author --------------------
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

  const publishedDate = formatDate(story?.createdAt);
  const memoryDate = formatDate(story?.dateOfStory);
  const locationText = formatLocation(story?.location);

  // -------------------- hero media --------------------
  // BE sometimes returns story.cover (and similar fields) as an object
  // { imageUrl, video, source } instead of a bare string. Normalise any
  // shape to a URL string so <img src> doesn't get [object Object].
  const firstImage = imageBlocks[0] ?? null;
  const firstStoryMedia = story?.media?.[0];
  const heroMediaUrl =
    pickUrl(story?.coverImage) ||
    pickUrl(story?.cover) ||
    pickUrl(story?.imageUrl) ||
    pickUrl(firstStoryMedia) ||
    firstImage?.url ||
    null;

  // Audio blocks come through parseContentToBlocks (interleaved with text/
  // image), so no separate top-level audio section — they render inline below.

  // -------------------- viewers --------------------
  const viewers: ThreadParticipant[] =
    (story?.viewers as ThreadParticipant[] | undefined)?.length
      ? (story!.viewers as ThreadParticipant[])
      : participants;
  const viewerSlice = viewers.slice(0, 3);
  const viewerOverflow = Math.max(0, viewers.length - viewerSlice.length);

  // Guard: if no stories yet, render minimal shell.
  if (!story) {
    return (
      <div className="min-h-full flex items-center justify-center text-[#848484] font-montserrat text-[14px]">
        Nothing to show yet.
      </div>
    );
  }

  return (
    <div className="bg-[#F3F1EB] min-h-full">
      <div className="mx-auto max-w-[920px] px-[16px] sm:px-[24px] md:px-[40px] pt-[20px] pb-[48px]">
        {/* ---------- Top toolbar ---------- */}
        <div className="flex items-center justify-between gap-[12px]">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="w-[40px] h-[40px] rounded-full flex items-center justify-center hover:bg-black/[0.04] transition-colors"
          >
            <ChevronLeftIcon width={22} height={22} />
          </button>

          {/* View more pill — center. Routes up to PromptViewer so the user
              sees sibling responses to the same question. Hidden on
              story-only threads: those have no prompt hub to route to, and
              PromptViewerPage would just redirect right back. */}
          {threadId && threadHasRealPrompt(data) && (
            <button
              type="button"
              onClick={() => router.push(`/thread/${threadId}`)}
              className="px-[18px] py-[8px] rounded-full border border-[#2C2C2C]/25 bg-transparent font-montserrat text-[13px] md:text-[14px] text-[#2C2C2C] hover:bg-black/[0.03] transition-colors"
            >
              View more
            </button>
          )}

          <div className="relative">
            {menuItems.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="More options"
                  className="w-[40px] h-[40px] rounded-full flex items-center justify-center hover:bg-black/[0.04] transition-colors"
                >
                  <MoreHorizontalIcon width={22} height={22} />
                </button>
                <OptionsMenu
                  open={menuOpen}
                  items={menuItems}
                  onClose={() => setMenuOpen(false)}
                  align="right"
                />
              </>
            )}
          </div>
        </div>

        {/* ---------- Title ---------- */}
        {story.title && (
          <h1 className="mt-[12px] md:mt-[16px] font-ivy font-normal text-center text-[#232323] text-[28px] md:text-[32px] leading-[1.15]">
            {story.title}
          </h1>
        )}

        {/* ---------- Hero polaroid ---------- */}
        {heroMediaUrl && (
          <HeroPolaroid src={heroMediaUrl} />
        )}

        {/* ---------- Author row ---------- */}
        {resolvedAuthor && (
          <div className="mt-[22px] md:mt-[28px] flex flex-wrap items-center gap-y-[10px] gap-x-[14px] justify-between">
            <div className="flex items-center gap-[12px]">
              <Avatar user={resolvedAuthor} size={36} />
              <div className="leading-tight">
                <p className="font-ivy text-[#232323] text-[16px] md:text-[18px] leading-[1.2]">
                  {authorName || "Shared"}
                </p>
                {publishedDate && (
                  <p className="font-montserrat text-[#848484] text-[12px] md:text-[13px]">
                    {publishedDate}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              {memoryDate && <Pill>{memoryDate}</Pill>}
              {locationText && <Pill>{locationText}</Pill>}
            </div>
          </div>
        )}

        {/* ---------- Body ---------- */}
        <div className="mt-[22px] md:mt-[28px] space-y-[16px] md:space-y-[20px]">
          {blocks.map((b, i) => {
            if (b.type === "image") {
              return (
                <GalleryTile
                  key={`img-${i}`}
                  blocks={blocks}
                  index={i}
                  indexMap={imageIndexMap}
                  onOpen={(li) => setLightboxIndex(li)}
                />
              );
            }
            if (b.type === "video") {
              return <InlineVideo key={`vid-${i}`} src={b.url} />;
            }
            if (b.type === "audio") {
              return <VoicePlayer key={`audio-${i}`} src={b.url} />;
            }
            if (b.type === "text") {
              return (
                <BodyParagraph key={`txt-${i}`} text={b.text} isFirst={i === 0} />
              );
            }
            return null;
          })}
        </div>

        {/* ---------- Footer ---------- */}
        <div className="mt-[32px] md:mt-[40px] border-t border-[#C9C9C9]/70 pt-[16px] md:pt-[20px] flex items-center justify-between gap-[16px]">
          <button
            type="button"
            onClick={() => viewers.length > 0 && setParticipantsOpen(true)}
            disabled={viewers.length === 0}
            className="flex items-center -space-x-[8px] disabled:cursor-default"
            aria-label="View participants"
          >
            {viewerSlice.map((v, i) => (
              <span
                key={v._id || i}
                className="w-[28px] h-[28px] rounded-full border-2 border-white overflow-hidden"
              >
                <Avatar user={v} size={28} />
              </span>
            ))}
            {viewerOverflow > 0 && (
              <span className="w-[28px] h-[28px] rounded-full border-2 border-white bg-[#848484] text-white font-montserrat text-[11px] flex items-center justify-center">
                +{viewerOverflow}
              </span>
            )}
          </button>

          {story?.music?.trackName && (
            <div className="flex-1 flex justify-center min-w-0">
              <MusicPill music={story.music} />
            </div>
          )}

          <div className="flex items-center gap-[16px]">
            <button
              type="button"
              onClick={() => storyId && setCommentsOpen(true)}
              className="flex items-center gap-[6px] text-[#2C2C2C] hover:text-primary-orange transition-colors"
              aria-label="Open comments"
            >
              <ChatIcon width={20} height={20} />
              {commentsCount > 0 && (
                <span className="font-montserrat text-[13px]">
                  {commentsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleLikeToggle}
              disabled={preview || !storyId}
              aria-pressed={isLiked}
              aria-label={isLiked ? "Unlike" : "Like"}
              className="flex items-center gap-[6px] text-[#2C2C2C] hover:text-primary-orange transition-colors disabled:opacity-40"
            >
              <HeartIcon
                width={20}
                height={20}
                className={isLiked ? "text-primary-orange fill-primary-orange" : ""}
              />
              {likeCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLikesDrawerOpen(true);
                  }}
                  className="font-montserrat text-[13px]"
                >
                  {likeCount}
                </button>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* ---------- Modals ---------- */}
      <ConfirmationModal
        open={deleteConfirmOpen}
        title={isSent ? "Delete Lag" : "Remove from your feed"}
        body={
          isSent
            ? "Deleted stories are stored for 30 days"
            : "You’ll no longer see this story. Others on the thread will still see it."
        }
        confirmLabel={isSent ? "Delete" : "Remove"}
        destructive
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirmed}
      />

      <SendToDrawer
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onSend={handleShareSend}
        shareContext="story"
        showMessageInput={false}
        existingMembers={participants
          .filter((p) => p._id && p._id !== currentUserId)
          .map((p) => p._id!)}
        shareTarget={storyId ? { kind: "story", id: storyId } : undefined}
      />

      <CommentsModal
        open={commentsOpen}
        storyId={storyId || null}
        currentUser={currentUser}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => setCommentCountDelta((d) => d + 1)}
        onCommentDeleted={() => setCommentCountDelta((d) => d - 1)}
        onTotalKnown={(t) => setCommentTotalOverride(t)}
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
        storyCoverUrl={heroMediaUrl}
      />

      <StoryLikesDrawer
        open={likesDrawerOpen}
        onClose={() => setLikesDrawerOpen(false)}
        likes={override?.likes ?? story?.likes ?? []}
      />

      <ManageStoryParticipantsModal
        open={participantsOpen}
        onClose={() => setParticipantsOpen(false)}
        threadId={threadId}
        storyId={storyId || null}
        promptContent={story?.title ?? null}
        participants={participants}
        currentUserId={currentUserId}
        creatorId={resolvedAuthor?._id ?? null}
        isPrivateInitial={isPrivateThread}
      />

      <MediaLightbox
        open={lightboxIndex !== null}
        items={lightboxItems}
        startIndex={lightboxIndex ?? 0}
        storyTitle={story?.title ?? undefined}
        canDelete={isSent}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

// ---------- helpers ----------

// Normalise a cover/media field into a URL string. The BE returns these as
// either a bare string OR an object like { imageUrl, video, url, thumbnail,
// cover, source }, depending on the endpoint. Try the common keys in order
// so the renderer doesn't have to care which shape it got.
function pickUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const candidates = [
    v.imageUrl,
    v.url,
    v.cover,
    v.coverImage,
    v.thumbnail,
    v.video,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c) return c;
  }
  return null;
}

// Cloudinary + sp_auto emits a `.m3u8` HLS playlist. Safari plays HLS
// natively via the `src` attribute; Chrome / Firefox / Edge need hls.js to
// parse the playlist and feed MSE. Non-HLS URLs (plain mp4 / webm) go
// straight to the `src` attribute on every browser.
function InlineVideo({ src }: { src: string }) {
  const isHls = /\.m3u8(\?|$)/.test(src);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (!isHls) return;
    const el = videoRef.current;
    if (!el || !src) return;

    let cancelled = false;
    let hls: { destroy: () => void } | null = null;
    (async () => {
      const mod = await import("hls.js");
      if (cancelled) return;
      const Hls = mod.default;
      if (Hls.isSupported()) {
        const instance = new Hls();
        hls = instance;
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setBroken(true);
        });
        instance.loadSource(src);
        instance.attachMedia(el);
      } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = src;
      } else {
        setBroken(true);
      }
    })();

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [src, isHls]);

  if (broken) return null;
  return (
    <div className="rounded-[6px] overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={isHls ? undefined : src}
        controls
        playsInline
        preload="metadata"
        className="w-full aspect-video object-cover block"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

function HeroPolaroid({ src }: { src: string }) {
  // Hide the whole polaroid if the image URL doesn't resolve — a broken
  // image icon in a huge card looks worse than no card at all. Reset on
  // src change so a transient error on one story doesn't suppress the
  // polaroid on the next.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (broken) return null;
  return (
    <div className="mt-[20px] md:mt-[28px] flex justify-center">
      <div
        className="bg-white shadow-[0_8px_18px_rgba(0,0,0,0.15)] p-[10px] pb-[16px] md:p-[12px] md:pb-[18px] w-full max-w-[360px] md:max-w-[420px]"
        style={{ transform: "rotate(-0.4deg)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="w-full aspect-square object-cover block bg-[#efede5]"
          loading="eager"
          onError={() => setBroken(true)}
        />
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-[12px] py-[4px] rounded-full border border-[#2C2C2C]/25 font-montserrat text-[11px] md:text-[12px] text-[#2C2C2C]">
      {children}
    </span>
  );
}

function BodyParagraph({
  text,
  isFirst,
}: {
  text: string;
  isFirst: boolean;
}) {
  if (!text?.trim()) return null;
  const trimmed = text.trimStart();
  if (!isFirst || trimmed.length === 0) {
    return (
      <p className="font-ivy text-[#232323] text-[16px] md:text-[17px] leading-[1.6] whitespace-pre-line">
        {text}
      </p>
    );
  }
  // Drop cap on the first paragraph's first letter.
  const first = trimmed.charAt(0);
  const rest = trimmed.slice(1);
  return (
    <p className="font-ivy text-[#232323] text-[16px] md:text-[17px] leading-[1.6] whitespace-pre-line">
      <span
        className="float-left font-ivy text-[#232323] mr-[6px] leading-[0.85]"
        style={{ fontSize: "3.2em", fontWeight: 400 }}
      >
        {first}
      </span>
      {rest}
    </p>
  );
}

function GalleryTile({
  blocks,
  index,
  indexMap,
  onOpen,
}: {
  blocks: ContentBlock[];
  index: number;
  indexMap: Map<number, number>;
  onOpen: (lightboxIndex: number) => void;
}) {
  // Pair consecutive image blocks into a 2-col grid; a lone trailing image
  // renders single-column at full width of the article.
  const current = blocks[index];
  const prev = blocks[index - 1];
  const next = blocks[index + 1];
  if (current?.type !== "image") return null;
  // Skip the second image of a pair — the first renders both.
  if (prev?.type === "image") return null;

  const lightboxIdx = indexMap.get(index) ?? 0;
  const items: { url: string; lightboxIdx: number }[] = [
    { url: current.url, lightboxIdx },
  ];
  if (next?.type === "image") {
    items.push({
      url: next.url,
      lightboxIdx: indexMap.get(index + 1) ?? lightboxIdx + 1,
    });
  }

  if (items.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(items[0].lightboxIdx)}
        className="block w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={items[0].url}
          alt=""
          className="w-full aspect-[16/10] object-cover rounded-[6px]"
          loading="lazy"
        />
      </button>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-[10px]">
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onOpen(it.lightboxIdx)}
          className="block w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={it.url}
            alt=""
            className="w-full aspect-square object-cover rounded-[6px]"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
}

function VoicePlayer({
  src,
  duration,
}: {
  src: string;
  duration?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState<number | null>(duration ?? null);
  const ref = useRef<HTMLAudioElement | null>(null);

  const bars = useMemo(
    () => [
      6, 14, 9, 22, 11, 18, 7, 26, 13, 20, 8, 24, 10, 16, 5, 28, 12, 21, 7,
      17, 25, 9, 19, 14, 23, 6, 15, 27, 10, 18, 8, 22, 13, 20, 5, 16, 24, 11,
      19, 7,
    ],
    [],
  );

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play();
    else el.pause();
  }

  return (
    <div className="inline-flex items-center gap-[12px] bg-white rounded-full pl-[6px] pr-[18px] py-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] max-w-[480px]">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="w-[40px] h-[40px] rounded-full bg-[#FCD6A5] p-[7px] flex items-center justify-center shrink-0"
      >
        <span className="w-full h-full rounded-full bg-[#EF9849] flex items-center justify-center">
          {playing ? (
            <span className="flex items-center gap-[2px]">
              <span className="w-[3px] h-[12px] bg-white rounded-sm" />
              <span className="w-[3px] h-[12px] bg-white rounded-sm" />
            </span>
          ) : (
            <span className="border-l-[11px] border-l-white border-y-[8px] border-y-transparent ml-[2px]" />
          )}
        </span>
      </button>
      <div
        className="flex items-center gap-[1.5px] flex-1 min-w-0"
        aria-hidden="true"
      >
        {bars.map((h, i) => {
          const played = total ? progress / total > i / bars.length : false;
          return (
            <span
              key={i}
              className={`w-[1.5px] rounded-full ${played ? "bg-primary-orange" : "bg-[#2C2C2C]"}`}
              style={{ height: h }}
            />
          );
        })}
      </div>
      <span className="font-montserrat text-[#2C2C2C] text-[13px] tabular-nums shrink-0">
        {formatDuration(progress || total || 0)}
      </span>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onLoadedMetadata={(e) =>
          setTotal(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : null)
        }
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
      />
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatLocation(
  loc?: { formattedAddress?: string | null; city?: string | null; country?: string | null } | null,
): string {
  if (!loc) return "";
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  return loc.city || loc.country || "";
}

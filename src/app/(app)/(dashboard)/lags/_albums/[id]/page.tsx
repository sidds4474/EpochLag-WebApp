"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  addAlbumParticipants,
  albumCreatorId,
  attachAlbumThreads,
  deleteAlbum,
  detachAlbumThreads,
  fetchAlbum,
  fetchAlbumThreads,
  fetchAlbums,
  fetchThreadPromptTitle,
  getCachedAlbum,
  leaveAlbum,
  renameAlbum,
  type AlbumDetail,
  type LibraryThread,
} from "../../../../../../lib/library/api";
import { useAuth } from "../../../../../../lib/auth/AuthProvider";
import { bustUrl } from "../../../../../../lib/images";
import ConfirmationModal from "../../../../../../components/ConfirmationModal/ConfirmationModal";
import ShareModal from "../../../new-story/ShareModal";
import StoryCard from "../../StoryCard";
import { useSelectMode } from "../../selectMode";
import RenameAlbumModal from "./RenameAlbumModal";
import AddStoryChooserModal from "./AddStoryChooserModal";
import ExistingStoryPickerModal from "./ExistingStoryPickerModal";
import type { PersonSummary } from "../../../../../../types/home";

const PAGE_SIZE = 10;

// Same key resolver used across Stories — latestStory._id is the id sent
// to detach/attach endpoints, falling back to the thread's own _id.
function cardKeyFor(thread: LibraryThread): string {
  return thread.latestStory?._id ?? thread._id;
}

export default function AlbumDetailPage() {
  const params = useParams<{ id: string }>();
  const albumId = params?.id ?? "";
  const router = useRouter();
  const { user } = useAuth();
  const {
    isSelecting,
    setCanSelect,
    toggle: toggleSelectMode,
    exit: exitSelect,
    setHeaderRight,
  } = useSelectMode();

  // Seed from the list cache so the page renders instantly on tap-through,
  // even before (or if) the detail metadata endpoint responds.
  const [album, setAlbum] = useState<AlbumDetail | null>(() =>
    albumId ? getCachedAlbum(albumId) : null
  );
  const [albumError, setAlbumError] = useState<string | null>(null);
  const [threads, setThreads] = useState<LibraryThread[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDetachOpen, setConfirmDetachOpen] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = user?._id ?? "";
  const creatorId = album ? albumCreatorId(album) : null;
  const isCreator = !!creatorId && creatorId === currentUserId;
  const isParticipant = !!album?.participants?.some(
    (p) => p._id === currentUserId
  );
  const canShare = isCreator || (isParticipant && !album?.isPrivate);

  // Metadata refresh — the list cache already gave us title/participants,
  // so this is a best-effort refresh. 404 = deleted (bounce). 400 = known
  // BE flake on some albums; fall back to the albums list (same tile-level
  // data the mobile app relies on) so the title / participants still render.
  useEffect(() => {
    if (!albumId) return;
    let cancelled = false;
    fetchAlbum(albumId)
      .then((detail) => {
        if (!cancelled) setAlbum(detail);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 404) {
          toast.error("This album is no longer available");
          router.push("/lags/albums");
          return;
        }
        if (status === 400) {
          console.warn("[album detail] metadata 400 (BE flake)", err);
          // If we came in via a deep link, the list cache is empty. Pull
          // the list once so we still have a real title + participants.
          if (getCachedAlbum(albumId)) return;
          fetchAlbums({ page: 1, limit: 50 })
            .then((rows) => {
              if (cancelled) return;
              const match = rows.find((a) => a._id === albumId);
              setAlbum(
                match ?? { _id: albumId, title: "Album", participants: [] }
              );
            })
            .catch(() => {
              if (cancelled) return;
              setAlbum(
                (prev) =>
                  prev ?? { _id: albumId, title: "Album", participants: [] }
              );
            });
          return;
        }
        setAlbumError(
          err instanceof Error ? err.message : "Couldn't load album"
        );
      });
    return () => {
      cancelled = true;
    };
  }, [albumId, router]);

  const loadPage = useCallback(
    async (nextPage: number) => {
      if (!albumId) return;
      setLoading(true);
      try {
        const { threads: fresh } = await fetchAlbumThreads(albumId, {
          page: nextPage,
          limit: PAGE_SIZE,
        });
        setThreads((prev) => {
          const seen = new Set(prev.map((t) => t._id));
          return [...prev, ...fresh.filter((t) => !seen.has(t._id))];
        });
        setPage(nextPage);
        setHasMore(fresh.length === PAGE_SIZE);

        // Title backfill — album-threads responses can arrive with missing
        // prompt title/content (typical for stories created via album flow).
        // Fetch each such thread's prompt separately and patch it in.
        const needsBackfill = fresh.filter((t) => {
          const pc = t.promptCard;
          const hasTitle = pc?.title || pc?.content || t.latestStory?.title;
          return !hasTitle;
        });
        for (const t of needsBackfill) {
          fetchThreadPromptTitle(t._id).then((prompt) => {
            if (!prompt?.title) return;
            setThreads((prev) =>
              prev.map((row) =>
                row._id === t._id
                  ? {
                      ...row,
                      promptCard: {
                        ...(row.promptCard ?? {}),
                        title: prompt.title ?? row.promptCard?.title ?? null,
                        content:
                          row.promptCard?.content ?? prompt.title ?? null,
                      },
                    }
                  : row
              )
            );
          });
        }
      } catch (err) {
        console.warn("[album detail] threads error", err);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [albumId]
  );

  useEffect(() => {
    setThreads([]);
    setPage(0);
    setHasMore(true);
  }, [albumId]);

  useEffect(() => {
    if (!albumId) return;
    if (page !== 0) return;
    loadPage(1);
  }, [albumId, page, loadPage]);

  useEffect(() => {
    if (!hasMore || page === 0) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !loading) {
          loadPage(page + 1);
        }
      },
      { root, rootMargin: "300px 0px 300px 0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, page, loading, loadPage]);

  // Select mode plumbing — Select/Done goes into the shared header slot.
  useEffect(() => {
    setCanSelect(true);
    return () => setCanSelect(false);
  }, [setCanSelect]);

  useEffect(() => {
    if (!isSelecting) setSelected(new Set());
  }, [isSelecting]);

  useEffect(() => {
    setHeaderRight(
      <div className="flex items-center gap-[14px]">
        {threads.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectMode}
            className="cursor-pointer font-montserrat text-black text-[14px] hover:opacity-80 transition-opacity"
          >
            {isSelecting ? "Done" : "Select"}
          </button>
        )}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Album menu"
            className="cursor-pointer w-[32px] h-[32px] rounded-full flex items-center justify-center text-primary-blue hover:bg-black/[0.05] transition-colors"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="1.8" fill="currentColor" />
              <circle cx="12" cy="12" r="1.8" fill="currentColor" />
              <circle cx="19" cy="12" r="1.8" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute top-full right-0 mt-[6px] z-50 bg-white rounded-[14px] shadow-[0_8px_24px_rgba(0,0,0,0.18)] py-[6px] min-w-[180px] border border-black/[0.06]">
              {isCreator && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenameOpen(true);
                  }}
                  className="cursor-pointer w-full text-left px-[16px] py-[10px] font-montserrat text-primary-blue text-[14px] hover:bg-black/[0.03]"
                >
                  Rename
                </button>
              )}
              {canShare && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setShareOpen(true);
                  }}
                  className="cursor-pointer w-full text-left px-[16px] py-[10px] font-montserrat text-primary-blue text-[14px] hover:bg-black/[0.03]"
                >
                  Share album
                </button>
              )}
              {isCreator ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDeleteOpen(true);
                  }}
                  className="cursor-pointer w-full text-left px-[16px] py-[10px] font-montserrat text-red-500 text-[14px] hover:bg-black/[0.03]"
                >
                  Delete album
                </button>
              ) : isParticipant ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmLeaveOpen(true);
                  }}
                  className="cursor-pointer w-full text-left px-[16px] py-[10px] font-montserrat text-red-500 text-[14px] hover:bg-black/[0.03]"
                >
                  Leave album
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
    return () => setHeaderRight(null);
  }, [
    isSelecting,
    threads.length,
    toggleSelectMode,
    setHeaderRight,
    menuOpen,
    isCreator,
    canShare,
    isParticipant,
  ]);

  // Close menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const toggleSelect = useCallback((thread: LibraryThread) => {
    const key = cardKeyFor(thread);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const existingThreadIds = useMemo(
    () => new Set(threads.map((t) => t._id)),
    [threads]
  );

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const text =
        (t.promptCard?.content ?? "") + " " + (t.latestStory?.title ?? "");
      return text.toLowerCase().includes(q);
    });
  }, [threads, query]);

  const handleAttach = useCallback(
    async (threadIds: string[]) => {
      if (threadIds.length === 0) return;
      try {
        await attachAlbumThreads(albumId, threadIds);
        setPickerOpen(false);
        // Refetch first page to pick up new tiles + refreshed counts.
        setThreads([]);
        setPage(0);
        setHasMore(true);
        fetchAlbum(albumId).then(setAlbum).catch(() => {});
        toast.success(
          threadIds.length === 1 ? "Story added" : `${threadIds.length} stories added`
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't add stories"
        );
      }
    },
    [albumId]
  );

  const handleDetach = useCallback(async () => {
    const picked = threads.filter((t) => selected.has(cardKeyFor(t)));
    if (picked.length === 0) return;
    const threadIds = picked.map((t) => t._id);
    const previous = threads;
    setThreads((prev) => prev.filter((t) => !selected.has(cardKeyFor(t))));
    setSelected(new Set());
    setConfirmDetachOpen(false);
    exitSelect();
    try {
      await detachAlbumThreads(albumId, threadIds);
      toast.success(
        picked.length === 1 ? "Removed from album" : "Removed from album"
      );
      fetchAlbum(albumId).then(setAlbum).catch(() => {});
    } catch (err) {
      setThreads(previous);
      toast.error(
        err instanceof Error ? err.message : "Couldn't remove stories"
      );
    }
  }, [albumId, exitSelect, selected, threads]);

  const handleRename = useCallback(
    async (title: string) => {
      try {
        await renameAlbum(albumId, title);
        setAlbum((prev) => (prev ? { ...prev, title } : prev));
        setRenameOpen(false);
        toast.success("Album renamed");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't rename album"
        );
      }
    },
    [albumId]
  );

  const handleDeleteAlbum = useCallback(async () => {
    try {
      await deleteAlbum(albumId);
      setConfirmDeleteOpen(false);
      toast.success("Album deleted");
      router.push("/lags/albums");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't delete album"
      );
    }
  }, [albumId, router]);

  const handleLeaveAlbum = useCallback(async () => {
    try {
      await leaveAlbum(albumId);
      setConfirmLeaveOpen(false);
      toast.success("Left album");
      router.push("/lags/albums");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't leave album");
    }
  }, [albumId, router]);

  const handleShareSend = useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) return;
      try {
        await addAlbumParticipants(albumId, userIds);
        setShareOpen(false);
        fetchAlbum(albumId).then(setAlbum).catch(() => {});
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Couldn't share album");
      }
    },
    [albumId]
  );

  const existingMembers: PersonSummary[] = useMemo(
    () =>
      (album?.participants ?? [])
        .filter((p) => p._id !== currentUserId)
        .map((p) => ({
          _id: p._id,
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          profilePicture: p.profilePicture ?? null,
          epochlagID: p.epochlagID ?? undefined,
        })),
    [album?.participants, currentUserId]
  );

  const participants = album?.participants ?? [];
  const visibleParticipants = participants.slice(0, 4);
  const extraParticipants = Math.max(0, participants.length - 4);

  if (!album && !albumError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[32px] h-[32px] border-[3px] border-primary-blue/20 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Story"
        className="w-full bg-white rounded-full px-[18px] py-[10px] font-montserrat text-primary-blue text-[14px] placeholder:text-primary-blue/40 focus:outline-none focus:ring-2 focus:ring-primary-orange shadow-[0_0_10px_rgba(0,0,0,0.08)] mb-[16px]"
      />

      <div className="flex items-center justify-between gap-[12px] mb-[16px]">
        <h2 className="font-montserrat font-bold text-primary-blue text-[22px] leading-tight truncate">
          {album?.title ?? "Album"}
        </h2>
        {participants.length > 0 && (
          <div className="flex items-center -space-x-[8px] shrink-0">
            {visibleParticipants.map((p) => (
              <div
                key={p._id}
                className="w-[32px] h-[32px] rounded-full overflow-hidden border-[2px] border-white bg-primary-blue/15"
                title={p.firstName ?? undefined}
              >
                {p.profilePicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={bustUrl(p.profilePicture, undefined)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-montserrat font-semibold text-primary-blue text-[11px]">
                    {(p.firstName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {extraParticipants > 0 && (
              <div className="w-[32px] h-[32px] rounded-full border-[2px] border-white bg-primary-blue text-white flex items-center justify-center font-montserrat font-semibold text-[11px]">
                +{extraParticipants}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-[24px] pt-[8px] pb-[28px] -mx-[24px] scrollbar-hide"
      >
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-x-[24px] gap-y-[40px]">
          {!isSelecting && (
            <button
              type="button"
              onClick={() => setChooserOpen(true)}
              aria-label="Add story to album"
              className="cursor-pointer flex flex-col bg-white rounded-[22px] shadow-[0_0_18px_rgba(0,0,0,0.2)] hover:shadow-[0_0_22px_rgba(0,0,0,0.25)] transition-shadow pt-[8px] px-[8px] pb-[16px] gap-[7px]"
            >
              <div className="aspect-[5/4] bg-primary-blue/5 rounded-[15px] flex items-center justify-center">
                <div className="w-[56px] h-[56px] rounded-full bg-primary-blue/10 flex items-center justify-center text-primary-blue">
                  <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="min-h-[36px]" />
            </button>
          )}
          {filteredThreads.map((t) => (
            <StoryCard
              key={t._id}
              thread={t}
              isSelecting={isSelecting}
              selected={selected.has(cardKeyFor(t))}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
        <div ref={sentinelRef} className="h-[1px]" />
        {loading && (
          <p className="font-montserrat text-primary-blue/50 text-[13px] mt-[16px] text-center">
            Loading…
          </p>
        )}
        {!loading && threads.length === 0 && (
          <p className="font-montserrat text-primary-blue/60 text-[13px] mt-[16px] text-center">
            No stories in this album yet.
          </p>
        )}
      </div>

      {isSelecting && selected.size > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[24px] z-40 flex items-center gap-[12px] bg-primary-blue text-white rounded-full pl-[20px] pr-[8px] py-[8px] shadow-[0_6px_24px_rgba(0,0,0,0.25)]">
          <span className="font-montserrat font-medium text-[14px]">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => setConfirmDetachOpen(true)}
            aria-label="Remove selected from album"
            className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V7"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      )}

      <RenameAlbumModal
        open={renameOpen}
        initialTitle={album?.title ?? ""}
        onCancel={() => setRenameOpen(false)}
        onSubmit={handleRename}
      />

      <AddStoryChooserModal
        open={chooserOpen}
        onCancel={() => setChooserOpen(false)}
        onCreateNew={() => {
          setChooserOpen(false);
          router.push(`/new-story?mode=tell&albumId=${albumId}`);
        }}
        onAddExisting={() => {
          setChooserOpen(false);
          setPickerOpen(true);
        }}
      />

      <ExistingStoryPickerModal
        open={pickerOpen}
        excludeThreadIds={existingThreadIds}
        onCancel={() => setPickerOpen(false)}
        onSubmit={handleAttach}
      />

      <ShareModal
        open={shareOpen}
        title="Share this album"
        shareContext="prompt"
        showMessageInput={false}
        showGroups={false}
        existingMembers={existingMembers}
        onClose={() => setShareOpen(false)}
        onSend={handleShareSend}
      />

      <ConfirmationModal
        open={confirmDetachOpen}
        title="Remove from album?"
        body={`${selected.size} ${selected.size === 1 ? "story" : "stories"} will be removed from this album. Original stories stay in your library.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDetach}
        onCancel={() => setConfirmDetachOpen(false)}
      />

      <ConfirmationModal
        open={confirmDeleteOpen}
        title="Delete album?"
        body="This album will be deleted for everyone. Stories inside stay in your library. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteAlbum}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmationModal
        open={confirmLeaveOpen}
        title="Leave album?"
        body="You'll be removed from this album. Other participants keep access."
        confirmLabel="Leave"
        destructive
        onConfirm={handleLeaveAlbum}
        onCancel={() => setConfirmLeaveOpen(false)}
      />
    </div>
  );
}

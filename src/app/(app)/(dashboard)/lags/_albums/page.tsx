"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  albumCreatorId,
  createAlbum,
  deleteAlbum,
  fetchAlbums,
  leaveAlbum,
  type Album,
} from "../../../../../lib/library/api";
import { useAuth } from "../../../../../lib/auth/AuthProvider";
import ConfirmationModal from "../../../../../components/ConfirmationModal/ConfirmationModal";
import { useSelectMode } from "../selectMode";
import AlbumCard from "./AlbumCard";
import AlbumCardSkeleton from "./AlbumCardSkeleton";
import CreateAlbumModal from "./CreateAlbumModal";

export default function LibraryAlbumsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setHeaderRight } = useSelectMode();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const currentUserId = user?._id;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAlbums({ page: 1, limit: 20 })
      .then((rows) => {
        if (!cancelled) setAlbums(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Couldn't load albums");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleEdit = useCallback(() => {
    setIsEditing((v) => {
      if (v) setSelected(new Set());
      return !v;
    });
  }, []);

  const toggleSelect = useCallback((album: Album) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(album._id)) next.delete(album._id);
      else next.add(album._id);
      return next;
    });
  }, []);

  // Register the Albums header actions (Edit + New) in the shared slot.
  useEffect(() => {
    setHeaderRight(
      <div className="flex items-center gap-[14px]">
        {albums.length > 0 && (
          <button
            type="button"
            onClick={toggleEdit}
            className="cursor-pointer font-montserrat text-black text-[14px] hover:opacity-80 transition-opacity"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="Create album"
          className="cursor-pointer flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <svg
            width={34}
            height={34}
            viewBox="0 0 34 34"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="17" cy="17" r="16" stroke="#092E4A" strokeWidth={2} />
            <path
              d="M16.7461 10V25.5"
              stroke="#092E4A"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <path
              d="M24.5 17.7451L9 17.7451"
              stroke="#092E4A"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    );
    return () => setHeaderRight(null);
  }, [albums.length, isEditing, toggleEdit, setHeaderRight]);

  const handleCreate = useCallback(
    async (title: string) => {
      try {
        const album = await createAlbum(title);
        setCreateOpen(false);
        router.push(`/lags/albums/${album._id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Couldn't create album"
        );
      }
    },
    [router]
  );

  // Delete or leave depending on ownership. Mixed selections run per-album
  // so participants and owners can both act in one pass.
  const handleBatchRemove = useCallback(async () => {
    const picked = albums.filter((a) => selected.has(a._id));
    if (picked.length === 0) return;
    const previous = albums;
    setAlbums((prev) => prev.filter((a) => !selected.has(a._id)));
    setSelected(new Set());
    setConfirmOpen(false);
    setIsEditing(false);

    const results = await Promise.allSettled(
      picked.map((a) => {
        const isOwner = albumCreatorId(a) === currentUserId;
        return isOwner ? deleteAlbum(a._id) : leaveAlbum(a._id);
      })
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      setAlbums(previous);
      toast.error(
        failed.length === picked.length
          ? "Couldn't update albums"
          : `Couldn't update ${failed.length} of ${picked.length} albums`
      );
    } else {
      toast.success(picked.length === 1 ? "Album removed" : "Albums removed");
    }
  }, [albums, currentUserId, selected]);

  const selectedCount = selected.size;
  const confirmCopy = useMemo(() => {
    const picked = albums.filter((a) => selected.has(a._id));
    const owners = picked.filter(
      (a) => albumCreatorId(a) === currentUserId
    ).length;
    const leaves = picked.length - owners;
    if (owners > 0 && leaves === 0) {
      return {
        title: picked.length === 1 ? "Delete album?" : "Delete albums?",
        body: `${picked.length} ${picked.length === 1 ? "album" : "albums"} will be deleted for everyone. This can't be undone.`,
      };
    }
    if (owners === 0 && leaves > 0) {
      return {
        title: picked.length === 1 ? "Leave album?" : "Leave albums?",
        body: `You'll be removed from ${picked.length} ${picked.length === 1 ? "album" : "albums"}. Other participants keep access.`,
      };
    }
    return {
      title: "Remove albums?",
      body: `${owners} will be deleted and ${leaves} will be left. This can't be undone.`,
    };
  }, [albums, currentUserId, selected]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-[24px] pt-[28px] pb-[28px] scrollbar-hide">
        {error ? (
          <p className="font-montserrat text-primary-orange text-[14px] mt-[8px]">
            {error}
          </p>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-x-[24px] gap-y-[24px]">
            {Array.from({ length: 4 }).map((_, i) => (
              <AlbumCardSkeleton key={i} />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="mt-[24px]">
            <p className="font-montserrat text-primary-blue/60 text-[14px]">
              No albums yet. Tap the + button to create your first album.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-x-[24px] gap-y-[24px]">
            {albums.map((a) => (
              <AlbumCard
                key={a._id}
                album={a}
                isEditing={isEditing}
                selected={selected.has(a._id)}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {isEditing && selectedCount > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[24px] z-40 flex items-center gap-[12px] bg-primary-blue text-white rounded-full pl-[20px] pr-[8px] py-[8px] shadow-[0_6px_24px_rgba(0,0,0,0.25)]">
          <span className="font-montserrat font-medium text-[14px]">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="Delete or leave selected"
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

      <CreateAlbumModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <ConfirmationModal
        open={confirmOpen}
        title={confirmCopy.title}
        body={confirmCopy.body}
        confirmLabel="Remove"
        destructive
        onConfirm={handleBatchRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

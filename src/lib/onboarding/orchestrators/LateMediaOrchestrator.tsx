"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import {
  markItemDone,
  markItemFailed,
  markItemForRetry,
  markItemUploading,
} from "../store/slices/lateMediaSlice";
import { apiGetAuthedUploadToken } from "../api/authedEndpoints";
import { uploadToCloudinary } from "../api/cloudinary";
import { extFromMime } from "../upload/helpers";

// Retries authed uploads for media stranded by the post-merge race (Part 3
// §Section D).
//
// For each lateMedia item with status === "ready":
//   1. Fetch the object URL that useAnonMediaUpload stashed in
//      lateMediaSlice (compressedUri).
//   2. Mint an authed upload token.
//   3. Direct upload to Cloudinary.
//   4. markItemDone on success, markItemFailed with exponential backoff
//      1s → 3s → 9s, max 3 attempts.

const BACKOFF_MS = [1000, 3000, 9000];
const MAX_ATTEMPTS = BACKOFF_MS.length;

export function LateMediaOrchestrator() {
  const dispatch = useAppDispatch();
  const storyId = useAppSelector((s) => s.createALag.storyId);
  const items = useAppSelector((s) => s.lateMedia.items);

  // Track which mediaIds are currently in-flight so we don't kick off the
  // same upload twice on a state ripple.
  const inFlightRef = useRef<Set<string>>(new Set());
  // Track retry timers so cleanup can clear them.
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!storyId) return;

    for (const [mediaId, item] of Object.entries(items)) {
      if (item.status !== "ready") continue;
      if (inFlightRef.current.has(mediaId)) continue;
      if (!item.compressedUri) continue;

      inFlightRef.current.add(mediaId);
      const attemptNum = (item.attempts || 0) + 1;

      void attemptUpload({
        mediaId,
        item,
        storyId,
        attemptNum,
      })
        .then(() => {
          dispatch(markItemDone(mediaId));
        })
        .catch((err: Error) => {
          if (attemptNum >= MAX_ATTEMPTS) {
            dispatch(
              markItemFailed({
                mediaId,
                error: err.message || "Upload failed after retries",
              })
            );
            return;
          }
          const delay = BACKOFF_MS[attemptNum - 1] || 9000;
          const timer = setTimeout(() => {
            dispatch(markItemForRetry(mediaId));
          }, delay);
          timersRef.current[mediaId] = timer;
        })
        .finally(() => {
          inFlightRef.current.delete(mediaId);
        });
    }
  }, [items, storyId, dispatch]);

  // Cleanup on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of Object.values(timers)) clearTimeout(t);
    };
  }, []);

  return null;

  async function attemptUpload(args: {
    mediaId: string;
    item: (typeof items)[string];
    storyId: string;
    attemptNum: number;
  }): Promise<void> {
    dispatch(markItemUploading(args.mediaId));

    if (!args.item.compressedUri) throw new Error("no compressed uri");

    // Object URL → Blob. We stored the URL, not the blob, to keep the Redux
    // slice serializable.
    const blob = await urlToBlob(args.item.compressedUri);

    const fileName = `${args.mediaId}.${extFromMime(args.item.mimeType)}`;
    const uploadToken = await apiGetAuthedUploadToken(args.storyId, {
      fileName,
      fileSize: blob.size,
      mimeType: args.item.mimeType,
    });

    await uploadToCloudinary({
      uploadUrl: uploadToken.uploadUrl,
      uploadParams: uploadToken.uploadParams,
      file: blob,
    });
  }
}

async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return await res.blob();
}

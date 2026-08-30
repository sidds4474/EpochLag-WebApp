"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store";
import { apiGetAnonUploadToken } from "../api/anonEndpoints";
import { useUploads } from "./UploadContext";
import { markItemReady } from "../store/slices/lateMediaSlice";
import { makeBlockId, extFromMime, type MediaCategory } from "./helpers";
import { compressMedia } from "./compress";

// Anon-path media upload. See Part 3 §Section B for the exact contract.
//
// Flow:
//   1. Ensure mediaId (mint if caller didn't).
//   2. Read source size (for analytics).
//   3. Compress with fallback-to-source semantics (handled by UploadContext,
//      but we peek at compressed size for the post-merge race check).
//   4. POST-MERGE RACE CHECK — if isAuthenticated flipped mid-upload AND
//      pendingAnonMerge.status === "done" AND storyId exists → anon upload
//      would 409. Hand off to lateMediaSlice for authed retry.
//   5. Otherwise: POST /api/onboarding/anon/upload-token → hand to UploadContext.

export type StartAnonUploadArgs = {
  file: Blob;
  mimeType: string;
  category: MediaCategory;
  mediaId?: string;
  onDone?: (response: unknown) => void;
  onError?: (error: Error) => void;
};

export function useAnonMediaUpload() {
  const dispatch = useAppDispatch();
  const { enqueue } = useUploads();

  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const mergeStatus = useAppSelector((s) => s.pendingAnonMerge.status);
  const storyId = useAppSelector((s) => s.createALag.storyId);

  const startUpload = useCallback(
    async (args: StartAnonUploadArgs): Promise<string> => {
      const category = args.category;
      const mediaId = args.mediaId || makeBlockId(category);
      const fileName = `${mediaId}.${extFromMime(args.mimeType)}`;

      // Compress up-front so we know finalSize before minting the token.
      // Upload-token endpoint needs fileSize.
      const compressed = await compressMedia({
        file: args.file,
        mimeType: args.mimeType,
        category,
      });
      const finalBlob = compressed.blob;
      const finalMime = compressed.mimeType;
      const finalSize = compressed.compressedSize;

      // Post-merge race check.
      if (isAuthenticated && mergeStatus === "done" && storyId) {
        // Draft is already merged. Anon endpoint would 409. Hand off to
        // lateMediaSlice — LateMediaOrchestrator will retry against the
        // authed story.
        const objectUrl = URL.createObjectURL(finalBlob);
        dispatch(
          markItemReady({
            mediaId,
            compressedUri: objectUrl,
            compressedSize: finalSize,
            mimeType: finalMime,
            category,
          })
        );
        return mediaId;
      }

      // Mint anon upload token.
      const uploadToken = await apiGetAnonUploadToken({
        fileName,
        fileSize: finalSize,
        mimeType: finalMime,
      });

      // Hand off to UploadContext — it runs its own compression pass (a
      // second compressMedia call is idempotent given our fallback semantics)
      // and manages the XHR lifecycle. NOTE: we pass the already-compressed
      // blob so UploadContext's compress pass is a fast no-op (min-size gate
      // or "already small enough" branch).
      await enqueue({
        mediaId,
        category,
        file: finalBlob,
        mimeType: finalMime,
        uploadUrl: uploadToken.uploadUrl,
        uploadParams: uploadToken.uploadParams,
        onDone: args.onDone,
        onError: args.onError,
      });

      return mediaId;
    },
    [dispatch, enqueue, isAuthenticated, mergeStatus, storyId]
  );

  return { startUpload };
}

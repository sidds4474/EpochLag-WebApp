"use client";

import { useCallback, useRef } from "react";
import { useStore } from "react-redux";
import { useAppSelector } from "../store";
import type { RootState } from "../store";
import { apiGetAuthedUploadToken } from "../api/authedEndpoints";
import { useUploads } from "./UploadContext";
import { makeBlockId, extFromMime, type MediaCategory } from "./helpers";
import { compressMedia } from "./compress";

// Authed-path media upload. Differences from anon:
//   • Token endpoint: POST /api/stories/{storyId}/getUploadToken
//   • Bearer auth (httpClient reads via authTokenGetter or explicit param)
//   • storyId race: authed composer POSTs /api/stories on cover pick to
//     mint a storyId. If user drops another media before that POST completes,
//     we don't have a storyId yet. waitForStoryId polls Redux for up to
//     4 seconds (100ms interval) before bailing.
//
//   • No post-merge race check — authed uploads always hit authed endpoint.

const WAIT_STORY_ID_DEADLINE_MS = 4000;
const WAIT_STORY_ID_POLL_MS = 100;

export type StartAuthedUploadArgs = {
  file: Blob;
  mimeType: string;
  category: MediaCategory;
  mediaId?: string;
  onDone?: (response: unknown) => void;
  onError?: (error: Error) => void;
};

export function useAuthedMediaUpload() {
  const { enqueue } = useUploads();
  const store = useStore<RootState>();
  const storyIdFromSelector = useAppSelector((s) => s.createALag.storyId);
  const storyIdRef = useRef<string | null>(storyIdFromSelector);
  storyIdRef.current = storyIdFromSelector;

  // Poll Redux for storyId. Bail null after deadline.
  const waitForStoryId = useCallback(async (): Promise<string | null> => {
    if (storyIdRef.current) return storyIdRef.current;
    const start = Date.now();
    while (Date.now() - start < WAIT_STORY_ID_DEADLINE_MS) {
      const id = store.getState().createALag.storyId;
      if (id) return id;
      await new Promise((r) => setTimeout(r, WAIT_STORY_ID_POLL_MS));
    }
    return null;
  }, [store]);

  const startUpload = useCallback(
    async (args: StartAuthedUploadArgs): Promise<string> => {
      const category = args.category;
      const mediaId = args.mediaId || makeBlockId(category);

      const storyId = await waitForStoryId();
      if (!storyId) {
        const err = new Error(
          "Story ID unavailable — please try again in a moment."
        );
        args.onError?.(err);
        throw err;
      }

      const compressed = await compressMedia({
        file: args.file,
        mimeType: args.mimeType,
        category,
      });
      const finalBlob = compressed.blob;
      const finalMime = compressed.mimeType;
      const finalSize = compressed.compressedSize;
      const fileName = `${mediaId}.${extFromMime(finalMime)}`;

      const uploadToken = await apiGetAuthedUploadToken(storyId, {
        fileName,
        fileSize: finalSize,
        mimeType: finalMime,
      });

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
    [enqueue, waitForStoryId]
  );

  return { startUpload, waitForStoryId };
}

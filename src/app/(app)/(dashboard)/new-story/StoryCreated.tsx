"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { shareStory } from "../../../../lib/create/api";
import SuccessCelebration from "../../../../components/SuccessCelebration";
import ShareModal from "./ShareModal";

type Props = {
  storyId: string;
  onDone: () => void;
  /** Composer-tagged people. Never sent to /api/stories at publish time — the
   *  BE rejects the field there. Instead they:
   *    (1) pre-check in the Send modal, and
   *    (2) drive the Done-button silent auto-share below. Rationale: "you
   *        already told us who this story is for; we're not going to make
   *        you tap Send too."  */
  preselectedUserIds?: string[];
};

export default function StoryCreatedOverlay({
  storyId,
  onDone,
  preselectedUserIds,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  // Single-shot latch. handleShareSubmit re-enters handleDone once the share
  // resolves so navigation runs; without this the second entry would see the
  // same preselectedUserIds, decide "auto-share again", and recurse.
  const autoShareFiredRef = useRef(false);

  // Stable reference for the ShareModal's `selectedUsers` prop. A raw
  // `preselectedUserIds ?? []` would be a fresh array every render, which
  // would re-fire the modal's reset effect on every parent render. Key on
  // the joined IDs — cheap, stable, and unique to the actual contents.
  const preselected = useMemo(
    () => preselectedUserIds ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [(preselectedUserIds ?? []).join(",")]
  );

  async function handleShareSubmit(
    userIds: string[],
    sendSeparately: boolean,
    groupIds: string[],
    { silent = false }: { silent?: boolean } = {}
  ) {
    if (userIds.length === 0 && groupIds.length === 0) {
      setShareOpen(false);
      return;
    }
    try {
      await shareStory(storyId, { userIds, groupIds, sendSeparately });
      if (!silent) toast.success("Story shared successfully!");
      setShareOpen(false);
      // Modal's own "Sent" confirmation animation runs ~1.6s; give it space
      // before we navigate away when the user drove the share via the modal.
      setTimeout(() => onDone(), silent ? 0 : 1600);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Couldn't share right now";
      // For the silent auto-share path we still navigate — the share failure
      // shouldn't strand the user on the celebration screen. Toast surfaces
      // on wherever they land.
      if (silent) {
        toast.error(message);
        setShareOpen(false);
        onDone();
        return;
      }
      // Modal-driven Send: bubble the error so ShareModal can show it inline.
      throw new Error(message);
    }
  }

  function handleDone() {
    const taggedUserIds = preselected.filter(Boolean);
    const shouldAutoShare = !autoShareFiredRef.current && taggedUserIds.length > 0;
    if (!shouldAutoShare) {
      onDone();
      return;
    }
    autoShareFiredRef.current = true;
    // Fire-and-forget; navigation runs from inside handleShareSubmit's
    // finalization (success or silent-error branch). We intentionally don't
    // await here so the celebration screen dismisses instantly.
    void handleShareSubmit(taggedUserIds, false, [], { silent: true });
  }

  // Bridge for the Send modal's onSend signature.
  async function handleSend(
    userIds: string[],
    sendSeparately: boolean,
    _note: string,
    _isPrivate: boolean,
    groupIds: string[]
  ) {
    // Once the user drives a Send explicitly, the "auto-share on Done" arm
    // is spent — even if they cancel later, we shouldn't fire a second share.
    autoShareFiredRef.current = true;
    await handleShareSubmit(userIds, sendSeparately, groupIds);
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#FFEFDC] lg:bg-[#f7ecd8] flex items-center justify-center px-[24px]">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        <SuccessCelebration title="Story Created!">
          <div className="w-full flex items-center gap-[12px]">
            <button
              type="button"
              onClick={handleDone}
              className="cursor-pointer flex-1 bg-white text-primary-blue font-montserrat font-semibold text-[15px] rounded-full py-[12px] border border-primary-blue/20 hover:bg-black/[0.03] transition-colors"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="cursor-pointer flex-1 bg-primary-orange text-primary-white font-montserrat font-semibold text-[15px] rounded-full py-[12px] hover:opacity-90 transition-opacity"
            >
              Send
            </button>
          </div>
        </SuccessCelebration>
      </div>

      <ShareModal
        open={shareOpen}
        title="Send story to"
        shareContext="story"
        showMessageInput={false}
        selectedUsers={preselected}
        onClose={() => setShareOpen(false)}
        onSend={handleSend}
      />
    </div>
  );
}

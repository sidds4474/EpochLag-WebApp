"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../lib/api/client";
import { shareStory } from "../../../../lib/create/api";
import SuccessCelebration from "../../../../components/SuccessCelebration";
import SendToDrawer from "../../../../components/share/SendToDrawer";

type Props = {
  storyId: string;
  onDone: () => void;
  /** Composer-tagged people. Never sent to /api/stories at publish time — the
   *  BE rejects the field there. Instead they:
   *    (1) pre-check in the Send drawer, and
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
  // Single-shot latch. handleAutoShare re-enters onDone once the share
  // resolves so navigation runs; without this the second entry would see the
  // same preselectedUserIds, decide "auto-share again", and recurse.
  const autoShareFiredRef = useRef(false);
  // Set once the user has driven an explicit Send via the drawer. Drawer's
  // onClose (fires when the user taps Done inside the celebration) hands off
  // to the parent's onDone.
  const [sentThisSession, setSentThisSession] = useState(false);

  // Stable reference for the drawer's `selectedUsers` prop. A raw
  // `preselectedUserIds ?? []` would be a fresh array every render, which
  // would re-fire the drawer's reset effect on every parent render. Key on
  // the joined IDs — cheap, stable, and unique to the actual contents.
  const preselected = useMemo(
    () => preselectedUserIds ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [(preselectedUserIds ?? []).join(",")]
  );

  // Silent auto-share on Done for the tagged-people arm. Doesn't open the
  // drawer; failure still navigates away with a toast rather than trapping
  // the user on the celebration screen.
  async function handleAutoShare(userIds: string[]) {
    if (userIds.length === 0) {
      onDone();
      return;
    }
    try {
      await shareStory(storyId, {
        userIds,
        groupIds: [],
        sendSeparately: false,
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Couldn't share right now";
      toast.error(message);
    } finally {
      onDone();
    }
  }

  function handleDone() {
    const taggedUserIds = preselected.filter(Boolean);
    const shouldAutoShare =
      !autoShareFiredRef.current && taggedUserIds.length > 0;
    if (!shouldAutoShare) {
      onDone();
      return;
    }
    autoShareFiredRef.current = true;
    // Fire-and-forget; navigation runs from handleAutoShare's finally.
    void handleAutoShare(taggedUserIds);
  }

  // Drawer's onSend — new signature is (userIds, groupIds, note). Story
  // shares carry no note, drop the sendSeparately flag per v1 decision.
  async function handleSend(
    userIds: string[],
    groupIds: string[],
    _note: string
  ) {
    // Once the user drives a Send explicitly, the "auto-share on Done" arm
    // is spent — even if they cancel later, we shouldn't fire a second share.
    autoShareFiredRef.current = true;
    try {
      await shareStory(storyId, {
        userIds,
        groupIds,
        sendSeparately: false,
      });
      setSentThisSession(true);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Couldn't share right now";
      throw new Error(message);
    }
  }

  // Drawer close handler. If the user just completed a successful send and
  // is tapping Done inside the drawer's own celebration, hand off to the
  // parent's onDone. Otherwise (they cancelled without sending), just close.
  function handleDrawerClose() {
    setShareOpen(false);
    if (sentThisSession) {
      setSentThisSession(false);
      onDone();
    }
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

      <SendToDrawer
        open={shareOpen}
        onClose={handleDrawerClose}
        onSend={handleSend}
        shareContext="story"
        showMessageInput={false}
        selectedUsers={preselected}
        shareTarget={{ kind: "story", id: storyId }}
      />
    </div>
  );
}

"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "../../../../../../lib/api/client";
import {
  fetchDockingCard,
  fetchUserCard,
  getCachedUserCard,
  seedUserCard,
} from "../../../../../../lib/home/api";
import { shareUserCard } from "../../../../../../lib/create/api";
import type { UserCard } from "../../../../../../types/home";
import InspirationCard from "../../../inspiration/InspirationCard";
import SendToDrawer from "../../../../../../components/share/SendToDrawer";
import PromptPreviewCard from "../../../../../../components/share/PromptPreviewCard";

// Cover shipped by mobile for hows-life prompts that arrive with imageUrl:
// null. Client swaps this in whenever the prompt has no cover so the flip
// card doesn't render a blank gray tile. Also used downstream by the
// composer + share preview so persisted stories inherit a real S3 URL.
const HOWS_LIFE_FALLBACK_COVER =
  "https://epochlag-bucket.s3.us-east-1.amazonaws.com/color-gradient/gradient-image-18.png";

// Author blocks come back as `profilePic` on some BE surfaces and
// `profilePicture` on others — the shared Avatar component reads
// `profilePicture`. Normalize so initials fallback doesn't break.
function normalizePromptAuthor(card: UserCard): UserCard {
  const author = card.author as (UserCard["author"] & { profilePic?: string | null }) | null;
  if (!author) return card;
  const pic = author.profilePicture ?? author.profilePic ?? null;
  return { ...card, author: { ...author, profilePicture: pic } };
}

// hows-life BE payloads may ship the prompt inside a nested `card.prompt`
// slot on the docking-station enrichment call. Merge onto the local prompt
// state without overwriting anything already populated from the direct
// user-card fetch.
function mergeDockingEnrichment(
  base: UserCard | null,
  enrichedPrompt: unknown
): UserCard | null {
  if (!enrichedPrompt || typeof enrichedPrompt !== "object") return base;
  const nested = enrichedPrompt as Partial<UserCard>;
  if (!base) return nested as UserCard;
  return { ...nested, ...base } as UserCard;
}

function PromptDetailInner({ promptId }: { promptId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const challengeType = params.get("challengeType") ?? "";
  const challengeCardId = params.get("challengeCardId") ?? "";
  const isHowsLife = challengeType === "hows-life";

  const [prompt, setPrompt] = useState<UserCard | null>(() =>
    getCachedUserCard(promptId)
  );
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // hows-life: enrich from the docking-station card in parallel with the
    // user-card fetch. The docking card sometimes carries a nested `prompt`
    // slot BE ships pre-populated; if present, merge without clobbering
    // fields the direct fetch already returned.
    if (isHowsLife && challengeCardId) {
      fetchDockingCard(challengeCardId).then((docking) => {
        if (cancelled || !docking) return;
        const inner = (docking as unknown as { prompt?: unknown }).prompt;
        if (inner) {
          setPrompt((prev) => {
            const merged = mergeDockingEnrichment(prev, inner);
            return merged ? normalizePromptAuthor(merged) : merged;
          });
        }
      });
    }

    // Fallback: fetch the underlying user-card if the cache missed. Silent
    // on error — the card already renders whatever partial data it has.
    if (!prompt) {
      fetchUserCard(promptId)
        .then((card) => {
          if (cancelled) return;
          seedUserCard(card);
          setPrompt(normalizePromptAuthor(card));
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
    // Intentional: this effect runs once per promptId + challenge combo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptId, challengeCardId, isHowsLife]);

  // Inject the fallback cover into the card sent downstream, so the composer
  // doesn't seed a null imageUrl and end up with a gray cover on BE.
  const cardForFlip: UserCard | null = prompt
    ? {
        ...prompt,
        imageUrl: prompt.imageUrl || (isHowsLife ? HOWS_LIFE_FALLBACK_COVER : null),
      }
    : null;

  const handleAnswer = useCallback(() => {
    if (!prompt) return;
    // Seed the answer-composer's cache so it hydrates synchronously.
    seedUserCard({
      ...prompt,
      imageUrl: prompt.imageUrl || (isHowsLife ? HOWS_LIFE_FALLBACK_COVER : null),
    });
    const q = new URLSearchParams({ promptId });
    if (isHowsLife && challengeCardId) {
      // Forward the challenge context so the composer can POST progress on
      // publish with { status: "completed", promptCardId }.
      q.set("challengeType", challengeType);
      q.set("challengeCardId", challengeCardId);
    }
    router.push(`/new-lag?${q.toString()}`);
  }, [prompt, promptId, isHowsLife, challengeType, challengeCardId, router]);

  const handleShareSend = useCallback(
    async (userIds: string[], groupIds: string[], note: string) => {
      if (!prompt?._id) return;
      try {
        await shareUserCard(prompt._id, {
          shareWith: userIds,
          groupIds,
          // sendSeparately dropped in v1 — see share drawer migration notes.
          sendSeparately: false,
          note,
        });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not share. Please try again.";
        throw new Error(message);
      }
    },
    [prompt?._id]
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-primary-cream/40 lg:bg-transparent px-[16px] md:px-[32px] pt-[16px] pb-[24px] md:pb-[40px] overflow-y-auto scrollbar-hide">
      <div className="flex items-center gap-[12px]">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="cursor-pointer w-[36px] h-[36px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-black/[0.03] lg:bg-[#f0f0f0] lg:shadow-none lg:hover:bg-black/[0.08] flex items-center justify-center text-primary-blue transition-colors"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="font-montserrat font-bold text-primary-blue text-[20px] md:text-[28px] leading-none">
          Prompt
        </h1>
      </div>

      <div className="flex-1 flex items-center justify-center py-[16px] md:py-[24px]">
        {cardForFlip ? (
          <div className="w-full max-w-[320px] md:max-w-[340px] lg:max-w-[300px] h-[min(70vh,520px)] md:h-[600px] lg:h-[440px]">
            <InspirationCard
              card={cardForFlip}
              onAnswer={handleAnswer}
              onShare={() => setShareOpen(true)}
              initialFlipped
            />
          </div>
        ) : (
          <div className="w-full max-w-[320px] md:max-w-[340px] lg:max-w-[300px] h-[min(70vh,520px)] md:h-[600px] rounded-[32px] bg-white/60 animate-pulse" />
        )}
      </div>

      <SendToDrawer
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onSend={handleShareSend}
        shareContext="prompt"
        showMessageInput
        shareTarget={prompt?._id ? { kind: "prompt", id: prompt._id } : undefined}
        previewContent={prompt ? <PromptPreviewCard card={prompt} /> : undefined}
      />
    </div>
  );
}

// Next.js 15 App Router: dynamic route params are a Promise you unwrap with
// use(). Suspense wraps the child that reads useSearchParams.
export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const { promptId } = use(params);
  return (
    <Suspense fallback={<div className="h-full" />}>
      <PromptDetailInner promptId={promptId} />
    </Suspense>
  );
}

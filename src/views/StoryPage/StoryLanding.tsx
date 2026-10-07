'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppDownloadBanner } from '@/components/replies/AppDownloadBanner';
import StoryViewing from './StoryViewing';
import StoryPage from './StoryPage';
import DownloadModal from './components/DownloadModal';
import { toResponsiveImage } from '@/lib/cloudinary';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/utils/storeLinks';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getInitials } from '@/lib/formatters';
import type { ReplyAs } from '@/lib/replies/publicReplies';
import type {
  Platform,
  PublicSender,
  PublicStoryData,
  StoryMedia,
} from '@/types/story';

type Props = {
  data: PublicStoryData;
  publicCode: string;
  platform: Platform;
  replyAs?: ReplyAs;
};

const StoryLanding = ({ data, publicCode, platform, replyAs }: Props) => {
  const router = useRouter();
  const { status: authStatus } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  // Authenticated users bypass the non-user invite flow entirely. If the story
  // has a threadId, send them to the dashboard thread viewer — the proper
  // in-app story experience. Falls back to the read-only public StoryPage if
  // threadId is missing (defensive — shouldn't happen for normal stories).
  const threadId = data.threadId;
  useEffect(() => {
    if (authStatus === 'authenticated' && threadId) {
      router.replace(`/thread/${threadId}`);
    }
  }, [authStatus, threadId, router]);

  if (authStatus === 'authenticated') {
    if (threadId) {
      // Redirect pending — avoid flashing the invite UI underneath
      return <div className="min-h-screen bg-warm-cream" />;
    }
    return <StoryPage data={data} publicCode={publicCode} platform={platform} />;
  }

  const handleDownloadClick = () => {
    if (platform === 'ios') {
      window.location.href = APP_STORE_URL;
    } else if (platform === 'android') {
      window.location.href = PLAY_STORE_URL;
    } else {
      setDownloadModalOpen(true);
    }
  };

  const { prompt, stories, sender } = data;
  const firstStory = stories?.[0];
  // Attribution rule (per BE spec):
  //   sender === null  → prompt's author shared their own story (common case)
  //   sender !== null  → someone else in the thread made the link
  // Headline name follows sender when present; the sub-line "Shared by X"
  // only renders when the sharer isn't the prompter.
  const promptAuthorFirstName = prompt?.author?.firstName ?? '';
  const firstName = sender?.firstName || promptAuthorFirstName;
  const headline = prompt?.isTitleAvailable ? firstStory?.title : prompt?.content;

  // Resolution order:
  //   1. prompt.imageUrl       — cover attached by the prompter
  //   2. firstStory.coverImageUrl — cover picked in the reply/new-ask composer
  //   3. media entry marked `_cover.jpg` — legacy prompt-authored covers that
  //      landed in the media array instead of prompt.imageUrl
  // Reply-flow covers won't resolve until BE echoes them on the public story
  // read; frontend wiring is in place for whenever that lands.
  const firstCoverMedia = firstStory?.media?.find(
    (m: StoryMedia) => m?.type === 'image' && m?.url?.includes('_cover.jpg')
  );
  const coverUrl =
    prompt?.imageUrl ||
    firstStory?.coverImageUrl ||
    firstCoverMedia?.url ||
    null;

  // Expanded view uses its own full-bleed layout — no landing chrome.
  if (expanded && firstStory) {
    return (
      <StoryViewing
        story={firstStory}
        author={prompt?.author || firstStory.author}
        onBack={() => setExpanded(false)}
        publicCode={publicCode}
        participants={data.participants ?? []}
        participantsOverflow={data.participantsOverflow ?? 0}
      />
    );
  }

  return (
    <div className="bg-warm-cream min-h-screen flex flex-col">
      <AppDownloadBanner platform={platform} publicCode={publicCode} />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
        <h2 className="font-lora text-[20px] sm:text-[22px] text-primary-blue text-center mb-2">
          {firstName ? `${firstName} Sent you a Story!` : 'You received a Story!'}
        </h2>
        {sender && promptAuthorFirstName && (
          <SharedByChip sender={sender} authorFirstName={promptAuthorFirstName} />
        )}
        <div className="mb-6" />

        {/* Card */}
        <div className="w-full max-w-[380px] sm:max-w-[420px] bg-primary-white rounded-[28px] shadow-card overflow-hidden">
          {coverUrl ? (
            <div className="relative w-full aspect-[4/5] overflow-hidden bg-primary-cream">
              <div
                aria-hidden="true"
                className="absolute inset-0 scale-110"
                style={{
                  backgroundImage: `url(${toResponsiveImage(coverUrl, 600)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(28px)',
                }}
              />
              <div aria-hidden="true" className="absolute inset-0 bg-black/10" />
              <img
                src={toResponsiveImage(coverUrl, 900) ?? undefined}
                alt={headline || 'Story cover'}
                className="relative w-full h-full object-cover"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          ) : (
            <div className="w-full aspect-[4/5] bg-primary-cream flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="w-16 h-16 text-primary-blue opacity-25"
              >
                <path d="M12 5l0 14M5 12l14 0" />
                <rect x="3" y="3" width="18" height="18" rx="3" />
              </svg>
            </div>
          )}

          {headline && (
            <div className="px-5 pt-4 pb-5 text-center">
              <p className="font-plus-jakarta font-medium text-[16px] sm:text-[17px] text-primary-blue">
                {headline}
              </p>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-6 w-full max-w-[380px] sm:max-w-[420px] flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full bg-primary-orange text-primary-white font-plus-jakarta font-semibold text-[16px] sm:text-[17px] px-6 py-[18px] sm:py-[20px] rounded-full hover:opacity-90 active:opacity-80 transition-opacity leading-none"
          >
            View Story
          </button>

          <button
            type="button"
            onClick={handleDownloadClick}
            className="text-center font-plus-jakarta text-[13px] text-primary-blue opacity-60 underline"
          >
            Download the Epoch Lag app
          </button>
        </div>
      </main>

      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        publicCode={publicCode}
        trackEvent="story_landing_download_link_clicked"
        position="story_landing"
      />
    </div>
  );
};

export default StoryLanding;

// Small sub-headline chip rendered when the link's sharer isn't the prompt's
// author. Keeps the story owner the hero but credits the sharer alongside.
function SharedByChip({
  sender,
  authorFirstName,
}: {
  sender: PublicSender;
  authorFirstName: string;
}) {
  return (
    <div
      className="flex items-center gap-2 mb-4"
      aria-label={`Shared by ${sender.firstName}, posted by ${authorFirstName}`}
    >
      {sender.profilePicture ? (
        <img
          src={sender.profilePicture}
          alt=""
          aria-hidden="true"
          className="w-5 h-5 rounded-full object-cover bg-primary-cream"
          loading="lazy"
        />
      ) : (
        <div className="w-5 h-5 rounded-full bg-primary-orange text-white font-plus-jakarta font-semibold text-[9px] flex items-center justify-center">
          {getInitials(sender.firstName)}
        </div>
      )}
      <span className="font-plus-jakarta text-[12px] text-primary-blue/70">
        Shared by {sender.firstName}
      </span>
    </div>
  );
}

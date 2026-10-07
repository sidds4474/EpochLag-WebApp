import { AppDownloadBanner } from '@/components/replies/AppDownloadBanner';
import { AnswerButton } from '@/components/replies/AnswerButton';
import { toResponsiveImage } from '@/lib/cloudinary';
import { getInitials } from '@/lib/formatters';
import type {
  Platform,
  PublicSender,
  StoryPrompt,
} from '@/types/story';
import type { ReplyAs } from '@/lib/replies/publicReplies';

type Props = {
  prompt: StoryPrompt;
  publicCode: string;
  platform: Platform;
  replyAs?: ReplyAs;
  sender?: PublicSender | null;
};

const PromptLanding = ({ prompt, publicCode, platform, replyAs, sender }: Props) => {
  // Attribution rule (per BE spec):
  //   sender === null → prompter shared their own prompt (common case)
  //   sender !== null → someone else in the thread shared the link
  // Headline uses sender when present; a tiny "Shared by X" chip renders
  // under the title in that case.
  const promptAuthorFirstName = prompt?.author?.firstName ?? '';
  const firstName = sender?.firstName || promptAuthorFirstName;
  const coverUrl = prompt?.imageUrl ?? null;
  const promptText = prompt?.content ?? '';

  return (
    <div className="bg-warm-cream min-h-screen flex flex-col">
      <AppDownloadBanner platform={platform} publicCode={publicCode} />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-6 sm:pt-10 pb-8">
        <h2 className="font-lora text-[20px] sm:text-[22px] text-primary-blue text-center mb-2">
          {firstName ? `${firstName} Sent you a prompt!` : 'You received a prompt!'}
        </h2>
        {sender && promptAuthorFirstName && (
          <div
            className="flex items-center gap-2 mb-4"
            aria-label={`Shared by ${sender.firstName}, posted by ${promptAuthorFirstName}`}
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
        )}
        {(!sender || !promptAuthorFirstName) && <div className="mb-4" />}

        {/* Card */}
        <div className="w-full max-w-[380px] sm:max-w-[420px] bg-primary-white rounded-[28px] shadow-card overflow-hidden">
          {/* Cover image */}
          {coverUrl ? (
            <div className="relative w-full aspect-[4/5] overflow-hidden bg-primary-cream">
              {/* Blurred backdrop */}
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
                alt={promptText || 'Prompt cover'}
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
                <path d="M4 5h16v11H8l-4 4V5z" />
              </svg>
            </div>
          )}

          {/* Prompt text */}
          {promptText && (
            <div className="px-5 py-5 text-center">
              <p className="font-plus-jakarta text-[16px] sm:text-[17px] text-primary-blue leading-[150%]">
                {promptText}
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 w-full max-w-[380px] sm:max-w-[420px]">
          <AnswerButton
            targetType="prompt"
            publicCode={publicCode}
            platform={platform}
            replyAs={replyAs}
          />
        </div>
      </main>
    </div>
  );
};

export default PromptLanding;

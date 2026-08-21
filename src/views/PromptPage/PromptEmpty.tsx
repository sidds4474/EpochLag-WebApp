import StoryNavBar from "../StoryPage/components/StoryNavBar";
import AppDownloadCTA from "../StoryPage/components/AppDownloadCTA";
import PromptViewAnalytics from "./PromptViewAnalytics";
import { toResponsiveImage } from "../../lib/cloudinary";
import type { Platform, StoryPrompt } from "../../types/story";

type Props = {
  prompt: StoryPrompt;
  publicCode: string;
  platform: Platform;
};

const PromptEmpty = ({ prompt, publicCode, platform }: Props) => {
  const headline = prompt?.content;
  const coverUrl = prompt?.imageUrl || null;
  const authorFirstName = prompt?.author?.firstName;

  return (
    <main className="bg-warm-cream min-h-screen">
      <PromptViewAnalytics
        publicCode={publicCode}
        hasStory={false}
        authorId={prompt?.author?._id}
      />
      <StoryNavBar
        publicCode={publicCode}
        platform={platform}
        eventName="public_prompt_app_cta_clicked"
      />

      <section className="px-[16px] md:px-[24px] pt-[4px] md:pt-[8px] pb-[24px] md:pb-[40px]">
        <div className="mx-auto w-full max-w-[380px]">
          {/* Poster card */}
          <div className="rounded-[28px] bg-primary-white shadow-[0_8px_32px_rgba(30,50,80,0.10)] p-[12px] md:p-[14px]">
            {/* Author line above the image */}
            {authorFirstName && (
              <div className="px-[6px] pt-[4px] pb-[10px]">
                <div className="font-montserrat text-primary-blue text-[12px] md:text-[13px] leading-none truncate opacity-70">
                  <span className="font-semibold opacity-100">{authorFirstName}</span> asked
                </div>
              </div>
            )}

            {/* Cover — inset with rounded corners */}
            {coverUrl ? (
              <div className="relative w-full aspect-[4/5] overflow-hidden rounded-t-[20px] bg-primary-cream">
                <div
                  aria-hidden="true"
                  className="absolute inset-0 scale-110"
                  style={{
                    backgroundImage: `url(${toResponsiveImage(coverUrl, 600)})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(28px)",
                  }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-black/10" />
                <img
                  src={toResponsiveImage(coverUrl, 900) ?? undefined}
                  alt={headline || "Prompt cover image"}
                  className="relative w-full h-full object-cover"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="w-full aspect-[4/5] rounded-t-[20px] bg-primary-cream flex items-center justify-center">
                <div className="text-primary-blue opacity-25">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="w-[72px] h-[72px]"
                  >
                    <path d="M4 5h16v11H8l-4 4V5z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Question */}
            {headline && (
              <div className="px-[12px] pt-[22px] pb-[14px] text-center">
                <h1 className="font-montserrat text-primary-blue text-[16px] md:text-[17px] leading-[145%] break-words">
                  {headline}
                </h1>
              </div>
            )}
          </div>
        </div>
      </section>

      <AppDownloadCTA
        platform={platform}
        publicCode={publicCode}
        title="Answer prompts like this in Epoch Lag"
        subcopy="Ask the people who matter, or answer a prompt of your own."
        eventName="public_prompt_app_cta_clicked"
      />
    </main>
  );
};

export default PromptEmpty;

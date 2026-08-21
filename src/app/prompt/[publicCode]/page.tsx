import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StoryPage from "../../../views/StoryPage/StoryPage";
import StoryError from "../../../views/StoryPage/StoryError";
import PromptEmpty from "../../../views/PromptPage/PromptEmpty";
import { fetchPublicPrompt, PROMPT_FETCH_STATUS } from "../../../lib/promptApi";
import { toOgImage } from "../../../lib/cloudinary";
import { detectPlatform } from "../../../lib/platform";
import { excerpt } from "../../../lib/formatters";

const SITE_URL = "https://www.epochlag.com";

type RouteParams = { params: Promise<{ publicCode: string }> };

export async function generateMetadata({ params }: RouteParams) {
  const { publicCode } = await params;
  const result = await fetchPublicPrompt(publicCode);

  if (result.status !== PROMPT_FETCH_STATUS.OK) {
    return {
      title: "Prompt not available",
      robots: { index: false, follow: false },
    };
  }

  const { prompt } = result.data;
  const authorFirstName = prompt?.author?.firstName;
  const promptText = prompt?.content?.trim() || "A prompt on Epoch Lag";
  const description = excerpt(
    authorFirstName
      ? `${authorFirstName} shared this prompt on Epoch Lag.`
      : "A prompt on Epoch Lag.",
    150
  );

  const url = `${SITE_URL}/prompt/${publicCode}`;
  const ogImage = toOgImage(prompt?.imageUrl);

  return {
    title: authorFirstName
      ? `${authorFirstName} asked — ${promptText}`
      : promptText,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: promptText,
      description,
      siteName: "Epoch Lag",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: promptText,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function Page({ params }: RouteParams) {
  const { publicCode } = await params;
  const result = await fetchPublicPrompt(publicCode);

  if (result.status === PROMPT_FETCH_STATUS.NOT_FOUND) {
    notFound();
  }
  if (result.status === PROMPT_FETCH_STATUS.ERROR) {
    return <StoryError />;
  }

  const headersList = await headers();
  const platform = detectPlatform(headersList.get("user-agent") || "");

  const { hasStory, prompt } = result.data;

  if (hasStory) {
    return (
      <StoryPage
        data={result.data}
        publicCode={publicCode}
        platform={platform}
      />
    );
  }

  return (
    <PromptEmpty
      prompt={prompt || {}}
      publicCode={publicCode}
      platform={platform}
    />
  );
}

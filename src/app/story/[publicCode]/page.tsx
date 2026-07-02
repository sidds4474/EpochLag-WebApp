import { headers } from "next/headers";
import { notFound } from "next/navigation";
import StoryPage from "../../../views/StoryPage/StoryPage";
import StoryError from "../../../views/StoryPage/StoryError";
import { fetchPublicStory, STORY_FETCH_STATUS } from "../../../lib/storyApi";
import { toOgImage } from "../../../lib/cloudinary";
import { detectPlatform } from "../../../lib/platform";
import { excerpt } from "../../../lib/formatters";
import { parseContentToBlocks } from "../../../lib/parseStoryContent";
import type { StoryMedia } from "../../../types/story";

const SITE_URL = "https://www.epochlag.com";

type RouteParams = { params: Promise<{ publicCode: string }> };

function extractTextForDescription(content: string | null | undefined) {
  if (!content) return "";
  const blocks = parseContentToBlocks(content);
  const text = blocks
    .filter((b): b is { type: "text"; text: string } => b.type === "text" && !!b.text)
    .map((b) => b.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

export async function generateMetadata({ params }: RouteParams) {
  const { publicCode } = await params;
  const result = await fetchPublicStory(publicCode);

  if (result.status !== STORY_FETCH_STATUS.OK) {
    return {
      title: "Story not available",
      robots: { index: false, follow: false },
    };
  }

  const { prompt, stories } = result.data;
  const firstStory = stories?.[0];
  const headline = prompt?.isTitleAvailable
    ? firstStory?.title
    : prompt?.content;
  const authorFirstName = prompt?.author?.firstName || "Someone";

  const cleanText = extractTextForDescription(firstStory?.content);
  const storyTitle =
    firstStory?.title?.trim() ||
    headline?.trim() ||
    `A memory from ${authorFirstName}`;
  const description =
    excerpt(cleanText, 150) ||
    `A memory shared by ${authorFirstName} on Epoch Lag.`;

  const url = `${SITE_URL}/story/${publicCode}`;
  const fallbackCover =
    firstStory?.media?.find((m: StoryMedia) => m?.type === "image")?.url || null;
  const ogImage = toOgImage(prompt?.imageUrl || fallbackCover);

  return {
    title: `${authorFirstName}'s Story — ${storyTitle}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: storyTitle,
      description,
      siteName: "Epoch Lag",
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: storyTitle,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function Page({ params }: RouteParams) {
  const { publicCode } = await params;
  const result = await fetchPublicStory(publicCode);

  if (result.status === STORY_FETCH_STATUS.NOT_FOUND) {
    notFound();
  }
  if (result.status === STORY_FETCH_STATUS.ERROR) {
    return <StoryError />;
  }

  const headersList = await headers();
  const platform = detectPlatform(headersList.get("user-agent") || "");

  return (
    <StoryPage
      data={result.data}
      publicCode={publicCode}
      platform={platform}
    />
  );
}
